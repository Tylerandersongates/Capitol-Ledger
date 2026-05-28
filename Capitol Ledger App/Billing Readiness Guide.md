# Billing Readiness Guide

## Purpose

Capitol Ledger already has Stripe-ready checkout and webhook routes, plus demo fallback for plan switching. This guide is the readiness gate before we test real paid checkout.

## Current App Path

1. `/upgrade` lets a user choose Free, Pro Intelligence, or Civic Team.
2. `/api/account/subscription/checkout` creates a Stripe checkout session when Stripe config is present.
3. Missing Stripe config falls back to demo subscription mode, so investor demos keep working.
4. `/api/billing/stripe/webhook` receives Stripe subscription events and updates the account subscription.
5. `/account` reads the current plan and shows plan-specific profile, preferences, Weekly Brief, and subscription controls.

## Required Environment

```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="https://your-app.example.com"
AUTH_COOKIE_SECURE="true"
STRIPE_SECRET_KEY="sk_test_or_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_LIVE_MODE="false"
CAPITOL_LEDGER_STRIPE_PRO_MONTHLY_PRICE_ID="price_..."
CAPITOL_LEDGER_STRIPE_PRO_ANNUAL_PRICE_ID="price_..."
CAPITOL_LEDGER_STRIPE_TEAM_MONTHLY_PRICE_ID="price_..."
CAPITOL_LEDGER_STRIPE_TEAM_ANNUAL_PRICE_ID="price_..."
```

Run:

```bash
pnpm billing:check
```

Use this when checking live Stripe readiness:

```bash
BILLING_REQUIRE_STRIPE=true pnpm billing:check
```

Set `STRIPE_LIVE_MODE=true` only when the configured key and price IDs are live production Stripe values.

## Stripe Price Mapping

- Pro monthly: `CAPITOL_LEDGER_STRIPE_PRO_MONTHLY_PRICE_ID`
- Pro annual: `CAPITOL_LEDGER_STRIPE_PRO_ANNUAL_PRICE_ID`
- Civic Team monthly: `CAPITOL_LEDGER_STRIPE_TEAM_MONTHLY_PRICE_ID`
- Civic Team annual: `CAPITOL_LEDGER_STRIPE_TEAM_ANNUAL_PRICE_ID`

The checkout route sends these metadata fields to Stripe:

- `userId`
- `plan`
- `cycle`

The webhook expects that metadata back so it can update the correct account subscription.

## QA Order

1. Apply Prisma migrations.
2. Run `pnpm production-auth:check`.
3. Add Stripe test-mode keys and test price IDs.
4. Run `BILLING_REQUIRE_STRIPE=true pnpm billing:check`.
5. Start with Stripe test mode, complete checkout from `/upgrade`, and verify `/account` updates to the purchased plan.
6. Trigger Stripe webhook test events and verify the account subscription updates for active, past due, and canceled states.
7. Repeat with live-mode values only after test-mode checkout and webhooks are trusted.

## Demo Safety

When Stripe config is missing, the app intentionally keeps using demo plan switching. That lets Free, Pro Intelligence, and Civic Team still be shown in the product demo without payment credentials.

## Open Decisions

- Whether App Store subscriptions will later mirror Stripe plans through RevenueCat or a direct App Store Server API bridge.
- Whether Civic Team should bill per workspace, per seat, or both.
- Whether Free users should receive a trial period before paid checkout.
- Whether checkout should start from `/upgrade` only or also from locked feature cards across the app.
