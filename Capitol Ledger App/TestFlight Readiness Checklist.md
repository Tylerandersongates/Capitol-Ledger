# TestFlight Readiness Checklist

Status: active prep as of June 25, 2026.

## Direction

Everything going forward should reduce risk on the path to TestFlight and App Store review. Defer broad product expansion unless it fixes a launch blocker, account/payment risk, review risk, or final user-facing text issue.

## Local Native Build Gate

1. Keep the native iOS shell under `ios/CapitolLedgerNative`.
2. Keep the native purchase bridge name aligned with the web paywall: `capitolLedgerPurchase`.
3. Keep Pro product IDs aligned across web, native, server validation, and App Store Connect:
   - `com.capitolledger.pro.monthly`
   - `com.capitolledger.pro.annual`
4. Keep Civic Team visible as later, not purchasable for App Store v1.
5. Run the native build before upload prep:

```bash
xcodebuild -project ios/CapitolLedgerNative/CapitolLedgerNative.xcodeproj -scheme CapitolLedgerNative -sdk iphonesimulator -configuration Debug -derivedDataPath /private/tmp/capitol-ledger-native-derived CODE_SIGNING_ALLOWED=NO build
```

## App Store Connect Setup

Use `Capitol Ledger App/App Store Connect Setup Packet.md` as the exact entry packet for App Store Connect fields, subscription notes, privacy/support URLs, screenshot candidates, and reviewer notes.

1. Create the app record and confirm final bundle ID. The current native default is `com.capitolledger.app`; change it only before the first TestFlight purchase, then keep it stable.
2. Create one subscription group for Pro.
3. Create Pro monthly with product ID `com.capitolledger.pro.monthly`.
4. Create Pro annual with product ID `com.capitolledger.pro.annual`.
5. Set final display names, review descriptions, prices, and localization.
6. Create or select the App Store Server API key.
7. Add host environment variables through the deployment provider, never git:
   - `APP_STORE_BUNDLE_ID`
   - `APP_STORE_ACCOUNT_TOKEN_NAMESPACE`
   - `APP_STORE_CONNECT_ISSUER_ID`
   - `APP_STORE_CONNECT_KEY_ID`
   - `APP_STORE_CONNECT_PRIVATE_KEY`
8. Deploy and verify support/privacy URLs:
   - `https://project-qosv1.vercel.app/support`
   - `https://project-qosv1.vercel.app/privacy`
9. Keep Stripe checkout variables out of the App Store launch environment unless a separate web checkout path is deliberately reintroduced.

## Purchase QA Gate

1. Run StoreKit local purchase smoke from Xcode if useful.
2. Run sandbox/TestFlight purchase QA for monthly and annual Pro.
3. Verify purchase unlocks Pro on device.
4. Verify signed transaction sync updates the signed-in account.
5. Verify restore purchases works after reinstall/sign-out/sign-in.
6. Verify cancellation/expiration removes Pro after Apple reports inactive entitlement.
7. Verify an Apple original transaction cannot be linked to a second Capitol Ledger CE account.

## Final Text Tone Pass

Do this after the native purchase path is stable and before TestFlight screenshots/review notes.

Review launch-facing copy for clarity, trust, and App Store reviewer comprehension:

1. `/sign-in`: account creation, verification, reset, and errors.
2. `/account`: profile, saved ledger, privacy, plan status, and sign-out.
3. `/settings`: account sync, notification preferences, plan/purchases, feedback entry.
4. `/privacy` and `/support`: App Store support/privacy copy, privacy requests, purchase help, and review clarity.
5. `/upgrade`: Apple purchase, restore purchases, Team later, Free/Pro language.
6. `/feedback`: live issue reporting, severity/category labels, successful submit state.
7. `/feedback/review`: reviewer-only copy, release decisions, empty states.
8. `/alerts`: action-needed labels, unread/read states, priority gating language.
9. `/brief`: in-app Weekly Brief wording and locked/pro states.
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

Finish the Apple setup items that cannot be completed in code using `Capitol Ledger App/App Store Connect Setup Packet.md`: App Store Connect app record, Pro subscription products, final bundle ID/signing, App Store Server API credentials, host env values, and deployed support/privacy URLs. Then run `TESTFLIGHT_REQUIRE_READY=true pnpm testflight:check` and `BILLING_REQUIRE_APP_STORE=true pnpm billing:check`; after both pass, run sandbox/TestFlight purchase QA and capture final screenshots from the stable build.
