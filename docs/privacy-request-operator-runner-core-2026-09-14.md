# Privacy-request operator runner core — September 14, 2026

Status: **dispatcher core deployed after PR #19; that checkpoint added no executable entrypoint or production binding.** Merge `b92ad1dde374638f0fd584a2645d4437bd76853c`, all three GitHub checks, exact-source Vercel production deployment `BejdtoqtPvpa9LtbKcz5Y6VSro73`, and gate-off smoke pass. The machine-readable companion is [`privacy-request-operator-runner-core-2026-09-14.json`](privacy-request-operator-runner-core-2026-09-14.json).

## Decision

Prepare and validate the security-critical command parser and dispatcher before adding any standard-input reader, database adapter, credential, principal, production migration, provider capability, scheduler, or application route. The core accepts one closed JSON document as a string, checks the existing exact operator/operations/action gates, and dispatches only to a dependency injected by the caller.

The PR #19 checkpoint did not add the future executable command. Its core cannot read standard input, command-line arguments, the filesystem, a database, a mailbox, an export store, a provider, or the network. It has no logging output and no default adapter. Production binding remains absent.

## Input boundary

The future command transport remains a single JSON document over standard input, but this checkpoint implements only the bounded parser. The document is limited to 16 KiB, rejects arrays, multiple documents, unknown fields, malformed timestamps, non-closed vocabulary, non-owner roles, invalid internal case references, and action-specific contradictions.

Every command contains:

- `commandVersion = 2026-09-14`;
- `operator = privacy_owner`; and
- exactly one closed action.

The parser never accepts an email address, contact value, requester narrative, mailbox body, attachment, export payload, provider identifier, credential, raw error, arbitrary query, or batch mutation. Mailbox intake accepts only a closed request type, a closed identity state, and receipt timestamps. Review and resolution accept only the policy vocabularies already enforced by the operations service.

## Dispatch and output boundary

The dispatcher calls no dependency unless `PRIVACY_REQUEST_OPERATOR_RUNNER_ENABLED=true`, `PRIVACY_REQUEST_OPERATIONS_ENABLED=true`, and every action-specific gate is exact lowercase `true`. `queue_summary` additionally requires the monitor gate; `retention_apply` additionally requires the retention gate.

An injected adapter result must pass a strict runtime output schema before it leaves the dispatcher. The only allowed results are an aggregate queue snapshot, a minimized single-case operations status, or aggregate retention counts. Unknown result fields—including a contact value or provider detail—cause the closed `operator_action_failed` result. Adapter exceptions are replaced with that same fixed failure code; raw messages do not escape.

The dispatcher is therefore testable without implying a usable production tool. No built-in adapter connects it to the existing operations service or monitor.

## Least-privilege access contract

The future production principal remains unresolved and uncreated. Before a binding can be proposed, a separate review must freeze:

1. a principal distinct from the migration owner;
2. exact column/table grants limited to `PrivacyRequest` and `PrivacyRequestOperation` for the closed actions;
3. no create, alter, drop, truncate, role administration, extension administration, unrelated-table access, or arbitrary SQL;
4. a managed or short-lived credential injected only at execution time, never in arguments, command files, source, screenshots, logs, or retained evidence;
5. approved network origin, expiry, revocation, rotation, and emergency-disable evidence; and
6. transaction/locking behavior for one case per mutation.

This document records a candidate access matrix only. It does not approve grant SQL, create a database role, create or transmit a credential, apply the operations migration, or connect the dispatcher to production.

## Local verification

Run:

```sh
pnpm privacy-request:operator-runner-core:check
```

The check covers every action, exact gates, input size/shape, malformed and contradictory commands, timestamp normalization, dependency-call suppression while disabled, strict output minimization, fixed error vocabulary, application-route isolation, and the continued absence of stdio or a production adapter from the dispatcher core itself. It also runs inside `pnpm privacy-request:check`.

Passing and deploying this checkpoint closed only the parser/dispatcher-core gap. The next [stdin-shell checkpoint](privacy-request-operator-stdin-shell-2026-09-14.md) adds a bounded fail-closed transport with an intentionally unbound adapter. A service/monitor adapter, least-privileged production principal and credential, production migration, protected runtime exercise, provider/storage deletion, scheduler, retention run, activation, and any real privacy-request operation remain separate reviewed actions. It does not authorize any external or destructive action.
