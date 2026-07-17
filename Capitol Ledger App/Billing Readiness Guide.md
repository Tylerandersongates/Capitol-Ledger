# Billing Readiness Guide

## Purpose

CapitolWonk CE is now app-only for paid upgrades. Pro and Team are purchased through Apple in-app purchase in the native iOS shell, and the server validates signed StoreKit transactions before syncing paid access to the user account.

## Current App Path

1. `/upgrade` lets a user choose Pro or Team monthly/annual and starts Apple in-app purchase from the native shell. Monthly Pro presents a 7-day free trial that renews at $4.99/month unless canceled before renewal.
2. Native StoreKit handles purchase, restore, and App Store subscription management.
3. The device unlocks the paid plan immediately after StoreKit returns an active entitlement.
4. `/api/account/subscription/app-store` validates the signed transaction through App Store Server API before writing account subscription state.
5. The server blocks an Apple original transaction from being linked to a second account when a database-backed owner already exists.
6. Team uses seat-specific fixed-total App Store products for 3-20 monthly seats and 3-16 annual seats. The three-seat tier starts at $17.99/month or $179.99/year; the selected product restores the exact seat entitlement. Annual 17-20 and all 21+ workspaces use the custom-plan workflow.

## Required Environment

```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="https://your-app.example.com"
AUTH_COOKIE_SECURE="true"
APP_STORE_BUNDLE_ID="com.capitolwonk.ce"
APP_STORE_ACCOUNT_TOKEN_NAMESPACE="com.capitolwonk.ce"
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

- Pro monthly: `com.capitolwonk.pro.monthly` with 7-day free trial, then $4.99/month
- Pro annual: `com.capitolwonk.pro.annual` at $39.99/year
- Team monthly, 3 seats: `com.capitolwonk.team.monthly` at $17.99
- Team annual, 3 seats: `com.capitolwonk.team.annual` at $179.99
- Team monthly, 4-20 seats; annual, 4-16 seats: `com.capitolwonk.team.{seatCount}.{cycle}` using the fixed totals in the App Store Connect setup packet

The group contains 38 records: two Pro, 32 launch-active Team products, and four reserved annual 17-20 Team records. Keep the reserved records unavailable unless Apple grants higher price points and the app is deliberately expanded.

The July 17, 2026 App Store Connect audit configured every additional launch-active product with United States-only availability, its exact fixed-total price, and English (U.S.) metadata. The four annual 17-20 records have no sale availability, price, or localization. Subscription levels still need a final Apple-side reorder because newly created products were assigned sequential levels instead of descending seat-count levels.

## QA Order

1. Apply Prisma migrations and run `pnpm production-auth:check`.
2. Reorder App Store Connect subscription levels, complete required review information, and re-audit the existing Pro monthly trial. Team monthly 3-20, annual 3-16, and the four unavailable annual 17-20 records are otherwise configured.
3. Add App Store Server API credentials and a stable `APP_STORE_ACCOUNT_TOKEN_NAMESPACE` to the host environment.
4. Run `BILLING_REQUIRE_APP_STORE=true pnpm billing:check`.
5. Build the native iOS shell and run purchase, restore, renewal, cancellation, and expiration in sandbox/TestFlight.
6. Confirm `/account`, `/settings`, `/team`, and gated paid surfaces reflect account-synced access after validation.
7. Keep Stripe checkout disabled unless a web checkout path is deliberately reintroduced later.

## Demo Safety

Without App Store Server API credentials, local Xcode StoreKit testing can still unlock the device preview, but account-wide sync will warn or fail cleanly. Local `Xcode` StoreKit transactions are not server-validated by Apple; use sandbox/TestFlight for the real account-sync pass.

## Open Decisions

- Whether organizations above the 20-seat self-service ceiling should receive standardized custom tiers later.
- Whether annual Pro should also receive an introductory offer after monthly Pro trial QA is complete.
- Whether locked feature cards should start the same native StoreKit purchase flow after TestFlight QA proves the main `/upgrade` path.
