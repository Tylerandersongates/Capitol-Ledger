# Capitol Ledger EOD Handoff - July 7, 2026

Generated as the dated EOD handoff for Tuesday, July 7, 2026. Use this as the source of truth for the next chat.

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
- HEAD at handoff: `d9f30068471c46d274749cc8d9b238a64ec3e9a3` (`Polish CapitolWonk CE wordmark`)
- Origin sync at handoff: `0` behind / `0` ahead
- Previous dated handoff: `docs/eod-handoff-2026-07-06.md`
- Worktree at handoff: dirty with ongoing app, iOS, docs, scripts, data, AI, billing, member-profile, and TestFlight/App Store changes. A minor wordmark commit was pushed earlier; no commit or push was made during this EOD handoff pass.
- Production target: `https://project-qosv1.vercel.app`
- Latest deployment: not verified during this EOD pass.
- Local preview target in active browser: `http://127.0.0.1:3024`
- Prior local preview target from the July 6 handoff: `http://127.0.0.1:3023`
- Browser state at handoff request: in-app browser on `http://127.0.0.1:3024/sign-in`

## Completed Today
- Renamed the public-facing app surface to `CapitolWonk CE` and cleaned the main lingering `Capitol Ledger` launch-copy surfaces, including the sign-in page.
- Updated the wordmark treatment: kept the white/gold direction, deepened the `Wonk CE` gold, and toned down the backlight glow. The minor wordmark update was committed and pushed as `d9f3006`.
- Replaced active Apple bundle/product placeholder values with final CapitolWonk Apple identity values:
  - App name: `CapitolWonk CE`
  - Bundle ID: `com.capitolwonk.ce`
  - SKU: `capitolwonk-ce-ios-v1`
  - Account-token namespace: `com.capitolwonk.ce`
  - Products: `com.capitolwonk.pro.monthly`, `com.capitolwonk.pro.annual`, `com.capitolwonk.team.monthly`, `com.capitolwonk.team.annual`
- Updated active App Store/TestFlight docs and checks so they enforce the final `com.capitolwonk.*` values instead of `FINAL_*` placeholders or old `com.capitolledger.*` identifiers.
- Confirmed old active Apple identifiers are gone outside historical handoff notes. Historical EOD docs were left intact as records.
- Preserved the Daily Brief compatibility guidance: user-facing copy stays Daily Brief while internal Weekly Brief route/script names remain compatibility-named during upload-critical work.
- Continued OpenAI activation planning:
  - Live provider remains behind `CAPITOL_LEDGER_AI_BILL_ANALYSIS_PROVIDER=openai`.
  - `OPENAI_API_KEY` must stay in ignored local/deployment secrets only.
  - No OpenAI key or Apple credential was committed.
  - Use a fresh production OpenAI key in deployment secrets before live launch verification.
- Member profile hardening:
  - First Elected/service history now hydrates from live member profile data instead of inventing fallback terms from the current Congress label.
  - Member vote records now merge stored data with live House/Senate roll-call hydration, dedupe by official roll-call identity, sort newest-first, and show clear empty/sparse-data messaging.
  - Roles/committees tab now uses source-linked roles, displays official roster source labels, and has clearer empty states.
  - Added the member official website pill below the message/affiliation action area.
  - Converted Issue Topics into the formatted scroll-window treatment.
  - Updated helper copy for Issue Topics, What Matters Now, and Accountability Snapshot in the app's plain tone.
- Clarified the votes model for member profiles: the list is strongest where database vote rows exist, and now expands with official live vote hydration as more congressional data is available.
- Did a punctuation/grammar/copy pass across the active launch surfaces and tightened helper sentences.
- Walked through App Store Connect setup guidance with the user:
  - Capabilities: check only `In-App Purchase` for the current TestFlight path.
  - Keywords under 100 characters: `congress,bills,votes,senators,representatives,legislation,civic,policy,law,alerts,capitol,issues`
  - Support URL: `https://project-qosv1.vercel.app/support`
  - Privacy Policy URL: `https://project-qosv1.vercel.app/privacy`
  - Marketing URL: leave blank for TestFlight or use `https://project-qosv1.vercel.app`
  - Content rights: no special third-party content rights setup needed for the current public legislative/civic data use.
- Walked through App Store privacy questionnaire answers:
  - Data collection: yes, linked to user identity, not used for tracking.
  - Name: app functionality and product personalization.
  - Email address: app functionality, product personalization, and customer support.
  - Coarse location: app functionality and product personalization for district/state setup.
  - Sensitive info: yes, conservative answer because issue interests/party/civic preferences can imply political views.
  - Customer support: yes, app functionality and customer support.
  - Purchase history: yes, app functionality.
  - Usage data/product interaction: yes, app functionality and product personalization.
  - Diagnostics: no for now unless Sentry, Vercel analytics/speed insights, or similar diagnostic collection is enabled before launch.
  - Financial payment info: no; Apple handles payment method details. Use Purchase History instead.

## Diagnostics
- Code/identifier scans:
  - Old active Apple identifier scan passed outside historical handoffs: no active `com.capitolledger.app`, old App Store product IDs, `capitol-ledger-app-store-v1`, or `FINAL_*` placeholders remain in upload-facing docs/checks.
  - Active launch-copy scan over app/components/lib/iOS/scripts/docs found no remaining launch-facing `Capitol Ledger` copy in active surfaces checked.
- Checks run:
  - `git diff --check` - pass after this handoff file was created
  - `pnpm testflight:check` - pass in local prep mode with expected App Store env warnings
  - `pnpm billing:check` - pass in app-only demo mode with expected App Store env warnings
  - `pnpm ios-native:check` - pass
  - `pnpm lint` - pass
  - `pnpm launch-copy:check` - pass
  - `pnpm weekly-brief:in-app-check` - pass
  - `pnpm member-service:check` - pass
  - `pnpm member-votes:check` - pass
  - `pnpm member-roles:check` - pass
  - `pnpm member-profile:check` - pass
  - `pnpm member-issues:check` - pass
- Blocked checks:
  - Strict TestFlight readiness still waits on App Store Connect/API credentials and Apple-side product setup.
  - Strict App Store billing readiness still waits on App Store Server API values and sandbox/TestFlight purchase verification.
  - Live OpenAI bill analysis still needs provider env/secrets configured and multi-bill verification.
  - Production smoke was not rerun after the local App Store/privacy guidance.
  - Local-preview runtime hygiene still needs the clean Node 20/22 and `node_modules` pass noted in previous handoffs before relying on the runtime guard.
- Cleanup applied:
  - Tightened the TestFlight readiness checker so it now checks final CapitolWonk values.
  - Left historical dated EOD notes unchanged.
  - No destructive cleanup, schema migration, dependency change, or secret commit was performed.

## QA
- Browser QA:
  - In-app browser remained visible during user-guided Apple setup work.
  - Current visible browser state is `/sign-in` on port `3024`.
  - Member profile areas were reviewed through the visible browser flow during the session: profile overview, votes, committees/roles, website pill placement, issue topics scroll window, and helper copy.
- Production smoke: not run during this EOD pass. Do not mark live app reports resolved from this handoff alone.
- Known issues:
  - App Store Connect records/products still need to be created with the final `com.capitolwonk.*` values.
  - App Store Server API credentials still need to be configured outside git.
  - Live OpenAI verification across multiple bills is still pending after secret setup.
  - If a real OpenAI key was shared during setup, use a fresh production key in deployment secrets before launch.
  - App Store privacy answers should be updated if diagnostics, analytics, native push, Sign in with Apple, Associated Domains, or third-party media/content are added before submission.

## Current State
- North star remains TestFlight/App Store upload readiness.
- Public brand is now `CapitolWonk CE`.
- Native iOS display/bundle values and web/native/server App Store product IDs are aligned on final CapitolWonk identifiers.
- Pro and Team App Store products are wired in code and readiness checks, but Apple-side product creation and sandbox purchase QA remain.
- Daily Brief remains the user-facing brief surface; internal Weekly Brief compatibility naming remains intentionally preserved during upload-critical work.
- Member profiles are much stronger for user-critical areas: service history, votes, roles, website access, issue topics, and accountability helper copy.
- AI Bill Analysis Agent remains wired behind env flags with deterministic fallback; live OpenAI output still needs secret configuration and multi-bill QA.
- Worktree remains dirty with substantial uncommitted implementation/docs changes. Do not discard user work.

## Next Best Steps
1. Create/confirm Apple Developer and App Store Connect records using the final values:
   - Bundle ID: `com.capitolwonk.ce`
   - SKU: `capitolwonk-ce-ios-v1`
   - Subscription group: `CapitolWonk CE Paid Plans`
   - Product IDs: `com.capitolwonk.pro.monthly`, `com.capitolwonk.pro.annual`, `com.capitolwonk.team.monthly`, `com.capitolwonk.team.annual`
2. Configure App Store Server API secrets outside git:
   - `APP_STORE_BUNDLE_ID=com.capitolwonk.ce`
   - `APP_STORE_ACCOUNT_TOKEN_NAMESPACE=com.capitolwonk.ce`
   - `APP_STORE_CONNECT_ISSUER_ID`
   - `APP_STORE_CONNECT_KEY_ID`
   - `APP_STORE_CONNECT_PRIVATE_KEY`
3. Rerun strict Apple gates:
   - `TESTFLIGHT_REQUIRE_READY=true pnpm testflight:check`
   - `BILLING_REQUIRE_APP_STORE=true pnpm billing:check`
4. Configure live OpenAI bill analysis through ignored/deployment secrets only:
   - `CAPITOL_LEDGER_AI_BILL_ANALYSIS_PROVIDER=openai`
   - `OPENAI_API_KEY`
   - Optional model, timeout, and cache envs
5. Verify live AI Bill Analysis output across multiple bills after secrets are configured, checking summary, benefits, harms, caveats, source references, timeouts, cache behavior, and fallback behavior.
6. Run a final visible browser smoke pass on the current preview port before upload:
   - `/sign-in`
   - `/dashboard`
   - `/members/D000399`
   - `/members/D000399?tab=votes`
   - `/members/D000399?tab=committees`
   - a bill detail with the At a Glance/AI section
   - `/upgrade`
   - `/privacy`
   - `/support`
7. When Apple credentials and OpenAI secrets are done, rerun the full local guard set plus TypeScript before uploading.

## Resume Prompt For New Thread
```text
Use `docs/eod-handoff-2026-07-07.md` as the source of truth.

Repo: `/Users/tylergates/Documents/Capitol Ledger`
Branch: `main`
Production target: `https://project-qosv1.vercel.app`
Current visible local preview: `http://127.0.0.1:3024/sign-in`
Previous handoff: `docs/eod-handoff-2026-07-06.md`

North star: TestFlight/App Store upload readiness.

The app is now publicly branded as `CapitolWonk CE`. Final Apple identity values are:
- Bundle ID: `com.capitolwonk.ce`
- SKU: `capitolwonk-ce-ios-v1`
- Account-token namespace: `com.capitolwonk.ce`
- Product IDs: `com.capitolwonk.pro.monthly`, `com.capitolwonk.pro.annual`, `com.capitolwonk.team.monthly`, `com.capitolwonk.team.annual`

Worktree is dirty with ongoing implementation/docs changes. Do not discard user work. Do not commit secrets. Minor routine fixes/commits/pushes are okay, but ask before major architecture, dependency, schema, destructive, or secret-related changes.

Start by finishing Apple-side setup and strict gates, then configure live OpenAI through env/secrets only and verify multiple bill analyses. Keep Daily Brief user-facing naming and Weekly Brief internal compatibility naming unless a dedicated rename pass is scheduled.
```
