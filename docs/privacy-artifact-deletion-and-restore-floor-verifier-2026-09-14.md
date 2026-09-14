# Privacy artifact-deletion evidence and restore-floor verifier — September 14, 2026

Status: **local pure verification only.** No mailbox, export store, database, provider, route, credential, deletion action, restore, or traffic-switch binding exists. The machine-readable companion is [`privacy-artifact-deletion-and-restore-floor-2026-09-14.json`](privacy-artifact-deletion-and-restore-floor-2026-09-14.json).

## Decision

Keep real deletion and recovery actions outside the application until each exact provider/storage procedure is reviewed and approved. Persist only two pure verifiers now:

1. a sanitized mailbox/export deletion-evidence verifier; and
2. a constrained restore-floor verifier that can return only `reject` or `eligible_for_further_recovery_review` while keeping service offline.

These functions do not accept a case reference, account/user identifier, contact value, mailbox content, attachment name/content, export payload/URL, access token, provider identifier, credential, or raw error. They do not read or write a database, delete a file/message/object, call a provider, create a branch, restore a database, or switch traffic.

## Artifact deletion evidence

The closed evidence kinds and deadlines remain the approved policy values:

| Evidence kind | Lifecycle anchor | Deadline | Required sanitized result |
| --- | --- | --- | --- |
| `mailbox_message_and_duplicate_copies` | Case resolution | Resolution + 30 days | Confirmed deletion at or before deadline and zero remaining copies |
| `mailbox_attachment` | Classification | Classification + 7 days at most | Confirmed deletion at or before deadline and zero remaining copies |
| `export_artifact_and_access_token` | Artifact creation | 168 hours or confirmed retrieval, whichever comes first | Confirmed deletion at or before deadline, zero artifact copies, and zero access tokens |

The verifier returns `verified` only when timestamps and aggregate counts are valid, deletion is confirmed, no covered copy/token remains, and the deletion occurred within the applicable window. Every malformed, incomplete, late, or nonzero result is `not_verified` with closed reason codes.

Evidence may retain only the closed artifact kind, sanitized lifecycle/deadline/deletion timestamps, aggregate zero/nonzero counts, decision, and closed reasons. It must not retain the message, attachment, export, token, locator, requester, account, case, or provider identity.

This is an evidence contract, not a deletion implementation. A future real mailbox or export-store action remains provider-specific, destructive, and separately approval-gated at action time. A synthetic fixture passing locally is not proof that a real provider copy was removed.

## Restore-floor verification

The verifier encodes the constrained restore policy already exercised on the isolated Neon child:

1. require a trustworthy newest state and exact project/database target;
2. require the aggregate deletion-watermark query to be verified;
3. reject contradictory, missing, malformed, or count-inconsistent evidence;
4. when a watermark exists, return `reject` immediately if the proposed point is earlier;
5. for an on/after-floor point, require the deletion fixture absent, deidentified completion present, survivor unchanged, expected schema/migrations, reconciled cleanup state, unchanged protected aggregates, no application traffic, and no outbound provider effect; and
6. return at most `eligible_for_further_recovery_review`.

Both decisions carry `serviceState = keep_offline` and `trafficSwitchAuthorized = false`. Eligibility does not authorize a restore, production reset, connection change, deployment, request, or traffic switch.

The durable fixtures reproduce the already approved sanitized time relation:

```text
T-pre    = 2026-09-13T22:26:52.250Z
T-delete = 2026-09-13T22:50:14.926Z
T-post   = 2026-09-13T22:50:20.969Z
```

`T-pre` must return `reject` solely because it is below the preserved deletion floor. `T-post` may return `eligible_for_further_recovery_review` only when every non-time invariant is true. The existing [constrained restore drill](neon-constrained-restore-drill-runbook-2026-09-12.md) remains the source for the approved provider exercise and cleanup evidence.

## Fail-closed limits

- No application route imports or names either verifier.
- No environment gate makes either verifier an executor.
- No arbitrary query, SQL, filesystem, network, mailbox, export, branch, restore, or traffic operation exists.
- No result says `safe`, `approved`, `restored`, or `ready_for_traffic`.
- A zero qualifying-deletion count is usable only with a null watermark, verified target/query, no contradictory evidence, and all applicable non-deletion controls.
- A nonzero qualifying count without a watermark, or a zero count with a watermark, is rejected.
- A timestamp exactly on the deletion floor is not rejected for time, but still must pass every remaining invariant.

## Local verification

Run:

```sh
pnpm privacy-request:artifact-restore-floor:check
```

The check covers exact retention boundaries, retrieval-shortened export expiry, malformed timestamps/counts, incomplete deletion evidence, the historical pre/post restore points, zero-watermark handling, contradictory evidence, every recovery invariant, result minimization, and application-route isolation. It also runs inside `pnpm privacy-request:check`.

Passing this checkpoint closes only the repository-local pure-verifier gap. Real mailbox/export deletion evidence, a future storage/provider adapter, production database binding, production restore evaluation, traffic switching, and every destructive/provider action remain separate.
