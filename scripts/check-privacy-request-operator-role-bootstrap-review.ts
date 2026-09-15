#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

process.env.TZ = "UTC";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

const contract = JSON.parse(
  read("docs/privacy-request-operator-role-bootstrap-review-2026-09-14.json")
);
const runbook = read(
  "docs/privacy-request-operator-role-bootstrap-review-2026-09-14.md"
);
const roleSource = read(
  "docs/privacy-request-operator-role-bootstrap-2026-09-14.sql"
);
const predecessor = JSON.parse(
  read("docs/privacy-request-operator-function-migration-review-2026-09-14.json")
);
const packageDocument = JSON.parse(read("package.json"));

const functionOwner = "capitolwonk_privacy_function_owner";
const operatorPrincipal = "capitolwonk_privacy_operator";
const reviewedRoles = [functionOwner, operatorPrincipal].sort();

assert.equal(contract.contractVersion, "2026-09-14");
assert.equal(
  contract.decisionStatus,
  "source_only_role_bootstrap_review_deployed"
);
assert.equal(contract.productionExecutionAuthorized, false);
assert.equal(contract.deploymentEvidence.pullRequest, 25);
assert.equal(
  contract.deploymentEvidence.branchCommit,
  "ce27daa6b199ec79893ad907af1e8273680880e2"
);
assert.equal(
  contract.deploymentEvidence.mergeCommit,
  "8534c7357bd6bc423d8afced5b0fa3015c2be247"
);
assert.equal(
  contract.deploymentEvidence.vercelDeploymentId,
  "63yd38aWH3q382bjoundusTdU8Ep"
);
assert.equal(contract.deploymentEvidence.deploymentState, "Ready");
assert.equal(contract.deploymentEvidence.deploymentCurrent, true);
assert.equal(
  predecessor.decisionStatus,
  "source_only_function_migration_review_deployed"
);
assert.equal(predecessor.deploymentEvidence.pullRequest, 24);
assert.equal(
  predecessor.deploymentEvidence.mergeCommit,
  "c7424b54232e13def08d1c0350f74d773d33b071"
);
assert.equal(predecessor.deploymentEvidence.vercelDeploymentId, contract.predecessor.vercelDeploymentId);
assert.equal(predecessor.deploymentEvidence.deploymentState, "Ready");

assert.equal(contract.roleSource.roleCount, 2);
assert.equal(contract.roleSource.explicitTransaction, true);
assert.equal(contract.roleSource.failOnExistingRoleName, true);
assert.equal(contract.roleSource.adoptOrAlterExistingRoleAllowed, false);
assert.equal(contract.roles.functionOwner.name, functionOwner);
assert.equal(contract.roles.operatorPrincipal.name, operatorPrincipal);
for (const role of [
  contract.roles.functionOwner,
  contract.roles.operatorPrincipal
]) {
  assert.equal(role.membershipAllowed, false);
  assert.equal(role.inheritAllowed, false);
  assert.equal(role.superuserAllowed, false);
  assert.equal(role.createDatabaseAllowed, false);
  assert.equal(role.createRoleAllowed, false);
  assert.equal(role.replicationAllowed, false);
  assert.equal(role.bypassRlsAllowed, false);
}
assert.equal(contract.roles.functionOwner.loginAllowed, false);
assert.equal(contract.roles.functionOwner.connectionLimit, 0);
assert.equal(contract.roles.functionOwner.passwordPresent, false);
assert.equal(contract.roles.functionOwner.validityExpired, true);
assert.equal(contract.roles.operatorPrincipal.idleLoginAllowed, false);
assert.equal(contract.roles.operatorPrincipal.idleConnectionLimit, 0);
assert.equal(contract.roles.operatorPrincipal.idlePasswordPresent, false);
assert.equal(contract.roles.operatorPrincipal.idleValidityExpired, true);
assert.equal(contract.roles.operatorPrincipal.futureLoginActivationIncluded, false);

const roleDigest = createHash("sha256").update(roleSource).digest("hex");
assert.equal(roleDigest, contract.roleSource.sha256);
assert.equal(
  contract.roleSource.executionGuardSetting,
  "capitolwonk.operator_role_bootstrap_validation=ephemeral-only"
);

const executableSource = roleSource.replace(/^--.*$/gm, "");
assert.equal((executableSource.match(/^\s*CREATE\s+ROLE\b/gim) ?? []).length, 2);
assert.equal((executableSource.match(/^\s*BEGIN\s*;/gim) ?? []).length, 1);
assert.equal((executableSource.match(/^\s*COMMIT\s*;/gim) ?? []).length, 1);
assert.equal((executableSource.match(/\bPASSWORD\s+NULL\b/gi) ?? []).length, 2);
assert.equal((executableSource.match(/\bVALID\s+UNTIL\s+'epoch'/gi) ?? []).length, 2);
assert.equal((executableSource.match(/\bCONNECTION\s+LIMIT\s+0\b/gi) ?? []).length, 2);
assert.equal((executableSource.match(/\bNOLOGIN\b/gi) ?? []).length, 2);
assert.equal((executableSource.match(/\bNOINHERIT\b/gi) ?? []).length, 2);
assert.equal((executableSource.match(/\bNOSUPERUSER\b/gi) ?? []).length, 2);
assert.equal((executableSource.match(/\bNOCREATEDB\b/gi) ?? []).length, 2);
assert.equal((executableSource.match(/\bNOCREATEROLE\b/gi) ?? []).length, 2);
assert.equal((executableSource.match(/\bNOREPLICATION\b/gi) ?? []).length, 2);
assert.equal((executableSource.match(/\bNOBYPASSRLS\b/gi) ?? []).length, 2);
assert.doesNotMatch(executableSource, /^\s*(?:GRANT|REVOKE|ALTER|DROP)\b/im);
assert.doesNotMatch(executableSource, /^\s*CREATE\s+(?:USER|DATABASE|SCHEMA|TABLE|FUNCTION)\b/im);
assert.doesNotMatch(executableSource, /postgres(?:ql)?:\/\//i);

for (const value of Object.values(contract.privilegeBoundary)) {
  assert.equal(value, false);
}
for (const [key, value] of Object.entries(contract.credentialAndNetworkBoundary)) {
  if (key === "separateReviewRequired") continue;
  assert.equal(value, false, "credential/network selections must remain false");
}
assert.equal(contract.credentialAndNetworkBoundary.separateReviewRequired, true);
for (const value of Object.values(contract.candidateBoundary)) {
  assert.equal(value, false);
}
assert.equal(contract.validation.ephemeralPostgresOnly, true);
assert.equal(contract.validation.productionConnectionUsed, false);
assert.equal(contract.ambientPrivilegePreflight.productionCreationBlockedUntilProved, true);
assert.match(runbook, /not a Prisma migration and not approved for production execution/i);
assert.match(runbook, /refuses to adopt or alter a pre-existing role/i);
assert.match(runbook, /database-level `CONNECT` baseline must be reconciled/i);
assert.match(runbook, /contains no real credential, `GRANT`, `REVOKE`, `ALTER ROLE`, `DROP ROLE`/i);
assert.match(
  packageDocument.scripts[
    "privacy-request:operator-role-bootstrap-review:check"
  ],
  /check-privacy-request-operator-role-bootstrap-review\.ts/
);
assert.match(
  packageDocument.scripts["privacy-request:check"],
  /check-privacy-request-operator-role-bootstrap-review\.ts/
);

const migrationRoot = path.join(repositoryRoot, "prisma", "migrations");
for (const entry of fs.readdirSync(migrationRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const migrationPath = path.join(migrationRoot, entry.name, "migration.sql");
  if (!fs.existsSync(migrationPath)) continue;
  const migrationSource = fs.readFileSync(migrationPath, "utf8");
  assert.equal(
    migrationSource.includes("capitolwonk.operator_role_bootstrap_validation"),
    false,
    "the reviewed role bootstrap must remain outside Prisma migrations"
  );
  assert.equal(
    /^\s*CREATE\s+ROLE\s+capitolwonk_privacy_/im.test(migrationSource),
    false,
    "the reviewed privacy roles must remain outside Prisma migrations"
  );
}

type CountRow = { count: number };
type RoleRow = {
  bypassRls: boolean;
  canLogin: boolean;
  connectionLimit: number;
  createDatabase: boolean;
  createRole: boolean;
  inherit: boolean;
  password: string | null;
  replication: boolean;
  role: string;
  superuser: boolean;
  validityExpired: boolean;
};

async function roleCount(database: PGlite) {
  const result = await database.query<CountRow>(
    `
      SELECT COUNT(*)::INTEGER AS count
      FROM pg_catalog.pg_roles
      WHERE rolname = ANY($1::TEXT[])
    `,
    [reviewedRoles]
  );
  return result.rows[0]?.count;
}

async function rejectAndRollback(database: PGlite, pattern: RegExp) {
  await assert.rejects(database.exec(roleSource), pattern);
  await database.exec("ROLLBACK");
}

async function main() {
  const database = await PGlite.create();

  try {
    await rejectAndRollback(database, /validation-only/);
    assert.equal(await roleCount(database), 0);

    await database.query(
      "SELECT pg_catalog.set_config('capitolwonk.operator_role_bootstrap_validation', 'ephemeral-only', false)"
    );
    await database.exec(
      `CREATE ROLE ${operatorPrincipal} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 3 PASSWORD NULL VALID UNTIL 'epoch'`
    );
    await rejectAndRollback(database, /role name already exists/);
    assert.equal(await roleCount(database), 1);
    const collisionRole = await database.query<{
      connectionLimit: number;
      inherit: boolean;
    }>(
      `
        SELECT rolconnlimit AS "connectionLimit", rolinherit AS inherit
        FROM pg_catalog.pg_roles
        WHERE rolname = $1
      `,
      [operatorPrincipal]
    );
    assert.deepEqual(collisionRole.rows[0], {
      connectionLimit: 3,
      inherit: true
    });

    await database.exec(`DROP ROLE ${operatorPrincipal}`);
    await database.exec(roleSource);
    assert.equal(await roleCount(database), 2);

    const roles = await database.query<RoleRow>(
      `
        SELECT
          rolname AS role,
          rolcanlogin AS "canLogin",
          rolsuper AS superuser,
          rolcreatedb AS "createDatabase",
          rolcreaterole AS "createRole",
          rolinherit AS inherit,
          rolreplication AS replication,
          rolbypassrls AS "bypassRls",
          rolconnlimit AS "connectionLimit",
          rolpassword AS password,
          rolvaliduntil <= CURRENT_TIMESTAMP AS "validityExpired"
        FROM pg_catalog.pg_authid
        WHERE rolname = ANY($1::TEXT[])
        ORDER BY rolname
      `,
      [reviewedRoles]
    );
    assert.deepEqual(roles.rows.map((role) => role.role), reviewedRoles);
    for (const role of roles.rows) {
      assert.equal(role.canLogin, false);
      assert.equal(role.connectionLimit, 0);
      assert.equal(role.password, null);
      assert.equal(role.validityExpired, true);
      assert.equal(role.inherit, false);
      assert.equal(role.superuser, false);
      assert.equal(role.createDatabase, false);
      assert.equal(role.createRole, false);
      assert.equal(role.replication, false);
      assert.equal(role.bypassRls, false);
    }

    const memberships = await database.query<CountRow>(
      `
        SELECT COUNT(*)::INTEGER AS count
        FROM pg_catalog.pg_auth_members AS membership
        WHERE membership.roleid = ANY(
          SELECT oid FROM pg_catalog.pg_roles WHERE rolname = ANY($1::TEXT[])
        ) OR membership.member = ANY(
          SELECT oid FROM pg_catalog.pg_roles WHERE rolname = ANY($1::TEXT[])
        )
      `,
      [reviewedRoles]
    );
    assert.equal(memberships.rows[0]?.count, 0);

    const explicitTableGrants = await database.query<CountRow>(
      `
        SELECT COUNT(*)::INTEGER AS count
        FROM information_schema.role_table_grants
        WHERE grantee = ANY($1::TEXT[])
      `,
      [reviewedRoles]
    );
    const explicitColumnGrants = await database.query<CountRow>(
      `
        SELECT COUNT(*)::INTEGER AS count
        FROM information_schema.role_column_grants
        WHERE grantee = ANY($1::TEXT[])
      `,
      [reviewedRoles]
    );
    const explicitRoutineGrants = await database.query<CountRow>(
      `
        SELECT COUNT(*)::INTEGER AS count
        FROM information_schema.role_routine_grants
        WHERE grantee = ANY($1::TEXT[])
      `,
      [reviewedRoles]
    );
    assert.equal(explicitTableGrants.rows[0]?.count, 0);
    assert.equal(explicitColumnGrants.rows[0]?.count, 0);
    assert.equal(explicitRoutineGrants.rows[0]?.count, 0);
  } finally {
    await database.close();
  }
}

main()
  .then(() => {
    process.stdout.write(
      "Privacy-request operator role-bootstrap review checks passed; the ephemeral database was closed.\n"
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
