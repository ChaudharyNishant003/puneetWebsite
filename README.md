# Puneet Garments — online store (MVP)

Next.js 15 + PostgreSQL (Prisma) store for a single family clothing shop: storefront, OTP checkout with
Razorpay/COD, local + Shiprocket delivery, exchanges, reviews and an owner/staff admin panel.
Every external service has a **mock mode**, so the whole site runs on dummy data without any keys.

## Run locally

```bash
npm install
cp .env.example .env          # then set SESSION_SECRET
npm run db:local              # terminal 1: Postgres on :5434 (data in ./.pgdata), no Docker needed
npm run db:migrate            # terminal 2
npm run seed                  # 16 categories, ~78 dummy products, reviews, orders, coupons, admin logins
npm run dev                   # or: npm run dev:local on a machine with a full C: drive (keeps temp on this drive)
```

- Store: http://localhost:3000 · Admin: http://localhost:3000/admin (seeded logins are in `.env.example`)
- Mock mode: OTPs appear on screen, payments show a "Test payment" dialog, emails are written to `tmp/mails/`.

## Checks

```bash
npm run check                 # lint + typecheck + unit tests
npx playwright test           # E2E on a running server (mobile viewport, mock mode)
```

## Deploy (Railway)

1. Create a project with a Postgres service and a web service from this repo (`railway.json` sets build/start/healthcheck).
2. Set variables on the web service: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`, shop identity
   (`NEXT_PUBLIC_SHOP_*`, `SHOP_GSTIN`). For a demo deploy without keys also set `DEMO_MODE=1` (shows OTP on screen,
   allows simulated payments, adds a demo banner and blocks search engines).
3. `npm start` runs `prisma migrate deploy` before starting. Seed once: `railway run npm run seed`.
4. Webhooks: Razorpay → `/api/webhooks/razorpay` (events `payment.captured`, `order.paid`) with `RAZORPAY_WEBHOOK_SECRET`.

## Before launch

- Add real keys: Razorpay (live), MSG91 (DLT templates), Shiprocket, Resend, Cloudinary; remove `DEMO_MODE`.
- Replace placeholder shop details and policy text (marked "[Placeholder]" on the policy pages).
- Change the seeded admin passwords (Admin → Users) or create real users and deactivate the demo ones.
- `npm run demo:purge -- --yes` removes all dummy products, orders, reviews and images.

## Phase 2 (not in this MVP)

WhatsApp, in-store POS/billing, phone-number loyalty, store pickup / exchange / reserve-and-try, video-call shopping.
