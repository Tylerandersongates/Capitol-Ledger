# Capitol Ledger EOD Handoff - June 19, 2026

Generated at EOD on June 19, 2026 at 4:54 PM PDT for the next continuation.

## Standing Rules
- Speak directly. Keep updates concise, useful, and low-fluff.
- Always include next best steps so work can keep moving.
- Keep the in-app browser open and visible during app testing so the user can watch progress.
- Routine fixes, commits, and pushes are pre-approved. Check with the user before major build, architecture, dependency, schema, destructive, or secret-related changes.
- A diagnostic means checking the whole app for stale code, duplicate code, unreachable code, disconnected routes/APIs, and obvious performance drag. Tighten safe issues; do not leave useless code around.
- Do not mark beta feedback resolved until the issue is actually fixed and verified.
- Use narrow sandbox escalations only when needed. Do not commit secrets.

## Baseline
- Repo: `/private/tmp/capitol-ledger-law-status` temp working clone for the Capitol Ledger repo.
- Branch: `main`.
- HEAD before this handoff doc commit: `a386fc3 Add weekly brief written summary`.
- Origin sync before this handoff doc commit: `origin/main` matched `a386fc37c25d3daaf228416ca536d7602e897870`.
- Worktree before this handoff doc edit: clean.
- Production target: `https://project-qosv1.vercel.app`.
- Latest deployment: `dpl_FQrnD7wRytmKbSRCgFLNHuS7WRYm`, production URL `https://project-qosv1-rg5mexkz5-capitol-ledger.vercel.app`, aliased to `https://project-qosv1.vercel.app`.
- Browser state: in-app browser was used visibly for production smoke. Final handoff should leave the browser on `/brief`.

## Completed Today
- Priority Feed rules:
  - Added the personal priority-feed rules and kept Priority Feed distinct from other surfaces.
  - Included supported/aligned/saved-official bill movement without turning it into another generic discovery feed.
  - Relevant commits: `6d18a5e Add personal priority feed rules`, `bef836a Sync dashboard priority queue count`, `595fe12 Fix daily streak credit`.
- Dashboard and streak fixes:
  - Fixed the dashboard `Priority Queue` count so it follows the shared priority-feed counter.
  - Fixed daily streak credit so a new day with account actions can increment instead of staying stuck.
- Live Docket:
  - Fixed the `Today in Congress Live Docket` destination so it opens the promised Live Docket page instead of Discovery Search.
  - Relevant commit: `8c034f1 Add live docket destination`.
- Bill law/status, votes, and timeline:
  - Added law-status detection so enacted bills can display as law instead of staying `In Progress` / `Committee Pending`.
  - Built the bill vote-history view and member vote breakdown path.
  - Replaced the old timeline/progress strip with the broader Legislative Timeline action-log view.
  - Extracted vote counts from action-log text and surfaced them in the Votes section.
  - Relevant commits: `110f380`, `d66236a`, `347c2d1`, `1901dc9`, `2d60a86`, `8b623a7`, `2661209`, `e0bd392`, `30ea8b1`, `4be9b30`, `55eaa44`, `6cb0d30`.
- Bill summary:
  - Removed repeated bill-title copy from the Bill Summary block when the user is already inside that bill page.
  - Bound summary fetching to the details tab so unrelated bill tabs avoid unnecessary summary work.
  - Relevant commits: `ef7884a Bound bill summary fetch for details`, `dd416bf Remove repeated title from bill summary`.
- Search filters:
  - Collapsed each Refine Search category under `/search?type=members`.
  - Chamber, Party, and State now show compact selected-value badges, usually `All`, and expand individually.
  - Relevant commit: `692acae Collapse search filter categories`.
- Weekly Brief:
  - Decided to keep Weekly Brief in app for beta/App Store v1.
  - Added `Post-Launch Next Build` tracking for future outbound email/push digest delivery.
  - Reworked `/brief` as an in-app brief: `In-App Brief`, `Live in app`, `In-app beta`, `Built From`, `Recent Briefs`, and followed officials in Watchlist Focus.
  - Added an account-aware `Written Summary` section with a `Suggested first read`, generated from district, tracked bills, priority updates, issue interests, saved ledger, and plan level.
  - Relevant commits: `7b54ffb Keep weekly brief in app`, `ad0713a Tighten weekly brief beta copy`, `a386fc3 Add weekly brief written summary`.
- Production deploys:
  - Deployed each app-facing fix to Vercel production and verified the relevant surfaces in the in-app browser.

## Diagnostics
- Code scan:
  - Counted 156 TypeScript/TSX files across `app`, `components`, and `lib`.
  - Static route/link diagnostic found 60 app routes and 83 static internal links; no missing static route targets were found.
  - Stale-copy scan found no active stale Weekly Brief delivery promises in app code. Remaining hits were expected docs, real form placeholders, the known account-avatar placeholder, and one intentional Face ID/WebAuthn TODO comment.
  - Performance-drag scan found no polling loops. Existing `setTimeout` usage is limited to UI feedback, debounce/blur behavior, request timeouts, or one checkout-return refresh delay.
- Checks run:
  - `node scripts/check-weekly-brief-in-app.mjs` passed.
  - `node scripts/check-search-filter-collapse.mjs` passed.
  - `node scripts/check-policy-edge-routes.mjs` passed.
  - `node scripts/check-policy-edge-feed.mjs` passed.
  - `node scripts/check-live-docket-route.mjs` passed.
  - `node scripts/check-gamification-streak.mjs` passed.
  - `node scripts/check-bill-details-summary.mjs` passed.
  - `node scripts/check-bill-action-log.mjs` passed.
  - `node scripts/check-bill-law-status.mjs` passed.
  - `node scripts/check-bill-timeline.mjs` passed.
  - `node scripts/check-bill-vote-history.mjs` passed.
  - `node scripts/check-video-links.mjs` passed.
  - `node scripts/check-backend-readiness.mjs` completed in demo-safe mode with warnings only.
  - `node scripts/check-billing-readiness.mjs` passed for demo-safe mode.
  - `node scripts/check-congress-readiness.mjs` passed for demo-safe mode.
  - `node scripts/check-youtube-bill-statements.mjs` passed.
  - `git diff --check` passed.
- Blocked checks:
  - `node scripts/check-weekly-brief-delivery.mjs` failed by design for current local/beta config: `DATABASE_URL` and `WEEKLY_BRIEF_CRON_SECRET` are absent in this dependency-light clone, and outbound Weekly Brief delivery is deferred to post-launch.
  - `node scripts/check-production-auth.mjs` could not run locally because `@prisma/client` is not installed in this clone.
  - Full local build/typecheck was not rerun because this clone has no `node_modules`; Vercel production deploys provided the build/typecheck confirmation.
- Cleanup applied:
  - No extra source cleanup was applied during the diagnostic because the scans did not find safe, obvious app-code dead weight to remove.
  - The EOD handoff itself was rewritten from `docs/eod-handoff-template.md` as requested.

## QA
- Production smoke:
  - `/dashboard` rendered the command center and live docket card. Browser navigation reported a timeout, but the DOM rendered successfully.
  - `/brief` rendered `IN-APP BRIEF`, `WRITTEN SUMMARY`, `Suggested first read`, `Built From`, `Recent Briefs`, and no email/scheduled-delivery promise copy.
  - `/search?type=members` rendered Officials search and `Refine results`; browser navigation reported a timeout, but the DOM rendered successfully.
  - `/priority-feed` rendered the Priority Feed surface.
  - `/risk-watch` rendered the Risk Watch surface.
  - `/live-docket?status=in-progress` rendered the Live Docket in-progress bill list.
  - `/feedback` rendered the beta feedback form.
- Browser QA:
  - In-app browser stayed visible during the production smoke.
  - Exact-case text checks were normalized after the first pass because several headers render uppercase.
  - Final browser state should be left on `https://project-qosv1.vercel.app/brief`.
- Known issues:
  - Weekly digest strategy is intentionally not finalized. The user wants to think about whether Weekly Brief should become a broader weekly digest.
  - Outbound Weekly Brief email/push delivery is deferred to Post-Launch Next Build.
  - Local production-auth diagnostics need installed dependencies or a dependency-complete workspace.
  - The pre-existing Vercel lint warning remains: `components/auth-flow-client.tsx` has a missing `finishProductionAuth` hook dependency warning.
  - Account avatar/photo upload remains unwired and is still expected as a later profile feature.
  - Profile/search/dashboard account signals can differ between browser sessions depending on saved local/account state.
  - Continue monitoring `/feedback/review`; do not resolve tester feedback until fixed and production-verified.

## Current State
- Production is serving `a386fc3 Add weekly brief written summary`.
- `main` and `origin/main` matched before the EOD doc edit.
- Weekly Brief is now an in-app Pro/Team beta feature with:
  - in-app-only positioning,
  - account-aware written summary,
  - civic lens,
  - source signal explanation,
  - recent brief/history surface,
  - priority updates,
  - watchlist focus,
  - action queue.
- Post-launch outbound delivery is tracked in `Capitol Ledger App/Next Steps.md`; do not pull that back into beta unless the user explicitly reverses the decision.
- No new secrets or environment variables were added.

## Next Best Steps
1. Let the weekly digest decision breathe:
   - Do not add email/push delivery yet.
   - Next product decision is whether Weekly Brief stays an in-app weekly brief, becomes a broader weekly digest, or splits into both.
2. If continuing Weekly Brief in app, tighten summary ranking:
   - Prioritize supported bills, Priority Feed items, unread alerts, followed officials, district/member activity, and vote movement.
   - Avoid duplicating Dashboard, Priority Feed, or Alerts one-for-one.
3. Run `/feedback/review` before the next feature pass:
   - Triage any new High or Launch Blocker reports first.
   - Do not mark anything resolved without production verification.
4. Add `Save current brief` only after deciding how Recent Briefs should work:
   - saved snapshot,
   - live regenerated digest,
   - or weekly archive.
5. When a dependency-complete local workspace is available, rerun:
   - `production-auth:check`,
   - full build/typecheck,
   - beta triage with production database access if needed.
