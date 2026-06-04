import { randomUUID } from "crypto";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";
import type { Chamber } from "@/types/capitol";

export type OfficialContactDeliveryMode = "manual" | "webhook";
export type OfficialContactDeliveryStatus = "prepared" | "sent";

export type OfficialContactMessageRecord = {
  contactUrl?: string;
  confirmedAt?: string;
  deliveryMode: OfficialContactDeliveryMode;
  deliveryStatus: OfficialContactDeliveryStatus;
  id: string;
  memberBioguideId: string;
  memberChamber?: Chamber;
  memberDistrict?: string;
  memberName: string;
  memberState?: string;
  messagePreview?: string;
  senderEmail?: string;
  sentAt: string;
  subject: string;
};

type StoredOfficialContactMessageRecord = OfficialContactMessageRecord & {
  userId?: string;
};

type DbOfficialContactMessage = {
  confirmedAt: Date | null;
  contactUrl: string | null;
  deliveryMode: string | null;
  deliveryStatus: string | null;
  id: string;
  memberBioguideId: string;
  memberChamber: string | null;
  memberDistrict: string | null;
  memberName: string | null;
  memberState: string | null;
  messagePreview: string | null;
  senderEmail: string | null;
  sentAt: Date;
  subject: string | null;
};

type DbOfficialContactSentAt = {
  sentAt: Date;
};

type OfficialContactRecordInput = {
  contactUrl?: string;
  cooldownKey: string;
  deliveryMode: OfficialContactDeliveryMode;
  deliveryStatus: OfficialContactDeliveryStatus;
  memberBioguideId: string;
  memberChamber?: Chamber;
  memberDistrict?: string;
  memberName: string;
  memberState?: string;
  message: string;
  senderEmail: string;
  senderKey: string;
  subject: string;
  userId?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __capitolLedgerOfficialContactSchemaReady: Promise<boolean> | undefined;
  // eslint-disable-next-line no-var
  var __capitolLedgerOfficialContactCooldownStore: Map<string, number> | undefined;
  // eslint-disable-next-line no-var
  var __capitolLedgerOfficialContactMessageStore: StoredOfficialContactMessageRecord[] | undefined;
}

const officialContactCooldownStore = globalThis.__capitolLedgerOfficialContactCooldownStore ?? new Map<string, number>();
globalThis.__capitolLedgerOfficialContactCooldownStore = officialContactCooldownStore;

const officialContactMessageStore = globalThis.__capitolLedgerOfficialContactMessageStore ?? [];
globalThis.__capitolLedgerOfficialContactMessageStore = officialContactMessageStore;

function normalizeMemberBioguideId(value: string) {
  return value.trim().toUpperCase();
}

function normalizeSenderKey(value: string) {
  return value.trim().toLowerCase();
}

export function cooldownKeyFor(memberBioguideId: string, senderKey: string) {
  return `${normalizeMemberBioguideId(memberBioguideId)}|${normalizeSenderKey(senderKey)}`;
}

function normalizeDeliveryMode(value: string | null | undefined): OfficialContactDeliveryMode {
  return value === "webhook" ? "webhook" : "manual";
}

function normalizeDeliveryStatus(value: string | null | undefined): OfficialContactDeliveryStatus {
  return value === "sent" ? "sent" : "prepared";
}

function normalizeChamber(value: string | null | undefined): Chamber | undefined {
  if (!value) return undefined;
  if (value === "HOUSE") return "House";
  if (value === "SENATE") return "Senate";
  if (value === "House" || value === "Senate") return value;
  return undefined;
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function toMessagePreview(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();
  return normalized.length > 170 ? `${normalized.slice(0, 167)}...` : normalized;
}

function normalizeOfficialContactRecord(record: DbOfficialContactMessage): OfficialContactMessageRecord {
  const sentAt = toIsoString(record.sentAt) ?? new Date().toISOString();

  return {
    contactUrl: record.contactUrl ?? undefined,
    confirmedAt: toIsoString(record.confirmedAt),
    deliveryMode: normalizeDeliveryMode(record.deliveryMode),
    deliveryStatus: normalizeDeliveryStatus(record.deliveryStatus),
    id: record.id,
    memberBioguideId: normalizeMemberBioguideId(record.memberBioguideId),
    memberChamber: normalizeChamber(record.memberChamber),
    memberDistrict: record.memberDistrict ?? undefined,
    memberName: record.memberName?.trim() || "Representative",
    memberState: record.memberState ?? undefined,
    messagePreview: record.messagePreview ?? undefined,
    senderEmail: record.senderEmail ?? undefined,
    sentAt,
    subject: record.subject?.trim() || "Constituent message"
  };
}

function toPublicOfficialContactRecord(record: StoredOfficialContactMessageRecord): OfficialContactMessageRecord {
  const { userId: _userId, ...publicRecord } = record;
  return publicRecord;
}

export async function ensureOfficialContactSchema() {
  if (!hasDatabaseUrl()) return false;
  if (globalThis.__capitolLedgerOfficialContactSchemaReady) return globalThis.__capitolLedgerOfficialContactSchemaReady;

  globalThis.__capitolLedgerOfficialContactSchemaReady = (async () => {
    const prisma = getPrisma();

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OfficialContactMessage" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "memberBioguideId" TEXT NOT NULL,
        "senderKey" TEXT NOT NULL,
        "senderEmail" TEXT NOT NULL,
        "userId" TEXT,
        "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "memberName" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "memberChamber" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "memberState" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "memberDistrict" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "subject" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "messagePreview" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "deliveryMode" TEXT NOT NULL DEFAULT 'manual'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT NOT NULL DEFAULT 'prepared'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "contactUrl" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OfficialContactMessage_member_sender_sentAt_idx"
      ON "OfficialContactMessage"("memberBioguideId", "senderKey", "sentAt")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OfficialContactMessage_userId_idx"
      ON "OfficialContactMessage"("userId")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OfficialContactMessage_userId_sentAt_idx"
      ON "OfficialContactMessage"("userId", "sentAt")
    `);

    return true;
  })();

  return globalThis.__capitolLedgerOfficialContactSchemaReady;
}

export async function readMostRecentOfficialContact(memberBioguideId: string, senderKey: string, cooldownKey: string) {
  if (await ensureOfficialContactSchema()) {
    const prisma = getPrisma();
    const rows = await prisma.$queryRaw<DbOfficialContactSentAt[]>`
      SELECT "sentAt"
      FROM "OfficialContactMessage"
      WHERE "memberBioguideId" = ${normalizeMemberBioguideId(memberBioguideId)}
        AND "senderKey" = ${normalizeSenderKey(senderKey)}
      ORDER BY "sentAt" DESC
      LIMIT 1
    `;
    return rows[0]?.sentAt?.getTime() ?? null;
  }

  return officialContactCooldownStore.get(cooldownKey) ?? null;
}

export async function recordOfficialContact({
  contactUrl,
  cooldownKey,
  deliveryMode,
  deliveryStatus,
  memberBioguideId,
  memberChamber,
  memberDistrict,
  memberName,
  memberState,
  message,
  senderEmail,
  senderKey,
  subject,
  userId
}: OfficialContactRecordInput) {
  const id = randomUUID();
  const messagePreview = toMessagePreview(message);
  const normalizedMemberBioguideId = normalizeMemberBioguideId(memberBioguideId);
  const normalizedSenderKey = normalizeSenderKey(senderKey);

  if (await ensureOfficialContactSchema()) {
    const prisma = getPrisma();
    const confirmedAtExpression = deliveryStatus === "sent" ? "NOW()" : "NULL";
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "OfficialContactMessage" (
          "id",
          "memberBioguideId",
          "senderKey",
          "senderEmail",
          "userId",
          "memberName",
          "memberChamber",
          "memberState",
          "memberDistrict",
          "subject",
          "messagePreview",
          "deliveryMode",
          "deliveryStatus",
          "contactUrl",
          "sentAt",
          "confirmedAt",
          "createdAt",
          "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), ${confirmedAtExpression}, NOW(), NOW())
      `,
      id,
      normalizedMemberBioguideId,
      normalizedSenderKey,
      senderEmail,
      userId ?? null,
      memberName,
      memberChamber ?? null,
      memberState ?? null,
      memberDistrict ?? null,
      subject,
      messagePreview,
      deliveryMode,
      deliveryStatus,
      contactUrl ?? null
    );
  } else {
    officialContactCooldownStore.set(cooldownKey, Date.now());
  }

  const sentAt = new Date().toISOString();
  const record: OfficialContactMessageRecord = {
    contactUrl,
    confirmedAt: deliveryStatus === "sent" ? sentAt : undefined,
    deliveryMode,
    deliveryStatus,
    id,
    memberBioguideId: normalizedMemberBioguideId,
    memberChamber,
    memberDistrict,
    memberName,
    memberState,
    messagePreview,
    senderEmail,
    sentAt,
    subject
  };

  officialContactMessageStore.unshift({ ...record, userId });
  return record;
}

export async function confirmOfficialContactForUser(id: string, userId: string) {
  if (await ensureOfficialContactSchema()) {
    const prisma = getPrisma();
    const rows = await prisma.$queryRaw<DbOfficialContactMessage[]>`
      UPDATE "OfficialContactMessage"
      SET "deliveryStatus" = 'sent',
          "confirmedAt" = COALESCE("confirmedAt", NOW()),
          "updatedAt" = NOW()
      WHERE "id" = ${id}
        AND "userId" = ${userId}
      RETURNING
        "id",
        "memberBioguideId",
        "senderEmail",
        "memberName",
        "memberChamber",
        "memberState",
        "memberDistrict",
        "subject",
        "messagePreview",
        "deliveryMode",
        "deliveryStatus",
        "contactUrl",
        "sentAt",
        "confirmedAt"
    `;
    return rows[0] ? normalizeOfficialContactRecord(rows[0]) : null;
  }

  const existing = officialContactMessageStore.find((record) => record.id === id && record.userId === userId);
  if (!existing) return null;

  const confirmedAt = new Date().toISOString();
  existing.deliveryStatus = "sent";
  existing.confirmedAt = existing.confirmedAt ?? confirmedAt;
  return toPublicOfficialContactRecord(existing);
}

export async function readOfficialContactMessagesForUser(userId: string, limit = 50) {
  if (await ensureOfficialContactSchema()) {
    const prisma = getPrisma();
    const rows = await prisma.$queryRaw<DbOfficialContactMessage[]>`
      SELECT
        official."id",
        official."memberBioguideId",
        official."senderEmail",
        COALESCE(official."memberName", member."fullName") AS "memberName",
        COALESCE(official."memberChamber", member."chamber"::TEXT) AS "memberChamber",
        COALESCE(official."memberState", member."state") AS "memberState",
        COALESCE(official."memberDistrict", member."district") AS "memberDistrict",
        official."subject",
        official."messagePreview",
        official."deliveryMode",
        official."deliveryStatus",
        official."contactUrl",
        official."sentAt",
        official."confirmedAt"
      FROM "OfficialContactMessage" official
      LEFT JOIN "Member" member ON member."bioguideId" = official."memberBioguideId"
      WHERE official."userId" = ${userId}
      ORDER BY COALESCE(official."confirmedAt", official."sentAt") DESC
      LIMIT ${Math.max(1, Math.min(100, limit))}
    `;

    return rows.map(normalizeOfficialContactRecord);
  }

  return officialContactMessageStore
    .filter((record) => record.userId === userId)
    .slice(0, Math.max(1, Math.min(100, limit)))
    .map(toPublicOfficialContactRecord);
}
