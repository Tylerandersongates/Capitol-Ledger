# CapitolWonk Five-Migration Production Promotion Packet — September 13, 2026

Status: **the isolated five-migration drill is complete; production migration remains unapproved and is not ready for approval.** Exact source candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` remains isolated and unmerged on `codex/sept12-privacy-neon-candidate`. Drill-evidence checkpoint `6002d20c72466c6eff0ef0213407475a4c7fffff` was validated as the exact PR head by [Quality checks](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34785330439/job/103799649264) and the matching [Vercel Preview](https://vercel.com/capitolwonkce/project-qosv1/6by3hJ7YFJSbcaNkSA11aWvHo83k). It records a successful corrected preflight, ordered migration, postflight, application read smoke, and no-provider legacy-source compatibility reproduction on the replacement Neon child. Any documentation-only successor must pass its own exact-head checks before another database action. Production remains `main` at `7ec68bcf142d6defe865c12959b0f9a84fce72d5`.

This packet supersedes every older four-migration instruction. Approval of an isolated drill, production preflight, production migration, source deployment, scheduler configuration, gate activation, destructive QA, App Store action, or release is separate. Nothing in this document authorizes any of them.

## Decision Summary

- **Current decision:** no-go for production migration. In addition to the restore/runner/lock gaps, Batch A is not compatible with unchanged production source `7ec68bc` while legacy Stripe Team-checkout events can arrive.
- **Next safe action:** obtain separate action-time approval for the exact destructive deletion-marker route invocation on the isolated child, then verify the deidentified completion watermark and survivor before creating any historical comparison branch/view. Separately prove the proposed Prisma migration-session timeouts on a disposable descendant, or retain the timeout gap. Do not request production migration approval until recovery proof and the production compatibility sequence pass.
- **Why:** the five SQL files have now executed together successfully on a real PostgreSQL child, but there is still no tested restore-floor rejection/admission proof or tested rollback. Production `7ec68bc` remains incompatible with the migrated schema for delayed/retried legacy Team `checkout.session.completed` events: the isolated reproduction hit the expected workspace foreign-key rejection, and the caller swallowed it. A command-window-only write pause does not resolve those later events.
- **Apple separation:** unresolved Apple signing and verifier issue #447 still block signed/device proof, full matching-source deployment, and activation. They do not remove the legacy Stripe/schema compatibility blocker or make a database-only Batch A safe.

## Frozen Identity

| Item | Required value |
| --- | --- |
| Repository | `Tylerandersongates/Capitol-Ledger` |
| Candidate branch | `codex/sept12-privacy-neon-candidate` |
| Exact source candidate | `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` |
| Verified evidence checkpoint | `6002d20c72466c6eff0ef0213407475a4c7fffff` (exact-head Quality checks and Preview passed) |
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
- `docs/production-five-migration-preflight-2026-09-13.sql`: `0906a30bd39706d7903aa9097affeef7e3057c71cf535b85257c5a710dc61d08`
- `docs/production-five-migration-postflight-2026-09-13.sql`: `d54480c827b3691d7d919a8ea306bb21d8de16ec3d86cce76ded10e247e4eb95`

Recompute with `shasum -a 256` immediately before an isolated drill and again before a production action. Any mismatch is a stop condition, not a prompt to update this table casually.

## Evidence Already Available

- The Phase 1 Neon child derived from protected `production` exposed literal database `Capitol%20Ledger`, schema `public`, 29 public tables, the three control tables, 12 successfully applied migration names plus the known older rolled-back/retried history, and exactly the five pending names above. The successful history row for resolved retry `20260618162000_account_gamification_streak_date` has the reviewed checksum and `applied_steps_count = 0`; the other 11 historical successes have `applied_steps_count = 1`. Its single rolled-back attempt has the same reviewed checksum and `applied_steps_count = 0`.
- Phase 1 aggregate checks found zero `AccountDeletionRequest` rows and therefore `no completed-deletion watermark present`. Separately, the September 11 production preflight recorded the earlier zero-orphan/sentinel and two-Team-pause snapshot; Phase 1 did not replace that time-stamped evidence with a fresh orphan/sentinel pass.
- The temporary child and compute expired automatically. Production-target reconciliation and post-empty-database-deletion application read smoke passed.
- The source candidate, locked graph, Prisma schema, target guard, deletion/privacy fixtures, CI, and Preview are verified for their documented scopes.
- A September 13 read-only source comparison found a new hard compatibility blocker: production `7ec68bc` handles Team `checkout.session.completed` by calling `rememberPersonalProSubscriptionForTeamOwnerUpgrade`, may cancel the prior Pro subscription at period end, and writes sentinel `workspaceId = 'team-owner-upgrade'`; the caller catches the failure. Candidate `92b61b9` retires that checkout event and writes nullable owner-upgrade workspace state. Neither behavior has been exercised against the post-migration schema on an isolated PostgreSQL target.
- The September 13 replacement child reached the frozen preflight without any migration or schema write. Prisma status showed only the exact five pending migrations, and every stored migration checksum matched the committed file. The preflight then stopped because the earlier SQL incorrectly required `applied_steps_count = 1` for all successful history rows even though the known resolved retry's successful row is exactly `0`. The corrected preflight and postflight now pin that one successful row to `0`, every ordinary historical success and every new migration to `1`, and the single rolled-back attempt to its exact name, checksum, and `0` step count. This is a narrow baseline correction, not a relaxed history check; the corrected SQL hashes and a new exact-head review are required before the child preflight may be rerun.
- After checkpoint `230d7ce` passed exact-head checks, the corrected preflight passed and the same child applied all five migrations in reviewed order. Postflight, application reads, final aggregate reconciliation, and the provider-blocked legacy/candidate compatibility reproduction passed. Checkpoint `6002d20` records the sanitized result and passed its exact-head Quality checks and Preview. No production action followed.

These facts are time-stamped evidence, not a standing preflight. Repeat every target, migration-history, shape, and aggregate predicate immediately before action.

## Readiness Prerequisite Ledger

1. **Exact packet checkpoint — complete for the isolated drill:** PR head `6002d20` contained the reviewed tree and its exact-head Quality checks and Preview passed. Repeat this identity check before any later action; do not use a mixed revision, untracked file, or dirty/detached checkout.
2. **Replacement isolated resource and real-PostgreSQL execution — complete:** the automatically expiring replacement child passed target/baseline checks, corrected preflight, the exact ordered five-migration deploy, status, full postflight, application reads, and final reconciliation. No destructive mid-migration failure was injected and no lock observer was present, so this does not close the recovery or lock-evidence gaps.
3. **Production-source compatibility decision — reproduction complete; sequence open:** exact `7ec68bc` code hit the expected Team owner-upgrade workspace-FK failure with no external Stripe call, and its webhook swallowed that failure. Prove one separately reviewed production sequence: either deploy a minimal pre-migration-compatible source change that retires the sentinel path, or quiesce legacy Team checkout creation and webhook ingress/retries for the whole migration-to-compatible-source interval with a reconciliation plan for delayed events. A command-window-only write pause is insufficient. Provider configuration, traffic controls, source deployment, and delayed-event handling each require their stated approval; do not infer a preferred option from this packet.
4. **Recovery proof:** complete the applicable remaining constrained-restore phases. Seven-day history is a setting; it is not proof that a failed or partially applied migration can be recovered safely.
5. **Concurrency/change-window plan — measured; propagation proof open:** the isolated command took 6 seconds total and its five history durations were approximately 452, 384, 397, 433, and 373 ms. The evidence-based proposal is `connect_timeout=30`, `lock_timeout=5s`, and `statement_timeout=30s`; the lock timeout is below the statement timeout, and the statement budget is five times the observed whole command and more than 66 times the slowest individual migration. Supply both server settings through the same direct Prisma datasource URL using its supported PostgreSQL `options` parameter, not through a separate SQL session. Before production, prove exact Prisma 5.22 migration-session propagation on a separately approved disposable descendant using a diagnostic migration that asserts `current_setting('lock_timeout')` and `current_setting('statement_timeout')`; discard that descendant after separate cleanup approval. Until that passes, these values are a proposal, not an action control. No lock observer was present in the completed drill, so make no lock-duration claim.
6. **Fresh production preflight:** verify non-secret provider identity, protected branch, endpoint label, target guard, the exact 12-success/one-resolved-retry migration-history baseline, checksums, and per-row applied-step counts—including `0` only for the known resolved retry's successful row and rolled-back attempt—plus existing object definitions, complete public relation inventory, duplicates/orphans/sentinels, table sizes/counts, and unaffected catalog aggregates. Any legitimate baseline change requires a new reviewed packet/SQL checkpoint; it is not an operator override.
7. **Action-time owner/approval:** record operator, reviewer, UTC time, exact source SHA, exact five hashes, target metadata, the approved compatibility/source/traffic state, expected lock window, abort authority, and the separate Batch A approval. Never record a credential or private provider/case identifier.

The [Prisma PostgreSQL connector](https://www.prisma.io/docs/orm/v6/overview/databases/postgresql) documents `connect_timeout` and the connection-start `options` argument, including `options` support since Prisma 3.8. PostgreSQL 17 documents a percent-encoded URI example for `options=-c ...` and confirms that those options set parameters at connection start in its [libpq connection reference](https://www.postgresql.org/docs/17/libpq-connect.html). At action time, use a URL parser in the protected in-memory injection process to preserve existing parameters and set `connect_timeout=30` plus `options=-c lock_timeout=5s -c statement_timeout=30s`; never concatenate, print, or persist the resulting credential-bearing URL. The disposable assertion migration is still required because documentation support does not by itself prove the exact installed Prisma migration engine used the intended session values.

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
5. The preflight SQL machine-checks the exact successful migration/checksum/applied-step manifest, the known resolved retry's successful and rolled-back rows, expected-five no-history condition, required relation/column/primary-key shape, namespace conflicts, existing migration-1 index ownership/uniqueness/key order/predicate presence/validity, 29-table baseline, and aggregate stop predicates. Save its complete public relation-name/kind/persistence inventory for exact postflight set comparison. Its rows marked `MANUAL_COMPARE` are not informational: compare every complete column/default, constraint, and index definition—including the exact partial predicate—with the reviewed SQL and schema before proceeding.
6. Preserve the labeled preflight totals for `OfficialContactMessage`, `PetitionSignature`, `TeamSubscriptionPause`, `Member`, `Bill`, `Vote`, and `MemberVote` and compare them after migration under the approved write window. Do not reuse September 3 counts. The first two totals are required to prove migration 1 performed zero orphan deletions; a zero postflight orphan count alone cannot prove that.

Stop if the database target is ambiguous; the pending set or exact stored migration manifest differs; any expected file hash differs; a migration is unfinished or any of the expected five has a prior history row; a new object/index namespace already exists; a required relation, column, primary key, constraint, or known index has the wrong owner/type/definition/validity; a manual comparison is incomplete; an orphan, duplicate, sentinel, or null-workspace count is nonzero; the 29-table, zero-request, or two-Team-pause baseline differs; an unexpected deletion watermark exists; concurrency cannot be controlled; or the production-source/legacy-Stripe compatibility sequence is unresolved. A legitimate change still requires a reviewed replacement packet rather than editing an expected value during the action.

## Isolated Drill Procedure — Separate Approval Required

1. Create one temporary Neon child from current protected `production` with automatic expiry and no public traffic.
2. Select literal database `Capitol%20Ledger`; run the target guard and preflight again using only the child connection.
3. Apply the exact five through the repository's single ordered command, `pnpm prisma:migrate:deploy`. Do not execute files manually or edit `_prisma_migrations`.
4. Run Prisma status and the complete postflight. Confirm all new tables remain empty because every production-like gate is off. Complete every result-set comparison marked `MANUAL_COMPARE`; the machine gate checks primary/FK columns, FK target/actions, index key order, and predicate presence, but exact defaults, CHECK expressions, and partial-predicate expressions still require comparison with the reviewed SQL.
5. With external Stripe calls mocked/disabled, exercise the exact `7ec68bc` Team owner-upgrade webhook path against the post-migration child and record the expected FK incompatibility and swallowed-error boundary. Then validate the selected compatibility source/traffic sequence on the same isolated schema; do not call a real provider or create a real checkout under this drill.
6. Record total/per-migration duration available from the migration client, separately observed locks/timeouts if an approved observer exists, migration history, checksums, schema results, aggregate counts, application read smoke against the child, and whether any step behaved differently from this packet. Do not claim per-migration lock evidence if the chosen tooling did not capture it.
7. Continue the constrained-restore drill only within the separately approved phase. Allow the child to expire automatically when evidence is complete.

Any mismatch invalidates production approval readiness and requires a revised candidate/packet.

## Production Batch A — Not Authorized

There is currently **no approved production sequence**. If every prerequisite later passes, the migration portion remains one `pnpm prisma:migrate:deploy` from the exact frozen candidate during the approved change window, applying only the five names in lexical order. But Batch A may not begin while unmodified `7ec68bc` can receive a legacy Team checkout completion: first satisfy the separately reviewed compatibility/source/traffic prerequisite and record its exact state.

During the window:

- one named operator controls the database command and one named reviewer watches sanitized state;
- no other schema/deploy job may run;
- use only the timeout/concurrency settings proven in the isolated drill;
- stop on the first unexpected output or timeout;
- do not retry automatically; and
- keep privacy intake, account deletion, retention, and App Store server processing off, and preserve the exact approved compatibility/source/traffic state for delayed and retried Stripe events.

Successful migration authorizes no source deployment, scheduler, worker call, gate activation, synthetic deletion, provider message/mutation, App Store change, or release.

## Required Postflight

1. Prisma status shows zero pending migrations. The postflight SQL—not Prisma status alone—must prove the exact five newly finished with the reviewed checksums and step counts, the complete 17-success manifest, the known single resolved retry, lexical order, and no other history change.
2. [The read-only postflight SQL](production-five-migration-postflight-2026-09-13.sql) machine-checks target/server, history, exact ordinary-table/sequence relation types, new-table column names/basic types/nullability, primary-key columns, FK columns/targets/actions, index ownership/uniqueness/key order/predicate presence/validity, sequence parameters, empty gated tables, and integrity predicates. Every emitted `MANUAL_COMPARE` precision/default/constraint/index definition—especially CHECK and partial-predicate expressions—must also match the reviewed migration SQL; machine success alone does not close postflight.
3. Both existing Team-pause rows remain present, non-null, and workspace-valid. Exact pre/post totals for `OfficialContactMessage` and `PetitionSignature` match, proving expected orphan deletions were zero; the Team null/sentinel counts prove expected rewrites were zero.
4. Public base-table count moves from 29 to 33; the saved public relation inventory changes only by the reviewed table/sequence/primary-key/index additions; and the immediate preflight `Member`, `Bill`, `Vote`, and `MemberVote` aggregates remain unchanged.
5. The separately approved compatibility source/traffic state passes a proportionate read-only smoke. Every new processing/intake/destructive gate remains off, and no delayed legacy Team checkout event is released into an incompatible path.
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
| Approval reference and scope | Tyler confirmed the replacement-child Phase 2 action in the controlling Codex task on September 13, 2026: dismiss the Neon `.env` download path; use the reset child credential only in memory; rerun the corrected preflight; apply the exact five migrations; run full postflight, application read smoke, and the no-provider legacy-Stripe compatibility reproduction. Production, public traffic, provider mutation, source deployment, activation, destructive failure injection, and child deletion were outside scope and did not occur. |
| UTC start/end; operator/reviewer | Corrected preflight began by `2026-09-13T21:42:19Z`; final post-fixture reconciliation completed at `2026-09-13T21:53:36Z`. Codex operated the isolated drill under Tyler's action approval. There was no separate live lock observer; prior local packet review and exact-head CI/Preview review covered the frozen inputs. |
| Candidate and production SHA | Action/PR checkpoint `230d7ce324789c0344daf45ce82ba5539ae94693`; frozen source candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86`; unchanged production source `7ec68bcf142d6defe865c12959b0f9a84fce72d5`. The action checkout and PR head were clean and synchronized before the drill. |
| Five migration hashes | In order: `0ad52fea6bc1539b0f10fefd9efd5d512093c3da69c09a6c530452dc9327d64b`, `dc438284e2ba8afaf6f17f512b2e67a90b9b1d6cbc3c57510094532700e348b3`, `08a1501d97991b3c7e6b82294dc648787c6fe16d99cca49451a6dff306b616a4`, `79f3b5d15fe0f2517e12de3b90488b9f863a0367070629cd56474bb06e5a64b8`, `3ccb24f3742c58c7dbd84a4c7e4b665472c585eccf042aa16888e943cdc3e1b5`. |
| Non-secret Neon project/branch/endpoint/database metadata | Project `CapitolWonk` (`proud-sunset-88617238`); automatically expiring child `phase2-five-migration-20260913` (`br-rapid-glitter-ak37qyuf`) from protected `production`; direct endpoint label `ep-square-bar`; AWS `us-west-2`; PostgreSQL 17; literal database `Capitol%20Ledger`; schema `public`; role label `neondb_owner`; expiry displayed as September 14, 2026 at 14:04:45 PDT. No `.env` was downloaded or written. The reset child credential was captured from the masked Connect dialog only for each command, cleared from the clipboard immediately afterward, and never retained in evidence. |
| Target guard and Prisma status | Target guard passed for literal `Capitol%20Ledger` / `public`. Before action Prisma 5.22 found 17 repository migrations and only the reviewed five pending in order. After action and again after fixtures, Prisma reported the schema up to date with zero pending. |
| Preflight result and aggregate baseline | Corrected frozen preflight passed in 774 ms. It proved 29 public tables; the exact 12-success/one-resolved-retry history; zero unfinished rows, namespace conflicts, or stop predicates; zero account-deletion requests and official-contact messages; 7 petition signatures; 2 Team-pause rows, both with valid non-null workspaces; 564 members; 17,941 bills; 1,515 votes; and 365,830 member votes. All required manual column/default, constraint, index, and partial-predicate comparisons matched the reviewed source. |
| Change-window/timeouts/concurrency controls | Isolated child only, no public traffic, one operator, fail-fast clients, and a 30-second connection timeout. No `lock_timeout` or `statement_timeout` was injected into Prisma's migration connection because no proven propagation mechanism had been approved. No timeout or retry occurred. No separate observer captured locks, so this drill makes no per-migration lock claim. |
| Per-migration status/duration | The single `pnpm prisma:migrate:deploy` command succeeded in 6 seconds total. History timestamps show approximately 452 ms, 384 ms, 397 ms, 433 ms, and 373 ms respectively for the five migrations, each finished once in reviewed order with `applied_steps_count = 1` and no rollback row. |
| Postflight schema/integrity result | Frozen postflight passed in 989 ms and the final post-fixture repeat passed in 924 ms. It proved the exact 17-success manifest plus the known resolved retry, 33 public tables, the reviewed four-table/one-sequence shapes, exact defaults/CHECK/FK/index definitions, and a 23-relation addition with no removal or unexpected relation. All four new gated tables remained empty. `AppStoreObservationSequence` retained its reviewed initial parameters and had no value. |
| Unaffected aggregate comparison | Every protected preflight total was identical after migration: account-deletion requests 0, official-contact messages 0, petition signatures 7, Team pauses 2, null/sentinel/orphan/duplicate counts 0, members 564, bills 17,941, votes 1,515, and member votes 365,830. Expected orphan deletions and sentinel rewrites were therefore zero. |
| Existing-source smoke and gate-off proof | Candidate Prisma application reads passed against the migrated child for the target/schema, four protected aggregates, Team pauses, and all four empty gated tables. With Stripe secrets unset and `fetch` blocked, exact production source `7ec68bc` reproduced the owner-upgrade workspace FK rejection; its exact checkout webhook returned success after swallowing that failure and continued the Team subscription write, with zero provider calls. The synthetic user/subscription was then cascade-cleaned and final residue counts were zero. Candidate source acknowledged the same legacy checkout as retired with no database or provider write. No app was deployed to the child, so no delayed event or public request reached it. |
| Restore-control checkpoint | Under separate exact approval, the isolated child created two persistent synthetic controls through the same-origin production registration route with every outbound/provider mode disabled. Exact counts are two users, two valid sessions, and two unexpired verification tokens; every checked attributable provider/content/request table and the global deletion-cleanup queue remain zero. Fixture-label hash `add96da1ce8060a05a9bbd8fa33a7315c45918f6a9fe49a06fabda6404becfc9`; survivor snapshot hash `e2745437c5d580d256871c3d22e4e24c7f3a14c28dc4d4619c26e449402d63f6`; `T-pre = 2026-09-13T22:26:52.250Z`. Raw locators remain only in a mode-`0600` `/private/tmp` file with no DSN. No deletion or comparison branch/view occurred. |
| Discrepancy/recovery decision | No migration, catalog, checksum, aggregate, smoke, or cleanup discrepancy occurred. The expected legacy-source incompatibility was positively reproduced, so production Batch A remains no-go while `7ec68bc` can receive delayed/retried Team checkout events. The isolated evidence supports review of the compatible-source-first option but does not approve it; choose and separately approve either that sequence or complete checkout/webhook quiescence plus delayed-event reconciliation. Recovery/restore phases, runner timeout propagation, and fresh production evidence also remain open. |

Never place a DSN, password, token, cookie, user/account/email value, row payload, provider transaction ID, IP address, private case ID, or unrelated customer record in this packet or other durable evidence. The sole temporary exception is the mode-`0600` Phase 2 control-locator file required to address the same two synthetic accounts during Phases 3–5; it must contain no DSN and must be destroyed during separately approved Phase 6 cleanup.

## Separate Later Gates

- Batch B: matching default-off source deployment after verifier/security, recovery, and privacy-operations prerequisites.
- Persistent restore-control creation, destructive synthetic deletion, historical comparison branches/views, and temporary-resource cleanup are separately approved steps. The completed compatibility fixture was temporary and is not a persistent restore control.
- The production compatibility sequence—minimal source deployment or legacy checkout/webhook quiescence plus delayed-event reconciliation—is a separate decision before Batch A.
- Batch C: cleanup secret, scheduler, and no-payload monitoring.
- Batch D: non-destructive live schema/runtime verification.
- Later separately approved isolated deletion, provider, concurrency, retention, signed-device, App Privacy, TestFlight, submission, and release gates.

See the [production privacy/deletion approval packet](production-privacy-deletion-approval-packet-2026-09-11.md), [restore-drill runbook](neon-constrained-restore-drill-runbook-2026-09-12.md), and [privacy operations runbook](privacy-operations-single-owner-contingency-2026-09-13.md) for the surrounding boundaries.
