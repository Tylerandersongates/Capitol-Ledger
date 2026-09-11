# CapitolWonk App Privacy Correction Packet — September 10, 2026

Status: **provisional correction draft and immediate account-deletion implementation with transactional cleanup jobs are prepared locally; neither is deployed, applied, or published.** Release/runtime, provider, logging, retention, migration, cleanup-task, live-deletion, and backup/PITR gates remain open. This packet does not authorize or evidence a production migration/deploy, task-secret or scheduler change, destructive production test, remote questionnaire change, build upload, tester distribution, or review submission.

## Correction Summary

A September 10 read-only review found nine data types in the current App Store Connect questionnaire and no Diagnostics entries. That snapshot no longer matches the implemented and intended launch behavior:

- Sentry is active for the web client. It is integrated in the native client and activates only when the protected setting is supplied; native runtime delivery remains unverified.
- Sentry Cocoa `9.22.0` declares Crash Data, Performance Data, and Other Diagnostic Data in its privacy manifest. Its resolved source also generates a persistent installation ID, attaches it to native events as a user ID, and creates a device-and-app hash from a device-level identifier.
- Voluntary feedback can send an optional email with message and diagnostic/page context in one Sentry event.
- The official-contact feature processes a user-authored subject and message to prepare or deliver an email to a selected official.

If the final release keeps the current native SDK behavior, retain the existing nine types and add five: **Emails or Text Messages, Device ID, Crash Data, Performance Data, and Other Diagnostic Data.** The proposed total is 14 data types. Every tracking answer remains **No for the current configuration with no live YouTube video, advertising SDK, or analytics product enabled**; re-audit before that configuration changes.

## Provisional Answer Matrix

For each row below, the proposed answer is **Collected: Yes**. The Release/runtime gates below must confirm these answers before publication.

| App Store data type | Questionnaire action | Purposes | Linked to the user | Used for tracking | Current implementation basis |
| --- | --- | --- | --- | --- | --- |
| Contact Info — Name | Retain | App Functionality | Yes | No | Account/profile names, Team invitations, authentication messages, and optional delivery features. |
| Contact Info — Email Address | Retain | App Functionality | Yes | No | Authentication, account email, Team invitations, support, and official-message sender identity. |
| Identifiers — User ID | Retain | App Functionality | Yes | No | Sessions, active account-owned records, in-progress deletion, StoreKit account/entitlement binding, and a post-commit cleanup record retained while another Team member still needs restoration. A completed deletion audit has the deleted user's ID removed, and each cleanup record is erased after successful processing. |
| Identifiers — Device ID | **Add** | App Functionality | **Yes** | No | Resolved Sentry Cocoa source creates a persistent per-install ID for events and a device-and-app hash derived from a device-level identifier. |
| Location — Coarse Location | Retain | App Functionality; Product Personalization | Yes | No | State and congressional district are stored for relevant officials, alerts, and briefs. |
| Sensitive Info | Retain | App Functionality | Yes | No | Optional party affiliation is stored with and displayed in the account. Policy interests and civic actions are covered as Product Interaction unless the final implementation treats or infers them as political opinions. |
| Purchases — Purchase History | Retain | App Functionality | Yes | No | Apple product, transaction, renewal, status, ownership, and seat-entitlement records unlock and restore access. A deletion-cleanup record may hold a legacy Stripe customer/subscription reference solely while renewal-off and account-metadata detachment are pending; it is erased after successful processing. |
| Usage Data — Product Interaction | Retain | App Functionality; Product Personalization | Yes | No | Saved/followed items, policy interests, alert state, preferences, badges, streaks, and civic actions are stored with the account and personalize app content. |
| User Content — Customer Support | Retain | App Functionality | Yes | No | A voluntary report can include a title, message, optional email, current page, and technical context. |
| User Content — Other User Content | Retain | App Functionality | Yes | No | User-created Team workspace and collaboration content is stored with the account. |
| User Content — Emails or Text Messages | **Add** | App Functionality | Yes | No | The official-contact flow processes the sender name/email, subject, full message, and recipient; it retains the subject, a short preview, recipient, status, and account association. |
| Diagnostics — Crash Data | **Add** | App Functionality | **Yes** | No | Crash and termination logs can include Sentry's persistent installation ID and device-and-app hash. Non-crashing exceptions belong under Other Diagnostic Data. |
| Diagnostics — Performance Data | **Add** | App Functionality | **Yes** | No | The SDK manifest declares this type, and default app-hang/watchdog behavior may collect it with the same persistent identifiers. Confirm collection in the exact Release configuration. |
| Diagnostics — Other Diagnostic Data | **Add** | App Functionality | **Yes** | No | Non-crash errors and device/OS/build/page context can include native installation identifiers; a voluntary report may also include optional email or identifying report content. |

## Important Classification Notes

- **Precise Location: No based on current source.** Current-location district matching processes location coordinates on the device against a bundled district map. The app does not send or store those coordinates; it sends and stores only the selected or derived state/district.
- **Device ID: Yes unless remediated and verified.** The native SDK privacy manifest says its diagnostics are unlinked, but the resolved `9.22.0` source attaches a persistent installation ID and device-and-app hash. Actual SDK behavior controls the questionnaire answer.
- **Payment Info: No.** Apple handles entry of the payment instrument. CapitolWonk receives purchase and entitlement records, which belong under Purchase History.
- **Search History: No based on current application storage.** Search queries are processed but are not stored by application code. Confirm that production request logging does not retain query strings before publication.
- **Advertising Data and Tracking: No for the current configuration.** No advertising SDK, IDFA/ATT flow, cross-company targeting, or data-broker use was found. This conclusion must be revisited before a real YouTube embed or other new provider is enabled.
- **Analytics purpose: Do not select for the current configuration.** Vercel Web Analytics is not enabled, Sentry tracing and replay are disabled, and diagnostics are used to operate and troubleshoot the app. Reassess if analytics is enabled.

## Implementation Evidence

- Web monitoring disables default personal information, tracing, and replay in `instrumentation-client.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts`.
- Native monitoring disables default personal information and tracing in `ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerApp.swift`; this does not suppress the SDK's installation ID.
- The native project resolves Sentry Cocoa `9.22.0`. Its privacy manifest declares Crash Data, Performance Data, and Other Diagnostic Data for App Functionality without tracking, while its resolved source unconditionally assigns a persistent installation ID to events without an existing user and adds a device-and-app hash to crash context.
- `components/feedback-form.tsx` sends voluntary feedback to Sentry with replay disabled and permits an optional email in the same report as its message and current URL.
- `components/account-profile-controls.tsx` performs location matching on-device and syncs only district-level profile data.
- `app/api/members/[bioguideId]/email/route.ts` and `lib/official-contact-messages.ts` process official-contact messages and retain a short preview plus delivery history.
- `prisma/schema.prisma` ties account, profile, preference, civic activity, purchase, Team, and Brief records to the user.
- `app/api/account/deletion-request/route.ts` and `lib/account-deletion.ts` now attempt immediate account deletion after the user acknowledges separate Apple billing and enters the exact confirmation. The serializable database work is atomic: it locks the account and relevant Team/subscription rows, reuses or creates a deletion record, writes deduplicated `AccountDeletionCleanupJob` snapshots, removes account-linked relational and raw-store rows, deletes the user, verifies zero remaining matches, and commits a minimal `resolved` audit with `userId` set to null. A transaction failure rolls back both deletion and the new jobs, preserves the owner account, and leaves it retryable.
- Account persistence under a configured database now resolves a request read-only by the exact persisted user ID. It neither creates a missing user nor remaps by email, and a database failure does not fall through to process-memory account state. This prevents stale requests from recreating a deleted account or attaching its email to another user.
- The deletion operation itself performs no Team-member or provider mutation before its account transaction commits. After commit, `lib/account-deletion-cleanup.ts` makes an idempotent inline attempt and `/api/tasks/account-deletion-cleanup` processes retries. A Team-owner job restores a surviving member's captured pre-Team subscription or marks checkout as required; a missing or otherwise terminal Stripe-resume response ends in checkout-required, while a transient response remains retryable. For an active legacy Stripe subscription, cleanup schedules renewal off at period end and removes the deleted account's `userId`/`userEmail` metadata where Stripe permits. An already-terminal or missing subscription counts as completed cleanup even when its metadata can no longer be changed. Apple billing remains a separate user-managed path and is never canceled by this workflow.
- Concurrent Team-seat pause writes take account/workspace locks so they serialize against workspace/account deletion. If that path schedules Stripe cancellation before its own database transaction commits and the transaction fails, it attempts compensation by resuming the subscription. This still requires real-Postgres concurrency and Stripe test-mode failure verification.
- Stripe webhook signatures enforce a five-minute timestamp tolerance. Supported events reconcile with current Stripe subscription state where possible and reject events for a stale subscription ID. Before acknowledging a late event mapped to a deleted user, cleanup schedules an active subscription not to renew and detaches account metadata where Stripe permits, without recreating or email-remapping a `User`; a terminal/missing resource is success and a nonterminal provider failure is left for retry.
- Cleanup jobs retain only the provider/member references and captured subscription state needed to finish that work. They remain only while pending/retrying and are erased after success; authenticated scheduling, no-payload age monitoring, and an escalation path are required so a failed job does not become a durable identifier archive. The deidentified `AccountDeletionRequest` completion audit remains after the jobs are gone.
- On successful database deletion, the API clears auth cookies and account sessions, server memory caches are cleared best-effort, and hashed, expiring rate-limit entries for the deleted account ID/email are cleared. The client removes every `capitol-ledger:` local/session-storage entry on the current device and sets a cross-tab deletion fence honored by browser account-data writers and native StoreKit publication. The completed result requires an explicit browser receipt created from a verified success response; direct navigation or an ambiguous dispatched result renders **Deletion not confirmed**. A cache-cleanup error cannot turn a committed deletion into a reported failure.
- The deletion transaction does not remove records independently retained by Apple, Stripe, an email provider, or an official. Sentry feedback is submitted separately and is not linked by CapitolWonk account ID by default. Current Sentry guidance says User Feedback cannot be deleted individually and may require whole-project deletion, so the existing one-report Support-removal wording is an unresolved release blocker rather than an evidenced procedure.
- The public CapitolWonk YouTube channel at `https://www.youtube.com/@CapitolWonk` was verified and configured locally with no episodes. This channel-only state exposes a user-initiated Subscribe link but loads no iframe or automatic YouTube request. The public policy now distinguishes outbound YouTube navigation from embedded-player traffic. No video exists, and the real-player/runtime audit remains open.

## Gates Before App Store Connect Publication

1. Generate the aggregate privacy report from the **exact Release archive** after the T04 signing path is resolved. Reconcile app and packaged SDK manifests, but do not treat that report as exhaustive: it cannot inventory remote JavaScript, WKWebView traffic, server logging, or external web-service providers.
2. Close the [backup/PITR and provider-retention checklist](backup-pitr-provider-retention-evidence-2026-09-11.md) against the final production web path: Sentry JavaScript, hosting/request logs and drains, database storage/recovery, authentication and Team-invite email, any Brief/email webhook, official-contact delivery, and any enabled embedded-video or AI provider.
3. With separate action-time approval, inspect representative sanitized events by field presence only: automatic web and native crashes, non-crash errors, app-hang/watchdog events, and voluntary feedback. Check for account/name/email data, retained IP/geography, stable device/install/session identifiers, URLs and query strings, and user-authored content.
4. Decide the native identifier path. Either keep Device ID and linked Yes for all native diagnostic types as proposed, or strip the installation ID and device-and-app hash before transmission and prove that behavior on the exact candidate before changing any answer to No.
5. Confirm whether app-hang/watchdog/performance events are collected in the exact Release configuration. Keep Performance Data if the SDK declaration or runtime behavior remains.
6. Confirm the legacy Stripe checkout path is unreachable in the production iOS launch configuration. If it is enabled, re-audit its user ID, email, plan, and payment-provider transmission.
7. Confirm production request logging, drains and diagnostics do not retain sensitive search query strings or verification/reset/invite/task tokens. Prevent or scrub collection; if search terms remain, add Search History with the correct purpose/linkage answers, but do not treat disclosure as sufficient for retaining authentication secrets.
8. Complete the [account-deletion runbook](account-deletion-runbook-2026-09-10.md): deploy the deletion-integrity, cleanup-outbox, and Team-pause workspace-integrity migrations; verify live schema/table/foreign-key behavior, including that migration `20260910152000_team_subscription_pause_workspace_integrity` converts only known sentinel values and aborts on an unexpected orphan pause; configure and authorize the cleanup-task secret and schedule; establish no-payload monitoring/retry alerts; and run end-to-end deletion only with a disposable production-shaped account. Verify exact-ID/no-memory-fallback persistence, Team-owner snapshot/restoration, pause/delete serialization and failed-transaction compensation, webhook timestamp/reconciliation/deleted-user behavior, legacy Stripe terminal/missing/transient outcomes, completed-job erasure, pending-job retry, every-session/current-device clearing, explicit receipt and ambiguous-result behavior, and the multi-tab/device-writer fence. Approve the restore design and close the [provider-retention checklist](backup-pitr-provider-retention-evidence-2026-09-11.md). Before production source deployment, approve a default-off feature/maintenance gate or another controlled activation sequence so the destructive action cannot become available before its live worker, monitor, provider procedures and truthful copy are ready. The local implementation supports an immediate account-deletion statement, but it is not production evidence; do not publish or expose that claim until these gates pass.
9. Before enabling a real YouTube episode, audit the player's actual request/storage behavior, update the matrix and policy if needed, and verify the public policy's provider link. The verified channel-only Subscribe link is not evidence for embedded-player behavior.
10. Ensure the public retention/deletion copy distinguishes the deidentified completion audit from provider-cleanup records retained only while pending/retrying, states that successful cleanup records are erased, and keeps Apple billing separate. Replace the unsupported promise that Support can remove one Sentry feedback item with the approved truthful expiry/intake design. Do not promise a fixed or “short-lived” duration; retain the scheduler and aging-alert release gates. Update the public policy review date if the source changes, then deploy and visually verify `/privacy` before publishing the questionnaire.
11. Present the resulting final matrix and exact remote action to Tyler for explicit approval. Do not use this provisional packet as standing authorization.

## Provisional App Store Connect Sequence — Not Yet Authorized

Only after every gate above is satisfied and Tyler approves the exact action:

1. Open App Privacy for the existing CapitolWonk app record.
2. Reconcile the nine existing data types with the final verified matrix.
3. If current behavior remains, add User Content — Emails or Text Messages and Identifiers — Device ID.
4. If current behavior remains, add Diagnostics — Crash Data, Performance Data, and Other Diagnostic Data.
5. For every added type, select App Functionality, apply the verified linkage answer, and answer No to tracking only if the final provider audit still supports it.
6. Preview the complete summary. If the current behavior is unchanged, it should contain 14 types; compare every row with the final runtime/provider evidence, not just the archive privacy report.
7. Capture the preview for the evidence packet and publish only after Tyler gives action-time approval.

## Apple Reference Rules

- [App privacy details on the App Store](https://developer.apple.com/app-store/app-privacy-details/) defines collection, webview/third-party scope, data types, purposes, linkage, and tracking.
- [Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy) explains how to edit and publish questionnaire answers.
- [User privacy and data use](https://developer.apple.com/app-store/user-privacy-and-data-use/) requires disclosures to account for third-party partners and SDKs.
- [Privacy manifests](https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests) are one input to the exact-archive reconciliation gate.
- [App Review Guidelines, section 5.1.1](https://developer.apple.com/app-store/review/guidelines/) requires a clear privacy policy covering collection, uses, third-party sharing/protection, retention/deletion, and user choices.

## Approval Record

- Provisional local preparation: complete September 10, 2026.
- Public privacy-page source correction: prepared in the reviewed branch candidate; not deployed to production.
- Immediate account-deletion source, deletion-integrity, cleanup-outbox and Team-pause workspace-integrity migrations, post-commit worker/task route, and fixture coverage: prepared in the reviewed branch candidate; not deployed to production or live-destructively verified.
- Account-deletion production schema/FK, safe activation design, task-secret/scheduler/monitoring/retry, disposable-account, Team-member/legacy-Stripe cleanup, physical-device, backup/PITR, provider-removal, Sentry feedback-removal, and sensitive-log gates: pending. See the [September 11 evidence checklist](backup-pitr-provider-retention-evidence-2026-09-11.md).
- App Store Connect questionnaire: unchanged.
- Release/runtime and provider reconciliation: pending.
- Publication approval: pending.
