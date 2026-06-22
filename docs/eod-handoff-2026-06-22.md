# Capitol Ledger EOD Handoff - June 22, 2026

Generated at EOD on June 22, 2026 at 2:30 AM PDT for the next continuation.

## Standing Rules
- Speak directly. Keep updates concise, useful, and low-fluff.
- Always include next best steps so work can keep moving.
- Keep the in-app browser open and visible during app testing so the user can watch progress.
- Routine fixes, commits, and pushes are pre-approved. Check with the user before major build, architecture, dependency, schema, destructive, or secret-related changes.
- A diagnostic means checking the whole app for stale code, duplicate code, unreachable code, disconnected routes/APIs, and obvious performance drag. Tighten safe issues; do not leave useless code around.
- Do not mark beta feedback resolved until the issue is actually fixed and verified.
- Use narrow sandbox escalations only when needed. Do not commit secrets.

## Baseline
- Repo: `/private/tmp/capitol-ledger-law-status` temp working clone was used for the app diagnostic/deploy work.
- Persistent copy: `/Users/tylergates/Documents/Capitol Ledger/docs/eod-handoff-2026-06-22.md`.
- Branch: `main`.
- HEAD at diagnostic time: `d5679343f2a2b597e03c5c01edb145fd0caf67a9` (`Dedupe live docket bill records`).
- Origin sync at diagnostic time: local `main` was `0` behind and `1` ahead of `origin/main`; `origin/main` was `ae0bff4 Refresh June 19 EOD handoff`.
- Worktree at diagnostic time: dirty with production fixes and new diagnostic scripts; no final commit was made during the EOD pass.
- Production target: `https://project-qosv1.vercel.app`.
- Latest deployment confirmed from deploy output: `dpl_9tGWmRkYf2c2cdaN14Q6hYp4a4D8`, production URL `https://project-qosv1-dtsxqoc52-capitol-ledger.vercel.app`, aliased to `https://project-qosv1.vercel.app`.
- Browser state at finish: in-app browser was visible and left on `https://project-qosv1.vercel.app/brief`.

## Completed Today
- Standardized scroll boxes:
  - `MobileGlassScrollFrame` now exposes a region role when an aria label is provided.
  - Priority Feed now uses the same scroll-frame component as Saved civic watchlist.
  - Search result sections become scroll boxes beyond 2 records and use a fixed-height result frame.
- Fixed Election Participation copy:
  - The Voter milestone now says `Voter Badge`.
  - The countdown now reads as remaining elections, not a confusing target count.
  - The countdown stays visible after an election row is logged; the last-action status appears as secondary text.
- Fixed vote detail recorded positions:
  - The vote page now shows `Saved officials`, not arbitrary featured officials.
  - Saved official positions use a two-row scroll box.
  - Demo SAVE Act vote data includes Rep. Laura Friedman so a saved-official row can appear when she is in the user's saved list.
- Fixed Team owner watchlist seeding:
  - The Team workspace shared seed now includes the billing owner's saved ledger plus Admin and Analyst ledgers.
  - Viewer saves remain private and do not seed the shared Team workspace.
- Tightened subscription transition behavior:
  - Free downgrades now attempt to cancel the current paid Stripe subscription at period end before writing the Free state.
  - Team-to-Pro checkout completion cancels the prior active Team Stripe subscription in the background.
  - Plan buttons now use the billing portal only for the currently active Stripe-managed plan; plan changes route through app-controlled checkout/cancellation.
  - Billing transition fixture coverage was expanded for these paths.
- Fixed bill metadata and bill summary fallbacks:
  - Bill detail introduced dates fall back to action-log dates when the record field is missing.
  - Committee names are extracted from committee/latest-action text when `committeeName` is absent.
  - Action-only bill summaries now fall back to a `Bill Record Description` instead of showing only referral text.
- Tightened AI Policy Lens copy:
  - Added financial-crimes/FinCEN-specific analysis for the FinCEN Oversight and Accountability Act instead of generic transparency copy.
  - Tightened generic transparency matching so broad data/records language does not catch unrelated bills too eagerly.
- Added vote sorting by party to the project roadmap in `Capitol Ledger App/Next Steps.md`.
- Deployed the Team owner shared-watchlist fix to Vercel production before this EOD pass.

## Diagnostics
- Code scan:
  - Counted 29 app page routes.
  - Counted 191 TypeScript/TSX/MJS files across `app`, `components`, `lib`, and `scripts`.
  - Static internal link scan over `href="/..."` found expected app links; no broken static route was identified in the bounded scan.
  - Performance-drag scan found no polling loops. Existing timers are request timeouts, UI feedback timers, autocomplete debounce/blur behavior, or checkout-return refresh delay.
  - Stale/TODO scan found the known Face ID/WebAuthn TODO, account avatar placeholder copy, expected form placeholders, and demo/check fixture references. No obvious safe dead app code was removed.
- Checks run:
  - `git diff --check` passed after cleanup.
  - `corepack pnpm run local-preview:check` passed.
  - `corepack pnpm run weekly-brief:in-app-check` passed.
  - `corepack pnpm run search-filters:check` passed.
  - `node scripts/check-search-results-scroll.mjs` passed.
  - `corepack pnpm run policy-edge:check` passed.
  - `corepack pnpm run live-docket:check` passed.
  - `corepack pnpm run bill-details:check` passed.
  - `corepack pnpm run bill-actions:check` passed.
  - `corepack pnpm run bill-status:check` passed.
  - `corepack pnpm run bill-timeline:check` passed.
  - `corepack pnpm run bill-votes:check` passed.
  - `node scripts/check-bill-summary-fallback.mjs` passed.
  - `node scripts/check-bill-introduced-date-fallback.mjs` passed.
  - `node scripts/check-vote-positions-scroll.mjs` passed.
  - `corepack pnpm run gamification:check` passed.
  - `node scripts/check-election-participation-copy.mjs` passed.
  - `corepack pnpm run ai-policy-lens:check` passed with 11 fixtures.
  - `corepack pnpm run billing-transition:check` passed.
  - `corepack pnpm run video-links:check` passed.
  - `corepack pnpm run youtube-statements:check` passed.
  - `corepack pnpm run backend:check` completed in demo-safe mode with environment warnings.
  - `corepack pnpm run billing:check` completed in demo-safe mode with environment warnings.
  - `corepack pnpm run congress:check` completed in demo-safe mode with environment warnings.
  - `corepack pnpm run auth-email:check` completed in demo-safe mode with environment warnings.
  - `corepack pnpm run beta:check` completed in demo-safe mode with environment warnings.
  - `corepack pnpm run beta:triage` completed with a warning that `DATABASE_URL` is not configured locally.
  - `corepack pnpm exec next lint` passed with the known hook warning.
  - `corepack pnpm exec tsc --noEmit --pretty false` passed.
  - `corepack pnpm run build` passed.
- Blocked checks:
  - `corepack pnpm run weekly-brief:check` failed by design in this local environment because `DATABASE_URL` and `WEEKLY_BRIEF_CRON_SECRET` were absent.
  - `corepack pnpm run production-auth:check` failed by design because `DATABASE_URL` was absent.
  - `corepack pnpm run beta:triage` could not inspect the live beta feedback queue without `DATABASE_URL`.
  - Parallel script batches were killed with exit `137`; rerunning the same checks sequentially produced the pass/fail signals above.
  - A custom Node route/link scanner and `vercel inspect` also failed locally due process/runtime instability, so the handoff uses bounded scans and the known successful deployment output.
- Cleanup applied:
  - Fixed one indentation-only drift in `lib/demo-data.ts`.
  - Added vote sorting/grouping by party to `Capitol Ledger App/Next Steps.md`.
  - No larger source cleanup was applied because the bounded scans did not identify safe, obvious dead app code.

## QA
- Production smoke:
  - `/bills/cmpnlw9sm0008ti834kosjd8b?tab=details` rendered the High Rise Fire Sprinkler bill, `Bill Record Description`, and bill-specific impact copy.
  - `/bills/cmpnmag15001q39k4373kibed` rendered FinCEN bill metadata with `Jan 3, 2025` and `House Committee on Financial Services`.
  - `/search?type=all&q=Healthcare&focus=results` rendered search results with a scroll indicator for Bills.
  - `/priority-feed` rendered `Priority Feed` with the updated movement-oriented copy.
  - `/impact` rendered `Election Participation`.
  - `/brief` rendered `IN-APP BRIEF`, Weekly Civic Brief, Built From, Recent Briefs, Priority Updates, and Watchlist Focus.
- Browser QA:
  - In-app browser was kept visible during the smoke pass.
  - Some `goto` calls timed out, but DOM checks confirmed the target pages rendered successfully.
  - Browser console log retrieval still surfaced older minified React hydration errors tied to prior deployment IDs (`dpl_Gbf5...` / `dpl_24nz...`). The current page rendered; use a fresh isolated browser session if this needs deeper confirmation.
  - Final browser state was `/brief`.
- Known issues:
  - The known lint warning remains in `components/auth-flow-client.tsx`: missing `finishProductionAuth` dependency in a `useEffect`.
  - Local readiness scripts report missing local production environment variables; this is expected for the temp clone but blocks production-auth and scheduled Weekly Brief delivery verification locally.
  - Weekly Brief outbound delivery remains disabled/deferred.
  - Beta triage requires database access to inspect real feedback queue state.
  - Local process fan-out is fragile; run diagnostics sequentially.
  - The deployed app fixes should be committed and pushed deliberately in the app working clone.

## Current State
- Production is serving the latest deployed app fix for Team owner shared watchlist seeding.
- The app built locally and passed TypeScript, lint, and the targeted guard scripts listed above.
- Live bill detail pages now have safer metadata and summary fallback behavior across all bills.
- Vote pages now present saved-official recorded positions instead of arbitrary featured officials.
- Priority Feed/search result scroll boxes are closer to the shared mobile glass scroll-box standard.
- Subscription plan transitions are safer for Free/Pro/Team movement, with Stripe cancellation attempts added where needed.
- No new secrets or environment variables were added.
- No commit or push was made during the EOD diagnostic.

## Next Best Steps
1. Commit and push the dirty production fixes from the app working clone, then confirm `origin/main` catches up to the deployed state.
2. Investigate the old/stale browser hydration errors in a fresh isolated session only if they reproduce on the current deployment; otherwise keep them as a browser-log artifact.
3. Run `/feedback/review` with database access before the next feature pass and triage any active Launch Blocker or High reports before new work.
4. Start the next implementation slice with vote-detail sorting/grouping by party, now tracked in `Capitol Ledger App/Next Steps.md`.
