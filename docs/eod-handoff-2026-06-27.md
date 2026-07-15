# Capitol Ledger EOD Handoff - June 27, 2026

Generated as the dated EOD handoff for June 27, 2026.

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
- HEAD at diagnostic start: `4e062bbf9033fc3ba502aa733ba3089c8610e2d2` (`Prepare Capitol Ledger CE TestFlight path`)
- Origin sync at diagnostic start: `0` behind / `0` ahead
- Worktree at diagnostic start: dirty with the ongoing App Store/TestFlight path, Team purchase path, Daily Brief/GDELT work, auth fixes, native StoreKit updates, docs/check updates, untracked `lib/brand.ts`, untracked `lib/gdelt/`, and untracked `Capitol Ledger App/GDELT Daily Brief Signals Guide.md`.
- Production target: `https://project-qosv1.vercel.app`
- Latest deployment: not checked during this local diagnostic.
- Browser state: in-app browser reported on `http://127.0.0.1:3023/brief`.

## Completed Today
- Built out the Team purchase pathway to mirror Pro using the App Store/Apple bridge, including Team monthly/annual product wiring in web subscription controls, App Store billing helpers, and iOS StoreKit models/service code.
- Renamed visible upgrade CTAs from Apple-specific wording to `Start Pro Plan` and `Start Team Plan`.
- Converted the Weekly Brief product surface into a Daily Brief experience with daily cadence, daily copy, in-app summary cards, source digest, recent brief history, and Pro gating.
- Added GDELT Daily Brief support with a server-side DOC 2.0 client, US/English/federal-politics filters, followed-issue matching, timeout/cache controls, and static fallback story lanes.
- Tuned the Daily Brief page after browser comments: removed the `Live in app` pill, removed plan/mode tiles, clarified source provenance, and shifted the source section to `Source Watch`, `Story Signal`, and `Brief Inputs`.
- Fixed local-preview auth email links so verification/reset URLs generated from `127.0.0.1:3023` stay on the current local preview origin instead of jumping to the deployed `NEXT_PUBLIC_APP_URL`.
- Ran a diagnostic stale-copy pass and cleaned `/petitions` visible copy from `Coming soon` to the more accurate paused/queued state.
- Expanded `scripts/check-launch-copy-tone.mjs` to include `app/petitions` so launch-facing stale wording stays guarded.
- Generated this dated EOD handoff for June 27, 2026.

## Diagnostics
- Code scan: 168 app/component/lib source files scanned for static route targets; 31 page routes, 34 API routes, 21 static internal targets, 0 missing static route targets.
- Stale/debug scan: visible app code no longer contains `coming soon`, `Daily Source Pull`, `Major Story Watch`, `source-pull`, `voter-facing`, or stale Stripe/test-checkout wording. Remaining matches are in diagnostics scripts, compatibility checks, or older docs.
- Duplicate/unreachable scan: no missing static internal routes found. No safe duplicate-code refactor surfaced during the EOD pass.
- Performance scan: no obvious unbounded polling loop surfaced in the targeted search; app timers remain bounded UI/request behavior.
- Live reports triage: escalated Neon run passed with 36 total reports, 36 resolved, 0 active, 0 launch blockers, and 0 untriaged.
- Production auth diagnostic: database schema is ready. Warning remains that `AUTH_COOKIE_SECURE` should be true for deployed HTTPS production.
- Backend diagnostic with `.env.local` loaded: passed core app, auth email, GDELT, and Weekly Brief env checks; expected warnings remain for App Store Server API values, dry-run Congress writes, Stripe config presence, and optional hardening/observability services.
- Cleanup applied: `/petitions` stale launch copy tightened; launch-copy guard now scans `app/petitions`.
- Blocked checks: `local-preview:check` still fails because the bundled runtime is Node `24.14.0` and `node_modules` contains 8 duplicate `* 2` entries. This is an environment hygiene issue, not a TypeScript/build failure.

## QA
- `node scripts/check-launch-copy-tone.mjs`: passed.
- `node scripts/check-testflight-readiness.mjs`: passed local prep mode; warned on Apple-side App Store values.
- `node scripts/check-ios-native-bridge.mjs`: passed.
- `node scripts/check-weekly-brief-in-app.mjs`: passed.
- `node scripts/check-billing-readiness.mjs`: passed app-only demo mode; warned on App Store values and Stripe config presence.
- `node scripts/check-billing-transition-fixtures.mjs`: passed.
- `node scripts/check-auth-email-delivery.mjs`: passed demo-safe mode with Resend configured.
- `node scripts/check-backend-readiness.mjs` with `.env.local` loaded: passed demo-safe/backend snapshot with expected warnings.
- `node scripts/check-congress-readiness.mjs`: passed demo-safe mode; live Congress.gov request skipped.
- `node scripts/check-beta-readiness.mjs`: passed local readiness; database table check skipped locally.
- `REPORTS_CHECK_DATABASE=true node scripts/check-beta-readiness.mjs`: passed after network escalation.
- `node scripts/check-beta-triage.mjs`: passed after network escalation; 0 active reports.
- `node scripts/check-production-auth.mjs`: passed after network escalation; auth schema ready, `AUTH_COOKIE_SECURE` warning remains.
- `node scripts/check-weekly-brief-delivery.mjs` with `.env.local` loaded: passed.
- `node scripts/qa-weekly-brief-task.mjs` against `http://127.0.0.1:3023`: passed dry-run QA; live delivery writes skipped intentionally.
- `node scripts/check-policy-edge-routes.mjs`: passed.
- `node scripts/check-policy-edge-feed.mjs`: passed.
- `node scripts/check-live-docket-route.mjs`: passed.
- `node scripts/check-search-filter-collapse.mjs`: passed.
- `node scripts/check-search-results-scroll.mjs`: passed.
- `node scripts/check-bill-law-status.mjs`: passed.
- `node scripts/check-bill-action-log.mjs`: passed.
- `node scripts/check-bill-details-summary.mjs`: passed.
- `node scripts/check-bill-timeline.mjs`: passed.
- `node scripts/check-bill-vote-history.mjs`: passed.
- `node scripts/check-vote-positions-scroll.mjs`: passed.
- `node scripts/check-gamification-streak.mjs`: passed.
- `node scripts/check-video-links.mjs`: passed.
- `node scripts/check-youtube-bill-statements.mjs`: passed.
- `node scripts/check-election-participation-copy.mjs`: passed.
- `tsx scripts/check-ai-policy-lens-fixtures.ts`: passed after local IPC escalation.
- `next lint`: passed with no ESLint warnings or errors.
- `tsc --noEmit --pretty false`: passed.
- `prisma generate`: passed.
- `next build`: passed and generated 63 static pages.
- `git diff --check`: passed.
- Browser QA: the in-app browser remained on `/brief`; no additional visual browser pass was run after the EOD cleanup.
- Known issues: local preview runtime guard still fails on Node 24 and duplicate `node_modules` copy links; strict App Store/TestFlight billing readiness still depends on final Apple-side bundle/account-token/API credential values.

## Current State
- App build is green locally.
- Daily Brief is the active user-facing brief surface; some internal route/script/doc names still say Weekly Brief for compatibility and should either be intentionally preserved or renamed in a separate pass.
- GDELT Daily Brief integration is wired with safe fallback behavior, short timeout, cache controls, and US-politics filtering.
- Team and Pro upgrade CTAs are Apple/App Store oriented for the native purchase path.
- Local auth verification/reset links now respect the current local preview origin when generated from localhost/127.0.0.1.
- Visible launch-facing stale copy found during the diagnostic was fixed on `/petitions`.
- Live feedback queue is clear: 0 active reports and 0 launch blockers.
- Worktree remains dirty with all ongoing implementation/docs changes. No commit or push was made during this EOD pass.

## June 29, 2026 Addendum
- Tightened local auth email URL generation again after smoke testing showed `127.0.0.1:<port>` requests could still produce `localhost:<port>` verification links.
- Added `authEmailRequestBaseUrl()` in `lib/auth-email.ts` to build auth email action URLs from the incoming `Host` header, with `x-forwarded-proto` support and fallback to `request.nextUrl.origin`.
- Wired register and password-reset routes through the new request-base helper so verification and reset links preserve the actual local preview origin.
- Verified auth behavior with a manual-demo local preview on `http://127.0.0.1:3025`: create account passed, verification link origin stayed `http://127.0.0.1:3025`, email verification passed, and sign-in passed with `requiresVerificationAfterVerify: false`.
- The existing `http://127.0.0.1:3023` preview could render the sign-in/create screen, but browser UI clicks did not hydrate/fire during the smoke attempt. The existing `3023` process also returned a Neon reachability error for auth API calls, so final visible browser auth QA still needs a clean restart of that preview with network access.
- Temporary previews used for verification on `3024` and `3025` were stopped. The pre-existing `3023` process was left untouched.

## June 29, 2026 QA
- Manual-demo local auth API smoke against `http://127.0.0.1:3025`: passed after the origin fix.
- `node scripts/check-launch-copy-tone.mjs`: passed.
- `node scripts/check-weekly-brief-in-app.mjs`: passed.
- `node_modules/next/dist/bin/next lint`: passed.
- `node_modules/typescript/bin/tsc --noEmit --pretty false`: passed.
- `git diff --check`: passed.

## Next Best Steps
1. Restart the `http://127.0.0.1:3023` preview cleanly with network access and rerun the visible browser sign-in/account creation smoke. API-level manual-demo auth already passed on `3025`.
2. Decide whether internal `Weekly Brief` route/script/doc naming should remain as compatibility naming or be renamed to `Daily Brief` in a dedicated low-risk pass.
3. Restore local preview hygiene later: use Node 20 or 22 and reinstall clean `node_modules` without duplicate `* 2` entries so `node scripts/check-local-preview-runtime.mjs` passes.
4. Configure final Apple-side values before strict TestFlight/App Store QA: `APP_STORE_BUNDLE_ID`, `APP_STORE_ACCOUNT_TOKEN_NAMESPACE`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_ID`, and `APP_STORE_CONNECT_PRIVATE_KEY`.
5. Set/verify `AUTH_COOKIE_SECURE=true` for deployed HTTPS production.

## Resume Prompt For New Thread
```text
Use this handoff as the source of truth and continue execution from "Next Best Steps".

Context:
- Repo: /Users/tylergates/Documents/Capitol Ledger
- Branch: main
- Current dated handoff: docs/eod-handoff-2026-06-27.md
- Production target: https://project-qosv1.vercel.app
- Local preview target: http://127.0.0.1:3023
- App build is green: lint, TypeScript, Prisma generate, and Next build passed.
- Daily Brief is now the user-facing brief surface with Source Watch, Story Signal, GDELT US-politics matching, and fallback story lanes.
- Team purchase path is wired beside Pro for App Store/Apple purchase flows.
- Local auth verification/reset links now build from the incoming request host for local previews; API-level manual-demo smoke confirmed `127.0.0.1:<port>` is preserved.
- Live report queue is clear: 36 total, 36 resolved, 0 active.
- Worktree is dirty with ongoing implementation/docs changes; no commit or push was made.
- Expected blockers: local-preview guard fails on Node 24 and duplicate node_modules copy links; strict Apple readiness waits on final App Store Connect/API credential values.
- June 29 addendum: visible browser auth smoke on the existing 3023 tab is still pending because the page rendered but client clicks did not hydrate/fire, and the existing 3023 process had Neon reachability errors. Clean API-level auth smoke passed on 3025 after the origin fix.

Constraints:
- Do not repeat completed work.
- Keep TestFlight/App Store upload as the north star.
- Do not mark live app reports resolved unless actually fixed and verified.
- Confirm assumptions only if there is hidden risk.
- Start by cleanly restarting the local preview at http://127.0.0.1:3023 with network access, then browser-test local account creation/sign-in with a fresh verification link. After that, rerun:
  node scripts/check-launch-copy-tone.mjs
  node scripts/check-weekly-brief-in-app.mjs
  node_modules/next/dist/bin/next lint
  node_modules/typescript/bin/tsc --noEmit --pretty false
```
