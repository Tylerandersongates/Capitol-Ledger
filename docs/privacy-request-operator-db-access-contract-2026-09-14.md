# Privacy-request operator database-access contract — September 14, 2026

Status: **source-only least-privilege contract; no principal, credential, grant, connection, migration, shell binding, or activation is included or authorized.** The machine-readable companion is [`privacy-request-operator-db-access-contract-2026-09-14.json`](privacy-request-operator-db-access-contract-2026-09-14.json).

PR #21 deployed the explicit-dependency service adapter to `main` at `f83be73c4fdd34ffb9f8cef2faa68837d3985528`. All three GitHub checks passed; exact-source Vercel production deployment `7HfnCVfeNTjHYvHmiyvkkWNmAyuU` reached Ready, and the canonical-domain gate-off smoke passed. The adapter is still disconnected from the stdin shell and every application route. Every privacy, deletion, retention, operations, monitor, and App Store processing gate remains off.

## Decision

The recommended future database boundary is a dedicated non-owner principal with only `CONNECT` on the exact application database, `USAGE` on the exact application schema, and `EXECUTE` on narrowly scoped operator functions. The principal must not receive direct table DML, schema creation, default privileges, sequence privileges, role membership, role administration, database creation, replication, `BYPASSRLS`, or superuser capability.

This candidate records that decision and the fixed-query ceiling only. It deliberately contains no runnable `GRANT`, `REVOKE`, `CREATE ROLE`, credential, database URL, connection bootstrap, function migration, or shell binding.

## Current fixed-query ceiling

The deployed service adapter can issue eight fixed SQL documents across the seven closed operator actions. Those documents reference only `PrivacyRequest` and `PrivacyRequestOperation`; they accept values only through positional parameters and expose no arbitrary query input.

The current direct-query implementation needs:

- selected intake fields and aggregate queue fields from `PrivacyRequest`;
- updates only to `PrivacyRequest.detail` and `PrivacyRequest.updatedAt` for the approved detail-minimization rule;
- the minimized closed-case columns on `PrivacyRequestOperation` for insert, transition, and output validation; and
- deletion of expired resolved `PrivacyRequestOperation` rows.

That final `DELETE` is a material boundary: PostgreSQL does not offer column-scoped `DELETE`, so granting the current implementation direct delete permission would give the connection broader row reach than the approved due-date predicate. Direct table DML is therefore not approved by this contract. A future source change must mediate each action through narrowly scoped functions or present an equally constrained alternative for separate review.

## Required function-mediated floor

Any future implementation must preserve all of these conditions:

1. One function per closed action or a narrower equivalent; no arbitrary SQL or batch entrypoint.
2. Fixed `search_path`, fully qualified objects, explicit parameter types, and no dynamic SQL.
3. A separate no-login owner for any definer functions; the operator principal cannot own or alter them.
4. `EXECUTE` revoked from `PUBLIC` and granted only to the dedicated operator principal.
5. Exact row predicates, lifecycle checks, fresh high-risk reauthentication, and aggregate/minimized returns remain enforced inside the reviewed boundary.
6. No mailbox body, contact value, export payload, provider identifier, credential, raw error, or unrelated table can enter or leave the function surface.
7. The migration owner and restore credential are never reused by the operator.
8. The credential is short-lived or managed, injected only at execution time, and excluded from arguments, files, source control, screenshots, telemetry, logs, and retained evidence.

The function SQL, role name, grant SQL, network origin, credential issuance/expiry/revocation, migration execution, connection bootstrap, shell binding, and live proof remain unresolved and approval-gated.

## Local verification

Run:

```sh
pnpm privacy-request:operator-db-access-contract:check
```

The check validates the closed machine-readable contract, inventories the eight fixed SQL documents, rejects any table outside `PrivacyRequest` and `PrivacyRequestOperation`, verifies the exact current column ceiling, confirms that every query is a static template with positional values, and preserves the shell/application separation. It uses no database and cannot create or grant a role.

Passing the check proves only that the source contract matches the reviewed query surface. It does not make a production database binding safe or authorized.
