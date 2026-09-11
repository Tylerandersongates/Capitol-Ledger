# CapitolWonk Production Privacy/Deletion Approval Packet — September 11, 2026

Status: **reconciled to the uncommitted September 11 working candidate; no production action is authorized.** The production migration-history and aggregate migration-safety preflight were completed read-only earlier on September 11. The working candidate has changed since that preflight and since the last committed/CI/Preview evidence. No migration, deployment, protected configuration, account deletion, provider mutation, App Store Connect change, signed build, upload, distribution, submission, or release occurred.

This packet turns the remaining privacy/account-deletion work into discrete approval batches. Approval of one batch does not authorize any later batch. The Apple signing freeze in [the September 10 reconciliation](apple-signing-reconciliation-2026-09-10.md) remains in force.

## Current Working Candidate And Historical Evidence

| Item | Recorded evidence |
| --- | --- |
| Current working candidate | **Uncommitted and not frozen.** It is a working-tree delta on `codex/logo-refresh-sept10` that adds the fourth migration `20260911110000_app_store_server_state`, Apple server-state/notification reconciliation, Apple/Team safety work, and default-off deletion and privacy-retention gates. The pnpm 9 lock now forces Next's PostCSS to `8.5.25`; September 11 production/full working-tree audits both report **no known vulnerabilities**. Production transitive `jsrsasign@11.1.5`, used through Apple's official server library for X.509/OCSP, has no current advisory but is deprecated/unmaintained and still requires upstream monitoring/upgrade plus owner risk acceptance before launch. This is not frozen-candidate closure: the candidate has no SHA, exact-head CI, matching Preview, deployment, or device/sandbox evidence. See the [September 11 dependency note](dependency-security-audit-2026-09-11.md). |
| Historical reviewed non-production source candidate | `a6cb1da9971722251c47561105c807ea0a6a5238` on `codex/logo-refresh-sept10`; payload commit `871ba4e03264a943abda3979d615895b3e767df6` |
| Current production source | `main` at `7ec68bcf142d6defe865c12959b0f9a84fce72d5` |
| Historical exact-head CI | [GitHub Actions run 34557134361](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34557134361), passed for `a6cb1da`; **stale for the working candidate** |
| Historical matching Preview | [Vercel deployment `6mKbaWGJ2jdRDbNRaB1K8ZMYKh8L`](https://vercel.com/capitolwonkce/project-qosv1/6mKbaWGJ2jdRDbNRaB1K8ZMYKh8L), Ready for `a6cb1da`; **stale for the working candidate** |
| Historical authenticated Preview smoke | `/brief`, `/privacy`, and `/account-deleted` passed for `a6cb1da`; **stale for the working candidate** |
| Detailed functional/privacy contract | [Account-deletion runbook](account-deletion-runbook-2026-09-10.md), [provisional App Privacy correction](app-store-privacy-correction-2026-09-10.md), and [backup/PITR and provider-retention evidence checklist](backup-pitr-provider-retention-evidence-2026-09-11.md) |
| Apple lifecycle execution plan | [September 11 App Store sandbox QA matrix](app-store-sandbox-qa-matrix-2026-09-11.md); prepared only, with no sandbox/device result |

The working tree changes source, dependencies, the lockfile, migrations, readiness checks, and native/billing behavior after `a6cb1da`. The earlier CI, Preview, smoke, and `f4f04de` dependency-audit closure remain valid historical evidence only and cannot clear the current candidate. Today's production and full working-tree audits both report no known vulnerabilities after the PostCSS override, and CI plus the strict candidate command are configured to run both audits. That is preliminary working-tree evidence, not approval. Before an approval request, freeze one commit and produce a clean frozen-candidate audit together with frozen install, strict checks, exact-head CI, matching Preview, and proportionate smoke; separately close the unmaintained `jsrsasign@11.1.5` upstream-monitoring/upgrade and owner-acceptance gate. Local fixture/check results are preparation, not a substitute for that candidate evidence.

## Read-Only Production Preflight Result

The check used the existing ignored connection that the September 3 release handoff identifies as the intended production Neon database. The local connection file predates that release and had not changed since it was used there. No connection string or protected value was printed, copied into this worktree, committed, or included in evidence.

At the time of the read-only preflight, `prisma migrate status` found 15 repository migrations and reported exactly these three as unapplied:

1. `20260910150000_account_deletion_integrity`
2. `20260910151000_account_deletion_cleanup_outbox`
3. `20260910152000_team_subscription_pause_workspace_integrity`

`20260718154000_account_deletion_requests` was already applied. The production history also contained one rolled-back record followed by a successful applied record for the older `20260618162000_account_gamification_streak_date` migration. Prisma reported no current failed migration at that time; the then-pending set was the three-item allowlist above. This command reconciles migration history, not arbitrary live-schema drift, so schema definitions remain a post-migration verification gate.

The working candidate subsequently added `20260911110000_app_store_server_state`. Assuming production remained unchanged—as the no-action boundary records—the candidate-to-production pending set is now **four migrations**, with the App Store state migration fourth. That is a source/preflight reconciliation, not a fresh production status result. Repeat `prisma migrate status` and the aggregate/schema checks before any Batch A request; any result other than the exact four-item set below is a stop condition.

Aggregate-only catalog/data checks returned this snapshot:

| Check | September 11 result |
| --- | ---: |
| `AccountDeletionRequest` table | Present |
| `AccountDeletionCleanupJob` table | Absent, as expected before migration `20260910151000` |
| `OfficialContactMessage` table | Present |
| `PetitionSignature` table | Present |
| `TeamSubscriptionPause` table | Present |
| Official-contact rows whose non-null user is missing | 0 |
| Petition rows whose user is missing | 0 |
| Team-pause rows whose user is missing | 0 |
| Team-pause rows total | 2 |
| Team-pause rows using a known empty/owner-upgrade sentinel | 0 |
| Team-pause rows with an unexpected workspace orphan | 0 |
| Team-pause rows with null workspace | 0 |
| Current `TeamSubscriptionPause.workspaceId` nullability | Not nullable |

These counts are a point-in-time read, not standing authorization. Repeat them immediately before any migration. A changed pending set, nonzero orphan count, new sentinel count, incomplete migration, unexpected table shape, or uncertain database target is a stop condition requiring a new review.

## Migration Decision And Required Order

The older deletion-request migration is already present. If production migration is later approved after a fresh preflight, the exact allowed order for the current working candidate is:

1. `20260910150000_account_deletion_integrity` — brings the three runtime-managed tables under durable schema management, removes account-user orphans, establishes user cascades, and creates the required indexes.
2. `20260910151000_account_deletion_cleanup_outbox` — creates the retryable cleanup table and its foreign key to the already-present `AccountDeletionRequest` table.
3. `20260910152000_team_subscription_pause_workspace_integrity` — makes `workspaceId` nullable for the owner-upgrade state, converts only the two named legacy sentinels, deliberately aborts on any other workspace orphan, and then adds the workspace cascade.
4. `20260911110000_app_store_server_state` — creates the account-bound canonical App Store state and hash-only/deidentifiable Notifications V2 receipt tables, including ownership constraints, status checks, indexes, and user deletion behavior.
5. Only after all four migrations and postflight checks pass may matching gated application source be deployed.

The migration command must be allowed to apply only this exact four-item pending set in lexical order. Do not rerun the already-applied deletion-request migration manually, edit `_prisma_migrations`, suppress the Team-pause migration's orphan exception, or deploy application code first.

## Approval Batches

### Activation sequencing — source controls implemented; approval/evidence still required before Batch B

The uncommitted working candidate now implements an exact, fail-closed `ACCOUNT_DELETION_ENABLED=true` opt-in. Missing or any other value hides the deletion controls and Settings/Support/Privacy entry points, skips the deletion-specific account lookup, and makes both deletion API methods return a no-store `503` before authentication, body parsing, or database work. It also implements a separate exact `CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED=true` opt-in; the scheduled retention sweep performs no reads or writes while off. Legacy `BetaFeedback` erasure requires the additional `CAPITOLWONK_LEGACY_FEEDBACK_RETENTION_ENABLED=true` switch.

This closes the source-design gap only. The gates are not committed, candidate-verified, approved, deployed, configured, or activated. Before requesting Batch B, freeze the candidate, produce fresh diff/dependency/CI/Preview/privacy/readiness evidence, and obtain approval for the exact default-off deployment and later activation sequence. Deletion and retention must remain unavailable until the live schema, authenticated cleanup worker, no-payload monitoring, provider-retention procedures, sandbox/device behavior where applicable, and truthful public copy are ready. Deployment approval is not activation approval.

### A. Production migrations — pending separate explicit approval

Immediately before action:

- identify the intended production project/database by non-secret metadata and satisfy the pre-migration read-only gates in the [backup/PITR and provider-retention checklist](backup-pitr-provider-retention-evidence-2026-09-11.md);
- repeat `prisma migrate status` and require the exact four-item pending allowlist;
- repeat the aggregate orphan/sentinel checks and require the September 11 result unless a changed count is separately explained and approved;
- verify the candidate migration files are byte-for-byte the reviewed versions; and
- record operator, time, candidate SHA, database environment, and approval without recording credentials.

If every gate passes, the proposed action is one production `prisma migrate deploy` from the frozen candidate. Postflight must show all four migrations applied and no other migration changed. Then verify table/column/index/foreign-key definitions, including both App Store state tables and their ownership/deidentification constraints; zero unexpected orphans; both existing Team-pause rows still present and workspace-valid; and unchanged non-account public catalog counts. This batch authorizes no application deployment, Apple notification activation, or account deletion.

### B. Matching production source deployment — pending separate explicit approval

Batch B is blocked until the uncommitted candidate is frozen, its `jsrsasign` maintenance-risk gate is closed, and the default-off activation sequence above is approved and evidenced. Only after Batch A passes, identify the exact production commit containing the reviewed payload and no unreviewed source or dependency changes. Require clean production/full frozen-candidate audits, fresh strict CI, a matching Preview, and release/readiness evidence; neither the `a6cb1da` artifacts nor the preliminary working-tree audits apply. Deploy through the existing controlled production path while deletion and retention remain unavailable, then perform non-destructive HTTP/visual smoke on `/brief`, `/privacy`, `/support`, `/settings`, and direct `/account-deleted`; verify private account APIs reject anonymous access and the destructive action cannot be invoked before activation approval. This batch authorizes no activation, protected task configuration, provider mutation, App Store change, Notifications V2 activation, or destructive QA.

### C. Cleanup task, scheduler, and no-payload monitoring — pending separate explicit approval

After matching gated source is live, while the destructive action remains unavailable:

- create a dedicated protected `ACCOUNT_DELETION_CLEANUP_SECRET`; never put it in source, URLs, logs, screenshots, or the evidence packet;
- configure an authenticated scheduler for `/api/tasks/account-deletion-cleanup` after confirming the current hosting plan supports the selected interval;
- target a run interval of no more than five minutes when the hosting plan permits it;
- prove missing/wrong credentials return `401`, and prove production fails closed if the secret is absent;
- expose only claimed/completed/failed counts plus aggregate pending/processing age and attempts—never job payloads or provider/account identifiers; and
- alert on repeated task failure, attempt count at or above 3, or an oldest due/processing job older than 15 minutes. Adjust those initial thresholds only through a recorded operational decision.

Before the first authenticated worker invocation, require a read-only count of zero unexpected jobs or an approved explanation of every aggregate job category. A worker call can claim and mutate jobs, so it is not part of the read-only preflight.

### D. Non-destructive production schema/runtime verification — pending separate explicit approval

Verify the live schema against `prisma/schema.prisma`, including user and workspace cascades, cleanup-job dedupe and status/availability indexes, nullable `workspaceId`, the cleanup-request cascade, App Store account-token/lineage uniqueness, notification UUID/hash/status constraints, and receipt deidentification behavior. Re-run `pnpm account-deletion:check`, strict TypeScript, ESLint, launch-copy checks, and the complete TestFlight/readiness set against the exact installed graph/source. Do not insert or alter a fixture under this batch.

### E. Disposable account-deletion QA — destructive; pending action-time approval and account assignment

Use only a uniquely marked disposable production-shaped account created for this test. Never use a maintainer, reviewer, subscriber, shared Team, or ordinary tester account. Follow the runbook's complete inventory and control-user procedure. Prove transaction rollback on a forced database failure, deletion of every linked account/email/sender-key row, deidentified completion audit, all-session and current-device clearing, unrelated-data preservation, explicit success-receipt behavior, ambiguous-result treatment, multi-tab fencing, pending-only job retention, successful-job erasure, interrupted-`processing` reclaim after the ten-minute threshold, and Apple billing separation.

This batch requires Tyler to approve the exact disposable account and action at execution time. Approval of the packet, migrations, deployment, or configuration is not approval to press **Permanently delete account**.

### F. Stripe test-mode and real-Postgres concurrency QA — pending separate explicit approval

With disposable test-mode resources only, verify active, terminal/missing, and transient cleanup outcomes; pagination and idempotent replay; timestamp-valid/expired webhooks; live-state reconciliation and stale-subscription rejection; deleted-user cleanup before acknowledgement; Team-member restoration or checkout-required fallback; pause/delete lock serialization; and provider compensation after a forced database-transaction failure. Do not use live charges, real customers, or production provider mutation.

### G. Physical-device and signed-candidate QA — blocked by T04

After Apple Support guidance is reconciled and Tyler approves one supported signing action, restore physical-device availability and execute the [App Store sandbox QA matrix](app-store-sandbox-qa-matrix-2026-09-11.md) on the exact signed TestFlight candidate. Verify the visible deletion contract, cookie/storage clearing, explicit receipt vs. ambiguous response, a second session, multi-tab behavior, delayed native StoreKit writer fencing, provider-authoritative Apple lifecycle, and Team transitions. The current Apple certificate/CSR/private-key/Keychain/profile/team/bundle/signing/device-state freeze remains unchanged until then. Source fixtures are not sandbox proof.

### H. Controlled activation, privacy publication, screenshots, and release decision — pending separate explicit approvals

Keep account deletion and the retention sweep unavailable until the applicable schema/runtime, cleanup task/monitor, disposable-account, provider/concurrency, signed-device, restore, retention, and public-copy gates have passed. Keep legacy-feedback erasure separately off until its private export and removal plan are approved. Generate and reconcile the aggregate privacy report from the exact Release archive; inspect representative sanitized Sentry event fields; verify final WKWebView, server, host-log, email, official-message, Stripe, Apple, and YouTube behavior; and close the [backup/PITR and provider-retention checklist](backup-pitr-provider-retention-evidence-2026-09-11.md). Resolve the documented Sentry individual-feedback-removal contradiction and obtain runtime proof for the source-level query/token scrubbing before publishing a removal claim. Present each exact activation plus truthful public-policy deployment as an action-time approval; visually verify afterward. Then present the final App Privacy matrix and exact App Store Connect changes for separate approval, publish only after approval, recapture the two listing screenshots without `CE`, and assemble the upload decision. A real YouTube player requires its own runtime privacy audit before enablement.

## Global Stop Conditions

Stop and preserve evidence without attempting an improvised repair if any of the following occurs:

- the database/project target cannot be proven, a protected value appears in output, or backup/PITR readiness is uncertain;
- matching source would expose account deletion before its approved feature/maintenance gate, cleanup worker, monitor, provider procedures, and truthful public copy are ready;
- the expected four-migration allowlist/order changes, a checksum or source graph differs, or Prisma reports drift/incomplete history;
- any preflight orphan/sentinel count differs from the reviewed snapshot without a separately approved explanation;
- a migration fails or the live schema/index/foreign-key postflight differs from the reviewed target;
- production smoke regresses auth, policy, deletion-result, Brief, or support behavior;
- the cleanup worker exposes payloads, cannot authenticate/fail closed, ages beyond threshold, or repeats an external effect;
- provider QA reaches a live customer/resource or requires an unapproved mutation;
- the assigned deletion account is not unquestionably disposable; or
- Apple signing/device work would cross the preserved T04 freeze.

Do not manually edit migration history, delete a pending cleanup job to clear an alert, reset a database, restore a backup, change provider records, or alter signing/App Store state under this packet. Diagnose read-only and return with a narrowly scoped recovery proposal.

## Evidence Required For Closure

- exact production commit/deployment and CI URLs;
- redacted migration preflight/deploy/postflight with the exact four migrations;
- schema/index/foreign-key and aggregate sentinel/orphan results;
- approved backup/PITR decision, isolated restore-drill result, provider-retention/removal register, Sentry-feedback resolution, and sensitive URL/log proof from the [retention checklist](backup-pitr-provider-retention-evidence-2026-09-11.md);
- cleanup-task authorization, schedule, no-payload monitor, retry/reclaim, and successful-job-erasure proof;
- disposable account/control-user database counts, rollback proof, receipt/ambiguity/session/storage/fence results;
- Stripe test-mode webhook, cleanup, idempotency, concurrency, and compensation evidence;
- exact signed build/device and App Privacy archive/runtime/provider reconciliation;
- final public-policy screenshots, App Store Connect preview/publication evidence, corrected listing screenshots, and the remaining-risk/go-no-go record.

## Approval Ledger

| Batch | Status |
| --- | --- |
| Read-only production migration-history and aggregate safety preflight | Complete September 11, 2026 |
| A — production migrations | Not authorized |
| Default-off deletion and retention source gates | Implemented only in the uncommitted working tree; not candidate-verified, approved, deployed, configured, or activated |
| B — gated production source deployment | Blocked by candidate freeze/evidence and activation-sequence approval; not authorized |
| C — protected cleanup task/scheduler/monitoring | Not authorized |
| D — post-deploy schema/runtime verification | Not authorized |
| E — disposable production-shaped account deletion | Not authorized |
| F — Stripe test-mode/real-Postgres concurrency QA | Not authorized |
| G — signed physical-device QA | Blocked by T04; not authorized |
| H — controlled deletion activation/privacy/screenshots/upload decision | Not authorized |
