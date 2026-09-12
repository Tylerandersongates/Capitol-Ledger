# CapitolWonk Privacy-Rights And Sentry Intake Decision — September 12, 2026

Status: **Option 1 selected, implemented, and frozen as local source candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86`; activation and every production/provider action remain unapproved.** Tyler approved the first-party authenticated queue plus verified-email fallback on September 12 and identified himself as the sole privacy-request owner. No backup operator is currently available. The mailbox/provider setup is deliberately deferred from today's critical path, with an October 7–10 working window and a hard completion gate before the planned October 19 App Review submission. Candidate branch `codex/sept12-privacy-neon-candidate` contains the dedicated page/API, minimized schema migration, safeguards, fixtures, corrected Support/Privacy/Sentry copy, and fail-closed database-target guard described below. No push, remote CI/Preview, production migration, deployment, configuration, mailbox/domain creation, message, provider write, App Store Connect edit, questionnaire publication, or release is authorized or completed.

Historical source candidate `3dbba3a260b10924dff254deed7f65a5e392c239` contains the superseded Sentry privacy-request route. Local candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` moves rights requests to `/privacy/request`, remaps any stale direct `privacy-request` feedback source to ordinary Support, and removes the unsupported promise to delete one Sentry feedback item. The new candidate passed the offline frozen install, registry-backed production/full audits with no known vulnerabilities, complete local-preparation release-source suite, Prisma validation/generation, strict TypeScript, full lint, and optimized production build. Its strict protected-runtime wrapper correctly remains blocked on absent App Store/database deployment values. All prior exact-source CI/Preview evidence is stale for these changes, and no new remote evidence exists. Batch B remains blocked on review, operations, exact target/migration evidence, a documented single-owner contingency, verified mailbox/provider, lifecycle procedures, monitoring, fresh CI/Preview, and separate deployment approval.

## Decision Selected

Choose the intake architecture before any source implementation:

1. **First-party authenticated privacy-request queue plus a verified email fallback — selected September 12.** Keep Sentry for bug/diagnostic feedback only. Signed-in users submit a minimized structured rights request to CapitolWonk's database; users who cannot sign in use one dedicated privacy mailbox on an already controlled domain. This creates a small new schema/workflow but provides ownership, status, export/correction/deletion handling, and auditable completion.
2. **Dedicated privacy mailbox only — fastest acceptable fallback.** Remove every privacy-request link to Sentry and open a clearly named mailbox path. Operate and evidence identity verification, deadlines, fulfillment, retention, and deletion manually. This avoids a new application table but creates a mail-provider retention boundary and weaker in-app status/retry evidence.
3. **Keep Sentry as intake with narrower wording — not eligible as the sole rights channel.** It may remain suitable for voluntary bug reports after truthful expiry disclosure, but the current removal/export limitations and optional identifying content do not support the promised rights workflow.

No option may promise individual Sentry feedback deletion unless Sentry provides authoritative, product-specific evidence for the exact account. Deleting an entire diagnostics project is not the default fulfillment procedure.

## Recommended Architecture

### Lane A: signed-in first-party requests

Add a dedicated `/privacy/request` page and authenticated server endpoint that do not call `Sentry.sendFeedback`. Accept a structured request type:

- access/summary;
- export;
- correction;
- account deletion or deletion assistance;
- consent withdrawal/optional-feature disablement; or
- other privacy question.

Use the authenticated session as the account identity. Do not ask the user to re-enter email, password, purchase receipt, government ID, or provider identifiers. Free-form detail should be optional, short, and explicitly warn against passwords, tokens, payment data, medical information, or identity documents.

A minimal proposed record is:

- random request ID;
- nullable account relation with defined deletion behavior;
- request type from a closed allowlist;
- bounded optional detail;
- status from a closed state machine;
- requested/acknowledged/resolved timestamps;
- resolution category; and
- no raw authentication, provider, JWS, certificate, diagnostic, or export payload.

Do not store the completed export in the request row. Generate it on demand after reauthentication, deliver it through a separately approved secure mechanism, and expire it quickly under an exact future policy. Do not put request details in application/Sentry logs.

### Lane B: unable-to-sign-in or former-user fallback

Use one dedicated privacy mailbox on a verified CapitolWonk-controlled domain. The exact address, mail provider, operators, retention, backup behavior, and deletion procedure must be confirmed before publication. Do not invent or publish an address before it exists and has been tested.

For an existing account, verify control through the normal account email channel or an authenticated session; never request a password. If the requester no longer controls the account email, use a separately reviewed escalation procedure that minimizes new identity data. A mailbox submission must be copied into the same operational register or tracked under an equivalent controlled workflow without duplicating message bodies unnecessarily.

### Sentry boundary

Rename and describe `/feedback` as product/bug feedback only. Remove the `privacy-request` support route and privacy-specific source label. Keep replay disabled, the optional email truly optional, and URL query/fragment sanitization. Public copy must say:

- voluntary feedback and diagnostics follow Sentry/provider retention;
- avoiding an email or identifying narrative reduces linkage;
- CapitolWonk does not promise deletion of one Sentry feedback item under the current evidenced product behavior; and
- privacy-rights requests use the first-party route or dedicated mailbox, not Sentry.

The legacy database `BetaFeedback` table is a separate historical store with a separately gated retention sweep. Do not conflate its erasure with current Sentry User Feedback.

## Required Operating Procedure

Before activation, assign a human privacy-request owner and preferably a backup. Tyler is the sole current owner; because no backup is available, document an absence/incident contingency and do not claim continuous coverage. Define and test:

1. intake acknowledgement and duplicate/idempotency handling;
2. authenticated identity verification without collecting excess identity data;
3. a source inventory for account, profile, sessions/tokens, saved/activity, Team, subscription, messaging, Brief, deletion, legacy feedback, provider, and device-local data;
4. access/export generation and secure delivery;
5. correction boundaries, including public-source civic data that CapitolWonk does not own;
6. deletion handoff to the gated in-app flow or an authorized support-assisted path, with Apple/Stripe/email/official/Sentry boundaries stated truthfully;
7. consent-withdrawal or optional-feature configuration changes;
8. request-status communication and a controlled resolution reason;
9. retention and deletion of the rights-request record and any mailbox copies; and
10. aggregate, no-payload monitoring for new/overdue/failed requests.

Set internal acknowledgement and completion targets only after the owner and applicable legal review are identified. Do not publish a universal statutory deadline from this engineering packet.

## Source And Copy Changes Required For Option 1

- Add the minimized schema/migration, authenticated endpoint, first-party page, status state machine, rate/origin protections, and exact activation gate.
- Change `/support` so `Privacy requests` no longer links to `/feedback`.
- Correct `/privacy` so its deletion description matches the default-off gate, removes the specific-Sentry-report removal promise, and points to the actually enabled rights channel.
- Split readiness tests: Sentry feedback tests prove bug-report safeguards; privacy-rights tests prove authentication, validation, idempotency, no-payload logs, lifecycle, and gate-off behavior.
- Add export/correction/deletion operating fixtures using synthetic accounts only.
- Update the App Privacy/provider-retention evidence and rerun source, TypeScript, lint, build, exact-head CI, matching Preview, and visual/HTTP checks on the new candidate.

Tyler approved these local implementation changes on September 12, which changes the verified source boundary. The rights lane must remain off until its migration, verified mailbox fallback, single-owner contingency, monitoring, provider procedures, and truthful copy all pass. A default-off lane must not leave the Sentry privacy-request link active. Migration, deployment, configuration, activation, and provider actions remain separate approvals.

## Approved Local Implementation Result

The September 12 local source candidate now implements the selected architecture without activating it:

- `/privacy/request` provides a server-gated, signed-in first-party page and shows a `mailto:` fallback only when `PRIVACY_REQUEST_EMAIL` is a syntactically valid, explicitly configured address. The sample value is blank, so no address is invented or published.
- `/api/privacy/requests` fails closed with no-store `503` responses unless `PRIVACY_REQUEST_INTAKE_ENABLED` is exactly `true`; the check occurs before authentication, body parsing, or database work. When active it requires a persisted production session, same-origin mutation, an account-keyed five-per-day limit, a 4 KiB body ceiling, a strict request-type allowlist, and at most 1,000 characters of optional detail.
- `PrivacyRequest` stores no email, password, provider identifier, diagnostic payload, export payload, or identity document. It has account identity by foreign key, closed request/status constraints, acknowledgement/resolution timestamps, a race-safe partial unique index for one active request per account/type, and an account-deletion cascade.
- The user-facing response returns the existing active record instead of creating a duplicate. The page lists only the signed-in account's twenty most recent minimized summaries.
- Support and Privacy now point to the dedicated route. The unsupported individual-Sentry-item deletion promise and privacy-specific feedback label/link are removed; stale direct feedback URLs are treated as ordinary Support feedback.
- The release-source chain includes focused activation, validation, idempotency, lifecycle, routing, migration, deletion-cascade, and no-payload-log checks. The isolated pnpm 9 frozen install, privacy fixtures/readiness, Prisma formatting/validation/generation, full TypeScript, full lint, feedback readiness, complete release-source matrix, production build, and `git diff --check` pass locally. Gate-off localhost smoke returned `200` for `/privacy/request`, `/privacy`, and `/support`; both privacy API methods returned no-store `503` with `PRIVACY_REQUEST_INTAKE_DISABLED`, including a malformed POST that was not parsed. The pages exposed the dedicated link, corrected Sentry statement, disabled-lane notice, and no invented mailbox. Real-PostgreSQL intake/lifecycle execution remains pending because the isolated branch migration and fixture phase has not been approved or performed.

This is only the intake and user-status surface. It intentionally does not add a staff resolution endpoint, data-export generator, mailbox ingestion, response email, monitoring job, or production configuration. Those operations require the recorded owner, a single-owner absence/incident contingency while no backup exists, legal/process decisions, an actual controlled mailbox, provider-retention evidence, synthetic operating exercises, and separate production approvals. The public route truthfully says the first-party lane is inactive and no fallback mailbox is published while both default values remain off/blank.

## Option Comparison

| Criterion | First-party queue + mailbox fallback | Mailbox only | Sentry intake |
| --- | --- | --- | --- |
| Clear rights-request ownership/status | Strong | Manual | Weak/unproven |
| Signed-in identity verification | Strong | Email-dependent | Not established |
| Individual request lifecycle | Controlled | Provider/manual | Sentry item removal unsupported/unproven |
| New schema/source work | Moderate | Low | Low |
| New provider boundary | Mailbox fallback | Mailbox | Existing Sentry |
| App Store/public-copy defensibility | Strong after evidence | Acceptable after evidence | **Insufficient as sole channel** |
| Recommended | **Yes** | Contingency | No |

Estimated hands-on implementation is approximately **1–2 working days** for the minimal first-party lane, source/copy checks, and synthetic fixtures, plus provider/owner setup and any review rework. This is outside the prior 7–13-day product/release baseline and would create a new candidate requiring fresh CI/Preview evidence. The mailbox-only path is smaller in source but not necessarily faster operationally if ownership, provider retention, and verification remain unresolved.

## Decision Record

| Field | Record |
| --- | --- |
| Preparation authorization | Approved by Tyler September 12, 2026 |
| Recommended option | Option 1: first-party authenticated queue plus verified email fallback |
| Implementation selection | **Option 1 approved by Tyler September 12; local implementation completed** |
| Exact mailbox/domain/provider | Deferred to the October 7–10 working window; hard gate before the planned October 19 submission; do not publish an invented address |
| Privacy-request owner and backup | Tyler is the sole owner; no backup is currently available, so a documented single-owner contingency is required before activation |
| Source/schema implementation | Frozen locally at `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86`; not pushed, remotely CI/Preview-verified, deployed, migrated, configured, or activated |
| Provider implementation | Not approved or performed |
| Sentry individual-feedback deletion claim | Removed in the local copy; fresh source/runtime review pending |
| Batch B status | Blocked until the new candidate passes full review and the lane is operated, evidenced, configured, and separately approved for deployment |
