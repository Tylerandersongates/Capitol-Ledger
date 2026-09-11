import { clearAccountSubscriptionMemory, normalizeAccountSubscription } from "@/lib/account-subscription";
import {
  detachStripeSubscriptionFromDeletedAccount,
  isStripeResourceMissingError,
  isTerminalStripeSubscriptionError,
  readStripeCustomerSubscriptionIds,
  readStripeSubscriptionDetails,
  resumeStripeSubscriptionFromPeriodEnd
} from "@/lib/billing/stripe";
import {
  reconcileAppStoreSubscription,
  type CanonicalAppStoreSubscription
} from "@/lib/billing/app-store-server";
import { createAppStoreAccountToken } from "@/lib/billing/app-store";
import {
  clearUnlinkedAppStoreSubscriptionProjection,
  persistCanonicalAppStoreState,
  readAppStoreSubscriptionState
} from "@/lib/billing/app-store-state";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";
import { runPrivacyRetentionSweep, type PrivacyRetentionRun } from "@/lib/privacy-retention";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

export const accountDeletionCleanupKinds = {
  cancelDeletedAccountStripeSubscription: "cancel_deleted_account_stripe_subscription",
  restoreTeamMemberSubscription: "restore_team_member_subscription"
} as const;

export type AccountDeletionCleanupKind =
  (typeof accountDeletionCleanupKinds)[keyof typeof accountDeletionCleanupKinds];

type CleanupJobRow = {
  attempts: number;
  deletionRequestId: string;
  id: string;
  kind: string;
  payload: unknown;
};

type CleanupStripeDetails = Pick<AccountSubscriptionSnapshot, "cycle" | "plan" | "status">;

export type AccountDeletionCleanupDependencies = {
  accountExists: (userId: string) => Promise<boolean>;
  detachStripeSubscription: (subscriptionId: string) => Promise<unknown>;
  persistMemberSubscription: (userId: string, subscription: AccountSubscriptionSnapshot) => Promise<void>;
  readStripeCustomerSubscriptionIds: (customerId: string) => Promise<string[]>;
  reconcileAppStoreSubscriptionForMember: (userId: string) => Promise<void>;
  resumeStripeSubscription: (subscriptionId: string) => Promise<CleanupStripeDetails>;
};

export type AccountDeletionCleanupJobInput = Pick<CleanupJobRow, "kind" | "payload">;

type DeletedAccountStripePayload = {
  customerId?: string;
  subscriptionId?: string;
};

type TeamMemberRestorePayload = {
  previousSubscription: Partial<AccountSubscriptionSnapshot>;
  userId: string;
};

export type AccountDeletionCleanupRun = {
  completed: number;
  failed: number;
  claimed: number;
  retention?: PrivacyRetentionRun;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readDeletedAccountStripePayload(value: unknown): DeletedAccountStripePayload | null {
  if (!isRecord(value)) return null;
  const subscriptionId = typeof value.subscriptionId === "string" && value.subscriptionId.startsWith("sub_")
    ? value.subscriptionId
    : undefined;
  const customerId = typeof value.customerId === "string" && value.customerId.startsWith("cus_")
    ? value.customerId
    : undefined;
  if (!subscriptionId && !customerId) return null;

  return { customerId, subscriptionId };
}

function readTeamMemberRestorePayload(value: unknown): TeamMemberRestorePayload | null {
  if (!isRecord(value) || typeof value.userId !== "string" || !isRecord(value.previousSubscription)) return null;

  return {
    previousSubscription: value.previousSubscription as Partial<AccountSubscriptionSnapshot>,
    userId: value.userId
  };
}

function checkoutRequiredSubscription(previous: AccountSubscriptionSnapshot): AccountSubscriptionSnapshot {
  return normalizeAccountSubscription({
    cycle: previous.cycle,
    plan: "free",
    provider: previous.provider,
    providerCustomerId: previous.providerCustomerId,
    providerEntitlementId: "capitol-ledger-free",
    providerSubscriptionId: previous.providerSubscriptionId,
    status: previous.provider === "stripe" ? "canceled" : "active"
  });
}

async function accountExists(userId: string) {
  const rows = await getPrisma().$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS(SELECT 1 FROM "User" WHERE "id" = ${userId}) AS "exists"
  `;
  return Boolean(rows[0]?.exists);
}

async function persistMemberSubscription(userId: string, subscription: AccountSubscriptionSnapshot) {
  const updated = await getPrisma().$executeRaw`
    INSERT INTO "AccountSubscription" (
      "id", "userId", "plan", "cycle", "provider", "providerCustomerId",
      "providerEntitlementId", "providerSubscriptionId", "seatCount", "status",
      "createdAt", "updatedAt"
    )
    SELECT
      CONCAT('account-subscription-', ${userId}), ${userId}, ${subscription.plan}, ${subscription.cycle},
      ${subscription.provider}, ${subscription.providerCustomerId ?? null},
      ${subscription.providerEntitlementId ?? null}, ${subscription.providerSubscriptionId ?? null},
      ${subscription.seatCount ?? null}, ${subscription.status}, NOW(), NOW()
    WHERE EXISTS (SELECT 1 FROM "User" WHERE "id" = ${userId})
    ON CONFLICT ("userId") DO UPDATE
    SET "plan" = EXCLUDED."plan",
        "cycle" = EXCLUDED."cycle",
        "provider" = EXCLUDED."provider",
        "providerCustomerId" = EXCLUDED."providerCustomerId",
        "providerEntitlementId" = EXCLUDED."providerEntitlementId",
        "providerSubscriptionId" = EXCLUDED."providerSubscriptionId",
        "seatCount" = EXCLUDED."seatCount",
        "status" = EXCLUDED."status",
        "updatedAt" = NOW()
  `;

  if (updated !== 1 && (await accountExists(userId))) {
    throw new Error("Team member subscription cleanup was not persisted.");
  }
  clearAccountSubscriptionMemory(userId);
}

async function persistReconciledAppStoreState(
  userId: string,
  appAccountToken: string,
  canonical: CanonicalAppStoreSubscription
) {
  await persistCanonicalAppStoreState({
    appAccountToken,
    appleStatus: canonical.appleStatus,
    autoRenewProductId: canonical.autoRenewProductId,
    autoRenewStatus: canonical.autoRenewStatus,
    environment: canonical.environment,
    expiresAt: canonical.expiresAt,
    gracePeriodExpiresAt: canonical.gracePeriodExpiresAt,
    observedAt: canonical.observedAt,
    observationVersion: canonical.observationVersion,
    originalTransactionId: canonical.originalTransactionId,
    productId: canonical.productId,
    signedAt: canonical.signedAt,
    subscription: canonical.snapshot,
    transactionId: canonical.transactionId,
    transactionPurchasedAt: canonical.transactionPurchasedAt,
    transactionRevokedAt: canonical.transactionRevokedAt,
    userId
  });
}

async function reconcileAppStoreSubscriptionForMember(userId: string) {
  const state = await readAppStoreSubscriptionState(userId);
  if (!state?.originalTransactionId || !state.environment || !state.appAccountToken) {
    await clearUnlinkedAppStoreSubscriptionProjection({
      appAccountToken: state?.appAccountToken ?? createAppStoreAccountToken(userId),
      userId
    });
    return;
  }

  const canonical = await reconcileAppStoreSubscription({
    anyTransactionId: state.originalTransactionId,
    environment: state.environment,
    expectedAppAccountToken: state.appAccountToken,
    expectedOriginalTransactionId: state.originalTransactionId
  });
  if (canonical.originalTransactionId !== state.originalTransactionId) return;

  await persistReconciledAppStoreState(userId, state.appAccountToken, canonical);
}

async function restoreTeamMemberSubscription(
  payload: TeamMemberRestorePayload,
  dependencies: AccountDeletionCleanupDependencies
) {
  if (!(await dependencies.accountExists(payload.userId))) return;

  const previous = normalizeAccountSubscription(payload.previousSubscription);
  if (previous.plan !== "pro") {
    await dependencies.persistMemberSubscription(payload.userId, checkoutRequiredSubscription(previous));
    return;
  }

  if (previous.provider === "app-store") {
    await dependencies.reconcileAppStoreSubscriptionForMember(payload.userId);
    return;
  }

  if (previous.provider === "stripe" && previous.providerSubscriptionId?.startsWith("sub_")) {
    let details: CleanupStripeDetails;
    try {
      details = await dependencies.resumeStripeSubscription(previous.providerSubscriptionId);
    } catch (error) {
      if (!isTerminalStripeSubscriptionError(error)) throw error;
      await dependencies.persistMemberSubscription(payload.userId, checkoutRequiredSubscription(previous));
      return;
    }
    if (details.plan !== "pro" || details.status === "canceled") {
      await dependencies.persistMemberSubscription(payload.userId, checkoutRequiredSubscription(previous));
      return;
    }

    await dependencies.persistMemberSubscription(
      payload.userId,
      normalizeAccountSubscription({
        ...previous,
        cycle: details.cycle,
        plan: "pro",
        seatCount: undefined,
        status: details.status
      })
    );
    return;
  }

  await dependencies.persistMemberSubscription(
    payload.userId,
    checkoutRequiredSubscription(previous)
  );
}

const defaultCleanupDependencies: AccountDeletionCleanupDependencies = {
  accountExists,
  detachStripeSubscription: detachStripeSubscriptionFromDeletedAccount,
  persistMemberSubscription,
  readStripeCustomerSubscriptionIds,
  reconcileAppStoreSubscriptionForMember,
  resumeStripeSubscription: async (subscriptionId) => {
    const stripeSubscription = await resumeStripeSubscriptionFromPeriodEnd(subscriptionId);
    return readStripeSubscriptionDetails(stripeSubscription);
  }
};

export async function executeAccountDeletionCleanupJob(
  job: AccountDeletionCleanupJobInput,
  dependencies: AccountDeletionCleanupDependencies = defaultCleanupDependencies
) {
  if (job.kind === accountDeletionCleanupKinds.cancelDeletedAccountStripeSubscription) {
    const payload = readDeletedAccountStripePayload(job.payload);
    if (!payload) throw new Error("Invalid deleted-account Stripe cleanup payload.");
    const customerSubscriptionIds = payload.customerId
      ? await dependencies.readStripeCustomerSubscriptionIds(payload.customerId)
      : [];
    const subscriptionIds = Array.from(new Set([
      ...(payload.subscriptionId ? [payload.subscriptionId] : []),
      ...customerSubscriptionIds
    ]));
    for (const subscriptionId of subscriptionIds) {
      try {
        await dependencies.detachStripeSubscription(subscriptionId);
      } catch (error) {
        if (!isStripeResourceMissingError(error)) throw error;
      }
    }
    return;
  }

  if (job.kind === accountDeletionCleanupKinds.restoreTeamMemberSubscription) {
    const payload = readTeamMemberRestorePayload(job.payload);
    if (!payload) throw new Error("Invalid Team-member restoration payload.");
    await restoreTeamMemberSubscription(payload, dependencies);
    return;
  }

  throw new Error("Unsupported account-deletion cleanup job.");
}

async function claimCleanupJobs(limit: number, deletionRequestId?: string) {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const filter = deletionRequestId ? `AND "deletionRequestId" = $2` : "";
  const values: unknown[] = deletionRequestId ? [safeLimit, deletionRequestId] : [safeLimit];

  return getPrisma().$transaction((transaction) =>
    transaction.$queryRawUnsafe<CleanupJobRow[]>(
      `
        WITH candidates AS (
          SELECT "id"
          FROM "AccountDeletionCleanupJob"
          WHERE (
            ("status" = 'pending' AND "availableAt" <= NOW())
            OR ("status" = 'processing' AND "updatedAt" < NOW() - INTERVAL '10 minutes')
          )
          ${filter}
          ORDER BY "createdAt" ASC
          LIMIT $1
          FOR UPDATE SKIP LOCKED
        )
        UPDATE "AccountDeletionCleanupJob" job
        SET "status" = 'processing', "attempts" = job."attempts" + 1, "updatedAt" = NOW()
        FROM candidates
        WHERE job."id" = candidates."id"
        RETURNING job."id", job."deletionRequestId", job."kind", job."payload", job."attempts"
      `,
      ...values
    )
  );
}

async function completeCleanupJob(id: string) {
  await getPrisma().$executeRaw`DELETE FROM "AccountDeletionCleanupJob" WHERE "id" = ${id}`;
}

async function retryCleanupJob(id: string) {
  await getPrisma().$executeRaw`
    UPDATE "AccountDeletionCleanupJob"
    SET "status" = 'pending',
        "lastError" = 'Cleanup attempt failed; automatic retry remains pending.',
        "availableAt" = NOW() + make_interval(secs => LEAST(3600, 30 * CAST(power(2, LEAST("attempts", 7)) AS INTEGER))),
        "updatedAt" = NOW()
    WHERE "id" = ${id}
  `;
}

export async function processAccountDeletionCleanupJobs({
  deletionRequestId,
  limit = 25
}: {
  deletionRequestId?: string;
  limit?: number;
} = {}): Promise<AccountDeletionCleanupRun> {
  if (!hasDatabaseUrl()) return { claimed: 0, completed: 0, failed: 0 };

  let retention: PrivacyRetentionRun | undefined;
  if (!deletionRequestId) {
    try {
      retention = await runPrivacyRetentionSweep({ limit });
    } catch {
      console.error("[privacy-retention] sweep failed; retry on the next scheduled run.");
    }
  }

  const jobs = await claimCleanupJobs(limit, deletionRequestId);
  let completed = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await executeAccountDeletionCleanupJob(job);
      await completeCleanupJob(job.id);
      completed += 1;
    } catch {
      console.error("[account-deletion-cleanup] cleanup attempt failed; automatic retry remains pending.");
      await retryCleanupJob(job.id).catch(() => undefined);
      failed += 1;
    }
  }

  return {
    claimed: jobs.length,
    completed,
    failed,
    ...(retention ? { retention } : {})
  };
}
