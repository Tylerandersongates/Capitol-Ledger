import { randomUUID } from "crypto";
import type { AuthUser } from "@/lib/auth-database";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";

export type AccountDeletionRequestStatus = "new" | "reviewing" | "planned" | "resolved";

export type AccountDeletionRequestSummary = {
  completionBy: string;
  id: string;
  requestedAt: string;
  status: AccountDeletionRequestStatus;
};

type AccountDeletionRequestRow = {
  completionBy: Date;
  id: string;
  requestedAt: Date;
  status: AccountDeletionRequestStatus;
};

const accountDeletionCompletionDays = 7;

function toSummary(record: AccountDeletionRequestRow): AccountDeletionRequestSummary {
  return {
    completionBy: record.completionBy.toISOString(),
    id: record.id,
    requestedAt: record.requestedAt.toISOString(),
    status: record.status
  };
}

export async function getActiveAccountDeletionRequest(user: AuthUser) {
  if (!hasDatabaseUrl()) return null;

  const rows = await getPrisma()
    .$queryRaw<AccountDeletionRequestRow[]>`
      SELECT "id", "status", "requestedAt", "completionBy"
      FROM "AccountDeletionRequest"
      WHERE "userId" = ${user.id} AND "status" <> 'resolved'
      ORDER BY "requestedAt" DESC
      LIMIT 1
    `
    .catch(() => []);

  return rows[0] ? toSummary(rows[0]) : null;
}

export async function createAccountDeletionRequest(user: AuthUser) {
  if (!hasDatabaseUrl()) {
    return {
      error: "Account deletion requests need durable account storage. Please try again shortly.",
      status: 503 as const
    };
  }

  const existingRequest = await getActiveAccountDeletionRequest(user);
  if (existingRequest) {
    return {
      mode: "existing" as const,
      request: existingRequest
    };
  }

  const requestedAt = new Date();
  const completionBy = new Date(requestedAt.getTime() + accountDeletionCompletionDays * 24 * 60 * 60 * 1000);
  const id = `account-deletion-${randomUUID()}`;

  const rows = await getPrisma()
    .$queryRaw<AccountDeletionRequestRow[]>`
      INSERT INTO "AccountDeletionRequest" (
        "id",
        "userId",
        "status",
        "requestedAt",
        "completionBy",
        "appleSubscriptionAcknowledged",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${id},
        ${user.id},
        'new',
        ${requestedAt},
        ${completionBy},
        true,
        ${requestedAt},
        ${requestedAt}
      )
      RETURNING "id", "status", "requestedAt", "completionBy"
    `
    .catch(() => []);

  const record = rows[0];
  if (!record) {
    const concurrentRequest = await getActiveAccountDeletionRequest(user);
    if (concurrentRequest) {
      return {
        mode: "existing" as const,
        request: concurrentRequest
      };
    }

    return {
      error: "Account deletion request could not be recorded. Please try again shortly.",
      status: 503 as const
    };
  }

  return {
    mode: "database" as const,
    request: toSummary(record)
  };
}
