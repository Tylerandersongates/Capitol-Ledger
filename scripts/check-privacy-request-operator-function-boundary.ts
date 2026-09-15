#!/usr/bin/env node

import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

process.env.TZ = "UTC";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

const contract = JSON.parse(
  read("docs/privacy-request-operator-function-boundary-2026-09-14.json")
);
const runbook = read(
  "docs/privacy-request-operator-function-boundary-2026-09-14.md"
);
const functionSql = read(
  "docs/privacy-request-operator-function-boundary-2026-09-14.sql"
);
const accessContract = JSON.parse(
  read("docs/privacy-request-operator-db-access-contract-2026-09-14.json")
);
const operationsSource = read("lib/privacy-request-operations.ts");
const monitorSource = read("lib/privacy-request-monitor.ts");
const adapterSource = read("lib/privacy-request-operator-service-adapter.ts");
const shellSource = read("scripts/run-privacy-request-operator.ts");
const packageDocument = JSON.parse(read("package.json"));

const expectedActions = [
  "queue_summary",
  "open_first_party_case",
  "open_mailbox_case",
  "acknowledge",
  "review",
  "resolve",
  "retention_apply"
];
const expectedFunctions = [
  "capitolwonk_privacy_operator_queue_summary",
  "capitolwonk_privacy_operator_open_first_party",
  "capitolwonk_privacy_operator_open_mailbox",
  "capitolwonk_privacy_operator_acknowledge",
  "capitolwonk_privacy_operator_review",
  "capitolwonk_privacy_operator_resolve",
  "capitolwonk_privacy_operator_retention_apply"
];

assert.equal(contract.contractVersion, "2026-09-14");
assert.equal(contract.decisionStatus, "source_only_function_boundary_candidate");
assert.equal(contract.productionExecutionAuthorized, false);
assert.equal(
  accessContract.recommendedBinding.strategy,
  "function_mediated_dedicated_non_owner_principal"
);
assert.deepEqual(
  contract.functions.map((entry: { action: string }) => entry.action),
  expectedActions
);
assert.deepEqual(
  contract.functions.map((entry: { name: string }) => entry.name),
  expectedFunctions
);
assert.equal(contract.securityFloor.securityDefinerRequired, true);
assert.equal(contract.securityFloor.fixedSearchPath, "pg_catalog, pg_temp");
assert.equal(contract.securityFloor.fullyQualifiedObjectsRequired, true);
assert.equal(contract.securityFloor.dynamicSqlAllowed, false);
assert.equal(contract.securityFloor.arbitrarySqlInputAllowed, false);
assert.equal(contract.securityFloor.callerSuppliedOperatorAllowed, false);
assert.equal(contract.securityFloor.callerSuppliedActionTimeAllowed, false);
assert.equal(
  contract.securityFloor.actionTimeSource,
  "pg_catalog.statement_timestamp()"
);
assert.equal(contract.securityFloor.directTableDmlApproved, false);
assert.equal(contract.securityFloor.unrelatedTableAccessAllowed, false);
assert.equal(contract.securityFloor.contactOrPayloadOutputAllowed, false);
assert.equal(contract.securityFloor.tableCompositeReturnAllowed, false);
assert.equal(contract.securityFloor.explicitOutputColumnsRequired, true);

const declaredFunctions = [
  ...functionSql.matchAll(/CREATE OR REPLACE FUNCTION\s+public\.([a-z0-9_]+)\s*\(/g)
].map((match) => match[1]);
assert.deepEqual(declaredFunctions, expectedFunctions);
assert.equal((functionSql.match(/SECURITY DEFINER/g) ?? []).length, 7);
assert.equal(
  (functionSql.match(/SET search_path = pg_catalog, pg_temp/g) ?? []).length,
  7
);
assert.equal((functionSql.match(/LANGUAGE SQL/g) ?? []).length, 7);

const executableSql = functionSql.replace(/^--.*$/gm, "");
assert.equal(
  /\b(?:CREATE|ALTER|DROP)\s+(?:ROLE|USER|SCHEMA|DATABASE)\b/i.test(executableSql),
  false
);
assert.equal(/\b(?:GRANT|REVOKE|SET\s+ROLE)\b/i.test(executableSql), false);
assert.equal(/\bEXECUTE\s+(?:FORMAT|IMMEDIATE)|\bformat\s*\(/i.test(executableSql), false);
assert.equal(/\$\{/.test(executableSql), false);
assert.equal(/\bTRUNCATE\b/i.test(executableSql), false);
assert.equal(/\bcurrent_user\b|\bsession_user\b/i.test(executableSql), false);
assert.equal(/RETURNS\s+SETOF/i.test(executableSql), false);
assert.equal(/(?:RETURNING|SELECT)\s+[A-Za-z_][A-Za-z0-9_]*\.\*/i.test(executableSql), false);
assert.equal(/RETURNING\s+\*/i.test(executableSql), false);
assert.match(executableSql, /"operator" = 'privacy_owner'/);
assert.doesNotMatch(executableSql, /p_operator/);
assert.doesNotMatch(
  executableSql,
  /p_(?:now|action_at|acknowledged_at|resolved_at)/
);
assert.match(executableSql, /pg_catalog\.statement_timestamp\(\)/);
assert.match(executableSql, /INTERVAL '15 minutes'/);
assert.match(executableSql, /INTERVAL '30 days'/);
assert.match(executableSql, /INTERVAL '24 months'/);

const referencedTables = [
  ...new Set(
    [...executableSql.matchAll(/public\."([A-Za-z0-9_]+)"/g)].map(
      (match) => match[1]
    )
  )
].sort();
assert.deepEqual(referencedTables, ["PrivacyRequest", "PrivacyRequestOperation"]);

const migrationRoot = path.join(repositoryRoot, "prisma", "migrations");
for (const entry of fs.readdirSync(migrationRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const migrationPath = path.join(migrationRoot, entry.name, "migration.sql");
  if (!fs.existsSync(migrationPath)) continue;
  const migrationSource = fs.readFileSync(migrationPath, "utf8");
  for (const functionName of expectedFunctions) {
    assert.equal(
      migrationSource.includes(functionName),
      false,
      `${functionName} must remain outside Prisma migrations`
    );
  }
}

for (const source of [operationsSource, monitorSource, adapterSource, shellSource]) {
  assert.equal(
    /privacy-request-operator-function-boundary/.test(source),
    false,
    "the function packet must remain unbound"
  );
}
assert.equal(/getPrisma|hasDatabaseUrl|DATABASE_URL|process\.env|\bfetch\s*\(/.test(adapterSource), false);
assert.equal(/privacy-request-operator-service-adapter/.test(shellSource), false);

for (const value of Object.values(contract.candidateBoundary)) {
  assert.equal(value, false);
}
assert.equal(contract.validation.ephemeralPostgresOnly, true);
assert.equal(
  contract.validation.executionGuardSetting,
  "capitolwonk.operator_function_boundary_validation=ephemeral-only"
);
assert.equal(contract.validation.missingExecutionGuardFailsBeforeFunctionCreation, true);
assert.equal(contract.validation.productionConnectionUsed, false);
assert.match(runbook, /not a migration and not approved for production execution/i);
assert.match(runbook, /no `CREATE ROLE`, credential, `GRANT`, `REVOKE`/i);
assert.match(
  packageDocument.scripts["privacy-request:operator-function-boundary:check"],
  /check-privacy-request-operator-function-boundary\.ts/
);
assert.match(
  packageDocument.scripts["privacy-request:check"],
  /check-privacy-request-operator-function-boundary\.ts/
);

type OperationRow = {
  caseReference: string;
  deleteAt: string | Date | null;
  exceptionCategory: string;
  humanAcknowledgementAt: string | Date | null;
  identityState: string;
  lane: string;
  operator: string | null;
  resolution: string | null;
  sourceBoundaryCategories: string[];
  workflowStatus: string;
};

async function main() {
  const database = await PGlite.create();
  const userReference = randomUUID();
  const firstPartyReference = randomUUID();
  const mailboxReference = randomUUID();
  const optionalDetail = randomBytes(24).toString("hex");
  const fixtureNow = new Date();
  const minutesAgo = (minutes: number) =>
    new Date(fixtureNow.getTime() - minutes * 60 * 1000);
  const daysAgo = (days: number) =>
    new Date(fixtureNow.getTime() - days * 24 * 60 * 60 * 1000);
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
    await assert.rejects(database.exec(functionSql), /validation-only/);
    const preGuardCatalog = await database.query<{ count: number }>(
      `
        SELECT COUNT(*)::INTEGER AS "count"
        FROM pg_catalog.pg_proc AS procedure
        WHERE procedure.proname LIKE 'capitolwonk_privacy_operator_%'
      `
    );
    assert.equal(preGuardCatalog.rows[0]?.count, 0);
    await database.query(
      "SELECT pg_catalog.set_config('capitolwonk.operator_function_boundary_validation', 'ephemeral-only', false)"
    );
    await database.exec(functionSql);

    const functionCatalog = await database.query<{
      name: string;
      securityDefiner: boolean;
      settings: string[] | null;
    }>(
      `
        SELECT
          procedure.proname AS "name",
          procedure.prosecdef AS "securityDefiner",
          procedure.proconfig AS "settings"
        FROM pg_catalog.pg_proc AS procedure
        INNER JOIN pg_catalog.pg_namespace AS namespace
          ON namespace.oid = procedure.pronamespace
        WHERE namespace.nspname = 'public'
          AND procedure.proname LIKE 'capitolwonk_privacy_operator_%'
        ORDER BY procedure.proname
      `
    );
    assert.deepEqual(
      functionCatalog.rows.map((row) => row.name),
      [...expectedFunctions].sort()
    );
    for (const row of functionCatalog.rows) {
      assert.equal(row.securityDefiner, true);
      assert.deepEqual(row.settings, ["search_path=pg_catalog, pg_temp"]);
    }

    await database.query('INSERT INTO public."User" ("id") VALUES ($1)', [
      userReference
    ]);
    await database.query(
      `
        INSERT INTO public."PrivacyRequest" (
          "id", "userId", "requestType", "detail", "status", "requestedAt",
          "acknowledgedAt", "createdAt", "updatedAt"
        ) VALUES ($1, $2, 'data_export', $3, 'new', $4, $5, $4, $4)
      `,
      [
        firstPartyReference,
        userReference,
        optionalDetail,
        minutesAgo(120),
        new Date(minutesAgo(120).getTime() + 1000)
      ]
    );

    const opened = await database.query<OperationRow>(
      "SELECT * FROM public.capitolwonk_privacy_operator_open_first_party($1)",
      [firstPartyReference]
    );
    assert.equal(opened.rows.length, 1);
    assert.equal(opened.rows[0]?.caseReference, firstPartyReference);
    assert.equal(opened.rows[0]?.lane, "first_party");
    assert.equal(opened.rows[0]?.workflowStatus, "new");

    const reopened = await database.query<OperationRow>(
      "SELECT * FROM public.capitolwonk_privacy_operator_open_first_party($1)",
      [firstPartyReference]
    );
    assert.equal(reopened.rows.length, 1);
    assert.equal(reopened.rows[0]?.caseReference, firstPartyReference);

    const acknowledged = await database.query<OperationRow>(
      "SELECT * FROM public.capitolwonk_privacy_operator_acknowledge($1)",
      [firstPartyReference]
    );
    assert.equal(acknowledged.rows[0]?.workflowStatus, "reviewing");
    assert.equal(acknowledged.rows[0]?.operator, "privacy_owner");

    const staleReview = await database.query<OperationRow>(
      "SELECT * FROM public.capitolwonk_privacy_operator_review($1, $2, $3, $4, $5)",
      [
        firstPartyReference,
        "reauthenticated",
        ["account_profile", "provider"],
        "none",
        minutesAgo(16)
      ]
    );
    assert.equal(staleReview.rows.length, 0);

    const reviewed = await database.query<OperationRow>(
      "SELECT * FROM public.capitolwonk_privacy_operator_review($1, $2, $3, $4, $5)",
      [
        firstPartyReference,
        "reauthenticated",
        ["provider", "account_profile", "provider"],
        "none",
        minutesAgo(1)
      ]
    );
    assert.equal(reviewed.rows.length, 1);
    assert.equal(reviewed.rows[0]?.identityState, "reauthenticated");
    assert.deepEqual(reviewed.rows[0]?.sourceBoundaryCategories, [
      "account_profile",
      "provider"
    ]);

    const staleResolution = await database.query<OperationRow>(
      "SELECT * FROM public.capitolwonk_privacy_operator_resolve($1, $2, $3, $4)",
      [
        firstPartyReference,
        "fulfilled",
        "none",
        minutesAgo(16)
      ]
    );
    assert.equal(staleResolution.rows.length, 0);

    const resolved = await database.query<OperationRow>(
      "SELECT * FROM public.capitolwonk_privacy_operator_resolve($1, $2, $3, $4)",
      [
        firstPartyReference,
        "fulfilled",
        "none",
        minutesAgo(1)
      ]
    );
    assert.equal(resolved.rows.length, 1);
    assert.equal(resolved.rows[0]?.resolution, "fulfilled");

    await database.query(
      `
        UPDATE public."PrivacyRequest"
        SET "status" = 'resolved', "resolvedAt" = $2,
            "resolution" = 'fulfilled', "updatedAt" = $2
        WHERE "id" = $1
      `,
      [firstPartyReference, daysAgo(31)]
    );

    const summary = await database.query<{
      fulfilledCount: number;
      newCount: number;
      reviewingCount: number;
    }>(
      "SELECT * FROM public.capitolwonk_privacy_operator_queue_summary()"
    );
    assert.equal(summary.rows[0]?.fulfilledCount, 1);
    assert.equal(summary.rows[0]?.newCount, 0);
    assert.equal(summary.rows[0]?.reviewingCount, 0);

    const mailboxOpened = await database.query<OperationRow>(
      "SELECT * FROM public.capitolwonk_privacy_operator_open_mailbox($1, $2, $3, $4, $5)",
      [
        mailboxReference,
        "data_export",
        minutesAgo(30),
        new Date(minutesAgo(30).getTime() + 1000),
        "escalation_required"
      ]
    );
    assert.equal(mailboxOpened.rows[0]?.exceptionCategory, "identity_ambiguity");

    await database.query(
      "SELECT * FROM public.capitolwonk_privacy_operator_acknowledge($1)",
      [mailboxReference]
    );
    const mailboxReviewed = await database.query<OperationRow>(
      "SELECT * FROM public.capitolwonk_privacy_operator_review($1, $2, $3, $4, $5)",
      [
        mailboxReference,
        "escalation_required",
        ["account_profile"],
        "identity_ambiguity",
        null
      ]
    );
    assert.equal(mailboxReviewed.rows.length, 1);

    const forbiddenMailboxResolution = await database.query<OperationRow>(
      "SELECT * FROM public.capitolwonk_privacy_operator_resolve($1, $2, $3, $4)",
      [
        mailboxReference,
        "fulfilled",
        "identity_ambiguity",
        minutesAgo(1)
      ]
    );
    assert.equal(forbiddenMailboxResolution.rows.length, 0);

    const mailboxDenied = await database.query<OperationRow>(
      "SELECT * FROM public.capitolwonk_privacy_operator_resolve($1, $2, $3, $4)",
      [
        mailboxReference,
        "denied",
        "identity_ambiguity",
        null
      ]
    );
    assert.equal(mailboxDenied.rows[0]?.resolution, "denied");

    const expiredReference = randomUUID();
    await database.query(
      `
        INSERT INTO public."PrivacyRequestOperation" (
          "caseReference", "lane", "requestType", "receivedAt",
          "machineReceiptAt", "humanAcknowledgementAt", "operator",
          "identityState", "workflowStatus", "sourceBoundaryCategories",
          "exceptionCategory", "resolution", "resolvedAt", "deleteAt"
        ) VALUES (
          $1, 'mailbox', 'access_summary', $2, $3, $4, 'privacy_owner',
          'not_applicable', 'resolved', ARRAY['account_profile']::TEXT[],
          'none', 'fulfilled', $5, $5::timestamptz + INTERVAL '24 months'
        )
      `,
      [
        expiredReference,
        daysAgo(800),
        new Date(daysAgo(800).getTime() + 1000),
        daysAgo(790),
        daysAgo(731)
      ]
    );

    const retention = await database.query<{
      closedOperationRecordsDeleted: number;
      optionalDetailsMinimized: number;
    }>(
      "SELECT * FROM public.capitolwonk_privacy_operator_retention_apply()"
    );
    assert.deepEqual(retention.rows[0], {
      closedOperationRecordsDeleted: 1,
      optionalDetailsMinimized: 1
    });

    const detail = await database.query<{ detail: string | null }>(
      'SELECT "detail" FROM public."PrivacyRequest" WHERE "id" = $1',
      [firstPartyReference]
    );
    assert.equal(detail.rows[0]?.detail, null);

    const remaining = await database.query<{ count: number }>(
      'SELECT COUNT(*)::INTEGER AS "count" FROM public."PrivacyRequestOperation"'
    );
    assert.equal(remaining.rows[0]?.count, 2);
  } finally {
    await database.close();
  }
}

main()
  .then(() => {
    process.stdout.write(
      "Privacy-request operator function-boundary checks passed; the ephemeral database was closed.\n"
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
