# CapitolWonk Production Privacy/Deletion Approval Packet — September 11, 2026

Status: **reconciled through September 12; local source candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` supersedes the historical remote `3dbba3a` evidence boundary, and no production action is authorized.** Candidate branch `codex/sept12-privacy-neon-candidate` freezes the approved Option 1 source/schema/test work, fifth migration, and database-target guard. Its offline frozen install, production/full registry audits, local release-source suite, Prisma validation/generation, strict TypeScript, lint, and production build pass; the strict protected-runtime wrapper correctly fails because deployment/App Store values are absent. No new push, CI, or Preview exists, so all earlier remote evidence remains stale for this candidate. Separately, the approved Neon Phase 1 child/read-only check found the exact application schema in the literal `Capitol%20Ledger` database, verified the five-item pending migration set, and confirmed zero deletion-request rows with no completed-deletion watermark. Phase 1 passes; later drill phases and automatic cleanup remain open. No production migration, deployment, configuration, account deletion, restore, branch-only write, manual branch deletion, App Store Connect change, signed build, upload, distribution, submission, or release occurred.

This packet turns the remaining privacy/account-deletion work into discrete approval batches. Approval of one batch does not authorize any later batch. The Apple signing freeze in [the September 10 reconciliation](apple-signing-reconciliation-2026-09-10.md) remains in force.

## Current Working Candidate And Historical Evidence

| Item | Recorded evidence |
| --- | --- |
| Current local source candidate | `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` on `codex/sept12-privacy-neon-candidate`; frozen locally with no push, remote CI, Preview, deployment, migration, or activation. It preserves the locked dependency graph and adds the approved privacy intake, fifth migration, corrected copy/routing, account-deletion postcondition, and database-target guard. Offline frozen install, both registry-backed audits, local-preparation release-source checks, Prisma validation/generation, strict TypeScript, lint, production build, and prior gate-off HTTP smoke pass. The strict release wrapper remains blocked on absent protected runtime/App Store values. |
| Historical remote source candidate | `3dbba3a260b10924dff254deed7f65a5e392c239` below synchronized documentation checkpoint `cd094530efacdbc3507579a0b52414aa7369d826` on `codex/logo-refresh-sept10`; [exact-head CI `34668039916`](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34668039916), matching Ready Preview `6K9Xd24c4Pg4Nz1pRLorNzo6MxGb`, and recorded anonymous smoke are historical and stale for the current local candidate. |
| Historical reviewed non-production source candidate | `a6cb1da9971722251c47561105c807ea0a6a5238` on `codex/logo-refresh-sept10`; payload commit `871ba4e03264a943abda3979d615895b3e767df6` |
| Current production source | `main` at `7ec68bcf142d6defe865c12959b0f9a84fce72d5` |
| Historical exact-head CI | [GitHub Actions run 34557134361](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34557134361), passed for `a6cb1da`; **stale for the working candidate** |
| Historical matching Preview | [Vercel deployment `6mKbaWGJ2jdRDbNRaB1K8ZMYKh8L`](https://vercel.com/capitolwonkce/project-qosv1/6mKbaWGJ2jdRDbNRaB1K8ZMYKh8L), Ready for `a6cb1da`; **stale for the working candidate** |
| Historical authenticated Preview smoke | `/brief`, `/privacy`, and `/account-deleted` passed for `a6cb1da`; **stale for the working candidate** |
| Detailed functional/privacy contract | [Account-deletion runbook](account-deletion-runbook-2026-09-10.md), [provisional App Privacy correction](app-store-privacy-correction-2026-09-10.md), [September 12 privacy/assets preparation](app-privacy-release-assets-prep-2026-09-12.md), and [backup/PITR and provider-retention evidence checklist](backup-pitr-provider-retention-evidence-2026-09-11.md) |
| Apple lifecycle execution plan | [September 11 App Store sandbox QA matrix](app-store-sandbox-qa-matrix-2026-09-11.md); prepared only, with no sandbox/device result |

Candidate `bbe63e4` changes source, dependencies, the lockfile, migrations, readiness checks, native/billing behavior, and blank-account presentation after `a6cb1da`; `3dbba3a` changes only the four dead demo paths exposed by CI. Earlier `a6cb1da` and `f4f04de` evidence remains historical only. The exact source candidate has a clean isolated frozen install, no known production/full advisory findings, passing release-source/TypeScript/ESLint checks, normal Prisma generation, exact-head CI, matching Ready Vercel Preview, and recorded proportionate anonymous smoke. The local build-memory limitation is reconciled only as a constrained-host failure by the exact-SHA Vercel build. The September 12 provider pass verifies settings but not runtime/removal/restore behavior. Known Apple issue #447 means `jsrsasign@11.1.5` cannot be treated as maintenance-only acceptance; an official fix or separately approved reviewed patch/replacement is required. Local fixtures are preparation, not Apple sandbox or device proof.

## Read-Only Production Preflight Result

The check used the existing ignored connection that the September 3 release handoff identifies as the intended production Neon database. The local connection file predates that release and had not changed since it was used there. No connection string or protected value was printed, copied into this worktree, committed, or included in evidence.

The earlier read-only preflight found 15 repository migrations and exactly the three September 10 migrations unapplied:

1. `20260910150000_account_deletion_integrity`
2. `20260910151000_account_deletion_cleanup_outbox`
3. `20260910152000_team_subscription_pause_workspace_integrity`

`20260718154000_account_deletion_requests` was already applied. The production history also contained one rolled-back record followed by a successful applied record for the older `20260618162000_account_gamification_streak_date` migration. Prisma reported no current failed migration at that time; the then-pending set was the three-item allowlist above. This command reconciles migration history, not arbitrary live-schema drift, so schema definitions remain a post-migration verification gate.

The read-only preflight was repeated after exact candidate `bbe63e4` added `20260911110000_app_store_server_state`. Prisma found 16 repository migrations and reported exactly four unapplied migrations. Current candidate `92b61b9` adds `20260912120000_privacy_request_intake`, producing 17 repository migrations and the five-item pending set verified on the isolated Phase 1 child. The aggregate-only production checks matched the recorded snapshot: zero Official Contact, Petition, Team-pause user, or unexpected workspace orphans; two Team-pause rows; zero known sentinels; zero null workspaces; `AccountDeletionRequest` present; `AccountDeletionCleanupJob` absent; and `TeamSubscriptionPause.workspaceId` still non-nullable. Repeat migration status and every aggregate check immediately before any Batch A action; any changed result is a stop condition.

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

The older deletion-request migration is already present. If production migration is later approved after a fresh preflight, the exact allowed order for local candidate `92b61b9` is:

1. `20260910150000_account_deletion_integrity` — brings the three runtime-managed tables under durable schema management, removes account-user orphans, establishes user cascades, and creates the required indexes.
2. `20260910151000_account_deletion_cleanup_outbox` — creates the retryable cleanup table and its foreign key to the already-present `AccountDeletionRequest` table.
3. `20260910152000_team_subscription_pause_workspace_integrity` — makes `workspaceId` nullable for the owner-upgrade state, converts only the two named legacy sentinels, deliberately aborts on any other workspace orphan, and then adds the workspace cascade.
4. `20260911110000_app_store_server_state` — creates the account-bound canonical App Store state and hash-only/deidentifiable Notifications V2 receipt tables, including ownership constraints, status checks, indexes, and user deletion behavior.
5. `20260912120000_privacy_request_intake` — creates the minimized account-linked privacy-request queue with database-enforced type/status/resolution constraints, bounded detail, race-safe active-request deduplication, indexes, and account-deletion cascade.

The migration command must be allowed to apply only this exact five-item pending set in lexical order. Do not rerun the already-applied deletion-request migration manually, edit `_prisma_migrations`, suppress the Team-pause migration's orphan exception, or deploy application code first.

## Approval Batches

### Activation sequencing — source controls implemented; approval/evidence still required before Batch B

Local source candidate `92b61b9` preserves the exact, fail-closed `ACCOUNT_DELETION_ENABLED=true` opt-in from `3dbba3a`. Missing or any other value hides the gated interactive deletion controls/links in Settings and Support, skips the deletion-specific account lookup, and makes both deletion API methods return a no-store `503` before authentication, body parsing, or database work. It corrects the unconditional Privacy claim and adds exact `PRIVACY_REQUEST_INTAKE_ENABLED=true`; missing or any other value makes both privacy API methods return a no-store `503` before authentication/body/database access, while the page truthfully reports that the first-party lane is inactive. `PRIVACY_REQUEST_EMAIL` remains blank and is displayed only after strict validation. The candidate also preserves the separate exact `CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED=true` opt-in; the scheduled retention sweep performs no reads or writes while off. Legacy `BetaFeedback` erasure requires the additional `CAPITOLWONK_LEGACY_FEEDBACK_RETENTION_ENABLED=true` switch.

This closes the source-design gap only. The gates are committed and locally source/build-verified, but the current candidate has no remote CI/Preview evidence and is not approved, deployed, configured, activated, sandbox-tested, device-tested, or runtime-verified. Before requesting Batch B, close the known `jsrsasign` issue #447 gate and obtain approval for the exact default-off deployment and later activation sequence. Deletion and retention must remain unavailable until the live schema, authenticated cleanup worker, no-payload monitoring, provider-retention procedures, sandbox/device behavior where applicable, and truthful public copy are ready. Deployment approval is not activation approval.

### A. Production migrations — pending separate explicit approval

Immediately before action:

- identify the intended production project/database by non-secret metadata and satisfy the pre-migration read-only gates in the [backup/PITR and provider-retention checklist](backup-pitr-provider-retention-evidence-2026-09-11.md);
- preserve the setting-verified seven-day Neon window and protected default `production` branch; Phase 1 of the [restore drill](neon-constrained-restore-drill-runbook-2026-09-12.md) verified the literal-name application schema, migration state, and zero-row deletion-watermark baseline, while later drill phases and cleanup remain prerequisites before production migration approval;
- run the fail-closed database-target guard, repeat `prisma migrate status`, and require the exact five-item pending allowlist;
- repeat the aggregate orphan/sentinel checks and require the September 11 result unless a changed count is separately explained and approved;
- verify the candidate migration files are byte-for-byte the reviewed versions; and
- record operator, time, candidate SHA, database environment, and approval without recording credentials.

If every gate passes, the proposed action is one production `prisma migrate deploy` from the frozen candidate. Postflight must show all five migrations applied and no other migration changed. Then verify table/column/index/foreign-key definitions, including the privacy-request table, both App Store state tables, and their ownership/deidentification constraints; zero unexpected orphans; both existing Team-pause rows still present and workspace-valid; and unchanged non-account public catalog counts. This batch authorizes no application deployment, Apple notification activation, privacy-intake activation, or account deletion.

### B. Matching production source deployment — pending separate explicit approval

Batch B is blocked until the known `jsrsasign` OCSP defect and residual EOL gate are closed through the approved path; a tested default-off App Store server-verifier/Notifications V2 gate and fail-closed rollback exist; the remaining Neon restore-drill phases and cleanup are reconciled; and an operated privacy-rights procedure exists for every retained access/export/correction/deletion promise. Option 1 is selected and frozen in local candidate `92b61b9`, Tyler is the sole privacy owner, and the unsupported Sentry/deletion copy is corrected locally. No backup is currently available; the single-owner contingency, verified mailbox/provider, staff resolution path, export/correction/deletion exercises, monitoring, retention, and fresh remote evidence remain open. Mailbox/contingency work is scheduled for October 7–10 and is a hard gate before the planned October 19 submission. Historical candidate `3dbba3a` has the last CI/Preview evidence, which is stale. Require fresh strict CI, a matching Preview, copy/readiness checks, and proportionate smoke for `92b61b9`. A deployment approval would still not activate privacy intake, account deletion, retention, or App Store server processing.

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

### E. Isolated disposable account-deletion QA — destructive non-production; pending action-time approval and account assignment

First run this batch against an isolated non-production Preview/test database containing only synthetic fixtures, with the deletion gate enabled only in that environment under a separate configuration approval. Never copy customer data into it or point the test client at production. Use only a uniquely marked disposable production-shaped account created for this test. Never use a maintainer, reviewer, subscriber, shared Team, or ordinary tester account. Follow the runbook's complete inventory and control-user procedure. Prove transaction rollback on a forced database failure, deletion of every linked account/email/sender-key row, deidentified completion audit, all-session and current-device clearing, unrelated-data preservation, explicit success-receipt behavior, ambiguous-result treatment, multi-tab fencing, pending-only job retention, successful-job erasure, interrupted-`processing` reclaim after the ten-minute threshold, and Apple billing separation.

This batch requires Tyler to approve the exact isolated environment, disposable account, test-only gate/configuration, and destructive action at execution time. Approval of the packet, migrations, deployment, or another configuration is not approval to press **Permanently delete account**. Do not temporarily enable the current global gate in production. Any production canary requires a separately reviewed account-scoped/staged gate or an explicit later production-test batch; neither exists or is authorized here.

### F. Stripe test-mode and real-Postgres concurrency QA — pending separate explicit approval

With disposable test-mode resources only, verify active, terminal/missing, and transient cleanup outcomes; pagination and idempotent replay; timestamp-valid/expired webhooks; live-state reconciliation and stale-subscription rejection; deleted-user cleanup before acknowledgement; Team-member restoration or checkout-required fallback; pause/delete lock serialization; and provider compensation after a forced database-transaction failure. Do not use live charges, real customers, or production provider mutation.

### G. Physical-device and signed-candidate QA — blocked by T04

After Apple Support guidance is reconciled and Tyler approves one supported signing action, restore physical-device availability and execute the [App Store sandbox QA matrix](app-store-sandbox-qa-matrix-2026-09-11.md) on the exact signed TestFlight candidate. Run destructive deletion cases only when the signed candidate is proven to target the isolated E environment with its separately approved test-only gate. For Notifications V2, use a separately approved callback-only public staging deployment/project on the same fixed SHA, backed only by non-production data and enforcing the approved size/timeout/concurrency controls. If either surface cannot be provided safely, complete the independent non-destructive cases and leave the affected rows open; never disable protection for the existing whole Preview, enable the production notification callback, or point an experimental signed client at a globally enabled production deletion gate as a shortcut. Verify the visible deletion contract, cookie/storage clearing, explicit receipt vs. ambiguous response, a second session, multi-tab behavior, delayed native StoreKit writer fencing, provider-authoritative Apple lifecycle, and Team transitions. The current Apple certificate/CSR/private-key/Keychain/profile/team/bundle/signing/device-state freeze remains unchanged until then. Source fixtures are not sandbox proof.

### H. Controlled activation, privacy publication, screenshots, and release decision — pending separate explicit approvals

Keep account deletion and the retention sweep unavailable until the applicable schema/runtime, cleanup task/monitor, isolated disposable-account, provider/concurrency, signed-device, restore, retention, and public-copy gates have passed. Keep legacy-feedback erasure separately off until its private export and removal plan are approved. Generate and reconcile the aggregate privacy report from the exact Release archive; inspect representative sanitized Sentry event fields; verify final WKWebView, server, host-log, email, official-message, Stripe, Apple, and YouTube behavior; and close the [backup/PITR and provider-retention checklist](backup-pitr-provider-retention-evidence-2026-09-11.md). Resolve the documented Sentry individual-feedback-removal contradiction and obtain runtime proof for source-level query/token scrubbing before publishing a removal claim. Follow the provisional fourteen-type matrix, public-copy blockers, exact asset hashes, and sanitized recapture plan in the [September 12 privacy/assets packet](app-privacy-release-assets-prep-2026-09-12.md). Batch H is not a combined source-deploy/config authorization: if the neutral policy deployed in Batch B remains truthful at activation, present configuration-only activation separately. If activation requires another source/copy change, freeze and verify a new candidate and obtain a new deployment approval before any configuration change. Visually verify each approved action afterward. Then present final App Privacy answers and exact App Store Connect changes for separate approval, publish only after approval, and present corrected CapitolWonk listing/review assets before any upload. A real YouTube player requires its own runtime privacy audit before enablement.

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
- Batch B, an affected App Store server-verifier/Notifications V2 sandbox exercise, subscription activation, or release would proceed while issue #447 is unresolved; online checks are disabled; or the exact verifier dependency path/integrity drifts. This does not block T04 read-only guidance or separately approved signing-readiness work that does not execute the affected verifier;
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
- exact signed build/device and App Privacy archive/runtime/provider reconciliation, including closure of the [September 12 `jsrsasign` conditions](jsrsasign-risk-decision-2026-09-12.md);
- final public-policy screenshots, App Store Connect preview/publication evidence, corrected CapitolWonk listing/review assets per the [September 12 preparation packet](app-privacy-release-assets-prep-2026-09-12.md), and the remaining-risk/go-no-go record.

## Approval Ledger

| Batch | Status |
| --- | --- |
| Read-only production migration-history and aggregate safety preflight | Complete September 11, 2026 |
| A — production migrations | Not authorized; blocked by separate Neon recovery-minimum decisions/actions/drill and fresh exact preflight |
| September 12 read-only provider setting pass | Complete for visible Neon, Vercel, Sentry, Resend, and email/webhook boundaries; runtime/removal/restore evidence remains open |
| Default-off deletion and retention source gates | Committed in candidate `3dbba3a`, source-verified, and exact-CI verified; not approved, deployed, configured, activated, or runtime-verified |
| B — gated production source deployment | Blocked by the `jsrsasign` correctness/residual-EOL gates, Batch A, actionable privacy-rights intake/procedure, truthful deletion/feedback copy, and activation-sequence approval; not authorized |
| C — protected cleanup task/scheduler/monitoring | Not authorized |
| D — post-deploy schema/runtime verification | Not authorized |
| E — isolated non-production disposable account deletion | Not authorized; exact test environment/account/gate/action required |
| F — Stripe test-mode/real-Postgres concurrency QA | Not authorized |
| G — signed physical-device / Apple runtime QA | Blocked by T04, the fixed/gated verifier candidate, and isolated callback/test-environment approvals; not authorized |
| H — controlled deletion activation/privacy/screenshots/upload decision | Not authorized |
