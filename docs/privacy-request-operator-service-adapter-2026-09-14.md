# Privacy-request operator service adapter — September 14, 2026

Status: **local explicit-dependency adapter only; it is not bound to the stdin shell or production.** The machine-readable companion is [`privacy-request-operator-service-adapter-2026-09-14.json`](privacy-request-operator-service-adapter-2026-09-14.json).

## Decision

Compose the deployed parser/dispatcher contract with the already-reviewed privacy operations and aggregate-monitor services, but require the caller to inject the database client, environment, and clock. The adapter factory cannot discover a database URL, resolve a Prisma client, load a credential, or select a production environment.

The adapter covers the seven closed actions: aggregate queue summary, first-party case opening, mailbox case opening, acknowledgement, review, resolution, and retention. It adds no new query text or data field. The underlying service contracts continue to limit persisted data to the minimized `PrivacyRequest` and `PrivacyRequestOperation` boundaries and validate the runner's closed output schemas.

## Deliberate separation

The fail-closed stdin shell remains intentionally unbound and does not import this adapter. No application route imports it. There is no production principal, grant SQL, credential, database URL read, connection bootstrap, public route, scheduler, provider/mail/export access, filesystem access, network client, logging sink, migration execution, configuration change, or activation.

Supplying a synthetic database and exact local gates can exercise the adapter in tests. That proves only service composition; it does not authorize a production database connection or make the operator executable usable against live data.

## Local verification

Run:

```sh
pnpm privacy-request:operator-service-adapter:check
```

The check uses only an injected synthetic database client. It proves that a disabled runner reaches no database method, all seven allowed actions map to the existing services, only schema-validated minimized records or aggregate counts leave the dispatcher, and neither the stdin shell nor application routes import the adapter. Static checks reject default database resolution, environment reads, credentials, network/filesystem/subprocess access, and logging.

## Still approval-gated

A least-privileged production principal and credential, grant SQL, connection bootstrap, stdin-shell binding, production operations migration, real mailbox/export deletion evidence, provider exercise, scheduler, live monitor read, retention run, configuration change, and any activation remain separate reviewed actions. Every privacy, deletion, retention, operations, monitor, and App Store processing gate remains off in tracked configuration.
