# Privacy-request operator ambient-privilege preflight review — September 14, 2026

Status: **source-only read-only preflight candidate; no production target was inspected and no production execution is approved.** The machine-readable contract is [`privacy-request-operator-ambient-privilege-preflight-review-2026-09-14.json`](privacy-request-operator-ambient-privilege-preflight-review-2026-09-14.json), and the guarded SQL source is [`privacy-request-operator-ambient-privilege-preflight-2026-09-14.sql`](privacy-request-operator-ambient-privilege-preflight-2026-09-14.sql).

PR #25 deployed the source-only inert role-bootstrap review to `main` at merge `8534c7357bd6bc423d8afced5b0fa3015c2be247`. All three pull-request checks passed; exact-source Vercel Production deployment `63yd38aWH3q382bjoundusTdU8Ep` reached Ready and Current, and the canonical-domain smoke returned the expected apex `308`, canonical `/privacy` `200`, and disabled API `503` with `no-store`. No database, role, credential, grant, migration, binding, configuration, provider, or activation changed.

## Review result

The next prerequisite is not a role or an ACL change. It is a minimized, read-only proof of the exact target baseline. The reviewed query opens an explicit read-only transaction, requires a separate action-time approval marker and exact expected-database setting, and returns one aggregate row. It does not return the database name, executor identity, ACL identities, application rows, customer data, or credential material.

A passing result proves only that:

- the runtime-selected database matches the separately supplied exact expectation;
- `public.PrivacyRequest` and `public.PrivacyRequestOperation` both exist as ordinary or partitioned tables;
- `PUBLIC` does not receive database `CONNECT` or `TEMPORARY`, schema `CREATE`, any direct privilege on either privacy table, or relation, sequence, or routine privileges anywhere else in the application schema;
- neither reviewed privacy role name already exists; and
- the query remained within its read-only, aggregate-only result boundary.

`PUBLIC` schema `USAGE` is reported as an informational boolean but is not a pass condition. The existing database-access decision requires exact operator `USAGE` and denies schema creation and table DML; it did not require a shared-schema `USAGE` revocation. Adding that broader requirement here would exceed the reviewed contract. Database `TEMPORARY` and application-schema relation, sequence, and routine privileges are pass conditions because every role inherits them through `PUBLIC`, which would violate the selected function-only operator boundary even if the two privacy tables themselves were closed.

## Deliberate non-remediation boundary

This packet does not connect to or inspect the production database. Its SQL contains no `GRANT`, `REVOKE`, role DDL, table DDL or DML, default-privilege change, credential, database URL, provider action, migration placement, application binding, scheduler, or gate activation. The expected database is supplied at execution time and only an equality boolean is returned.

If a later, separately approved target run reports `preflightPass = false`, stop. Do not create either role and do not repair a shared ACL automatically. Record only the failed aggregate condition, reconcile application-principal dependencies and rollback impact, and prepare any necessary `PUBLIC` ACL remediation as its own reviewed and approved checkpoint.

The preflight is also intentionally ordered after the two privacy tables exist and before production role creation. Missing tables fail closed; their absence does not authorize migration execution. Production migrations, this target read, shared-ACL remediation, role creation, credential lifecycle, network origin, adapter conversion, protected binding, shell connection, and activation all remain separate gates. Privacy intake, deletion, retention, operations, monitor, and App Store processing remain off.

## Local verification

Run:

```sh
pnpm privacy-request:operator-ambient-privilege-preflight-review:check
```

The checker pins the SQL by SHA-256, rejects mutation statements and Prisma migration placement, and executes the source only in ephemeral PGlite. It proves that a missing approval marker, wrong database expectation, missing table, `PUBLIC` database `CONNECT` or `TEMPORARY`, schema creation, a direct privacy-table or unrelated-table grant, sequence access, routine execution, and either reviewed role-name collision all fail closed. It then proves that the exact reviewed aggregate baseline passes after ephemeral-only setup removes those ambient grants. The ephemeral database is awaited closed in all outcomes, and no production connection is available.

Passing this check validates only the source artifact and synthetic catalog behavior. It does not authorize or evidence a production connection, target inspection, ACL change, role creation, credential, grant, migration, binding, or processing activation.
