# DevCart — Digital Marketplace

A full-stack digital marketplace where creators sell and buyers instantly download digital products — templates, icons, UI kits, fonts, and more.

Built with **Next.js 16** (App Router + Server Actions), **React 19**, **TypeScript 5**, **Prisma 7** (via Prisma Accelerate), **PostgreSQL**, **Cloudflare R2**, **NextAuth v5**, and **Stripe**.

> **Technical deep-dive:** see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data model, keyset pagination design, money handling, checkout/webhook fulfillment, security model, and testing strategy.

---

## Tech Stack

| Layer            | Technology                                                    |
| ---------------- | ------------------------------------------------------------- |
| Framework        | Next.js 16 (App Router, Server Actions, Route Handlers)       |
| Language         | TypeScript 5 (strict)                                         |
| Styling          | Tailwind CSS v4                                               |
| Database         | PostgreSQL + Prisma 7 (Prisma Accelerate for connection mgmt) |
| Auth             | NextAuth v5 (GitHub + Google OAuth, Prisma adapter)           |
| File Storage     | Cloudflare R2 (public + private buckets, presigned uploads)   |
| Payments         | Stripe (Checkout + webhook-based fulfillment)                 |
| Rate Limiting    | Upstash Redis + `@upstash/ratelimit` (sliding window)         |
| Error Monitoring | Sentry (client, server, edge)                                 |
| Animations       | Framer Motion                                                 |
| Icons            | Phosphor Icons                                                |
| Notifications    | Sonner                                                        |
| Package Manager  | pnpm                                                          |
| Testing          | Vitest (unit + real-Postgres integration)                     |

---

## Features

- **Storefront** — Browse with free-text search and category filtering, delivered through **keyset pagination** (load-more; deep pages stay flat regardless of data size).
- **Seller Studio** — Create and manage product listings with image uploads and downloadable file attachments.
- **Direct-to-R2 Uploads** — Presigned URL flow; files stream from the browser to R2 (never through the server).
- **Secure Downloads** — Private assets served through an authenticated route with purchase/seller verification.
- **Cart System** — Persistent server-side cart per user (one cart per user, `ON DELETE CASCADE`).
- **Purchase Tracking** — Buyer/seller transaction records with per-item pricing and immutable fulfillment snapshots.
- **OAuth Authentication** — GitHub + Google via NextAuth v5 with Prisma adapter.
- **Rate Limiting** — Upload (20/min), download (20/min), and browse (120/min) limits per user/visitor.
- **Error Monitoring** — Sentry across client, server, and edge runtimes.
- **Dev/Data Tooling** — Isolated Docker Postgres, 200k-row bulk seeder, keyset-vs-OFFSET benchmark, integration suite.
- **Fail-fast Configuration** — All required environment variables validated at startup (`lib/env.ts`).

---

## Architecture at a Glance

```
app/
├── (main)/
│   ├── (shop)/              # Public — browse, product detail, cart, checkout
│   └── (dashboard)/         # Authenticated — studio, orders, library
├── api/
│   ├── auth/[...nextauth]/  # NextAuth route handler
│   ├── products/            # BFF: paginated browse (rate-limited, validated)
│   ├── upload/              # Presigned URL generation for R2
│   ├── download/[assetId]/  # Secure file download from R2 private bucket
│   ├── checkout/            # Stripe Checkout session creation from cart
│   ├── webhooks/stripe/     # Stripe event webhook → order fulfillment
│   ├── dev/touch/           # (Dev only) churn random products for benchmarking
│   └── health/              # Liveness probe
├── signin/                  # Custom sign-in page
└── not-found.tsx            # 404 page

server/actions/              # Server actions (cart, product CRUD)
components/                  # Shared UI components
lib/                         # Prisma, R2, auth, cursor, products, env, ratelimit…
prisma/                      # Schema, migrations, bulk seeder, benchmark
tests/unit                   # Unit tests (Vitest)
tests/integration            # Real-Postgres integration tests
docs/                        # ARCHITECTURE.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+, pnpm, Docker (for local DB / integration tests / seeding)
- Cloudflare R2 account (one public + one private bucket)
- GitHub and/or Google OAuth app credentials
- Stripe account (test keys) + Upstash Redis instance
- Prisma Data Platform project for Accelerate

### 1. Install

```bash
pnpm install
```

### 2. Environment Variables

Create a `.env` file (see `.env.example`). Minimal required set:

```env
# Database (Prisma Accelerate URL)
DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/?api_key=<accel-key>

# Auth
AUTH_SECRET=<random-secret>            # used as CURSOR_SECRET fallback too

# Rate limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://<id>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>

# Cloudflare R2
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret-key>
R2_PUBLIC_BUCKET=<public-bucket-name>
R2_PRIVATE_BUCKET=<private-bucket-name>

# Stripe
STRIPE_SECRET_KEY=<stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-signing-secret>

# App URL (used for Stripe redirect + image URLs)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optional (see [docs/ARCHITECTURE.md#environment-variables](docs/ARCHITECTURE.md#environment-variables) for the full table):

```env
AUTH_GITHUB_ID=…            AUTH_GITHUB_SECRET=…
AUTH_GOOGLE_ID=…            AUTH_GOOGLE_SECRET=…
NEXT_PUBLIC_IMAGE_HOST=https://<your-bucket>.r2.dev
CURSOR_SECRET=…             # overrides AUTH_SECRET for cursor signing
ADMIN_SECRET=…              # dev/touch endpoint

# Data tooling (local Docker only)
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/devcart_test
SEED_COUNT=200000           SEED_SELLERS=200
SEED_MODE=copy              # copy|batch|bench
SEED_CHUNK_COPY=1000        SEED_CHUNK_BATCH=2000
SEED_CHUNK_DELAY_MS=0
BENCH_DEPTH=150000          BENCH_SAMPLES=20
```

**Important:** `SEED_DATABASE_URL` and `TEST_DATABASE_URL` are hard-guarded to local hosts only — the seeder and benchmark refuse to run against the cloud/Accelerate database. See [docs/ARCHITECTURE.md#data-tooling-and-cloud-isolation](docs/ARCHITECTURE.md#data-tooling-and-cloud-isolation).

### 3. Database Setup

The app uses **Prisma Accelerate** in production. Locally, use Docker for the dev/test database:

```bash
# start the isolated local Postgres (used by dev, tests, seeding, benchmark)
pnpm db:up

# apply migrations to your cloud/dev database (accelerate URL)
pnpm prisma migrate dev
```

### 4. R2 CORS Configuration

Add this CORS policy to **both** R2 buckets in the Cloudflare dashboard:

| Setting         | Value                                            |
| --------------- | ------------------------------------------------ |
| Allowed Origins | `http://localhost:3000`                          |
| Allowed Methods | `GET`, `PUT`, `HEAD`                             |
| Allowed Headers | `content-type`, `content-length`, `x-amz-meta-*` |

### 5. Run

```bash
pnpm dev        # http://localhost:3000
pnpm build      # production build (runs prisma generate first)
```

---

## Scripts

| Command                        | Description                                             |
| ------------------------------ | ------------------------------------------------------- |
| `pnpm dev`                     | Start development server                                |
| `pnpm build`                   | `prisma generate` + production Next build               |
| `pnpm start`                   | Start production server                                 |
| `pnpm lint`                    | Run ESLint                                              |
| `pnpm test`                    | Run unit test suite (Vitest)                            |
| `pnpm test:integration`        | Run real-Postgres integration suite (needs Docker)      |
| `pnpm db:up` / `pnpm db:down`  | Start / stop the isolated local Postgres container      |
| `pnpm seed:bulk`               | Bulk-seed products into the **local** DB (default 200k) |
| `pnpm bench:pagination`        | Keyset vs OFFSET benchmark on the **local** DB          |
| `pnpm format` / `format:check` | Prettier write / check                                  |

Typical data pipeline (all against the isolated Docker DB — never the cloud DB):

```bash
pnpm db:up
pnpm seed:bulk                       # truncate + insert 200k products
pnpm bench:pagination                # keyset vs OFFSET timing report
pnpm test:integration                # resets DB to a small fixture
pnpm seed:bulk                       # re-seed before another benchmark
```

---

## Testing

- **Unit** (`pnpm test`): cursor signing/verification, pagination SQL construction (`$queryRaw` mocking), product/server actions, cart, checkout, webhook, upload, download, dev/touch, health, utils, order metadata, env.
- **Integration** (`pnpm test:integration`): real-Postgres invariants — deep-walk stability under inserts/touches, category exactness, zero-duplicates/full-coverage, tampered-cursor→400 via the real route handler, API/service parity. Runs only when `TEST_DATABASE_URL` points at a local host (skips otherwise).

CI (`.github/workflows/ci.yml`) runs quality (unit + lint + tsc + Prettier), integration against a Postgres service container via the real migration chain (`prisma migrate deploy`), and builds/pushes the production image to GHCR on `main`.

---

## Key Files

| File                                | Purpose                                                    |
| ----------------------------------- | ---------------------------------------------------------- |
| `lib/env.ts`                        | Centralized startup validation of environment variables    |
| `lib/auth.ts`                       | NextAuth config (GitHub + Google, Prisma adapter)          |
| `lib/prisma.ts`                     | Prisma client singleton with `withAccelerate`              |
| `lib/products.ts`                   | Keyset-paginated product query (row-value index seek)      |
| `lib/cursor.ts`                     | Signed, tamper-proof pagination cursors (HMAC-SHA256)      |
| `lib/orderMetadata.ts`              | Immutable checkout purchase snapshot encoding              |
| `lib/cloudflareR2.ts`               | S3-compatible R2 client                                    |
| `lib/ratelimit.ts`                  | Upload / download / browse rate limiters                   |
| `server/actions/cart.ts`            | Cart server actions                                        |
| `server/actions/product.ts`         | Product CRUD server actions (DB-first delete + R2 cleanup) |
| `prisma/schema.prisma`              | Database schema                                            |
| `prisma/seed-bulk.ts`               | Chunked bulk seeder (COPY/createMany) — **local DB only**  |
| `prisma/bench-pagination.ts`        | Keyset vs OFFSET benchmark — **local DB only**             |
| `Dockerfile` / `docker-compose.yml` | Standalone image + local Postgres service                  |
| `docs/ARCHITECTURE.md`              | Full technical architecture                                |

---

## License

MIT
