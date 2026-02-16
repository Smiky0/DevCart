# DevCart — Digital Marketplace

A full-stack digital marketplace built with **Next.js 16**, **React 19**, **Prisma 7**, and **PostgreSQL**. Sellers list digital products (templates, tools, assets), buyers browse, add to cart, and purchase — all within a server-rendered, type-safe application.

> **Status:** Under active development. Core marketplace functionality is in place; payment processing and expanded auth providers are on the roadmap.

---

## Tech Stack

| Layer          | Technology                                  |
| -------------- | ------------------------------------------- |
| Framework      | Next.js 16 (App Router, Server Actions)     |
| UI             | React 19, Tailwind CSS 4, Framer Motion     |
| Auth           | NextAuth v5 (beta) + Prisma Adapter         |
| Database       | PostgreSQL via Prisma ORM 7                 |
| Icons          | Phosphor Icons                              |
| Notifications  | Sonner (toast system)                       |
| Language       | TypeScript 5                                |
| Package Mgr    | pnpm (workspace-enabled)                    |

---

## Features

- **Storefront** — Browse published products with search, category filtering, and multi-field sorting (title, price, popularity).
- **Seller Dashboard** — Create, edit, and manage product listings including image uploads and downloadable file assets.
- **Cart System** — Persistent server-side cart per user with add/remove operations and cart count in the navbar.
- **Purchase Flow** — Purchase tracking with buyer/seller relationships and per-item records.
- **File Downloads** — Secure asset delivery via an authenticated download API route.
- **Role-based Access** — `USER` and `ADMIN` roles defined at the schema level.
- **OAuth Authentication** — GitHub provider configured via NextAuth v5 with session callbacks.
- **Responsive UI** — Mobile-first layout with animated transitions (Framer Motion) and toast notifications.

---

## Project Structure

```
app/
  (shop)/             # Public storefront — browse, product detail, cart, checkout
  (dashboard)/        # Authenticated area — library, orders, studio (product CRUD)
  api/                # Route handlers — auth, file download, upload, webhooks
components/           # Shared UI — navbar, product cards, buttons, motion wrappers
server/actions/       # Server Actions — cart and product mutations
lib/                  # Auth config, Prisma client, utility modules
prisma/               # Schema, migrations, seed script
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL instance (local or hosted)

### Setup

```bash
# Clone the repository
git clone https://github.com/<your-username>/devcart.git
cd devcart/ecommerce-app

# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env
# Fill in DATABASE_URL, NEXTAUTH_SECRET, GITHUB_ID, GITHUB_SECRET

# Run database migrations
pnpm exec prisma migrate dev

# Seed the database (optional)
pnpm exec prisma db seed

# Start the dev server
pnpm dev
```

The app will be available at `http://localhost:3000`.

---

## Environment Variables

| Variable           | Description                        |
| ------------------ | ---------------------------------- |
| `DATABASE_URL`     | PostgreSQL connection string       |
| `NEXTAUTH_SECRET`  | Random secret for session signing  |
| `GITHUB_ID`        | GitHub OAuth app client ID         |
| `GITHUB_SECRET`    | GitHub OAuth app client secret     |

---

## Roadmap

- [ ] **Stripe Integration** — Implement Stripe Checkout and webhook handling for real payment processing.
- [ ] **Expanded Auth** — Add Google, email/password, and magic link sign-in options for a proper login system.
- [ ] **Admin Panel** — Dedicated admin dashboard for platform-wide moderation and analytics.
- [ ] **S3 / R2 Storage** — Migrate file asset storage to a cloud object store (AWS S3 or Cloudflare R2).
- [ ] **Reviews & Ratings** — Allow buyers to leave feedback on purchased products.
- [ ] **Seller Analytics** — Sales metrics, revenue tracking, and download statistics per product.
- [ ] **Email Notifications** — Transactional emails for purchase confirmations and download links.

---

## Scripts

| Command          | Description                  |
| ---------------- | ---------------------------- |
| `pnpm dev`       | Start development server     |
| `pnpm build`     | Production build             |
| `pnpm start`     | Start production server      |
| `pnpm lint`      | Run ESLint                   |

---

## License

This project is not yet licensed. All rights reserved until a license is added.