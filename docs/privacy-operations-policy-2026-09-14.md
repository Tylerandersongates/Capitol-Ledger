# CapitolWonk Privacy Operations Policy — September 14, 2026

Status: **owner decisions are implemented in default-off source and the isolated synthetic lifecycle passes; production operation and every activation remain off and unauthorized.** This policy closes the decision gap for the private-register boundary, review cadence, single-owner absence rule, identity escalation, and retention worksheet. The source implementation does not create a production register, apply its migration, read or write production data, access a mailbox, send a message, deploy a scheduler, run the aggregate monitor, activate privacy intake, or authorize any real request fulfillment.

The machine-readable companion is [`privacy-operations-policy-2026-09-14.json`](privacy-operations-policy-2026-09-14.json). It is configuration evidence for fixtures and future implementation, not runtime configuration.

This is an engineering and owner operating decision, not legal advice. Jurisdiction-specific counsel can impose a shorter response clock, a longer minimum record period, a different verification standard, or an exception. Those requirements override the internal targets below and must be recorded without placing legal advice or requester payloads in source control.

## Decision basis

- California's current recordkeeping rule says a covered business must retain a minimized record of consumer requests and responses for at least 24 months and limits use of that record to compliance purposes. CapitolWonk therefore uses 24 months for the minimal closed-case audit record, without retaining request bodies or export payloads for that entire period. See [California Privacy Protection Agency, CCPA effective January 1, 2026, § 7101](https://cppa.ca.gov/regulations/pdf/ccpa_statute_eff_20260101.pdf).
- GDPR Article 5 requires data minimization, storage limitation, integrity, and confidentiality. That supports deleting free-form detail, mailbox copies, attachments, and export artifacts sooner than the minimal audit record. See [Regulation (EU) 2016/679, Article 5](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679).
- Identity checks must be reasonable and proportionate. Existing authenticated or account-email control is preferred; formal identity documents are not part of this procedure. See the [UK ICO identity guidance for access requests](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/subject-access-requests/a-guide-to-subject-access/).

## Approved operating boundary

| Decision | Approved rule |
| --- | --- |
| Human owner | Tyler is the sole privacy-request owner. No backup operator is claimed. |
| Coverage | Single-owner pause model. The first-party lane remains off whenever the review cadence cannot be met. |
| Production register | A future dedicated, server-only operations record in the same controlled Neon project as the request queue. It must be reachable only through a least-privileged operator path and must never be exposed through a public route, client bundle, Sentry, Vercel logs, a shared spreadsheet, or source control. |
| Current register state | The minimized schema, closed contract, default-off server service, retention path, and isolated synthetic exercise exist in source. The migration is not applied to production, no operator route exists, and no live register is approved for use. |
| Synthetic register | An ephemeral isolated PostgreSQL database with synthetic identities only. No production clone, mailbox content, provider payload, or real account may be used. |
| Public deadline | None. Internal targets are not published as a universal statutory promise. |
| Activation | Not authorized. `PRIVACY_REQUEST_INTAKE_ENABLED`, `PRIVACY_REQUEST_MONITOR_ENABLED`, and every deletion/retention/App Store gate remain off. |

## Private-register schema boundary

The future production register may contain only:

- an internal case reference;
- `first_party` or `mailbox` lane;
- the closed request type;
- received, machine-receipt, human-acknowledgement, resolution, and delete-at times;
- operator identity;
- a closed identity state and workflow status;
- checked source-boundary categories without payloads;
- a closed exception category;
- a closed resolution category; and
- the basis category for a partial fulfillment or denial.

It must not contain passwords, tokens, cookies, provider secrets, government identity documents, purchase receipts, payment credentials, Apple or Stripe transaction identifiers, raw mailbox bodies, diagnostic payloads, or export payloads. Free-form legal analysis and requester narratives stay out of the register. A mailbox message is minimized into the closed fields; it is not copied wholesale.

The synthetic exercise must use the same field allowlist and must destroy its generated database and any exported evidence containing synthetic case references within 24 hours of exercise completion. Aggregate pass/fail evidence may remain in the repository if it contains no case reference or payload.

## Review cadence and internal targets

When and only when intake is later activated:

1. Review the queue and mailbox each business day by **10:00** and **16:00 America/Los_Angeles**, Monday through Friday, excluding a separately recorded closure day.
2. Human-acknowledge a valid request within an internal target of **two business days**.
3. Record the identity path, applicable jurisdiction/clock owner, source-boundary plan, and expected next update within **five business days**.
4. Set the real response due date from the applicable law and request context; never derive it from the aggregate age band.
5. Work oldest unreviewed requests first, except for a documented security, safety, or legal exception.
6. Review the retention deletion queue monthly once retention tooling exists.

These are operating targets, not public promises and not substitutes for a shorter applicable legal deadline. The aggregate monitor continues to report age bands only; it must not label a request legally overdue.

## Single-owner absence rule

The approved model is to pause, not to imply backup coverage.

- A planned inability to complete **two consecutive review windows** triggers the absence rule. If Lane A is off, leave it off. If it is active in a future approved release, obtain the exact protected-configuration approval and verify the lane is disabled before the first window that will be missed.
- Two unexpectedly missed consecutive windows trigger an operating incident. Stop high-risk fulfillment, preserve minimal evidence, and request one exact disable action if the lane is active. Do not delete requests to reduce the queue.
- Mailbox receipt does not equal monitored coverage. Do not publish continuous-coverage language or an automatic response-time promise while Tyler is unavailable.
- Never share Tyler's credentials, create an ad hoc forwarding rule, add a provider administrator, or appoint a temporary operator without a separate least-privilege access decision with expiry and review.
- Recovery is oldest-unreviewed-first. Record the coverage gap and re-evaluate every open due date before resuming fulfillment.

This policy selects the pause model but does not preauthorize a future Vercel configuration change. The exact disable action remains an action-time approval unless a later reviewed emergency runbook grants narrower authority.

## Identity and escalation matrix

| Request/action | Approved identity rule | Current executable state |
| --- | --- | --- |
| Open a signed-in request | Current persisted authenticated session. | Source exists; intake remains off. |
| Open a mailbox request | Control of the normal account-email channel can establish intake identity only. | Forwarding exists; delivery exercise remains pending. |
| Access summary | Current authenticated session; disclose categories, not high-risk export payloads. | Operator read path/template missing. |
| Data export | Fresh reauthentication through the existing account channel within 15 minutes of generation and again before delivery if the session expires. | Generator, reauthentication proof, delivery and expiry tooling missing. |
| Correction | Fresh reauthentication within 15 minutes for account-owned fields. Public-source civic corrections are referred to the authoritative source. | Operator mutation map/tool missing. |
| Account deletion | Fresh reauthentication and the separately approved in-app deletion path; support-assisted deletion remains unavailable. | Gate and destructive QA remain off. |
| Consent withdrawal | Current session for low-risk preference changes; fresh reauthentication for an account/provider mutation. | Exact operator map/tool missing. |
| Lost email, former user, or conflicting identity | Stop at `escalation_required`. Do not confirm account existence, fulfill, or collect a government ID, purchase receipt, payment data, or provider identifier. | No escalation method approved; case remains open or is accurately denied under reviewed authority. |

If the available evidence is insufficient, the safe result is no fulfillment. Identity evidence may be used only for verification and must not become a new profile field.

## Retention worksheet

| Category | Purpose | Maximum live period | Delete/minimize action | Owner and verification |
| --- | --- | --- | --- | --- |
| Open queue/register record | Operate and evidence the unresolved request. | Until resolved, withdrawn, or accurately closed. | Review monthly; never silently abandon or delete an open case. | Tyler; monthly review. |
| Minimal closed-case audit record | Evidence date, nature, channel, response, resolution and denial basis where applicable. | **24 months after resolution.** | Delete the case-linked record at expiry unless a documented exception applies. | Tyler; monthly expiry report. |
| Optional first-party detail | Understand the request while avoiding a long-lived free-form payload. | Resolution plus **30 days**. | Redact or clear the detail while retaining only closed categories in the minimal audit record. | Tyler; automated expiry plus monthly aggregate verification. |
| Mailbox message body | Receive and classify Lane B. | Resolution plus **30 days** after the minimal record is complete. | Delete the message and duplicate copies; retain no body in the register. | Tyler; mailbox deletion check. |
| Mailbox attachment | Temporary classification only; identity documents are not accepted. | **7 days after classification** at most. | Delete immediately when unnecessary and never copy it into the register. | Tyler; case checklist. |
| Export artifact | Secure, short-lived delivery after reauthentication and review. | **168 hours (7 days)** or confirmed retrieval, whichever comes first. | Delete the artifact and access token; keep only delivery category/time. | Tyler; per-case deletion evidence. |
| Synthetic exercise data | Validate lifecycle without real people or production boundaries. | **24 hours after exercise completion.** | Destroy the isolated database and case-level evidence; retain aggregate results only. | Exercise operator; cleanup verification. |
| Security/legal exception | Preserve only what an exact obligation requires. | Re-evaluate every **30 days**; never indefinite by default. | Record category, authority owner, next review, and release condition without privileged advice or payload. | Tyler plus counsel/security owner where applicable. |
| Backup/restore residue | Recover service without reviving expired rights data. | Current Neon history window is **7 days**. | Every restore must reapply the recorded privacy deletion floor before serving traffic. | Restore operator; post-restore verifier. |

The 24-month audit period does not authorize retaining the original message, optional detail, export, identity evidence, or unrelated account data for 24 months. The record is compliance-only and must not be reused for product analytics, marketing, personalization, or training.

## Implementation and exercise gates

Before any production activation, implementation must provide and test:

1. a server-only operator transition path with least privilege and an auditable closed vocabulary;
2. separate machine-receipt and human-acknowledgement timestamps;
3. recent-session reauthentication for high-risk actions;
4. optional-detail minimization and closed-case expiry;
5. mailbox-copy and export-artifact deletion evidence;
6. a restore verifier that reapplies the privacy deletion floor;
7. aggregate cadence/retention evidence without identifiers; and
8. the single-owner pause/return runbook.

The next approved engineering activity may be an isolated synthetic lifecycle harness against ephemeral PostgreSQL. It may create only synthetic records, must not use a production clone or protected provider credential, and must not send mail, call Apple/Stripe/Sentry, change Vercel configuration, or activate a production gate. A real provider exercise, production monitor read, scheduler, retention run, or request fulfillment remains separate.

## Implemented source and synthetic evidence

The September 14 source candidate adds a separate `PrivacyRequestOperation` model and migration containing only the approved field allowlist. Closed database checks enforce the lane, request type, role, identity state, workflow status, source-boundary categories, exception category, resolution state, human-acknowledgement relationship, high-risk identity state, and the exact 24-month delete-at rule. The service has no public route and requires the exact `PRIVACY_REQUEST_OPERATIONS_ENABLED=true` opt-in before any database call. Retention additionally requires the existing exact retention gate.

`pnpm privacy-request:synthetic-exercise` runs the real migration SQL in PGlite `0.5.8`, an ephemeral PostgreSQL WASM runtime. It covers a signed-in high-risk fulfillment, a mailbox identity escalation, the exact 15-minute reauthentication boundary, 30-day detail minimization, 24-month closed-record expiry, invalid-category rejection, and both default-off gates. Case references, the synthetic identity, and optional detail are randomized in memory; the command emits only an aggregate pass/fail line and awaits database close in all outcomes. See the [exercise record](privacy-request-operations-synthetic-exercise-2026-09-14.md).

This completes the source portion of the first four implementation gates and adds aggregate retention evidence plus the two-window pause decision. It does **not** complete a least-privileged production binding, production migration, mailbox/export artifact deletion, restore-floor verification, exercised Vercel pause/return action, scheduler, live monitor read, provider exercise, or real fulfillment. Those remain separate, approval-gated work.

The pure [operator-boundary and pause/return packet](privacy-request-operator-boundary-and-pause-runbook-2026-09-14.md) is now deployed default-off after PR #17. It specifies the exact Production-scoped Vercel pause/return procedure and validates the two-window decision locally, but it does not preauthorize either configuration change. No executable runner or production binding exists.

The next local checkpoint adds the [artifact-deletion and restore-floor verifier packet](privacy-artifact-deletion-and-restore-floor-verifier-2026-09-14.md). It encodes the approved mailbox/export deadlines and the already-exercised constrained restore floor as pure functions accepting only sanitized timestamps, aggregate counts, and booleans. It cannot delete provider/storage data, read a database, restore a point, or switch traffic. Real mailbox/export deletion evidence, the production binding/migration, provider actions, scheduling, live data, retention operation, and activation remain open.
