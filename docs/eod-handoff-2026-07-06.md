# Capitol Ledger EOD Handoff - July 6, 2026

Generated as the dated EOD handoff for Monday, July 6, 2026. Use this as the source of truth for the next chat.

## Baseline
- Repo: `/Users/tylergates/Documents/Capitol Ledger`
- Branch: `main`
- HEAD: `4e062bbf9033fc3ba502aa733ba3089c8610e2d2`
- Origin sync: `0 0` against `origin/main`
- Worktree: Dirty with ongoing implementation and documentation changes. No commit or push was made.
- Production target: `https://project-qosv1.vercel.app`
- Latest deployment: Not verified during this diagnostic pass.
- Local preview target: `http://127.0.0.1:3023`
- Browser state: In-app browser was on `http://127.0.0.1:3023/bills/cmr5mh9tx0005b2ss5tec3y7v?tab=details`
- Previous dated handoff: `docs/eod-handoff-2026-07-02.md`

## Completed Today
- Added the 7-day Pro trial user path and copy: Pro starts with 7 days free, then converts to the $2.99/month subscription unless canceled. The visible upgrade flow now uses shorter user-facing copy, including "Cancel anytime."
- Cleaned the upgrade page copy per review:
  - Removed unnecessary "through Apple" wording.
  - Changed Civic Team description to "Shared tracking for organizations."
  - Removed the Team explanatory card and moved the minimum seat guidance into the price unit as `/ seat, min 3`.
  - Kept Team purchase and restore paths beside Pro for native purchase flows.
- Pulled SAVE-related bills into the database/search path and corrected their presentation:
  - `H.R. 7296`
  - `S. 1383`
  - Search for "Save America Act" returns bill results in local preview, with `S. 1383` first.
- Added or verified the requested `H.J.Res.` records:
  - Existing records checked for the initial three HJ acts.
  - Added missing live-activity records for `H.J.Res. 199` and `H.J.Res. 200`.
  - Exact `H.J.Res. 200` search resolves correctly in local preview.
- Hardened the bill plain-language AI section so fallback output is more bill-specific:
  - Added policy-lens categories for foreign military sale, election/voter process, congressional continuity, post office/commemorative bills, and tighter Supreme Court classification.
  - Removed the bad generic veterans/caregivers fallback from the selected foreign-sale bill detail page.
  - Added AI policy lens fixtures and agent validation.
- Set up the server-side AI Bill Analysis Agent foundation:
  - Added `lib/ai-bill-analysis-agent.ts`.
  - Wired bill details to `resolveAiBillAnalysis`.
  - Added source-packet validation, strict structured JSON schema expectations, source id checks, timeout/cache controls, and fallback behavior.
  - Added OpenAI env documentation in `.env.example`; no secret was added.
  - Added `Capitol Ledger App/AI Bill Analysis Agent Guide.md`.
- Updated the billing transition fixture after the trial-copy change so the guard checks the current "Start Pro Trial" path while continuing to reject Stripe test checkout copy.

## Diagnostics
- Code scan: Ran stale/debug scan across `app`, `components`, `lib`, and `scripts`.
  - No launch-facing stale "coming soon", "source-pull", "voter-facing", or Stripe test checkout UI copy was found.
  - Remaining `console.log` hits are script output.
  - One intentional TODO remains in `components/auth-flow-client.tsx` for adding Face ID back after real passkey/WebAuthn sign-in exists.
- Checks run:
  - `node scripts/check-launch-copy-tone.mjs` - pass
  - `node scripts/check-weekly-brief-in-app.mjs` - pass
  - `node scripts/check-backend-readiness.mjs` - pass in demo-safe mode with expected env warnings
  - `node scripts/check-testflight-readiness.mjs` - pass in local prep mode with expected Apple env warnings
  - `node scripts/check-billing-readiness.mjs` - pass in app-only demo mode with expected App Store/Stripe readiness warnings
  - `node_modules/typescript/bin/tsc --noEmit --pretty false` - pass
  - `node_modules/next/dist/bin/next lint` - pass
  - `node_modules/tsx/dist/cli.mjs scripts/check-ai-policy-lens-fixtures.ts` - pass, 14 fixtures plus agent validation
  - `node scripts/check-bill-action-log.mjs` - pass
  - `node scripts/check-bill-details-summary.mjs` - pass
  - `node scripts/check-bill-timeline.mjs` - pass
  - `node scripts/check-bill-vote-history.mjs` - pass
  - `node scripts/check-bill-law-status.mjs` - pass
  - `node scripts/check-policy-edge-routes.mjs` - pass
  - `node scripts/check-live-docket-route.mjs` - pass
  - `node scripts/check-search-filter-collapse.mjs` - pass
  - `node scripts/check-policy-edge-feed.mjs` - pass
  - `node scripts/check-gamification-streak.mjs` - pass
  - `node scripts/check-video-links.mjs` - pass
  - `node scripts/check-search-results-scroll.mjs` - pass
  - `node scripts/check-vote-positions-scroll.mjs` - pass
  - `node scripts/check-billing-transition-fixtures.mjs` - pass after fixture update
  - `git diff --check` - pass
- Local preview smoke:
  - `GET /bills/cmr5mh9tx0005b2ss5tec3y7v?tab=details` - 200, AI lens visible, foreign military sale language present, bad veterans/caregivers fallback absent
  - `GET /api/search?type=bills&q=H.J.Res.%20200` - 200, 1 bill result, first bill `H.J.Res. 200`
  - `GET /api/search?type=bills&q=Save%20America%20Act` - 200, 3 bill results, first bill `S. 1383`
- Blocked checks:
  - Strict TestFlight readiness still waits on final App Store Connect/API credential values: bundle id, token namespace, issuer id, key id, and private key.
  - Strict App Store billing readiness still waits on final App Store Server API values and product verification.
  - Live OpenAI analysis remains disabled until a real `OPENAI_API_KEY` and provider env are configured outside source control.
  - Local-preview runtime hygiene still needs the Node 20/22 and clean `node_modules` pass from the prior handoff before relying on the runtime guard.
- Cleanup applied:
  - Updated `scripts/check-billing-transition-fixtures.mjs` to match the current Pro trial button/source path.
  - No destructive cleanup, schema migration, dependency change, commit, or push was performed.

## QA
- Production smoke: Not run during this EOD pass. Do not mark live app reports resolved from this handoff alone.
- Browser QA: Local preview on `127.0.0.1:3023` responded for the bill detail and bill-search smoke checks above.
- Known issues:
  - Final Apple values are still the main upload blocker.
  - OpenAI live provider is wired but not activated because no secret should be committed.
  - The app name is still in transition and should be planned before broad rename edits.

## Current State
- The app is still on the TestFlight/App Store upload track.
- Daily Brief remains the user-facing brief surface with Source Watch, Story Signal, GDELT US-politics matching, and fallback story lanes.
- Internal Weekly Brief route/script/doc naming should stay compatibility-named through upload-critical work unless intentionally renamed in a separate pass.
- The new AI Bill Analysis Agent is ready for live OpenAI activation behind env flags, with deterministic fallback still available.
- The worktree remains dirty with ongoing app, iOS, script, documentation, billing, Congress sync, and AI-analysis changes.

## Next Best Steps
1. Start the next chat by reading this handoff and planning the app rename before editing broad brand, App Store, bundle, product, route, or documentation names.
2. Decide the final app name and create a rename map for user-facing brand, internal package names, iOS bundle/display names, App Store metadata, product IDs, docs, and env names.
3. Configure live OpenAI analysis only through local/deployment secrets:
   - `CAPITOL_LEDGER_AI_BILL_ANALYSIS_PROVIDER=openai`
   - `OPENAI_API_KEY`
   - Optional model, timeout, and cache envs
4. After OpenAI env is set, test the bill detail AI section on multiple bills and verify summary, benefits, harms, caveats, and source references stay bill-specific.
5. Continue Apple-side readiness: set final App Store Connect/API values, then rerun strict `TESTFLIGHT_REQUIRE_READY=true` and `BILLING_REQUIRE_APP_STORE=true` gates.
6. Keep `http://127.0.0.1:3023` visible for browser QA and rerun the full local guard set after rename/OpenAI changes.

## Resume Prompt
Use `docs/eod-handoff-2026-07-06.md` as the source of truth. Repo: `/Users/tylergates/Documents/Capitol Ledger`, branch `main`, production target `https://project-qosv1.vercel.app`, local preview target `http://127.0.0.1:3023`. The worktree is dirty with ongoing implementation and documentation changes; no commit or push was made.

Start today by planning the app rename and live OpenAI API activation. Do not commit secrets. Preserve TestFlight/App Store upload as the north star. The AI Bill Analysis Agent is wired behind env flags with deterministic fallback; live OpenAI needs secret configuration and multi-bill verification. Final Apple values remain the strict upload blocker.
