# CapitolWonk Five-Migration Production Promotion Packet — September 13, 2026

Status: **documentation and read-only verification preparation only; production migration is not approved and is not ready for approval.** Exact source candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` remains isolated and unmerged on `codex/sept12-privacy-neon-candidate`. September 13 preparation-packet checkpoint `69040c51e6b450f004bb93154757e06817425228` is synchronized in [PR #8](https://github.com/Tylerandersongates/Capitol-Ledger/pull/8); [CI #320](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34779661993) passed and the matching [Vercel Preview](https://vercel.com/capitolwonkce/project-qosv1/58bEqizjwAtXyPrpzDFq5JCzvYvQ) reached Ready. Production remains `main` at `7ec68bcf142d6defe865c12959b0f9a84fce72d5`.

This packet supersedes every older four-migration instruction. Approval of an isolated drill, production preflight, production migration, source deployment, scheduler configuration, gate activation, destructive QA, App Store action, or release is separate. Nothing in this document authorizes any of them.

## Decision Summary

- **Current decision:** no-go for production migration.
- **Next safe action:** use a newly approved, automatically expiring Neon child to execute all five migrations on real PostgreSQL, run the full postflight, and continue the constrained-restore drill. Do not request production migration approval until that evidence and the recovery prerequisites pass.
- **Why:** Phase 1 verified the exact target/schema and five-item pending set, but the five SQL files have not been executed together on a real PostgreSQL clone. There is no down migration or tested rollback. The files contain DDL and conditional data cleanup without an explicit all-five transaction boundary. A successful isolated run can establish the ordinary execution path; it cannot prove every mid-migration failure mode.
- **Apple separation:** unresolved Apple signing and verifier issue #447 block matching source deployment, signed/device proof, and activation. They do not change the inert schema order, but there is no schedule benefit to applying dormant production schema before this packet is ready.

## Frozen Identity

| Item | Required value |
| --- | --- |
| Repository | `Tylerandersongates/Capitol-Ledger` |
| Candidate branch | `codex/sept12-privacy-neon-candidate` |
| Exact source candidate | `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` |
| Verified preparation-packet checkpoint | `69040c51e6b450f004bb93154757e06817425228` |
| Production source | `7ec68bcf142d6defe865c12959b0f9a84fce72d5` |
| Package manager | pnpm `9.15.9` |
| Prisma runtime in locked graph | `5.22.0` |
| Neon project/database | non-secret project label `CapitolWonk`; literal database `Capitol%20Ledger`; schema `public` |
| Protected branch/history | default `production`; seven-day history setting verified |

Before any later action, prove source-sensitive paths are unchanged from `92b61b9`. Documentation commits above that SHA are permitted; any change under application source, Prisma, runtime scripts, package manifests, or the lockfile invalidates this packet until re-reviewed.

## Immutable Five-File Manifest

| Order | Migration | SHA-256 | Preconditions and expected effect |
| ---: | --- | --- | --- |
| 1 | `20260910150000_account_deletion_integrity` | `0ad52fea6bc1539b0f10fefd9efd5d512093c3da69c09a6c530452dc9327d64b` | Requires exact existing `User`, `OfficialContactMessage`, `PetitionSignature`, and `TeamSubscriptionPause` shapes. Expected orphan deletions are zero. Replaces three user foreign keys with cascades and creates/retains named indexes. Duplicate petition keys or duplicate active Team-pause users stop the action. |
| 2 | `20260910151000_account_deletion_cleanup_outbox` | `dc438284e2ba8afaf6f17f512b2e67a90b9b1d6cbc3c57510094532700e348b3` | Requires the already-applied `20260718154000_account_deletion_requests` table and absence of the new table/object namespace. Creates `AccountDeletionCleanupJob`, its request cascade, dedupe key, and operational indexes. |
| 3 | `20260910152000_team_subscription_pause_workspace_integrity` | `08a1501d97991b3c7e6b82294dc648787c6fe16d99cca49451a6dff306b616a4` | Requires `TeamSubscriptionPause` and `TeamWorkspace`. Drops workspace non-nullability, converts only `''` and `team-owner-upgrade` to null, aborts on every other workspace orphan, and installs the workspace cascade. Expected conversions are zero; do not weaken the exception. |
| 4 | `20260911110000_app_store_server_state` | `79f3b5d15fe0f2517e12de3b90488b9f863a0367070629cd56474bb06e5a64b8` | Requires `User` and absence of the sequence/tables/named objects. Creates `AppStoreObservationSequence`, account-bound canonical state, and hash-only notification receipts with ownership, uniqueness, format, environment, and status constraints. |
| 5 | `20260912120000_privacy_request_intake` | `3ccb24f3742c58c7dbd84a4c7e4b665472c585eccf042aa16888e943cdc3e1b5` | Requires `User` and absence of the new table/named objects. Creates the minimized queue, closed request/status/resolution checks, bounded detail, account cascade, indexes, and one-active-type partial uniqueness. It must remain empty while intake is off. |

Supporting reviewed-file hashes:

- `prisma/schema.prisma`: `08b6b1d155de45506c651718a15450bad3b8457d4697108d172ab3630a7d13f9`
- `scripts/check-database-target.mjs`: `f9db5cfa03240a74b7a90e5f83d35c60f705f7c5916cd5a53bb9cd3863910073`
- `docs/production-five-migration-preflight-2026-09-13.sql`: `8ae0d9972311849e00b0c649134601c42f850e6787b55929100eabc300cbd5db`
- `docs/production-five-migration-postflight-2026-09-13.sql`: `74627cd9caa05e9df1c17b1cc362cfa8c1a23de62bccd1b80f0aa1e5081a5cf9`

Recompute with `shasum -a 256` immediately before an isolated drill and again before a production action. Any mismatch is a stop condition, not a prompt to update this table casually.

## Evidence Already Available

- The Phase 1 Neon child derived from protected `production` exposed literal database `Capitol%20Ledger`, schema `public`, 29 public tables, the three control tables, 12 successfully applied migration names plus the known older rolled-back/retried history, and exactly the five pending names above.
- Phase 1 aggregate checks found zero `AccountDeletionRequest` rows and therefore `no completed-deletion watermark present`. Separately, the September 11 production preflight recorded the earlier zero-orphan/sentinel and two-Team-pause snapshot; Phase 1 did not replace that time-stamped evidence with a fresh orphan/sentinel pass.
- The temporary child and compute expired automatically. Production-target reconciliation and post-empty-database-deletion application read smoke passed.
- The source candidate, locked graph, Prisma schema, target guard, deletion/privacy fixtures, CI, and Preview are verified for their documented scopes.

These facts are time-stamped evidence, not a standing preflight. Repeat every target, migration-history, shape, and aggregate predicate immediately before action.

## Readiness Prerequisites Still Open

1. **Isolated real-PostgreSQL execution:** obtain a separate exact approval for a new expiring child, run the target guard, run the prepared [preflight SQL](production-five-migration-preflight-2026-09-13.sql), apply only the five migrations, and run the [postflight SQL](production-five-migration-postflight-2026-09-13.sql). Record durations, observed locks/timeouts, history state, and sanitized results. Do not inject a destructive mid-migration failure under this approval; failure injection needs its own reviewed scope.
2. **Recovery proof:** complete the applicable remaining constrained-restore phases. Seven-day history is a setting; it is not proof that a failed or partially applied migration can be recovered safely.
3. **Concurrency/change-window plan:** measure the isolated run, choose action-time `lock_timeout` and `statement_timeout` values from evidence, prevent overlapping deploy/schema jobs, and decide whether matching writes need a brief maintenance window. The migrations create non-concurrent indexes, replace constraints, and may delete/update rows. Prove how those settings reach Prisma's migration connection; do not assume settings in a separate SQL client carry over. Use a separately authorized read-only observer if lock evidence is required.
4. **Fresh production preflight:** verify non-secret provider identity, protected branch, endpoint label, target guard, the exact 12-success/one-resolved-retry migration-history baseline and checksums, existing object definitions, duplicates/orphans/sentinels, table sizes/counts, and unaffected catalog aggregates. Any legitimate baseline change requires a new reviewed packet/SQL checkpoint; it is not an operator override.
5. **Action-time owner/approval:** record operator, reviewer, UTC time, exact source SHA, exact five hashes, target metadata, expected lock window, abort authority, and the separate Batch A approval. Never record a credential or private provider/case identifier.

## Local Source Verification

Run from a clean checkout with the pinned toolchain:

```text
git status --short --branch
git rev-parse HEAD
git rev-parse @{upstream}
git diff --exit-code 92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86..HEAD -- . ':(exclude)docs/**' ':(exclude)Capitol Ledger App/**'
git status --porcelain=v1 --untracked-files=all
shasum -a 256 prisma/migrations/20260910150000_account_deletion_integrity/migration.sql prisma/migrations/20260910151000_account_deletion_cleanup_outbox/migration.sql prisma/migrations/20260910152000_team_subscription_pause_workspace_integrity/migration.sql prisma/migrations/20260911110000_app_store_server_state/migration.sql prisma/migrations/20260912120000_privacy_request_intake/migration.sql prisma/schema.prisma scripts/check-database-target.mjs docs/production-five-migration-preflight-2026-09-13.sql docs/production-five-migration-postflight-2026-09-13.sql
pnpm run database-target:self-test
pnpm run release-source:check
```

The source-diff command must be empty, and the action checkout must have no staged, unstaged, or untracked files. A documentation-only committed difference is acceptable only after review. The whole-tree comparison deliberately excludes only the two documentation roots; this prevents unreviewed iOS, middleware, root runtime/configuration, or other source paths from escaping the freeze. Registry-backed audits and the strict protected-runtime gate must be rerun against the exact later action candidate; do not copy protected values into this worktree to make the strict gate pass.

## Protected Read-Only Preflight

Use an approved secret-injection path that keeps the database connection out of source, shell history, process listings, logs, screenshots, and evidence. Do not create a tracked or worktree `.env` file.

1. Confirm in Neon, by non-secret metadata, the `CapitolWonk` project, protected `production` branch, Oregon region, PostgreSQL 17, seven-day history setting, and intended endpoint.
2. Run `pnpm run database-target:check`; it must report literal `Capitol%20Ledger` and schema `public` with `_prisma_migrations`, `User`, and `AccountDeletionRequest` present. This guard does not by itself prove project, branch, or endpoint identity.
3. Run Prisma `migrate status` with the same injected connection. Require 17 repository migrations, no unresolved/failed migration, and only the exact five-item pending allowlist. Prisma status establishes the pending set; the SQL gate establishes exact stored checksums.
4. Run [the read-only preflight SQL](production-five-migration-preflight-2026-09-13.sql) in a proven fail-fast PostgreSQL client. For `psql`, use `psql -X -v ON_ERROR_STOP=1 --file docs/production-five-migration-preflight-2026-09-13.sql` only after an approved secret-injection mechanism configures the connection without placing it in the command line. Do not add `--single-transaction`; the file already owns its read-only transaction. Prove this exact client path and error-stop behavior on the isolated child before production use.
5. The preflight SQL machine-checks the exact successful migration/checksum manifest, known resolved retry, expected-five no-history condition, required relation/column/primary-key shape, namespace conflicts, existing index ownership/validity, 29-table baseline, and aggregate stop predicates. Its rows marked `MANUAL_COMPARE` are not informational: compare every column/default, constraint definition, and index key/order/predicate with the reviewed SQL and schema before proceeding.
6. Preserve the labeled preflight totals for `OfficialContactMessage`, `PetitionSignature`, `TeamSubscriptionPause`, `Member`, `Bill`, `Vote`, and `MemberVote` and compare them after migration under the approved write window. Do not reuse September 3 counts. The first two totals are required to prove migration 1 performed zero orphan deletions; a zero postflight orphan count alone cannot prove that.

Stop if the database target is ambiguous; the pending set or exact stored migration manifest differs; any expected file hash differs; a migration is unfinished or any of the expected five has a prior history row; a new object/index namespace already exists; a required relation, column, primary key, constraint, or known index has the wrong owner/type/definition/validity; a manual comparison is incomplete; an orphan, duplicate, sentinel, or null-workspace count is nonzero; the 29-table, zero-request, or two-Team-pause baseline differs; an unexpected deletion watermark exists; or concurrency cannot be controlled. A legitimate change still requires a reviewed replacement packet rather than editing an expected value during the action.

## Isolated Drill Procedure — Separate Approval Required

1. Create one temporary Neon child from current protected `production` with automatic expiry and no public traffic.
2. Select literal database `Capitol%20Ledger`; run the target guard and preflight again using only the child connection.
3. Apply the exact five through the repository's single ordered command, `pnpm prisma:migrate:deploy`. Do not execute files manually or edit `_prisma_migrations`.
4. Run Prisma status and the complete postflight. Confirm all new tables remain empty because every production-like gate is off. Complete every result-set comparison marked `MANUAL_COMPARE`; the machine gate intentionally does not treat object names alone as proof of exact CHECK expressions, defaults, FK column mappings, or index keys/predicates.
5. Record total/per-migration duration available from the migration client, separately observed locks/timeouts if an approved observer exists, migration history, checksums, schema results, aggregate counts, application read smoke against the child, and whether any step behaved differently from this packet. Do not claim per-migration lock evidence if the chosen tooling did not capture it.
6. Continue the constrained-restore drill only within the separately approved phase. Allow the child to expire automatically when evidence is complete.

Any mismatch invalidates production approval readiness and requires a revised candidate/packet.

## Production Batch A — Not Authorized

If every prerequisite later passes, the proposed action is one `pnpm prisma:migrate:deploy` from the exact frozen candidate during the approved change window. It must apply only the five names in lexical order. No application source deployment may begin until Batch A postflight is closed.

During the window:

- one named operator controls the database command and one named reviewer watches sanitized state;
- no other schema/deploy job may run;
- use only the timeout/concurrency settings proven in the isolated drill;
- stop on the first unexpected output or timeout;
- do not retry automatically; and
- keep production on the existing source with privacy intake, account deletion, retention, and App Store server processing off.

Successful migration authorizes no source deployment, scheduler, worker call, gate activation, synthetic deletion, provider message/mutation, App Store change, or release.

## Required Postflight

1. Prisma status shows zero pending migrations. The postflight SQL—not Prisma status alone—must prove the exact five newly finished with the reviewed checksums and step counts, the complete 17-success manifest, the known single resolved retry, lexical order, and no other history change.
2. [The read-only postflight SQL](production-five-migration-postflight-2026-09-13.sql) machine-checks target/server, history, exact ordinary-table/sequence relation types, new-table column names/basic types/nullability, constraint/index ownership/type/validity, FK targets/actions, sequence parameters, empty gated tables, and integrity predicates. Every emitted `MANUAL_COMPARE` precision/default/definition/key/predicate must also match the reviewed migration SQL; machine success alone does not close postflight.
3. Both existing Team-pause rows remain present, non-null, and workspace-valid. Exact pre/post totals for `OfficialContactMessage` and `PetitionSignature` match, proving expected orphan deletions were zero; the Team null/sentinel counts prove expected rewrites were zero.
4. Public base-table count moves only from 29 to 33, and the immediate preflight `Member`, `Bill`, `Vote`, and `MemberVote` aggregates remain unchanged.
5. Existing production source passes a proportionate read-only smoke. Every new processing/intake/destructive gate remains off.
6. Record sanitized results and stop. Batch B matching-source deployment remains a later approval and remains blocked by Apple verifier/security and operational evidence.

## Failure And Recovery Decision Tree

There is no approved down migration, history edit, object drop, or direct production restore in this packet. The SQL files contain no explicit all-five `BEGIN`/`COMMIT`; until the isolated run proves actual Prisma 5.22/PostgreSQL behavior, treat each completed history row and each DDL/data step as potentially committed before a later failure.

If any command fails:

1. Stop all migration/source/activation work. Keep current production source and all new gates off.
2. Do not rerun, run `prisma migrate resolve`, edit `_prisma_migrations`, suppress the Team orphan exception, delete data, drop objects, or switch traffic.
3. Inspect read-only migration history, catalog state, aggregate integrity, locks, and application health. Record only sanitized names/counts/timestamps.
4. Classify the state: no migration began; one or more migrations completed; one migration is failed/partial; or schema succeeded but postflight failed.
5. Prepare one separately reviewed recovery proposal: forward repair from the exact observed state, or constrained restore into an isolated branch followed by a separately approved traffic decision. Seven-day history alone is not rollback proof.
6. Resume only after Tyler approves that exact recovery action.

## Evidence Record

| Field | Sanitized value |
| --- | --- |
| Approval reference and scope |  |
| UTC start/end; operator/reviewer |  |
| Candidate and production SHA |  |
| Five migration hashes |  |
| Non-secret Neon project/branch/endpoint/database metadata |  |
| Target guard and Prisma status |  |
| Preflight result and aggregate baseline |  |
| Change-window/timeouts/concurrency controls |  |
| Per-migration status/duration |  |
| Postflight schema/integrity result |  |
| Unaffected aggregate comparison |  |
| Existing-source smoke and gate-off proof |  |
| Discrepancy/recovery decision |  |

Never retain a DSN, password, token, cookie, user/account/email value, row payload, provider transaction ID, IP address, private case ID, or unrelated customer record.

## Separate Later Gates

- Batch B: matching default-off source deployment after verifier/security, recovery, and privacy-operations prerequisites.
- Batch C: cleanup secret, scheduler, and no-payload monitoring.
- Batch D: non-destructive live schema/runtime verification.
- Later separately approved isolated deletion, provider, concurrency, retention, signed-device, App Privacy, TestFlight, submission, and release gates.

See the [production privacy/deletion approval packet](production-privacy-deletion-approval-packet-2026-09-11.md), [restore-drill runbook](neon-constrained-restore-drill-runbook-2026-09-12.md), and [privacy operations runbook](privacy-operations-single-owner-contingency-2026-09-13.md) for the surrounding boundaries.
