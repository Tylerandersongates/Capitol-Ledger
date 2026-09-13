# CapitolWonk Neon Constrained-Restore-Floor Drill Runbook — September 12, 2026

Status: **restore-floor policy, Phase 1, and Phase 2 are verified complete; the drill is stopped at the destructive Phase 3 approval boundary.** Tyler approved the constrained restore floor, the original isolated child/read-only reconciliation, a separately scoped replacement-child migration and compatibility drill, and then the persistent branch-only restore controls. CapitolWonk must never resume traffic from a database point earlier than the newest verified completed account deletion. If the newest trustworthy deletion watermark cannot be obtained or preserved for comparison, service remains offline. The replacement child `phase2-five-migration-20260913` holds the reviewed five migrations, clean preflight/postflight evidence, zero pending migrations, unchanged protected aggregates, and the two isolated controls required below. No synthetic account deletion, historical comparison branch/view, production migration, production restore/reset, traffic switch, source deployment, or child cleanup has occurred.

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

Before execution, obtain one exact approval covering temporary branch creation, branch-only schema migration if required, branch-only synthetic records, and aggregate-only queries. The September 13 replacement-child approval covered the five migrations and a temporary compatibility fixture, not the two persistent restore controls. Obtain a fresh exact approval before creating those controls. Obtain a separate action-time approval before deleting the temporary branches. The destructive synthetic account deletion also requires its own action-time approval and an assigned branch-only account.

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

The five-migration/schema component is complete on the replacement isolated child. Under the September 13 migration-only approval, the exact five-item sequence passed corrected preflight, applied once in 6 seconds, passed postflight twice, left every protected aggregate unchanged, and produced zero pending migrations. The exact production-source compatibility reproduction used one temporary user/subscription, made zero provider calls, and left zero fixture residue. Full sanitized evidence is recorded in the [five-migration promotion packet](production-five-migration-promotion-packet-2026-09-13.md).

After fresh exact approval for persistent branch-only records, create two synthetic, uniquely marked accounts on that child only:

- **deletion marker:** assigned solely to the destructive drill; and
- **survivor control:** proves unrelated branch data remains present.

Use a non-routable/test email domain and no real person data. Disable every delivery/provider mode so account setup cannot send mail or trigger external work. Record fixture hashes or labels only; do not put the synthetic identifiers in durable repository evidence.

For the approved operation, generate both account IDs, emails, session tokens, and fixture label in memory. Persist the raw locators only in a mode-`0600` temporary file under `/private/tmp` because later phases must address the same controls; never print the file or copy it into the repository. Create both accounts through the same-origin `POST /api/auth/register` production-auth path on the isolated child with auth-email delivery disabled. Retain one valid session and its normal verification token for each control, but do not expose the returned verification links. Create no subscription, workspace, invitation, contact, petition, Apple, Stripe, webhook, or outbound-delivery row. Verify by aggregate/boolean queries only that both controls, the two expected sessions, and the two expected verification tokens exist; that all provider/cleanup aggregates attributable to the controls are zero; and that the survivor snapshot is stable. Then record `T-pre` in UTC. Stop without invoking deletion.

The exact deletion step should exercise the HTTP `POST /api/account/deletion-request` route—not a hand-written SQL delete or transaction-only shortcut—using the isolated deletion marker's session cookie, same-origin request, body `{"confirmation":"DELETE","subscriptionAcknowledged":true}`, `ACCOUNT_DELETION_ENABLED=true`, and every unrelated feature/provider credential unset. The local app/harness must target only the direct child endpoint. This route invocation remains destructive and is not authorized by approval to create the controls.

### Phase 2 control evidence — September 13, 2026

Tyler approved the exact next action in the controlling Codex task: on isolated child `phase2-five-migration-20260913` only, create the deletion-marker and survivor controls with every outbound provider disabled; retain raw locators only in a mode-`0600` temporary file; verify aggregate state; record `T-pre`; and stop before deletion, comparison branches, provider calls, production changes, or child cleanup.

The first one-shot runner invocation stopped before its target guard or any database action because the bundled pnpm 11 wrapper rejected the repository's existing pnpm 9 install state and attempted dependency reconciliation. It created no control file, changed no dependency, and cleared the in-memory credential and clipboard. The corrected runner bypassed that wrapper and invoked the already-installed Prisma 5.22 and Next 15.5.25 executables directly.

The successful action used the direct child endpoint and literal database `Capitol%20Ledger`. The target guard and Prisma 5.22 migration status passed both before and after, with 17 repository migrations and the schema up to date. Both controls were created through the same-origin `POST /api/auth/register` production-auth path while auth-email delivery and every available provider credential/mode were unset or disabled. The route returned the non-delivery `manual_demo` mode and exposed no verification link. The local harness then stopped.

Aggregate/boolean verification found exactly two synthetic users, two valid sessions, and two unexpired verification tokens. It found zero attributable account subscriptions, App Store states/receipts, Team workspaces/members/invites/pauses, official-contact messages, petition signatures, privacy requests, and account-deletion requests; the global deletion-cleanup-job count remained zero. Fixture-label hash `add96da1ce8060a05a9bbd8fa33a7315c45918f6a9fe49a06fabda6404becfc9` and survivor snapshot hash `e2745437c5d580d256871c3d22e4e24c7f3a14c28dc4d4619c26e449402d63f6` identify the controls without revealing either account. The database-recorded point is **`T-pre = 2026-09-13T22:26:52.250Z`**.

The raw control locators exist only at `/private/tmp/codex-neon-restore-controls-20260913.json`, permission mode `0600`; the file contains no database URL. The sanitized result is `/private/tmp/codex-neon-restore-controls-result.json`, also mode `0600`. The clipboard was cleared, the one-shot scripts and server log were removed, the local port was closed, and no `.env` file was created or downloaded. Phase 2 stopped at this boundary until Tyler later supplied the separate Phase 3 action-time approval recorded below.

### Phase 3: produce pre- and post-deletion points

1. Record the pre-deletion point `T-pre` after both controls are committed.
2. Under separate action-time approval, invoke the exact in-app deletion flow against the deletion marker on the isolated branch.
3. Verify the explicit completion receipt, account/session/linked-row absence, deidentified resolved request, survivor presence, and cleanup-job state using the deletion runbook.
4. Record the newest qualifying deletion watermark `T-delete` and a later stable point `T-post`.
5. Preserve the aggregate watermark comparison outside the branches before creating any historical comparison view. The record must not contain an identifier for the deleted fixture.

### Phase 3 deletion evidence — September 13, 2026

Tyler separately confirmed the destructive Phase 3 action in the controlling Codex task. The authorization covered only the synthetic deletion marker on isolated child `phase2-five-migration-20260913`: invoke the exact deletion HTTP route once, verify completion and survivor invariants, record `T-delete` and `T-post`, then stop before comparison branches/views or child cleanup. It did not authorize any production action, provider call, source deployment, merge, comparison resource, or cleanup.

The first corrected harness attempt stopped before the route because it interpreted the Phase 2 count of two synthetic controls as a global user total. A read-only diagnosis established that the isolated child also retained the expected parent snapshot: 86 global users, 3 sessions, and 85 verification tokens immediately before deletion, of which exactly two users, two sessions, and two verification tokens were the synthetic controls. The control records were intact, while account-deletion requests and cleanup jobs remained globally zero. The harness was corrected to preserve those inherited rows by exact before/after deltas and to require that the deletion marker had no other attributable content, subscription, provider, request, or cleanup row. No POST or deletion occurred during the stopped attempt or diagnosis.

The successful one-shot run targeted only the direct child endpoint and literal database `Capitol%20Ledger`. The fail-closed target guard and Prisma 5.22 status passed before and after; all 17 migrations remained current. A local production build invoked same-origin `POST /api/account/deletion-request` exactly once using body `{"confirmation":"DELETE","subscriptionAcknowledged":true}` and the synthetic deletion-marker session. `ACCOUNT_DELETION_ENABLED=true` was set only for that local process. Auth-email delivery, privacy intake, retention, weekly delivery, Apple, Stripe, webhooks, Redis, OpenAI, Sentry, and other provider credentials/modes were unset or disabled.

The HTTP route returned its explicit completed/resolved receipt. Postflight found the deletion marker absent by ID and normalized email; its session and verification token were gone; all checked linked/content/provider/request rows attributable to it were zero; and the completion receipt was resolved, deidentified, and timestamp-consistent. The global changes were exactly one user, one session, and one verification token removed and one account-deletion request added: 86/3/85/0 before versus 85/2/84/1 after. Exactly one qualifying deidentified resolved watermark exists, and global deletion-cleanup jobs remained zero, so no provider cleanup was queued or called. The survivor remained present with one valid session and one unexpired verification token, and its postflight hash exactly matched `e2745437c5d580d256871c3d22e4e24c7f3a14c28dc4d4619c26e449402d63f6`.

The preserved time relation is **`T-pre = 2026-09-13T22:26:52.250Z < T-delete = 2026-09-13T22:50:14.926Z < T-post = 2026-09-13T22:50:20.969Z`**. The sanitized result remains only in mode-`0600` temporary storage; raw account/session/request locators remain excluded from repository evidence. The clipboard was cleared, no `.env` was created or downloaded, and the local server was stopped. Phase 3 is complete. Stop here pending separate action-time approval for the Phase 4/5 historical comparison branches/views; temporary-child cleanup remains a still-later, separately approved Phase 6 action.

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

### Phase 4/5 comparison evidence — September 13, 2026

Tyler separately approved the Phase 4/5 comparison in the controlling Codex task. The scope was limited to read-only historical inspection of isolated child `phase2-five-migration-20260913` at the preserved `T-pre` and `T-post`, sanitized evidence, and packet updates. It did not authorize a restore, traffic switch, production access, provider call, persistent comparison branch, or cleanup.

Neon's SQL Editor Time Travel UI accepted the exact timestamps but its current database selector double-decoded the literal application database name `Capitol%20Ledger` into the nonexistent spaced name. The failed selector attempts did not query the application database or create a persistent branch. After Tyler authorized the Neon CLI OAuth prompt, the official CLI created timestamp-scoped ephemeral connections directly to the literal database and ran only aggregate `SELECT` statements plus the fail-closed postflight in a read-only transaction. The CLI credential and connection material remained in mode-`0600` temporary storage during the comparison and were removed immediately afterward; no `.env` was created or downloaded.

At **`T-pre = 2026-09-13T22:26:52.250Z`**, the validator returned **`REJECT`**. It observed two fixture-window users, two sessions, two verification tokens, no deletion receipt or watermark, and global totals of 86 users, 3 sessions, 85 verification tokens, and 0 deletion requests. Both opaque fixture snapshot hashes were present. The unmodified full five-migration postflight exited 0, reached its rollback, and emitted no `STOP` or error.

At **`T-post = 2026-09-13T22:50:20.969Z`**, after **`T-delete = 2026-09-13T22:50:14.926Z`**, the validator returned **`ELIGIBLE FOR FURTHER RECOVERY REVIEW`**. It observed one fixture-window user, session, and verification token; zero attributable linked rows; exactly one deidentified resolved completion at `T-delete`; one qualifying watermark; global totals of 85 users, 2 sessions, 84 verification tokens, and 1 deletion request; and zero cleanup jobs. The surviving snapshot hash `de4eec4d3a72a1090f9d15a9b0ad9d469ba1eced8df256730974db6d3920dffb` exactly matched one of the two `T-pre` hashes. The full postflight again exited 0 and reached rollback after the sole expected-state adjustment from zero to one `AccountDeletionRequest` for the resolved watermark.

Both historical points proved PostgreSQL 17, `public`, 33 public base tables, 18 migration-history rows comprising 17 successes and one resolved rollback, and identical protected totals: 564 members, 17,941 bills, 1,515 votes, 365,830 member votes, 7 petition signatures, 2 Team pauses, and zero official contacts, App Store states/receipts, or privacy requests. No production or application traffic was sent, no provider was invoked, and no persistent comparison resource requires cleanup. The original isolated child and protected raw control file remain for the separately approved Phase 6 cleanup.

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

Current result: **Phases 1–5 are complete; the drill is stopped at the separately approved destructive Phase 6 cleanup boundary.** The replacement child `phase2-five-migration-20260913` was derived from protected `production`, uses literal application database `Capitol%20Ledger`, expires automatically on September 14, 2026 at 14:04:45 PDT, and has no attached application traffic or outbound integration. Corrected preflight, all five migrations, full postflight, application reads, no-provider compatibility reproduction, persistent-control creation, the exact deletion route, and the two historical comparison gates passed. The pre-deletion point returned `REJECT`; the post-deletion point returned `ELIGIBLE FOR FURTHER RECOVERY REVIEW`; the survivor was unchanged; and schema, migration history, cleanup state, and protected aggregates matched. No restore, traffic switch, production action, provider call, or persistent comparison branch occurred. The isolated child and mode-`0600` raw control file remain until Phase 6 cleanup receives separate explicit approval. Production remains untouched and protected.
