import { randomUUID } from "crypto";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";
import type { AccountLedgerSnapshot, AccountProfileSnapshot, AccountSubscriptionSnapshot, FollowTargetType } from "../types/capitol";
import { normalizeAccountGamification, type AccountGamificationSnapshot } from "./account-gamification";
import { normalizeAccountLedger } from "./account-ledger";
import { normalizeAccountProfile } from "./account-profile";
import { normalizeAccountSubscription } from "./account-subscription";
import { normalizeOptionalTeamSeatCount } from "./subscription-seat-count";
import {
  normalizeWeeklyBriefDeliveryRecord,
  type WeeklyBriefDeliveryInput,
  type WeeklyBriefDeliveryRecord
} from "./weekly-brief-history";

type DbFollow = {
  targetId: string;
  targetType: "BILL" | "MEMBER";
};

type DbSubscription = {
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

type DbGamification = {
  civicScore: number;
  dayStreak: number;
  earnedBadgeIds: unknown;
  eventCounts: unknown;
  level: number;
  levelTitle: string;
  monthlyGain: number;
  nextLevelScore: number;
  updatedAt: Date;
};

type DbWeeklyBriefDelivery = {
  createdAt: Date;
  deliveryMode: string;
  failedAt: Date | null;
  id: string;
  issueCount: number;
  plan: string;
  preparedAt: Date | null;
  recipient: string | null;
  savedRecordCount: number;
  sentAt: Date | null;
  status: string;
  summary: string | null;
  trackedBillCount: number;
  unreadAlertCount: number;
  userId: string;
};

type DbProfile = {
  districtCode: string | null;
  districtLabel: string | null;
  districtState: string | null;
  name: string | null;
  notificationPreferences: unknown;
  partyAffiliation: string | null;
  updatedAt: Date;
};

function toDbTargetType(type: FollowTargetType) {
  return type === "bill" ? "BILL" : "MEMBER";
}

function fromDbTargetType(type: string): FollowTargetType {
  return type === "BILL" ? "bill" : "member";
}

export function canUseDatabasePersistence() {
  return hasDatabaseUrl();
}

let profileSchemaReady: Promise<boolean> | null = null;
let subscriptionSchemaReady: Promise<boolean> | null = null;
let weeklyBriefDeliverySchemaReady: Promise<boolean> | null = null;

function isDatabaseConnectionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Can't reach database server") ||
    message.includes("P1001") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND") ||
    message.includes("timeout")
  );
}

function logDatabaseFallback(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[account-database] ${scope} fallback: ${message}`);
}

async function withDatabaseFallback<T>(scope: string, fallbackValue: T, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logDatabaseFallback(scope, error);
    if (isDatabaseConnectionError(error)) return fallbackValue;
    throw error;
  }
}

async function ensureAccountProfileSchema() {
  if (!canUseDatabasePersistence()) return false;
  if (profileSchemaReady) return profileSchemaReady;

  profileSchemaReady = (async () => {
    try {
      const prisma = getPrisma();

      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "partyAffiliation" TEXT`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "districtLabel" TEXT`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "districtState" TEXT`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "districtCode" TEXT`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notificationPreferences" JSONB`);

      return true;
    } catch (error) {
      logDatabaseFallback("ensureAccountProfileSchema", error);
      profileSchemaReady = null;
      if (isDatabaseConnectionError(error)) return false;
      throw error;
    }
  })();

  return profileSchemaReady;
}

async function ensureWeeklyBriefDeliverySchema() {
  if (!canUseDatabasePersistence()) return false;
  if (weeklyBriefDeliverySchemaReady) return weeklyBriefDeliverySchemaReady;

  weeklyBriefDeliverySchemaReady = (async () => {
    try {
      const prisma = getPrisma();

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "WeeklyBriefDelivery" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "status" TEXT NOT NULL,
          "deliveryMode" TEXT NOT NULL,
          "summary" TEXT,
          "recipient" TEXT,
          "plan" TEXT NOT NULL,
          "trackedBillCount" INTEGER NOT NULL DEFAULT 0,
          "unreadAlertCount" INTEGER NOT NULL DEFAULT 0,
          "issueCount" INTEGER NOT NULL DEFAULT 0,
          "savedRecordCount" INTEGER NOT NULL DEFAULT 0,
          "preparedAt" TIMESTAMP(3),
          "sentAt" TIMESTAMP(3),
          "failedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "WeeklyBriefDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "WeeklyBriefDelivery_userId_createdAt_idx" ON "WeeklyBriefDelivery"("userId", "createdAt")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "WeeklyBriefDelivery_status_idx" ON "WeeklyBriefDelivery"("status")`);

      return true;
    } catch (error) {
      logDatabaseFallback("ensureWeeklyBriefDeliverySchema", error);
      weeklyBriefDeliverySchemaReady = null;
      if (isDatabaseConnectionError(error)) return false;
      throw error;
    }
  })();

  return weeklyBriefDeliverySchemaReady;
}

async function ensureAccountSubscriptionSchema() {
  if (!canUseDatabasePersistence()) return false;
  if (subscriptionSchemaReady) return subscriptionSchemaReady;

  subscriptionSchemaReady = (async () => {
    try {
      const prisma = getPrisma();

      await prisma.$executeRawUnsafe(`ALTER TABLE "AccountSubscription" ADD COLUMN IF NOT EXISTS "seatCount" INTEGER`);

      return true;
    } catch (error) {
      logDatabaseFallback("ensureAccountSubscriptionSchema", error);
      subscriptionSchemaReady = null;
      if (isDatabaseConnectionError(error)) return false;
      throw error;
    }
  })();

  return subscriptionSchemaReady;
}

export async function ensureAccountUser(user: { email: string; id: string; name?: string }) {
  if (!canUseDatabasePersistence()) return false;

  try {
    const prisma = getPrisma();
    await prisma.$executeRaw`
      INSERT INTO "User" ("id", "email", "name", "createdAt", "updatedAt")
      VALUES (${user.id}, ${user.email}, ${user.name ?? null}, NOW(), NOW())
      ON CONFLICT ("email") DO UPDATE
      SET "name" = COALESCE(EXCLUDED."name", "User"."name"), "updatedAt" = NOW()
    `;

    return true;
  } catch (error) {
    logDatabaseFallback("ensureAccountUser", error);
    if (isDatabaseConnectionError(error)) return false;
    throw error;
  }
}

export async function getAccountPersistenceUserId(user: { email: string; id: string; name?: string }) {
  if (!canUseDatabasePersistence()) return user.id;

  try {
    const prisma = getPrisma();
    await ensureAccountUser(user);
    const records = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "User"
      WHERE lower("email") = lower(${user.email})
      LIMIT 1
    `;

    return records[0]?.id ?? user.id;
  } catch (error) {
    logDatabaseFallback("getAccountPersistenceUserId", error);
    if (isDatabaseConnectionError(error)) return user.id;
    throw error;
  }
}

export async function readProfileFromDatabase(userId: string): Promise<AccountProfileSnapshot | null> {
  if (!(await ensureAccountProfileSchema())) return null;
  try {
    const prisma = getPrisma();
    const records = await prisma.$queryRaw<DbProfile[]>`
      SELECT
        "name",
        "partyAffiliation",
        "districtLabel",
        "districtState",
        "districtCode",
        "notificationPreferences",
        "updatedAt"
      FROM "User"
      WHERE "id" = ${userId}
      LIMIT 1
    `;
    const record = records[0];
    if (!record) return null;

    return normalizeAccountProfile({
      displayName: record.name ?? undefined,
      districtCode: record.districtCode ?? undefined,
      districtLabel: record.districtLabel ?? undefined,
      districtState: record.districtState ?? undefined,
      notificationPreferences:
        record.notificationPreferences && typeof record.notificationPreferences === "object"
          ? (record.notificationPreferences as AccountProfileSnapshot["notificationPreferences"])
          : undefined,
      partyAffiliation: record.partyAffiliation ?? undefined,
      updatedAt: record.updatedAt.toISOString()
    });
  } catch (error) {
    logDatabaseFallback("readProfileFromDatabase", error);
    if (isDatabaseConnectionError(error)) return null;
    throw error;
  }
}

export async function writeProfileToDatabase(userId: string, value: Partial<AccountProfileSnapshot>): Promise<AccountProfileSnapshot | null> {
  if (!(await ensureAccountProfileSchema())) return null;

  return withDatabaseFallback("writeProfileToDatabase", null, async () => {
    const prisma = getPrisma();
    const current = (await readProfileFromDatabase(userId)) ?? normalizeAccountProfile();
    const profile = normalizeAccountProfile({
      ...current,
      ...value,
      notificationPreferences: {
        ...current.notificationPreferences,
        ...value.notificationPreferences
      }
    });
    const preferencesJson = JSON.stringify(profile.notificationPreferences);

    await prisma.$executeRaw`
      UPDATE "User"
      SET
        "name" = COALESCE(${profile.displayName ?? null}, "name"),
        "partyAffiliation" = ${profile.partyAffiliation || null},
        "districtLabel" = ${profile.districtLabel ?? null},
        "districtState" = ${profile.districtState ?? null},
        "districtCode" = ${profile.districtCode ?? null},
        "notificationPreferences" = ${preferencesJson}::jsonb,
        "updatedAt" = NOW()
      WHERE "id" = ${userId}
    `;

    return readProfileFromDatabase(userId);
  });
}

export async function readLedgerFromDatabase(userId: string): Promise<AccountLedgerSnapshot | null> {
  if (!canUseDatabasePersistence()) return null;
  try {
    const prisma = getPrisma();
    const [follows, readAlerts, savedAlerts, issueInterests] = await Promise.all([
      prisma.$queryRaw<DbFollow[]>`SELECT "targetType", "targetId" FROM "Follow" WHERE "userId" = ${userId}`,
      prisma.$queryRaw<Array<{ alertId: string }>>`SELECT "alertId" FROM "ReadAlert" WHERE "userId" = ${userId}`,
      prisma.$queryRaw<Array<{ alertId: string }>>`SELECT "alertId" FROM "SavedAlert" WHERE "userId" = ${userId}`,
      prisma.$queryRaw<Array<{ interest: string }>>`SELECT "interest" FROM "IssueInterest" WHERE "userId" = ${userId}`
    ]);

    return normalizeAccountLedger({
      follows: follows.map((record) => ({
        id: record.targetId,
        type: fromDbTargetType(record.targetType)
      })),
      issueInterests: issueInterests.map((record) => record.interest),
      readAlerts: readAlerts.map((record) => record.alertId),
      savedAlerts: savedAlerts.map((record) => record.alertId)
    });
  } catch (error) {
    logDatabaseFallback("readLedgerFromDatabase", error);
    if (isDatabaseConnectionError(error)) return null;
    throw error;
  }
}

export async function mergeLedgerIntoDatabase(userId: string, value: Partial<AccountLedgerSnapshot>): Promise<AccountLedgerSnapshot | null> {
  if (!canUseDatabasePersistence()) return null;

  return withDatabaseFallback("mergeLedgerIntoDatabase", null, async () => {
    const prisma = getPrisma();
    const ledger = normalizeAccountLedger(value);
    const hasFollows = Array.isArray(value.follows);
    const hasReadAlerts = Array.isArray(value.readAlerts);
    const hasSavedAlerts = Array.isArray(value.savedAlerts);
    const hasIssueInterests = Array.isArray(value.issueInterests);
    const providedIssueInterests = Array.isArray(value.issueInterests) ? value.issueInterests : [];
    const issueInterests = hasIssueInterests
      ? Array.from(new Set(providedIssueInterests.filter((interest): interest is string => typeof interest === "string" && interest.trim().length > 0)))
      : ledger.issueInterests;
    const issueInterestOperations = hasIssueInterests
      ? [
          prisma.$executeRaw`
            DELETE FROM "IssueInterest"
            WHERE "userId" = ${userId}
          `,
          ...issueInterests.map((interest) =>
            prisma.$executeRaw`
              INSERT INTO "IssueInterest" ("id", "userId", "interest", "createdAt")
              VALUES (${randomUUID()}, ${userId}, ${interest}, NOW())
              ON CONFLICT ("userId", "interest") DO NOTHING
            `
          )
        ]
      : issueInterests.map((interest) =>
          prisma.$executeRaw`
            INSERT INTO "IssueInterest" ("id", "userId", "interest", "createdAt")
            VALUES (${randomUUID()}, ${userId}, ${interest}, NOW())
            ON CONFLICT ("userId", "interest") DO NOTHING
          `
        );

    await prisma.$transaction([
      ...(hasFollows
        ? [
            prisma.$executeRaw`
              DELETE FROM "Follow"
              WHERE "userId" = ${userId}
            `
          ]
        : []),
      ...ledger.follows.map((record) =>
        prisma.$executeRaw`
          INSERT INTO "Follow" ("id", "userId", "targetType", "targetId", "createdAt")
          VALUES (${randomUUID()}, ${userId}, ${toDbTargetType(record.type)}::"FollowTargetType", ${record.id}, NOW())
          ON CONFLICT ("userId", "targetType", "targetId") DO NOTHING
        `
      ),
      ...(hasSavedAlerts
        ? [
            prisma.$executeRaw`
              DELETE FROM "SavedAlert"
              WHERE "userId" = ${userId}
            `
          ]
        : []),
      ...ledger.savedAlerts.map((alertId) =>
        prisma.$executeRaw`
          INSERT INTO "SavedAlert" ("id", "userId", "alertId", "createdAt")
          VALUES (${randomUUID()}, ${userId}, ${alertId}, NOW())
          ON CONFLICT ("userId", "alertId") DO NOTHING
        `
      ),
      ...(hasReadAlerts
        ? [
            prisma.$executeRaw`
              DELETE FROM "ReadAlert"
              WHERE "userId" = ${userId}
            `
          ]
        : []),
      ...ledger.readAlerts.map((alertId) =>
        prisma.$executeRaw`
          INSERT INTO "ReadAlert" ("id", "userId", "alertId", "readAt")
          VALUES (${randomUUID()}, ${userId}, ${alertId}, NOW())
          ON CONFLICT ("userId", "alertId") DO UPDATE
          SET "readAt" = COALESCE("ReadAlert"."readAt", EXCLUDED."readAt")
        `
      ),
      ...issueInterestOperations
    ]);

    return readLedgerFromDatabase(userId);
  });
}

export async function toggleFollowInDatabase(userId: string, targetType: FollowTargetType, targetId: string, saved?: boolean): Promise<AccountLedgerSnapshot | null> {
  if (!canUseDatabasePersistence()) return null;

  return withDatabaseFallback("toggleFollowInDatabase", null, async () => {
    const prisma = getPrisma();
    const dbTargetType = toDbTargetType(targetType);
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Follow"
      WHERE "userId" = ${userId} AND "targetType" = ${dbTargetType}::"FollowTargetType" AND "targetId" = ${targetId}
      LIMIT 1
    `;
    const shouldSave = saved ?? existing.length === 0;

    if (shouldSave) {
      await prisma.$executeRaw`
        INSERT INTO "Follow" ("id", "userId", "targetType", "targetId", "createdAt")
        VALUES (${randomUUID()}, ${userId}, ${toDbTargetType(targetType)}::"FollowTargetType", ${targetId}, NOW())
        ON CONFLICT ("userId", "targetType", "targetId") DO NOTHING
      `;
    } else {
      await prisma.$executeRaw`
        DELETE FROM "Follow"
        WHERE "userId" = ${userId} AND "targetType" = ${dbTargetType}::"FollowTargetType" AND "targetId" = ${targetId}
      `;
    }

    return readLedgerFromDatabase(userId);
  });
}

export async function readSubscriptionFromDatabase(userId: string): Promise<AccountSubscriptionSnapshot | null> {
  if (!canUseDatabasePersistence()) return null;

  return withDatabaseFallback("readSubscriptionFromDatabase", null, async () => {
    if (!(await ensureAccountSubscriptionSchema())) return null;

    const prisma = getPrisma();
    const records = await prisma.$queryRaw<DbSubscription[]>`
      SELECT "plan", "cycle", "provider", "providerCustomerId", "providerEntitlementId", "providerSubscriptionId", "seatCount", "status", "updatedAt"
      FROM "AccountSubscription"
      WHERE "userId" = ${userId}
      LIMIT 1
    `;

    const record = records[0];
    if (!record) return null;

    return normalizeAccountSubscription({
      cycle: record.cycle as AccountSubscriptionSnapshot["cycle"],
      plan: record.plan as AccountSubscriptionSnapshot["plan"],
      provider: record.provider as AccountSubscriptionSnapshot["provider"],
      providerCustomerId: record.providerCustomerId ?? undefined,
      providerEntitlementId: record.providerEntitlementId ?? undefined,
      providerSubscriptionId: record.providerSubscriptionId ?? undefined,
      seatCount: normalizeOptionalTeamSeatCount(record.seatCount),
      status: record.status as AccountSubscriptionSnapshot["status"],
      updatedAt: record.updatedAt.toISOString()
    });
  });
}

export async function findSubscriptionUserIdByProvider({
  customerId,
  subscriptionId
}: {
  customerId?: string | null;
  subscriptionId?: string | null;
}): Promise<string | null> {
  if (!canUseDatabasePersistence() || (!customerId && !subscriptionId)) return null;

  return withDatabaseFallback("findSubscriptionUserIdByProvider", null, async () => {
    if (!(await ensureAccountSubscriptionSchema())) return null;

    const prisma = getPrisma();
    const customer = customerId ?? "";
    const subscription = subscriptionId ?? "";
    const records = await prisma.$queryRaw<Array<{ userId: string }>>`
      SELECT "userId"
      FROM "AccountSubscription"
      WHERE (${customer} <> '' AND "providerCustomerId" = ${customer})
         OR (${subscription} <> '' AND "providerSubscriptionId" = ${subscription})
      ORDER BY "updatedAt" DESC
      LIMIT 1
    `;

    return records[0]?.userId ?? null;
  });
}

export async function writeSubscriptionToDatabase(userId: string, value: Partial<AccountSubscriptionSnapshot>): Promise<AccountSubscriptionSnapshot | null> {
  if (!canUseDatabasePersistence()) return null;

  return withDatabaseFallback("writeSubscriptionToDatabase", null, async () => {
    if (!(await ensureAccountSubscriptionSchema())) return null;

    const prisma = getPrisma();
    const subscription = normalizeAccountSubscription(value);

    await prisma.$executeRaw`
      INSERT INTO "AccountSubscription" (
        "id", "userId", "plan", "cycle", "provider", "providerCustomerId", "providerEntitlementId", "providerSubscriptionId", "seatCount", "status", "createdAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${userId},
        ${subscription.plan},
        ${subscription.cycle},
        ${subscription.provider},
        ${subscription.providerCustomerId ?? null},
        ${subscription.providerEntitlementId ?? null},
        ${subscription.providerSubscriptionId ?? null},
        ${subscription.seatCount ?? null},
        ${subscription.status},
        NOW(),
        NOW()
      )
      ON CONFLICT ("userId") DO UPDATE
      SET
        "plan" = EXCLUDED."plan",
        "cycle" = EXCLUDED."cycle",
        "provider" = EXCLUDED."provider",
        "providerCustomerId" = EXCLUDED."providerCustomerId",
        "providerEntitlementId" = EXCLUDED."providerEntitlementId",
        "providerSubscriptionId" = EXCLUDED."providerSubscriptionId",
        "seatCount" = EXCLUDED."seatCount",
        "status" = EXCLUDED."status",
        "updatedAt" = NOW()
    `;

    return readSubscriptionFromDatabase(userId);
  });
}

export async function readGamificationFromDatabase(userId: string): Promise<AccountGamificationSnapshot | null> {
  if (!canUseDatabasePersistence()) return null;

  return withDatabaseFallback("readGamificationFromDatabase", null, async () => {
    const prisma = getPrisma();
    const records = await prisma.$queryRaw<DbGamification[]>`
      SELECT
        "civicScore",
        "dayStreak",
        "monthlyGain",
        "level",
        "levelTitle",
        "nextLevelScore",
        "eventCounts",
        "earnedBadgeIds",
        "updatedAt"
      FROM "AccountGamification"
      WHERE "userId" = ${userId}
      LIMIT 1
    `;

    const record = records[0];
    if (!record) return null;

    return normalizeAccountGamification({
      civicScore: record.civicScore,
      dayStreak: record.dayStreak,
      earnedBadgeIds: record.earnedBadgeIds as AccountGamificationSnapshot["earnedBadgeIds"],
      eventCounts: record.eventCounts as AccountGamificationSnapshot["eventCounts"],
      level: record.level,
      levelTitle: record.levelTitle,
      monthlyGain: record.monthlyGain,
      nextLevelScore: record.nextLevelScore,
      updatedAt: record.updatedAt.toISOString()
    });
  });
}

export async function writeGamificationToDatabase(userId: string, value: Partial<AccountGamificationSnapshot>): Promise<AccountGamificationSnapshot | null> {
  if (!canUseDatabasePersistence()) return null;

  return withDatabaseFallback("writeGamificationToDatabase", null, async () => {
    const prisma = getPrisma();
    const gamification = normalizeAccountGamification(value);
    const eventCountsJson = JSON.stringify(gamification.eventCounts);
    const earnedBadgeIdsJson = JSON.stringify(gamification.earnedBadgeIds);

    await prisma.$executeRaw`
      INSERT INTO "AccountGamification" (
        "id",
        "userId",
        "civicScore",
        "dayStreak",
        "monthlyGain",
        "level",
        "levelTitle",
        "nextLevelScore",
        "eventCounts",
        "earnedBadgeIds",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${userId},
        ${gamification.civicScore},
        ${gamification.dayStreak},
        ${gamification.monthlyGain},
        ${gamification.level},
        ${gamification.levelTitle},
        ${gamification.nextLevelScore},
        ${eventCountsJson}::jsonb,
        ${earnedBadgeIdsJson}::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT ("userId") DO UPDATE
      SET
        "civicScore" = EXCLUDED."civicScore",
        "dayStreak" = EXCLUDED."dayStreak",
        "monthlyGain" = EXCLUDED."monthlyGain",
        "level" = EXCLUDED."level",
        "levelTitle" = EXCLUDED."levelTitle",
        "nextLevelScore" = EXCLUDED."nextLevelScore",
        "eventCounts" = EXCLUDED."eventCounts",
        "earnedBadgeIds" = EXCLUDED."earnedBadgeIds",
        "updatedAt" = NOW()
    `;

    return readGamificationFromDatabase(userId);
  });
}

export async function readWeeklyBriefDeliveryHistoryFromDatabase(userId: string): Promise<WeeklyBriefDeliveryRecord[] | null> {
  if (!(await ensureWeeklyBriefDeliverySchema())) return null;

  return withDatabaseFallback("readWeeklyBriefDeliveryHistoryFromDatabase", null, async () => {
    const prisma = getPrisma();
    const records = await prisma.$queryRaw<DbWeeklyBriefDelivery[]>`
      SELECT
        "id",
        "userId",
        "status",
        "deliveryMode",
        "summary",
        "recipient",
        "plan",
        "trackedBillCount",
        "unreadAlertCount",
        "issueCount",
        "savedRecordCount",
        "preparedAt",
        "sentAt",
        "failedAt",
        "createdAt"
      FROM "WeeklyBriefDelivery"
      WHERE "userId" = ${userId}
      ORDER BY "createdAt" DESC
      LIMIT 10
    `;

    return records.map((record) =>
      normalizeWeeklyBriefDeliveryRecord(record.userId, {
        createdAt: record.createdAt.toISOString(),
        deliveryMode: record.deliveryMode as WeeklyBriefDeliveryInput["deliveryMode"],
        failedAt: record.failedAt?.toISOString(),
        id: record.id,
        issueCount: record.issueCount,
        plan: record.plan as WeeklyBriefDeliveryInput["plan"],
        preparedAt: record.preparedAt?.toISOString(),
        recipient: record.recipient ?? undefined,
        savedRecordCount: record.savedRecordCount,
        sentAt: record.sentAt?.toISOString(),
        status: record.status as WeeklyBriefDeliveryInput["status"],
        summary: record.summary ?? undefined,
        trackedBillCount: record.trackedBillCount,
        unreadAlertCount: record.unreadAlertCount
      })
    );
  });
}

export async function writeWeeklyBriefDeliveryToDatabase(userId: string, value: WeeklyBriefDeliveryInput): Promise<WeeklyBriefDeliveryRecord | null> {
  if (!(await ensureWeeklyBriefDeliverySchema())) return null;

  return withDatabaseFallback("writeWeeklyBriefDeliveryToDatabase", null, async () => {
    const prisma = getPrisma();
    const record = normalizeWeeklyBriefDeliveryRecord(userId, {
      ...value,
      id: value.id ?? randomUUID()
    });

    await prisma.$executeRaw`
      INSERT INTO "WeeklyBriefDelivery" (
        "id",
        "userId",
        "status",
        "deliveryMode",
        "summary",
        "recipient",
        "plan",
        "trackedBillCount",
        "unreadAlertCount",
        "issueCount",
        "savedRecordCount",
        "preparedAt",
        "sentAt",
        "failedAt",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${record.id},
        ${record.userId},
        ${record.status},
        ${record.deliveryMode},
        ${record.summary},
        ${record.recipient ?? null},
        ${record.plan},
        ${record.trackedBillCount},
        ${record.unreadAlertCount},
        ${record.issueCount},
        ${record.savedRecordCount},
        ${record.preparedAt ? new Date(record.preparedAt) : null},
        ${record.sentAt ? new Date(record.sentAt) : null},
        ${record.failedAt ? new Date(record.failedAt) : null},
        ${new Date(record.createdAt)},
        NOW()
      )
    `;

    return record;
  });
}
