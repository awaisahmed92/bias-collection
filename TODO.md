# TODO

Working list for this project. Grouped by theme; roughly priority-ordered within each group.
See [KNOWLEDGE_BASE.md](KNOWLEDGE_BASE.md) for architecture context and
[STRUCTURE.md](KNOWLEDGE_BASE/STRUCTURE.md) for the full file/folder map behind these items.

## Where we are right now (2026-08-24)

Local dev environment is fully working (`node_modules` reinstalled after being missing on a fresh
clone; DB already fully seeded — 4 users, 10 categories, 14 products, 3 coupons, 42 orders,
4 promotions, 2 banners, 4 reviews). Dev server runs on port 3010 via `.claude/launch.json`.

**Every item in "Security — critical/high/medium" and the low-severity `next.config.js` item is
now fixed and individually verified** (see each item below for exactly what was tested — direct
API calls, real end-to-end checkouts, concurrency tests, and a full manual regression after the
Next.js version bump). That includes the Next.js 14.2.5 → 14.2.35 upgrade, done last since it was
the highest-blast-radius change.

**Still open**: the `middleware.ts` informational note (by design, no fix needed), the
newly-discovered `generateOrderNumber()` race (spawned as its own task, not fixed here — see
"Reliability"), the "Security — general hardening" list (Redis rate limiting, `JWT_SECRET`
rotation, `Decimal` money columns — all deployment-time concerns, not code bugs), Cleanup, and
Product/roadmap. None of these were requested to be fixed yet.

## Done (setup pass — 2026-08-23)

- [x] `npm install`, `npx prisma db push`, `npm run db:seed` — local dev DB confirmed populated
      (4 users, 10 categories, 14 products, 3 coupons, 42 demo orders).
- [x] Verified the app actually boots: storefront homepage (200), `/admin/login` redirect (307,
      expected when logged out), `/api/products` (200), login page renders.
- [x] Initialized git (this project had no VCS at all before). Made an initial commit.
- [x] Fixed `.gitignore` — it did **not** exclude `.env` (which holds `JWT_SECRET` and payment
      gateway key placeholders). Added `.env` and `.env*.local` before the first commit, so no
      secret ever hit git history.
- [x] Set up `.claude/launch.json` so the dev server previews on port 3010 (port 3000 is taken
      by an unrelated project on this machine).

## Done (re-setup pass — 2026-08-24)

- [x] Reinstalled `node_modules` from scratch (`npm install`), regenerated the Prisma client,
      re-ran `db push`/`db:seed` (both no-ops — DB was already fully seeded), and re-verified the
      app boots and serves real data. See "Where we are right now" above.
- [x] Added [KNOWLEDGE_BASE/STRUCTURE.md](KNOWLEDGE_BASE/STRUCTURE.md) — full file/folder map of
      the repo, cross-linked from KNOWLEDGE_BASE.md and here.

## Security — critical

- [x] **Public order confirmation page has no auth check + order numbers are sequential and
      guessable → full customer PII disclosure (IDOR).** — **Fixed 2026-08-24.**
      `src/app/(store)/order/[orderNumber]/page.tsx` now requires either `order.userId ===
      session.id` (logged-in owner) or a valid opaque token (`?t=`) for guest checkouts, and
      404s otherwise (no distinction between "not found" and "not yours", so enumeration reveals
      nothing). Token is an HMAC-SHA256 of the order id keyed on `JWT_SECRET`
      (`src/lib/order-token.ts`, `generateOrderToken`/`verifyOrderToken`, timing-safe compare),
      generated once at checkout completion (`src/app/api/checkout/route.ts`) and threaded through
      the post-checkout redirect (`src/components/store/CheckoutClient.tsx`). Verified: direct
      guess of a real order number with no token → 404; same URL with the correct token → 200;
      wrong/tampered token → 404. Full guest checkout run end-to-end via the API to confirm the
      token round-trips correctly.
      Original finding: `getOrderByNumber()` was rendered with **zero session/ownership check**,
      unlike its `account/orders/[orderNumber]` sibling. Order numbers are generated as
      `BC-{year}-{10001 + count}` (`src/services/order.service.ts` lines 7–17) — a monotonically
      increasing, trivially enumerable sequence — so anyone could harvest every customer's full
      name, email, phone, address, order items, payment status, and bank-transfer instructions for
      every order ever placed just by walking the sequence.
- [x] **Upgraded Next.js off 14.2.5.** — **Fixed 2026-08-24.** Ran `npm audit fix --force`, which
      bumped `next` to `^14.2.35` (and `tsx` to `^4.23.12` as an incidental dev-dep resolution) —
      resolving the *critical* advisory bundle including the middleware authorization-bypass CVE
      (GHSA-f82v-jwr5-mffw) and the cache-poisoning/SSRF issues. Regenerated the Prisma client and
      did a full clean restart of the dev server (package/node_modules changes aren't hot-reloaded).
      **Full regression performed** (no branch used — `package.json`/`package-lock.json` were
      untouched going in, so reverting would have been a plain `git checkout` if anything broke):
      - Server boots clean on Next.js 14.2.35, no compile errors.
      - Admin login via API → 200 with correct session/permissions.
      - `/admin`, `/admin/products`, `/admin/orders` → 200 for an authenticated super_admin.
      - `/admin` and `/account` with **no** session → 307 redirect to `/login?next=...` (middleware
        still enforcing auth correctly — the exact protection path the CVE bundle targeted).
      - Tried a couple of naive middleware-bypass path patterns (double slash, encoded traversal)
        — no bypass, redirected or 404'd as expected.
      - `/api/admin/analytics` still correctly gated post-upgrade (re-verified this session's
        earlier fix survived).
      - Full guest checkout end-to-end via the API — order placed, `confirmationToken` returned,
        order confirmation page still 200 with token / 404 without (re-verified this session's IDOR
        fix survived).
      - Homepage loaded in-browser with no console errors beyond a pre-existing, unrelated missing
        `favicon.ico` (confirmed via direct request — not a regression from this upgrade).
      **Remaining, deliberately not done**: `npm audit` still flags 2 high-severity `postcss`
      advisories nested inside Next's own bundled dependency (`next/node_modules/postcss`); fixing
      those requires jumping to `next@16`, a full major-version migration far beyond a patch bump —
      not attempted here, would need its own dedicated pass.
- [x] **Env-gated the hardcoded demo credentials block on the public `/login` page.** —
      **Fixed 2026-08-24.** `src/app/(store)/login/page.tsx` now wraps the demo-accounts panel in
      `process.env.NODE_ENV !== "production"` (server component, so it's excluded entirely from
      the production render/bundle, not just hidden with CSS). Verified it still renders in dev
      (`curl localhost:3010/login` shows "Demo accounts (dev only)").

## Security — high

- [x] **`/api/admin/analytics` leaked business data + top-customer PII to any logged-in customer,
      not just staff.** — **Fixed 2026-08-24.** `src/app/api/admin/analytics/route.ts` now does a
      single `getSession()` + `isStaff(session)` check instead of the old
      `requirePermission("reports.view")` → bare `requireAuth()` fallback (which never actually
      checked role). Verified with direct API calls: logged out → 401, logged-in `customer`
      account → 403 (previously 200 with full revenue/order/top-customer data), logged-in `staff`
      account → 200 as intended.
      Original finding: the fallback called bare `requireAuth()` instead of checking `isStaff()` —
      despite the code comment's own stated intent ("visible to all staff") — so any registered
      customer could `GET /api/admin/analytics` directly and get revenue totals, pending order
      counts, and the top 6 customers by spend (name, email, lifetime value). This route isn't
      covered by `middleware.ts` (page routes only), so it was the only gap.

## Security — medium

- [x] **Rate limiter was keyed on a client-spoofable header.** — **Fixed 2026-08-24.**
      `src/lib/api.ts`'s `clientIp()` now only reads `X-Forwarded-For`/`X-Real-Ip` when
      `TRUST_PROXY=true` is explicitly set (i.e. you've actually deployed behind a reverse proxy
      that overwrites those headers) — otherwise every request maps to the same `"unknown"` key,
      so rate limiting degrades to a blunt global-per-route throttle instead of a spoofable
      per-header one. Verified: 10 login attempts each with a different spoofed `X-Forwarded-For`
      now correctly trip the 429 at attempt 11 (previously each got its own fresh bucket forever).
      Still an in-memory `Map` — resets on restart, doesn't share state across instances — swap
      for Redis before any real deployment (see hardening list below). If deploying behind a real
      reverse proxy, set `TRUST_PROXY=true` in its env so per-client limiting works again.
- [x] **Coupon usage-limit check had a TOCTOU race.** — **Fixed 2026-08-24.**
      `src/services/coupon.service.ts`'s `recordCouponUsage()` now does an atomic conditional
      `updateMany({ where: { id, usedCount: { lt: usageLimit } } })` instead of a blind
      `update({ data: { usedCount: { increment: 1 } } })` — the row lock the UPDATE takes
      serializes concurrent callers against the same coupon, so a caller that loses the race gets
      `count: 0` back and throws `CouponError`, aborting that checkout's transaction instead of
      silently exceeding the cap. Also moved the per-customer usage recheck to run immediately
      before recording usage (still not perfectly atomic for `usagePerCustomer > 1` under
      Postgres-level concurrency — the global `usageLimit` cap was the exploit the original
      finding described and is now fully closed).
      **Verified**: fired 6 concurrent calls at a coupon with `usageLimit: 1` — exactly 1 succeeded,
      5 correctly threw "This coupon has just reached its usage limit.", final `usedCount` landed
      at exactly 1 (previously all 6 would have succeeded, pushing `usedCount` to 6).
      **Found in passing (not fixed here, separately tracked)**: the same concurrency test
      surfaced an unrelated race in `generateOrderNumber()` (`src/services/order.service.ts`) —
      concurrent checkouts can generate the same order number and crash with a raw 500 instead of
      a friendly error. Flagged as its own task; see "Reliability" below.
- [x] **File upload only checked the client-supplied MIME type, not file content.** —
      **Fixed 2026-08-24.** `src/services/upload.service.ts` adds `sniffImageType()`, which
      inspects magic bytes (PNG/JPEG/GIF/WEBP/AVIF signatures) and is now the sole source of truth
      for both the accept/reject decision and the extension written to disk — the client-supplied
      `Content-Type` header and filename extension are no longer trusted for either. Verified:
      a text file containing `<script>alert(1)</script>` uploaded with a spoofed
      `Content-Type: image/png` is now rejected ("File content doesn't match a supported image
      format"); a genuine minimal PNG (built with correct magic bytes/IHDR/IDAT/IEND) still
      uploads successfully as staff.
      Original finding: `ALLOWED.includes(file.type)` trusted the attacker-controlled
      `Content-Type` field, and the saved extension came from a letters-only filter on the
      client-supplied filename — so a request claiming `image/png` while naming the file `x.html`
      wrote raw bytes to `public/uploads/.../<ts>-<uuid>.html`, served statically. Gated to staff
      accounts, but turned "staff can upload product images" into "staff can host arbitrary
      HTML/JS on the site's own origin" (stored XSS via that URL).
- [x] **Stored XSS via unescaped `<` in JSON-LD `dangerouslySetInnerHTML`.** —
      **Fixed 2026-08-24.** Added `safeJsonLd()` to `src/lib/utils.ts` — `JSON.stringify` followed
      by escaping `<` → `<` — and swapped both JSON-LD `dangerouslySetInnerHTML` calls in
      `src/app/(store)/product/[slug]/page.tsx` to use it instead of a bare `JSON.stringify`.
      Verified: created a product named `Evil</script><script>alert(1)</script>Shirt` and checked
      the rendered page's raw HTML — the JSON-LD blocks now contain the escaped
      `</script>` sequence with zero occurrences of a literal `</script><script>`
      breakout (previously this would have executed on every visit to that product page).
      Original finding: `JSON.stringify` doesn't escape `<`, so a product name containing
      `</script><script>...` broke out of the `<script type="application/ld+json">` tag. Since
      `product.name` is staff-controlled, one compromised/malicious low-privilege staff account
      (only needs `products.create`) could have planted persistent site-wide XSS.

## Reliability

- [ ] **`generateOrderNumber()` has a TOCTOU race — concurrent checkouts can collide and crash
      with a raw 500.** `src/services/order.service.ts` (lines 7–17) does `count → format → check
      exists`, but the actual `order.create()` happens later, outside this function, inside
      `checkout.service.ts`'s transaction — so two concurrent checkouts can both read the same
      count and generate the identical order number before either commits. Found while verifying
      the coupon TOCTOU fix above: 6 concurrent guest checkouts → 5 failed with a raw Prisma
      "Unique constraint failed on the fields: (`orderNumber`)" 500 error, only 1 succeeded.
      Not itself a security hole, but a real reliability bug under concurrent load (and a raw
      Prisma error reaching the client). Spawned as a separate task
      (`task_a89843bb`, "Fix race condition in order number generation") rather than fixed inline.
      **Fix direction**: make number generation atomic with the insert (retry-on-conflict loop
      around `order.create()`, or a DB-level counter/sequence) instead of check-then-later-write.

## Security — low / informational

- [ ] `src/middleware.ts` matcher (`/admin/:path*`, `/account/:path*`) intentionally covers only
      page routes, not `/api/admin/**` or `/api/account/**` by design — each API route is
      individually responsible for its own auth, with no middleware backstop. Not a bug by
      itself, but it's exactly how finding #2 (analytics) slipped through; worth keeping in mind
      whenever a new admin API route is added.
- [x] `next.config.js` wildcard `remotePatterns` tightened. — **Fixed 2026-08-24.** Scoped to
      `res.cloudinary.com` (the only external image host this app actually references — see
      `STORAGE_PROVIDER=cloudinary` in `upload.service.ts`) instead of `hostname: "**"`.
      **Correction to the original finding**: grepped the codebase and confirmed `next/image`'s
      `<Image>` component isn't imported or used anywhere — every image in the app is a plain
      `<img>` tag. So the described SSRF surface ("proxy-fetch from any HTTPS host used in an
      `<Image src>`") wasn't actually reachable today; `remotePatterns` was inert dead config.
      Tightened anyway as a guardrail for whenever `<Image>` gets adopted later — verified the app
      still boots and serves pages normally after the change (Next auto-restarted on the config
      edit, as expected).

## Verified secure — no action needed

Confirmed by direct code review, listed so nobody re-litigates these later:

- Every other `/api/admin/**` route (products, orders, customers, users, categories, coupons,
  banners, homepage, shipping, promotions, inventory, reviews, settings, payments, audit)
  correctly calls `requirePermission("<specific.key>")` — analytics (finding above) was the only
  outlier.
- Account/order ownership is correctly enforced on addresses, the logged-in order-history view,
  cart, and wishlist (all scoped by session user id) — only the *public* order page (critical
  finding above) skips this check.
- Registration cannot self-assign a role (`auth.service.ts` hardcodes `"customer"`); staff
  creation is separately gated behind `users.manage`.
- JWT/session handling is solid: signature + expiry verified via `jose`, session re-fetches the
  user from the DB every request (so deactivating a user invalidates their session immediately),
  cookie is `httpOnly` + `sameSite: lax` + `secure` in production.
- Passwords: bcrypt with 10 rounds, no plaintext logging, current-password required to change.
  No password-reset flow exists at all (so nothing to audit there, but also nothing to leak).
- Checkout recomputes subtotal/discount/coupon/shipping/tax entirely server-side — no
  client-supplied price is ever trusted.
- No SQL injection surface — no raw `$queryRaw`/`$executeRaw` usage anywhere; all access goes
  through Prisma's query builder.
- No XSS via user content (reviews etc.) — React's default JSX escaping handles it; the only
  `dangerouslySetInnerHTML` usages are the two JSON-LD blocks covered above.
- No explicit CSRF token, but `sameSite: lax` + `httpOnly` cookies give a reasonable baseline for
  this architecture.

## Security — general hardening (from README's stated posture — verify, don't just trust)

- [ ] Move rate limiting (login/register/checkout) from in-memory to Redis (or similar) before any
      real deployment — in-memory means it resets on restart and doesn't work across instances.
- [ ] If deploying for real: rotate `JWT_SECRET` to a freshly generated value — never reuse the
      value currently committed in `.env` on this machine, even though it's now gitignored.
- [ ] Verify file upload endpoint validates content-type/size **server-side**, not just via
      client-side `accept` attributes or a trusted `Content-Type` header (spoofable).
- [ ] Before switching off SQLite: change money columns from `Float` to `Decimal` in
      `prisma/schema.prisma` (README already flags this; SQLite lacks native decimal).

## Cleanup

- [ ] Delete the stray duplicate `README (1).md` at the repo root.
- [ ] Decide: keep `next-env.d.ts`/`prisma/dev.db-journal` churn out of git (already gitignored)
      but confirm no other generated files got swept into the initial commit by mistake.

## Product/roadmap (from README, unchanged — not urgent)

- [ ] Swap SQL-based search (`product.service.listProducts`) for Meilisearch/Algolia once the
      catalog grows beyond the current 14 demo products.
- [ ] Replace AI-generated placeholder images for the 10 products noted in README with real
      product photography via Admin → Products → Images.
- [ ] Wire real notification providers (SendGrid/Twilio/WhatsApp Cloud API) — currently
      notifications only log to the DB.
