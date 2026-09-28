# CapitolWonk EOD Handoff — Pre-Surgery Pull-Ahead Complete — September 28, 2026

## Standing Rules

<!-- BEGIN EOD STANDING RULES -->
- Codex makes routine, in-scope decisions and keeps moving without asking Tyler at each step: source-only preparation, safe read-only checks that do not expose protected values, small reversible fixes, ordinary local validation/builds, commits, non-destructive pushes, PR preparation and low-risk documentation/default-off PR merges after exact-head checks, and visible app QA. Pick the next dependency-ready step; do not stop for a routine “confirm.”
- Only major actions need Tyler's exact, action-time approval. Major means material architecture/dependency/security changes; production capability activation or materially behavior-changing deployment; production schema, migration, ACL, role, or data writes; destructive or real-provider operations; protected configuration, credential/secret handling or disclosure; billing/subscription/product or paid-plan changes; Apple signing/account/security changes; signed build upload, tester invitation/distribution, public link, App Review/TestFlight submission, or release. State the exact target, effect, stop rule, and recovery path. One approval covers only its stated action, not later gates.
- Do not re-ask for a completed, verified approval or repeat completed work. Mark dated no-go/pending instructions historical when later evidence supersedes them. A source-only deploy, green check, or passing read does not activate a gated runtime path.
- Speak directly and concisely. Give next best steps after each completed work block and in every EOD; distinguish the single next safe action from the full carryover ledger.
- Keep the in-app browser open and visible during app testing/QA so Tyler can follow progress, and leave useful evidence open at handoff. Do not close user tabs merely to tidy the day.
- A whole-app diagnostic checks stale/duplicate/unreachable code, disconnected routes/APIs, failing safeguards, serialized calls, build errors, and obvious performance drag. Tighten proven safe issues, but do not delete compatibility surfaces or assets without evidence. Mark live reports resolved only after the fix is verified.
- Use **CapitolWonk** as the public app name and **Daily Brief** as the public feature name. Keep internal `Weekly Brief` compatibility names and stable bundle, SKU/product, account-token, telemetry, and storage identities until an explicitly approved migration or product decision.
- Never expose or commit credentials, protected values, private keys, tokens, Apple account/team or bundle identifiers, tester credentials, transaction/device identifiers, private support-case IDs, or customer data. Use narrow sandbox escalations; keep sensitive personal reasons out of tracked scheduling notes.
- The Mac login/iCloud Keychain incident is closed. Do not sign out of iCloud, reset encrypted iCloud data, delete keychains, remove trusted devices, alter FileVault, or modify the preserved old keychain/recovery copy. Do not repurchase a subscription to establish state; verify the entitlement first and use Restore Purchases once only if the baseline is inconsistent.
- Preserve the T04 certificate/CSR/private-key/Keychain/profile/signing/device freeze until substantive Apple Support guidance is documented and one supported action is reviewed. Keep T03 App Store verifier processing off while its security/acceptance gates remain open. Never treat an unsigned build or old QA as signed-device proof.
- Keep privacy intake, deletion, retention, operations, monitoring, App Store server verification, and Notifications V2 off until their separate production evidence and activation approvals. Do not infer a role, migration, ACL, credential, provider capability, scheduler, shell binding, or production operator from source-only packets.
- Continue App Store/TestFlight preparation without submission. Do not upload or distribute a build, create a public TestFlight link, invite external testers, submit for review, or release without Tyler's approval for that exact build/action/scope. Do not clear sandbox purchase history or delete a tester without exact approval.
- At every EOD reconcile `docs/project-timeline.md`: actual completions, all unfinished T01–T12/deferred tracks, owners/dependencies, remaining effort, prior/revised dates, and evidence-based forecast confidence. If ahead, pull forward only scoped dependency-ready work; never discard QA, approval, availability, or review/rework contingency.
- Keep Tyler's **November 16, 2026 controlled soft-launch target** and **January 3, 2027 full 120th Congress launch target** visible without treating either as release authorization. Surface risk and preserve the October 2–6 owner-availability buffer; schedule no required approvals, device sessions, uploads, or submissions during it. Do not move either target without Tyler's decision.
<!-- END EOD STANDING RULES -->

## Baseline

- Repo: `/Users/tylergates/Documents/Capitol Ledger`
- Documentation branch at handoff preparation: `codex/sept25-eod-launch-rebaseline`
- Documentation checkpoint before this dated handoff: `d470365ea96035aa18820cf5b72ef349791d4839`, synchronized with its upstream.
- T12 branch: `codex/congress-transition` at `8befc533e39cbf9b522af4169cebcdeeccce2049`, synchronized with its upstream and clean.
- Worktree: the documentation checkout has only the intentional untracked `.worktrees/` container; do not add or remove it merely to make status empty.
- Production target: `https://project-qosv1.vercel.app`
- Production source: `main` at `26190cd2cb953a875380f077b5b2d76c1566ac51`, the PR #49 trust-repair merge.
- Latest recorded matching Production deployment: `CNGPiVFrqx6XmdQdvGtrcANsiBsi`, Ready. Closing smoke returned HTTP 200 for `/sign-in`, `/dashboard`, and `/privacy`.
- Browser state: [PR #51](https://github.com/Tylerandersongates/Capitol-Ledger/pull/51) remains open for review at exact head `8befc53`, with all three checks green, a Ready branch Preview, and no base conflict.
- Device/distribution distinction: the newest signed candidate installed directly on the iPhone is version `1.0`, build `2`; the newest TestFlight-distributed build remains version `1.0`, build `1`. Both native shells load the Production web target dynamically. Force-quit and reopen before a phone session. Neither label means PR #50 or PR #51 is in Production.

## Completed Today

- Verified the PR #49 Production trust repair after merge: matching Production stayed Ready, anonymous Production smoke passed, and the completed disposable-account password-reset, verification-gate, email-verification, sign-out, and fresh-sign-in evidence was retained without repeating protected QA.
- Confirmed the temporary Neon child is gone and only the protected CapitolWonk branch remains. Identified the exact five obsolete branch-scoped Preview override targets without displaying their values or removing them.
- Reconciled the full T01–T12 pre-absence gate inventory, owners, dependencies, approval boundaries, and November 16 / January 3 schedule.
- Created the [pre-surgery readiness packet](pre-surgery-readiness-packet-2026-09-28.md), including the T05 event packet, separated T06 source/browser/device matrix, staged T07 sandbox sequence, T08 no-player baseline, split T10 release checklists, T11 decision criteria, and T12 invariants.
- Opened [PR #50](https://github.com/Tylerandersongates/Capitol-Ledger/pull/50) at exact head `49997c706da2ed8e7d70f6e9bcadc50c5bff1265` for truthful disabled privacy-request copy. Its three remote checks and branch Preview are green. It remains unmerged, undeployed, and inactive.
- Completed and opened [PR #51](https://github.com/Tylerandersongates/Capitol-Ledger/pull/51) at exact head `8befc533e39cbf9b522af4169cebcdeeccce2049`. It centralizes the active-Congress source boundary and adds sparse-feed failure, stable-member identity, and saved-bill non-retargeting evidence across the 119th and 120th Congresses.
- Completed the full safe unattended diagnostic for PR #51. No protected value, user account, provider, Production configuration, database, device, purchase, upload, submission, or release was mutated.
- Pulled forward the planned one-working-day benchmark as recovery/rework contingency. No additional dependency-ready pre-surgery source/browser work remains unperformed.

## Diagnostics

- Full `release-source:check`: passed, including database-target, billing, Team, privacy, deletion, native, TestFlight-prep, copy, sparse-state, docket, transition, policy, response, auth-email, rate-limit, and accessibility contracts. Expected warnings for unavailable protected App Store/auth/provider configuration remain gates, not proof.
- Full ESLint: passed with no warnings or errors.
- Strict TypeScript with unused-local and unused-parameter enforcement: passed.
- Prisma generation: passed.
- Optimized Next.js production build: passed; all 57 pages generated.
- Transition coverage: passed for 119/120 selection, explicit labels, source URLs, stable Bioguide identity, distinct same-number bill IDs, saved-state non-retargeting, and zero-write failure on an empty early-120th feed.
- `git diff --check`: passed on the source and documentation checkpoints.
- PR #50 exact-head remote audit: Quality checks, Vercel Preview Comments, and Vercel deployment status all passed.
- PR #51 exact-head remote audit: Quality checks, Vercel Preview Comments, and Vercel deployment status all passed.
- EOD standing-rule and launch-copy checks passed for the final handoff content; rerun them after the commit to verify the exact checkpoint.

## QA

- Production smoke at closure: `/sign-in`, `/dashboard`, and `/privacy` each returned HTTP 200.
- Cookie-isolated desktop matrix: passed for public/sparse-state pages and the expected anonymous redirects.
- Mobile matrix at 390x844: passed on critical public and sparse-state surfaces with no horizontal overflow.
- Browser console: no warnings or errors across either matrix.
- Daily Brief: no YouTube resource requests; only the approved outbound channel link was present.
- PR #51 Preview: rendered truthful no-record dashboard and docket states without a mutation.
- Known issue boundary: PRs #50 and #51 are not merged or in Production. T05 native-event delivery, T06 protected/device rows, T07 sandbox lifecycle, T08 launch content/player decision, T09 remote privacy/listing/provider evidence, T10 distribution/release, T11 go/no-go, and T12 isolated-data/official-feed transition proof remain open.

## Current State

- The September 28–October 1 pre-absence benchmark is complete ahead of its internal daily target, and one working day has been preserved as contingency. This is not a claim that the full launch plan is broadly ahead.
- November 16 controlled soft launch remains **moderate-high confidence**, with roughly **6–10 hands-on days** remaining before launch excluding wider-use rework.
- January 3 full 120th Congress launch remains **moderate confidence**, with another **6–12 hands-on days** plus any Apple-controlled wait if native/App Store distribution is included.
- The historical October 30 target remains superseded by November 16 and January 3. Neither current date authorizes a release.
- October 2–6 remains protected from required approvals, device work, uploads, submissions, or release actions. The privacy mailbox is a recorded sole-owner closure with no continuous-coverage claim; review the oldest unreviewed item first on return.
- First-party privacy intake/operations/monitoring/retention/deletion, App Store server verification, and Notifications V2 remain off.
- No Production, provider, Apple account, signing, configuration, data, purchase, deletion, upload, distribution, submission, or release action was performed during the pull-ahead block.

## Next Best Steps

1. Continue non-destructive phone testing against Production. Force-quit and reopen CapitolWonk before each session; record the route, time, expected result, actual result, and screenshot for any defect. Do not repurchase. Use Restore Purchases once only if the existing entitlement is inconsistent, and do not run account deletion with a reusable account.
2. Review PR #50 and PR #51 as independent source changes. Keep each merge and any resulting Production deployment separate from first-party intake, provider/configuration, data rehearsal, or active-Congress activation.
3. If phone testing finds a reproducible web/source defect before the protected window, fix and revalidate only that bounded defect. If no defect appears, preserve the completed state rather than manufacturing work.
4. Defer protected device/provider/Apple/sandbox work until October 7 or later and only after availability is confirmed. Do not schedule a required owner action during October 2–6.

## Timeline And Carryovers

- Ledger last reconciled: September 28, 2026 in [the unified pre-absence inventory](project-timeline.md#september-28-unified-pre-absence-gate-inventory-and-pre-surgery-acceleration).
- Next session's first task: triage any new phone-testing report against exact Production source `26190cd`; if there is no report, review PR #50 and PR #51 without merging them together or broadening their scope.
- T01 — Brand/listing: core brand closed. Corrected listing recapture stays conditional on the exact future candidate. Codex owns local preparation; Tyler owns remote asset changes.
- T02 — Sentry geography: closed for new events. Reopen only after a relevant change; any new probe or rule change needs reviewed scope.
- T03 — Dependency/verifier: web graph sufficient for the controlled web launch; Apple verifier/OCSP acceptance remains open on Apple upstream plus Tyler's security decision. Processing stays off.
- T04 — Signing/install: closed for the recorded signed `1.0 (2)` archive and direct iPhone install/launch. Preserve the evidence and existing Apple state; upload/distribution remains T10.
- T05 — Native monitoring: open. Packet prepared; Tyler is required for protected value/device/event scope on an exact candidate.
- T06 — Whole-app/device QA: source/browser rows are green; authenticated and physical-device rows remain partial. Codex owns source/browser fixes; Tyler owns protected sessions and installed-device actions.
- T07 — Subscription/sandbox: open. The staged matrix is prepared; Tyler and Apple remain dependencies for purchase, restore, renewal/refund, notification, Team, and account actions.
- T08 — Daily Brief/video: open. Honest no-player/channel-only baseline remains. Tyler owns the content/player launch-scope decision; no decision is required during the absence.
- T09 — Privacy/trust/providers/listing: open. Trust repair, Production health, mailbox fallback, and Neon cleanup are evidenced. PR #50 is the source-copy candidate. Tyler owns remote questionnaire/assets/provider/config/destructive actions.
- T10 — Release execution: prepared and split into web and native/TestFlight paths. Every upload, distribution, submission, and release still requires exact approval.
- T11 — Go/no-go: criteria prepared; Tyler owns the November 16 and January 2/3 decisions.
- T12 — 120th Congress: active in PR #51. Source invariants and sparse/saved-state fixtures are green; official-feed observation, isolated-data rehearsal, Production configuration, and final transition remain later evidence/approval gates.
- Deferred after launch-critical work: provider-backed rate limiting, final auth-email volume evidence, broader civic-data freshness/fallback work, source-grounded live AI/provider verification, additional Senate-vote sync scope, Daily Brief outbound delivery, the Supreme Court sister app, and later state-legislation expansion.
- Effort/forecast: keep the **6–10 hands-on days** to November 16 and **6–12 additional hands-on days** to January 3 ranges. They exclude new defects, wider-use rework, and Apple/provider wait time.
- Schedule assessment: ahead of today's benchmark by the preserved one-working-day contingency; not broadly ahead while T03, T05–T12 runtime/device/provider/content/release evidence remains open.
- Prior versus revised targets: October 30 is historical. November 16 provides post-election controlled-launch timing and preserved regression/rework space; January 3 aligns the full transition with the 120th Congress. Do not move either without Tyler's decision.
- Availability/contingency: October 2–6 remains a no-required-action owner absence. October 7 is only a tentative restart subject to confirmation. Extend the buffer if needed rather than consuming safety gates.

## Resume Prompt For The Next Thread

Continue CapitolWonk from the September 28 EOD handoff and treat its complete Standing Rules block as governing. Production remains on `main` at `26190cd2cb953a875380f077b5b2d76c1566ac51`, the PR #49 trust repair is live, and closing `/sign-in`, `/dashboard`, and `/privacy` smoke passed. The newest signed direct-install device candidate is `1.0 (2)`; the newest TestFlight-distributed build is `1.0 (1)`. Both load the Production web target dynamically, so force-quit/reopen before testing and do not confuse a native build number with unmerged source. PR #50 at `49997c706da2ed8e7d70f6e9bcadc50c5bff1265` and PR #51 at `8befc533e39cbf9b522af4169cebcdeeccce2049` are independent, open, unmerged candidates with all three remote checks and Ready branch Previews green. The full PR #51 release-source/lint/strict-TypeScript/57-page-build/desktop/mobile diagnostic passed. No protected, provider, Production, Apple, device, purchase, deletion, upload, submission, or release action was taken. First triage any new phone-testing report against exact Production source; if none exists, review PR #50 and PR #51 separately. Preserve October 2–6 as a no-required-action owner absence, keep first-party privacy and App Store processing gates off, and do not merge, deploy, change configuration/data, flip the active Congress, run protected/device/sandbox actions, upload, distribute, submit, or release without the approval required for that exact action. November 16 and January 3 remain targets, not authorization.
