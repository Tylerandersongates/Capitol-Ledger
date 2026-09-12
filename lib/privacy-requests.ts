import { randomUUID } from "crypto";
import type {
  PrivacyRequestPayload,
  PrivacyRequestResolution,
  PrivacyRequestStatus,
  PrivacyRequestSummary,
  PrivacyRequestType
} from "@/lib/privacy-request-contract";
import { runAccountPersistenceOperation } from "@/lib/account-persistence-safety";
import { getPrisma } from "@/lib/prisma";

type PrivacyRequestRow = {
  acknowledgedAt: Date | string;
  created?: boolean;
  id: string;
  requestType: PrivacyRequestType;
  requestedAt: Date | string;
  resolution: PrivacyRequestResolution | null;
  resolvedAt: Date | string | null;
  status: PrivacyRequestStatus;
};

export type PrivacyRequestDatabaseClient = {
  $queryRawUnsafe: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
};

type PrivacyRequestServiceOptions = {
  database?: PrivacyRequestDatabaseClient;
  now?: Date;
  requestId?: string;
};

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toSummary(row: PrivacyRequestRow): PrivacyRequestSummary {
  return {
    acknowledgedAt: toIsoString(row.acknowledgedAt),
    id: row.id,
    requestType: row.requestType,
    requestedAt: toIsoString(row.requestedAt),
    resolution: row.resolution,
    resolvedAt: row.resolvedAt ? toIsoString(row.resolvedAt) : null,
    status: row.status
  };
}

function databaseFrom(options?: PrivacyRequestServiceOptions) {
  return options?.database ?? (getPrisma() as unknown as PrivacyRequestDatabaseClient);
}

export async function listPrivacyRequestsForUser(
  userId: string,
  options?: PrivacyRequestServiceOptions
) {
  return runAccountPersistenceOperation("privacy request list", async () => {
    const rows = await databaseFrom(options).$queryRawUnsafe<PrivacyRequestRow[]>(
      `
        SELECT "id", "requestType", "status", "requestedAt", "acknowledgedAt", "resolvedAt", "resolution"
        FROM "PrivacyRequest"
        WHERE "userId" = $1
        ORDER BY "requestedAt" DESC
        LIMIT 20
      `,
      userId
    );

    return rows.map(toSummary);
  });
}

export async function createPrivacyRequestForUser(
  userId: string,
  payload: PrivacyRequestPayload,
  options?: PrivacyRequestServiceOptions
) {
  return runAccountPersistenceOperation("privacy request create", async () => {
    const database = databaseFrom(options);
    const now = options?.now ?? new Date();
    const requestId = options?.requestId ?? randomUUID();
    const rows = await database.$queryRawUnsafe<PrivacyRequestRow[]>(
      `
        WITH inserted AS (
          INSERT INTO "PrivacyRequest" (
            "id", "userId", "requestType", "detail", "status",
            "requestedAt", "acknowledgedAt", "createdAt", "updatedAt"
          )
          VALUES ($1, $2, $3, $4, 'new', $5, $5, $5, $5)
          ON CONFLICT ("userId", "requestType")
            WHERE "status" IN ('new', 'reviewing')
          DO NOTHING
          RETURNING
            "id", "requestType", "status", "requestedAt", "acknowledgedAt",
            "resolvedAt", "resolution", TRUE AS "created"
        )
        SELECT * FROM inserted
        UNION ALL
        SELECT
          existing."id", existing."requestType", existing."status",
          existing."requestedAt", existing."acknowledgedAt", existing."resolvedAt",
          existing."resolution", FALSE AS "created"
        FROM "PrivacyRequest" AS existing
        WHERE existing."userId" = $2
          AND existing."requestType" = $3
          AND existing."status" IN ('new', 'reviewing')
          AND NOT EXISTS (SELECT 1 FROM inserted)
        ORDER BY "created" DESC, "requestedAt" ASC
        LIMIT 1
      `,
      requestId,
      userId,
      payload.requestType,
      payload.detail,
      now
    );

    const row = rows[0] ?? (await database.$queryRawUnsafe<PrivacyRequestRow[]>(
      `
        SELECT "id", "requestType", "status", "requestedAt", "acknowledgedAt", "resolvedAt", "resolution"
        FROM "PrivacyRequest"
        WHERE "userId" = $1 AND "requestType" = $2 AND "status" IN ('new', 'reviewing')
        ORDER BY "requestedAt" ASC
        LIMIT 1
      `,
      userId,
      payload.requestType
    ))[0];

    if (!row) throw new Error("Privacy request was not persisted.");

    return {
      created: row.created === true,
      request: toSummary(row)
    };
  });
}
