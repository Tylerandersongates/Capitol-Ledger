import { randomUUID } from "crypto";
import { getAccountSubscription, normalizeAccountSubscription, setAccountSubscription } from "@/lib/account-subscription";
import {
  getAccountPersistenceUserId,
  readSubscriptionFromDatabase,
  writeSubscriptionToDatabase
} from "@/lib/account-database";
import {
  assertAccountMemoryPersistenceAllowed,
  fallbackUnlessAccountPersistenceUnavailable,
  throwAccountPersistenceUnavailable
} from "@/lib/account-persistence-safety";
import {
  cancelStripeSubscriptionAtPeriodEnd,
  readStripeSubscriptionDetails,
  resumeStripeSubscriptionFromPeriodEnd
} from "@/lib/billing/stripe";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";
import { syncStripeSubscriptionForAccount } from "@/lib/server-account-subscription";
import { teamPausedProEntitlementId } from "@/lib/team-subscription-constants";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

type TeamSubscriptionPauseStatus = "active" | "checkout_required" | "restored";

type DatabaseSubscriptionRow = {
  cycle: string;
  plan: string;
  provider: string;
  providerCustomerId: string | null;
  providerEntitlementId: string | null;
  providerSubscriptionId: string | null;
  seatCount: number | null;
  status: string;
  updatedAt: Date;
};

type PauseRecord = {
  previousSubscription: AccountSubscriptionSnapshot;
  status: TeamSubscriptionPauseStatus;
  teamMemberId?: string;
  workspaceId?: string;
};

type PauseInput = {
  email: string;
  teamMemberId: string;
  userId: string;
  workspaceId: string;
};

type TeamOwnerUpgradeInput = {
  email?: string;
  previousSubscription?: AccountSubscriptionSnapshot | null;
  teamSubscriptionId?: string | null;
  userId: string;
};

type TeamOwnerDowngradeInput = {
  previousSubscription?: AccountSubscriptionSnapshot | null;
};

type RestoreInput = {
  userId?: string | null;
};

export type TeamSubscriptionPauseResult = {
  paused: boolean;
  subscription?: AccountSubscriptionSnapshot;
};

export type TeamSubscriptionRestoreResult = {
  checkoutRequired: boolean;
  restored: boolean;
  subscription?: AccountSubscriptionSnapshot;
};

declare global {
  // eslint-disable-next-line no-var
  var __capitolLedgerTeamSubscriptionPauseStore: Map<string, PauseRecord> | undefined;
}

const pauseStore = globalThis.__capitolLedgerTeamSubscriptionPauseStore ?? new Map<string, PauseRecord>();
globalThis.__capitolLedgerTeamSubscriptionPauseStore = pauseStore;

let pauseSchemaReady: Promise<boolean> | null = null;

function isActiveProSubscription(subscription: Pick<AccountSubscriptionSnapshot, "plan" | "status">) {
  return subscription.plan === "pro" && (subscription.status === "active" || subscription.status === "trialing" || subscription.status === "past_due");
}

function isActiveTeamSubscription(subscription: Pick<AccountSubscriptionSnapshot, "plan" | "status">) {
  return subscription.plan === "team" && (subscription.status === "active" || subscription.status === "trialing" || subscription.status === "past_due");
}

function canUpdateStripeSubscription(subscription: AccountSubscriptionSnapshot) {
  return subscription.provider === "stripe" && Boolean(subscription.providerSubscriptionId?.startsWith("sub_"));
}

function pausedPersonalSubscription(previous: AccountSubscriptionSnapshot): AccountSubscriptionSnapshot {
  return normalizeAccountSubscription({
    cycle: previous.cycle,
    plan: "free",
    provider: previous.provider,
    providerCustomerId: previous.providerCustomerId,
    providerEntitlementId: teamPausedProEntitlementId,
    providerSubscriptionId: previous.providerSubscriptionId,
    seatCount: undefined,
    status: previous.provider === "stripe" ? "canceled" : "active",
    updatedAt: new Date().toISOString()
  });
}

function checkoutRequiredSubscription(previous: AccountSubscriptionSnapshot): AccountSubscriptionSnapshot {
  return normalizeAccountSubscription({
    cycle: previous.cycle,
    plan: "free",
    provider: previous.provider,
    providerCustomerId: previous.providerCustomerId,
    providerEntitlementId: "capitol-ledger-free",
    providerSubscriptionId: previous.providerSubscriptionId,
    seatCount: undefined,
    status: previous.provider === "stripe" ? "canceled" : "active",
    updatedAt: new Date().toISOString()
  });
}

async function ensurePauseSchema() {
  if (!hasDatabaseUrl()) return false;
  if (pauseSchemaReady) return pauseSchemaReady;

  pauseSchemaReady = (async () => {
    try {
      const prisma = getPrisma();

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "TeamSubscriptionPause" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "email" TEXT NOT NULL,
          "workspaceId" TEXT,
          "teamMemberId" TEXT NOT NULL,
          "previousSubscription" JSONB NOT NULL,
          "status" TEXT NOT NULL,
          "pausedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "restoredAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "TeamSubscriptionPause_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "TeamSubscriptionPause_userId_active_key" ON "TeamSubscriptionPause"("userId") WHERE "status" = 'active'`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TeamSubscriptionPause_userId_status_idx" ON "TeamSubscriptionPause"("userId", "status")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TeamSubscriptionPause_workspaceId_idx" ON "TeamSubscriptionPause"("workspaceId")`);

      return true;
    } catch (error) {
      pauseSchemaReady = null;
      throwAccountPersistenceUnavailable("ensureTeamSubscriptionPauseSchema", error);
    }
  })();

  return pauseSchemaReady;
}

async function readActivePauseRecord(userId: string): Promise<PauseRecord | null> {
  if (!hasDatabaseUrl()) {
    assertAccountMemoryPersistenceAllowed("readActiveTeamSubscriptionPause");
    return pauseStore.get(userId) ?? null;
  }

  await ensurePauseSchema();

  try {
    const prisma = getPrisma();
    const records = await prisma.$queryRaw<
      Array<{
        previousSubscription: unknown;
        status: string;
        teamMemberId: string;
        workspaceId: string | null;
      }>
    >`
      SELECT "previousSubscription", "status", "teamMemberId", "workspaceId"
      FROM "TeamSubscriptionPause"
      WHERE "userId" = ${userId} AND "status" = 'active'
      ORDER BY "updatedAt" DESC
      LIMIT 1
    `;
    const record = records[0];
    if (!record) return null;

    return {
      previousSubscription: normalizeAccountSubscription(record.previousSubscription as Partial<AccountSubscriptionSnapshot>),
      status: record.status === "restored" || record.status === "checkout_required" ? record.status : "active",
      teamMemberId: record.teamMemberId,
      workspaceId: record.workspaceId ?? undefined
    };
  } catch (error) {
    throwAccountPersistenceUnavailable("readActiveTeamSubscriptionPause", error);
  }
}

async function writeActivePauseRecord(userId: string, email: string, input: PauseRecord) {
  if (!hasDatabaseUrl()) {
    assertAccountMemoryPersistenceAllowed("writeActiveTeamSubscriptionPause");
    pauseStore.set(userId, input);
    return;
  }

  await ensurePauseSchema();

  try {
    const prisma = getPrisma();
    const previousSubscriptionJson = JSON.stringify(input.previousSubscription);

    await prisma.$executeRaw`
      WITH updated AS (
        UPDATE "TeamSubscriptionPause"
        SET
          "email" = ${email},
          "workspaceId" = ${input.workspaceId ?? null},
          "teamMemberId" = ${input.teamMemberId ?? ""},
          "updatedAt" = NOW()
        WHERE "userId" = ${userId} AND "status" = 'active'
        RETURNING "id"
      )
      INSERT INTO "TeamSubscriptionPause" (
        "id", "userId", "email", "workspaceId", "teamMemberId", "previousSubscription", "status", "pausedAt", "createdAt", "updatedAt"
      )
      SELECT
        ${randomUUID()},
        ${userId},
        ${email},
        ${input.workspaceId ?? null},
        ${input.teamMemberId ?? ""},
        ${previousSubscriptionJson}::jsonb,
        'active',
        NOW(),
        NOW(),
        NOW()
      WHERE NOT EXISTS (SELECT 1 FROM updated)
    `;
  } catch (error) {
    throwAccountPersistenceUnavailable("writeActiveTeamSubscriptionPause", error);
  }
}

async function markPauseRecordStatus(userId: string, status: TeamSubscriptionPauseStatus) {
  if (!hasDatabaseUrl()) {
    assertAccountMemoryPersistenceAllowed("markTeamSubscriptionPauseStatus");
    const current = pauseStore.get(userId);
    if (current) {
      if (status === "restored") pauseStore.delete(userId);
      else pauseStore.set(userId, { ...current, status });
    }
    return;
  }

  await ensurePauseSchema();

  try {
    const prisma = getPrisma();
    await prisma.$executeRaw`
      UPDATE "TeamSubscriptionPause"
      SET "status" = ${status}, "restoredAt" = CASE WHEN ${status} <> 'active' THEN NOW() ELSE "restoredAt" END, "updatedAt" = NOW()
      WHERE "userId" = ${userId} AND "status" = 'active'
    `;
  } catch (error) {
    throwAccountPersistenceUnavailable("markTeamSubscriptionPauseStatus", error);
  }
}

async function readPersonalSubscription(userId: string) {
  const subscription = hasDatabaseUrl()
    ? ((await readSubscriptionFromDatabase(userId)) ?? normalizeAccountSubscription())
    : getAccountSubscription(userId);
  return syncStripeSubscriptionForAccount(userId, subscription).catch((error) =>
    fallbackUnlessAccountPersistenceUnavailable(error, subscription)
  );
}

async function persistSubscription(userId: string, subscription: AccountSubscriptionSnapshot) {
  if (!hasDatabaseUrl()) return setAccountSubscription(userId, subscription);

  const databaseSubscription = await writeSubscriptionToDatabase(userId, subscription);
  if (!databaseSubscription) throwAccountPersistenceUnavailable("persistTeamSubscriptionTransition");
  return databaseSubscription;
}

async function pauseDatabasePersonalProSubscriptionForTeamSeat(
  input: PauseInput,
  accountUserId: string
): Promise<TeamSubscriptionPauseResult> {
  await ensurePauseSchema();

  let stripeCancellationAttempted: string | null = null;
  let stripeCancellationError: unknown;
  try {
    return await getPrisma().$transaction(async (transaction) => {
      const lockedRows = await transaction.$queryRaw<Array<{ userId: string; workspaceId: string }>>`
        SELECT account."id" AS "userId", workspace."id" AS "workspaceId"
        FROM "TeamWorkspace" workspace
        JOIN "User" account ON account."id" = ${accountUserId}
        WHERE workspace."id" = ${input.workspaceId}
        FOR KEY SHARE OF workspace, account
      `;
      if (!lockedRows[0]) {
        throwAccountPersistenceUnavailable("pauseTeamSubscription: account or workspace no longer exists");
      }

      const pauseRows = await transaction.$queryRaw<
        Array<{
          previousSubscription: unknown;
          teamMemberId: string;
          workspaceId: string | null;
        }>
      >`
        SELECT "previousSubscription", "teamMemberId", "workspaceId"
        FROM "TeamSubscriptionPause"
        WHERE "userId" = ${accountUserId} AND "status" = 'active'
        ORDER BY "updatedAt" DESC
        LIMIT 1
        FOR UPDATE
      `;
      const subscriptionRows = await transaction.$queryRaw<DatabaseSubscriptionRow[]>`
        SELECT "plan", "cycle", "provider", "providerCustomerId", "providerEntitlementId",
               "providerSubscriptionId", "seatCount", "status", "updatedAt"
        FROM "AccountSubscription"
        WHERE "userId" = ${accountUserId}
        LIMIT 1
        FOR UPDATE
      `;
      const subscriptionRow = subscriptionRows[0];
      const personalSubscription = subscriptionRow
        ? normalizeAccountSubscription({
            cycle: subscriptionRow.cycle as AccountSubscriptionSnapshot["cycle"],
            plan: subscriptionRow.plan as AccountSubscriptionSnapshot["plan"],
            provider: subscriptionRow.provider as AccountSubscriptionSnapshot["provider"],
            providerCustomerId: subscriptionRow.providerCustomerId ?? undefined,
            providerEntitlementId: subscriptionRow.providerEntitlementId ?? undefined,
            providerSubscriptionId: subscriptionRow.providerSubscriptionId ?? undefined,
            seatCount: subscriptionRow.seatCount ?? undefined,
            status: subscriptionRow.status as AccountSubscriptionSnapshot["status"],
            updatedAt: subscriptionRow.updatedAt.toISOString()
          })
        : normalizeAccountSubscription();
      const existingPause = pauseRows[0]
        ? normalizeAccountSubscription(pauseRows[0].previousSubscription as Partial<AccountSubscriptionSnapshot>)
        : null;
      const previousSubscription = existingPause ?? personalSubscription;

      if (!isActiveProSubscription(previousSubscription)) {
        return {
          paused: false,
          subscription: personalSubscription
        };
      }

      if (!existingPause && canUpdateStripeSubscription(previousSubscription) && previousSubscription.providerSubscriptionId) {
        stripeCancellationAttempted = previousSubscription.providerSubscriptionId;
        try {
          await cancelStripeSubscriptionAtPeriodEnd(previousSubscription.providerSubscriptionId);
        } catch (error) {
          stripeCancellationError = error;
          throw error;
        }
      }

      const previousSubscriptionJson = JSON.stringify(previousSubscription);
      await transaction.$executeRaw`
        WITH updated AS (
          UPDATE "TeamSubscriptionPause"
          SET
            "email" = ${input.email},
            "workspaceId" = ${input.workspaceId},
            "teamMemberId" = ${input.teamMemberId},
            "updatedAt" = NOW()
          WHERE "userId" = ${accountUserId} AND "status" = 'active'
          RETURNING "id"
        )
        INSERT INTO "TeamSubscriptionPause" (
          "id", "userId", "email", "workspaceId", "teamMemberId", "previousSubscription",
          "status", "pausedAt", "createdAt", "updatedAt"
        )
        SELECT
          ${randomUUID()}, ${accountUserId}, ${input.email}, ${input.workspaceId}, ${input.teamMemberId},
          ${previousSubscriptionJson}::jsonb, 'active', NOW(), NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM updated)
      `;

      const pausedSubscription = pausedPersonalSubscription(previousSubscription);
      await transaction.$executeRaw`
        INSERT INTO "AccountSubscription" (
          "id", "userId", "plan", "cycle", "provider", "providerCustomerId",
          "providerEntitlementId", "providerSubscriptionId", "seatCount", "status",
          "createdAt", "updatedAt"
        )
        VALUES (
          ${randomUUID()}, ${accountUserId}, ${pausedSubscription.plan}, ${pausedSubscription.cycle},
          ${pausedSubscription.provider}, ${pausedSubscription.providerCustomerId ?? null},
          ${pausedSubscription.providerEntitlementId ?? null}, ${pausedSubscription.providerSubscriptionId ?? null},
          ${pausedSubscription.seatCount ?? null}, ${pausedSubscription.status}, NOW(), NOW()
        )
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

      return {
        paused: true,
        subscription: pausedSubscription
      };
    });
  } catch (error) {
    if (stripeCancellationAttempted) {
      await resumeStripeSubscriptionFromPeriodEnd(stripeCancellationAttempted).catch(() => {
        console.error("[team-subscription] failed to compensate an uncommitted Stripe pause.");
      });
    }
    if (stripeCancellationError) throw stripeCancellationError;
    throwAccountPersistenceUnavailable("pauseDatabasePersonalProSubscriptionForTeamSeat", error);
  }
}

export async function rememberPersonalProSubscriptionForTeamOwnerUpgrade({
  email = "",
  previousSubscription,
  teamSubscriptionId,
  userId
}: TeamOwnerUpgradeInput): Promise<TeamSubscriptionPauseResult> {
  if (!previousSubscription || !isActiveProSubscription(previousSubscription)) {
    return {
      paused: false,
      subscription: previousSubscription ?? undefined
    };
  }

  const existingPause = await readActivePauseRecord(userId);
  if (existingPause) {
    return {
      paused: false,
      subscription: existingPause.previousSubscription
    };
  }

  if (canUpdateStripeSubscription(previousSubscription) && previousSubscription.providerSubscriptionId) {
    await cancelStripeSubscriptionAtPeriodEnd(previousSubscription.providerSubscriptionId).catch(() => null);
  }

  await writeActivePauseRecord(userId, email, {
    previousSubscription,
    status: "active",
    teamMemberId: teamSubscriptionId ? `team-owner-${teamSubscriptionId}` : "team-owner-upgrade"
  });

  return {
    paused: true,
    subscription: previousSubscription
  };
}

export async function cancelPreviousTeamSubscriptionForProCheckout({
  previousSubscription
}: TeamOwnerDowngradeInput): Promise<TeamSubscriptionPauseResult> {
  if (!previousSubscription || !isActiveTeamSubscription(previousSubscription)) {
    return {
      paused: false,
      subscription: previousSubscription ?? undefined
    };
  }

  if (canUpdateStripeSubscription(previousSubscription) && previousSubscription.providerSubscriptionId) {
    await cancelStripeSubscriptionAtPeriodEnd(previousSubscription.providerSubscriptionId).catch(() => null);
  }

  return {
    paused: true,
    subscription: previousSubscription
  };
}

export async function pausePersonalProSubscriptionForTeamSeat(input: PauseInput): Promise<TeamSubscriptionPauseResult> {
  const accountUserId = await getAccountPersistenceUserId({
    email: input.email,
    id: input.userId
  });
  if (hasDatabaseUrl()) {
    return pauseDatabasePersonalProSubscriptionForTeamSeat(input, accountUserId);
  }

  const existingPause = await readActivePauseRecord(accountUserId);
  const personalSubscription = await readPersonalSubscription(accountUserId);
  const previousSubscription = existingPause?.previousSubscription ?? personalSubscription;

  if (!isActiveProSubscription(previousSubscription)) {
    return {
      paused: false,
      subscription: personalSubscription
    };
  }

  if (!existingPause && canUpdateStripeSubscription(previousSubscription) && previousSubscription.providerSubscriptionId) {
    await cancelStripeSubscriptionAtPeriodEnd(previousSubscription.providerSubscriptionId);
  }

  await writeActivePauseRecord(accountUserId, input.email, {
    previousSubscription,
    status: "active",
    teamMemberId: input.teamMemberId,
    workspaceId: input.workspaceId
  });

  const pausedSubscription = await persistSubscription(accountUserId, pausedPersonalSubscription(previousSubscription));

  return {
    paused: true,
    subscription: pausedSubscription
  };
}

export async function restorePausedPersonalSubscriptionForReleasedTeamSeat({
  userId
}: RestoreInput): Promise<TeamSubscriptionRestoreResult> {
  if (!userId) {
    return {
      checkoutRequired: false,
      restored: false
    };
  }

  const pauseRecord = await readActivePauseRecord(userId);
  if (!pauseRecord) {
    return {
      checkoutRequired: false,
      restored: false
    };
  }

  const previousSubscription = pauseRecord.previousSubscription;

  if (canUpdateStripeSubscription(previousSubscription) && previousSubscription.providerSubscriptionId) {
    let stripeSubscription;
    try {
      stripeSubscription = await resumeStripeSubscriptionFromPeriodEnd(previousSubscription.providerSubscriptionId);
    } catch {
      await persistSubscription(userId, checkoutRequiredSubscription(previousSubscription));
      await markPauseRecordStatus(userId, "checkout_required");
      return {
        checkoutRequired: true,
        restored: false
      };
    }

    const details = readStripeSubscriptionDetails(stripeSubscription);

    if (details.plan !== "pro" || !isActiveProSubscription(details)) {
      await persistSubscription(userId, checkoutRequiredSubscription(previousSubscription));
      await markPauseRecordStatus(userId, "checkout_required");
      return {
        checkoutRequired: true,
        restored: false
      };
    }

    const restoredSubscription = await persistSubscription(
      userId,
      normalizeAccountSubscription({
        ...previousSubscription,
        cycle: details.cycle,
        plan: "pro",
        seatCount: undefined,
        status: details.status
      })
    );
    await markPauseRecordStatus(userId, "restored");

    return {
      checkoutRequired: false,
      restored: true,
      subscription: restoredSubscription
    };
  }

  const restoredSubscription = await persistSubscription(userId, previousSubscription);
  await markPauseRecordStatus(userId, "restored");

  return {
    checkoutRequired: false,
    restored: true,
    subscription: restoredSubscription
  };
}

export function clearTeamSubscriptionTransitionMemory(userId: string) {
  return pauseStore.delete(userId);
}
