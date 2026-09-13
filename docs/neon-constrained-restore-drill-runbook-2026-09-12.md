# CapitolWonk Neon Constrained-Restore-Floor Drill Runbook — September 12, 2026

Status: **restore-floor policy, Phase 1 branch/read-only execution, automatic child cleanup, final production-target reconciliation, and empty-database hygiene are verified complete.** Tyler approved the constrained restore floor, one isolated child branch, the read-only deployment-target reconciliation, and aggregate-only checks on September 12. CapitolWonk must never resume traffic from a database point earlier than the newest verified completed account deletion. If the newest trustworthy deletion watermark cannot be obtained or preserved for comparison, service remains offline. Phase 1 found no completed-deletion watermark because the deletion-request table has zero rows. On September 13, Neon showed only the protected `production` branch, confirming the temporary child and its compute expired automatically. A final read-only dependency check verified that literal `Capitol%20Ledger` holds the 29-table application schema and receives production `Bill`, `Vote`, and `MemberVote` reads, while spaced-name `Capitol Ledger` had zero public tables and no application-query dependency. After separate exact confirmation, only the empty 7344 kB spaced-name database was permanently deleted. Neon now retains `neondb` and the literal application database `Capitol%20Ledger`; the post-delete production read smoke passed. No branch-only migration, fixture, synthetic deletion, restore/reset, traffic switch, credential creation/reset/persistence, or application-row write occurred.

The intended Neon project is displayed as `CapitolWonk`, with permanent project ID recorded separately in the provider console, AWS US West 2 (Oregon), PostgreSQL 17, a seven-day history window, and a protected default `production` branch. The protected status blocks reset/deletion of `production`, deletion of its compute, deletion of the project, and inactivity archiving; it does not prove that an older restore point is safe to serve. Current provider evidence is in the [backup/PITR checklist](backup-pitr-provider-retention-evidence-2026-09-11.md).

## Approved Policy

The production recovery rule is:

1. Disable public/application traffic before evaluating a restore.
2. Obtain the newest trustworthy completed-deletion watermark from the newest recoverable state, without modifying production.
3. Reject every proposed restore point earlier than that watermark.
4. Validate an eligible point on an isolated branch before any production switch.
5. Repeat the watermark comparison immediately before a separately approved traffic switch.
6. If the newest trustworthy state or watermark is unavailable, contradictory, or not preserved through the incident, fail closed and keep service offline.

This policy intentionally gives up recovery from otherwise healthy points that predate the latest verified deletion. It uses no external per-user tombstone and therefore cannot replay individual deletions when the newest watermark is lost. Restoring earlier than the floor would require a separately designed and approved external replay ledger.

## Deletion-Watermark Contract

The candidate schema's deidentified completion evidence is an `AccountDeletionRequest` row with all of the following:

- `status = 'resolved'`;
- `completedAt IS NOT NULL`; and
- `userId IS NULL` after the account is removed.

The drill may compute only aggregate/deidentified results. The operational watermark is the maximum qualifying `completedAt`; evidence must record only the aggregate qualifying-row count, the maximum timestamp needed for the comparison, and the final before/after relationship. Do not export request IDs, user IDs, emails, cleanup payloads, tokens, JWS values, provider identifiers, free-form content, or row-level records.

If the qualifying count is zero, that result is usable only when the intended target, schema, and query are verified and there is no contradictory deletion evidence. Record `no completed-deletion watermark present`; do not fabricate a timestamp. If the table is absent because pending migrations have not been applied to the isolated drill branch, the watermark gate is **not passed**.

## Drill Topology

Use only branches derived inside the same Neon project. Never reset or unprotect `production`.

1. **Source branch:** protected `production`, read-only for the drill.
2. **Isolated working branch:** a temporary child created from current `production`, with no application traffic, scheduler, webhook, email, Apple notification, Stripe, Sentry-feedback, or other outbound integration attached.
3. **Pre-deletion comparison branch:** a temporary branch or time-travel view from the isolated working branch immediately before a synthetic deletion.
4. **Post-deletion comparison branch:** a temporary branch or time-travel view from the isolated working branch after the synthetic deletion and completion watermark.

Names must include `cw-restore-drill`, the UTC date, and a non-user random suffix. Do not use an email, account ID, case ID, or production identifier in a branch name. All branches remain inside Neon; no production data may be downloaded or copied to another provider.

## Preconditions And Stop Conditions

Before execution, obtain one exact approval covering temporary branch creation, branch-only schema migration if required, branch-only synthetic records, and aggregate-only queries. Obtain a separate action-time approval before deleting the temporary branches. The destructive synthetic account deletion also requires action-time approval and an assigned branch-only account.

Require and record:

- `CapitolWonk` project identity from non-secret console metadata;
- protected `production` marker and seven-day history setting;
- current source-candidate SHA, migration-file hashes, Node/pnpm versions, operator, UTC start time, and intended restore-point times;
- exact pending-migration allowlist on the isolated branch before any branch-only migration;
- zero outbound application/provider integrations on every drill branch;
- a branch connection supplied without printing, copying, or committing credentials; and
- an explicit cleanup owner and deadline.

Before any future Prisma status, migration, fixture, or restore query, run `pnpm run database-target:check` with the intended branch connection supplied only through `DATABASE_URL`. The guard must pass with the literal database name `Capitol%20Ledger`, schema `public`, and the `_prisma_migrations`, `User`, and `AccountDeletionRequest` control tables. A spaced name, missing table, missing connection, or query failure stops the action without printing connection details.

Stop immediately for the wrong project/region/branch, missing protection, a history window below seven days, unexpected migration state, any failed migration, a non-isolated deployment, outbound delivery capability, customer-data export, row-level evidence output, inability to observe restore-point time precisely, or any temptation to operate directly on `production`.

## Execution Sequence — Separately Approved Later

### Phase 1: create and quarantine the working branch

1. Record production branch metadata and current time without querying row data.
2. Create one temporary isolated child branch from current `production`.
3. Do not add a compute unless the approved query/migration path requires it. If a compute is needed, use the smallest configuration, retain scale-to-zero, and never attach production environment variables.
4. Verify the branch has no external app deployment, scheduler, notification URL, email/webhook delivery, or live provider credentials.
5. Run read-only migration status. If the current reviewed migration allowlist remains pending, stop for the branch-only migration approval boundary; do not silently apply it.

### Phase 1 evidence — September 12, 2026

Tyler approved Phase 1 and Codex executed it through the authenticated Neon console. The console created `cw-restore-drill-20260912-9f4c` as a child of protected `production` from the current point in time. Neon displayed creation at `2026-09-12 10:57:51` and automatic expiry at `2026-09-13 10:57:50`; the console did not surface a time-zone label for those values. The branch remained inside `CapitolWonk`, used the existing PostgreSQL 17 project, and has no application deployment, scheduler, webhook, email, Apple, Stripe, Sentry-feedback, or other outbound integration attached. The console provisioned its default scale-to-zero compute; no credential was copied or recorded.

The approved aggregate/read-only query first stopped with SQLSTATE `42P01` because the selected `Capitol Ledger` database had no `_prisma_migrations` table. A catalog-only database-size inventory then exposed the naming trap: `Capitol Ledger` was only 7344 kB, while a distinct database whose literal name is `Capitol%20Ledger` was 139 MB. `neondb` was 7744 kB and contained only nine Neon-managed `neon_auth` tables outside its empty `public` schema; `postgres` was 7696 kB. Neon's SQL editor behaved as if it decoded the literal `%20` name into a space even when the selector displayed `Capitol%20Ledger`, so its earlier results had queried the empty spaced-name database twice.

Neon's authenticated Tables surface accepted the correctly escaped literal database name and displayed the expected `public` application schema, including `_prisma_migrations`, `User`, and `AccountDeletionRequest`. Migration metadata showed 13 history records and 12 finished migrations. It included the already-documented rolled-back attempt followed by a successful application of `20260618162000_account_gamification_streak_date`; no new failed migration was identified. Exactly these five local migrations remain pending: `20260910150000_account_deletion_integrity`, `20260910151000_account_deletion_cleanup_outbox`, `20260910152000_team_subscription_pause_workspace_integrity`, `20260911110000_app_store_server_state`, and `20260912120000_privacy_request_intake`. No migration was applied.

The console's protected `production` compute exposes endpoint label `ep-dry-thunder-aktc1o54`, exactly matching the non-secret endpoint label in the prior sanitized preflight. Vercel confirms one write-only secret named `DATABASE_URL` scoped to Production and Preview and last updated May 28, but its saved value cannot be revealed or sanitized after creation. The main checkout's local file is not authoritative for Vercel. Its raw `%20` path is nevertheless the Prisma-compatible encoding of the literal database name; Neon's SQL editor and Connect display apply different encoding behavior.

With Tyler's follow-up approval, the existing child Connect string was revealed only inside the authenticated browser and passed through a one-time localhost process without printing, persisting, or logging it. The Connect display's `%2520` database path caused Prisma to report a nonexistent database; correcting only that in-memory path to `%20` reached the literal `Capitol%20Ledger` database. The temporary relay was deleted, its browser tab was closed, the connection UI was hidden, and the browser clipboard was cleared. No credential was created, reset, rotated, committed, or retained.

The aggregate-only result verified `current_database() = 'Capitol%20Ledger'`, `current_schema() = 'public'`, 29 public tables, and the presence of `_prisma_migrations`, `User`, and `AccountDeletionRequest`. `AccountDeletionRequest` contained zero total rows: zero open, zero resolved, zero completed-resolved, zero qualifying deidentified completions, and zero completed rows still linked to a user. The maximum qualifying `completedAt` was null. Under the approved contract, record **`no completed-deletion watermark present`**; there is no contradictory deletion evidence in this restored baseline.

Phase 1 is complete. The drill stops at the fresh five-migration/fixture approval boundary before any migration, row write, synthetic deletion, or provider effect. On September 13 after the displayed deadline, Neon showed `1 / 5000 Branch` and listed only protected default `production`; the temporary child and its compute had expired automatically. No manual cleanup occurred.

Production database hygiene is complete for the approved scope. The September 13 follow-up first verified that only protected `production` remained. The final read-only target check then confirmed 29 application tables plus production `Bill`, `Vote`, and `MemberVote` reads on literal `Capitol%20Ledger`; spaced-name `Capitol Ledger` exposed zero public tables, only console catalog/introspection query fingerprints, and no tracked runtime reference outside the fail-closed guard's negative self-test. Tyler separately confirmed permanent deletion of exactly `Capitol Ledger`; Neon's confirmation named that database and warned the action could not be undone. After deletion, the inventory contains only retained `neondb` and application database `Capitol%20Ledger`, and the production read smoke returned normally. The removed empty database was 7344 kB, so the cleanup primarily removes naming ambiguity rather than materially changing storage cost. Do not combine any later cleanup with a migration or restore action.

### Phase 2: establish branch-only controls

After a fresh exact branch-only migration approval, apply only the reviewed five-item sequence recorded above to the isolated branch and verify schema/postflight. Create two synthetic, uniquely marked accounts on that branch only:

- **deletion marker:** assigned solely to the destructive drill; and
- **survivor control:** proves unrelated branch data remains present.

Use a non-routable/test email domain and no real person data. Disable every delivery/provider mode so account setup cannot send mail or trigger external work. Record fixture hashes or labels only; do not put the synthetic identifiers in durable repository evidence.

### Phase 3: produce pre- and post-deletion points

1. Record the pre-deletion point `T-pre` after both controls are committed.
2. Under separate action-time approval, invoke the exact in-app deletion flow against the deletion marker on the isolated branch.
3. Verify the explicit completion receipt, account/session/linked-row absence, deidentified resolved request, survivor presence, and cleanup-job state using the deletion runbook.
4. Record the newest qualifying deletion watermark `T-delete` and a later stable point `T-post`.
5. Preserve the aggregate watermark comparison outside the branches before creating any historical comparison view. The record must not contain an identifier for the deleted fixture.

### Phase 4: prove the floor rejects unsafe history

Create the pre-deletion comparison branch/view at `T-pre`. It is expected to contain the deletion marker because the point predates `T-delete`. The floor validator must return **REJECT** solely because `T-pre < T-delete`; no traffic may target this branch. Record only:

- comparison result `REJECT`;
- proposed point is earlier than the preserved watermark;
- deletion marker would be present; and
- survivor control is present.

Do not attempt to repair the rejected point by manually deleting rows. That would be a replay-ledger design, not the approved constrained floor.

### Phase 5: prove an eligible point can pass

Create the post-deletion comparison branch/view at `T-post`. Require all of the following before returning **ELIGIBLE FOR FURTHER RECOVERY REVIEW**:

- `T-post >= T-delete`;
- deletion marker absent by user ID, normalized email, sender key, Team membership/invite, session/token, saved/activity, subscription, contact, petition, and related cleanup references as applicable;
- deidentified resolved deletion completion present;
- survivor control present and unchanged;
- expected migration history/schema/index/foreign-key state;
- aggregate cleanup jobs reconciled, with no unexplained stuck/failed job;
- unrelated public catalog aggregate checks unchanged; and
- no outbound provider effect or application traffic occurred.

Passing this phase does not authorize a production restore or traffic switch. It proves only that the floor can reject an older point and admit a later point to the rest of recovery review.

### Phase 6: cleanup

After evidence review and separate destructive action-time approval, delete only the exact temporary drill branches/computes. Never unprotect or delete `production`. Verify the branch list returns to the pre-drill inventory, no drill deployment/configuration remains, and billing/usage exposes no unexpected persistent resource.

If cleanup cannot be completed, record the exact non-secret resource name, owner, cost exposure, and next action. Do not mark the drill complete while a temporary branch or compute remains.

## Evidence Template

| Field | Allowed record |
| --- | --- |
| Project | Display name, region, Postgres version, boolean ID match |
| Production controls | Protected yes/no; history-window duration |
| Candidate | Exact Git SHA and migration hashes |
| Drill resources | Sanitized branch names and creation/deletion times |
| Watermark | Qualifying aggregate count; newest completion time or `none`; no row IDs |
| Unsafe comparison | Proposed time relation; `REJECT`; marker-presence boolean |
| Eligible comparison | Proposed time relation; aggregate schema/data checks; marker-absence and survivor-presence booleans |
| Isolation | No production traffic; no outbound providers; no credentials in evidence |
| Cleanup | Branch/compute inventory returned to baseline |
| Operator/reviewer | Named humans and UTC timestamps |

## Completion Criteria

The drill closes only when an independently reviewed evidence record proves both the unsafe rejection and eligible-point checks, every temporary resource is removed, no production write/traffic switch occurred, and the project still shows protected `production` plus seven-day history. A successful drill does not authorize Batch A; it satisfies one prerequisite for a fresh production preflight and separate migration decision.

Current result: **Phase 1, automatic branch cleanup, final production-target reconciliation, and empty-database hygiene complete; drill open at the Phase 2 approval boundary.** The application database, five-item pending migration set, and `no completed-deletion watermark present` baseline are verified. The temporary branch and compute expired automatically on September 13. Protected production remains with retained `neondb` and application database `Capitol%20Ledger`; the unused zero-table spaced-name database was permanently removed under separate exact confirmation, and post-delete production smoke passed. Phases 2–5 were not authorized or attempted.
