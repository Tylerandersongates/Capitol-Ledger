# CapitolWonk Handoff — September 14, 2026

## Current boundary

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

## Release and approval boundary

- Production Batch A and the five reviewed privacy migrations are complete.
- Privacy intake, deletion, retention, operations, monitoring, App Store server verification, and Notifications V2 remain off.
- The ambient-privilege preflight is deployed as inert source only. Its production execution remains separately approval-gated.
- No production privacy operator roles exist. Role creation, credentials, connection origin, protected binding, operations/function migration execution, grants, adapter conversion, shell binding, provider work, retention runs, monitor reads, and activation are separate checkpoints.
- If the later preflight reports any failed aggregate condition, stop. Do not create roles and do not remediate a shared `PUBLIC` ACL automatically. Prepare any remediation as its own reviewed and approved action.

## Tomorrow — first actions

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
- **T09:** continue the privacy-operator production sequence one separately approved checkpoint at a time, beginning with the read-only ambient-privilege preflight.
- **T10–T11:** TestFlight distribution, App Review submission, and launch remain unapproved and dependent on the upstream gates.

Preserve the October 2–6 buffer and October 20–29 contingency. The existing estimate remains `7–13` hands-on working days excluding external waits, re-review, remediation, and QA fixes. October 30 remains low-confidence and materially at risk while Apple, verifier, signing, device, sandbox, operator-runtime, activation, distribution, and review gates remain open.

## Resume prompt

> Continue CapitolWonk from `docs/eod-handoff-2026-09-14.md`, `docs/project-timeline.md`, `Capitol Ledger App/Current Status.md`, and `Capitol Ledger App/Next Steps.md`. First confirm the OS update and workspace/disk state are stable; project dependencies and generated build caches were intentionally removed. Production Batch A is complete. Production `main` is at PR #26 merge `6ce51198af1952284df5e8ee7f80c68f653d7f9d`; all three checks passed and exact-source Vercel Production deployment `EMC3GJiB6teFgQvWHUAtWc9eNq4k` is Ready and Current with the expected redirect, `/privacy` 200, and disabled `503`/`no-store` privacy API. PR #26 deployed only the guarded aggregate ambient-privilege preflight source; it did not inspect production or authorize execution. Present one exact approval request for that read-only production preflight. Stop on any failed condition; do not create roles or change shared ACLs automatically. Preserve every privacy/App Store gate and the T04 signing/device freeze while Apple Support is pending. October 30 remains low-confidence/materially at risk.
