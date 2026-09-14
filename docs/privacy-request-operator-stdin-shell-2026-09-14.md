# Privacy-request operator stdin shell — September 14, 2026

Status: **local fail-closed stdin shell only; the adapter is intentionally unbound and no production binding exists.** The machine-readable companion is [`privacy-request-operator-stdin-shell-2026-09-14.json`](privacy-request-operator-stdin-shell-2026-09-14.json).

## Decision

Add only the reviewed command transport around the deployed parser/dispatcher core. The shell reads one JSON document from standard input, rejects an interactive terminal and every command-line argument, enforces the existing 16 KiB byte limit, and writes one minimized JSON result to standard output.

The shell deliberately binds an adapter whose every action fails closed. Even if every exact feature gate is supplied locally, no queue, case, retention, database, mailbox, export, provider, filesystem, network, or configuration operation can occur. Reaching the unbound adapter produces only `operator_action_failed`; its internal fixed exception does not escape.

## Invocation boundary

The local command is:

```sh
pnpm privacy-request:operator:run
```

It accepts the document only through a pipe. Payloads, case references, credentials, and gate values are not accepted as command-line arguments or persisted command files. Interactive standard input, empty or malformed input, multiple JSON documents, unknown fields, and documents larger than 16 KiB return the fixed `invalid_command` result.

The process exits with `0` only for a completed adapter action, `2` for a valid fail-closed or invalid command decision, `3` for `operator_action_failed`, and `4` for an unexpected shell-level failure. In this checkpoint, completed actions are structurally unreachable because the adapter is intentionally unbound.

The shell emits no stderr detail, log, stack, raw exception, contact value, request narrative, mailbox content, attachment, export data, provider identifier, credential, or arbitrary query result.

## Absent capabilities

This checkpoint adds no database adapter, principal, grant SQL, credential, migration, production connection, mailbox/export/provider access, scheduler, application route, public endpoint, Vercel change, deletion, retention operation, restore, traffic switch, or activation. Every privacy, deletion, retention, operations, monitor, and App Store processing gate remains off in tracked configuration.

A service/monitor adapter, least-privileged production principal and credential, protected binding, production migration, real provider/storage evidence, scheduler, live retention run, and any real privacy-request operation remain separate reviewed and approval-gated actions.

## Local verification

Run:

```sh
pnpm privacy-request:operator-stdin-shell:check
```

The check launches the exact entrypoint as a child process and proves the default-off result, malformed and oversized rejection, argument rejection, monitor/retention gate isolation, intentionally unbound all-gates behavior, fixed exit codes, empty stderr, minimized stdout, application-route isolation, and the absence of database, storage, network, provider, subprocess, credential, and logging capability.

Passing and later deploying this source checkpoint validates only the transport shell. It does not authorize production execution, a protected value, a database connection, a migration, a configuration change, provider access, deletion, retention, restore, traffic switching, or activation.
