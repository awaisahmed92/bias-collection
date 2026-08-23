# Bias Collection — Full-Stack E-Commerce Platform

A production-oriented, full-stack fashion e-commerce platform: premium customer storefront + complete admin panel, built with **Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma · JWT auth · Zustand · Zod**.

---

## Quick Start

```bash
npm install
npx prisma db push        # creates the SQLite database
npm run db:seed           # seed catalog, roles, demo orders, coupons, promos
npm run dev               # http://localhost:3000
```

### Seeded accounts

| Role        | Email                          | Password      |
| ----------- | ------------------------------ | ------------- |
| Super Admin | `superadmin@biascollection.pk` | `Admin@12345` |
| Admin       | `admin@biascollection.pk`      | `Admin@12345` |
| Staff       | `staff@biascollection.pk`      | `Staff@12345` |
| Customer    | `customer@example.com`         | `Customer@123` |

Test coupons: **BIAS20** (20% over Rs. 5,000, capped Rs. 2,000) · **WELCOME10** · **FREESHIP**
Active promotions: store-wide 15% · flash 30% on sunglasses · 10% accessories · Buy-2-Get-1 tees

---

## Architecture

```
app/ (routes)  →  API route handlers (thin)  →  services/ (business logic)  →  Prisma  →  DB
app/(store)/   →  Server components render via the same services directly
app/admin/     →  Guarded by middleware + layout session check + per-route permission checks
```

- **`src/services/`** — all business logic: `auth, product, category, cart, checkout, order, inventory, discount, coupon, promotion, payment, shipping, notification, analytics, cms, settings, upload`. Extractable to a standalone Node/Express service later.
- **`src/lib/`** — db singleton, JWT session (jose + bcryptjs), RBAC permissions, API helpers (rate limiting, audit log, error handling).
- **`prisma/schema.prisma`** — 30 models: users/roles/permissions(RBAC), addresses, categories (tree), products/variants/images, cart/cart items, wishlist, orders/items/history, payments, coupons + usage, promotions (product/category/store/flash/BXGY/free-shipping), inventory logs, reviews, banners, homepage sections, newsletter, notifications, shipping methods, payment method configs, settings, audit logs.

## Key design decisions

### Centralized DiscountService
Single source of truth for pricing, priority ordered (no double discounts):
`Product/Flash promo → product salePrice → Category promo → Store-wide promo`, then the coupon at order level. Buy-X-Get-Y and free-shipping promos are handled in cart/shipping computation.

### Cart model
Guest carts use a **secure cart-session cookie** (`bias_cart`, httpOnly, 30 days) backed by DB carts — the spec's alternative to localStorage. On login/register the guest cart **merges** into the user's cart. Wishlist: guests → localStorage (Zustand persist), merged server-side after login.

### Checkout
Multi-step (info → address → delivery → payment → review). Prices are **recomputed server-side** at placement inside one transaction: stock decrement + inventory logs (STOCK_SOLD), order with historical price snapshots, coupon usage, payment initiation, cart clear, notifications. COD → pending payment; card/wallet sandbox providers auto-capture; bank transfer shows account instructions.

### Payments (provider abstraction)
`payment.service.ts` defines a `PaymentProvider` interface (`initiate/refund`) with providers: `cod`, `bank_transfer`, `card` (sandbox), `wallet` (sandbox). Gateways are toggled from **Admin → Payment Methods**; secrets stay in env vars, non-secret config/instructions in DB.

### Inventory
`Available = stock − reservedStock`; every movement writes an `InventoryLog` (added/sold/returned/damaged/manual) with before/after, reference and actor. Cancellation restores stock. Low-stock lists + admin alerts.

### RBAC
15 permission keys across 8 groups; roles: super_admin (all), admin (most), staff (operations subset), customer. Middleware guards `/admin` & `/account`; admin layout verifies staff role; **every admin API route re-checks its permission**. All admin mutations are audit-logged.

### Security
bcrypt password hashing, httpOnly JWT cookies, edge JWT verification, login/register/checkout rate limiting (in-memory; use Redis in prod), Zod validation on every mutation, Prisma parameterization (no SQL injection), staff-only upload endpoint (type/size validated), XSS-safe React rendering, `robots.ts` excludes admin/account/checkout.

### SEO
Per-product `generateMetadata` (SEO title/desc, canonical), Open Graph images, Product + Breadcrumb JSON-LD, `sitemap.xml` + `robots.txt` generated from the DB.

## File uploads
`upload.service.ts` — `local` provider (writes to `/public/uploads`, works out of the box) and a ready-to-enable **Cloudinary** provider (set `STORAGE_PROVIDER=cloudinary` + env keys).

## Notifications
Provider-based (EMAIL/SMS/WHATSAPP) with DB persistence; currently logs — swap provider internals for SendGrid/Twilio/WhatsApp Cloud API. Order lifecycle + admin alerts (new order, low stock, contact form).

## Switching to PostgreSQL
1. `prisma/schema.prisma`: `provider = "postgresql"`.
2. `.env`: `DATABASE_URL="postgresql://user:pass@host:5432/bias"`.
3. Money columns are `Float` here — for production money, switch them to `Decimal` (SQLite lacks native decimal).
4. `npx prisma migrate dev` → `npm run db:seed`.

## Scripts
`npm run dev` · `npm run build` · `npm start` · `npm run db:push` · `npm run db:seed`

## Notes / roadmap hooks
- Search is SQL-based with suggestion endpoint; swap `product.service.listProducts` for Meilisearch/Algolia when the catalog grows.
- Placeholder art for 10 products was generated locally (AI image quota); replace via Admin → Products → Images (upload works end-to-end).
