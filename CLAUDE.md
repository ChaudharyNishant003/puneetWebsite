# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Online store for a single family clothing shop (Puneet Garments): Next.js 15 App Router (React 19, Turbopack) + PostgreSQL via Prisma 6, Tailwind 4, zod 4. Storefront with OTP login/checkout, Razorpay/COD payments, local + Shiprocket delivery, size exchanges, reviews, an owner/staff admin panel, and a hidden developer "ops console". Customer-facing copy mixes English and Hinglish; currency is INR (whole rupees).

## Commands

```bash
npm run db:local        # embedded Postgres on :5434, data in ./.pgdata (no Docker) — keep running in its own terminal
npm run db:migrate      # prisma migrate deploy
npm run seed            # deterministic dummy catalogue, orders, reviews, coupons, admin logins (all rows isDemo=true)
npm run dev             # next dev --turbopack on :3000
npm run dev:local       # same, but keeps TMP/TEMP on this drive (the dev machine's C: drive is full and silently breaks compiles)
npm run check           # lint + typecheck + unit tests
npm test                # vitest run (tests/unit/**/*.test.ts only)
npx vitest run tests/unit/pricing.test.ts -t "priceCart"   # single file / single test
npm run test:e2e        # Playwright, needs an already-running seeded server in mock mode (E2E_BASE_URL, default :3000)
npm run demo:purge -- --yes   # delete all isDemo rows/images before launch
```

- `.claude/launch.json` defines the `puneet-dev` preview server (`npm run dev`, port 3000).
- Schema changes: edit `prisma/schema.prisma`, then `npx prisma migrate dev --name <name>` (migrations live in `prisma/migrations/`). `npm run build` runs `prisma generate`; `npm start` runs `prisma migrate deploy` first.
- Playwright runs a single mobile project (Pixel 5), serially, 1 worker.
- `@/` is the path alias for the repo root (tsconfig + vitest).

## Architecture

### Layout
- `app/(shop)/` storefront routes; `app/admin/(panel)/` admin pages (layout calls `requireAdmin()` and filters nav by feature flags/role); `app/admin/login`.
- `app/actions/*.ts` — server actions (`"use server"`), the main mutation path for both storefront and admin. `app/api/` holds only route handlers that need HTTP semantics (cart, search suggest, invoice PDF, CSV export, health, Razorpay webhook).
- `lib/` — domain logic. Key modules: `pricing.ts` (pure: `priceCart`, `codEligibility`, coupons, GST — unit tested), `orders.ts` (stock reservation in transactions, status transitions via `ALLOWED_TRANSITIONS`, notifications), `cart.ts` (cookie-keyed cart), `fulfilment.ts`, `exchange.ts` (pure), `search/` (Hinglish query parsing + in-memory ranking over a small catalogue), `settings.ts`, `flags.ts`, `features.ts`.
- `lib/config.ts` — shop identity from `NEXT_PUBLIC_SHOP_*` env (placeholders until the client confirms) and `defaultSettings`; admin-edited values in the `Setting` table override defaults (`getSettings`). Storefront code should use `getShopSettings()`, which zeroes settings for switched-off features. `shop.hasStore` (`NEXT_PUBLIC_SHOP_HAS_STORE`) is false for this online-only client: `lib/flags.ts` forces the `storePage` site switch off and walk-in-shop copy is gated on it. An empty `shop.gstin` means not GST-registered: footer/terms drop GST wording and `lib/invoice.tsx` renders a plain invoice. `courierShippingFee: 0` means free shipping everywhere (`amountToFreeShipping` is 0).

### Mock mode for every integration
Each `lib/integrations/*` module checks for its env keys and falls back to a mock when absent, so the whole site runs with no external accounts:
- payments (Razorpay): mock order IDs, signature `"mock_signature"`, "Test payment" dialog
- sms (MSG91) / OTP: code shown on screen
- email (Resend): HTML written to `tmp/mails/`
- images (Cloudinary): files written to `public/uploads/` (magic-byte sniffing either way)
- shipping (Shiprocket): local pincodes first, then mock serviceability

`isDemoMode()` is true in non-production or with `DEMO_MODE=1` (Railway demo deploy: shows OTP, allows simulated payments, demo banner, blocks indexing). Never set `DEMO_MODE` on the real store.

### Feature switches (two sides per feature)
`lib/features.ts` (`FEATURES`) is the single source of truth: each feature has an optional `admin` switch and/or `site` switch. Flags live in the `FeatureFlag` table; a **missing row means ON**. `lib/flags.ts` caches them in process memory (30s TTL; ops writes call `invalidateFlags()`).
- Admin pages: `await requirePage("key")` → behaves like a 404 when off.
- Server actions: `await requireAction("key", side)` → throws a generic `Unavailable` error (never reveal why).
- Server components/actions: `(await getFlags()).site("key")` / `.admin("key")`.
- Client components: `useSite("key")` from `components/shop/SiteFlags.tsx` (provider fed by `siteFlags()` in the shop layout).
When adding a switchable feature, add it to `FEATURES` and gate every entry point with the same key. `getControls()` (`SiteControl` table) holds maintenance mode for site/admin and the admin user limit.

### Auth
- Sessions are HS256 JWT cookies via `jose` (`lib/auth/session.ts`): `pg_session` (customer, phone OTP), `pg_admin` (admin), plus an ops session. `SESSION_SECRET` must be 32+ chars or everything throws.
- Admin: argon2 passwords, roles `OWNER`/`STAFF`. `requireAdmin("OWNER")` re-checks the DB each request (active, `lockedByOps`, `tokenVersion` so resets kill sessions). Admin mutations follow `requireAdmin()` → `requireAction(key)` → zod validation → write → `audit(u.email, ...)`.
- Rate limiting is a Postgres fixed-window table (`rateLimit(key, limit, windowSec)`), no Redis.

### Ops (developer) console — testing phase only
`middleware.ts` rewrites the secret path `/${OPS_CONSOLE_PATH}` to the internal route `app/zdc-internal/` and makes `/zdc-internal` itself 404. `opsEnabled()` requires `OPS_CONSOLE_PATH`, `OPS_EMAIL`, `OPS_PASSWORD` **and** (non-production or `DEMO_MODE=1`); the first sign-in bootstraps the `OpsUser` from env, then email OTP. Any failure looks like a missing page. The console toggles feature switches, maintenance, admin accounts, and "view as admin" (impersonated sessions carry `imp`; their actions are audited as actor `"developer"`). It must be removed before go-live. Design notes: `docs/developer-console-plan.html`.

### Data conventions
- Seed is deterministic (fixed PRNG) and generates SVG placeholder images into `public/dummy/`; every seeded row has `isDemo=true`.
- Money is integer rupees; prices are GST-inclusive (`includedTax`, `apparelGstRate`).
- `track()` in `lib/events.ts` writes a first-party funnel log and must never throw into the request.

## Deploy

Railway (`railway.json`: Railpack build `npm run build`, start `npm start`, healthcheck `/api/health`). `.env*` files are kept out of uploads via `.railwayignore`. Set `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, shop identity vars; seed once with `railway run npm run seed`. Razorpay webhook → `/api/webhooks/razorpay`. README "Before launch" lists the go-live checklist (real keys, remove `DEMO_MODE`, replace "[Placeholder]" policy text, change seeded admin passwords, purge demo data).

## Docs

`docs/` holds HTML planning/report documents (implementation plan, developer console plan, build report, Hindi user guide); `mockups/` holds design mockups.
