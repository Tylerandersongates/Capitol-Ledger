# CapitolWonk Account-Deletion Runbook — September 10, 2026

Status: **immediate account deletion plus transactional post-commit cleanup jobs are implemented in the reviewed branch candidate and fixture-tested locally, but are not deployed to production or verified against the production database, cleanup-task runtime, Stripe test mode, or a TestFlight device.** This runbook is preparation, not authorization to migrate production, configure a task secret or scheduler, deploy to production, delete an account, or change an external provider.

## User-Visible Contract

A signed-in production user opens **Settings > Your data > Delete account**, reviews the permanent-deletion and separate-Apple-billing warning, selects the acknowledgement, types `DELETE`, and chooses **Permanently delete account**.

The confirmed action attempts immediate completion. On success, CapitolWonk:

- permanently deletes the account and every account-linked relational and raw-store record in the implemented inventory;
- removes Team memberships/invitations tied to the user and deletes a Team workspace the user owns;
- invalidates every CapitolWonk session, clears authentication cookies, removes every `capitol-ledger:` key from local and session storage on the current device, and activates a cross-tab deletion fence that blocks browser and native StoreKit writers from repopulating cleared state;
- shows the completed state only when the initiating tab holds an explicit browser receipt created from a verified success response, retains a minimal deidentified deletion-completion audit, and retains a provider-cleanup job only while post-commit work is pending or retrying; and
- does **not** cancel an App Store subscription.

If the database transaction cannot complete, it rolls back and the account remains unchanged and retryable. The deletion operation does not mutate a Team member or provider before that account transaction commits. If a post-commit cleanup attempt fails, the account remains deleted and the idempotent job remains queued for automatic retry; do not describe this second case as a rolled-back deletion. A lost, interrupted, or unparseable response is not proof of success: the client clears this browser defensively but routes to an explicit **Deletion not confirmed** result unless it received the verified completion response and stored its receipt.

## Implemented Deletion Boundary

The serializable account transaction locks the persisted `User` row and uses its stored email, reuses or creates an `AccountDeletionRequest`, locks owned Team workspaces and relevant subscription/pause rows, and writes deduplicated `AccountDeletionCleanupJob` snapshots before deleting anything. The snapshots cover:

- restoration of another Team member's recorded pre-Team subscription after an owned workspace is removed; and
- cleanup of a deleted account's legacy Stripe subscription when its local subscription row contains a Stripe subscription or customer identifier.

The same transaction then deletes or cascades:

- credentials and sessions: `AuthSession`, `EmailVerificationToken`, and `PasswordResetToken`;
- saved/personalized activity: `Follow`, `SavedAlert`, `ReadAlert`, `IssueInterest`, `AccountGamification`, and `UpdateEvent`;
- subscription and Brief state: `AccountSubscription`, `WeeklyBriefDelivery`, and `WeeklyBriefEdition`;
- Team state: owned `TeamWorkspace` data, `TeamMember` matches by user ID or email, `TeamInvite` rows addressed to the deleted account's email, and related `TeamSubscriptionPause` rows; invitations created by the user in another owner's workspace are preserved and their nullable inviter reference is deidentified by the User foreign key;
- raw or formerly runtime-managed stores: `OfficialContactMessage`, `PetitionSignature`, and legacy `BetaFeedback` matches by account ID and, where supported, normalized email/sender key; and
- the `User` row itself.

Production account persistence resolves a request's user read-only by its exact persisted ID. It does not create a replacement `User` or fall back to matching by email. A stale request after deletion therefore cannot recreate the account or remap its email to another user; a missing account or database outage returns the account-persistence unavailable path instead of writing to process memory. The late Stripe-webhook exception is deliberately narrower and is described below.

Before commit, zero-row assertions check the required linked tables and every optional/raw store that exists. The completed `AccountDeletionRequest` is retained with `userId = NULL`, `status = resolved`, completion timestamps, and the Apple-billing acknowledgement. Its legacy `completionBy` field remains for schema compatibility; it is not a promise of deferred or seven-day processing. Any cleanup jobs are children of that deidentified request and survive the deleted `User` only long enough to finish their external or surviving-member work.

Only after the account-deletion commit does the service attempt its queued work. Team-member restoration resumes a qualifying Stripe-backed personal Pro subscription from period-end cancellation when possible, otherwise restores the recorded local subscription or marks checkout as required. A missing Stripe subscription or another terminal resume response is converted to the checkout-required member state and completes the job; a transient response leaves the job pending for retry. For an active legacy Stripe subscription, cleanup schedules renewal off at period end and removes the deleted account's `userId` and `userEmail` subscription metadata where Stripe permits. A subscription already terminal or missing is treated as completed cleanup, even when provider metadata can no longer be changed; a transient failure remains retryable. These operations are idempotent. A completed job is deleted; a pending/retrying job retains only the provider/member references needed to finish cleanup and is erased after success.

When cleanup starts from a Stripe customer reference, it enumerates every subscription page using Stripe's cursor contract and deduplicates CapitolWonk subscription IDs. An initially missing customer yields no subscriptions; malformed pagination or an error after any successful page fails closed so the job remains retryable instead of silently accepting a partial result.

The Team-seat pause path also locks the exact account and workspace while it records the member pause, so a concurrent workspace/account deletion serializes against that operation in Postgres. If the pause path has already scheduled a Stripe subscription to stop at period end and its database transaction then fails, it attempts compensation by resuming that Stripe subscription. This lock and compensation contract still requires real-Postgres concurrency and Stripe test-mode failure QA before release; fixture coverage is not production evidence.

After commit, account-scoped in-memory caches are also cleared on a best-effort basis. A cache-clear error cannot convert an already committed deletion into a `503`. Rate-limit keys hash client and subject values before in-memory storage, expired counters are pruned, and the successful deletion path clears counters keyed to the deleted account ID or email. The API clears authentication cookies, and the client clears all current-device local/session-storage keys beginning with `capitol-ledger:`. A cross-tab local-storage fence blocks every CapitolWonk browser account-data writer and native purchase-state publisher from hydrating or recreating account state until a deliberate fresh authentication clears it. Storage belonging to another app is not removed.

The completion route does not infer success from a redirect or a missing session. The initiating tab stores a session-scoped confirmation receipt only after a structured successful deletion response. Direct navigation and ambiguous dispatched results render **Deletion not confirmed**, while the multi-tab fence still prevents stale tabs or delayed device events from repopulating cleared state.

## Stripe Webhook Boundary

Stripe webhook signatures include a timestamp and are accepted only within the implemented five-minute tolerance. Supported checkout and subscription-update events reconcile against current Stripe subscription state when possible, and an event for a different stored subscription is ignored as stale rather than overwriting the current entitlement.

If a late supported event resolves to a user ID whose `User` row is already gone, the handler does not recreate the user or persist an entitlement. Before acknowledging the webhook, it runs the deleted-account Stripe cleanup for the event's subscription/customer reference: an active subscription is scheduled not to renew and account metadata is detached where Stripe permits. An already-terminal or missing resource is treated as success; a nonterminal provider failure is not acknowledged as success and remains available for Stripe retry. These semantics need live Stripe test-mode replay and ordering evidence before production release.

## Cleanup Task And Retry Contract

The deletion request makes one best-effort inline cleanup pass after commit. Remaining work is processed by `GET` or `POST /api/tasks/account-deletion-cleanup`. In production the route refuses to run without a protected secret. Prefer a dedicated `ACCOUNT_DELETION_CLEANUP_SECRET`; the implementation also accepts `CAPITOL_LEDGER_TASK_SECRET` or `CRON_SECRET` as configured fallbacks. Authenticate with a Bearer token or the supported protected task header; never put the value in source, URLs, logs, screenshots, or evidence.

The worker claims due jobs with row locks and `SKIP LOCKED`, reclaims a job left in `processing` for more than ten minutes, and returns failed jobs to `pending` with bounded exponential backoff. Its response exposes only claimed/completed/failed counts. Successful jobs are erased immediately. Monitor job counts, oldest `availableAt`/`createdAt`, attempts, and repeated task failures without logging payloads or provider identifiers.

The production scheduler interval and alert threshold must be chosen and recorded before release. It must invoke the route often enough to complete and erase pending records, retry transient provider failures, and surface a stuck or aging job for operator action. Retention is outcome-based, not a guaranteed duration: a job remains while pending/retrying and is erased after success. Do not manually delete a pending job merely to clear an alert; first prove the intended Team-member or Stripe outcome, then rerun the idempotent task or repair the job under an approved incident procedure.

## Data Outside The Account Transaction

- **Apple:** deleting CapitolWonk does not cancel or erase App Store billing. The user manages renewal through Apple; Apple may retain transaction records under its own terms.
- **Legacy Stripe:** this is separate from the current Apple launch path. When the deleted account still has a legacy Stripe subscription reference, the post-commit cleanup job schedules an active subscription not to renew and detaches account ID/email metadata where Stripe permits. Already-terminal or missing subscriptions are treated as complete; Stripe may retain metadata or transaction records under its own terms. The worker must have an approved test/production credential path if such rows exist; otherwise prove before deployment that no legacy Stripe cleanup can be queued.
- **Sentry:** feedback and diagnostics are submitted separately and are not linked by CapitolWonk account ID by default. If the user supplied an email or identifying message, Support must locate the specific report by the details the user provides and follow the Sentry removal procedure. Diagnostics without identifying details may not be attributable to an account.
- **Email providers and officials:** a provider or recipient may independently retain a delivered message. CapitolWonk deletes its own matching official-contact history; Support must explain the boundary and use any available provider deletion process.
- **Hosting/request logs:** verify URL, query-string, IP/geography, and retention settings for the exact production configuration. Account deletion does not by itself prove removal from provider logs.
- **Backups and point-in-time recovery:** deletion from the live database does not erase older snapshots. The release gate below must prevent a restore from silently resurrecting a deleted account.

## Release Gates

Do not call the workflow production-ready until all items are evidenced:

- [ ] Review and approve the exact source/migration diff.
- [ ] Deploy `20260718154000_account_deletion_requests` if it is not already present, then deploy `20260910150000_account_deletion_integrity`, `20260910151000_account_deletion_cleanup_outbox`, and `20260910152000_team_subscription_pause_workspace_integrity` to the intended database before deploying the code that requires them.
- [ ] Verify the live tables, indexes, and `ON DELETE` foreign keys for every account-linked model and runtime-managed store, including the cleanup-job foreign key, unique dedupe key, status/availability index, and `TeamSubscriptionPause.workspaceId` nullable foreign key with `ON DELETE CASCADE`. Confirm migration `20260910152000_team_subscription_pause_workspace_integrity` converts only the known empty-string and `team-owner-upgrade` sentinels to `NULL`, aborts rather than silently rewriting any unexpected orphan pause, leaves every non-null pause referencing a real workspace, and leaves no unregistered table or email-keyed record outside the deletion inventory.
- [ ] Configure a protected cleanup-task secret, deploy `/api/tasks/account-deletion-cleanup`, configure its authenticated schedule, and prove unauthorized requests fail without exposing the secret.
- [ ] Establish a no-payload monitoring view and alert/retry procedure for pending/processing age, attempt count, task failures, and provider failures. Prove completed jobs are erased and an interrupted `processing` job is reclaimed.
- [ ] If any legacy Stripe-backed account can exist, verify the cleanup with disposable active and terminal/missing Stripe test-mode cases: active renewal is scheduled off and metadata is detached where Stripe permits; terminal/missing cases complete without retry; and an idempotent replay is harmless. Otherwise document the production query proving no such job can be created.
- [ ] Replay signed Stripe events inside and outside the five-minute timestamp window. Prove current-provider reconciliation and stale-subscription rejection; prove that, before acknowledging a late event for a deleted user, cleanup schedules an active subscription not to renew and detaches metadata where Stripe permits without recreating or email-remapping a `User`; and prove terminal/missing resources complete while transient failures remain retryable.
- [ ] In real Postgres plus Stripe test mode, race a Team-seat pause against workspace/account deletion. Prove the account/workspace locks serialize the writes and a failed pause transaction attempts provider compensation without leaving an untracked canceled subscription.
- [ ] Run `pnpm account-deletion:check`, TypeScript, ESLint, and the full TestFlight/readiness suite against the exact release source and installed graph.
- [ ] Complete the web end-to-end procedure below with a uniquely marked disposable production-shaped account.
- [ ] Complete the same user-visible flow on the exact signed physical-device TestFlight candidate and verify current-device storage/cookie clearing, explicit success-receipt behavior, ambiguous-response treatment, multi-tab/device-writer fencing, and invalidation of a second session.
- [ ] Verify the Team-owner case: the deletion transaction snapshots each affected member before workspace deletion and performs no member/provider mutation before its own commit; the post-commit worker restores the member exactly once; concurrent Team-seat pauses serialize through the account/workspace locks with compensation on a failed pause transaction; and unrelated users/workspaces/invitations are preserved.
- [ ] Approve and exercise a backup/PITR tombstone or deletion-replay policy in a restore drill.
- [ ] Record retention and removal procedures for Apple, Sentry, the host/request-log provider, email delivery, and official-message recipients.
- [ ] Deploy and visually verify `/privacy` and `/support`, then reconcile the App Privacy answers with the exact archive and enabled providers.

## Disposable-Account End-To-End Procedure

This is destructive. Obtain action-time approval and use only an account created for this test. Never use a maintainer, reusable reviewer, real subscriber, shared Team, or ordinary tester account.

1. Record the exact commit, deployment, database environment, build/version, tester device, time, and approval. Do not record credentials, session tokens, Apple transaction IDs, or protected configuration.
2. Create a uniquely marked disposable account and populate each available account-linked surface: profile/district/preferences, follows and alerts, issue interests, gamification/update activity, Brief records, petition/contact history, subscription entitlement, and a separately authenticated second session.
3. For the Team-owner variant, create only disposable members/invitations and a controlled active pause record. Confirm the expected member subscription state before deletion. Include an invitation created by the deleting owner in another owner's workspace and verify that target invitation survives.
4. Inspect counts by the disposable account ID and normalized test email in every table listed above. Confirm unrelated control-user rows exist so preservation can be checked.
5. In the app, open Settings > Your data > Delete account, acknowledge the warning, enter `DELETE`, and choose Permanently delete account once.
6. Confirm the initiating tab stores the explicit receipt, shows completion, signs out, removes all `capitol-ledger:` local/session-storage keys on that device, and leaves unrelated storage keys intact. Open a second tab before deletion and confirm the shared fence redirects it and prevents delayed hydration or StoreKit publication from recreating CapitolWonk state. Separately simulate an ambiguous dispatched response and confirm the result says deletion is **not confirmed** rather than claiming success.
7. Confirm the second session can no longer access an authenticated account route and every server session for the disposable user is gone.
8. Query the database read-only. Confirm the `User` and every account-ID/email/sender-key/workspace match is absent, unrelated control-user data remains, and the intended minimal completion audit remains with no user ID. If cleanup is pending, confirm only the expected job payload remains and inspect it by field presence/count rather than copying identifiers.
9. For the Team-owner variant, confirm the owned workspace/member/invitation rows are gone and the committed job contains the pre-delete member snapshot. Run or await the authenticated worker, confirm each affected member reaches its expected restored or checkout-required result, and confirm the completed job is erased. Confirm unrelated workspaces, users, and the cross-workspace invitation remain.
10. For separately approved legacy Stripe test-mode variants, confirm the account commit precedes provider mutation; an active subscription is scheduled not to renew and its account metadata is detached where Stripe permits; terminal/missing subscriptions complete; and every successful job is erased. Force one retryable provider failure and prove the job remains pending without restoring the deleted account or duplicating the external effect.
11. Confirm the Apple sandbox subscription, if this separately approved scenario includes one, was not canceled by CapitolWonk deletion. Do not repurchase merely to establish a state.
12. If the disposable user submitted Sentry feedback with an identifying marker, confirm account deletion did not falsely claim to remove it, then exercise the specific provider-removal procedure and record only sanitized evidence.

## Failure And Retry Procedure

Exercise failure injection only in an isolated test environment, never in production.

1. Populate a disposable account and unrelated control account as above.
2. Force one deletion operation or zero-row assertion to fail inside the database transaction.
3. Confirm the API reports that deletion could not complete, shows no completion state, and permits a later controlled retry.
4. Confirm the owner `User`, linked records, workspace, sessions, and deletion request are unchanged by the failed transaction; confirm its new cleanup jobs did not commit and control-user data is unchanged.
5. Confirm no Team member, Stripe subscription, or other external provider state changed. Provider jobs run only after a successful database commit, so Postgres rollback preserves the owner without an external side effect to unwind.
6. Remove the injected transaction failure, retry once, and complete the success assertions.
7. Separately, after a successful account commit, force the cleanup provider call to fail. Confirm the account remains deleted, the job returns to `pending` with a later availability time and generic error, and the endpoint still reports only aggregate counts.
8. Restore the provider path and invoke the authenticated task again. Confirm the intended result occurs once and the completed job is erased.

For a pre-commit incident, preserve the account, stop repeated attempts, capture a sanitized timestamp/request correlation, inspect schema health, and escalate through Support. For a post-commit cleanup incident, do not imply the account still exists: protect the pending job, inspect task/provider health without copying its payload, retry idempotently, and escalate an aging job. Never manually delete a partial set of account rows or discard a pending cleanup job as a shortcut. If any evidence suggests a partial database commit or a provider mutation before commit, disable the deletion action until the boundary is reconciled.

## Backup/PITR Tombstone Gate

Before launch, approve one recoverability design and test it:

- retain a tightly access-controlled deletion ledger outside the database restore boundary and replay it after restoring an older snapshot; or
- constrain restoration so traffic cannot resume from a point before the last verified deletion without first applying a complete deletion ledger.

The current deidentified completion audit cannot identify which account to delete after restoration. If a keyed/pseudonymous tombstone is introduced to make replay possible, document its purpose, access, retention, deletion, and App Privacy impact before deployment. A restore drill must prove that a deleted disposable account cannot reappear to users.

## Evidence Packet

Keep only sanitized evidence:

- exact source commit, migration names, deployment/build identifiers, and check results;
- boolean/count-based before-and-after database assertions for the disposable account and unrelated control records;
- screenshots of the warning, completion state, and signed-out state with test identity removed;
- second-session invalidation and physical-device storage-clearing results;
- cleanup-task schedule/authorization and aggregate monitoring evidence, with no secret or payload;
- Team-member restoration and legacy Stripe cleanup results without personal, subscription, customer, or transaction identifiers;
- backup/PITR drill result; and
- links to internal provider retention/removal procedures, without credentials or private case/account identifiers.

Account-deletion production verification, TestFlight distribution, App Store questionnaire publication, and review submission each retain their separate approval gates.
