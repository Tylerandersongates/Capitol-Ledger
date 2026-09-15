# Privacy-request operator role-bootstrap review — September 14, 2026

Status: **source-only role-bootstrap review candidate; not a Prisma migration and not approved for production execution.** The machine-readable contract is [`privacy-request-operator-role-bootstrap-review-2026-09-14.json`](privacy-request-operator-role-bootstrap-review-2026-09-14.json), and the guarded SQL source is [`privacy-request-operator-role-bootstrap-2026-09-14.sql`](privacy-request-operator-role-bootstrap-2026-09-14.sql).

PR #24 deployed the source-only atomic function-migration/ACL review to `main` at merge `c7424b54232e13def08d1c0350f74d773d33b071`. All three pull-request checks passed; exact-source Vercel production deployment `FRFmoa5DuFiyAaMMEm2Ea1tik8kU` reached Ready and Current, and the canonical-domain smoke returned the expected apex `308`, canonical `/privacy` `200`, and disabled API `503` with `no-store`. No database, role, credential, grant, migration, binding, configuration, provider, or activation changed.

## Review result

The function owner and operator names must be reserved without making either role usable. The reviewed bootstrap therefore creates exactly two roles inside one transaction and gives both the same inert-at-rest floor: `NOLOGIN`, zero connection slots, a null password, already-expired validity, `NOINHERIT`, and no administrative attributes. It creates no membership edge and grants no database, schema, table, sequence, or function privilege.

The bootstrap refuses to adopt or alter a pre-existing role with either reviewed name. That collision rule prevents an unknown role, membership, credential, or privilege history from being silently incorporated into the operator boundary. Any existing name requires a fresh read-only provenance and privilege review; this source then remains unapplied.

The `capitolwonk_privacy_function_owner` role must remain permanently `NOLOGIN`. The `capitolwonk_privacy_operator` role also remains unusable after this bootstrap. A future decision to enable login, raise its connection limit, issue credential material, select a network origin, or define expiry, injection, rotation, revocation, and active-session termination is a separate checkpoint and is not implied by this role reservation.

## Ambient privileges remain a production blocker

PostgreSQL roles can receive effective privileges through `PUBLIC` even when no explicit grant targets the role. Before any production role creation, the exact target database must prove that `PUBLIC` does not confer schema `CREATE` or access to the privacy tables, and the database-level `CONNECT` baseline must be reconciled with the exact-principal contract. This candidate performs no target inspection and does not change shared `PUBLIC` ACLs. Any necessary shared-ACL change requires its own review and approval.

## Deliberate non-deployment boundary

The SQL remains under `docs/`. Its first executable block requires `capitolwonk.operator_role_bootstrap_validation=ephemeral-only`; it then fails on either role-name collision, creates the two null-password `NOLOGIN` roles, verifies exact catalog attributes and membership absence, and commits atomically. It contains no real credential, `GRANT`, `REVOKE`, `ALTER ROLE`, `DROP ROLE`, database URL, `CONNECT` change, default privilege change, schema/table/function creation, production migration placement, connection bootstrap, application binding, provider action, scheduler, or gate activation.

Every production role, credential, database, grant, migration, network, provider, shell-binding, retention, and activation action remains separately approval-gated. Privacy intake, deletion, retention, operations, monitor, and App Store processing remain off.

## Local verification

Run:

```sh
pnpm privacy-request:operator-role-bootstrap-review:check
```

The checker pins the role SQL by SHA-256, rejects broad or out-of-scope statements, and scans Prisma migrations for accidental placement. It then uses ephemeral PGlite to prove that a missing validation marker creates no role, a pre-existing reviewed name prevents any additional role and is not altered, and a clean run atomically creates exactly two roles with the reviewed inert attributes, null passwords, expired validity, zero connection slots, no memberships, and no explicit privileges. The ephemeral database is awaited closed in all outcomes, and no production connection is available.

Passing this check proves only the source artifact and isolated PostgreSQL behavior. It does not authorize or evidence production role creation, shared-ACL remediation, credential issuance, connection, migration, binding, or processing.
