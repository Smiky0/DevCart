# DevCart — Technical Architecture

This document describes the internal design, data model, key flows, and engineering decisions behind DevCart. It is the source of truth for how the marketplace works under the hood.

---

## 1. Overview

DevCart is a digital marketplace running on the Next.js 16 App Router. Creators publish downloadable products; buyers purchase them with Stripe and instantly download files from private object storage.

**Runtime model:** Server Actions and Route Handlers are the primary server-side surface. The shop page is server-rendered; "load more" pagination is fetched client-side through a dedicated BFF API route.

**Data plane:** PostgreSQL (Prisma ORM) is the source of truth. Product files and cover images live in Cloudflare R2. Purchase state is immutable once committed and keyed to the Stripe session that paid for it.

---

## 2. Data Model

Defined in `prisma/schema.prisma`. All money is stored as **integer cents** (`Int`) — never floats. `Product.price`, `PurchaseItem.price`, and `Purchase.totalAmount` are all cents.

### Core entities

- **User** — `id` (cuid), `email` (unique), `username` (unique, nullable), `role` (`USER`|`ADMIN`). Has one-to-one `Cart`. Relations: `createdProducts`, `purchases`, `purchaseItems`, `sessions`, `accounts`.
- **Product** — seller-owned listing. `price` in cents, `images` (`String[]` for R2 keys), `isPublished`, `category`, `description`, `createdAt`/`updatedAt`.
    - Browsing is ordered by `(updatedAt DESC, id DESC)` and requires the composite indexes that make keyset seeking efficient (see §5).
- **FileAsset** — downloadable attachment for a product, stores the R2 `storageKey` + `fileName`.
- **Cart** — one per user (`userId` unique, `NOT NULL`, `ON DELETE CASCADE`). A cart was historically nullable/ownerless; orphaned carts are cleaned up by migration. `updatedAt`.
- **CartItem** — links a `Cart` to a `Product` (per-cart unique product).
- **Purchase** — the immutable fulfillment record for a completed Stripe session. Keyed by unique `stripeSessionId` to make webhook replays idempotent. Stores `totalAmount` (cents) and `buyerId`.
- **PurchaseItem** — per-product line of a `Purchase`, locking `productId`, `sellerId`, and `price` (cents snapshot). `@@unique([purchaseId, productId])`.
- **Account / Session / VerificationToken** — NextAuth Prisma-adapter tables.

### Integrity rules worth knowing

- Deleting a `Product` (via Server Action) runs a **single database transaction** deleting its `FileAsset`, `PurchaseItem`, and `CartItem` rows together, then — after commit — best-effort deletes the R2 objects. The DB goes first so a failed delete can never leave a buyer-visible product gone while its files were already destroyed.
- `PurchaseItem.price` is a snapshot taken at checkout fulfillment time, decoupled from the live `Product.price`.

---

## 3. Payments & Order Fulfillment

### 3.1 Checkout (`app/api/checkout/route.ts`)

1. Authenticate the user and load their cart with products.
2. Build Stripe `line_items` from the cart, using `unit_amount = Product.price` (cents).
3. **Snapshot** the cart contents as `[{ productId, sellerId, amountCents }]` and encode it into Checkout session `metadata` via `lib/orderMetadata.ts`.
4. Create the Stripe Checkout Session and return its redirect URL.

**Why the snapshot matters:** fulfillment must reflect what the buyer _paid for at the moment of checkout_, not whatever happens to be in their cart when payment completes. Stripe metadata values are capped at 500 chars each, so the JSON snapshot is split into numbered chunks (`items_0`, `items_1`, …), each ≤480 chars, and re-assembled + validated on the webhook side.

### 3.2 Webhook fulfillment (`app/api/webhooks/stripe/route.ts`)

Orders are fulfilled **only here**, driven by Stripe's signed event — a buyer never needs to return to a results page.

1. Verify `stripe-signature` via `constructEventAsync`.
2. On `checkout.session.completed` / `checkout.session.async_payment_succeeded` with `payment_status === "paid"`:
    - `decodeOrderItems` restores + validates the snapshot.
    - **Idempotency:** if a `Purchase` already exists for `stripeSessionId`, skip (safe replay).
    - Inside a transaction: create the `Purchase` + `PurchaseItem`s from the snapshot, and delete **only the purchased** lines from the cart (items added after checkout survive).
    - Concurrent duplicate delivery loses the unique-key race → `P2002` is swallowed and treated as success.
3. Any processing failure returns `500`, prompting Stripe to retry the delivery.

This design means cart contents can never be "fulfilled" after the fact, and `PurchaseItem.price` is always what was actually paid.

---

## 4. Money Handling

All monetary values cross the system as integer cents:

- `formatPrice` (`lib/utils.ts`) formats cents → human-readable currency at display time only.
- Product creation converts user-entered amount → cents server-side.
- Checkout, the Stripe `unit_amount`, webhook `totalAmount`, and `PurchaseItem.price` all pass cents through untransformed.
- The metrics/benchmark tooling and raw queries (`$queryRaw`) never convert currency.

Rationale: floating-point currency rounding bugs are eliminated, and Stripe's native unit is already cents.

---

## 5. Product Browsing & Keyset Pagination

The storefront supports browsing with `q` (free-text) and `category` filters, sorted by `(updatedAt DESC, id DESC)`, paginated with **keyset (cursor) pagination** rather than OFFSET.

### 5.1 Why not OFFSET

`LIMIT ? OFFSET ?` forces PostgreSQL to scan **and discard** every skipped row. On 200k rows this degrades linearly with depth (measured ~2ms at depth 0 → **~56ms at depth 150,000**, and it only gets worse as the dataset grows). Keyset pagination seeks directly into the next page.

### 5.2 The query shape

`lib/products.ts` executes raw SQL using PostgreSQL's native **row-value comparison**:

```sql
SELECT "id", "title", "category", "price", "images", "updatedAt"
FROM "Product"
WHERE "isPublished" = TRUE
  AND ("updatedAt", "id") < ($1, $2)      -- cursor seek
  [AND "category" = $3]
  [AND ("title" ILIKE $4 ... OR "category" ILIKE $4 ...)]
ORDER BY "updatedAt" DESC, "id" DESC
LIMIT $5  -- (take + 1)
```

- **Row-value predicate** performs a single index seek — measured **~0.06ms** regardless of depth via `EXPLAIN ANALYZE` (Index Only Scan, zero filtered rows).
- **Why raw SQL?** Prisma's equivalent OR-emulation `(updatedAt < $1 OR (updatedAt = $1 AND id < $2))` defeats the index (EXPLAIN: `Rows Removed by Filter: 150001`, ~12.7ms). The raw query binds **all** values as parameters; `LIKE` wildcards in user input are escaped via `escapeLike` so `%`/`_` can't inject patterns.
- The query fetches `take + 1` rows: the extra row cheaply signals whether another page exists (no separate count query).
- `MAX_QUERY_LENGTH` (100) truncates the search term; `limit` is clamped to `[1, 50]`.

### 5.3 Cursors

`lib/cursor.ts` produces opaque, signed, tamper-proof pagination tokens.

```
v1.<base64url(JSON{u, i})>.<base64url(HMAC-SHA256(v1.<body>))>
```

- `u` = `updatedAt` ISO of the last row; `i` = its `id` tiebreaker (guaranteed unique order).
- Signed with `CURSOR_SECRET` (falls back to `AUTH_SECRET`). Verification uses constant-time comparison so timing can't leak the signature.
- `decodeCursor` rejects wrong version, malformed structure, invalid dates, missing/over-long ids, and bad signatures — returning `null`, which `listProducts` surfaces as `InvalidCursorError` → HTTP 400.

### 5.4 BFF route (`app/api/products/route.ts`)

The client "load more" fetches hit this endpoint, which centralizes:

1. **Rate limit** (120/min per user/visitor, keyed by `userId` or `x-forwarded-for`).
2. **Validation** — `limit` must be an integer in `[1, 50]`.
3. **Query** — delegates to `listProducts` with `cursor`/`category`/`q`.
4. **Observability** — `Server-Timing` header + a slow-query warning log (>1000ms).
5. **Errors** — `InvalidCursorError` → 400; unexpected errors → 500 and reported to Sentry.

The shop's _first_ page is server-rendered in `app/(main)/(shop)/page.tsx`, which calls `listProducts` directly; deeper pages stream in via `LoadMoreProducts` + `ShopFilters`. The search term uses `ILIKE` on `title`/`category` (kept deliberately: no separate search infra, and it rides the same index for reasonable prefixes).

---

## 6. Auth

`lib/auth.ts` exposes NextAuth v5 (`handlers`, `auth`, `signIn`, `signOut`) with the Prisma adapter and GitHub + Google OAuth providers. The `session` callback copies `session.userId` onto `session.user.id` so every route can identify the current user.

- Server actions and route handlers call `auth()` and short-circuit with 401 when `user.id` is absent.
- `lib/env.ts` treats `AUTH_SECRET` as required (it doubles as the cursor-signing fallback).

---

## 7. Object Storage (Cloudflare R2)

Two S3-compatible buckets:

- **Public** → cover images; served via `NEXT_PUBLIC_IMAGE_HOST`/`getImageUrl`.
- **Private** → downloadable file assets; never served statically.

### Upload flow (`app/api/upload/route.ts`)

1. **Rate limit checked before the body is parsed** (defeats body-parsing abuse).
2. Filename length (≤255) and MIME-shape (`fileType` regex, `image/*` vs everything-else) validated.
3. A presigned URL + storage key is returned; the browser then PUTs the file **directly to R2**, so bytes never transit the server.
4. Errors are generic (`"Error generating upload URL"`) — internal failures aren't leaked.

### Download flow (`app/api/download/[assetId]/route.ts`)

1. Authenticate, then rate limit.
2. Fetch the `FileAsset` (minimal `select`: storageKey, fileName, product.sellerId).
3. Authorize: the user is the **seller** OR has a `PurchaseItem` for the product. Otherwise 403.
4. Stream the object from R2 with a content-type derived from the extension and an attachment `Content-Disposition`.

---

## 8. Rate Limiting

`lib/ratelimit.ts` — Upstash Redis sliding-window limits:

| Limiter             | Budget    | Scope               | Used by                   |
| ------------------- | --------- | ------------------- | ------------------------- |
| `uploadRatelimit`   | 20 / min  | per user            | `/api/upload`             |
| `downloadRatelimit` | 20 / min  | per user            | `/api/download/[assetId]` |
| `browseRatelimit`   | 120 / min | per user or visitor | `/api/products`           |

---

## 9. Reliability & Error Handling

- **Fail-fast config:** `lib/env.ts` validates required variables at module load (build/startup), replacing silent `!` assertions. `assertEnv()` / `requiredEnv()` / `optionalEnv()` / `missingRequired()`.
- **Server actions** return `{ success, message }` with **generic** user-facing messages; internal details go to `console.error`. Actual error messages are never concatenated into client responses.
- **Sentry** is wired across client, server, and edge runtimes; unexpected 5xx in the products route is captured.
- **Stripe webhook** validates signatures and returns 5xx on processing failure for Stripe retry.

---

## 10. Data Tooling & Cloud Isolation

Heavy data tooling (bulk seeding, benchmarking, integration tests) runs against an **isolated local Docker Postgres** (`devcart_test`), never the cloud/Accelerate database. This is enforced in code, not just convention.

### Isolation guard

Both `prisma/seed-bulk.ts` and `prisma/bench-pagination.ts` resolve their target via `resolveSeedUrl()`:

```
SEED_DATABASE_URL ?? TEST_DATABASE_URL ?? postgresql://postgres:postgres@localhost:5432/devcart_test
```

and **throw** unless the hostname is localhost/127.0.0.1/::1/[::1]. Pointing these at the Accelerate URL (or any remote host) aborts immediately:

```
Error: Refusing to run destructive bulk operations against "accelerate.prisma-data.net".
```

### Bulk seeder (`prisma/seed-bulk.ts`)

- Modes (`SEED_MODE`): **copy** (default, PostgreSQL `COPY FROM STDIN` via `pg-copy-streams`), **batch** (Prisma `createMany`), **bench** (both, fresh table, prints comparison).
- Deterministic data (mulberry32 PRNG), timestamps spread over 180 days (required — columns are `NOT NULL` with no default, and newest-first ordering matters for pagination).
- **Chunked inserts** to avoid load spikes: COPY writes in `SEED_CHUNK_COPY` (default 1000) row chunks under stream backpressure (never buffers more than one chunk ahead), `createMany` batches of `SEED_CHUNK_BATCH` (default 2000), optional `SEED_CHUNK_DELAY_MS` pacing.
- `TRUNCATE ... CASCADE` of `CartItem`, `FileAsset`, `PurchaseItem`, `Product`, then creates seller `User`s.
- Measured: **200k rows in ~8.3s (~24k rows/s)** via COPY into local Docker.

### Benchmark (`prisma/bench-pagination.ts`)

Compares keyset vs OFFSET at increasing depths. Representative result at 200k rows:

| depth   | keyset | OFFSET |
| ------- | ------ | ------ |
| 0       | 1.6ms  | 1.5ms  |
| 15,000  | 1.6ms  | 6.6ms  |
| 150,000 | 2.1ms  | 56ms   |

### Dev churn endpoint (`app/api/dev/touch/route.ts`)

`POST /api/dev/touch?count=N` churns random products' `updatedAt` so pagination ordering changes during tests. Protected by `x-admin-secret` === `ADMIN_SECRET` (404 when absent/wrong). Useful for validating cursor stability mid-walk.

---

## 11. Testing Strategy

- **Unit** (`vitest.config.ts`, `tests/unit/**`): isolated, mocked. The pagination spec mocks `$queryRaw` (inspecting the composed `Prisma.Sql` fragments and bound params: LIMIT binding, the `< (` seek fragment, escaped ILIKE param), and the route test mocks the products module + `InvalidCursorError` path. Money, cursors, checkout, webhook, upload, download, cart, actions, env all covered.
- **Integration** (`vitest.integration.config.ts`, `tests/integration/pagination.int.test.ts`): real Postgres invariants — deep-walk stability under concurrent inserts/touches, category exactness, zero-duplicates/full coverage, tampered cursor → 400 through the real route handler, API/service parity. It stubs `lib/auth`/`lib/ratelimit` and injects a test Prisma client so the cloud DB is unreachable. The schema is applied via the **real migration chain** (`prisma migrate reset --force`), so renames/data migrations are exercised as shipped. Skips automatically without `TEST_DATABASE_URL`.
- **CI** (`.github/workflows/ci.yml`): ① quality (install, unit, tsc, lint, Prettier) ② integration against a Postgres service container via `prisma migrate deploy` ③ Docker build + GHCR push on `main`.

---

## 12. Deployment & Infra

- **Dockerfile:** multi-stage, `next.config.ts` has `output: "standalone"` for a minimal production image.
- **docker-compose.yml:** `postgres:17-alpine` service (`devcart_test`) + optional app profile; `pnpm db:up` / `db:down` wrap it.
- **CI/CD:** on `main`, builds and pushes the production image to **GHCR** (`ghcr.io/…`). `pnpm-lock.yaml` is committed (needed for CI cache). Migrations are run with `prisma migrate deploy` against the target database before/at deploy.
- **Production DB:** PostgreSQL reached through **Prisma Accelerate** (`DATABASE_URL` = accelerate URL). The isolated tooling DB is the local Docker instance, guarded as in §10.

---

## 13. Environment Variables

Required at runtime (`lib/env.ts`):

| Variable                                                      | Purpose                                |
| ------------------------------------------------------------- | -------------------------------------- |
| `DATABASE_URL`                                                | Prisma Accelerate connection URL       |
| `AUTH_SECRET`                                                 | Session encryption (+ cursor fallback) |
| `UPSTASH_REDIS_REST_URL`                                      | Redis for rate limiting                |
| `UPSTASH_REDIS_REST_TOKEN`                                    | Redis token                            |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 S3 credentials                      |
| `R2_PUBLIC_BUCKET` / `R2_PRIVATE_BUCKET`                      | R2 bucket names                        |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`                 | Stripe keys                            |
| `NEXT_PUBLIC_APP_URL`                                         | App URL (Stripe redirects + images)    |

Optional:

| Variable                                                                         | Purpose                                    |
| -------------------------------------------------------------------------------- | ------------------------------------------ |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`, `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | OAuth providers                            |
| `NEXT_PUBLIC_IMAGE_HOST`                                                         | Public R2 image host                       |
| `CURSOR_SECRET`                                                                  | Overrides `AUTH_SECRET` for cursor signing |
| `ADMIN_SECRET`                                                                   | `dev/touch` endpoint auth                  |
| `TEST_DATABASE_URL` / `SEED_DATABASE_URL`                                        | Local tooling DB (localhost-guarded)       |
| `SEED_*`, `BENCH_*`                                                              | Seeder/benchmark knobs (see §10)           |

---

## 14. Operational Notes

- **Schema migrations** must target the real database connection when run manually (`prisma migrate dev` uses `DATABASE_URL` — the accelerate URL). The **data tooling** uses the local Docker URL and never touches Accelerate.
- **Money:** always integer cents end-to-end; never introduce float currency math.
- **Cart integrity:** one cart per user; orphaned/ownerless carts are removed by the `normalize_schema_naming` migration; `Cart.userId` is `NOT NULL`.
- **Keyset pagination** requires stable ordering on `(updatedAt DESC, id DESC)`; `DEV /touch` exists specifically to perturb `updatedAt` for testing that stability.
- After adding a migration that renames/removes columns, regenerate the client (`pnpm build`/`prisma generate`) so the generated types match.
