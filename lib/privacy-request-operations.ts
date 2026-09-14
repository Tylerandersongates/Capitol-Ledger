import { randomUUID } from "node:crypto";
import {
  isFreshPrivacyRequestReauthentication,
  privacyRequestHighRiskFulfillmentResolutions,
  privacyRequestOperationExceptionCategories,
  privacyRequestOperationIdentityStates,
  privacyRequestOperationSourceBoundaryCategories,
  type PrivacyRequestOperationExceptionCategory,
  type PrivacyRequestOperationIdentityState,
  type PrivacyRequestOperationLane,
  type PrivacyRequestOperationRecord,
  type PrivacyRequestOperationSourceBoundaryCategory,
  type PrivacyRequestOperatorRole
} from "@/lib/privacy-request-operations-contract";
import type {
  PrivacyRequestResolution,
  PrivacyRequestType
} from "@/lib/privacy-request-contract";
import { getPrisma } from "@/lib/prisma";

export const privacyRequestOperationsEnvironmentVariable =
  "PRIVACY_REQUEST_OPERATIONS_ENABLED";

type PrivacyRequestOperationRow = {
  caseReference: string;
  deleteAt: Date | string | null;
  exceptionCategory: PrivacyRequestOperationExceptionCategory;
  humanAcknowledgementAt: Date | string | null;
  identityState: PrivacyRequestOperationIdentityState;
  lane: PrivacyRequestOperationLane;
  machineReceiptAt: Date | string;
  operator: PrivacyRequestOperatorRole | null;
  receivedAt: Date | string;
  requestType: PrivacyRequestType;
  resolution: PrivacyRequestResolution | null;
  resolvedAt: Date | string | null;
  sourceBoundaryCategories: PrivacyRequestOperationSourceBoundaryCategory[];
  workflowStatus: "new" | "reviewing" | "resolved";
};

type AggregateCountRow = { count: number | bigint | string };

export type PrivacyRequestOperationsDatabaseClient = {
  $queryRawUnsafe: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
};

type PrivacyRequestOperationsOptions = {
  database?: PrivacyRequestOperationsDatabaseClient;
  environment?: Record<string, string | undefined>;
  now?: Date;
};

type OpenPrivacyRequestOperationInput =
  | {
      caseReference: string;
      lane: "first_party";
    }
  | {
      caseReference?: never;
      identityState: "email_control" | "escalation_required";
      lane: "mailbox";
      machineReceiptAt: Date;
      receivedAt: Date;
      requestType: PrivacyRequestType;
    };

type ReviewPrivacyRequestOperationInput = {
  exceptionCategory: PrivacyRequestOperationExceptionCategory;
  identityState: PrivacyRequestOperationIdentityState;
  operator: PrivacyRequestOperatorRole;
  reauthenticatedAt?: Date | null;
  sourceBoundaryCategories: PrivacyRequestOperationSourceBoundaryCategory[];
};

type ResolvePrivacyRequestOperationInput = {
  exceptionCategory: PrivacyRequestOperationExceptionCategory;
  operator: PrivacyRequestOperatorRole;
  reauthenticatedAt?: Date | null;
  resolution: PrivacyRequestResolution;
};

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toRecord(row: PrivacyRequestOperationRow): PrivacyRequestOperationRecord {
  return {
    caseReference: row.caseReference,
    deleteAt: row.deleteAt ? toIsoString(row.deleteAt) : null,
    exceptionCategory: row.exceptionCategory,
    humanAcknowledgementAt: row.humanAcknowledgementAt
      ? toIsoString(row.humanAcknowledgementAt)
      : null,
    identityState: row.identityState,
    lane: row.lane,
    machineReceiptAt: toIsoString(row.machineReceiptAt),
    operator: row.operator,
    receivedAt: toIsoString(row.receivedAt),
    requestType: row.requestType,
    resolution: row.resolution,
    resolvedAt: row.resolvedAt ? toIsoString(row.resolvedAt) : null,
    sourceBoundaryCategories: row.sourceBoundaryCategories,
    workflowStatus: row.workflowStatus
  };
}

function databaseFrom(options: PrivacyRequestOperationsOptions) {
  return options.database ?? (getPrisma() as unknown as PrivacyRequestOperationsDatabaseClient);
}

export function isPrivacyRequestOperationsEnabled(
  environment: Record<string, string | undefined> = process.env
) {
  return environment[privacyRequestOperationsEnvironmentVariable] === "true";
}

function assertOperationsEnabled(options: PrivacyRequestOperationsOptions) {
  if (!isPrivacyRequestOperationsEnabled(options.environment ?? process.env)) {
    throw new Error("Privacy request operations are disabled.");
  }
}

function assertValidCaseReference(caseReference: string) {
  if (!/^[A-Za-z0-9_-]{12,128}$/.test(caseReference)) {
    throw new Error("Privacy operation case reference is invalid.");
  }
}

function assertOperator(operator: PrivacyRequestOperatorRole) {
  if (operator !== "privacy_owner") {
    throw new Error("Privacy operation requires the privacy_owner role.");
  }
}

function normalizeSourceBoundaryCategories(
  categories: PrivacyRequestOperationSourceBoundaryCategory[]
) {
  const normalized = [...new Set(categories)];
  if (
    normalized.some(
      (category) => !privacyRequestOperationSourceBoundaryCategories.includes(category)
    )
  ) {
    throw new Error("Privacy operation source boundary category is invalid.");
  }
  return normalized;
}

function assertReviewInput(input: ReviewPrivacyRequestOperationInput, actionAt: Date) {
  assertOperator(input.operator);
  if (!privacyRequestOperationIdentityStates.includes(input.identityState)) {
    throw new Error("Privacy operation identity state is invalid.");
  }
  if (!privacyRequestOperationExceptionCategories.includes(input.exceptionCategory)) {
    throw new Error("Privacy operation exception category is invalid.");
  }
  if (
    input.identityState === "escalation_required" &&
    input.exceptionCategory !== "identity_ambiguity"
  ) {
    throw new Error("Identity escalation requires the identity_ambiguity category.");
  }
  if (
    input.identityState === "reauthenticated" &&
    !isFreshPrivacyRequestReauthentication(input.reauthenticatedAt, actionAt)
  ) {
    throw new Error("Fresh reauthentication is required.");
  }
}

/**
 * Creates only the policy allowlisted operational record. It has no public
 * route and stores no user ID, contact value, requester narrative, or payload.
 */
export async function openPrivacyRequestOperation(
  input: OpenPrivacyRequestOperationInput,
  options: PrivacyRequestOperationsOptions = {}
) {
  assertOperationsEnabled(options);
  const database = databaseFrom(options);
  let rows: PrivacyRequestOperationRow[];

  if (input.lane === "first_party") {
    assertValidCaseReference(input.caseReference);
    rows = await database.$queryRawUnsafe<PrivacyRequestOperationRow[]>(
      `
        WITH inserted AS (
          INSERT INTO "PrivacyRequestOperation" (
            "caseReference", "lane", "requestType", "receivedAt",
            "machineReceiptAt", "identityState", "workflowStatus",
            "sourceBoundaryCategories", "exceptionCategory"
          )
          SELECT
            request."id", 'first_party', request."requestType",
            request."requestedAt", request."acknowledgedAt", 'intake_identity',
            'new', ARRAY[]::TEXT[], 'none'
          FROM "PrivacyRequest" AS request
          WHERE request."id" = $1
          ON CONFLICT ("caseReference") DO NOTHING
          RETURNING *
        )
        SELECT * FROM inserted
        UNION ALL
        SELECT existing.*
        FROM "PrivacyRequestOperation" AS existing
        WHERE existing."caseReference" = $1
          AND existing."lane" = 'first_party'
          AND NOT EXISTS (SELECT 1 FROM inserted)
        LIMIT 1
      `,
      input.caseReference
    );
  } else {
    if (input.machineReceiptAt.getTime() < input.receivedAt.getTime()) {
      throw new Error("Machine receipt cannot precede receipt.");
    }
    const caseReference = randomUUID();
    const exceptionCategory =
      input.identityState === "escalation_required" ? "identity_ambiguity" : "none";
    rows = await database.$queryRawUnsafe<PrivacyRequestOperationRow[]>(
      `
        INSERT INTO "PrivacyRequestOperation" (
          "caseReference", "lane", "requestType", "receivedAt",
          "machineReceiptAt", "identityState", "workflowStatus",
          "sourceBoundaryCategories", "exceptionCategory"
        )
        VALUES ($1, 'mailbox', $2, $3, $4, $5, 'new', ARRAY[]::TEXT[], $6)
        RETURNING *
      `,
      caseReference,
      input.requestType,
      input.receivedAt,
      input.machineReceiptAt,
      input.identityState,
      exceptionCategory
    );
  }

  const row = rows[0];
  if (!row) throw new Error("Privacy operation was not persisted.");
  return toRecord(row);
}

export async function acknowledgePrivacyRequestOperation(
  caseReference: string,
  operator: PrivacyRequestOperatorRole,
  options: PrivacyRequestOperationsOptions = {}
) {
  assertOperationsEnabled(options);
  assertValidCaseReference(caseReference);
  assertOperator(operator);
  const acknowledgedAt = options.now ?? new Date();
  const rows = await databaseFrom(options).$queryRawUnsafe<PrivacyRequestOperationRow[]>(
    `
      UPDATE "PrivacyRequestOperation"
      SET
        "humanAcknowledgementAt" = $2,
        "operator" = $3,
        "workflowStatus" = 'reviewing'
      WHERE "caseReference" = $1
        AND "workflowStatus" = 'new'
        AND "humanAcknowledgementAt" IS NULL
      RETURNING *
    `,
    caseReference,
    acknowledgedAt,
    operator
  );

  const row = rows[0];
  if (!row) throw new Error("Privacy operation acknowledgement was rejected.");
  return toRecord(row);
}

export async function reviewPrivacyRequestOperation(
  caseReference: string,
  input: ReviewPrivacyRequestOperationInput,
  options: PrivacyRequestOperationsOptions = {}
) {
  assertOperationsEnabled(options);
  assertValidCaseReference(caseReference);
  const actionAt = options.now ?? new Date();
  assertReviewInput(input, actionAt);
  const sourceBoundaryCategories = normalizeSourceBoundaryCategories(
    input.sourceBoundaryCategories
  );
  const rows = await databaseFrom(options).$queryRawUnsafe<PrivacyRequestOperationRow[]>(
    `
      UPDATE "PrivacyRequestOperation"
      SET
        "identityState" = $2,
        "sourceBoundaryCategories" = $3,
        "exceptionCategory" = $4,
        "operator" = $5
      WHERE "caseReference" = $1
        AND "workflowStatus" = 'reviewing'
        AND "humanAcknowledgementAt" IS NOT NULL
      RETURNING *
    `,
    caseReference,
    input.identityState,
    sourceBoundaryCategories,
    input.exceptionCategory,
    input.operator
  );

  const row = rows[0];
  if (!row) throw new Error("Privacy operation review transition was rejected.");
  return toRecord(row);
}

export async function resolvePrivacyRequestOperation(
  caseReference: string,
  input: ResolvePrivacyRequestOperationInput,
  options: PrivacyRequestOperationsOptions = {}
) {
  assertOperationsEnabled(options);
  assertValidCaseReference(caseReference);
  assertOperator(input.operator);
  if (!privacyRequestOperationExceptionCategories.includes(input.exceptionCategory)) {
    throw new Error("Privacy operation exception category is invalid.");
  }

  const resolvedAt = options.now ?? new Date();
  const highRiskFulfillment =
    privacyRequestHighRiskFulfillmentResolutions.includes(input.resolution);
  const hasFreshReauthentication = isFreshPrivacyRequestReauthentication(
    input.reauthenticatedAt,
    resolvedAt
  );

  const rows = await databaseFrom(options).$queryRawUnsafe<PrivacyRequestOperationRow[]>(
    `
      UPDATE "PrivacyRequestOperation"
      SET
        "workflowStatus" = 'resolved',
        "resolution" = $2,
        "resolvedAt" = $3,
        "deleteAt" = $3::timestamptz + INTERVAL '24 months',
        "exceptionCategory" = $4,
        "operator" = $5
      WHERE "caseReference" = $1
        AND "workflowStatus" = 'reviewing'
        AND "humanAcknowledgementAt" IS NOT NULL
        AND (
          "requestType" NOT IN ('data_export', 'correction', 'account_deletion', 'consent_withdrawal')
          OR $2::text NOT IN ('fulfilled', 'partially_fulfilled')
          OR (
            "identityState" = 'reauthenticated'
            AND $6::boolean = TRUE
          )
        )
        AND (
          $2::text NOT IN ('partially_fulfilled', 'denied')
          OR $4::text <> 'none'
        )
        AND (
          $2::text NOT IN ('fulfilled', 'partially_fulfilled', 'denied')
          OR cardinality("sourceBoundaryCategories") > 0
        )
      RETURNING *
    `,
    caseReference,
    input.resolution,
    resolvedAt,
    input.exceptionCategory,
    input.operator,
    highRiskFulfillment ? hasFreshReauthentication : true
  );

  const row = rows[0];
  if (!row) throw new Error("Privacy operation resolution was rejected.");
  return toRecord(row);
}

/**
 * Applies only the approved 30-day detail minimization and 24-month closed-case
 * expiry. Both exact opt-in gates are required and only aggregate counts leave
 * the function.
 */
export async function runPrivacyRequestOperationsRetention(
  options: PrivacyRequestOperationsOptions = {}
) {
  assertOperationsEnabled(options);
  const environment = options.environment ?? process.env;
  if (environment.CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED !== "true") {
    throw new Error("Privacy retention sweep is disabled.");
  }

  const now = options.now ?? new Date();
  const database = databaseFrom(options);
  const minimizedRows = await database.$queryRawUnsafe<AggregateCountRow[]>(
    `
      WITH minimized AS (
        UPDATE "PrivacyRequest"
        SET "detail" = NULL, "updatedAt" = $1
        WHERE "status" = 'resolved'
          AND "detail" IS NOT NULL
          AND "resolvedAt" <= $1::timestamp - INTERVAL '30 days'
        RETURNING 1
      )
      SELECT COUNT(*)::int AS "count" FROM minimized
    `,
    now
  );
  const deletedRows = await database.$queryRawUnsafe<AggregateCountRow[]>(
    `
      WITH deleted AS (
        DELETE FROM "PrivacyRequestOperation"
        WHERE "workflowStatus" = 'resolved'
          AND "deleteAt" IS NOT NULL
          AND "deleteAt" <= $1
        RETURNING 1
      )
      SELECT COUNT(*)::int AS "count" FROM deleted
    `,
    now
  );

  return {
    closedOperationRecordsDeleted: Number(deletedRows[0]?.count ?? 0),
    optionalDetailsMinimized: Number(minimizedRows[0]?.count ?? 0)
  };
}
