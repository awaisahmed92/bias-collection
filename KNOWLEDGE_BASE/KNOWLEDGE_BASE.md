# Bias Collection — Knowledge Base

Internal reference for working on this codebase. See [README.md](README.md) for the
original project pitch, [STRUCTURE.md](STRUCTURE.md) for the full file/folder map, and
[TODO.md](../TODO.md) for current priorities. Kept up to date as the project evolves.

## What this is

A full-stack fashion e-commerce platform: customer storefront + admin panel.
Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma (SQLite in dev) · JWT auth (jose) ·
bcryptjs · Zustand · Zod.

## Local setup (verified working — last confirmed 2026-08-24)

```bash
npm install
npx prisma generate       # regenerates the Prisma client into node_modules
npx prisma db push        # creates prisma/dev.db from prisma/schema.prisma (no-op if already in sync)
npm run db:seed           # idempotent — safe to re-run, upserts demo data
npm run dev               # http://localhost:3000 (or :3010 via the Claude Code preview, see below)
```

Notes specific to this machine:
- `node_modules/` and `.next/` are gitignored and **not** present after a fresh clone — always
  `npm install` first. `prisma/dev.db` (SQLite file) is also gitignored but was present in this
  working copy with full seed data already loaded, so `db push`/`db:seed` were no-ops on the
  2026-08-24 pass (confirmed via a direct row-count check): 4 users, 10 categories, 14 products,
  3 coupons, 42 orders, 4 promotions, 2 banners, 4 reviews.
- Port 3000 is often occupied by an unrelated project's Vite dev server (`/Volumes/Projects/Saas`).
  If `npm run dev` won't bind, run `npx next dev -p <other-port>` instead of killing that process.
- `.claude/launch.json` is configured to run this app's dev server on port **3010** for the
  Claude Code browser preview tool. Smoke-tested 2026-08-24: `/` (200), `/admin` (307 redirect to
  login, expected logged-out), `/login` (200), `/api/products` (200).
- Next.js was upgraded `14.2.5` → `^14.2.35` on 2026-08-24 (`npm audit fix --force`, full manual
  regression done — see [TODO.md](../TODO.md)), resolving the critical middleware-bypass CVE
  bundle. Two high-severity `postcss` advisories remain, nested inside Next's own bundled
  dependency — fixing those needs a `next@16` major-version migration, out of scope for a patch
  bump; see TODO.md for details.

### Seeded accounts

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@biascollection.pk` | `Admin@12345` |
| Admin | `admin@biascollection.pk` | `Admin@12345` |
| Staff | `staff@biascollection.pk` | `Staff@12345` |
| Customer | `customer@example.com` | `Customer@123` |

These are also printed on the public `/login` page UI — see [TODO.md](TODO.md) security items
before this ever goes anywhere near production.

Test coupons: `BIAS20` (20% over Rs. 5,000, capped Rs. 2,000), `WELCOME10`, `FREESHIP`.

## Architecture

```
app/ (routes)  →  API route handlers (thin)  →  services/ (business logic)  →  Prisma  →  DB
app/(store)/   →  Server components render via the same services directly
app/admin/     →  Guarded by middleware + layout session check + per-route permission checks
```

- `src/services/` — all business logic, one file per domain: `auth, product, category, cart,
  checkout, order, inventory, discount, coupon, promotion, payment, shipping, notification,
  analytics, cms, settings, upload`. Designed to be extractable into a standalone Node/Express
  service later — API routes stay thin wrappers around these.
- `src/lib/` — `db.ts` (Prisma singleton), `auth.ts` + `auth-helpers.ts` (JWT session via jose +
  bcryptjs), `permissions.ts` (RBAC), `api.ts` (shared API helpers: rate limiting, audit log,
  error handling), `utils.ts`.
- `src/middleware.ts` — edge middleware guarding `/admin` and `/account`.
- `prisma/schema.prisma` — 30 models. Grouped roughly as:
  - **Identity/RBAC**: User, Role, Permission, RolePermission, Address
  - **Catalog**: Category (tree), Product, ProductImage, ProductVariant
  - **Cart/Wishlist**: Cart, CartItem, WishlistItem
  - **Orders**: Order, OrderItem, OrderStatusHistory, Payment
  - **Merchandising**: Promotion, PromotionProduct, PromotionCategory, Coupon, CouponUsage
  - **Ops**: InventoryLog, Review, Banner, HomepageSection, NewsletterSubscriber, Notification,
    ShippingMethod, PaymentMethodConfig, Setting, AuditLog

## Key design decisions (from README, verified against code)

- **DiscountService** is the single source of pricing truth, applied in priority order (no double
  discounts): Product/Flash promo → product salePrice → Category promo → Store-wide promo, then
  the coupon at order level. Buy-X-Get-Y and free-shipping promos are computed in cart/shipping.
- **Cart**: guest carts use an httpOnly `bias_cart` cookie (30 days) backed by a DB `Cart` row
  (not localStorage). Merges into the user's cart on login/register. Wishlist is the opposite:
  localStorage for guests (Zustand persist), merged server-side after login.
- **Checkout**: multi-step (info → address → delivery → payment → review). Prices are
  **recomputed server-side** at placement inside one DB transaction: stock decrement + inventory
  log (STOCK_SOLD), order with historical price snapshots, coupon usage record, payment
  initiation, cart clear, notifications. COD → pending payment; card/wallet are sandbox providers
  that auto-capture; bank transfer shows manual instructions.
- **Payments**: `payment.service.ts` defines a `PaymentProvider` interface (`initiate`/`refund`)
  with `cod`, `bank_transfer`, `card` (sandbox), `wallet` (sandbox) implementations. Gateways are
  toggled from Admin → Payment Methods; secrets live in env vars, non-secret config in DB.
- **Inventory**: `Available = stock − reservedStock`. Every movement writes an `InventoryLog`
  (added/sold/returned/damaged/manual) with before/after, reference, and actor. Cancelling an
  order restores stock. Admin has low-stock lists/alerts.
- **RBAC**: 15 permission keys across 8 groups. Roles: `super_admin` (all), `admin` (most),
  `staff` (operations subset), `customer` (none). Middleware guards `/admin` and `/account`
  **page routes only** — it does not cover `/api/admin/**` or `/api/account/**`, so each API
  route is individually responsible for its own auth. A full audit confirmed every admin API
  route correctly re-checks its specific permission **except** `/api/admin/analytics`, which has
  a bug that lets any logged-in customer read it — see [TODO.md](TODO.md) for the fix.
- **File uploads**: `upload.service.ts` has a `local` provider (writes to `/public/uploads`,
  works out of the box) and a Cloudinary provider gated behind `STORAGE_PROVIDER=cloudinary` +
  env keys. Staff-only, but file-type validation trusts the client-supplied MIME type rather than
  sniffing actual content — see [TODO.md](TODO.md).
- **Notifications**: provider-based (EMAIL/SMS/WHATSAPP), currently just logs to DB — swap in
  SendGrid/Twilio/WhatsApp Cloud API for real delivery.
- **SEO**: per-product `generateMetadata`, Open Graph images, Product + Breadcrumb JSON-LD,
  DB-generated `sitemap.xml` + `robots.txt` (excludes admin/account/checkout).

## Switching to PostgreSQL (for anything beyond local dev)

1. `prisma/schema.prisma`: change `provider` to `"postgresql"`.
2. `.env`: `DATABASE_URL="postgresql://user:pass@host:5432/bias"`.
3. Money columns are `Float` in the SQLite schema — switch to `Decimal` for real money handling
   (SQLite has no native decimal type, which is why Float was used here).
4. `npx prisma migrate dev` → `npm run db:seed`.

## Environment variables (`.env`, gitignored)

| Var | Purpose |
|---|---|
| `DATABASE_URL` | SQLite file path in dev; Postgres URL in prod |
| `JWT_SECRET` | Signs session JWTs — **the checked-in dev value must never be reused anywhere real** |
| `SESSION_TTL_DAYS` | Session cookie lifetime |
| `NEXT_PUBLIC_STORE_NAME`, `NEXT_PUBLIC_CURRENCY` | Storefront branding |
| `STORAGE_PROVIDER` | `local` or `cloudinary` |
| `CLOUDINARY_*` | Only used when `STORAGE_PROVIDER=cloudinary` |
| `CARD_GATEWAY_KEY`, `WALLET_GATEWAY_KEY` | Sandbox payment gateway keys — real keys go here, never in the DB |
| `TRUST_PROXY` | `"true"` only when deployed behind a reverse proxy that overwrites `X-Forwarded-For`/`X-Real-Ip` with the real client IP — otherwise those headers are attacker-controlled and `src/lib/api.ts`'s `clientIp()` ignores them (see TODO.md) |

`.env` was **not** in `.gitignore` originally; this was fixed before the repo's first commit
(see git history / TODO). Always double-check `.env` is excluded before pushing this anywhere.

## Known rough edges / non-obvious things

- Rate limiting on login/register/checkout is **in-memory** per README — meaning it resets on
  every server restart and does not work across multiple server instances. Needs Redis (or
  similar) before any real deployment.
- The public `/login` page used to print all four demo account credentials in plain text; now
  env-gated to `NODE_ENV !== "production"` (fixed 2026-08-24, see TODO.md).
- Next.js was pinned to `14.2.5`, which had multiple published CVEs including a critical
  authorization-bypass-in-middleware advisory — directly relevant since this app's admin/account
  protection relies on middleware. Upgraded to `^14.2.35` 2026-08-24. See [TODO.md](../TODO.md).
- Search is plain SQL via `product.service.listProducts` with a suggestion endpoint; swap for
  Meilisearch/Algolia if the catalog grows.
- Placeholder product images for 10 products were AI-generated locally (`scripts/placeholders.py`)
  due to image-gen quota limits; replace via Admin → Products → Images when real photography exists.
- There's a stray duplicate `README (1).md` at the repo root (looks like an accidental duplicate
  download) — safe to delete, kept out of the way for now.

## Where to look for X

| Need to... | Look at |
|---|---|
| Change how a discount/promo applies | `src/services/discount.service.ts` |
| Add a new payment method | `src/services/payment.service.ts` (implement `PaymentProvider`) |
| Change what happens at order placement | `src/services/checkout.service.ts` |
| Add/modify a permission | `src/lib/permissions.ts` + `prisma/seed.ts` (`PERMISSION_GROUPS`, `ROLE_DEFS`) |
| Change session/JWT behavior | `src/lib/auth.ts`, `src/lib/auth-helpers.ts`, `src/middleware.ts` |
| Add an admin-only API route | Mirror an existing one under `src/app/api/admin/**/route.ts` — must re-check its own permission, don't rely on middleware alone |
| Change seed/demo data | `prisma/seed.ts` (idempotent — uses `upsert`) |
