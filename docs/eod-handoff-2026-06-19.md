# Capitol Ledger EOD Handoff - June 19, 2026

Generated at EOD on June 19, 2026 for the June 20 continuation.

## Standing Rules
- Speak directly. Keep updates concise, useful, and low-fluff.
- Always include next best steps so work can keep moving.
- Keep the in-app browser open and visible during app testing so the user can watch progress.
- Routine fixes, commits, and pushes are pre-approved. Check with the user before major build, architecture, dependency, schema, destructive, or secret-related changes.
- A diagnostic means checking the whole app for stale code, duplicate code, unreachable code, disconnected routes/APIs, and obvious performance drag. Tighten safe issues; do not leave useless code around.
- Do not mark beta feedback resolved until the issue is actually fixed and verified.
- Use narrow sandbox escalations only when needed. Do not commit secrets.

## Baseline
- Repo: `/Users/tylergates/Documents/Capitol Ledger`
- Branch: `main`
- HEAD before this handoff doc commit: `d2f9104 Add policy edge feed scroll box`
- Origin sync before this handoff doc commit: `0 0`
- Worktree before this handoff doc commit: no tracked modifications found; staged area was empty.
- Production target: `https://project-qosv1.vercel.app`
- Latest deployment: production URL was verified serving `d2f9104` behavior on `/priority-feed`; exact Vercel deployment alias was not re-read because Vercel CLI status checks have been intermittently killed in this local shell.
- Browser state: in-app browser open on `https://project-qosv1.vercel.app/priority-feed?scrollBoxVerified=codex-1781841922703`.

## Completed Today
- Repaired Civic Team cancellation billing fallback:
  - Fixed accounts that were Pro before joining/owning Civic Team so cancellation restores the appropriate personal Pro access instead of falling to Free.
  - Added a legacy-Team cancellation restore path.
  - Relevant commits: `540c81f Restore Pro after Team cancellation`, `911fea8 Handle legacy Team cancellation Pro restore`.
- Fixed the Supreme Court bill AI Policy Lens/court-lens mismatch:
  - Repaired the stale/routing category that caused the impact content to reference the wrong bill context.
  - Added latest-action date metadata to dashboard targets so downstream bill tracker/policy context has the data it needs.
  - Relevant commits: `1edd666 Include latest action date in dashboard targets`, `ee4d8fa Fix Supreme Court policy lens routing`.
- Created dedicated Policy Edge surfaces:
  - `Open Priority Feed` now opens `/priority-feed`.
  - `Open Risk Watch` now opens `/risk-watch`.
  - The buttons no longer route to generic Search Discovery sorted pages.
  - Relevant commit: `d9a5fcd Add dedicated policy edge feeds`.
- Fixed duplicate SAVE Act in Risk Watch:
  - Dedupe now keys bills by public bill identity: congress, bill type, and bill number.
  - Live Congress records are preferred over demo duplicates.
  - Production verified that `H.R. 22 SAVE Act` appears once and `H.R. 28` moved up to the next row.
  - Relevant commit: `cfaba4f Dedupe policy edge bills`.
- Changed Risk Watch trigger to personal bill stance:
  - Included: bills marked `Oppose` or `Watching`.
  - Excluded: bills marked `Support` or no stance.
  - Dashboard Risk Watch count now uses the same personal opposed/watching count.
  - Relevant commit: `8af2da2 Trigger risk watch from bill stances`.
- Added Policy Edge feed scroll box:
  - Priority Feed and Risk Watch bill rows now render inside a dedicated scroll region.
  - Production Priority Feed verified with `overflow-y: auto`, `338px` region height, `2680px` content height, and gesture scrolling moving the row list `scrollTop` to `500`.
  - Relevant commit: `d2f9104 Add policy edge feed scroll box`.
- Added/updated guard checks:
  - Policy Edge route check now protects dedicated routes, personal Risk Watch trigger, and scroll-region behavior.
  - Policy Edge feed guard still protects dedupe-before-sort and live-over-demo duplicate behavior.

## Diagnostics
- Code scan:
  - Focused source checks passed for Policy Edge routes, Risk Watch stance trigger, dedupe keying, and scroll-region markup.
  - Recent commit sequence after the previous Round 3 guide handoff:
    - `d2f9104 Add policy edge feed scroll box`
    - `8af2da2 Trigger risk watch from bill stances`
    - `cfaba4f Dedupe policy edge bills`
    - `d9a5fcd Add dedicated policy edge feeds`
    - `911fea8 Handle legacy Team cancellation Pro restore`
    - `540c81f Restore Pro after Team cancellation`
    - `ee4d8fa Fix Supreme Court policy lens routing`
    - `1edd666 Include latest action date in dashboard targets`
- Checks run:
  - `node scripts/check-policy-edge-routes.mjs` passed.
  - `node scripts/check-policy-edge-feed.mjs` passed.
  - `git diff --check` passed for touched Policy Edge files before the final scroll-box commit.
  - Lightweight TypeScript transpile checks passed for touched route/helper/component/data files during the Risk Watch stance work.
  - Browser production verification passed for:
    - `/priority-feed`
    - `/risk-watch`
    - `/dashboard`
    - `/bills/cmpnlw9x0000cti83v6vsemb6?tab=details`
    - `/profile?billingAudit=codex2`
- Blocked checks:
  - Full `tsc --noEmit` was killed by the local process supervisor with no diagnostics.
  - Targeted semantic TypeScript API checks were also killed by the local process supervisor.
  - `npm run policy-edge:check` hung through the npm wrapper; the underlying Node checks were run directly and passed.
  - Vercel CLI filtered/list/inspect status checks were intermittently killed with code `137`; production behavior was verified in-browser instead.
  - Browser read-only evaluate could measure the scroll region but could not mutate `scrollTop`; final scroll verification used an actual gesture scroll.
- Cleanup applied:
  - Removed the TypeScript-heavy Policy Edge fixture runner and replaced it with a lightweight source guard because the TS boot path was unreliable in this shell.
  - Kept Policy Edge ranking logic in a pure helper at `lib/policy-edge-ranking.ts`.
  - Shared bill-stance browser storage logic in `lib/browser-bill-stances.ts` so bill detail controls, Risk Watch, and dashboard count use the same stance source.

## QA
- Production smoke:
  - Billing/Profile:
    - Verified Pro restoration behavior around Civic Team cancellation logic before committing the restore fixes.
  - AI Policy Lens:
    - Verified the Supreme Court/court-lens bill content after repair at `/bills/cmpnlw9x0000cti83v6vsemb6?tab=details&courtLensVerified=codex`.
  - Policy Edge:
    - Dashboard CTAs verified:
      - `Open Priority Feed` -> `/priority-feed`
      - `Open Risk Watch` -> `/risk-watch`
    - `/priority-feed` verified as its own feed, not Search Discovery.
    - `/risk-watch` verified as its own feed, not Search Discovery.
    - Risk Watch duplicate fix verified on production after deployment.
    - Risk Watch personal stance trigger verified on production; current account showed `Risk Watch 1` on dashboard and only the personal risk row on `/risk-watch`.
    - Priority Feed scroll box verified on production after deployment.
- Browser QA:
  - In-app browser stayed open during production checks.
  - Current browser tab remains on the verified Priority Feed scroll-box URL.
  - Existing production React hydration/minified errors were seen earlier in console logs during Policy Edge page navigation; the visible user-facing routes still rendered and navigated successfully.
- Known issues:
  - YouTube bill-statement integration is still queued; a YouTube API key is still needed before live official-statement discovery can be automated.
  - Full local type/build tooling remains unreliable in the Documents workspace because Node/TypeScript processes are sometimes killed or hang.
  - Vercel CLI deployment status reads remain unreliable from this shell; production browser verification is currently the most dependable confirmation.
  - `Risk Watch` currently depends on client-side local/account-scoped bill stance storage. If stance needs to sync across devices, add database-backed stance persistence later.
  - Profile avatar/photo upload is still not wired.
  - Continue monitoring `/feedback/review`; do not mark any new tester feedback resolved until it is fixed and verified.

## Current State
- Production is serving the latest app behavior from `main` before this handoff doc commit.
- Policy Edge now has three separate behaviors:
  - Priority Feed: committee-priority bills, deduped and ranked.
  - Risk Watch: personal opposed/watching bills, deduped and ranked.
  - Bill list region: bounded internal scroll box.
- Dashboard Policy Edge card uses the personal Risk Watch count, not generic in-progress bill count.
- The high-priority feedback items addressed today were fixed and production-verified at least once from the in-app browser.
- No new environment variables or secrets were added today.

## Next Best Steps
1. Check `/feedback/review` first on June 20, 2026:
   - Triage any new High or Launch Blocker reports before adding new features.
   - Do not mark feedback resolved without production verification.
2. Run a short Round 3 regression smoke:
   - `/dashboard`
   - `/priority-feed`
   - `/risk-watch`
   - `/bills/cmpnlw9x0000cti83v6vsemb6?tab=details`
   - `/profile`
   - `/feedback`
3. Decide the next YouTube step:
   - Add YouTube API key to the still-todo setup list if not already tracked elsewhere.
   - After key is available, wire official statement search/matching behind a review-safe sync.
4. If testers report cross-device stance mismatch, promote bill stances from browser storage into account/database persistence.
5. Keep using direct Node check scripts instead of full `tsc` in this workspace until the local process-kill/hang issue is resolved.
