# Capitol Ledger EOD Handoff - July 15, 2026

Generated for the last active workday, Wednesday, July 15, 2026. Use this as the source of truth for the next chat.

## Standing Rules
- Speak directly. Keep updates concise, useful, and low-fluff.
- Always include next best steps after each handoff or completed work block so work can keep moving.
- Keep the in-app browser open and visible during app testing so the user can watch progress.
- Routine fixes, commits, and pushes are pre-approved. Check with the user before major build, architecture, dependency, schema, destructive, or secret-related changes.
- A diagnostic means checking the whole app for stale code, duplicate code, unreachable code, disconnected routes/APIs, and obvious performance drag. Tighten safe issues; do not leave useless code around.
- Do not mark live app reports resolved until the issue is actually fixed and verified.
- Use narrow sandbox escalations only when needed. Do not commit secrets.

## Baseline
- Repo: `/Users/tylergates/Documents/Capitol Ledger`
- Branch: `main`
- Release HEAD entering this handoff: `d86c103dc63498d3b3a6a0817aafcc71cdfbcca9` (`Clarify district lookup placeholder`)
- Previous release commit: `91448937b494a2092649c3075b24ad4d3ea27041` (`Prepare CapitolWonk CE TestFlight release`)
- Origin sync before this handoff document: `0` behind / `0` ahead
- Previous dated handoff: `docs/eod-handoff-2026-07-07.md`
- Worktree before this handoff document: clean
- Production target: `https://project-qosv1.vercel.app`
- Latest verified deployment: `dpl_GV5dg8xSPw5gam7LD2xFYX2GhQND` (`project-qosv1-1w3sw0wt5-capitolwonkce.vercel.app`), production alias attached, `READY`
- Production release commit: `d86c103dc63498d3b3a6a0817aafcc71cdfbcca9`
- Native shell target: `https://project-qosv1.vercel.app`
- Last known local preview: `http://127.0.0.1:3024`
- Browser state at handoff: production onboarding at `/onboarding?qa=d86c103`

## Completed Today
- Resumed from the July 7 handoff and preserved the substantial uncommitted app, iOS, docs, AI, billing, member-profile, and launch-readiness work.
- Reviewed the release batch for secret exposure, added PDF binary handling through `.gitattributes`, passed staged diff checks, and committed the accumulated release as `9144893`.
- Pushed `main` and verified Vercel production deployment for the release. A follow-up district-copy fix was committed as `d86c103`, pushed, deployed, and verified on production.
- Confirmed the public product remains `CapitolWonk CE` and the native/App Store identifiers remain aligned:
  - Bundle ID: `com.capitolwonk.ce`
  - SKU: `capitolwonk-ce-ios-v1`
  - Account-token namespace: `com.capitolwonk.ce`
  - Products: `com.capitolwonk.pro.monthly`, `com.capitolwonk.pro.annual`, `com.capitolwonk.team.monthly`, `com.capitolwonk.team.annual`
- Confirmed the App Store Connect app exists and reached its TestFlight/subscription management surfaces:
  - Apple Developer Team ID: `L9Z42PYG22`
  - App Store Connect app ID: `6788196048`
  - Subscription group ID: `22239938`
- Worked through Xcode/App Store Connect team access and TestFlight tester invitation/account questions. A TestFlight build was available for on-device testing.
- Diagnosed the user's TestFlight screen recording and reports of compressed layout, unstable account-field focus, and onboarding choices appearing to hop.
- Hardened the real-device mobile shell:
  - Simulated phone bezel, status bar, and Dynamic Island are desktop-only.
  - Phone content uses real viewport height and safe-area insets.
  - Nested vertical glass-scroll panels flow with the page on phones and hidden rails no longer consume width.
- Hardened account creation fields for iOS:
  - Stable `id`, `name`, label, and autofill identities.
  - Given-name, family-name, email, and new-password semantics.
  - Removed pointer-focus redirection that could send typing into the wrong field.
- Hardened onboarding topic selection:
  - Synchronous selection state for rapid taps.
  - Serialized account-ledger writes.
  - Stale account responses are ignored.
  - Hydration cannot overwrite newer local choices while synchronization is pending.
- Added `scripts/check-testflight-mobile-ui.mjs` and registered `pnpm testflight-ui:check` to prevent regressions in the mobile shell, account fields, topic synchronization, and district lookup copy.
- Replaced the misleading Austin-specific district placeholder:
  - No saved district: `Enter a city, ZIP, or district code`
  - Saved district: `Search another city, ZIP, or district`
- Completed and committed the broader launch work carried from the prior dirty tree:
  - Final iOS icons and native StoreKit product wiring.
  - Pro and Team monthly/annual product paths.
  - AI Bill Analysis Agent with deterministic fallback, timeout/cache controls, live-provider guard, and fixtures.
  - GDELT Daily Brief signals and stronger Daily Brief content.
  - Member service history, vote records, roles, official links, issue topics, and profile copy.
  - Updated active TestFlight, billing, AI, auth, Congress, support, privacy, and launch documentation.
- Preserved upload-critical compatibility naming: Daily Brief is user-facing; internal Weekly Brief route/script names remain compatibility names.

## Diagnostics
- Code scan:
  - Release staging covered 145 files with 4,246 insertions and 688 deletions.
  - Secret review found no committed deployment secrets. The only private-key-looking documentation value was an intentional redacted placeholder.
  - `.env`, `.env.local`, `.vercel`, `.next`, and dependency directories remain excluded from the release.
  - `git diff --check` and the staged diff check passed before the release commit.
- Checks run and passed for the release/EOD state:
  - Production `next build`
  - `pnpm lint`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm testflight-ui:check`
  - `pnpm testflight:check` in local-prep mode
  - `pnpm billing:check` in app-only demo mode
  - `pnpm ios-native:check`
  - `pnpm launch-copy:check`
  - `pnpm weekly-brief:in-app-check`
  - `pnpm ai-policy-lens:check` - 14 fixtures plus agent validation/resilience guards
  - `pnpm member-service:check`
  - `pnpm member-votes:check`
  - `pnpm member-roles:check`
  - `pnpm member-profile:check`
  - `pnpm member-issues:check`
- Blocked checks:
  - `TESTFLIGHT_REQUIRE_READY=true pnpm testflight:check` correctly reports five missing App Store environment values.
  - `BILLING_REQUIRE_APP_STORE=true pnpm billing:check` correctly reports the same five blockers.
  - Required values: `APP_STORE_BUNDLE_ID`, `APP_STORE_ACCOUNT_TOKEN_NAMESPACE`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_ID`, and `APP_STORE_CONNECT_PRIVATE_KEY`.
  - Live OpenAI analysis remains blocked until `CAPITOL_LEDGER_AI_BILL_ANALYSIS_PROVIDER=openai` and `OPENAI_API_KEY` are configured outside git.
- Cleanup applied:
  - The release tree is consolidated into two July 15 commits instead of remaining as the large uncommitted batch from the July 7 handoff.
  - No dependency, schema, destructive, or secret-related change was made during the final release/deployment pass.

## QA
- Production smoke:
  - Production alias was verified on release deployment `dpl_C7SaGcU7x8msmz89S8dgvKQRGBjY`, then on follow-up deployment `dpl_GV5dg8xSPw5gam7LD2xFYX2GhQND`.
  - `/support`, `/privacy`, `/upgrade`, and `/members/S001150` loaded with their expected production headings/content.
  - The district placeholder follow-up was hard-refreshed and verified with saved `CA-30`; the input is empty and now says `Search another city, ZIP, or district`.
- Browser QA:
  - Hard-refreshed the production build to avoid testing stale predeployment JavaScript from an already-open tab.
  - Sequentially entered values into all five account-creation fields; every value remained in the intended field. Test values were cleared and no account was submitted.
  - Verified the deployed fields expose stable IDs/names/autocomplete values.
  - Rapidly toggled four onboarding topics; all four registered on the current build, remained settled, and the original choices were restored exactly.
  - Kept the production page visible for user review.
- Known issues:
  - App Store Server API credentials are not configured in the current environment.
  - Sandbox/TestFlight purchase, restore, subscription transition, and account-token synchronization still need end-to-end verification.
  - Apple-side product status, price/trial configuration, and United States-only availability need a final record audit before purchase QA.
  - Live OpenAI multi-bill QA is still pending after secrets are configured.
  - The physical TestFlight app should be force-quit and reopened before retesting web UI so its `WKWebView` loads the newest production release.

## Current State
- North star remains TestFlight/App Store upload readiness.
- `main` is synchronized with `origin/main`, the implementation work is committed, and production is on `d86c103`.
- CapitolWonk CE has an App Store Connect app record and a TestFlight build has reached on-device QA.
- The native app is a SwiftUI/`WKWebView` shell pointed at production with StoreKit 2 purchase/restore/account-binding paths.
- Pro and Team subscription identifiers are wired in web, server, native, and readiness checks. Apple-side server credentials and sandbox purchase evidence remain the launch blockers.
- Account creation, mobile layout, onboarding topic selection, and district lookup copy received production-verified hardening.
- The AI Bill Analysis Agent is wired with deterministic fallback; live OpenAI remains disabled until ignored/deployment secrets are supplied and multi-bill QA passes.
- Member profiles and Daily Brief are materially stronger than at the July 7 handoff.
- Daily Brief remains the user-facing name. Internal Weekly Brief compatibility naming remains intentionally unchanged during upload-critical work.
- No secrets were committed.

## Next Best Steps
1. Finish the Apple-side record audit in App Store Connect:
   - Confirm all four `com.capitolwonk.*` subscriptions exist in subscription group `22239938`.
   - Confirm prices, 7-day trial configuration, metadata/status, and United States-only availability.
   - Confirm the current TestFlight build is assigned to the intended internal tester group.
2. Configure App Store Server API values outside git:
   - `APP_STORE_BUNDLE_ID=com.capitolwonk.ce`
   - `APP_STORE_ACCOUNT_TOKEN_NAMESPACE=com.capitolwonk.ce`
   - `APP_STORE_CONNECT_ISSUER_ID`
   - `APP_STORE_CONNECT_KEY_ID`
   - `APP_STORE_CONNECT_PRIVATE_KEY`
3. Rerun the strict Apple gates:
   - `TESTFLIGHT_REQUIRE_READY=true pnpm testflight:check`
   - `BILLING_REQUIRE_APP_STORE=true pnpm billing:check`
4. Run sandbox/TestFlight purchase QA for all four paths, then verify restore, entitlement transitions, expiry/cancel handling, and account-token synchronization.
5. Configure live AI bill analysis only through ignored/deployment secrets:
   - `CAPITOL_LEDGER_AI_BILL_ANALYSIS_PROVIDER=openai`
   - `OPENAI_API_KEY`
6. Verify several live bill analyses for summary quality, benefits/harms, caveats, source references, cache behavior, timeout behavior, and deterministic fallback.
7. Force-quit/reopen the physical TestFlight app and run the final visible device smoke: account creation, district setup, rapid topic selection, Daily Brief, member profile, bill analysis, upgrade/purchase, privacy, and support.
8. After the strict gates and sandbox purchase evidence pass, prepare the final App Store submission metadata/screenshots and submit the selected build for review.

## Resume Prompt For New Thread
```text
Read `docs/eod-handoff-2026-07-15.md` first and use it as the source of truth.

Repo: `/Users/tylergates/Documents/Capitol Ledger`
Branch: `main`
Production: `https://project-qosv1.vercel.app`
Release commit: `d86c103dc63498d3b3a6a0817aafcc71cdfbcca9`
Latest verified deployment: `dpl_GV5dg8xSPw5gam7LD2xFYX2GhQND`
App Store Connect app ID: `6788196048`
Apple Developer Team ID: `L9Z42PYG22`
Subscription group ID: `22239938`

North star: TestFlight/App Store upload readiness.

Public brand is CapitolWonk CE. The native StoreKit/WebView shell, final bundle ID `com.capitolwonk.ce`, and four `com.capitolwonk.*` subscription IDs are aligned in code. The production mobile/account/onboarding fixes are deployed. The repository was clean and synchronized before the EOD document was added.

Start with the Apple-side record audit and App Store Server API credentials outside git. Then run the strict TestFlight/billing gates and complete sandbox/TestFlight purchase and restore verification. Live OpenAI bill analysis still requires ignored/deployment secrets and multi-bill QA.

Do not commit secrets. Ask before major architecture, dependency, schema, destructive, or secret-related changes. Routine fixes, commits, pushes, and visible browser QA are pre-approved. Preserve Daily Brief user-facing naming and internal Weekly Brief compatibility naming during upload-critical work.
```
