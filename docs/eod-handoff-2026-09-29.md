# CapitolWonk EOD Handoff — Design Updates — September 29, 2026

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
- EOD branch: `codex/eod-design-updates`
- Documentation checkpoint before this dated handoff: `39f1774485b2da053b7b7ac13fbd14e8b0f1f4c0`; it contains the September 25–29 planning history on top of current Production source.
- Production source: `main` at merge commit `7ca64a1e95bbcdcb645166746f39d3be268fff12`, [PR #57](https://github.com/Tylerandersongates/Capitol-Ledger/pull/57).
- Main CI: [run #464](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/36643751244) passed in 2m 11s, including frozen install, strict TypeScript, lint, dependency audits, release-source safeguards, and optimized build.
- Production target: `https://www.capitolwonk.com`; the automatic Vercel rollout is live and the tested bill-detail route resolves the current design source.
- Browser state: Tyler's user tabs remain open. The visible handoff route is the Production S.4723 detail page; no user tab was closed.
- Device distinction: signed direct-install build `1.0 (2)` and TestFlight build `1.0 (1)` both load the Production web target dynamically after force-quit/reopen.
- Open independent candidates: [PR #50](https://github.com/Tylerandersongates/Capitol-Ledger/pull/50) at `49997c7` and [PR #51](https://github.com/Tylerandersongates/Capitol-Ledger/pull/51) at `8befc53` remain open and outside Production.

## Completed Today

- Completed the independent source review of PR #50 without merging it or activating first-party privacy intake.
- Merged and deployed [PR #52](https://github.com/Tylerandersongates/Capitol-Ledger/pull/52), preventing mobile Top Activity text overlap.
- Merged and deployed [PR #53](https://github.com/Tylerandersongates/Capitol-Ledger/pull/53), adding the approved Gilded Reveal loading treatment with the logo, top-to-bottom reveal line, and no following foil circle.
- Merged and deployed [PR #54](https://github.com/Tylerandersongates/Capitol-Ledger/pull/54), restoring bounded search-results scrolling and scoping bill-vote officials to the district/saved set instead of the full state delegation.
- Merged and deployed [PR #55](https://github.com/Tylerandersongates/Capitol-Ledger/pull/55), containing official bill text and cleaning/wrapping source-format artifacts without rewriting the official record.
- Merged and deployed [PR #56](https://github.com/Tylerandersongates/Capitol-Ledger/pull/56), applying bounded mobile scroll treatment to long source, vote, and record panels so the glass gradient is not stretched.
- Merged and deployed [PR #57](https://github.com/Tylerandersongates/Capitol-Ledger/pull/57), locking vertical panels to `pan-y`, hiding horizontal overflow, wrapping long official-text separators, and adding a timeline-containment regression guard.
- Verified the latest merge on Production and retained the open live app for continued phone testing.

## Diagnostics

- Exact Production main CI #464: passed in 2m 11s. The only annotation is GitHub's future Ubuntu runner-image migration notice, not an app failure.
- Strict TypeScript with unused-local and unused-parameter enforcement and incremental output disabled: passed.
- Next lint: passed with no warnings or errors. The first attempt was blocked only because the sandbox could not write the local ESLint cache; the authorized cache-writing rerun passed.
- TestFlight mobile UI regression check: passed.
- District official matching check: passed.
- Prisma generation and optimized Next.js production build: passed; all 57 pages generated.
- EOD standing-rule continuity check passed before the new file; rerun after the final edit/commit.
- `git diff --check`: passed before the new file; rerun after the final edit/commit.
- The local aggregate `pnpm run release-source:check` wrapper did not run because bundled pnpm 11 attempted an automatic install against the intentionally shared `node_modules` symlink and the sandbox refused the write. No dependency install or source change was made. Exact-source main CI already passed the full release-source suite under the declared Node 22/pnpm 9 toolchain, and the changed documentation does not alter application source.
- The repository root checkout has a stale file-monitor condition that makes root-level `git status` and merges hang. Verified hung processes were stopped; the EOD work was isolated in the clean attached worktree. This is a local workspace maintenance issue, not a Production defect.

## QA

- Closing Production smoke: `/sign-in`, `/dashboard`, and `/privacy` loaded successfully; the signed-in dashboard rendered the expected saved officials, saved bill, Latest Votes, Daily Brief, and corrected Top Activity labels.
- Production timeline panel: `518px` client height versus `1199px` scroll height, `overflow-y: auto`, `overflow-x: hidden`, `touch-action: pan-y`, equal client/scroll width, and the contained-mobile frame class present.
- Production official bill text: `254px` client height versus `6964px` scroll height, `overflow-y: auto`, `overflow-x: hidden`, `touch-action: pan-y`, equal client/scroll width, and child text using `overflow-wrap: anywhere`, `white-space: pre-line`, and `max-width: 100%`.
- Search results, bill-vote officials, official bill text, source records, and long timeline panels were exercised through the PR Preview/Production sequence that produced PRs #54–#57.
- Gilded Reveal and Top Activity fixes were approved visually and released through PRs #52–#53.
- Known issue boundary: no unresolved reproducible design defect is recorded at close. Continued live testing may surface new issues; triage them against exact Production source `7ca64a1` rather than assuming they are already covered.

## Environment And Config Changes

- No environment variable, protected value, provider setting, database/schema/data, Apple account/signing state, subscription product, tester distribution, upload, submission, or release setting changed during this design block.
- External targets touched: GitHub PR/CI and automatic Vercel Production deployments for PRs #52–#57; read-only browser QA on `www.capitolwonk.com`.
- Documentation-only EOD changes remain on `codex/eod-design-updates` until their own checkpoint is committed and pushed.

## Current State

- Production is on `main` at `7ca64a1` with today's six design PRs live. The most recent main CI and Production scroll metrics are green.
- T06 source/browser coverage is materially better: the reported mobile overlap, stretched-gradient, wrong vote-official scope, long bill-text, long source-record, and long timeline behaviors are fixed and regression guarded. Authenticated and physical-device matrix rows remain partial and must not be promoted to release clearance from browser evidence alone.
- PR #50 and PR #51 remain independent, open candidates. Today's design merges do not merge their scopes, activate first-party privacy intake, or change the active Congress.
- First-party privacy intake/operations/monitoring/retention/deletion, App Store verification, and Notifications V2 remain off.
- No release-critical gate was bypassed. The November 16 controlled soft-launch target remains moderate-high confidence; January 3 remains moderate confidence.
- Tyler will continue live testing on the phone and report any further design problems.

## Next Best Steps

1. **Single safest next action:** triage the first new reproducible phone-testing report against Production `7ca64a1`. Force-quit/reopen the native shell first, then record route, time, expected result, actual result, and screenshot. If no defect appears, preserve the clean state instead of manufacturing work.
2. Keep PR #50 and PR #51 independent and open unless a later explicit merge/deploy decision is made. Do not couple either to provider/configuration/data activation.
3. Preserve October 2–6 as a no-required-action owner window. Schedule protected device, native-event, sandbox, purchase, deletion, Apple, upload, submission, and release work for October 7 or later only after availability is confirmed.

## Timeline And Carryovers

- Ledger last reconciled: September 29, 2026 in [the Design Updates closeout](project-timeline.md#september-29-eod--design-updates-live).
- Tomorrow's first task: triage any new live-testing design report against exact Production `7ca64a1`; if none exists, hold the Production baseline and review PR #51 independently without merging or flipping the active Congress.
- T01 — Brand/listing: core brand remains closed; candidate-bound listing recapture remains conditional and Tyler-owned for remote asset changes.
- T02 — Sentry geography: closed for new events; reopen only after a relevant change.
- T03 — Dependency/verifier: web graph remains sufficient for the controlled web launch; Apple verifier/OCSP acceptance remains open and processing stays off.
- T04 — Signing/install: closed for the recorded signed `1.0 (2)` archive/direct install; preserve existing Apple state and move remaining proof to T05–T07.
- T05 — Native monitoring: open; packet prepared, protected value/device/event action remains Tyler-dependent.
- T06 — Whole-app/device QA: source/browser design regressions reported September 29 are fixed and live; authenticated and physical-device rows remain partial. Codex owns bounded source/browser fixes; Tyler owns protected sessions/device actions.
- T07 — Subscription/sandbox: open; the staged matrix remains prepared and depends on Tyler/Apple for protected purchase, restore, lifecycle, notification, Team, and account actions.
- T08 — Daily Brief/video: open; no-player/channel-only baseline remains. Tyler owns the launch-scope/content decision.
- T09 — Privacy/trust/providers/listing: open; PR #50 is reviewed but unmerged. Tyler owns remote questionnaire/assets/provider/configuration/destructive actions.
- T10 — Release execution: prepared and split into web and native/TestFlight paths. Every upload, distribution, submission, and release needs exact approval.
- T11 — Go/no-go: criteria prepared; Tyler owns the November 16 and January 2/3 decisions.
- T12 — 120th Congress: active in open PR #51; official-feed observation, isolated-data rehearsal, Production configuration, and the final transition remain later evidence/approval gates.
- Deferred after launch-critical work: provider-backed rate limiting, final auth-email volume evidence, broader civic-data freshness/fallback work, source-grounded live AI/provider verification, additional Senate-vote sync scope, Daily Brief outbound delivery, the Supreme Court sister app, and later state-legislation expansion.
- Remaining effort: keep the September 28 ranges of roughly **6–10 hands-on days** to November 16 and **6–12 additional hands-on days** to January 3. They exclude new live-testing defects, wider-use rework, and Apple/provider wait time.
- Schedule assessment: still ahead of the pre-absence source/browser benchmark, but today's live design repairs consumed part of the previously preserved rework contingency. No launch date or safety gate changed.
- Prior versus revised targets: October 30 remains historical. November 16 and January 3 are unchanged targets, not release authorization.
- Availability/contingency: October 2–6 remains a no-required-action owner absence. October 7 remains tentative pending confirmation; extend the buffer if needed rather than consuming approval or review gates.

## Resume Prompt For The Next Thread

Continue CapitolWonk from `docs/eod-handoff-2026-09-29.md` and treat its complete Standing Rules block as governing. Label the September 29 block **Design Updates**. Production is on `main` at `7ca64a1e95bbcdcb645166746f39d3be268fff12` with PRs #52–#57 merged and live. Main CI #464 passed, the 57-page production build passed, and Production metrics verify bounded vertical scrolling with horizontal movement locked for both the long timeline and official bill text. The reported Top Activity overlap, Gilded Reveal loader, search-results scrolling, bill-vote official scope, official bill text, long source records, stretched gradients, and timeline containment were addressed. Tyler is continuing live phone testing. First triage any new reproducible report against exact Production `7ca64a1`; force-quit/reopen, record route/time/expected/actual/screenshot, and fix only the bounded defect. If there is no new report, preserve the clean state and independently review open PR #51 without merging or flipping the active Congress. PR #50 at `49997c7` and PR #51 at `8befc53` remain open and outside Production. Keep first-party privacy/App Store processing gates off, preserve October 2–6 as no-required-action owner time, and do not run protected/device/sandbox/provider/configuration/data, upload, distribution, submission, or release actions without the exact required approval. November 16 and January 3 remain targets, not authorization.
