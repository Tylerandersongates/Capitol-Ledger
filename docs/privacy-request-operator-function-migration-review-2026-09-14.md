# Privacy-request operator function migration review — September 14, 2026

Status: **source-only migration-review candidate; not a Prisma migration and not approved for production execution.** The machine-readable contract is [`privacy-request-operator-function-migration-review-2026-09-14.json`](privacy-request-operator-function-migration-review-2026-09-14.json). It pins the reviewed [function source](privacy-request-operator-function-boundary-2026-09-14.sql) by SHA-256 and pairs it with the guarded [ACL segment](privacy-request-operator-function-migration-acl-2026-09-14.sql).

PR #23 deployed the source-only function boundary to `main` at merge `e4b82381de44ea2830d1b61e5b498d2a7f438a79`. All three GitHub checks passed; exact-source Vercel production deployment `BsLBiAcwSfnmhnLyTi9tJsaAjwjS` reached Ready, and the canonical-domain smoke returned the expected apex `308`, canonical `/privacy` `200`, and disabled API `503` with `no-store`. No database, principal, credential, grant, migration, binding, configuration, or activation changed.

## Review result

The seven `SECURITY DEFINER` functions can be migrated safely only as one transaction with their ownership and ACL hardening. PostgreSQL grants `PUBLIC` function execution by default, so creating the functions in one deployment and revoking access later is not an acceptable sequence. The reviewed composition is therefore fixed as: existing-table preflight, the digest-pinned seven function definitions, the ACL segment, catalog postflight, and one commit. Any failure must roll the entire composition back.

The ACL segment requires two pre-existing, distinct, non-elevated roles:

- `capitolwonk_privacy_function_owner` is a `NOLOGIN` definer owner with no memberships, schema-creation capability, or administrative attributes.
- `capitolwonk_privacy_operator` is the dedicated non-owner principal. Whether it eventually receives a managed login credential is deliberately unresolved and remains a separate lifecycle and network-origin decision.

The earlier access contract correctly denied direct table DML to the operator. This review also makes an implicit PostgreSQL requirement explicit: after ownership transfer, the separate definer owner needs the precise underlying table privileges used by the seven functions. The packet grants that `NOLOGIN` owner only the reviewed column-level `SELECT`, `INSERT`, and `UPDATE` ceiling plus `DELETE` on `PrivacyRequestOperation`, where PostgreSQL cannot scope delete by column. That delete reach is inaccessible to the operator except through the reviewed retention predicate because the owner cannot log in, has no memberships, and owns the fixed functions. The operator receives schema `USAGE` plus `EXECUTE` on exactly seven signatures, no table privilege, and no ownership or alteration right. `PUBLIC` execution is revoked for every signature.

## Deliberate non-deployment boundary

The ACL SQL remains under `docs/`. Its first block requires `capitolwonk.operator_function_migration_acl_validation=ephemeral-only`, verifies both synthetic roles and all seven function signatures, and fails before the first privilege change when a prerequisite is absent. It contains runnable `GRANT`, `REVOKE`, and `ALTER FUNCTION OWNER` statements solely so their exact catalog effect can be reviewed and exercised in ephemeral PostgreSQL. It contains no `CREATE ROLE`, credential, database URL, `CONNECT` grant, schema-wide/default privilege change, migration directory entry, application binding, provider call, scheduler, or gate activation.

The target database must separately prove that `PUBLIC` does not confer schema `CREATE` or table access; this packet does not change shared `PUBLIC` schema ACLs. Role creation, credential lifecycle, network origin, the production operations migration, composition into a production migration, execution, postflight, adapter conversion, protected connection bootstrap, stdin binding, and activation each retain their approval gates. Every privacy, deletion, retention, operations, monitor, and App Store processing gate remains off.

## Local verification

Run:

```sh
pnpm privacy-request:operator-function-migration-review:check
```

The checker verifies the function-source digest, exact role and signature inventory, narrow owner privilege ceiling, absence of role or credential creation, and migration-directory separation. It then creates only synthetic `NOLOGIN` roles and tables in ephemeral PGlite. It proves missing guard and missing-role attempts leave ACLs unchanged, applies both reviewed SQL sources in one transaction, inspects ownership and privileges, executes a write through the operator function surface, and proves that the operator cannot query either table, alter a function, or rely on `PUBLIC` execution. The database is awaited closed in all outcomes and no production connection is available.

Passing this check proves only the reviewed composition and ephemeral PostgreSQL behavior. It does not authorize any role, credential, grant, migration, connection, production execution, or processing activation.
