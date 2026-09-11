import { randomUUID } from "crypto";
import {
  assertAccountMemoryPersistenceAllowed,
  runAccountPersistenceOperation,
  throwAccountPersistenceUnavailable
} from "@/lib/account-persistence-safety";
import { getCivicPetitionById, type CivicPetition } from "@/lib/civic-petitions";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";

export type SignedPetitionRecord = {
  body?: string;
  id: string;
  petitionId: string;
  progressLabel?: string;
  signedAt: string;
  targetLabel?: string;
  title: string;
};

type StoredSignedPetitionRecord = SignedPetitionRecord & {
  userId?: string;
};

type DbSignedPetitionRecord = {
  body: string | null;
  id: string;
  petitionId: string;
  progressLabel: string | null;
  signedAt: Date;
  targetLabel: string | null;
  title: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __capitolLedgerPetitionSignatureSchemaReady: Promise<boolean> | undefined;
  // eslint-disable-next-line no-var
  var __capitolLedgerPetitionSignatureStore: StoredSignedPetitionRecord[] | undefined;
}

const petitionSignatureStore = globalThis.__capitolLedgerPetitionSignatureStore ?? [];
globalThis.__capitolLedgerPetitionSignatureStore = petitionSignatureStore;

function toIsoString(value: Date | string | null | undefined) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeRecord(record: DbSignedPetitionRecord): SignedPetitionRecord {
  return {
    body: record.body ?? undefined,
    id: record.id,
    petitionId: record.petitionId,
    progressLabel: record.progressLabel ?? undefined,
    signedAt: toIsoString(record.signedAt),
    targetLabel: record.targetLabel ?? undefined,
    title: record.title
  };
}

function toPublicRecord(record: StoredSignedPetitionRecord): SignedPetitionRecord {
  const { userId: _userId, ...publicRecord } = record;
  return publicRecord;
}

function petitionToRecordInput(petition: CivicPetition): Omit<SignedPetitionRecord, "id" | "signedAt"> {
  return {
    body: petition.body,
    petitionId: petition.id,
    progressLabel: petition.progressLabel,
    targetLabel: petition.targetLabel,
    title: petition.title
  };
}

async function ensurePetitionSignatureSchema() {
  if (!hasDatabaseUrl()) return false;
  if (globalThis.__capitolLedgerPetitionSignatureSchemaReady) return globalThis.__capitolLedgerPetitionSignatureSchemaReady;

  globalThis.__capitolLedgerPetitionSignatureSchemaReady = (async () => {
    try {
      const prisma = getPrisma();

      await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PetitionSignature" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "petitionId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "body" TEXT,
        "progressLabel" TEXT,
        "targetLabel" TEXT,
        "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PetitionSignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
      await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "PetitionSignature_userId_petitionId_key"
      ON "PetitionSignature"("userId", "petitionId")
    `);
      await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PetitionSignature_userId_signedAt_idx"
      ON "PetitionSignature"("userId", "signedAt")
    `);

      return true;
    } catch (error) {
      globalThis.__capitolLedgerPetitionSignatureSchemaReady = undefined;
      throwAccountPersistenceUnavailable("ensurePetitionSignatureSchema", error);
    }
  })();

  return globalThis.__capitolLedgerPetitionSignatureSchemaReady;
}

export async function recordPetitionSignatureForUser(userId: string, petitionId: string) {
  const petition = getCivicPetitionById(petitionId);
  if (!petition) return null;

  const input = petitionToRecordInput(petition);

  if (await ensurePetitionSignatureSchema()) {
    return runAccountPersistenceOperation("recordPetitionSignatureForUser", async () => {
      const prisma = getPrisma();
      const rows = await prisma.$queryRaw<DbSignedPetitionRecord[]>`
        INSERT INTO "PetitionSignature" (
          "id",
          "userId",
          "petitionId",
          "title",
          "body",
          "progressLabel",
          "targetLabel",
          "signedAt",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${randomUUID()},
          ${userId},
          ${input.petitionId},
          ${input.title},
          ${input.body ?? null},
          ${input.progressLabel ?? null},
          ${input.targetLabel ?? null},
          NOW(),
          NOW(),
          NOW()
        )
        ON CONFLICT ("userId", "petitionId") DO UPDATE
        SET "title" = EXCLUDED."title",
            "body" = EXCLUDED."body",
            "progressLabel" = EXCLUDED."progressLabel",
            "targetLabel" = EXCLUDED."targetLabel",
            "updatedAt" = NOW()
        RETURNING "id", "petitionId", "title", "body", "progressLabel", "targetLabel", "signedAt"
      `;

      return rows[0] ? normalizeRecord(rows[0]) : null;
    });
  }

  assertAccountMemoryPersistenceAllowed("recordPetitionSignatureForUser");
  const existing = petitionSignatureStore.find((record) => record.userId === userId && record.petitionId === petitionId);
  if (existing) return toPublicRecord(existing);

  const record: StoredSignedPetitionRecord = {
    ...input,
    id: randomUUID(),
    signedAt: new Date().toISOString(),
    userId
  };
  petitionSignatureStore.unshift(record);
  return toPublicRecord(record);
}

export async function readPetitionSignaturesForUser(userId: string, limit = 50) {
  if (await ensurePetitionSignatureSchema()) {
    return runAccountPersistenceOperation("readPetitionSignaturesForUser", async () => {
      const prisma = getPrisma();
      const rows = await prisma.$queryRaw<DbSignedPetitionRecord[]>`
        SELECT "id", "petitionId", "title", "body", "progressLabel", "targetLabel", "signedAt"
        FROM "PetitionSignature"
        WHERE "userId" = ${userId}
        ORDER BY "signedAt" DESC
        LIMIT ${Math.max(1, Math.min(100, limit))}
      `;

      return rows.map(normalizeRecord);
    });
  }

  assertAccountMemoryPersistenceAllowed("readPetitionSignaturesForUser");
  return petitionSignatureStore
    .filter((record) => record.userId === userId)
    .slice(0, Math.max(1, Math.min(100, limit)))
    .map(toPublicRecord);
}

export function clearPetitionSignatureMemory(userId: string) {
  let deleted = 0;

  for (let index = petitionSignatureStore.length - 1; index >= 0; index -= 1) {
    if (petitionSignatureStore[index].userId !== userId) continue;

    petitionSignatureStore.splice(index, 1);
    deleted += 1;
  }

  return deleted;
}
