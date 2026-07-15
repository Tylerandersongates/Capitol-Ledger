# App Rename and OpenAI Activation Plan

Status: final public-name pass for TestFlight/App Store upload readiness on July 6, 2026.

## Source Of Truth

Use this plan before broad rename edits. The selected public app name is `CapitolWonk CE`.

Do not rename internal `Weekly Brief` route, script, or delivery names during upload-critical work unless that rename is deliberately scheduled as its own pass. The user-facing surface remains Daily Brief.

## Final Rename Values

Use these values for the upload-ready app, iOS target, App Store records, product IDs, and deployment environment:

| Area | Final upload value | Notes |
| --- | --- | --- |
| Public app name | `CapitolWonk CE` | User-facing brand |
| Web package name | `capitol-ledger` | Keep unless the repo/package must track the final brand |
| Native target/module | `CapitolLedgerNative` | Keep unless Xcode target renaming is required |
| iOS display name | `CapitolWonk CE` through `APP_DISPLAY_NAME` | User-visible app name |
| iOS bundle ID | `com.capitolwonk.ce` | Create this Bundle ID in Apple Developer |
| App Store SKU | `capitolwonk-ce-ios-v1` | Use for the App Store Connect app record |
| App Store account-token namespace | `com.capitolwonk.ce` | Stable namespace for Apple account-token binding |
| Pro monthly product ID | `com.capitolwonk.pro.monthly` | Create exactly as shown before purchase QA |
| Pro annual product ID | `com.capitolwonk.pro.annual` | Create exactly as shown before purchase QA |
| Team monthly product ID | `com.capitolwonk.team.monthly` | Create exactly as shown before purchase QA |
| Team annual product ID | `com.capitolwonk.team.annual` | Create exactly as shown before purchase QA |
| Public email from names | `CapitolWonk CE <...>` | Keep launch-facing sender names aligned |
| Docs folder/project history | Current docs folder | Keep unless the workspace itself is intentionally renamed |
| Env prefix | `CAPITOL_LEDGER_*` | Keep through upload unless a compatibility migration is planned |

## Safe Rename Order

1. Confirm `com.capitolwonk.ce`, `capitolwonk-ce-ios-v1`, and the `com.capitolwonk.*` product IDs in Apple before creating records.
2. Update public brand:
   - `lib/brand.ts`
   - `.env.example`
   - ignored local/deployment `NEXT_PUBLIC_APP_NAME`
   - `AUTH_EMAIL_FROM`
   - `WEEKLY_BRIEF_FROM`
3. Update iOS display and bundle values:
   - `ios/CapitolLedgerNative/CapitolLedgerNative.xcodeproj/project.pbxproj`
   - App Store Connect record settings
   - deployment `APP_STORE_BUNDLE_ID`
4. Keep final product IDs aligned:
   - `components/subscription-controls.tsx`
   - `ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerSubscriptionModels.swift`
   - `lib/billing/app-store.ts`
   - `scripts/check-testflight-readiness.mjs`
   - `scripts/check-billing-readiness.mjs`
   - App Store setup docs
5. Update launch-facing docs and App Store metadata:
   - App Store Connect setup packet
   - TestFlight readiness checklist
   - Billing readiness guide
   - privacy/support copy only where the public brand helper is not already used
6. Run the local guard set before strict Apple gates:
   - `pnpm launch-copy:check`
   - `pnpm weekly-brief:in-app-check`
   - `pnpm ai-policy-lens:check`
   - `pnpm ai-bill-analysis:live-check -- --dry-run`
   - `pnpm ios-native:check`
   - `pnpm billing:check`
   - `pnpm testflight:check`
   - `pnpm lint`
   - `pnpm exec tsc --noEmit --pretty false`
7. After final Apple secrets are configured, run:
   - `TESTFLIGHT_REQUIRE_READY=true pnpm testflight:check`
   - `BILLING_REQUIRE_APP_STORE=true pnpm billing:check`

## OpenAI Activation

Live AI bill analysis must be enabled only through local or deployment secrets:

```bash
CAPITOL_LEDGER_AI_BILL_ANALYSIS_PROVIDER=openai
OPENAI_API_KEY=...
CAPITOL_LEDGER_AI_BILL_ANALYSIS_MODEL=gpt-4o-mini
CAPITOL_LEDGER_AI_BILL_ANALYSIS_TIMEOUT_MS=4500
CAPITOL_LEDGER_AI_BILL_ANALYSIS_CACHE_MS=21600000
```

Do not commit `OPENAI_API_KEY`. Keep fallback mode available:

```bash
CAPITOL_LEDGER_AI_BILL_ANALYSIS_PROVIDER=fallback
OPENAI_API_KEY=
```

## Live OpenAI Verification

Once credentials are configured, run:

```bash
pnpm ai-bill-analysis:live-check
```

The check covers multiple bill types, requires the OpenAI provider and hidden API key, and fails if live results fall back to the deterministic policy lens. Use dry-run mode before credentials exist:

```bash
pnpm ai-bill-analysis:live-check -- --dry-run
```

After the command passes, browser-smoke several details pages on `http://127.0.0.1:3023` and verify the plain-language section remains bill-specific:

- `demo-hr-22`
- `demo-hr-471`
- `demo-s-2237`
- at least one synced live bill from the local database, if database reads are enabled

## Current Blockers

- Final app name, bundle ID, SKU, and product IDs are not confirmed in source.
- Strict TestFlight readiness still needs final App Store Connect/API values.
- Strict App Store billing readiness still needs final App Store Server API values and product verification.
- Live OpenAI verification is blocked until `OPENAI_API_KEY` and provider env are configured outside source control.
- Local preview runtime hygiene still needs the Node 20/22 and clean `node_modules` pass noted in the July 6 handoff.
