# Capitol Ledger EOD Handoff Template

Use this template for every end-of-day handoff going forward.

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
- At every EOD reconcile `docs/project-timeline.md`: actual completions, all unfinished T01–T11/deferred tracks, owners/dependencies, remaining effort, prior/revised dates, and evidence-based forecast confidence. If ahead, pull forward only scoped dependency-ready work; never discard QA, approval, availability, or review/rework contingency.
- Keep Tyler's **November 16, 2026 soft-launch target** and **January 3, 2027 full 120th Congress launch target** visible without treating either as release authorization. Preserve the stabilization window, source-backed Congress transition, cutover rehearsal, freeze, and separate go/no-go decisions. Do not move either target without Tyler's decision.
<!-- END EOD STANDING RULES -->

Copy this entire marked block into every dated EOD handoff. Run `node scripts/check-eod-standing-rules.mjs` before closing it; the check needs no project dependencies and fails if a dated handoff from September 13 onward drops or changes a standing rule. CI runs the same check before installing project dependencies.

If `node` is not on the local PATH after cache cleanup, use the bundled Node path returned by `load_workspace_dependencies`; do not reinstall the project dependency graph merely for this EOD check.

For every future EOD, also reconcile the concise live `docs/HANDOFF.md`, the full `docs/project-timeline.md` ledger, and any new accepted decision in `docs/DECISIONS.md`. Keep standing collaboration guidance in `AGENTS.md` and `docs/PROJECT-CONTEXT.md`; dated EODs are the archive. This existing full Standing Rules block remains mandatory in each dated EOD even though the live handoff should be roughly 500–900 words. Record exact worktree/branch/HEAD, local dirty files and cross-worktree access, verification tied to a code state, unresolved blockers and failed approaches, and one next safe action. Do not begin tomorrow's feature work during EOD or move/push/merge solely for a tidy handoff. The live handoff must link this dated archive and distinguish implementation evidence from old claims.

## Baseline
- Repo:
- Branch:
- HEAD:
- Origin sync:
- Worktree:
- Production target:
- Latest deployment:
- Browser state:

## Completed Today
-

## Diagnostics
- Code scan:
- Checks run:
- Blocked checks:
- Cleanup applied:

## QA
- Production smoke:
- Browser QA:
- Known issues:

## Current State
-

## Next Best Steps
1.
2.
3.

## Timeline And Carryovers

- Ledger last reconciled / dated baseline:
- Tomorrow's first task:
- Completed task IDs and evidence:
- Every remaining task ID / status / owner / dependency:
- Remaining effort, next checkpoint and forecast confidence:
- Ahead / on track / behind / not measurable, with evidence:
- Prior versus revised targets, reason and safe next task to pull forward if ahead:
- Availability/contingency changes and their schedule impact:
