# TestFlight Readiness Checklist

Status: active prep as of July 17, 2026.

## Direction

Everything going forward should reduce risk on the path to TestFlight and App Store review. Defer broad product expansion unless it fixes a launch blocker, account/payment risk, review risk, or final user-facing text issue.

Post-TestFlight sequence: start the standalone Supreme Court sister-app track first; keep state legislation as a future main-app expansion, likely for an early-next-year update.

## Local Native Build Gate

1. Keep the native iOS shell under `ios/CapitolLedgerNative`.
2. Keep the native purchase bridge name aligned with the web paywall: `capitolLedgerPurchase`.
3. Keep Pro and Team product IDs aligned across web, native, server validation, and App Store Connect:
   - `com.capitolwonk.pro.monthly`
   - `com.capitolwonk.pro.annual`
   - `com.capitolwonk.team.monthly`
   - `com.capitolwonk.team.annual`
   - `com.capitolwonk.team.{seatCount}.{cycle}` for monthly 4-20 and annual 4-16 seats
4. Keep Civic Team purchasable through Apple for 3-20 monthly seats and 3-16 annual seats; annual 17-20 and all 21+ teams use the custom-plan workflow.
5. Run the native build before upload prep:

```bash
xcodebuild -project ios/CapitolLedgerNative/CapitolLedgerNative.xcodeproj -scheme CapitolLedgerNative -sdk iphonesimulator -configuration Debug -derivedDataPath /private/tmp/capitol-ledger-native-derived CODE_SIGNING_ALLOWED=NO build
```

## App Store Connect Setup

Use the App Store Connect setup packet as the entry packet for App Store Connect fields, subscription notes, privacy/support URLs, screenshot candidates, and reviewer notes. Hold Apple record/product creation until the final legal app name, bundle ID, and product IDs are confirmed.

1. Confirm the final app name, bundle ID, SKU, and product IDs before creating Apple records. The current native default is `com.capitolwonk.ce`; change it only before the first TestFlight purchase, then keep it stable.
2. Create one subscription group for Pro and Team.
3. Create Pro monthly with product ID `com.capitolwonk.pro.monthly` at $4.99 and configure the 7-day free trial introductory offer that renews at $4.99/month unless canceled before renewal.
4. Create Pro annual with product ID `com.capitolwonk.pro.annual` at $39.99/year.
5. Keep Team monthly product ID `com.capitolwonk.team.monthly` at $17.99 for three seats and Team annual `com.capitolwonk.team.annual` at $179.99 for three seats.
6. July 17, 2026 audit complete: monthly 4-20 and annual 4-16 use `com.capitolwonk.team.{seatCount}.{cycle}`, are U.S.-only, and match the exact matrix; annual 17-20 are reserved and unavailable.
7. English (U.S.) display names, subscription descriptions, and prices are set for the 30 additional launch-active Team products. Still reorder the subscription levels and complete any required App Review screenshots/notes before adding the products for review.
8. Create or select the App Store Server API key.
9. Add host environment variables through the deployment provider, never git:
   - `APP_STORE_BUNDLE_ID`
   - `APP_STORE_ACCOUNT_TOKEN_NAMESPACE`
   - `APP_STORE_CONNECT_ISSUER_ID`
   - `APP_STORE_CONNECT_KEY_ID`
   - `APP_STORE_CONNECT_PRIVATE_KEY`
10. Deploy and verify support/privacy URLs:
   - `https://project-qosv1.vercel.app/support`
   - `https://project-qosv1.vercel.app/privacy`
11. Keep Stripe checkout variables out of the App Store launch environment unless a separate web checkout path is deliberately reintroduced.

## Purchase QA Gate

1. Run StoreKit local purchase smoke from Xcode if useful.
2. Run sandbox/TestFlight purchase QA for monthly and annual Pro plus representative Team tiers: 3, 4, 10, and 20 seats.
3. Verify purchase unlocks the selected paid plan on device.
4. Verify Pro monthly shows the 7-day free trial terms and the post-trial $4.99/month renewal before confirmation.
5. Verify signed transaction sync updates the signed-in account.
6. Verify restore purchases works after reinstall/sign-out/sign-in.
7. Verify cancellation/expiration removes paid access after Apple reports inactive entitlement.
8. Verify an Apple original transaction cannot be linked to a second account.
9. Verify Team purchases charge the selected tier total, open exactly the selected supported teammate seats, and do not consume a seat for the owner.
10. Verify monthly allows 3-20, annual allows 3-16, annual 17-20 routes to custom planning, and all 21+ counts use the custom-plan path.

## Final Text Tone Pass

Do this after the native purchase path is stable and before TestFlight screenshots/review notes.

Review launch-facing copy for clarity, trust, and App Store reviewer comprehension:

1. `/sign-in`: account creation, verification, reset, and errors.
2. `/account`: profile, saved ledger, privacy, plan status, and sign-out.
3. `/settings`: account sync, notification preferences, plan/purchases, feedback entry.
4. `/privacy` and `/support`: App Store support/privacy copy, privacy requests, purchase help, and review clarity.
5. `/upgrade`: Apple purchase, 7-day Pro trial disclosure, restore purchases, monthly 3-20 and annual 3-16 Team selection/totals, custom-plan paths, Free/Pro language.
6. `/feedback`: live issue reporting, severity/category labels, successful submit state.
7. `/feedback/review`: reviewer-only copy, release decisions, empty states.
8. `/alerts`: action-needed labels, unread/read states, priority gating language.
9. `/brief`: in-app Daily Brief wording and locked/pro states.
10. `/search`, bill detail, and member detail: empty states, source placeholders, and screenshot-visible labels.
11. Empty states and error states across auth, purchase sync, feedback, alerts, and account persistence.

## Verification Plan

Run these before treating the build as TestFlight-ready:

```bash
pnpm testflight:check
pnpm launch-copy:check
pnpm ios-native:check
pnpm billing:check
pnpm billing-transition:check
pnpm backend:check
pnpm lint
pnpm exec tsc --noEmit --pretty false
```

After App Store Connect products and server variables are configured, run:

```bash
TESTFLIGHT_REQUIRE_READY=true pnpm testflight:check
BILLING_REQUIRE_APP_STORE=true pnpm billing:check
```

## Next Best Step

The app identity, four StoreKit product IDs, prices, and Pro Monthly introductory offer are set. Finish the Paid Apps/Small Business enrollment and App Store Server API credentials outside git, then run `TESTFLIGHT_REQUIRE_READY=true pnpm testflight:check` and `BILLING_REQUIRE_APP_STORE=true pnpm billing:check`. After both pass, run sandbox/TestFlight purchase and restore QA for all four products and capture final screenshots from the stable build.
