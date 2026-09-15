# Privacy-request operator boundary and Vercel pause/return runbook — September 14, 2026

Status: **the guard, dispatcher core, fail-closed stdin shell, explicit-dependency service adapter, database-access contract, function boundary, atomic migration/ACL review, and inert role-bootstrap review are deployed after PRs #17 and #19–#25; no production binding exists.** The deployed explicit-dependency service adapter composes only the existing lifecycle and aggregate-monitor services, requires its caller to inject every dependency, and remains disconnected from the stdin shell. The database-access contract selects a function-mediated dedicated non-owner principal as the future boundary; PR #25 deployed the source-only inert role definitions without executing them. The next local [ambient-privilege preflight review](privacy-request-operator-ambient-privilege-preflight-review-2026-09-14.md) validates only a guarded aggregate read in ephemeral PostgreSQL and remains outside Prisma migrations. This packet does not authorize a protected value, production role or database connection, target inspection, ACL remediation, migration, scheduler, production read/write, mailbox/provider action, retention run, intake activation, or Vercel setting change.

The machine-readable companion is [`privacy-request-operator-boundary-2026-09-14.json`](privacy-request-operator-boundary-2026-09-14.json). The existing [privacy-operations policy](privacy-operations-policy-2026-09-14.md) remains controlling where this packet is silent.

## Decision

Keep the local, server-only operator command behind the exact opt-in gate and separate service composition from any executable or production binding. The repository contains the pure authorization guard, closed parser/dispatcher core, a fail-closed stdin shell whose adapter cannot perform an action, a deployed adapter factory that accepts only explicit dependencies, and a source-only contract for its future least-privilege database boundary. No credential or production path exists.

The runner boundary is:

- local/server command only; no `app/` route, browser surface, client import, webhook, cron, or general-purpose SQL shell;
- exact `PRIVACY_REQUEST_OPERATOR_RUNNER_ENABLED=true` plus exact `PRIVACY_REQUEST_OPERATIONS_ENABLED=true` before any operator action;
- exact `privacy_owner` role, mapped to Tyler only under the current single-owner policy;
- one case and one closed-vocabulary action per invocation; no batch mutation;
- `PRIVACY_REQUEST_MONITOR_ENABLED=true` additionally required for `queue_summary`;
- `CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED=true` additionally required for `retention_apply`;
- a single JSON document over standard input for case instructions; no payload or credential in command-line arguments or a persisted command file; and
- aggregate queue output or a minimized single-case status only. Contact values, request detail, mailbox bodies, export artifacts, provider identifiers, credentials, and raw errors must not leave the process.

All gates remain `false`. The guard and dispatcher core have no database, credential, provider, mail, route, scheduling, or logging binding. The separately checked stdin shell has an intentionally unbound adapter, so even an allowed local command returns only `operator_action_failed`. The deployed explicit-dependency service adapter is not imported by the shell or an application route and cannot discover a database, credential, environment, or clock. Every executable or production binding remains a new reviewed source action.

## Least-privileged production binding — source contract only; execution absent

A production binding must be implemented and approved separately. The source-only database-access contract selects a dedicated non-owner principal with only exact-database `CONNECT`, exact-schema `USAGE`, and `EXECUTE` on narrowly scoped operator functions. Direct table DML is not approved: PostgreSQL `DELETE` is not column-scoped, so granting the current fixed query path table-level delete capability would exceed the approved due-date predicate. The principal must be different from the migration owner and must not be able to create, alter, drop, truncate, administer roles, install extensions, or access unrelated tables; a migration or restore credential must never be reused as the runner credential.

Any future credential must be short-lived or managed, injected at execution time, and omitted from shell history, command arguments, files, source control, screenshots, Sentry, Vercel logs, terminal transcripts, and retained evidence. The runner must not carry mailbox, Resend, Apple, Stripe, Sentry, or other provider credentials. Exact principal grants, network origin, expiry, revocation, and evidence are unresolved and therefore block production binding.

## Closed action vocabulary

| Action | Additional boundary | Current state |
| --- | --- | --- |
| `queue_summary` | Aggregate counts/age bands only; monitor gate required | Deployed explicit-dependency adapter; shell unbound |
| `open_first_party_case` | Existing request reference only; no account/contact payload | Deployed explicit-dependency adapter; shell unbound |
| `open_mailbox_case` | Minimized type/timestamps/identity state only; never body, subject, address, or attachment | Deployed explicit-dependency adapter; shell unbound |
| `acknowledge` | Human acknowledgement by `privacy_owner` | Deployed explicit-dependency adapter; shell unbound |
| `review` | Closed identity, source-boundary, and exception vocabularies | Deployed explicit-dependency adapter; shell unbound |
| `resolve` | Existing fresh-reauthentication and resolution constraints remain controlling | Deployed explicit-dependency adapter; shell unbound |
| `retention_apply` | Separate retention gate; aggregate counts only | Deployed explicit-dependency adapter; shell unbound |

There is deliberately no arbitrary query, export-generation, mailbox deletion, provider mutation, account mutation, migration, restore, or gate-management action.

## Single-owner trigger

The two approved review windows are 10:00 and 16:00 America/Los_Angeles on business days. An expected inability to complete two consecutive windows, or two unexpectedly missed consecutive windows, invokes the pause model.

If first-party intake is already off, leave it off and record only the sanitized coverage gap. Do not touch Vercel. This is the current production state.

If a future separately approved release has first-party intake active, use the pause procedure below. The procedure is exact but **does not preauthorize its configuration change**.

## Pause procedure — future active lane only

1. Stop high-risk fulfillment and do not open a new provider, export, correction, deletion, or consent mutation.
2. Record, without case/contact data: trigger type, affected review windows, operator, UTC time, current production deployment ID/source SHA, and whether intake is visibly active.
3. Read the Vercel project `capitolwonkce/project-qosv1` Production environment and current deployment. If `PRIVACY_REQUEST_INTAKE_ENABLED` is absent or not exact lowercase `true`, treat the lane as disabled, verify the disabled response, and stop without editing configuration.
4. If and only if the Production value is exact lowercase `true`, present this single proposed change for action-time approval: Production-scoped `PRIVACY_REQUEST_INTAKE_ENABLED` from `true` to exact lowercase `false`. Preview and Development values and every other variable remain unchanged.
5. After that exact approval, edit only that Production value in Vercel. Do not view, copy, rotate, or change any secret.
6. Redeploy the exact already-reviewed current production source SHA so the Production value takes effect. Do not merge new source as part of the pause.
7. Require Vercel `Ready`, the same source SHA, and the expected production domains before verification.
8. Verify all of the following without submitting a request:
   - `GET https://www.capitolwonk.com/api/privacy/requests` returns `503`;
   - `cache-control` is `no-store`;
   - the body code is `PRIVACY_REQUEST_INTAKE_DISABLED` and says no request was submitted;
   - `/privacy/request` shows the inactive first-party fallback;
   - `https://capitolwonk.com/privacy` redirects to canonical `https://www.capitolwonk.com/privacy`; and
   - the controlled mailbox/fallback wording remains truthful.
9. Record only sanitized evidence: approval reference, operator, UTC start/end, deployment ID/source SHA, the one setting name/scope/value, status/header/body code, page result, and any error class. Do not record a request ID, user/account value, email, payload, credential, or provider identifier.
10. Preserve pending queue and mailbox evidence under the approved retention schedule. Never delete requests to reduce the queue.

### Pause abort conditions

Stop without retrying or widening scope if the project/environment, current source SHA, gate state, approver, operator, deployment result, domains, or disabled smoke result is uncertain. A failed or mismatched deployment is an incident; it is not authority to change a second variable, source commit, domain, database, or provider.

## Return prerequisites

Return is never automatic. Before proposing `true`, record that all of these are satisfied:

1. Tyler can personally cover at least the next two scheduled review windows.
2. The coverage gap is recorded and every open case has been re-triaged oldest-unreviewed-first with due dates re-evaluated.
3. The previously approved production lifecycle prerequisites remain intact: operator runner implemented and least-privilege-bound, operations migration applied, monitor available, mailbox/fallback truthful, retention/restore controls verified, and no unresolved identity/export/provider blocker.
4. The exact reviewed source SHA and target Production deployment are identified.
5. No active incident, failed deployment, schema mismatch, monitor anomaly, or unreviewed high-risk mutation remains.
6. One exact return change and its rollback evidence are prepared for action-time approval.

Failure of any prerequisite means leave intake disabled.

## Return procedure — separately approved

1. Present this single proposed change for action-time approval: Vercel project `capitolwonkce/project-qosv1`, Production-scoped `PRIVACY_REQUEST_INTAKE_ENABLED` from exact lowercase `false` to exact lowercase `true`, followed by redeployment of the identified reviewed source SHA. No other setting or environment is included.
2. After that exact approval, edit only that Production value and redeploy only the identified source SHA.
3. Require Vercel `Ready`, the exact source SHA, and expected production domains.
4. Without submitting a request, verify:
   - anonymous `GET /api/privacy/requests` is no longer the disabled `503` and instead preserves the expected authentication boundary;
   - `/privacy/request` shows the active authenticated-intake state or sign-in requirement;
   - responses remain `no-store`; and
   - canonical-domain behavior remains correct.
5. A disposable authenticated production request, outbound message, provider mutation, retention run, or destructive cleanup is not part of this procedure and needs its own exact approval and evidence plan.
6. Monitor and complete the next two review windows, starting with the oldest unreviewed case. Record only aggregate/minimized evidence.

If return verification fails, do not submit a request or improvise a fix. Present the single Production `true` to `false` pause action again for exact approval, then follow the pause procedure.

## Local verification

`pnpm privacy-request:operator-boundary:check` must prove:

- only exact lowercase `true` opens each gate;
- missing, malformed, or partial gate combinations fail closed;
- the single owner role and closed action vocabulary are enforced;
- queue and retention actions require their additional gates;
- the two-window fixtures produce `leave_disabled`, `continue_operating`, or `pause_required` exactly as approved;
- every tracked example gate remains `false`;
- no application route imports or names the operator guard; and
- the contract continues to prohibit a production binding, arbitrary/batch mutation, payload/credential transport, DDL, provider access, and automatic Vercel pause/return.

Passing these checks validates only the local contract, deployed service composition, and source-only database-access boundary. It does not make the transport shell, database, mailbox, provider, monitor, retention path, or Vercel change production-ready.
