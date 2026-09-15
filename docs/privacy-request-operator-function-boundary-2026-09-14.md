# Privacy-request operator function boundary — September 14, 2026

Status: **deployed source-only function boundary; not a migration and not approved for production execution.** The SQL artifact is [`privacy-request-operator-function-boundary-2026-09-14.sql`](privacy-request-operator-function-boundary-2026-09-14.sql), and the machine-readable contract is [`privacy-request-operator-function-boundary-2026-09-14.json`](privacy-request-operator-function-boundary-2026-09-14.json).

PR #23 deployed this source-only boundary to `main` at merge `e4b82381de44ea2830d1b61e5b498d2a7f438a79`. All three GitHub checks passed; exact-source Vercel production deployment `BsLBiAcwSfnmhnLyTi9tJsaAjwjS` reached Ready, and the canonical-domain gate-off smoke returned the expected apex `308`, canonical `/privacy` `200`, and disabled API `503` with `no-store`.

## Decision

The packet implements one inert PostgreSQL function definition for each of the seven closed operator actions. It moves exact lifecycle predicates, the 15-minute high-risk reauthentication boundary, 30-day optional-detail minimization, 24-month closed-record expiry, and aggregate-only output into the proposed database boundary. The functions reference only `PrivacyRequest` and `PrivacyRequestOperation`, use fully qualified objects, fixed parameter types, `SECURITY DEFINER`, and `SET search_path = pg_catalog, pg_temp`; they contain no dynamic SQL or arbitrary-query input. Lifecycle results declare every output column explicitly rather than returning a table composite, so a future table-column addition cannot silently expand the operator output.

The operator value and action clock are not caller-controlled. Lifecycle writes set the only approved application role, `privacy_owner`, inside the function body, and acknowledgement, review, resolution, queue age, minimization, and expiry decisions use PostgreSQL `statement_timestamp()`. Queue and retention results are aggregate-only; lifecycle calls return one minimized operation record and never expose a user ID, contact value, free-form request detail, mailbox body, export payload, provider identifier, credential, or unrelated row.

## Deliberate non-deployment boundary

The SQL file lives under `docs/`, not `prisma/migrations/`. Its first statement requires the session-local validation marker `capitolwonk.operator_function_boundary_validation=ephemeral-only` and fails before creating a function when the marker is absent. It contains no `CREATE ROLE`, credential, `GRANT`, `REVOKE`, schema creation, default privilege, database connection, service-adapter conversion, stdin-shell binding, application route, scheduler, provider capability, configuration change, or gate activation. The currently deployed services continue to use their existing injected direct-query client and do not import this packet.

The next source-only [migration-review packet](privacy-request-operator-function-migration-review-2026-09-14.md) pins this artifact by digest and reviews the exact ownership and ACL segment required for a future atomic migration. Its statements and any execution remain approval-gated. The production operations migration is still unapplied, and every privacy, deletion, retention, operations, monitor, and App Store processing gate remains off.

## Local verification

Run:

```sh
pnpm privacy-request:operator-function-boundary:check
```

The checker rejects role, credential, grant/revoke, migration placement, shell/application binding, dynamic SQL, non-allowlisted tables, and an unfixed search path. It first proves the SQL fails closed without the validation marker and creates no function. It then sets the marker only inside the ephemeral PGlite session, applies the real intake and operations table migrations, installs the seven source-only function definitions, and exercises first-party and mailbox opening, acknowledgement, review, high-risk reauthentication rejection and success, aggregate queue output, optional-detail minimization, and closed-record expiry with runtime-randomized synthetic identifiers. The database is awaited closed in all outcomes and no production connection is available.

Passing this check proves only the local function semantics. It does not prove ownership or ACL behavior, create a production principal or credential, authorize a migration, bind the operator, or activate processing.
