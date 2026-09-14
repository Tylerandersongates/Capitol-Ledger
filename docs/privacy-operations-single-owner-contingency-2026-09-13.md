# CapitolWonk Privacy Operations And Single-Owner Contingency — September 13, 2026

Status: **the default-off source and aggregate-only monitor are deployed, and the September 14 owner policy decisions are approved for implementation and isolated synthetic validation; privacy operations are not active and first-party privacy intake remains disabled.** Tyler is the sole current privacy-request owner and no backup operator is available. This packet defines the minimum operating model and fail-closed absence response supported by repository evidence. It does not activate intake, create a live case register, access a mailbox, send a message, resolve a request, write production data, change a provider, or authorize account deletion.

This is an engineering and operations packet, not legal advice. The owner decisions are now recorded in the [September 14 privacy-operations policy](privacy-operations-policy-2026-09-14.md): twice-business-day review windows, the single-owner pause model, proportionate existing-channel identity checks, and a minimized 24-month closed-case audit record with shorter payload lifetimes. Jurisdiction-specific legal review can override those internal controls. Do not publish a universal deadline from this document.

## Current boundary

| Item | Current evidence |
| --- | --- |
| Source deployment | PR #8 merged default-off privacy/deletion source into `main` at merge commit `dca8330e012f723ecd77f2756a865e907c0fa553`; PR #12 then merged fail-closed App Store verifier containment at `4836e3e48d95d677f8b64713a7f8af62204ea631` |
| Current production evidence | PR #13 merged the aggregate monitor at `ffe994e87f8afbe8882f4fd17a6ecff95217f52f`; all three PR checks passed and Vercel production deployment `HpDBVZ4krmgypJwZ56c47hBfttKG` reached Ready; targeted gate-off smoke passed |
| Database/schema | Production Batch A applied the exact five reviewed migrations once; Prisma status and the complete postflight passed |
| First-party activation | Exact opt-in `PRIVACY_REQUEST_INTAKE_ENABLED=true`; blank, missing, `false`, or any other value fails closed before authentication, body parsing, or database access |
| Current activation state | Disabled/inactive |
| Aggregate monitor | Source deployed behind exact opt-in; `PRIVACY_REQUEST_MONITOR_ENABLED` remains off, with no scheduler, alert, protected configuration, or production invocation |
| Fallback | `privacy@capitolwonk.com` is configured on the controlled domain and forwards to an owner-controlled external inbox; the destination is intentionally omitted |
| Delivery proof | Forwarding and outbound-sender exercises have not been performed |
| Human owner / backup | Tyler / none |
| Apple state | Support reply still pending; certificate, profile, Keychain, signing, and device freeze remains in force |

## What is ready

The deployed default-off source contains a technically conservative intake surface:

- [`lib/privacy-request-activation.ts`](../lib/privacy-request-activation.ts) requires exact activation and validates the optional fallback address.
- [`app/api/privacy/requests/route.ts`](../app/api/privacy/requests/route.ts) exposes authenticated user `GET`/`POST` only, applies the shared same-origin guard, a per-process five-attempt window keyed by scope plus client IP plus authenticated-session user ID, a 4 KiB body limit, and strict validation. Its own JSON success/validation/disabled responses are `no-store`; shared guard rejections do not uniformly set that header. The limiter is not a durable account-wide ceiling and remains an open production decision.
- [`prisma/migrations/20260912120000_privacy_request_intake/migration.sql`](../prisma/migrations/20260912120000_privacy_request_intake/migration.sql) defines bounded detail, closed request/status/resolution values, consistent resolution state, one active request per account/type, indexes, and account-deletion cascade.
- [`lib/privacy-requests.ts`](../lib/privacy-requests.ts) defines no dedicated email, credential, provider-identifier, diagnostic, identity-document, or export-payload fields, returns an existing active duplicate, and lists only the signed-in user's 20 newest summaries. The optional 1,000-character `detail` is stored verbatim and has guidance but no content filter, so accidental sensitive text remains possible.
- [`lib/privacy-request-monitor.ts`](../lib/privacy-request-monitor.ts) adds one exact-opt-in, aggregate-only database read for `new`/`reviewing` counts, oldest age bands, and resolved counts by closed resolution category. Its returned snapshot has no request ID, user ID, email, detail, mailbox content, provider identifier, or payload. The reader is local-only and is not a route, scheduler, alert, or production activation.
- Candidate Support/Privacy copy routes rights requests away from Sentry. Sentry remains the bug/diagnostics surface.
- Source-level telemetry filtering removes common credential/query fields and avoids request-payload logging; current runtime proof remains open.
- The controlled domain, forwarding aliases, Resend sending domain, and Vercel contact/sender configuration are setting-verified without exposing the destination or secret.

These are source and setting facts, not an operated rights workflow.

## Operational blockers

The first-party lane must remain off because the repository contains no complete operator path:

1. There is no staff/admin endpoint or operator UI. The unmerged candidate privacy service only inserts and lists a user's own records; it has no operator `UPDATE` or `DELETE` path.
2. The status-transition helper in [`lib/privacy-request-contract.ts`](../lib/privacy-request-contract.ts) has no production caller.
3. `acknowledgedAt` is written at record creation. It means **automated receipt**, not human review or acknowledgement.
4. There is no export generator, reauthentication step, secure export-delivery channel, expiry job, correction workflow, mailbox ingestion, mailbox/database deduplication, deletion-assistance executor, consent-withdrawal operator, or response-email implementation.
5. The aggregate monitor source is deployed, but it is not configured, scheduled, runtime-proven, or connected to an alert. The approved review windows are operational policy, not legal age thresholds, so the monitor continues to report age bands without claiming that a case is overdue.
6. [`lib/privacy-retention.ts`](../lib/privacy-retention.ts) does not include `PrivacyRequest`. The September 14 policy now defines queue/register, optional-detail, mailbox-copy, export, exercise, exception, and restore lifetimes, but their deletion/minimization tooling is not implemented.
7. Mail forwarding and outbound reply/sender behavior are configured but unexercised.
8. The approved identity matrix uses the current session for intake/access summary and fresh existing-channel reauthentication for high-risk fulfillment. The required reauthentication/operator tools are missing; former-user or lost-email ambiguity stops at escalation without collecting new identity documents.
9. No backup operator exists and continuous coverage cannot be claimed. The approved pause model triggers when two consecutive review windows cannot be met, but its future exact disable/return procedure is not yet exercised.
10. The five migrations and matching default-off source deployment are complete. Monitor deployment/scheduling, live runtime/provider proof, and every activation remain separate unapproved actions.
11. Optional `detail` has no content filter or redaction path. Because there is also no production `PrivacyRequest` update/delete path or retention sweep, accidental sensitive text cannot currently be redacted or expired except through the account cascade.

## Minimum two-lane operating model

### Lane A — signed-in first-party request

Use the authenticated account only to receive and show a minimized request. The closed request types are:

- `access_summary`
- `data_export`
- `correction`
- `account_deletion`
- `consent_withdrawal`
- `other`

The system may return an existing `new` or `reviewing` record rather than create a duplicate. Treat the created `acknowledgedAt` as a machine receipt. A separate human-review timestamp must be kept in the approved operational register until production resolution tooling exists.

Do not activate Lane A until an operator can securely move a request from receipt through human review, identity assurance, fulfillment, communication, resolution, retention, and deletion.

### Lane B — unable-to-sign-in or former-user mailbox

Use only the verified `privacy@capitolwonk.com` route. Do not route privacy rights through Sentry. Do not copy a message body into multiple systems.

For an existing account, verify control through an authenticated session or the normal account-email channel. Never request a password. Do not request government ID, purchase receipts, provider transaction identifiers, certificates, tokens, or unrelated sensitive data under the current procedure.

If the requester cannot control the account email or an authenticated session, stop at **identity escalation required**. The repository has no approved escalation standard; do not improvise one.

## Proposed private operational register

No live register was created by this preparation. Before use, Tyler must approve its private storage location, least-privileged access, encryption/backup boundary, retention, and deletion procedure. Never place the live register in source control, Sentry, Vercel logs, a public issue, or this documentation tree.

Keep only the minimum fields:

| Field | Rule |
| --- | --- |
| Internal case reference | First-party request ID or a random mailbox case reference; never publish it |
| Lane | `first_party` or `mailbox` |
| Request type | One of the six source-defined types |
| Received time | UTC |
| Machine receipt | Boolean/time; never label it human acknowledgement |
| Human acknowledgement | Nullable UTC time plus operator |
| Identity state | `intake_identity`, `reauthenticated`, `email_control`, `escalation_required`, or `not_applicable`; the final vocabulary needs owner review |
| Workflow status | Map to `new`, `reviewing`, or `resolved` |
| Source boundaries checked | Boolean/category checklist only; no export payload or message body |
| Provider/legal exception | Category and owner only; do not paste provider payloads or legal identity documents |
| Resolution | One of the seven source-defined resolution categories |
| Resolution/closure time | UTC plus human operator |
| Retention/delete-at | Required after the retention decision; never silently indefinite |

Do not store passwords, reset/invite tokens, cookies, DSNs, provider secrets, Apple/Stripe transaction identifiers, raw diagnostic payloads, full export payloads, identity documents, or unnecessary mailbox text in the register.

## Human operating procedure

This procedure becomes executable only after its missing tools/policies and approval gates close.

1. **Receive and classify.** Identify the lane and map the request to one closed request type. If it is ordinary product feedback, route it to Support without copying it into the privacy register. If it is a security report, stop and use the separately approved security escalation path.
2. **Deduplicate.** For Lane A, rely on the active account/type constraint and record whether the existing case was returned. For Lane B, compare minimal metadata in the private register; do not duplicate the message body.
3. **Distinguish receipts.** Record machine receipt separately. Record human acknowledgement only when the owner actually reviews the case and sends or records the approved response.
4. **Verify identity proportionately.** Intake identity is enough to open a case. Before export, correction, deletion, or another account mutation, apply the approved reauthentication/normal-email procedure. Stop on lost-email/former-user ambiguity.
5. **Inventory relevant boundaries.** Use the account-deletion inventory: account/profile, sessions/tokens, saved/activity, Team, subscription, messaging, Brief, deletion audit/cleanup, legacy feedback, provider, and device-local data. Record categories and results, not payloads.
6. **Fulfill only supported scope.** Do not promise or perform an action that lacks an approved tool or provider procedure.
7. **Communicate status.** Use only an approved secure channel and approved templates. Do not send a test or real message under this preparation packet.
8. **Resolve accurately.** Use only `fulfilled`, `partially_fulfilled`, `denied`, `redirected_to_account_deletion`, `withdrawn`, `duplicate`, or `no_action_needed`. Do not mark resolved until the actual action and outstanding provider boundaries are recorded.
9. **Apply retention.** Delete or retain the register entry, queue record, export artifact, and mailbox copies only under the approved schedule and exception rules. Provider expiry does not substitute for CapitolWonk's own lifecycle.
10. **Review aggregate health.** Monitor counts and age bands only. Never emit case IDs, emails, detail, message content, export data, or provider identifiers to logs or alerts.

## Fulfillment boundaries by request type

| Type | Current safe conclusion | Missing before operation |
| --- | --- | --- |
| Access/summary | A data-source inventory exists in the account-deletion and retention packets. | Reviewed response template, identity level, staff read path, provider exceptions, and completion evidence. |
| Data export | There is no dedicated or generated export field, artifact, or delivery path. The optional free-form `detail` field can contain user-pasted export-like content, so it must not be treated or used as an export-delivery channel. | Export generator, reauthentication, review/redaction, secure delivery, short expiry, and deletion verification. Do not email an unencrypted export by default. |
| Correction | User-owned account fields can be distinguished from public-source civic records. | Exact correction map, audit/approval rules, provider propagation, and public-source referral procedure. |
| Account deletion | A default-off in-app deletion design and cleanup outbox exist in source. | Five migrations, worker/monitor, restore phases, provider/concurrency/device QA, activation, and support-assisted authorization. No destructive action is available under this packet. |
| Consent withdrawal | The request type exists. | Inventory of optional processing, exact configuration actions, propagation, confirmation, and proof that required service processing is not misrepresented as optional. |
| Other | A minimized case can be classified. | Approved triage/escalation path; do not collect unnecessary detail while deciding scope. |

## Single-owner contingency

The current contingency is deliberately fail-closed. It does not manufacture a backup operator.

### Activation rule

Do not activate first-party intake while no named backup or approved single-owner absence control exists. Before any future activation, approve all of the following together:

- Tyler's review cadence and realistic availability statement;
- a trigger defined as inability to meet that cadence, not an invented statutory clock;
- either a named least-privileged backup or explicit acceptance that coverage pauses during Tyler's absence;
- preauthorized emergency authority, exact operator, and evidence steps for setting `PRIVACY_REQUEST_INTAKE_ENABLED=false` if the lane is already active;
- a truthful public availability/fallback plan; and
- oldest-first recovery and exception review when normal coverage resumes.

### Planned absence

If Tyler expects to miss the approved cadence and no backup is available:

1. do not activate or widen Lane A;
2. if Lane A is already active, obtain and execute the preauthorized exact disable-and-verification action before the absence; if that authority or verification is unavailable, stop and escalate rather than assuming the gate changed;
3. do not claim continuous monitoring or a fixed response time;
4. prepare any public availability wording locally, but do not deploy it without separate source/deployment approval;
5. preserve mailbox and queue evidence under the approved retention schedule; and
6. resume with the oldest unreviewed case first and record the coverage gap.

### Unexpected absence or loss of access

If Lane A is still off, leave it off. If it was activated in a future separately approved release:

1. record the absence/access incident without personal payload;
2. stop fulfillment and all high-risk mutations;
3. obtain the preauthorized or a new exact configuration approval before disabling intake; never change the flag opportunistically;
4. do not delete pending requests or mailbox copies to reduce the queue;
5. do not share Tyler's credentials, create a forwarding rule, add an operator, or change provider access without separate approval;
6. use read-only aggregate counts only if protected access is already authorized; and
7. escalate for a named temporary operator with least privilege, defined scope, expiry, and independent review.

If mailbox delivery, identity, export confidentiality, or provider state is uncertain, stop. Preserve minimal evidence and present one narrow recovery action. Do not improvise a personal inbox, shared password, unencrypted attachment, Sentry case, public issue, or production database edit.

## Monitoring design — source implemented, not operated

The local monitor exposes only:

- count of `new` requests;
- count of `reviewing` requests;
- oldest age band for each status;
- count resolved by resolution category.

Identity-escalation and provider/legal-decision counts remain intentionally absent because no approved private-register schema exists for them. The monitor does not infer or fabricate those states from free-form detail.

The repository supplies no approved acknowledgement/completion targets, so the implementation does not invent alert thresholds or an `overdue` label. `PRIVACY_REQUEST_MONITOR_ENABLED` must be exact lowercase `true` before any database read; it defaults to `false`. The reader returns only the aggregate snapshot and must never include `id`, `userId`, detail, email, mailbox subject/body, export content, or provider identifiers. Deployment, protected configuration, scheduling, alerts, and a first production read each require separate review.

## Retention decision selected; implementation required

Current source behavior is not a retention policy:

- `PrivacyRequest` persists until account cascade or an unimplemented future lifecycle; resolved records and optional detail have no maximum age.
- Optional `detail` is stored verbatim despite UI minimization guidance; no content filter, staff redaction path, or queue-record expiry exists.
- The scheduled privacy sweep handles expired sessions/tokens, old Team invites, stale cleanup recovery, and separately gated legacy feedback. It does not handle `PrivacyRequest`.
- Forwarding reaches an owner-controlled external inbox whose exact retention/backup/removal behavior is not recorded.
- Resend's documented outbound email/log and backup periods do not prove the forwarding inbox's lifecycle.
- Neon has a setting-verified seven-day history window, so live-row deletion and recoverability must remain aligned with the constrained restore floor.

The [September 14 policy worksheet](privacy-operations-policy-2026-09-14.md#retention-worksheet) now selects the purpose, maximum live period, minimization/deletion action, owner, and verification trigger for each category. The minimal closed-case record is retained for 24 months, while optional detail and mailbox bodies expire 30 days after resolution, mailbox attachments within 7 days of classification, exports within 168 hours, and synthetic exercise data within 24 hours. Implementation and exercise remain required before activation.

## Read-only provider/source continuation

The September 13 source audit adds these bounded conclusions without changing a provider:

- Vercel/Sentry source sanitization is strong, but no representative exact-candidate runtime sample proves retained fields.
- Current application error logging found in the deletion/persistence paths is generic and omits record identifiers; runtime proof remains required.
- Weekly Brief outbound delivery remains deferred. Its authenticated task result currently includes per-recipient records with email, headline, and sometimes error text. Do not schedule or enable it until the result/log/monitor boundary is minimized and separately reviewed.
- Daily Brief video data remains channel-only with no episode/player, so no YouTube player load is part of the exact source today.
- OpenAI defaults to the fallback path in tracked configuration, but the exact protected release value remains unproven.
- Upstash has blank tracked placeholders only; protected runtime enablement remains unproven.

These are source observations, not provider-runtime closure.

## Separate later approvals

Each item below is independent:

1. private register storage/access/retention implementation under the approved September 14 boundary;
2. jurisdiction-specific legal review and any later backup appointment or change to the approved single-owner pause model;
3. staff resolution, reauthentication, export, secure delivery/expiry, monitoring, and `PrivacyRequest` retention source work under the approved policy;
4. one forwarding test message;
5. one outbound sender/reply-path test;
6. any provider removal/expiry exercise;
7. isolated database migration and synthetic privacy lifecycle exercise;
8. constrained-restore phases and temporary-resource cleanup;
9. any later database migration or schema change; Production Batch A is complete;
10. any later source deployment; the matching default-off privacy source and fail-closed verifier containment are deployed;
11. cleanup/retention secret, scheduler, monitor deployment/configuration, and first production monitor or worker invocation;
12. privacy-intake activation;
13. account-deletion, privacy-retention, and legacy-feedback activation/removal—each separately;
14. each real access/export/correction/deletion/consent/provider mutation under the approved operational authority;
15. App Privacy/public-copy changes, remote asset replacement, upload, distribution, submission, and release—each separately; and
16. every Apple/signing/device action after Apple guidance is documented and one narrow action is approved.

Approval to prepare this document grants none of them.

## Readiness decision and next safest action

| Area | Decision |
| --- | --- |
| Technical intake design | Ready for isolated review; not production-operated |
| Mailbox/domain configuration | Setting-ready; delivery and retention unproven |
| Human operations | Owner policy approved; tooling and synthetic exercise not ready |
| Single-owner coverage | Pause model approved; no-go for activation until its exact disable/return procedure is implemented and exercised |
| Retention and monitoring | Aggregate source deployed and policy selected; protected configuration, scheduling, retention tooling, and runtime proof remain open |
| Production migration/deployment/activation | Five migrations and default-off source deployments complete; every activation remains unauthorized and off |

Next safest action: keep the lane disabled and implement an isolated synthetic lifecycle harness against ephemeral PostgreSQL using the approved September 14 policy. Validate register-field allowlisting, machine-versus-human acknowledgement, identity escalation, status transitions, resolution, detail minimization, expiry, absence pause/return evidence, and aggregate-only monitoring. A delivery exercise, monitor protected configuration, scheduler, production read, or activation should not be the next action.

October 30 remains the target, but it is low-confidence and materially at risk. Privacy operations are now specified well enough to expose the remaining work; they are not a substitute for Apple signing, issue #447 remediation, operator/runtime/provider proof, retention and activation decisions, sandbox/device QA, asset recapture, App Review submission, or review time.
