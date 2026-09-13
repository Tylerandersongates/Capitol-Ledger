# CapitolWonk Privacy Operations And Single-Owner Contingency — September 13, 2026

Status: **prepared but not operational. First-party privacy intake remains disabled.** Tyler is the sole current privacy-request owner and no backup operator is available. This packet defines the minimum operating model and fail-closed absence response supported by repository evidence. It does not activate intake, create a live case register, access a mailbox, send a message, resolve a request, write production data, change a provider, or authorize account deletion.

This is an engineering and operations packet, not legal advice. A legal/owner review must set applicable response targets, identity escalation, exceptions, and retention. Do not publish a universal deadline from this document.

## Current boundary

| Item | Current evidence |
| --- | --- |
| Source candidate | `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86`; isolated and unmerged in open PR #8; `0c09abc0523e2f4de16f55f4d6d2465d27f4abfa` is the verified predecessor checkpoint, and the documentation-only packet descendant requires its own live-head verification |
| Current branch evidence | Exact-head [CI #321](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34780116093) succeeded and matching Vercel Preview deployment `7d1i8rinVS8iUhUTPUyba4DMwUfy` is Ready |
| Production source | `7ec68bcf142d6defe865c12959b0f9a84fce72d5` |
| First-party activation | Exact opt-in `PRIVACY_REQUEST_INTAKE_ENABLED=true`; blank, missing, `false`, or any other value fails closed before authentication, body parsing, or database access |
| Current activation state | Disabled/inactive |
| Fallback | `privacy@capitolwonk.com` is configured on the controlled domain and forwards to an owner-controlled external inbox; the destination is intentionally omitted |
| Delivery proof | Forwarding and outbound-sender exercises have not been performed |
| Human owner / backup | Tyler / none |
| Apple state | Support reply still pending; certificate, profile, Keychain, signing, and device freeze remains in force |

## What is ready

The candidate contains a technically conservative intake surface:

- [`lib/privacy-request-activation.ts`](../lib/privacy-request-activation.ts) requires exact activation and validates the optional fallback address.
- [`app/api/privacy/requests/route.ts`](../app/api/privacy/requests/route.ts) exposes authenticated user `GET`/`POST` only, applies the shared same-origin guard, a per-process five-attempt window keyed by scope plus client IP plus authenticated-session user ID, a 4 KiB body limit, and strict validation. Its own JSON success/validation/disabled responses are `no-store`; shared guard rejections do not uniformly set that header. The limiter is not a durable account-wide ceiling and remains an open production decision.
- [`prisma/migrations/20260912120000_privacy_request_intake/migration.sql`](../prisma/migrations/20260912120000_privacy_request_intake/migration.sql) defines bounded detail, closed request/status/resolution values, consistent resolution state, one active request per account/type, indexes, and account-deletion cascade.
- [`lib/privacy-requests.ts`](../lib/privacy-requests.ts) defines no dedicated email, credential, provider-identifier, diagnostic, identity-document, or export-payload fields, returns an existing active duplicate, and lists only the signed-in user's 20 newest summaries. The optional 1,000-character `detail` is stored verbatim and has guidance but no content filter, so accidental sensitive text remains possible.
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
5. There is no aggregate new/overdue/failed privacy-request monitor and no approved review cadence.
6. [`lib/privacy-retention.ts`](../lib/privacy-retention.ts) does not include `PrivacyRequest`. Queue-record and optional-detail retention are undefined. Forwarded mailbox-copy retention/deletion is also undefined.
7. Mail forwarding and outbound reply/sender behavior are configured but unexercised.
8. Signed-in session identity is sufficient for intake, not automatically for high-risk fulfillment. Former-user, lost-email, export, correction, and support-assisted deletion verification are undefined.
9. No backup operator exists, no temporary-access process is approved, and continuous coverage cannot be claimed.
10. Candidate deployment, the fifth migration, live runtime/provider proof, and activation all remain separate unapproved actions.
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

## Monitoring design — prepared, not implemented

The future monitor may expose only:

- count of `new` requests;
- count of `reviewing` requests;
- oldest age band for each status;
- count requiring identity escalation;
- count awaiting provider/legal decision; and
- count resolved by resolution category.

The repository supplies no approved acknowledgement/completion targets, so this packet does not invent alert thresholds. Tyler/legal review must set the internal targets and exceptions before implementation. The monitor must never include `id`, `userId`, detail, email, mailbox subject/body, export content, or provider identifiers.

## Retention decision required

Current source behavior is not a retention policy:

- `PrivacyRequest` persists until account cascade or an unimplemented future lifecycle; resolved records and optional detail have no maximum age.
- Optional `detail` is stored verbatim despite UI minimization guidance; no content filter, staff redaction path, or queue-record expiry exists.
- The scheduled privacy sweep handles expired sessions/tokens, old Team invites, stale cleanup recovery, and separately gated legacy feedback. It does not handle `PrivacyRequest`.
- Forwarding reaches an owner-controlled external inbox whose exact retention/backup/removal behavior is not recorded.
- Resend's documented outbound email/log and backup periods do not prove the forwarding inbox's lifecycle.
- Neon has a setting-verified seven-day history window, so live-row deletion and recoverability must remain aligned with the constrained restore floor.

Before activation, approve for each category: purpose, maximum live retention, resolved-case retention, optional-detail minimization, export lifetime, mailbox-copy deletion, register deletion, backup/restore treatment, security/legal exceptions, owner, and verification trigger. Then implement and exercise the lifecycle on synthetic data under separate approval.

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

1. private register storage/access/retention decision;
2. owner cadence, targets, legal/jurisdiction rules, identity escalation, and single-owner risk acceptance or backup appointment;
3. staff resolution, reauthentication, export, secure delivery/expiry, monitoring, and `PrivacyRequest` retention source work;
4. one forwarding test message;
5. one outbound sender/reply-path test;
6. any provider removal/expiry exercise;
7. isolated database migration and synthetic privacy lifecycle exercise;
8. constrained-restore phases and temporary-resource cleanup;
9. Batch A production migrations;
10. Batch B matching default-off source deployment;
11. cleanup/retention secret, scheduler, monitor, and first worker invocation;
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
| Human operations | Not ready |
| Single-owner coverage | No-go for activation until the contingency controls are approved |
| Retention and monitoring | Not defined or implemented for privacy requests |
| Production migration/deployment/activation | Not authorized |

Next safest action: keep the lane disabled and have Tyler approve or revise the private-register boundary, review cadence, single-owner absence rule, identity escalation, and retention worksheet. Then implement and validate the missing operator lifecycle locally and on an approved isolated synthetic environment. A delivery exercise, production migration, deployment, or activation should not be the next action.

October 30 remains the target, but it is low-confidence and materially at risk. Privacy operations are now specified well enough to expose the remaining work; they are not a substitute for Apple signing, issue #447 remediation, restore phases, migrations, runtime/provider proof, sandbox/device QA, asset recapture, App Review submission, or review time.
