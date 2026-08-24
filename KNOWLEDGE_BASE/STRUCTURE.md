# Project Structure

File/folder map of the repo. See [KNOWLEDGE_BASE.md](KNOWLEDGE_BASE.md) for what each layer is
responsible for and the design decisions behind it.

```
bias-collection/
├── .claude/
│   └── launch.json              # dev server preview config (port 3010, see KNOWLEDGE_BASE.md)
├── .env                          # gitignored — DATABASE_URL, JWT_SECRET, gateway keys
├── prisma/
│   ├── schema.prisma             # 30 models — datasource: sqlite (dev.db)
│   ├── seed.ts                   # idempotent seed (upserts) — roles, users, catalog, demo orders
│   └── dev.db                    # gitignored SQLite file, created by `prisma db push`
├── public/
│   └── images/                   # category/hero/promo/product images (AI placeholders, see TODO)
├── scripts/
│   └── placeholders.py           # generated the placeholder product images
├── src/
│   ├── middleware.ts              # edge auth guard for /admin/** and /account/** (page routes only)
│   ├── app/
│   │   ├── layout.tsx, robots.ts, sitemap.ts, globals.css
│   │   ├── (store)/               # customer-facing storefront (route group, no /store prefix in URL)
│   │   │   ├── page.tsx                       # homepage
│   │   │   ├── shop/, new-arrivals/, sale/, categories/, product/[slug]/
│   │   │   ├── cart/, checkout/, wishlist/
│   │   │   ├── login/, register/
│   │   │   ├── account/           # addresses, orders/[orderNumber], settings, wishlist
│   │   │   ├── order/[orderNumber]/   # ⚠ public confirmation page — see TODO security items
│   │   │   ├── about/, contact/, not-found.tsx
│   │   ├── admin/                 # staff-only pages, guarded by middleware + layout + per-route perms
│   │   │   ├── page.tsx (dashboard), products/, categories/, orders/, customers/, users/
│   │   │   ├── coupons/, promotions/, inventory/, banners/, homepage/, shipping/
│   │   │   ├── payments/, reviews/, reports/, settings/, audit/
│   │   └── api/                   # thin route handlers → services/
│   │       ├── auth/ (login, register, logout, me)
│   │       ├── products/, categories/, cart/, wishlist/, reviews/, coupons/validate, checkout/
│   │       ├── search/suggest, newsletter/, contact/, upload/
│   │       ├── account/ (addresses, password)
│   │       └── admin/             # every route re-checks its own permission (no middleware backstop)
│   │           ├── products/, categories/, orders/, customers/, users/
│   │           ├── coupons/, promotions/, inventory/, banners/, homepage/, shipping/
│   │           ├── payments/, reviews/, settings/, audit/, notifications/
│   │           └── analytics/, reports/sales/
│   ├── components/
│   │   ├── store/                 # Header, Footer, ProductCard/Grid/Gallery, Cart/Checkout clients, forms
│   │   ├── admin/                 # AdminShell, per-entity *Client.tsx components, Charts, StatCard
│   │   ├── auth/                  # LoginForm, RegisterForm
│   │   ├── ui/                    # icons.tsx, primitives.tsx (shared design system bits)
│   │   └── providers.tsx
│   ├── services/                  # all business logic — one file per domain (see KNOWLEDGE_BASE.md)
│   │   ├── auth, product, category, cart, checkout, order, inventory, discount, coupon,
│   │   │   promotion, payment, shipping, notification, analytics, cms, settings, upload
│   │   └── index-helpers.ts
│   ├── lib/                       # db.ts (Prisma singleton), auth.ts/auth-helpers.ts (jose+bcryptjs),
│   │                              # permissions.ts (RBAC), api.ts (rate limit/audit/error helpers), utils.ts
│   └── stores/                    # Zustand: cart.ts, wishlist.ts, session.ts
├── KNOWLEDGE_BASE/
│   ├── KNOWLEDGE_BASE.md          # architecture, setup, env vars, "where to look for X"
│   └── STRUCTURE.md               # this file
├── TODO.md                        # prioritized work list (security findings, cleanup, roadmap)
├── README.md                      # original project pitch/spec
└── README (1).md                  # ⚠ stray duplicate, safe to delete (see TODO — Cleanup)
```

## Route-group note

`(store)` is a Next.js route group — the parentheses mean it does **not** appear in the URL.
`/`, `/shop`, `/cart`, `/account/*` etc. all live under `src/app/(store)/` but are served at the
site root, sitting alongside `/admin/**` and `/api/**` which are real path segments.
