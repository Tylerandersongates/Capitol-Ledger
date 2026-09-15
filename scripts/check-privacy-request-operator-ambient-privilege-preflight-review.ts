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
  read("docs/privacy-request-operator-ambient-privilege-preflight-review-2026-09-14.json")
);
const runbook = read(
  "docs/privacy-request-operator-ambient-privilege-preflight-review-2026-09-14.md"
);
const preflightSource = read(
  "docs/privacy-request-operator-ambient-privilege-preflight-2026-09-14.sql"
);
const predecessor = JSON.parse(
  read("docs/privacy-request-operator-role-bootstrap-review-2026-09-14.json")
);
const packageDocument = JSON.parse(read("package.json"));

assert.equal(contract.contractVersion, "2026-09-14");
assert.equal(
  contract.decisionStatus,
  "source_only_ambient_privilege_preflight_candidate"
);
assert.equal(contract.productionExecutionAuthorized, false);
assert.equal(
  predecessor.decisionStatus,
  "source_only_role_bootstrap_review_deployed"
);
assert.equal(predecessor.deploymentEvidence.pullRequest, 25);
assert.equal(
  predecessor.deploymentEvidence.branchCommit,
  "ce27daa6b199ec79893ad907af1e8273680880e2"
);
assert.equal(
  predecessor.deploymentEvidence.mergeCommit,
  "8534c7357bd6bc423d8afced5b0fa3015c2be247"
);
assert.equal(
  predecessor.deploymentEvidence.vercelDeploymentId,
  "63yd38aWH3q382bjoundusTdU8Ep"
);
assert.equal(predecessor.deploymentEvidence.deploymentState, "Ready");
assert.equal(predecessor.deploymentEvidence.deploymentCurrent, true);
assert.deepEqual(contract.predecessor, {
  artifact: "privacy-request-operator-role-bootstrap-review-2026-09-14.json",
  decisionStatus: "source_only_role_bootstrap_review_deployed",
  pullRequest: 25,
  branchCommit: "ce27daa6b199ec79893ad907af1e8273680880e2",
  mergeCommit: "8534c7357bd6bc423d8afced5b0fa3015c2be247",
  vercelDeploymentId: "63yd38aWH3q382bjoundusTdU8Ep",
  deploymentState: "Ready",
  deploymentCurrent: true
});

const preflightDigest = createHash("sha256")
  .update(preflightSource)
  .digest("hex");
assert.equal(preflightDigest, contract.preflightSource.sha256);
assert.equal(
  contract.preflightSource.executionGuardSetting,
  "capitolwonk.operator_ambient_privilege_preflight=approved-read-only"
);
assert.equal(
  contract.preflightSource.expectedDatabaseSetting,
  "capitolwonk.operator_expected_database"
);
assert.equal(contract.preflightSource.readOnlyTransactionRequired, true);
assert.equal(contract.preflightSource.singleAggregateRow, true);
assert.deepEqual(contract.targetInventory.relations.sort(), [
  "PrivacyRequest",
  "PrivacyRequestOperation"
]);
assert.equal(contract.targetInventory.exactRelationCount, 2);
for (const [key, value] of Object.entries(contract.passConditions)) {
  assert.equal(value, true, `pass condition ${key} must remain true`);
}
for (const [key, value] of Object.entries(contract.resultBoundary)) {
  const allowedTrue = new Set([
    "aggregateBooleanFieldsOnly",
    "boundedRelationCountReturned"
  ]);
  assert.equal(
    value,
    allowedTrue.has(key),
    `unexpected result-boundary value for ${key}`
  );
}
for (const [key, value] of Object.entries(contract.candidateBoundary)) {
  assert.equal(value, false, `candidate boundary ${key} must remain false`);
}
assert.equal(contract.validation.ephemeralPostgresOnly, true);
assert.equal(contract.validation.productionConnectionUsed, false);

const executableSource = preflightSource.replace(/^--.*$/gm, "");
assert.equal(
  (executableSource.match(/^\s*BEGIN\s+TRANSACTION\s+READ\s+ONLY\s*;/gim) ?? [])
    .length,
  1
);
assert.equal((executableSource.match(/^\s*COMMIT\s*;/gim) ?? []).length, 1);
assert.equal((executableSource.match(/^\s*DO\s+\$/gim) ?? []).length, 1);
assert.match(executableSource, /current_setting\('transaction_read_only'\)/i);
assert.match(
  executableSource,
  /capitolwonk\.operator_ambient_privilege_preflight/i
);
assert.match(executableSource, /capitolwonk\.operator_expected_database/i);
assert.match(executableSource, /pg_catalog\.aclexplode/i);
assert.match(executableSource, /pg_catalog\.acldefault/i);
assert.doesNotMatch(
  executableSource,
  /^\s*(?:GRANT|REVOKE|ALTER|CREATE|DROP|INSERT|UPDATE|DELETE|TRUNCATE|COPY|CALL)\b/im
);
assert.doesNotMatch(executableSource, /postgres(?:ql)?:\/\//i);
assert.match(runbook, /no production target was inspected/i);
assert.match(runbook, /Do not create either role/i);
assert.match(runbook, /Do not .* repair a shared ACL automatically/i);
assert.match(runbook, /`PUBLIC` schema `USAGE` is reported as an informational boolean/i);
assert.match(
  packageDocument.scripts[
    "privacy-request:operator-ambient-privilege-preflight-review:check"
  ],
  /check-privacy-request-operator-ambient-privilege-preflight-review\.ts/
);
assert.match(
  packageDocument.scripts["privacy-request:check"],
  /check-privacy-request-operator-ambient-privilege-preflight-review\.ts/
);

const migrationRoot = path.join(repositoryRoot, "prisma", "migrations");
for (const entry of fs.readdirSync(migrationRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const migrationPath = path.join(migrationRoot, entry.name, "migration.sql");
  if (!fs.existsSync(migrationPath)) continue;
  const migrationSource = fs.readFileSync(migrationPath, "utf8");
  assert.equal(
    migrationSource.includes("capitolwonk.operator_ambient_privilege_preflight"),
    false,
    "the reviewed preflight must remain outside Prisma migrations"
  );
}

type PreflightRow = {
  databaseMatchesExpected: boolean;
  preflightPass: boolean;
  privacyTableCount: number;
  privacyTablesAreBaseOrPartitioned: boolean;
  publicApplicationRelationAccessAbsent: boolean;
  publicApplicationRoutineExecuteAbsent: boolean;
  publicApplicationSequenceAccessAbsent: boolean;
  publicDatabaseConnectAbsent: boolean;
  publicDatabaseTemporaryAbsent: boolean;
  publicPrivacyTableAccessAbsent: boolean;
  publicSchemaCreateAbsent: boolean;
  publicSchemaUsageObserved: boolean;
  reviewedRoleNamesAvailable: boolean;
};

async function runPreflight(database: PGlite): Promise<PreflightRow> {
  const results = await database.exec(preflightSource);
  const result = results.find((candidate) =>
    candidate.fields?.some((field) => field.name === "preflightPass")
  );
  assert.ok(result, "preflight result row is missing");
  assert.equal(result.rows.length, 1);
  return result.rows[0] as PreflightRow;
}

async function rejectAndRollback(database: PGlite, pattern: RegExp) {
  await assert.rejects(database.exec(preflightSource), pattern);
  await database.exec("ROLLBACK");
}

async function setExpectedDatabase(database: PGlite, value: string) {
  await database.query(
    "SELECT pg_catalog.set_config('capitolwonk.operator_expected_database', $1, false)",
    [value]
  );
}

async function main() {
  const database = await PGlite.create();

  try {
    await rejectAndRollback(database, /not approved/);

    await database.query(
      "SELECT pg_catalog.set_config('capitolwonk.operator_ambient_privilege_preflight', 'approved-read-only', false)"
    );
    await setExpectedDatabase(database, "definitely-not-the-current-database");
    const wrongDatabase = await runPreflight(database);
    assert.equal(wrongDatabase.databaseMatchesExpected, false);
    assert.equal(wrongDatabase.preflightPass, false);

    const currentDatabase = await database.query<{ databaseName: string }>(
      'SELECT pg_catalog.current_database() AS "databaseName"'
    );
    await setExpectedDatabase(database, currentDatabase.rows[0]!.databaseName);

    const missingRelations = await runPreflight(database);
    assert.equal(missingRelations.privacyTableCount, 0);
    assert.equal(missingRelations.privacyTablesAreBaseOrPartitioned, false);
    assert.equal(missingRelations.preflightPass, false);

    await database.exec(
      'CREATE TABLE public."PrivacyRequest" ("id" TEXT PRIMARY KEY)'
    );
    const oneMissingRelation = await runPreflight(database);
    assert.equal(oneMissingRelation.privacyTableCount, 1);
    assert.equal(oneMissingRelation.preflightPass, false);

    await database.exec(
      'CREATE TABLE public."PrivacyRequestOperation" ("id" TEXT PRIMARY KEY)'
    );
    await database.exec(
      "GRANT CONNECT, TEMPORARY ON DATABASE postgres TO PUBLIC; GRANT CREATE ON SCHEMA public TO PUBLIC"
    );
    const ambientDatabaseAndSchema = await runPreflight(database);
    assert.equal(ambientDatabaseAndSchema.publicDatabaseConnectAbsent, false);
    assert.equal(ambientDatabaseAndSchema.publicDatabaseTemporaryAbsent, false);
    assert.equal(ambientDatabaseAndSchema.publicSchemaCreateAbsent, false);
    assert.equal(ambientDatabaseAndSchema.preflightPass, false);

    await database.exec(
      "REVOKE CONNECT, TEMPORARY ON DATABASE postgres FROM PUBLIC; REVOKE CREATE ON SCHEMA public FROM PUBLIC"
    );
    await database.exec('GRANT SELECT ON public."PrivacyRequest" TO PUBLIC');
    const ambientTableGrant = await runPreflight(database);
    assert.equal(ambientTableGrant.publicPrivacyTableAccessAbsent, false);
    assert.equal(ambientTableGrant.publicApplicationRelationAccessAbsent, false);
    assert.equal(ambientTableGrant.preflightPass, false);

    await database.exec('REVOKE SELECT ON public."PrivacyRequest" FROM PUBLIC');
    await database.exec(
      'CREATE TABLE public."UnrelatedApplicationTable" ("id" TEXT PRIMARY KEY); GRANT SELECT ON public."UnrelatedApplicationTable" TO PUBLIC'
    );
    const unrelatedTableGrant = await runPreflight(database);
    assert.equal(unrelatedTableGrant.publicPrivacyTableAccessAbsent, true);
    assert.equal(unrelatedTableGrant.publicApplicationRelationAccessAbsent, false);
    assert.equal(unrelatedTableGrant.preflightPass, false);
    await database.exec(
      'REVOKE SELECT ON public."UnrelatedApplicationTable" FROM PUBLIC; DROP TABLE public."UnrelatedApplicationTable"'
    );

    await database.exec(
      'CREATE SEQUENCE public."UnrelatedApplicationSequence"; GRANT USAGE ON SEQUENCE public."UnrelatedApplicationSequence" TO PUBLIC'
    );
    const ambientSequenceGrant = await runPreflight(database);
    assert.equal(ambientSequenceGrant.publicApplicationSequenceAccessAbsent, false);
    assert.equal(ambientSequenceGrant.preflightPass, false);
    await database.exec(
      'REVOKE USAGE ON SEQUENCE public."UnrelatedApplicationSequence" FROM PUBLIC; DROP SEQUENCE public."UnrelatedApplicationSequence"'
    );

    await database.exec(
      "CREATE FUNCTION public.capitolwonk_unrelated_function() RETURNS INTEGER LANGUAGE SQL IMMUTABLE AS 'SELECT 1'"
    );
    const ambientRoutineExecute = await runPreflight(database);
    assert.equal(ambientRoutineExecute.publicApplicationRoutineExecuteAbsent, false);
    assert.equal(ambientRoutineExecute.preflightPass, false);
    await database.exec(
      "REVOKE EXECUTE ON FUNCTION public.capitolwonk_unrelated_function() FROM PUBLIC; DROP FUNCTION public.capitolwonk_unrelated_function()"
    );

    await database.exec(
      "CREATE ROLE capitolwonk_privacy_operator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 0 PASSWORD NULL VALID UNTIL 'epoch'"
    );
    const roleCollision = await runPreflight(database);
    assert.equal(roleCollision.reviewedRoleNamesAvailable, false);
    assert.equal(roleCollision.preflightPass, false);

    await database.exec("DROP ROLE capitolwonk_privacy_operator");
    const reviewedSafeBaseline = await runPreflight(database);
    assert.deepEqual(reviewedSafeBaseline, {
      databaseMatchesExpected: true,
      privacyTableCount: 2,
      privacyTablesAreBaseOrPartitioned: true,
      publicApplicationRelationAccessAbsent: true,
      publicApplicationRoutineExecuteAbsent: true,
      publicApplicationSequenceAccessAbsent: true,
      publicDatabaseConnectAbsent: true,
      publicDatabaseTemporaryAbsent: true,
      publicSchemaCreateAbsent: true,
      publicSchemaUsageObserved: true,
      publicPrivacyTableAccessAbsent: true,
      reviewedRoleNamesAvailable: true,
      preflightPass: true
    });
  } finally {
    await database.close();
  }
}

main()
  .then(() => {
    process.stdout.write(
      "Privacy-request operator ambient-privilege preflight review checks passed; the ephemeral database was closed.\n"
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
