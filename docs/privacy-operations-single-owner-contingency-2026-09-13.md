# CapitolWonk Privacy Operations And Single-Owner Contingency — September 13, 2026

Status: **operating design only; not activation-ready and not approved as a public/legal SLA.** Tyler is the sole current privacy-request owner and no backup operator is assigned. The verified `privacy@capitolwonk.com` alias forwards to an owner-controlled external inbox, and source candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` contains the default-off signed-in request queue. Inbound forwarding, send-as/reply delivery, inbox retention/deletion, staff operations, monitoring, export delivery, and absence coverage are not yet exercised or complete. Keep `PRIVACY_REQUEST_INTAKE_ENABLED`, `ACCOUNT_DELETION_ENABLED`, `CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED`, and `CAPITOLWONK_LEGACY_FEEDBACK_RETENTION_ENABLED` off.

This document is an engineering/operations control, not legal advice. Applicable-law review must set any legal due date, extension, exception, hold, appeal, or identity standard. Do not publish a universal statutory deadline from this packet.

## Current Capability And Gaps

### Ready in source/configuration

- Signed-in users can submit one active minimized request per type and see their own recent request summaries when the exact gate is later enabled.
- The submission has no dedicated fields for email, passwords, tokens, receipts, identity documents, provider payloads, or export data. Optional detail is limited to 1,000 characters and warns against those values, but it can still contain user-supplied sensitive content and therefore requires restricted handling and retention.
- The candidate can display the verified privacy alias to users unable to sign in. Current production source does not contain this route. Privacy requests are separated from Sentry product/bug feedback in the candidate.
- Domain verification, the privacy alias, and Production/Preview contact values are configured. No sending secret was exposed or rotated.

### Blocking operation gaps

- There is no staff inbox/dashboard, owner notification, staff status/resolution endpoint, mailbox ingestion/reconciliation, overdue monitor, export generator, secure export-delivery path, correction/consent operator workflow, or support-assisted deletion tool.
- `acknowledgedAt` currently equals the database receipt time. It proves automated receipt, not a human response; never describe it as human acknowledgement.
- Intake permits a session with an unverified email. That is acceptable for receiving a request, but not for disclosing/exporting data or making a sensitive correction/deletion. Fulfillment requires a separate recent verification/reauthentication step.
- `PrivacyRequest` cascades when the account is deleted and cannot serve as the durable cross-channel operations/audit register. Mailbox/former-user requests also cannot enter it.
- Porkbun forwarding is routing, not a mailbox or reply workflow. All four aliases reach one external inbox; privacy folder separation, MFA/recovery, access, retention/deletion, routing, forwarding, and outbound identity have not been exercised.
- Retention is not closed for privacy requests, the external inbox, deidentified deletion receipts, pending cleanup jobs, or legacy feedback.

## Roles And Least Privilege

| Role | Current assignment | Allowed scope |
| --- | --- | --- |
| Accountable privacy owner | Tyler | Triage, verify, communicate, approve fulfillment, operate separately approved tools, and close cases. |
| Continuity contact | **Unassigned activation blocker** | After explicit designation and testing: view aggregate case age/count and escalate. A templated acknowledgement requires audited, temporary case-specific communication access or an approved automated tool. No routine message/body access. |
| Engineering operator | Codex only when explicitly authorized for an exact task | Source/evidence preparation and approved, bounded execution. No standing access or independent legal/fulfillment authority. |
| Legal/security escalation | **Unassigned/decision required** | Review jurisdiction, holds, conflicting claims, breach/legal-process allegations, and deadline exceptions. |

Before activation, Tyler must choose either a trusted trained continuity contact or retained qualified coverage. Give the contact no routine inbox/export access. Use a tested, encrypted, least-privilege break-glass procedure, record who can invoke it, and revoke temporary access after use. If nobody is assigned, keep database intake off and make no 24/7 or continuous-coverage claim.

## Case System Of Record

Treat the current `PrivacyRequest` row as submission/user-status evidence and the email thread as communication evidence—not as the complete operations register.

Before activation, approve an access-controlled, encrypted, backed-up case register outside source control and Sentry. Store only:

- random opaque case ID;
- intake channel and request type;
- app request ID or an opaque case-ID label applied within the mailbox, not a copied provider thread identifier or message content;
- received, human-acknowledged, due, last-action, and resolved timestamps;
- verification state and method class, not verification evidence;
- workflow status and closed resolution code;
- source/provider categories checked;
- approval/escalation references; and
- a pointer to sanitized evidence and temporary export-expiry proof.

Do not store message bodies, attachments, raw emails, passwords, codes, tokens, IDs used for authentication, provider/customer/transaction identifiers, diagnostics, or export payloads in the register. The register itself is a new provider/privacy/backup boundary: approve its provider, administrators, encryption/key ownership, subprocessors, backup/restore, export, deletion, breach recovery, and retention before creating or using it. A keyed/pseudonymous subject reference additionally requires its own construction, key rotation, matching, and App Privacy decision.

Recommended operational-register states are `new`, `verification_needed`, `in_progress`, `waiting_on_requester`, `waiting_on_provider`, `security_or_legal_escalation`, and `resolved`. Map `new`/`verification_needed` to database status `new`; map in-progress/waiting/escalation states to `reviewing`; map closure to `resolved` plus the existing resolution allowlist. Never write the detailed strings into `PrivacyRequest` without a new migration. Any future source/schema change creates a new candidate and requires full review.

## Intake And Triage Procedure

1. Check the restricted privacy folder and app queue at the start and end of each business day. Use two independent private reminders/health checks and record each scheduled check without request payloads.
2. Route messages addressed to `privacy@capitolwonk.com` into the restricted folder. A privacy request misrouted through `info`, `accounts`, or `briefs` keeps its first receipt time and moves into the same queue.
3. Assign a random case ID and record only the minimized fields above. Never copy content into tracked documents, Sentry, logs, or a general task system.
4. Check for cross-channel duplicates by approved reference. Merge duplicates without resetting the original receipt clock; tell the requester which case remains active.
5. Classify the request as access/summary, export, correction, account deletion assistance, consent withdrawal, other question, or legal/security escalation.
6. If prohibited sensitive material arrives, do not echo, forward, or redistribute it. Restrict access, request a sanitized resubmission when appropriate, and follow the approved hold/deletion procedure.
7. `acknowledgedAt` in the app is only the system receipt timestamp. Record human acknowledgement separately.

## Identity Verification

- A signed-in submission establishes account possession for intake only.
- Before disclosing account-specific data or making a correction/deletion, require recent reauthentication or a challenge through the stored, verified account-email channel. Never request a password, government ID, payment receipt, token, verification code, Apple JWS, or provider identifier.
- A mailbox `From` address is not sufficient. Verify through an authenticated session or the stored account email.
- If the requester no longer controls the stored email, stop and use a separately approved exception procedure that minimizes additional identity data.
- Record only verification method class, timestamp, outcome, and operator.
- Conflicting claimants, suspected takeover, minors, legal holds/process, breach allegations, provider disputes, or uncertain authority move to legal/security escalation without disclosure or mutation.

## Internal Time Controls — Proposal For Approval

The internal aging clock starts at first receipt; duplicates do not reset it. A statutory clock may differ by jurisdiction and verification state. These are conservative internal operating targets, not public or statutory promises:

- log/triage by the end of the next applicable business-day triage window for after-hours/weekend receipt;
- human acknowledgement within two business days;
- request any needed verification within three business days;
- target fulfillment within 21 calendar days;
- private age warnings at days 7 and 14; and
- critical owner/continuity/legal escalation at days 18 and 21.

Add a per-case legal due date only after applicable-law review. Use the earlier of that date and the internal target. Pause or extend only when reviewed guidance permits it, and record the reason and time. Do not promise continuous coverage while there is no tested alternate.

## Fulfillment By Request Type

### Access or summary

After verification, provide a category-level inventory of account/app data, purposes, source/provider boundaries, retention/restore limits, and what is outside CapitolWonk control. Do not expose other users or internal secrets.

### Data export

Generate only after fresh verification through a separately reviewed tool. Never store the export in `PrivacyRequest`, Sentry, logs, or ordinary email. Deliver through an approved authenticated, encrypted, expiring channel; record only delivery and expiry proof. A secure delivery provider/path and maximum lifetime are activation blockers.

### Correction

Correct only user-owned account data that cannot be changed safely in the app. Do not silently rewrite public civic/source records CapitolWonk does not own; explain the source boundary and route a source correction when supported. Record fields/categories changed, not old/new personal values.

### Consent withdrawal or optional-feature disablement

Disable only the requested optional feature/preferences through approved product controls. Explain irreversible effects and provider-retained history. Do not treat account deletion as the default substitute.

### Account deletion assistance

Use the gated in-app deletion flow only after its migration, worker, monitoring, provider, restore, and device prerequisites are approved and verified. Never use manual SQL as a support shortcut. A pre-commit failure means the account remains; a post-commit provider failure means the account remains deleted and the cleanup job must retry. Do not discard an aging job. State truthfully that Apple subscription management and provider/recipient retention are separate boundaries.

### Partial, denied, redirected, withdrawn, duplicate, or no action

Use a closed resolution code and a short plain-language explanation. Escalate any legal basis/exception before denial. Do not store unnecessary narrative.

## Communication Rules

- Use `privacy@capitolwonk.com` as an operating channel only after approved inbound routing and a repeatable outbound sender/reply process pass—not merely one synthetic send. Document authorized operator access, sender authentication, reply threading, delivery/failure handling, recovery, and retention/deletion.
- Keep subject lines generic and never include sensitive categories or account identifiers.
- Do not send exports or verification evidence as normal email attachments.
- Preserve the original receipt time across forwarding, alias routing, or duplicate intake.
- State what was completed, what remains provider-controlled, and what the user must do separately. Never claim Sentry item deletion, Apple billing cancellation, recipient-copy deletion, backup erasure, or completion without evidence.

## Single-Owner Absence And Incident Procedure

### Normal coverage

- Tyler checks both intake lanes twice each business day.
- One missed scheduled check triggers a private alert; two consecutive missed scheduled checks trigger the designated, tested continuity route. Until that route exists, the second miss is an activation blocker/escalation failure, not covered operation.
- A planned absence longer than one business day requires a handoff of opaque open-case IDs, age/due dates, and next actions only—never copied bodies or exports.

### Continuity-contact scope

The contact may view aggregate health and escalate. They may send a templated acknowledgement or record a case-specific time-control event only after audited break-glass grants temporary access to that case's communication channel, or after an approved automated acknowledgement tool exists. They may not export or disclose data, change an account, delete an account, inspect provider payloads, modify configuration/gates, or perform a provider/App Store action without case-specific authorization.

### No available alternate

If Tyler is unavailable and no authorized alternate can act before the earliest applicable due date, leave data unchanged, preserve the case, do not claim completion, and escalate to qualified counsel/coverage. Do not silently close, manually delete rows, or improvise identity checks.

### Credential or recovery compromise

Before activation, approve an emergency shutdown procedure naming the exact flags, authorized operator, verification, requester notice, and separate re-enable approval. During a credential/recovery compromise, invoke only that pre-reviewed procedure to freeze new database intake and destructive deletion; preserve mailbox receipts, use pre-recorded account recovery, review access/audit evidence, rotate only through separately approved provider procedures, and resume only after reconciliation. Do not place recovery codes or credentials in this runbook.

## Retention Design — Values Require Approval

Before activation, approve exact periods and legal/security exceptions for:

- temporary export artifacts—recommended shortest feasible lifetime, no more than seven days;
- mailbox working copies and detailed request text—delete through an approved mechanism after verified closure plus a short approved buffer, with backup-expiry proof;
- minimized case receipt/audit record—retain only for a counsel-approved accountability period;
- `PrivacyRequest` rows and their free-form detail—no purge exists today and account deletion cascades them; any deletion mechanism requires reviewed source/migration work, never manual production SQL;
- deidentified `AccountDeletionRequest` completion rows—do not change until restore-watermark needs are reconciled;
- pending cleanup jobs—retain until successful/terminal reconciliation, with alerts rather than silent expiry;
- expired sessions, verification/reset tokens, and Team invitations—the candidate sweep remains default-off pending policy/deployment proof; and
- legacy `BetaFeedback`—retain read-only until private export is verified, then use its separately gated 365-day path only after approval.

Apply documented legal/security holds separately. Review active cases at least weekly against the proposed 21-day target; review long legal/security holds monthly. Deleting an export, mailbox copy, or request detail requires an approved mechanism plus applicable backup-expiry proof—never manual production SQL. Provider expiry is not proof of CapitolWonk deletion, and Resend outbound retention does not define the external forwarding inbox's policy. Preserve deidentified deletion receipts until the constrained-restore watermark policy explicitly permits a change.

## Monitoring Without Payloads

Before activation, add aggregate owner/continuity monitoring for:

- new/unseen case count;
- oldest case age and due-date band;
- verification-waiting and provider-waiting counts;
- cases at days 7, 14, 18, and 21 or the earlier legal threshold;
- failed owner notification/check cadence;
- cleanup jobs with attempts at or above 3; and
- oldest due/processing cleanup job over 15 minutes.

Never include case bodies, emails, names, account/provider IDs, exports, deletion payloads, or exact sensitive request detail in alerts/logs.

## Sanitized Closure Evidence

For each exercised synthetic or real case, retain only the approved minimum: opaque case ID, exact source/deployment, operator and approval reference, timestamps/status/resolution, verification class, categories searched, boolean/count results, provider boundaries disclosed, communication-delivery result, and export-expiry/deletion proof. Do not retain personal identifiers, request content, attachments, credentials, tokens, or provider transaction IDs in engineering evidence.

## Separate Approval Gates

1. Approve this SOP's internal time controls, exact retention schedule, case-register design/provider, continuity contact, legal/security escalation, and break-glass procedure.
2. Approve synthetic inbound-forward and outbound-privacy-sender exercises plus the repeatable operating reply mechanism; verify routing, replies/threading, authentication, authorized access, MFA/recovery, failure handling, retention/deletion, and no cross-alias privacy leakage.
3. Approve a new local source/schema implementation for staff lifecycle, true human acknowledgement, owner alerts/monitoring, reauthentication, export/correction/consent workflows, mailbox reconciliation, and retention purge. Refreeze and fully revalidate that new candidate. If schema/migrations change, invalidate and regenerate the five-migration packet/allowlist before any drill or production request; retain it only if the migration set remains byte-identical.
4. Approve the current exact five-migration isolated drill only while its manifest remains byte-identical and, only after all prerequisites pass, production Batch A.
5. Approve matching default-off source deployment separately; activation remains off.
6. Approve cleanup scheduler/secret/no-payload monitoring and read-only live verification separately.
7. Approve each isolated synthetic lifecycle/export/correction/deletion/provider exercise; destructive deletion and provider mutation require action-time approval.
8. Preserve Apple/signing, App Privacy, upload, distribution, submission, and release gates.
9. Approve each production flag separately: privacy intake, account deletion, retention sweep, and legacy-feedback erasure.

## Activation Exit Criteria

Privacy intake may be presented for activation only when:

- a continuity route and a named legal/security escalation path are assigned and tested within their distinct scopes;
- the case register, internal/legal time controls, and retention periods are approved;
- inbound/outbound privacy-mail exercises and the repeatable operating reply mechanism pass;
- staff lifecycle, verification, secure export, correction/consent, deletion handoff, and monitoring paths are implemented and revalidated;
- the exact migration/source/scheduler/runtime/provider sequence passes its separate gates;
- public policy and App Privacy wording match actual operation; and
- Tyler separately approves the exact activation change.

Until then, the alias may remain configured, but do not newly publish or represent it as an operating rights channel until routing, repeatable outbound reply, retention/access, and coverage pass. Preview visibility is not production intake evidence. If the alias is already public elsewhere, record it as a limited manual-contact risk; do not treat this runbook as approval or claim continuous coverage. Keep the database-backed lane off.
