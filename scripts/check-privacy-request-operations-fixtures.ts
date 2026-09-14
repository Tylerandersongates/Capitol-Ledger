#!/usr/bin/env node

import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import {
  isFreshPrivacyRequestReauthentication,
  privacyRequestCoverageAction
} from "@/lib/privacy-request-operations-contract";
import {
  acknowledgePrivacyRequestOperation,
  isPrivacyRequestOperationsEnabled,
  openPrivacyRequestOperation,
  resolvePrivacyRequestOperation,
  reviewPrivacyRequestOperation,
  runPrivacyRequestOperationsRetention,
  type PrivacyRequestOperationsDatabaseClient
} from "@/lib/privacy-request-operations";

// Prisma DateTime columns are stored as PostgreSQL timestamps and interpreted
// as UTC by the application. Make the direct PGlite adapter match that contract
// instead of inheriting the workstation timezone.
process.env.TZ = "UTC";

const intakeMigrationPath = new URL(
  "../prisma/migrations/20260912120000_privacy_request_intake/migration.sql",
  import.meta.url
);
const operationsMigrationPath = new URL(
  "../prisma/migrations/20260914150000_privacy_request_operations/migration.sql",
  import.meta.url
);

const disabledValues = [undefined, "", "false", "TRUE", "1", "true "];
for (const value of disabledValues) {
  assert.equal(
    isPrivacyRequestOperationsEnabled({ PRIVACY_REQUEST_OPERATIONS_ENABLED: value }),
    false,
    `PRIVACY_REQUEST_OPERATIONS_ENABLED=${String(value)} must fail closed`
  );
}
assert.equal(
  isPrivacyRequestOperationsEnabled({ PRIVACY_REQUEST_OPERATIONS_ENABLED: "true" }),
  true
);

assert.equal(
  privacyRequestCoverageAction({
    consecutiveMissedReviewWindows: 0,
    expectedMissedReviewWindows: 0,
    intakeActive: false
  }),
  "leave_disabled"
);
assert.equal(
  privacyRequestCoverageAction({
    consecutiveMissedReviewWindows: 1,
    expectedMissedReviewWindows: 2,
    intakeActive: true
  }),
  "pause_required"
);
assert.equal(
  privacyRequestCoverageAction({
    consecutiveMissedReviewWindows: 1,
    expectedMissedReviewWindows: 0,
    intakeActive: true
  }),
  "continue_operating"
);

const reauthenticationBoundary = new Date("2026-09-14T17:20:00.000Z");
assert.equal(
  isFreshPrivacyRequestReauthentication(
    new Date("2026-09-14T17:05:00.000Z"),
    reauthenticationBoundary
  ),
  true
);
assert.equal(
  isFreshPrivacyRequestReauthentication(
    new Date("2026-09-14T17:04:59.999Z"),
    reauthenticationBoundary
  ),
  false
);
assert.equal(
  isFreshPrivacyRequestReauthentication(
    new Date("2026-09-14T17:20:00.001Z"),
    reauthenticationBoundary
  ),
  false
);

async function main() {
  const databaseEngine = await PGlite.create();
  const disabledCaseReference = randomUUID();
  const firstPartyCaseReference = randomUUID();
  const syntheticUserReference = randomUUID();
  const syntheticOptionalDetail = randomBytes(16).toString("hex");
  let databaseCalls = 0;
  const database: PrivacyRequestOperationsDatabaseClient = {
    async $queryRawUnsafe<T>(query: string, ...values: unknown[]) {
      databaseCalls += 1;
      const result = await databaseEngine.query(query, values);
      return result.rows as T;
    }
  };
  const enabledEnvironment = { PRIVACY_REQUEST_OPERATIONS_ENABLED: "true" };
  const retentionEnvironment = {
    CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED: "true",
    PRIVACY_REQUEST_OPERATIONS_ENABLED: "true"
  };

  try {
    await databaseEngine.exec('CREATE TABLE "User" ("id" TEXT NOT NULL PRIMARY KEY);');
    await databaseEngine.exec(fs.readFileSync(intakeMigrationPath, "utf8"));
    await databaseEngine.exec(fs.readFileSync(operationsMigrationPath, "utf8"));

    const expectedColumns = [
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
    ].sort();
    const columnResult = await databaseEngine.query<{ column_name: string }>(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'PrivacyRequestOperation'
        ORDER BY column_name
      `
    );
    assert.deepEqual(
      columnResult.rows.map((row) => row.column_name).sort(),
      expectedColumns,
      "the operations table must contain only policy-allowlisted fields"
    );

    const disabledCallCount = databaseCalls;
    await assert.rejects(
      openPrivacyRequestOperation(
        {
          caseReference: disabledCaseReference,
          lane: "first_party"
        },
        { database, environment: {} }
      ),
      /disabled/
    );
    assert.equal(databaseCalls, disabledCallCount, "a disabled operation must not touch PostgreSQL");

    await assert.rejects(
      runPrivacyRequestOperationsRetention({
        database,
        environment: enabledEnvironment,
        now: new Date("2026-09-14T16:00:00.000Z")
      }),
      /retention sweep is disabled/
    );
    assert.equal(
      databaseCalls,
      disabledCallCount,
      "a disabled retention sweep must not touch PostgreSQL"
    );

    await databaseEngine.query('INSERT INTO "User" ("id") VALUES ($1)', [
      syntheticUserReference
    ]);
    await databaseEngine.query(
      `
        INSERT INTO "PrivacyRequest" (
          "id", "userId", "requestType", "detail", "status", "requestedAt",
          "acknowledgedAt", "createdAt", "updatedAt"
        ) VALUES ($1, $2, 'data_export', $3, 'new', $4, $5, $4, $4)
      `,
      [
        firstPartyCaseReference,
        syntheticUserReference,
        syntheticOptionalDetail,
        new Date("2026-09-14T16:00:00.000Z"),
        new Date("2026-09-14T16:00:01.000Z")
      ]
    );

    const opened = await openPrivacyRequestOperation(
      {
        caseReference: firstPartyCaseReference,
        lane: "first_party"
      },
      { database, environment: enabledEnvironment }
    );
    assert.equal(opened.workflowStatus, "new");
    assert.equal(opened.humanAcknowledgementAt, null);
    assert.equal(opened.operator, null);
    assert.equal(opened.machineReceiptAt, "2026-09-14T16:00:01.000Z");
    const reopened = await openPrivacyRequestOperation(
      { caseReference: firstPartyCaseReference, lane: "first_party" },
      { database, environment: enabledEnvironment }
    );
    assert.equal(reopened.caseReference, opened.caseReference);

    const acknowledged = await acknowledgePrivacyRequestOperation(
      firstPartyCaseReference,
      "privacy_owner",
      {
        database,
        environment: enabledEnvironment,
        now: new Date("2026-09-14T17:00:00.000Z")
      }
    );
    assert.equal(acknowledged.workflowStatus, "reviewing");
    assert.equal(acknowledged.humanAcknowledgementAt, "2026-09-14T17:00:00.000Z");

    const reviewed = await reviewPrivacyRequestOperation(
      firstPartyCaseReference,
      {
        exceptionCategory: "none",
        identityState: "reauthenticated",
        operator: "privacy_owner",
        reauthenticatedAt: new Date("2026-09-14T17:04:00.000Z"),
        sourceBoundaryCategories: [
          "account_profile",
          "saved_activity",
          "provider",
          "provider"
        ]
      },
      {
        database,
        environment: enabledEnvironment,
        now: new Date("2026-09-14T17:05:00.000Z")
      }
    );
    assert.equal(reviewed.identityState, "reauthenticated");
    assert.deepEqual(reviewed.sourceBoundaryCategories, [
      "account_profile",
      "saved_activity",
      "provider"
    ]);

    await assert.rejects(
      resolvePrivacyRequestOperation(
        firstPartyCaseReference,
        {
          exceptionCategory: "none",
          operator: "privacy_owner",
          reauthenticatedAt: new Date("2026-09-14T17:04:59.999Z"),
          resolution: "fulfilled"
        },
        {
          database,
          environment: enabledEnvironment,
          now: reauthenticationBoundary
        }
      ),
      /rejected/
    );

    const resolved = await resolvePrivacyRequestOperation(
      firstPartyCaseReference,
      {
        exceptionCategory: "none",
        operator: "privacy_owner",
        reauthenticatedAt: new Date("2026-09-14T17:10:00.000Z"),
        resolution: "fulfilled"
      },
      {
        database,
        environment: enabledEnvironment,
        now: reauthenticationBoundary
      }
    );
    assert.equal(resolved.workflowStatus, "resolved");
    assert.equal(resolved.resolvedAt, "2026-09-14T17:20:00.000Z");
    assert.equal(resolved.deleteAt, "2028-09-14T17:20:00.000Z");

    await databaseEngine.query(
      `
        UPDATE "PrivacyRequest"
        SET "status" = 'resolved', "resolvedAt" = $2, "resolution" = 'fulfilled', "updatedAt" = $2
        WHERE "id" = $1
      `,
      [firstPartyCaseReference, reauthenticationBoundary]
    );

    const beforeDetailExpiry = await runPrivacyRequestOperationsRetention({
      database,
      environment: retentionEnvironment,
      now: new Date("2026-10-13T17:20:00.000Z")
    });
    assert.deepEqual(beforeDetailExpiry, {
      closedOperationRecordsDeleted: 0,
      optionalDetailsMinimized: 0
    });

    const afterDetailExpiry = await runPrivacyRequestOperationsRetention({
      database,
      environment: retentionEnvironment,
      now: new Date("2026-10-15T17:20:00.000Z")
    });
    assert.deepEqual(afterDetailExpiry, {
      closedOperationRecordsDeleted: 0,
      optionalDetailsMinimized: 1
    });
    const detailResult = await databaseEngine.query<{ detail: string | null }>(
      'SELECT "detail" FROM "PrivacyRequest" WHERE "id" = $1',
      [firstPartyCaseReference]
    );
    assert.equal(detailResult.rows[0]?.detail, null);

    const mailboxOpened = await openPrivacyRequestOperation(
      {
        identityState: "escalation_required",
        lane: "mailbox",
        machineReceiptAt: new Date("2026-09-14T16:30:01.000Z"),
        receivedAt: new Date("2026-09-14T16:30:00.000Z"),
        requestType: "data_export"
      },
      { database, environment: enabledEnvironment }
    );
    assert.equal(mailboxOpened.exceptionCategory, "identity_ambiguity");
    const mailboxCaseReference = mailboxOpened.caseReference;

    await acknowledgePrivacyRequestOperation(
      mailboxCaseReference,
      "privacy_owner",
      {
        database,
        environment: enabledEnvironment,
        now: new Date("2026-09-14T17:30:00.000Z")
      }
    );
    await reviewPrivacyRequestOperation(
      mailboxCaseReference,
      {
        exceptionCategory: "identity_ambiguity",
        identityState: "escalation_required",
        operator: "privacy_owner",
        sourceBoundaryCategories: ["account_profile"]
      },
      {
        database,
        environment: enabledEnvironment,
        now: new Date("2026-09-14T17:35:00.000Z")
      }
    );
    await assert.rejects(
      resolvePrivacyRequestOperation(
        mailboxCaseReference,
        {
          exceptionCategory: "identity_ambiguity",
          operator: "privacy_owner",
          reauthenticatedAt: new Date("2026-09-14T17:55:00.000Z"),
          resolution: "fulfilled"
        },
        {
          database,
          environment: enabledEnvironment,
          now: new Date("2026-09-14T18:00:00.000Z")
        }
      ),
      /rejected/
    );
    const escalatedResolution = await resolvePrivacyRequestOperation(
      mailboxCaseReference,
      {
        exceptionCategory: "identity_ambiguity",
        operator: "privacy_owner",
        resolution: "denied"
      },
      {
        database,
        environment: enabledEnvironment,
        now: new Date("2026-09-14T18:00:00.000Z")
      }
    );
    assert.equal(escalatedResolution.resolution, "denied");
    assert.equal(escalatedResolution.identityState, "escalation_required");

    await assert.rejects(
      databaseEngine.query(
        'UPDATE "PrivacyRequestOperation" SET "sourceBoundaryCategories" = ARRAY[$2] WHERE "caseReference" = $1',
        [mailboxCaseReference, "raw_mailbox_body"]
      ),
      /sourceBoundaryCategories_check/
    );
    await assert.rejects(
      openPrivacyRequestOperation(
        {
          caseReference: "invalid@reference",
          lane: "first_party"
        },
        { database, environment: enabledEnvironment }
      ),
      /reference is invalid/
    );

    const beforeClosedCaseExpiry = await runPrivacyRequestOperationsRetention({
      database,
      environment: retentionEnvironment,
      now: new Date("2028-09-14T17:19:59.999Z")
    });
    assert.equal(beforeClosedCaseExpiry.closedOperationRecordsDeleted, 0);

    const atClosedCaseExpiry = await runPrivacyRequestOperationsRetention({
      database,
      environment: retentionEnvironment,
      now: new Date("2028-09-14T17:20:00.000Z")
    });
    assert.equal(atClosedCaseExpiry.closedOperationRecordsDeleted, 1);

    const remainingResult = await databaseEngine.query<{ count: number }>(
      'SELECT COUNT(*)::int AS "count" FROM "PrivacyRequestOperation"'
    );
    assert.equal(remainingResult.rows[0]?.count, 1, "the later mailbox case must remain retained");
  } finally {
    await databaseEngine.close();
  }
}

main()
  .then(() => {
    console.log(
      "Privacy-request synthetic PostgreSQL lifecycle passed; the in-memory database was closed."
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
