# Capitol Ledger EOD Handoff - June 23, 2026

Generated at EOD on June 23, 2026 for the next continuation.

## Standing Rules
- Speak directly. Keep updates concise, useful, and low-fluff.
- Always include next best steps so work can keep moving.
- Keep the in-app browser open and visible during app testing so the user can watch progress.
- Routine fixes, commits, and pushes are pre-approved. Check with the user before major build, architecture, dependency, schema, destructive, or secret-related changes.
- A diagnostic means checking the whole app for stale code, duplicate code, unreachable code, disconnected routes/APIs, and obvious performance drag. Tighten safe issues; do not leave useless code around.
- Do not mark beta feedback resolved until the issue is actually fixed and verified.
- Use narrow sandbox escalations only when needed. Do not commit secrets.

## Baseline
- Repo: `/Users/tylergates/Documents/Capitol Ledger`.
- Branch: `main`.
- HEAD at diagnostic time: `c3fb73bc6450f96362566c6d75b61c848d771ccf` (`Make party vote filtering optional`).
- Origin sync at diagnostic time: local `main` matched `origin/main` at `c3fb73bc6450f96362566c6d75b61c848d771ccf`.
- Worktree at diagnostic time: clean before creating this handoff document.
- Production target: `https://project-qosv1.vercel.app`.
- Latest deployment observed in browser asset URLs: `dpl_76PGGuWPm5Q3f5bcc28kvXTs3zGb`.
- Browser state at finish: in-app browser was visible and left on `https://project-qosv1.vercel.app/brief`.

## Completed Today
- Preserved and pushed the inherited production-fix checkpoint:
  - Commit `40526a9` (`Stabilize production app fixes`) captured the scroll-frame standardization, saved-official vote positions, subscription transition hardening, live/demo bill dedupe, bill metadata fallbacks, and EOD June 22 handoff.
- Implemented the next vote-detail slice, then tuned it after product review:
  - Commit `9e68cd2` first added member vote breakdowns to standalone vote detail pages and bill vote-history rows.
  - Commit `c3fb73b` changed the experience to a neutral default: saved officials stay first, all-member rows are not party-grouped by default, and party is available only as an optional filter (`All parties`, `Republican`, `Democrat`, `Independent`).
- Cleared the deploy warning for auth:
  - Commit `1b04047` made `finishProductionAuth` and local account sync stable callbacks and included `finishProductionAuth` in the verification effect dependency list.
- Production browser smoke confirmed the neutral vote-filter UI is deployed:
  - `/votes/demo-vote-house-25` rendered `Member positions`, `All Member Votes`, `All parties`, and party filter choices without `Party breakdown` or `All Member Votes By Party`.
  - `/bills/demo-hr-22?tab=votes` rendered the same neutral all-member vote list and optional party filters.

## Diagnostics
- Code scan:
  - Counted 29 app page routes and 31 API route handlers.
  - Counted 189 TypeScript/TSX/MJS files across `app`, `components`, `lib`, and `scripts`.
  - Static internal link scan checked 103 static app hrefs and found no broken static route links.
  - Performance-drag scan found no polling loops. Existing timers are request timeouts, UI feedback timers, autocomplete debounce/blur behavior, or checkout-return refresh delay.
  - Stale/TODO scan found the known Face ID/WebAuthn TODO, account avatar placeholder copy, expected form placeholders, and demo/check fixture references.
  - Duplicate-helper scan found small repeated presentation helpers/classes (`PositionPill`, `DetailRow`, premium class constants), but no safe EOD refactor was obvious without broad visual churn.
- Checks run:
  - `node scripts/check-weekly-brief-in-app.mjs` passed.
  - `node scripts/check-search-filter-collapse.mjs` passed.
  - `node scripts/check-search-results-scroll.mjs` passed.
  - `node scripts/check-policy-edge-routes.mjs` passed.
  - `node scripts/check-policy-edge-feed.mjs` passed.
  - `node scripts/check-live-docket-route.mjs` passed.
  - `node scripts/check-bill-details-summary.mjs` passed.
  - `node scripts/check-bill-action-log.mjs` passed.
  - `node scripts/check-bill-law-status.mjs` passed.
  - `node scripts/check-bill-timeline.mjs` passed.
  - `node scripts/check-bill-vote-history.mjs` passed.
  - `node scripts/check-vote-positions-scroll.mjs` passed.
  - `node scripts/check-election-participation-copy.mjs` passed.
  - `node scripts/check-billing-transition-fixtures.mjs` passed.
  - `node scripts/check-video-links.mjs` passed.
  - `node scripts/check-youtube-bill-statements.mjs` passed.
  - `node scripts/check-gamification-streak.mjs` passed.
  - `tsx scripts/check-ai-policy-lens-fixtures.ts` passed with 10 fixtures after narrow sandbox escalation for the `tsx` IPC pipe.
  - `node scripts/check-backend-readiness.mjs` completed in demo-safe mode with expected environment warnings.
  - `node scripts/check-billing-readiness.mjs` passed in demo-safe mode.
  - `node scripts/check-congress-readiness.mjs` passed in demo-safe mode with expected live-sync warnings.
  - `node scripts/check-auth-email-delivery.mjs` passed in demo-safe mode.
  - `node scripts/check-beta-readiness.mjs` completed with the local database-table check skipped.
  - `node scripts/check-beta-triage.mjs` passed with database access: 34 total reports, 3 active medium reports, 0 launch blockers, 0 high-severity reports.
  - `node scripts/check-production-auth.mjs` passed the database schema check with network access; local `AUTH_COOKIE_SECURE` remains false in this shell.
  - Direct trailing-whitespace scan over changed files passed.
- Blocked checks:
  - `node scripts/check-local-preview-runtime.mjs` failed because this Codex runtime uses Node `24.14.0`; the app guard requires Node 20 or 22 for local Next preview.
  - Full local preview, `next lint`, `tsc --noEmit`, and `next build` were not rerun in this closeout because Node 24 has already been observed to hang during route compilation/lint/type wrappers in this app.
  - `node scripts/check-weekly-brief-delivery.mjs` still fails for scheduled outbound delivery because delivery is disabled/deferred and `WEEKLY_BRIEF_CRON_SECRET` is not configured locally.
- Cleanup applied:
  - No source cleanup beyond the vote-filter UX adjustment was applied during this diagnostic; the bounded scans did not identify safe, obvious dead app code to remove.

## QA
- Production smoke:
  - `/dashboard` rendered `Latest Vote Feed`.
  - `/votes/demo-vote-house-25` rendered `Vote Record`, `Saved officials`, `Member positions`, `All Member Votes`, `All parties`, `Republican`, and `Democrat`; it did not render the old `Party breakdown` or `All Member Votes By Party` labels.
  - `/bills/demo-hr-22?tab=votes` rendered `Vote History`, neutral `All Member Votes`, `All parties`, `Republican`, and `Democrat`; it did not render the old party-grouped list label.
  - `/search?type=all&q=Healthcare&focus=results` rendered Search and Bills results.
  - `/priority-feed` rendered `Priority Feed`.
  - `/impact` rendered `Election Participation`.
  - `/brief` rendered `Weekly Civic Brief` and `Built From`.
- Browser QA:
  - In-app browser was kept visible during the smoke pass.
  - Some `goto` calls timed out, but DOM checks confirmed the target pages rendered with `document.readyState === "complete"`.
  - Browser console logs captured current-deployment minified React hydration errors `#418`, `#423`, and `#425` from assets tagged `dpl_76PGGuWPm5Q3f5bcc28kvXTs3zGb`. Pages still rendered and DOM smoke checks passed, but this is no longer just an old deployment artifact.
- Known issues:
  - Current production emits minified React hydration errors in the browser console. Needs a fresh non-minified repro or sourcemap-backed investigation.
  - Local preview is blocked in this Codex runtime by Node 24; use Node 20 or 22 for local visual QA, lint, typecheck, and build.
  - Weekly Brief outbound delivery remains disabled/deferred.
  - Production-auth schema is ready with network access, but this local shell still warns that `AUTH_COOKIE_SECURE` is not true.
  - Beta triage has 3 active medium reports, including 2 untriaged active reports and 1 known issue; no launch blockers or high-severity reports are active.

## Current State
- App code is pushed and synced to GitHub at `c3fb73bc6450f96362566c6d75b61c848d771ccf`; this handoff document is the only closeout artifact added after the diagnostic.
- Production is serving the neutral optional-party-filter vote UI.
- The auth hook dependency warning that appeared during deploy has been fixed and pushed.
- Targeted guard scripts for the touched vote, bill, search, feed, billing, video, YouTube, gamification, Weekly Brief in-app, and policy-edge surfaces are passing.
- No new secrets or environment variables were added.

## Next Best Steps
1. Investigate the current-deployment React hydration errors `#418`, `#423`, and `#425` using Node 20/22 local preview or production sourcemaps; start with pages that showed the errors during smoke (`/dashboard`, `/search`, `/priority-feed`, `/brief`).
2. Triage the 2 active untriaged medium beta feedback reports before starting the next feature pass.
3. Run full `next lint`, `tsc --noEmit`, and `next build` from a Node 20 or Node 22 environment to restore broad local verification after this Node 24-limited closeout.
