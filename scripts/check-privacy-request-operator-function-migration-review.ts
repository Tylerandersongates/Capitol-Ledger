#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

process.env.TZ = "UTC";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

const contract = JSON.parse(
  read("docs/privacy-request-operator-function-migration-review-2026-09-14.json")
);
const runbook = read(
  "docs/privacy-request-operator-function-migration-review-2026-09-14.md"
);
const functionSource = read(
  "docs/privacy-request-operator-function-boundary-2026-09-14.sql"
);
const aclSource = read(
  "docs/privacy-request-operator-function-migration-acl-2026-09-14.sql"
);
const accessContract = JSON.parse(
  read("docs/privacy-request-operator-db-access-contract-2026-09-14.json")
);
const packageDocument = JSON.parse(read("package.json"));

const functionOwner = "capitolwonk_privacy_function_owner";
const operatorPrincipal = "capitolwonk_privacy_operator";
const bystanderPrincipal = "capitolwonk_privacy_bystander";
const expectedSignatures = [
  "public.capitolwonk_privacy_operator_queue_summary()",
  "public.capitolwonk_privacy_operator_open_first_party(text)",
  "public.capitolwonk_privacy_operator_open_mailbox(text,text,timestamp with time zone,timestamp with time zone,text)",
  "public.capitolwonk_privacy_operator_acknowledge(text)",
  "public.capitolwonk_privacy_operator_review(text,text,text[],text,timestamp with time zone)",
  "public.capitolwonk_privacy_operator_resolve(text,text,text,timestamp with time zone)",
  "public.capitolwonk_privacy_operator_retention_apply()"
];

assert.equal(contract.contractVersion, "2026-09-14");
assert.equal(
  contract.decisionStatus,
  "source_only_function_migration_review_deployed"
);
assert.equal(contract.productionExecutionAuthorized, false);
assert.equal(contract.deploymentEvidence.pullRequest, 24);
assert.equal(
  contract.deploymentEvidence.mergeCommit,
  "c7424b54232e13def08d1c0350f74d773d33b071"
);
assert.equal(contract.deploymentEvidence.deploymentState, "Ready");
assert.equal(contract.deploymentEvidence.deploymentCurrent, true);
assert.equal(contract.composition.singleTransactionRequired, true);
assert.equal(contract.composition.partialInstallationAllowed, false);
assert.equal(contract.composition.productionMigrationIncluded, false);
assert.equal(contract.roles.functionOwner.name, functionOwner);
assert.equal(contract.roles.functionOwner.loginAllowed, false);
assert.equal(contract.roles.functionOwner.membershipAllowed, false);
assert.equal(contract.roles.operatorPrincipal.name, operatorPrincipal);
assert.equal(contract.roles.operatorPrincipal.directTablePrivilegesAllowed, false);
assert.deepEqual(contract.functionAcl.signatures, expectedSignatures);
assert.equal(contract.functionAcl.publicExecuteRevoked, true);
assert.equal(contract.functionAcl.operatorExecuteOnly, true);
for (const table of ["PrivacyRequest", "PrivacyRequestOperation"]) {
  assert.deepEqual(
    contract.functionOwnerTablePrivilegeCeiling[table].selectColumns,
    accessContract.currentFixedQueryCeiling.tables[table].selectColumns
  );
  assert.deepEqual(
    contract.functionOwnerTablePrivilegeCeiling[table].insertColumns,
    accessContract.currentFixedQueryCeiling.tables[table].insertColumns
  );
  assert.deepEqual(
    contract.functionOwnerTablePrivilegeCeiling[table].updateColumns,
    accessContract.currentFixedQueryCeiling.tables[table].updateColumns
  );
  assert.equal(
    contract.functionOwnerTablePrivilegeCeiling[table].deleteAllowed,
    accessContract.currentFixedQueryCeiling.tables[table].deleteAllowed
  );
  assert.equal(contract.functionOwnerTablePrivilegeCeiling[table].truncateAllowed, false);
  assert.equal(contract.functionOwnerTablePrivilegeCeiling[table].referencesAllowed, false);
  assert.equal(contract.functionOwnerTablePrivilegeCeiling[table].triggerAllowed, false);
}

const functionDigest = createHash("sha256").update(functionSource).digest("hex");
assert.equal(functionDigest, contract.functionSource.sha256);
assert.equal(contract.functionSource.definitionCount, 7);
assert.equal(
  contract.aclSource.executionGuardSetting,
  "capitolwonk.operator_function_migration_acl_validation=ephemeral-only"
);

const executableAcl = aclSource.replace(/^--.*$/gm, "");
assert.equal(/^\s*CREATE\s+(?:ROLE|USER|DATABASE|SCHEMA)\b/im.test(executableAcl), false);
assert.equal(/^\s*ALTER\s+(?:ROLE|USER|DATABASE)\b/im.test(executableAcl), false);
assert.equal(/^\s*DROP\s+(?:ROLE|USER|DATABASE|SCHEMA)\b/im.test(executableAcl), false);
assert.equal(/\bGRANT\s+CONNECT\b/i.test(executableAcl), false);
assert.equal(/\bALTER\s+DEFAULT\s+PRIVILEGES\b/i.test(executableAcl), false);
assert.equal(/\bON\s+ALL\s+(?:TABLES|FUNCTIONS|SEQUENCES)\b/i.test(executableAcl), false);
assert.equal(/\bGRANT\s+ALL\b/i.test(executableAcl), false);
assert.equal(/\bCREATE\s+OR\s+REPLACE\s+FUNCTION\b/i.test(executableAcl), false);
assert.equal(/^\s*TRUNCATE\b/im.test(executableAcl), false);
assert.equal(/DATABASE_URL|postgres(?:ql)?:\/\/|credential|password|secret/i.test(executableAcl), false);
assert.equal(
  (executableAcl.match(/REVOKE ALL PRIVILEGES ON FUNCTION/g) ?? []).length,
  7
);
assert.equal((executableAcl.match(/GRANT EXECUTE ON FUNCTION/g) ?? []).length, 7);
assert.equal((executableAcl.match(/ALTER FUNCTION/g) ?? []).length, 7);
assert.equal((executableAcl.match(/OWNER TO capitolwonk_privacy_function_owner/g) ?? []).length, 7);
assert.match(executableAcl, /GRANT USAGE ON SCHEMA public TO capitolwonk_privacy_operator/);
assert.doesNotMatch(
  executableAcl,
  /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE)[^;]*TO capitolwonk_privacy_operator\s*;/i
);

const referencedTables = [
  ...new Set(
    [...executableAcl.matchAll(/public\."([A-Za-z0-9_]+)"/g)].map(
      (match) => match[1]
    )
  )
].sort();
assert.deepEqual(referencedTables, ["PrivacyRequest", "PrivacyRequestOperation"]);

for (const value of Object.values(contract.candidateBoundary)) {
  assert.equal(value, false);
}
assert.equal(contract.validation.ephemeralPostgresOnly, true);
assert.equal(contract.validation.syntheticRolesOnly, true);
assert.equal(contract.validation.productionConnectionUsed, false);
assert.match(runbook, /not a Prisma migration and not approved for production execution/i);
assert.match(runbook, /contains no `CREATE ROLE`, credential, database URL/i);
assert.match(
  packageDocument.scripts[
    "privacy-request:operator-function-migration-review:check"
  ],
  /check-privacy-request-operator-function-migration-review\.ts/
);
assert.match(
  packageDocument.scripts["privacy-request:check"],
  /check-privacy-request-operator-function-migration-review\.ts/
);

const migrationRoot = path.join(repositoryRoot, "prisma", "migrations");
for (const entry of fs.readdirSync(migrationRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const migrationPath = path.join(migrationRoot, entry.name, "migration.sql");
  if (!fs.existsSync(migrationPath)) continue;
  const migrationSource = fs.readFileSync(migrationPath, "utf8");
  assert.equal(
    migrationSource.includes("capitolwonk_privacy_function_owner"),
    false,
    "the reviewed function owner must remain outside Prisma migrations"
  );
  assert.equal(
    migrationSource.includes("capitolwonk_privacy_operator_queue_summary"),
    false,
    "the reviewed function bundle must remain outside Prisma migrations"
  );
}

type BooleanRow = { allowed: boolean };

async function privilege(
  database: PGlite,
  role: string,
  signature: string
) {
  const result = await database.query<BooleanRow>(
    "SELECT pg_catalog.has_function_privilege($1, $2, 'EXECUTE') AS allowed",
    [role, signature]
  );
  return result.rows[0]?.allowed;
}

async function main() {
  const database = await PGlite.create();
  const userReference = randomUUID();
  const firstPartyReference = randomUUID();
  const mailboxReference = randomUUID();
  const retentionReference = randomUUID();
  const expiredOperationReference = randomUUID();
  const intakeMigration = read(
    "prisma/migrations/20260912120000_privacy_request_intake/migration.sql"
  );
  const operationsMigration = read(
    "prisma/migrations/20260914150000_privacy_request_operations/migration.sql"
  );

  try {
    await database.exec('CREATE TABLE public."User" ("id" TEXT NOT NULL PRIMARY KEY);');
    await database.exec(intakeMigration);
    await database.exec(operationsMigration);
    await database.query(
      "SELECT pg_catalog.set_config('capitolwonk.operator_function_boundary_validation', 'ephemeral-only', false)"
    );
    await database.exec(functionSource);
    await database.exec(`CREATE ROLE ${bystanderPrincipal} NOLOGIN`);
    await database.exec("REVOKE CREATE ON SCHEMA public FROM PUBLIC");

    assert.equal(
      await privilege(database, bystanderPrincipal, expectedSignatures[0]),
      true,
      "PostgreSQL's default PUBLIC function execution must be demonstrated before hardening"
    );

    await assert.rejects(database.exec(aclSource), /validation-only/);
    assert.equal(
      await privilege(database, bystanderPrincipal, expectedSignatures[0]),
      true
    );

    await database.query(
      "SELECT pg_catalog.set_config('capitolwonk.operator_function_migration_acl_validation', 'ephemeral-only', false)"
    );
    await database.exec(
      `CREATE ROLE ${functionOwner} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`
    );
    await assert.rejects(database.exec(aclSource), /operator principal is absent/);

    const ownerBefore = await database.query<BooleanRow>(
      `SELECT pg_catalog.has_table_privilege($1, 'public."PrivacyRequest"', 'SELECT') AS allowed`,
      [functionOwner]
    );
    assert.equal(ownerBefore.rows[0]?.allowed, false);
    assert.equal(
      await privilege(database, bystanderPrincipal, expectedSignatures[0]),
      true
    );

    await database.exec(
      `CREATE ROLE ${operatorPrincipal} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`
    );

    for (const signature of expectedSignatures) {
      await database.exec(`DROP FUNCTION ${signature}`);
    }

    await database.exec("BEGIN");
    try {
      await database.exec(functionSource);
      await database.exec(aclSource);
      await database.exec("COMMIT");
    } catch (error) {
      await database.exec("ROLLBACK");
      throw error;
    }

    const roles = await database.query<{
      bypassRls: boolean;
      canLogin: boolean;
      createDatabase: boolean;
      createRole: boolean;
      replication: boolean;
      role: string;
      superuser: boolean;
    }>(
      `
        SELECT
          rolname AS role,
          rolcanlogin AS "canLogin",
          rolsuper AS superuser,
          rolcreatedb AS "createDatabase",
          rolcreaterole AS "createRole",
          rolreplication AS replication,
          rolbypassrls AS "bypassRls"
        FROM pg_catalog.pg_roles
        WHERE rolname IN ($1, $2)
        ORDER BY rolname
      `,
      [functionOwner, operatorPrincipal]
    );
    assert.equal(roles.rows.length, 2);
    for (const role of roles.rows) {
      assert.equal(role.canLogin, false);
      assert.equal(role.superuser, false);
      assert.equal(role.createDatabase, false);
      assert.equal(role.createRole, false);
      assert.equal(role.replication, false);
      assert.equal(role.bypassRls, false);
    }

    const functions = await database.query<{
      name: string;
      owner: string;
      securityDefiner: boolean;
      settings: string[] | null;
    }>(
      `
        SELECT
          procedure.proname AS name,
          owner.rolname AS owner,
          procedure.prosecdef AS "securityDefiner",
          procedure.proconfig AS settings
        FROM pg_catalog.pg_proc AS procedure
        INNER JOIN pg_catalog.pg_namespace AS namespace
          ON namespace.oid = procedure.pronamespace
        INNER JOIN pg_catalog.pg_roles AS owner
          ON owner.oid = procedure.proowner
        WHERE namespace.nspname = 'public'
          AND procedure.proname LIKE 'capitolwonk_privacy_operator_%'
        ORDER BY procedure.proname
      `
    );
    assert.equal(functions.rows.length, 7);
    for (const fn of functions.rows) {
      assert.equal(fn.owner, functionOwner);
      assert.equal(fn.securityDefiner, true);
      assert.deepEqual(fn.settings, ["search_path=pg_catalog, pg_temp"]);
    }

    for (const signature of expectedSignatures) {
      assert.equal(await privilege(database, operatorPrincipal, signature), true);
      assert.equal(await privilege(database, bystanderPrincipal, signature), false);
    }

    const tableGrants = await database.query<{
      privilege: string;
      table: string;
    }>(
      `
        SELECT table_name AS table, privilege_type AS privilege
        FROM information_schema.role_table_grants
        WHERE grantee = $1
          AND table_schema = 'public'
        ORDER BY table_name, privilege_type
      `,
      [functionOwner]
    );
    assert.deepEqual(tableGrants.rows, [
      { table: "PrivacyRequestOperation", privilege: "DELETE" }
    ]);

    const columnGrants = await database.query<{
      column: string;
      privilege: string;
      table: string;
    }>(
      `
        SELECT
          table_name AS table,
          column_name AS column,
          privilege_type AS privilege
        FROM information_schema.role_column_grants
        WHERE grantee = $1
          AND table_schema = 'public'
        ORDER BY table_name, privilege_type, column_name
      `,
      [functionOwner]
    );
    const grantKey = (entry: { column: string; privilege: string; table: string }) =>
      `${entry.table}:${entry.privilege}:${entry.column}`;
    const expectedColumnGrants = Object.entries(
      contract.functionOwnerTablePrivilegeCeiling
    ).flatMap(([table, ceiling]: [string, any]) => [
      ...ceiling.selectColumns.map((column: string) => ({
        table,
        column,
        privilege: "SELECT"
      })),
      ...ceiling.insertColumns.map((column: string) => ({
        table,
        column,
        privilege: "INSERT"
      })),
      ...ceiling.updateColumns.map((column: string) => ({
        table,
        column,
        privilege: "UPDATE"
      }))
    ]).sort((left, right) => (grantKey(left) < grantKey(right) ? -1 : 1));
    const actualColumnGrants = [...columnGrants.rows].sort((left, right) =>
      grantKey(left) < grantKey(right) ? -1 : 1
    );
    assert.deepEqual(actualColumnGrants, expectedColumnGrants);

    const operatorTableGrants = await database.query<{ count: number }>(
      `
        SELECT COUNT(*)::INTEGER AS count
        FROM information_schema.role_table_grants
        WHERE grantee = $1
          AND table_schema = 'public'
      `,
      [operatorPrincipal]
    );
    const operatorColumnGrants = await database.query<{ count: number }>(
      `
        SELECT COUNT(*)::INTEGER AS count
        FROM information_schema.role_column_grants
        WHERE grantee = $1
          AND table_schema = 'public'
      `,
      [operatorPrincipal]
    );
    assert.equal(operatorTableGrants.rows[0]?.count, 0);
    assert.equal(operatorColumnGrants.rows[0]?.count, 0);

    const now = new Date();
    const daysAgo = (days: number) =>
      new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    await database.query('INSERT INTO public."User" ("id") VALUES ($1)', [
      userReference
    ]);
    await database.query(
      `
        INSERT INTO public."PrivacyRequest" (
          "id", "userId", "requestType", "detail", "status", "requestedAt",
          "acknowledgedAt", "createdAt", "updatedAt"
        ) VALUES ($1, $2, 'access_summary', NULL, 'new', $3, $3, $3, $3)
      `,
      [firstPartyReference, userReference, daysAgo(1)]
    );
    await database.query(
      `
        INSERT INTO public."PrivacyRequest" (
          "id", "userId", "requestType", "detail", "status", "requestedAt",
          "acknowledgedAt", "resolvedAt", "resolution", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, 'other', 'synthetic optional detail', 'resolved', $3, $3,
          $4, 'fulfilled', $3, $4
        )
      `,
      [retentionReference, userReference, daysAgo(60), daysAgo(31)]
    );
    await database.query(
      `
        INSERT INTO public."PrivacyRequestOperation" (
          "caseReference", "lane", "requestType", "receivedAt",
          "machineReceiptAt", "humanAcknowledgementAt", "operator",
          "identityState", "workflowStatus", "sourceBoundaryCategories",
          "exceptionCategory", "resolution", "resolvedAt", "deleteAt"
        ) VALUES (
          $1, 'mailbox', 'access_summary', $2, $2, $3, 'privacy_owner',
          'not_applicable', 'resolved', ARRAY['account_profile']::TEXT[],
          'none', 'fulfilled', $3, $3::timestamptz + INTERVAL '24 months'
        )
      `,
      [expiredOperationReference, daysAgo(800), daysAgo(790)]
    );

    await database.exec(`SET ROLE ${operatorPrincipal}`);
    const summary = await database.query<{ newCount: number }>(
      "SELECT * FROM public.capitolwonk_privacy_operator_queue_summary()"
    );
    assert.equal(summary.rows[0]?.newCount, 1);
    const firstPartyOpened = await database.query<{ caseReference: string }>(
      "SELECT * FROM public.capitolwonk_privacy_operator_open_first_party($1)",
      [firstPartyReference]
    );
    assert.equal(firstPartyOpened.rows[0]?.caseReference, firstPartyReference);
    const opened = await database.query<{ caseReference: string }>(
      "SELECT * FROM public.capitolwonk_privacy_operator_open_mailbox($1, $2, $3, $4, $5)",
      [
        mailboxReference,
        "access_summary",
        new Date(Date.now() - 60_000),
        new Date(),
        "email_control"
      ]
    );
    assert.equal(opened.rows[0]?.caseReference, mailboxReference);
    const acknowledged = await database.query<{ workflowStatus: string }>(
      "SELECT * FROM public.capitolwonk_privacy_operator_acknowledge($1)",
      [firstPartyReference]
    );
    assert.equal(acknowledged.rows[0]?.workflowStatus, "reviewing");
    const reviewed = await database.query<{ identityState: string }>(
      "SELECT * FROM public.capitolwonk_privacy_operator_review($1, $2, $3, $4, $5)",
      [firstPartyReference, "not_applicable", ["account_profile"], "none", null]
    );
    assert.equal(reviewed.rows[0]?.identityState, "not_applicable");
    const resolved = await database.query<{ resolution: string }>(
      "SELECT * FROM public.capitolwonk_privacy_operator_resolve($1, $2, $3, $4)",
      [firstPartyReference, "fulfilled", "none", null]
    );
    assert.equal(resolved.rows[0]?.resolution, "fulfilled");
    const retention = await database.query<{
      closedOperationRecordsDeleted: number;
      optionalDetailsMinimized: number;
    }>("SELECT * FROM public.capitolwonk_privacy_operator_retention_apply()");
    assert.deepEqual(retention.rows[0], {
      closedOperationRecordsDeleted: 1,
      optionalDetailsMinimized: 1
    });
    await assert.rejects(
      database.query('SELECT * FROM public."PrivacyRequestOperation"')
    );
    await assert.rejects(
      database.exec(
        "ALTER FUNCTION public.capitolwonk_privacy_operator_queue_summary() IMMUTABLE"
      )
    );
    await database.exec("RESET ROLE");

    const minimized = await database.query<{ detail: string | null }>(
      'SELECT "detail" FROM public."PrivacyRequest" WHERE "id" = $1',
      [retentionReference]
    );
    assert.equal(minimized.rows[0]?.detail, null);
    const expiredRemaining = await database.query<{ count: number }>(
      'SELECT COUNT(*)::INTEGER AS count FROM public."PrivacyRequestOperation" WHERE "caseReference" = $1',
      [expiredOperationReference]
    );
    assert.equal(expiredRemaining.rows[0]?.count, 0);

    await database.exec(`SET ROLE ${bystanderPrincipal}`);
    await assert.rejects(
      database.query(
        "SELECT * FROM public.capitolwonk_privacy_operator_queue_summary()"
      )
    );
    await database.exec("RESET ROLE");
  } finally {
    await database.close();
  }
}

main()
  .then(() => {
    process.stdout.write(
      "Privacy-request operator function migration-review checks passed; the ephemeral database was closed.\n"
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
