# Billing Readiness Guide

## Purpose

Capitol Ledger CE is now app-only for paid upgrades. Pro is purchased through Apple in-app purchase in the native iOS shell, and the server validates signed StoreKit transactions before syncing Pro to the user account.

## Current App Path

1. `/upgrade` lets a user choose Pro monthly or annual and starts Apple in-app purchase from the native shell.
2. Native StoreKit handles purchase, restore, and App Store subscription management.
3. The device unlocks Pro immediately after StoreKit returns an active entitlement.
4. `/api/account/subscription/app-store` validates the signed transaction through App Store Server API before writing account subscription state.
5. The server blocks an Apple original transaction from being linked to a second account when a database-backed owner already exists.
6. Civic Team stays visible as a later product path, but it is not part of App Store v1 billing.

## Required Environment

```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="https://your-app.example.com"
AUTH_COOKIE_SECURE="true"
APP_STORE_BUNDLE_ID="com.capitolledger.app"
APP_STORE_ACCOUNT_TOKEN_NAMESPACE="capitol-ledger-app-store-v1"
APP_STORE_CONNECT_ISSUER_ID="..."
APP_STORE_CONNECT_KEY_ID="..."
APP_STORE_CONNECT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
```

Run:

```bash
pnpm billing:check
```

Use this when checking App Store Server API readiness:

```bash
BILLING_REQUIRE_APP_STORE=true pnpm billing:check
```

Do not commit App Store Connect keys or private-key material. Add them through Apple/Vercel tooling and keep the `.p8` key in a secure password manager.

For the App Store launch path, `BILLING_REQUIRE_APP_STORE=true pnpm billing:check` should fail until `APP_STORE_BUNDLE_ID`, `APP_STORE_ACCOUNT_TOKEN_NAMESPACE`, and all App Store Server API credentials are explicitly configured.

## Product Mapping

- Pro monthly: `com.capitolledger.pro.monthly`
- Pro annual: `com.capitolledger.pro.annual`

Create both products in one App Store Connect subscription group before sandbox or TestFlight purchase QA.

## QA Order

1. Apply Prisma migrations and run `pnpm production-auth:check`.
2. Create the App Store Connect subscription group and both Pro products.
3. Add App Store Server API credentials and a stable `APP_STORE_ACCOUNT_TOKEN_NAMESPACE` to the host environment.
4. Run `BILLING_REQUIRE_APP_STORE=true pnpm billing:check`.
5. Build the native iOS shell and run purchase, restore, renewal, cancellation, and expiration in sandbox/TestFlight.
6. Confirm `/account`, `/settings`, and gated Pro surfaces reflect account-synced Pro after validation.
7. Keep Stripe checkout disabled unless a web checkout path is deliberately reintroduced later.

## Demo Safety

Without App Store Server API credentials, local Xcode StoreKit testing can still unlock the device preview, but account-wide sync will warn or fail cleanly. Local `Xcode` StoreKit transactions are not server-validated by Apple; use sandbox/TestFlight for the real account-sync pass.

## Open Decisions

- Whether Civic Team should become a separate Apple subscription product, a later non-v1 workflow, or both.
- Whether Free users should receive a trial period before paid upgrade.
- Whether locked feature cards should start the same native StoreKit purchase flow after TestFlight QA proves the main `/upgrade` path.
