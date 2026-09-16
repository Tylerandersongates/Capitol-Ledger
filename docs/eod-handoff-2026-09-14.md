# CapitolWonk Handoff — September 14, 2026

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
- Keep Tyler's **October 30, 2026 launch target** visible without treating it as release authorization. Surface risk and preserve the October 2–6 owner-availability buffer (subject to confirmation); schedule no required approvals, device sessions, uploads, or submissions during it. Do not move the target without Tyler's decision.
<!-- END EOD STANDING RULES -->

> September 15 continuation addendum: Tyler reports the OS 27 update completed; the intentionally removed project caches remain regenerable, not source loss. The separately approved exact [ambient preflight](privacy-request-operator-ambient-privilege-preflight-2026-09-14.sql) ran once against the retained literal `Capitol%20Ledger` database on protected `production` and failed closed: only one of two privacy tables existed, while `PUBLIC` database `CONNECT` and `TEMPORARY` were present. Separate Neon UI evidence identified `PrivacyRequestOperation` as missing and found that its checked-in migration name is the only one absent from the recorded production migration-name set. The [September 15 evidence packet](privacy-request-operator-read-only-evidence-2026-09-15.md) records the sanitized findings; the [remediation review](privacy-request-operator-ambient-privilege-remediation-review-2026-09-15.md) keeps the migration and shared-ACL changes separate. A guarded principal-ACL inventory is prepared as source only; Neon SQL Editor cannot connect to the literal percent-name database, and no direct-client credential method or private Vercel runtime-role read has been authorized under this checkpoint. No production role, ACL, migration, credential, binding, provider, or gate change followed. Do not repeat the preflight or advance T09 past this failed baseline automatically. The September 14 “Tomorrow” and resume instructions below are historical where this addendum supersedes them.

## September 15 resumption — current next step

Carry the Standing Rules above and the full timeline ledger. Routine source-only dependency/recovery preparation can continue without another confirmation. The next protected action is not role bootstrap or an ACL/migration write: it is the digest-pinned [principal-ACL catalog read](privacy-request-operator-principal-acl-inventory-2026-09-15.sql), which needs an exact direct-client/credential-handling approval because Neon SQL Editor cannot address the literal database. Identifying Vercel's runtime database username from its private connection setting is a separate protected-value checkpoint. Once these dependencies are known, review the operations migration and shared `PUBLIC` ACL remediation independently; neither production write is approved. Keep all processing gates and Apple T04 freeze intact.

## Current boundary — verified September 14 release state

Production `main` is at [PR #26](https://github.com/Tylerandersongates/Capitol-Ledger/pull/26) merge `6ce51198af1952284df5e8ee7f80c68f653d7f9d`, produced from reviewed branch commit `41e0f8c7f8165772fbd374faa2f85a3b2d04fe97`. All three pull-request checks passed. Exact-source Vercel Production deployment `EMC3GJiB6teFgQvWHUAtWc9eNq4k` is Ready and Current on `www.capitolwonk.com`. Live smoke returned:

- `https://capitolwonk.com/privacy`: `308` to canonical `https://www.capitolwonk.com/privacy`;
- canonical `/privacy`: `200`; and
- `/api/privacy/requests`: expected disabled `503` with `cache-control: no-store` and `PRIVACY_REQUEST_INTAKE_DISABLED`.

PR #26 deployed only the source and review contract for a guarded, explicit-read-only, aggregate-only ambient-privilege preflight. It did not connect to or inspect production. It did not change a database, role, ACL, credential, migration, provider, application binding, Vercel configuration, or processing gate, and it does not authorize the target read.

Production Batch A is already complete. The older Batch A compatibility reproduction/no-go instructions in dated September 13 sections are historical and must not be treated as the next task.

## Completed September 14

- Completed Production Batch A and deployed the matching default-off source in PR #8.
- Continued the Apple-independent T09 chain through PRs #12–#26: verifier containment, aggregate monitoring, owner policy and custom-domain record, operator lifecycle, task-ledger reconciliation, operator boundary/pause procedure, artifact-deletion and restore-floor verification, parser/dispatcher core, fail-closed stdin shell, explicit-dependency service adapter, least-privilege database-access contract, source-only function boundary, atomic function-migration/ACL review, inert role-bootstrap review, and the ambient-privilege preflight source.
- Kept the runtime boundary closed throughout: no production privacy operator role or credential exists; operations and function migrations remain unapplied; the service adapter is disconnected from the stdin shell and application routes; no scheduler or provider operation was enabled.
- Preserved the Apple boundary: no substantive Apple Support guidance is recorded, T04 remains blocked, and no certificate, profile, Keychain, signing, device, upload, distribution, submission, or release action was taken.

## Storage cleanup for the OS update

With Tyler's explicit confirmation, permanently removed only regenerable project caches: `.next`, `node_modules`, and repo-local `.pnpm-store` directories from the known Capitol Ledger checkouts/worktrees, plus the two CapitolLedgerNative Xcode DerivedData directories. No source, Git history, tracked artifact, user document, or production data was deleted.

- Free space increased from approximately `1.8 GiB` to `14 GiB` on the startup volume—about `12.2 GiB` of actual available-space recovery after APFS accounting.
- This EOD worktree was clean immediately after cleanup.
- The six pre-existing modified/untracked documentation files in the older `2ec3` worktree were preserved unchanged.
- Local dependencies and build outputs are now absent. Reinstall/rebuild only when needed after the OS update; do not mistake missing generated directories for source loss.

## Release and approval boundary — September 14 historical state

- Production Batch A and the five reviewed privacy migrations are complete.
- Privacy intake, deletion, retention, operations, monitoring, App Store server verification, and Notifications V2 remain off.
- The ambient-privilege preflight is deployed as inert source only. Its production execution remains separately approval-gated.
- No production privacy operator roles exist. Role creation, credentials, connection origin, protected binding, operations/function migration execution, grants, adapter conversion, shell binding, provider work, retention runs, monitor reads, and activation are separate checkpoints.
- If the later preflight reports any failed aggregate condition, stop. Do not create roles and do not remediate a shared `PUBLIC` ACL automatically. Prepare any remediation as its own reviewed and approved action.

## Tomorrow — September 14 plan, now superseded by September 15 evidence

1. Confirm the OS update completed and the workspace/disk state is stable. Expect dependency and build caches to be absent.
2. Reverify PR #26's exact merged/deployed evidence and keep every gate off.
3. Present one exact approval request to execute only `docs/privacy-request-operator-ambient-privilege-preflight-2026-09-14.sql` against the exact expected production database. The action must preserve the explicit read-only transaction, guard marker, expected-database setting, aggregate-only output, and stop-on-failure behavior.
4. If the preflight fails, stop and prepare a separate evidence/remediation review. If it passes, present inert production role creation for separate review and approval; do not execute it automatically.

Do not reinstall the dependency graph merely to restore caches before the OS update. When project execution later requires it, restore the frozen graph and rerun the proportionate checks for the then-current exact head.

## Carryovers to the October 30 launch

- **T03 — high/open:** Apple issue #447, the OCSP/resource acceptance matrix, independent review, sandbox/device proof, and the residual `jsrsasign` decision remain unresolved. Do not activate App Store server processing.
- **T04 — blocked:** await substantive Apple Support guidance and preserve the full certificate/profile/Keychain/signing/device freeze.
- **T05–T07:** native monitoring proof, physical-device QA, and App Store sandbox subscription/lifecycle QA remain blocked by a valid signed candidate and device path.
- **T08:** decide and prepare the first Daily Brief/video launch scope without publishing or enabling outbound delivery automatically.
- **T09:** the approved ambient-privilege preflight failed closed; the operations table and `PUBLIC` database-privilege dependencies remain separate blockers. Continue source-only preparation without routine confirmation, but require exact approval for protected credential handling and each later production ACL/migration/role/activation action.
- **T10–T11:** TestFlight distribution, App Review submission, and launch remain unapproved and dependent on the upstream gates.

Preserve the October 2–6 buffer and October 20–29 contingency. The existing estimate remains `7–13` hands-on working days excluding external waits, re-review, remediation, and QA fixes. October 30 remains low-confidence and materially at risk while Apple, verifier, signing, device, sandbox, operator-runtime, activation, distribution, and review gates remain open.

## Resume prompt — archived September 14 version

> Continue CapitolWonk from `docs/eod-handoff-2026-09-14.md`, `docs/project-timeline.md`, `Capitol Ledger App/Current Status.md`, and `Capitol Ledger App/Next Steps.md`. First confirm the OS update and workspace/disk state are stable; project dependencies and generated build caches were intentionally removed. Production Batch A is complete. Production `main` is at PR #26 merge `6ce51198af1952284df5e8ee7f80c68f653d7f9d`; all three checks passed and exact-source Vercel Production deployment `EMC3GJiB6teFgQvWHUAtWc9eNq4k` is Ready and Current with the expected redirect, `/privacy` 200, and disabled `503`/`no-store` privacy API. PR #26 deployed only the guarded aggregate ambient-privilege preflight source; it did not inspect production or authorize execution. Present one exact approval request for that read-only production preflight. Stop on any failed condition; do not create roles or change shared ACLs automatically. Preserve every privacy/App Store gate and the T04 signing/device freeze while Apple Support is pending. October 30 remains low-confidence/materially at risk.
