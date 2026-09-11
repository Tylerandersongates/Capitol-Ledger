import { randomUUID } from "crypto";
import type { AuthUser } from "@/lib/auth-database";
import {
  accountDeletionCleanupKinds,
  processAccountDeletionCleanupJobs
} from "@/lib/account-deletion-cleanup";
import { clearAccountGamificationMemory } from "@/lib/account-gamification";
import { clearAccountLedgerMemory } from "@/lib/account-ledger";
import { clearAccountProfileMemory } from "@/lib/account-profile";
import { clearPetitionSignatureMemory } from "@/lib/account-petition-signatures";
import { clearAccountSubscriptionMemory } from "@/lib/account-subscription";
import { clearOfficialContactMemory } from "@/lib/official-contact-messages";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";
import { clearTeamSubscriptionTransitionMemory } from "@/lib/team-subscription-transition";
import { clearTeamWorkspaceMemory } from "@/lib/team-workspace";
import { clearWeeklyBriefEditionMemory } from "@/lib/weekly-brief-edition";
import { clearWeeklyBriefHistoryMemory } from "@/lib/weekly-brief-history";

export type AccountDeletionRequestStatus = "new" | "reviewing" | "planned" | "resolved";

export type AccountDeletionRequestSummary = {
  completedAt?: string;
  completionBy: string;
  id: string;
  requestedAt: string;
  status: AccountDeletionRequestStatus;
};

type AccountDeletionRequestRow = {
  completedAt: Date | null;
  completionBy: Date;
  id: string;
  requestedAt: Date;
  status: AccountDeletionRequestStatus;
};

type LockedUserRow = {
  email: string;
  id: string;
};

type DeletionTableRegistration = {
  accountDeletionCleanupJob: string | null;
  appStoreNotificationReceipt: string | null;
  appStoreSubscriptionState: string | null;
  betaFeedback: string | null;
  officialContactMessage: string | null;
  petitionSignature: string | null;
  teamInvite: string | null;
  teamMember: string | null;
  teamSubscriptionPause: string | null;
  teamWorkspace: string | null;
};

type AccountSubscriptionDeletionRow = {
  provider: string;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
};

type TeamSubscriptionPauseDeletionRow = {
  previousSubscription: unknown;
  userId: string;
};

type StripeCleanupReference = {
  customerId?: string;
  subscriptionId?: string;
};

type RemainingAccountRows = {
  accountDeletionRequests: number;
  accountGamification: number;
  accountSubscriptions: number;
  authSessions: number;
  emailVerificationTokens: number;
  follows: number;
  issueInterests: number;
  passwordResetTokens: number;
  readAlerts: number;
  savedAlerts: number;
  teamWorkspaces: number;
  updateEvents: number;
  users: number;
  weeklyBriefDeliveries: number;
  weeklyBriefEditions: number;
};

export type AccountDeletionTransactionClient = {
  $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<number>;
  $queryRawUnsafe: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
};

export type AccountDeletionDatabaseClient = {
  $transaction: <T>(
    operation: (transaction: AccountDeletionTransactionClient) => Promise<T>,
    options?: { isolationLevel: "Serializable" }
  ) => Promise<T>;
};

export type AccountDeletionOutcome =
  | {
      completedAt: string;
      mode: "already-deleted";
      request: null;
    }
  | {
      completedAt: string;
      mode: "completed";
      request: AccountDeletionRequestSummary;
    };

export class AccountDeletionUnavailableError extends Error {
  status = 503;

  constructor(message = "Account deletion could not be completed. Your account is unchanged; please try again shortly.") {
    super(message);
    this.name = "AccountDeletionUnavailableError";
  }
}

const accountDeletionCompletionDays = 7;

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function toSummary(record: AccountDeletionRequestRow): AccountDeletionRequestSummary {
  return {
    completedAt: record.completedAt?.toISOString(),
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
      SELECT "id", "status", "requestedAt", "completionBy", "completedAt"
      FROM "AccountDeletionRequest"
      WHERE "userId" = ${user.id} AND "status" <> 'resolved'
      ORDER BY "requestedAt" DESC
      LIMIT 1
    `
    .catch(() => []);

  return rows[0] ? toSummary(rows[0]) : null;
}

function clearInMemoryAccountData(userId: string, email: string) {
  const cleanupOperations: Array<[label: string, operation: () => unknown]> = [
    ["ledger", () => clearAccountLedgerMemory(userId)],
    ["profile", () => clearAccountProfileMemory(userId)],
    ["subscription", () => clearAccountSubscriptionMemory(userId)],
    ["gamification", () => clearAccountGamificationMemory(userId)],
    ["brief history", () => clearWeeklyBriefHistoryMemory(userId, email)],
    ["brief edition", () => clearWeeklyBriefEditionMemory(userId)],
    ["official contact", () => clearOfficialContactMemory(userId, email)],
    ["petition signature", () => clearPetitionSignatureMemory(userId)],
    ["Team subscription transition", () => clearTeamSubscriptionTransitionMemory(userId)],
    ["Team workspace", () => clearTeamWorkspaceMemory(userId, email)]
  ];

  for (const [label, operation] of cleanupOperations) {
    try {
      operation();
    } catch {
      console.warn(`[account-deletion] post-commit ${label} cache cleanup did not complete.`);
    }
  }
}

async function readOrCreateDeletionRequest(
  transaction: AccountDeletionTransactionClient,
  userId: string,
  now: Date
) {
  const existingRows = await transaction.$queryRawUnsafe<AccountDeletionRequestRow[]>(
    `
      SELECT "id", "status", "requestedAt", "completionBy", "completedAt"
      FROM "AccountDeletionRequest"
      WHERE "userId" = $1 AND "status" <> 'resolved'
      ORDER BY "requestedAt" DESC
      LIMIT 1
      FOR UPDATE
    `,
    userId
  );
  if (existingRows[0]) return existingRows[0];

  const completionBy = new Date(now.getTime() + accountDeletionCompletionDays * 24 * 60 * 60 * 1000);
  const requestRows = await transaction.$queryRawUnsafe<AccountDeletionRequestRow[]>(
    `
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
      VALUES ($1, $2, 'new', $3, $4, true, $3, $3)
      RETURNING "id", "status", "requestedAt", "completionBy", "completedAt"
    `,
    `account-deletion-${randomUUID()}`,
    userId,
    now,
    completionBy
  );

  if (!requestRows[0]) throw new AccountDeletionUnavailableError();
  return requestRows[0];
}

async function readDeletionTableRegistration(transaction: AccountDeletionTransactionClient) {
  const rows = await transaction.$queryRawUnsafe<DeletionTableRegistration[]>(`
    SELECT
      to_regclass('public."AccountDeletionCleanupJob"')::text AS "accountDeletionCleanupJob",
      to_regclass('public."AppStoreNotificationReceipt"')::text AS "appStoreNotificationReceipt",
      to_regclass('public."AppStoreSubscriptionState"')::text AS "appStoreSubscriptionState",
      to_regclass('public."BetaFeedback"')::text AS "betaFeedback",
      to_regclass('public."OfficialContactMessage"')::text AS "officialContactMessage",
      to_regclass('public."PetitionSignature"')::text AS "petitionSignature",
      to_regclass('public."TeamInvite"')::text AS "teamInvite",
      to_regclass('public."TeamMember"')::text AS "teamMember",
      to_regclass('public."TeamSubscriptionPause"')::text AS "teamSubscriptionPause",
      to_regclass('public."TeamWorkspace"')::text AS "teamWorkspace"
  `);

  return rows[0] ?? {
    accountDeletionCleanupJob: null,
    appStoreNotificationReceipt: null,
    appStoreSubscriptionState: null,
    betaFeedback: null,
    officialContactMessage: null,
    petitionSignature: null,
    teamInvite: null,
    teamMember: null,
    teamSubscriptionPause: null,
    teamWorkspace: null
  };
}

async function enqueueCleanupJob(
  transaction: AccountDeletionTransactionClient,
  input: {
    dedupeKey: string;
    deletionRequestId: string;
    kind: string;
    payload: unknown;
  },
  now: Date
) {
  const inserted = await transaction.$executeRawUnsafe(
    `
      INSERT INTO "AccountDeletionCleanupJob" (
        "id", "deletionRequestId", "dedupeKey", "kind", "payload", "status",
        "attempts", "availableAt", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, 'pending', 0, $6, $6, $6)
      ON CONFLICT ("dedupeKey") DO NOTHING
    `,
    `account-deletion-cleanup-${randomUUID()}`,
    input.deletionRequestId,
    input.dedupeKey,
    input.kind,
    JSON.stringify(input.payload),
    now
  );
  if (inserted !== 1) {
    const rows = await transaction.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT COUNT(*)::int AS "count" FROM "AccountDeletionCleanupJob" WHERE "dedupeKey" = $1 AND "deletionRequestId" = $2`,
      input.dedupeKey,
      input.deletionRequestId
    );
    if (Number(rows[0]?.count ?? 0) !== 1) throw new AccountDeletionUnavailableError();
  }
}

function stripeCleanupReference(value: unknown): StripeCleanupReference | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.provider !== "stripe") return null;

  const subscriptionId = typeof record.providerSubscriptionId === "string" && record.providerSubscriptionId.startsWith("sub_")
    ? record.providerSubscriptionId
    : undefined;
  const customerId = typeof record.providerCustomerId === "string" && record.providerCustomerId.startsWith("cus_")
    ? record.providerCustomerId
    : undefined;
  if (!subscriptionId && !customerId) return null;
  return { customerId, subscriptionId };
}

function isRestorableTeamSubscription(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    record.plan === "pro" &&
    (record.cycle === "monthly" || record.cycle === "annual") &&
    (record.provider === "stripe" || record.provider === "app-store" || record.provider === "revenuecat" || record.provider === "demo") &&
    (record.status === "active" || record.status === "trialing" || record.status === "past_due" || record.status === "canceled")
  );
}

async function enqueueStripeCleanupJob(
  transaction: AccountDeletionTransactionClient,
  deletionRequestId: string,
  reference: StripeCleanupReference,
  now: Date
) {
  const providerKey = reference.subscriptionId ?? reference.customerId;
  await enqueueCleanupJob(
    transaction,
    {
      dedupeKey: `${deletionRequestId}:stripe:${providerKey}`,
      deletionRequestId,
      kind: accountDeletionCleanupKinds.cancelDeletedAccountStripeSubscription,
      payload: reference
    },
    now
  );
}

async function snapshotPostCommitCleanupJobs(
  transaction: AccountDeletionTransactionClient,
  tables: DeletionTableRegistration,
  deletionRequestId: string,
  userId: string,
  ownedWorkspaceIds: string[],
  now: Date
) {
  if (!tables.accountDeletionCleanupJob) throw new AccountDeletionUnavailableError();

  const subscriptions = await transaction.$queryRawUnsafe<AccountSubscriptionDeletionRow[]>(
    `
      SELECT "provider", "providerCustomerId", "providerSubscriptionId"
      FROM "AccountSubscription"
      WHERE "userId" = $1
      LIMIT 1
      FOR UPDATE
    `,
    userId
  );
  const subscriptionReference = stripeCleanupReference(subscriptions[0]);
  if (subscriptionReference) {
    await enqueueStripeCleanupJob(transaction, deletionRequestId, subscriptionReference, now);
  }

  if (!tables.teamSubscriptionPause) return;
  const deletingAccountPauses = await transaction.$queryRawUnsafe<TeamSubscriptionPauseDeletionRow[]>(
    `
      SELECT "userId", "previousSubscription"
      FROM "TeamSubscriptionPause"
      WHERE "userId" = $1 AND "status" = 'active'
      FOR UPDATE
    `,
    userId
  );
  for (const pause of deletingAccountPauses) {
    const pauseReference = stripeCleanupReference(pause.previousSubscription);
    if (pauseReference) {
      await enqueueStripeCleanupJob(transaction, deletionRequestId, pauseReference, now);
    }
  }

  for (const workspaceId of ownedWorkspaceIds) {
    const pauses = await transaction.$queryRawUnsafe<TeamSubscriptionPauseDeletionRow[]>(
      `
        SELECT "userId", "previousSubscription"
        FROM "TeamSubscriptionPause"
        WHERE "workspaceId" = $1 AND "status" = 'active' AND "userId" <> $2
        FOR UPDATE
      `,
      workspaceId,
      userId
    );

    for (const pause of pauses) {
      if (!isRestorableTeamSubscription(pause.previousSubscription)) {
        throw new AccountDeletionUnavailableError();
      }
      await enqueueCleanupJob(
        transaction,
        {
          dedupeKey: `${deletionRequestId}:team-member:${pause.userId}`,
          deletionRequestId,
          kind: accountDeletionCleanupKinds.restoreTeamMemberSubscription,
          payload: {
            previousSubscription: pause.previousSubscription,
            userId: pause.userId
          }
        },
        now
      );
    }
  }
}

async function deleteOptionalAccountRows(
  transaction: AccountDeletionTransactionClient,
  tables: DeletionTableRegistration,
  userId: string,
  email: string,
  ownedWorkspaceIds: string[]
) {
  if (tables.teamMember) {
    await transaction.$executeRawUnsafe(
      `DELETE FROM "TeamMember" WHERE "userId" = $1 OR lower("email") = $2`,
      userId,
      email
    );
  }

  if (tables.teamInvite) {
    await transaction.$executeRawUnsafe(`DELETE FROM "TeamInvite" WHERE lower("email") = $1`, email);
  }

  if (tables.betaFeedback) {
    await transaction.$executeRawUnsafe(
      `DELETE FROM "BetaFeedback" WHERE "userId" = $1 OR lower(COALESCE("contactEmail", '')) = $2`,
      userId,
      email
    );
  }

  if (tables.officialContactMessage) {
    await transaction.$executeRawUnsafe(
      `
        DELETE FROM "OfficialContactMessage"
        WHERE "userId" = $1
          OR lower("senderEmail") = $2
          OR lower("senderKey") IN ($3, $4)
      `,
      userId,
      email,
      `user:${userId.toLowerCase()}`,
      `email:${email}`
    );
  }

  if (tables.petitionSignature) {
    await transaction.$executeRawUnsafe(`DELETE FROM "PetitionSignature" WHERE "userId" = $1`, userId);
  }

  if (tables.teamSubscriptionPause) {
    await transaction.$executeRawUnsafe(
      `DELETE FROM "TeamSubscriptionPause" WHERE "userId" = $1 OR lower("email") = $2`,
      userId,
      email
    );
    for (const workspaceId of ownedWorkspaceIds) {
      await transaction.$executeRawUnsafe(
        `DELETE FROM "TeamSubscriptionPause" WHERE "workspaceId" = $1`,
        workspaceId
      );
    }
  }
}

function hasRemainingRows(record: object) {
  return Object.values(record as Record<string, number | bigint | string>).some((value) => Number(value) !== 0);
}

async function assertAccountRowsDeleted(
  transaction: AccountDeletionTransactionClient,
  tables: DeletionTableRegistration,
  userId: string,
  email: string,
  ownedWorkspaceIds: string[]
) {
  const requiredRows = await transaction.$queryRawUnsafe<RemainingAccountRows[]>(
    `
      SELECT
        (SELECT COUNT(*)::int FROM "User" WHERE "id" = $1) AS "users",
        (SELECT COUNT(*)::int FROM "AuthSession" WHERE "userId" = $1) AS "authSessions",
        (SELECT COUNT(*)::int FROM "EmailVerificationToken" WHERE "userId" = $1) AS "emailVerificationTokens",
        (SELECT COUNT(*)::int FROM "PasswordResetToken" WHERE "userId" = $1) AS "passwordResetTokens",
        (SELECT COUNT(*)::int FROM "Follow" WHERE "userId" = $1) AS "follows",
        (SELECT COUNT(*)::int FROM "SavedAlert" WHERE "userId" = $1) AS "savedAlerts",
        (SELECT COUNT(*)::int FROM "ReadAlert" WHERE "userId" = $1) AS "readAlerts",
        (SELECT COUNT(*)::int FROM "IssueInterest" WHERE "userId" = $1) AS "issueInterests",
        (SELECT COUNT(*)::int FROM "AccountSubscription" WHERE "userId" = $1) AS "accountSubscriptions",
        (SELECT COUNT(*)::int FROM "AccountGamification" WHERE "userId" = $1) AS "accountGamification",
        (SELECT COUNT(*)::int FROM "WeeklyBriefDelivery" WHERE "userId" = $1) AS "weeklyBriefDeliveries",
        (SELECT COUNT(*)::int FROM "WeeklyBriefEdition" WHERE "userId" = $1) AS "weeklyBriefEditions",
        (SELECT COUNT(*)::int FROM "UpdateEvent" WHERE "userId" = $1) AS "updateEvents",
        (SELECT COUNT(*)::int FROM "TeamWorkspace" WHERE "ownerUserId" = $1) AS "teamWorkspaces",
        (SELECT COUNT(*)::int FROM "AccountDeletionRequest" WHERE "userId" = $1) AS "accountDeletionRequests"
    `,
    userId
  );
  if (!requiredRows[0] || hasRemainingRows(requiredRows[0])) throw new AccountDeletionUnavailableError();

  const optionalChecks: Array<{ enabled: boolean; query: string; values: unknown[] }> = [
    {
      enabled: Boolean(tables.appStoreSubscriptionState),
      query: `SELECT COUNT(*)::int AS "count" FROM "AppStoreSubscriptionState" WHERE "userId" = $1`,
      values: [userId]
    },
    {
      enabled: Boolean(tables.appStoreNotificationReceipt),
      query: `SELECT COUNT(*)::int AS "count" FROM "AppStoreNotificationReceipt" WHERE "userId" = $1`,
      values: [userId]
    },
    {
      enabled: Boolean(tables.teamMember),
      query: `SELECT COUNT(*)::int AS "count" FROM "TeamMember" WHERE "userId" = $1 OR lower("email") = $2`,
      values: [userId, email]
    },
    {
      enabled: Boolean(tables.teamInvite),
      query: `SELECT COUNT(*)::int AS "count" FROM "TeamInvite" WHERE lower("email") = $1`,
      values: [email]
    },
    {
      enabled: Boolean(tables.betaFeedback),
      query: `SELECT COUNT(*)::int AS "count" FROM "BetaFeedback" WHERE "userId" = $1 OR lower(COALESCE("contactEmail", '')) = $2`,
      values: [userId, email]
    },
    {
      enabled: Boolean(tables.officialContactMessage),
      query: `SELECT COUNT(*)::int AS "count" FROM "OfficialContactMessage" WHERE "userId" = $1 OR lower("senderEmail") = $2 OR lower("senderKey") IN ($3, $4)`,
      values: [userId, email, `user:${userId.toLowerCase()}`, `email:${email}`]
    },
    {
      enabled: Boolean(tables.petitionSignature),
      query: `SELECT COUNT(*)::int AS "count" FROM "PetitionSignature" WHERE "userId" = $1`,
      values: [userId]
    },
    {
      enabled: Boolean(tables.teamSubscriptionPause),
      query: `SELECT COUNT(*)::int AS "count" FROM "TeamSubscriptionPause" WHERE "userId" = $1 OR lower("email") = $2`,
      values: [userId, email]
    }
  ];

  for (const check of optionalChecks) {
    if (!check.enabled) continue;
    const rows = await transaction.$queryRawUnsafe<Array<{ count: number }>>(check.query, ...check.values);
    if (!rows[0] || Number(rows[0].count) !== 0) throw new AccountDeletionUnavailableError();
  }

  if (tables.teamSubscriptionPause) {
    for (const workspaceId of ownedWorkspaceIds) {
      const rows = await transaction.$queryRawUnsafe<Array<{ count: number }>>(
        `SELECT COUNT(*)::int AS "count" FROM "TeamSubscriptionPause" WHERE "workspaceId" = $1`,
        workspaceId
      );
      if (!rows[0] || Number(rows[0].count) !== 0) throw new AccountDeletionUnavailableError();
    }
  }
}

export async function runAccountDeletionTransaction(
  client: AccountDeletionDatabaseClient,
  user: Pick<AuthUser, "id" | "email">,
  now = new Date()
): Promise<AccountDeletionOutcome> {
  return client.$transaction(async (transaction) => {
    const userRows = await transaction.$queryRawUnsafe<LockedUserRow[]>(
      `SELECT "id", "email" FROM "User" WHERE "id" = $1 LIMIT 1 FOR UPDATE`,
      user.id
    );
    const persistedUser = userRows[0];
    if (!persistedUser) {
      return {
        completedAt: now.toISOString(),
        mode: "already-deleted",
        request: null
      };
    }

    const normalizedEmail = persistedUser.email.trim().toLowerCase();
    const deletionRequest = await readOrCreateDeletionRequest(transaction, persistedUser.id, now);
    const tables = await readDeletionTableRegistration(transaction);
    const ownedWorkspaceRows = tables.teamWorkspace
      ? await transaction.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT "id" FROM "TeamWorkspace" WHERE "ownerUserId" = $1 FOR UPDATE`,
          persistedUser.id
        )
      : [];
    const ownedWorkspaceIds = ownedWorkspaceRows.map((workspace) => workspace.id);

    await snapshotPostCommitCleanupJobs(
      transaction,
      tables,
      deletionRequest.id,
      persistedUser.id,
      ownedWorkspaceIds,
      now
    );
    await transaction.$executeRawUnsafe(`DELETE FROM "AuthSession" WHERE "userId" = $1`, persistedUser.id);
    await deleteOptionalAccountRows(transaction, tables, persistedUser.id, normalizedEmail, ownedWorkspaceIds);

    const deletedUsers = await transaction.$executeRawUnsafe(
      `DELETE FROM "User" WHERE "id" = $1`,
      persistedUser.id
    );
    if (deletedUsers !== 1) throw new AccountDeletionUnavailableError();

    const resolvedRequests = await transaction.$executeRawUnsafe(
      `
        UPDATE "AccountDeletionRequest"
        SET "userId" = NULL,
            "status" = 'resolved',
            "completedAt" = $2,
            "updatedAt" = $2
        WHERE "id" = $1
      `,
      deletionRequest.id,
      now
    );
    if (resolvedRequests !== 1) throw new AccountDeletionUnavailableError();

    await assertAccountRowsDeleted(transaction, tables, persistedUser.id, normalizedEmail, ownedWorkspaceIds);
    const completedRequests = await transaction.$queryRawUnsafe<AccountDeletionRequestRow[]>(
      `
        SELECT "id", "status", "requestedAt", "completionBy", "completedAt"
        FROM "AccountDeletionRequest"
        WHERE "id" = $1 AND "userId" IS NULL AND "status" = 'resolved' AND "completedAt" IS NOT NULL
        LIMIT 1
      `,
      deletionRequest.id
    );
    if (!completedRequests[0]) throw new AccountDeletionUnavailableError();

    return {
      completedAt: now.toISOString(),
      mode: "completed",
      request: toSummary({
        ...completedRequests[0],
        completedAt: toDate(completedRequests[0].completedAt ?? now),
        completionBy: toDate(completedRequests[0].completionBy),
        requestedAt: toDate(completedRequests[0].requestedAt)
      })
    };
  }, { isolationLevel: "Serializable" });
}

export async function deleteAccountAndAssociatedData(user: AuthUser): Promise<AccountDeletionOutcome> {
  if (!hasDatabaseUrl()) throw new AccountDeletionUnavailableError();

  const result = await runAccountDeletionTransaction(
    getPrisma() as unknown as AccountDeletionDatabaseClient,
    user
  );

  clearInMemoryAccountData(user.id, user.email);
  if (result.request?.id) {
    await processAccountDeletionCleanupJobs({ deletionRequestId: result.request.id }).catch(() => {
      console.warn("[account-deletion] provider cleanup remains queued for automatic retry.");
    });
  }
  return result;
}
