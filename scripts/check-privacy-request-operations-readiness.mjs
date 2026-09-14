#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

const environment = read(".env.example");
const packageDocument = JSON.parse(read("package.json"));
const policy = JSON.parse(read("docs/privacy-operations-policy-2026-09-14.json"));
const schema = read("prisma/schema.prisma");
const migration = read(
  "prisma/migrations/20260914150000_privacy_request_operations/migration.sql"
);
const service = read("lib/privacy-request-operations.ts");
const fixture = read("scripts/check-privacy-request-operations-fixtures.ts");

assert.ok(environment.includes('PRIVACY_REQUEST_OPERATIONS_ENABLED="false"'));
assert.ok(environment.includes('PRIVACY_REQUEST_INTAKE_ENABLED="false"'));
assert.ok(environment.includes('PRIVACY_REQUEST_MONITOR_ENABLED="false"'));
assert.ok(environment.includes('CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED="false"'));
assert.equal(policy.productionActivationAuthorized, false);

const modelMatch = schema.match(/model PrivacyRequestOperation \{([\s\S]*?)\n\}/);
assert.ok(modelMatch, "PrivacyRequestOperation must exist in the Prisma schema");
const modelFields = [...modelMatch[1].matchAll(/^\s{2}([A-Za-z][A-Za-z0-9]*)\s+/gm)]
  .map((match) => match[1])
  .filter((field) => !field.startsWith("@@"));
const allowedModelFields = [
  "caseReference",
  "lane",
  "requestType",
  "receivedAt",
  "machineReceiptAt",
  "humanAcknowledgementAt",
  "operator",
  "identityState",
  "workflowStatus",
  "sourceBoundaryCategories",
  "exceptionCategory",
  "resolution",
  "resolvedAt",
  "deleteAt"
];
assert.deepEqual(modelFields.sort(), allowedModelFields.sort());

const expectedPolicyFields = [
  "internal_case_reference",
  "lane",
  "request_type",
  "received_at",
  "machine_receipt_at",
  "human_acknowledgement_at",
  "operator",
  "identity_state",
  "workflow_status",
  "source_boundary_categories",
  "exception_category",
  "resolution",
  "resolved_at",
  "delete_at"
];
assert.deepEqual(policy.register.allowedFields, expectedPolicyFields);

for (const constraint of [
  "caseReference_check",
  "sourceBoundaryCategories_check",
  "human_acknowledgement_check",
  "resolution_state_check",
  "resolution_basis_check",
  "source_inventory_check",
  "identity_escalation_check",
  "high_risk_identity_check"
]) {
  assert.ok(migration.includes(constraint), `missing database constraint ${constraint}`);
}

for (const prohibitedColumn of [
  '"userId"',
  '"email"',
  '"detail"',
  '"payload"',
  '"providerId"',
  '"token"',
  '"mailboxBody"'
]) {
  assert.equal(
    migration.includes(prohibitedColumn),
    false,
    `${prohibitedColumn} must not be an operations-table column`
  );
}

assert.ok(service.includes('=== "true"'));
assert.ok(service.includes("CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED"));
assert.equal(/console\.|\bfetch\s*\(/.test(service), false);
assert.ok(service.includes("cardinality(\"sourceBoundaryCategories\") > 0"));
assert.ok(service.includes("INTERVAL '24 months'"));
assert.ok(service.includes("INTERVAL '30 days'"));
assert.match(migration, /"receivedAt" TIMESTAMPTZ\(3\) NOT NULL/);
assert.match(migration, /"deleteAt" TIMESTAMPTZ\(3\)/);
assert.ok(fixture.includes("randomUUID()"));
assert.ok(fixture.includes("randomBytes(16)"));
assert.equal(/synthetic_case_|synthetic_user_|synthetic optional request detail/.test(fixture), false);

function listSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(entryPath);
    return /\.(?:js|jsx|mjs|ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

for (const applicationFile of listSourceFiles(path.join(repositoryRoot, "app"))) {
  const source = fs.readFileSync(applicationFile, "utf8");
  assert.equal(
    /privacy-request-operations|PrivacyRequestOperation/.test(source),
    false,
    `${path.relative(repositoryRoot, applicationFile)} must not expose the operator service`
  );
}

assert.match(
  packageDocument.scripts["privacy-request:check"],
  /check-privacy-request-operations-fixtures\.ts/
);
assert.match(
  packageDocument.scripts["privacy-request:check"],
  /check-privacy-request-operations-readiness\.mjs/
);
assert.equal(packageDocument.devDependencies["@electric-sql/pglite"], "0.5.8");

console.log("Privacy-request operations readiness checks passed.");
