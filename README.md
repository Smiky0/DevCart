# DevCart — Digital Marketplace

A full-stack digital marketplace where creators sell and buyers instantly download digital products — templates, icons, UI kits, fonts, and more.

Built with **Next.js 16**, **React 19**, **Prisma 7**, **Cloudflare R2**, and **NextAuth v5**.

---

## Screenshots

<!-- Replace the paths below with actual screenshot images -->

| Page | Screenshot |
|------|-----------|
| Home / Shop | ![Shop](screenshots/shop.png) |
| Product Detail | ![Product](screenshots/product.png) |
| Cart | ![Cart](screenshots/cart.png) |
| Studio Dashboard | ![Studio](screenshots/studio.png) |
| Create Product | ![New Product](screenshots/new_product.png) |
| Orders / Library | ![Orders](screenshots/orders.png) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Server Actions) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL + Prisma 7 |
| Auth | NextAuth v5 (GitHub, Google OAuth) |
| File Storage | Cloudflare R2 (S3-compatible, public + private buckets) |
| Payments | Stripe (webhook-based) |
| Animations | Framer Motion |
| Icons | Phosphor Icons |
| Notifications | Sonner (toast system) |
| Error Monitoring | Sentry (client, server, edge) |
| Rate Limiting | Upstash Redis + `@upstash/ratelimit` |
| Package Manager | pnpm |

---

## Features

- **Storefront** — Browse products with search, category filtering, and multi-field sorting.
- **Seller Studio** — Create and manage product listings with drag-and-drop image uploads and downloadable file attachments.
- **Direct-to-R2 Uploads** — Presigned URL flow: images and assets upload directly from the browser to Cloudflare R2.
- **Secure Downloads** — Private file assets served through an authenticated API route with ownership verification.
- **Cart System** — Persistent server-side cart per user with real-time count in the navbar.
- **Purchase Tracking** — Full buyer/seller transaction records with per-item pricing.
- **OAuth Authentication** — GitHub + Google sign-in via NextAuth v5 with Prisma adapter.
- **Responsive UI** — Mobile-first layout with animated page transitions and toast notifications.
- **Error Monitoring** — Sentry integration across client, server, and edge runtimes with session replay and request error capture.
- **Rate Limiting** — Upload and download API routes are rate-limited (20 req/min per user) via Upstash Redis sliding window.

---

## Architecture

```
app/
├── (main)/
│   ├── (shop)/              # Public — browse, product detail, cart, checkout
│   └── (dashboard)/         # Authenticated — studio, orders, library
├── api/
│   ├── auth/[...nextauth]/  # NextAuth route handler
│   ├── upload/              # Presigned URL generation for R2
│   ├── download/[assetId]/  # Secure file download from R2 private bucket
│   └── webhooks/stripe/     # Stripe payment webhook
├── signin/                  # Custom sign-in page
└── not-found.tsx            # 404 page

server/actions/              # Server actions (cart, product CRUD)
lib/                         # Prisma client, R2 client, auth config, utils
components/                  # Shared UI components
prisma/                      # Schema, migrations, seed, clearDB
```

### Upload Flow

```
Client ──POST──▶ /api/upload (get presigned URL)
       ◀─────── { url, key, metadata }
Client ──PUT───▶ R2 bucket (direct upload with metadata headers)
       ──────── Storage key saved to database
```

- **Public bucket** → Cover images (served via `NEXT_PUBLIC_IMAGE_HOST`)
- **Private bucket** → Downloadable file assets (served through `/api/download` with purchase/ownership check)

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL database
- Cloudflare R2 (one public + one private bucket)
- GitHub and/or Google OAuth app credentials

### 1. Clone & Install

```bash
git clone <repo-url>
cd ecommerce-app
pnpm install
```

### 2. Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/devcart

# Auth
AUTH_SECRET=<random-secret>
AUTH_GITHUB_ID=<github-oauth-client-id>
AUTH_GITHUB_SECRET=<github-oauth-client-secret>
AUTH_GOOGLE_ID=<google-oauth-client-id>
AUTH_GOOGLE_SECRET=<google-oauth-client-secret>

# Cloudflare R2
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret-key>
R2_PUBLIC_BUCKET=<public-bucket-name>
R2_PRIVATE_BUCKET=<private-bucket-name>

# Public URL for cover images
NEXT_PUBLIC_IMAGE_HOST=https://<your-bucket>.r2.dev

# Stripe
STRIPE_SECRET_KEY=<stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-signing-secret>

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=<upstash-redis-rest-url>
UPSTASH_REDIS_REST_TOKEN=<upstash-redis-rest-token>
```

### 3. Database Setup

```bash
pnpm prisma generate
pnpm prisma migrate dev

# Optional: seed sample data
pnpm prisma db seed
```

### 4. R2 CORS Configuration

Add this CORS policy to **both** R2 buckets (public and private) in the Cloudflare dashboard:

| Setting | Value |
|---------|-------|
| Allowed Origins | `http://localhost:3000` |
| Allowed Methods | `GET`, `PUT`, `HEAD` |
| Allowed Headers | `content-type`, `content-length`, `x-amz-meta-*` |

### 5. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm prisma generate` | Regenerate Prisma client |
| `pnpm prisma migrate dev` | Run database migrations |
| `pnpm prisma db seed` | Seed sample data |

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/auth.ts` | NextAuth config — GitHub + Google providers, Prisma adapter |
| `lib/prisma.ts` | Prisma client singleton with `@prisma/adapter-pg` |
| `lib/cloudflareR2.ts` | S3-compatible R2 client |
| `lib/utils.ts` | Shared utilities (`getImageUrl` for R2 public URLs) |
| `server/actions/cart.ts` | Cart server actions (add/remove items) |
| `server/actions/product.ts` | Product CRUD server actions |
| `prisma/schema.prisma` | Database schema (User, Product, FileAsset, Cart, Purchase) |
| `prisma/seed.ts` | Sample data seeder |
| `prisma/clearDB.ts` | Truncate all tables (respects FK constraints) |
| `lib/ratelimit.ts` | Upstash rate limiters for upload/download routes |
| `sentry.server.config.ts` | Sentry server-side initialization |
| `sentry.edge.config.ts` | Sentry edge runtime initialization |
| `instrumentation-client.ts` | Sentry client-side initialization with session replay |
| `instrumentation.ts` | Next.js instrumentation hook — loads Sentry configs |
| `app/global-error.tsx` | Global error boundary — reports uncaught errors to Sentry |

---

## License

MIT