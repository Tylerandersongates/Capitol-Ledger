#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

const contract = JSON.parse(
  read("docs/privacy-request-operator-db-access-contract-2026-09-14.json")
);
const runbook = read(
  "docs/privacy-request-operator-db-access-contract-2026-09-14.md"
);
const operationsSource = read("lib/privacy-request-operations.ts");
const monitorSource = read("lib/privacy-request-monitor.ts");
const adapterSource = read("lib/privacy-request-operator-service-adapter.ts");
const shellSource = read("scripts/run-privacy-request-operator.ts");
const packageDocument = JSON.parse(read("package.json"));

assert.equal(contract.contractVersion, "2026-09-14");
assert.equal(
  contract.decisionStatus,
  "least_privilege_contract_deployed_function_boundary_candidate"
);
assert.equal(contract.productionExecutionAuthorized, false);
assert.equal(contract.deploymentEvidence.pullRequest, 22);
assert.equal(
  contract.deploymentEvidence.mergeCommit,
  "3977ce79e3d27d3c7f1f464af712a8454f9f730d"
);
assert.equal(contract.deploymentEvidence.vercelDeploymentId, "H4pm4yr5x8si8j7udgUpSMxKswPe");
assert.equal(contract.deploymentEvidence.deploymentState, "Ready");
assert.equal(contract.deploymentEvidence.privacyApiStatus, 503);
assert.equal(contract.deploymentEvidence.privacyApiCacheControl, "no-store");
assert.equal(
  contract.recommendedBinding.strategy,
  "function_mediated_dedicated_non_owner_principal"
);
assert.equal(
  contract.recommendedBinding.functionBoundaryContract,
  "privacy-request-operator-function-boundary-2026-09-14.json"
);
assert.equal(contract.recommendedBinding.functionBoundarySourceImplemented, true);
assert.equal(contract.recommendedBinding.directTableDmlApproved, false);
assert.equal(contract.recommendedBinding.principalCreationApproved, false);
assert.equal(contract.recommendedBinding.credentialCreationApproved, false);
assert.equal(contract.recommendedBinding.grantExecutionApproved, false);
assert.equal(contract.recommendedBinding.functionMigrationApproved, false);
assert.equal(contract.recommendedBinding.connectionBootstrapApproved, false);
assert.equal(contract.recommendedBinding.stdinShellBindingApproved, false);

assert.equal(contract.principalFloor.dedicatedPrincipalRequired, true);
assert.equal(contract.principalFloor.migrationOwnerReuseAllowed, false);
assert.equal(contract.principalFloor.restoreCredentialReuseAllowed, false);
assert.equal(contract.principalFloor.providerCredentialReuseAllowed, false);
assert.equal(contract.principalFloor.superuserAllowed, false);
assert.equal(contract.principalFloor.bypassRlsAllowed, false);
assert.equal(contract.principalFloor.createDatabaseAllowed, false);
assert.equal(contract.principalFloor.createRoleAllowed, false);
assert.equal(contract.principalFloor.replicationAllowed, false);
assert.equal(contract.principalFloor.roleMembershipAllowed, false);
assert.deepEqual(contract.principalFloor.databasePrivileges, ["CONNECT"]);
assert.deepEqual(contract.principalFloor.schemaPrivileges, ["USAGE"]);
assert.equal(contract.principalFloor.schemaCreateAllowed, false);
assert.equal(contract.principalFloor.defaultPrivilegesAllowed, false);
assert.equal(contract.principalFloor.sequencePrivilegesAllowed, false);

const expectedPrivacyRequestSelectColumns = [
  "acknowledgedAt",
  "detail",
  "id",
  "requestType",
  "requestedAt",
  "resolution",
  "resolvedAt",
  "status"
];
const expectedPrivacyRequestOperationColumns = [
  "caseReference",
  "deleteAt",
  "exceptionCategory",
  "humanAcknowledgementAt",
  "identityState",
  "lane",
  "machineReceiptAt",
  "operator",
  "receivedAt",
  "requestType",
  "resolution",
  "resolvedAt",
  "sourceBoundaryCategories",
  "workflowStatus"
];
const expectedPrivacyRequestOperationInsertColumns = [
  "caseReference",
  "exceptionCategory",
  "identityState",
  "lane",
  "machineReceiptAt",
  "receivedAt",
  "requestType",
  "sourceBoundaryCategories",
  "workflowStatus"
];
const expectedPrivacyRequestOperationUpdateColumns = [
  "deleteAt",
  "exceptionCategory",
  "humanAcknowledgementAt",
  "identityState",
  "operator",
  "resolution",
  "resolvedAt",
  "sourceBoundaryCategories",
  "workflowStatus"
];

assert.deepEqual(
  contract.currentFixedQueryCeiling.tables.PrivacyRequest.selectColumns,
  expectedPrivacyRequestSelectColumns
);
assert.deepEqual(
  contract.currentFixedQueryCeiling.tables.PrivacyRequest.insertColumns,
  []
);
assert.deepEqual(
  contract.currentFixedQueryCeiling.tables.PrivacyRequest.updateColumns,
  ["detail", "updatedAt"]
);
assert.equal(
  contract.currentFixedQueryCeiling.tables.PrivacyRequest.deleteAllowed,
  false
);
assert.deepEqual(
  contract.currentFixedQueryCeiling.tables.PrivacyRequestOperation.selectColumns,
  expectedPrivacyRequestOperationColumns
);
assert.deepEqual(
  contract.currentFixedQueryCeiling.tables.PrivacyRequestOperation.insertColumns,
  expectedPrivacyRequestOperationInsertColumns
);
assert.deepEqual(
  contract.currentFixedQueryCeiling.tables.PrivacyRequestOperation.updateColumns,
  expectedPrivacyRequestOperationUpdateColumns
);
assert.equal(
  contract.currentFixedQueryCeiling.tables.PrivacyRequestOperation.deleteAllowed,
  true
);

const querySources = [operationsSource, monitorSource];
const fixedQueries = querySources.flatMap((source) =>
  [...source.matchAll(/\$queryRawUnsafe<[^>]+>\(\s*`([\s\S]*?)`/g)].map(
    (match) => match[1]
  )
);
assert.equal(fixedQueries.length, contract.currentFixedQueryCeiling.queryCount);
assert.equal(fixedQueries.length, 8);

const referencedTables = [
  ...new Set(
    fixedQueries.flatMap((query) =>
      [...query.matchAll(/(?:FROM|INTO|UPDATE)\s+"([A-Za-z0-9_]+)"/g)].map(
        (match) => match[1]
      )
    )
  )
].sort();
assert.deepEqual(referencedTables, ["PrivacyRequest", "PrivacyRequestOperation"]);
assert.deepEqual(Object.keys(contract.currentFixedQueryCeiling.tables).sort(), referencedTables);
assert.equal(contract.currentFixedQueryCeiling.arbitraryQueryInputAllowed, false);
assert.equal(contract.currentFixedQueryCeiling.unrelatedTableAccessAllowed, false);
assert.equal(contract.currentFixedQueryCeiling.ddlAllowed, false);
assert.equal(contract.currentFixedQueryCeiling.truncateAllowed, false);
assert.equal(contract.currentFixedQueryCeiling.roleAdministrationAllowed, false);

for (const query of fixedQueries) {
  assert.equal(/\b(?:ALTER|CREATE|DROP|GRANT|REVOKE|TRUNCATE)\b/i.test(query), false);
  assert.equal(/\$\{/.test(query), false, "fixed SQL must not interpolate source values");
}

for (const column of [
  ...expectedPrivacyRequestSelectColumns,
  ...contract.currentFixedQueryCeiling.tables.PrivacyRequest.updateColumns
]) {
  assert.match(
    `${operationsSource}\n${monitorSource}`,
    new RegExp(`"${column}"`),
    `PrivacyRequest column ${column} must remain grounded in the fixed query source`
  );
}
for (const column of expectedPrivacyRequestOperationColumns) {
  assert.match(
    operationsSource,
    new RegExp(`"${column}"`),
    `PrivacyRequestOperation column ${column} must remain grounded in the fixed query source`
  );
}

assert.equal(
  /getPrisma|hasDatabaseUrl|DATABASE_URL|process\.env|\bfetch\s*\(/.test(adapterSource),
  false,
  "the service adapter must remain unable to discover a production connection"
);
assert.equal(
  /privacy-request-operator-service-adapter/.test(shellSource),
  false,
  "the stdin shell must remain intentionally unbound"
);

function listSourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(entryPath);
    return /\.(?:js|jsx|mjs|ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

for (const applicationFile of listSourceFiles(path.join(repositoryRoot, "app"))) {
  const applicationSource = fs.readFileSync(applicationFile, "utf8");
  assert.equal(
    /privacy-request-operator-(?:service-adapter|db-access-contract)/.test(
      applicationSource
    ),
    false,
    `${path.relative(repositoryRoot, applicationFile)} must not import an operator binding`
  );
}

for (const value of Object.values(contract.candidateBoundary)) {
  assert.equal(value, false);
}
assert.ok(
  contract.blockingFindings.includes("postgres_delete_privilege_is_not_column_scoped")
);
assert.ok(
  contract.blockingFindings.includes("function_boundary_source_not_migrated_or_bound")
);
assert.ok(contract.blockingFindings.includes("operations_migration_not_applied"));
assert.match(runbook, /deployed source-only least-privilege contract/i);
assert.match(runbook, /direct table DML is therefore not approved/i);
assert.match(runbook, /no runnable `GRANT`/i);
assert.match(
  packageDocument.scripts["privacy-request:operator-db-access-contract:check"],
  /check-privacy-request-operator-db-access-contract\.ts/
);
assert.match(
  packageDocument.scripts["privacy-request:check"],
  /check-privacy-request-operator-db-access-contract\.ts/
);

process.stdout.write("Privacy-request operator database-access contract checks passed.\n");
