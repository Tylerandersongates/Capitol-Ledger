import { Prisma, type Bill as PrismaBill } from "@prisma/client";
import { getAccountLedger, normalizeAccountLedger } from "@/lib/account-ledger";
import {
  canUseDatabasePersistence,
  getAccountPersistenceUserId,
  readLedgerFromDatabase
} from "@/lib/account-database";
import { getCurrentSession } from "@/lib/auth";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";
import type { Bill, Member, Vote } from "@/types/capitol";

export const congressDocketRecentBillLimit = 50;
export const congressDocketStaleAfterMs = 24 * 60 * 60 * 1000;
export const sponsorUnavailableLabel = "Sponsor unavailable";
const savedDocketBillReadChunkSize = 100;
const savedDocketBillReadConcurrency = 4;

export type CongressDocketSyncEvidence = {
  completedAt?: string;
  congress: number;
  failedAt?: string;
  fetchedBillCount: number;
  id: string;
  normalizedBillCount: number;
  requestedLimit: number;
  sourceMaxActionAt?: string;
  status: "failed" | "succeeded";
  upsertedBillCount: number;
  upsertedMemberCount: number;
};

export type CongressDocketFreshness = {
  badge: "Source synced" | "Stored" | "Sync issue";
  checkedBillCount?: number;
  kind: "failed" | "fresh" | "not-run" | "stale" | "unavailable";
  label: string;
  lastFailureAt?: string;
  lastSuccessfulAt?: string;
};

type CongressDocketSyncRunRow = {
  completedAt: Date | null;
  congress: number;
  failedAt: Date | null;
  fetchedBillCount: number;
  id: string;
  normalizedBillCount: number;
  requestedLimit: number;
  sourceMaxActionAt: Date | null;
  status: string;
  upsertedBillCount: number;
  upsertedMemberCount: number;
};

export function getConfiguredCongressDocketCongress(value = process.env.CONGRESS_SYNC_CONGRESS) {
  const congress = Number(value ?? 119);
  return Number.isInteger(congress) && congress >= 1 && congress <= 999 ? congress : 119;
}

function formatEvidenceDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "an unknown date";

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric"
  }).format(date);
}

function evidenceTimestamp(run?: CongressDocketSyncEvidence) {
  return run?.completedAt ?? run?.failedAt;
}

function evidenceIsNewer(left?: CongressDocketSyncEvidence, right?: CongressDocketSyncEvidence) {
  const leftTime = Date.parse(evidenceTimestamp(left) ?? "");
  const rightTime = Date.parse(evidenceTimestamp(right) ?? "");
  return Number.isFinite(leftTime) && (!Number.isFinite(rightTime) || leftTime > rightTime);
}

export function resolveCongressDocketFreshness({
  available,
  lastFailure,
  lastSuccess,
  now = new Date(),
  staleAfterMs = congressDocketStaleAfterMs
}: {
  available: boolean;
  lastFailure?: CongressDocketSyncEvidence;
  lastSuccess?: CongressDocketSyncEvidence;
  now?: Date;
  staleAfterMs?: number;
}): CongressDocketFreshness {
  if (!available) {
    return {
      badge: "Stored",
      kind: "unavailable",
      label: "Stored activity · sync evidence unavailable"
    };
  }

  if (!lastSuccess) {
    if (lastFailure) {
      return {
        badge: "Sync issue",
        kind: "failed",
        label: "Stored activity · source sync has not succeeded",
        lastFailureAt: lastFailure.failedAt
      };
    }

    return {
      badge: "Stored",
      kind: "not-run",
      label: "Stored activity · no source sync recorded"
    };
  }

  const completedAt = lastSuccess.completedAt;
  const completedTime = Date.parse(completedAt ?? "");
  const checkedBillCount = lastSuccess.normalizedBillCount;
  const countLabel = checkedBillCount === 1 ? "1 bill checked" : `${checkedBillCount} bills checked`;

  if (lastFailure && evidenceIsNewer(lastFailure, lastSuccess)) {
    return {
      badge: "Sync issue",
      checkedBillCount,
      kind: "failed",
      label: completedAt
        ? `Stored activity · latest sync failed; last success ${formatEvidenceDate(completedAt)}`
        : "Stored activity · latest sync failed",
      lastFailureAt: lastFailure.failedAt,
      lastSuccessfulAt: completedAt
    };
  }

  if (!completedAt || !Number.isFinite(completedTime) || now.getTime() - completedTime > staleAfterMs) {
    return {
      badge: "Stored",
      checkedBillCount,
      kind: "stale",
      label: completedAt
        ? `Stored activity · last source sync ${formatEvidenceDate(completedAt)}`
        : "Stored activity · source sync time unavailable",
      lastSuccessfulAt: completedAt
    };
  }

  return {
    badge: "Source synced",
    checkedBillCount,
    kind: "fresh",
    label: `Source synced ${formatEvidenceDate(completedAt)} · ${countLabel}`,
    lastSuccessfulAt: completedAt
  };
}

function mapSyncRun(row: CongressDocketSyncRunRow): CongressDocketSyncEvidence {
  return {
    completedAt: row.completedAt?.toISOString(),
    congress: row.congress,
    failedAt: row.failedAt?.toISOString(),
    fetchedBillCount: row.fetchedBillCount,
    id: row.id,
    normalizedBillCount: row.normalizedBillCount,
    requestedLimit: row.requestedLimit,
    sourceMaxActionAt: row.sourceMaxActionAt?.toISOString(),
    status: row.status === "failed" ? "failed" : "succeeded",
    upsertedBillCount: row.upsertedBillCount,
    upsertedMemberCount: row.upsertedMemberCount
  };
}

export async function readCongressDocketFreshness(
  now = new Date(),
  congress = getConfiguredCongressDocketCongress()
): Promise<CongressDocketFreshness> {
  if (!hasDatabaseUrl()) {
    return resolveCongressDocketFreshness({ available: false, now });
  }

  try {
    const prisma = getPrisma();
    const [successfulRows, failedRows] = await Promise.all([
      prisma.$queryRaw<CongressDocketSyncRunRow[]>`
        SELECT
          "id", "status", "congress", "requestedLimit", "fetchedBillCount", "normalizedBillCount",
          "upsertedBillCount", "upsertedMemberCount", "sourceMaxActionAt", "completedAt", "failedAt"
        FROM "CongressDocketSyncRun"
        WHERE "status" = 'succeeded'
          AND "congress" = ${congress}
        ORDER BY "completedAt" DESC
        LIMIT 1
      `,
      prisma.$queryRaw<CongressDocketSyncRunRow[]>`
        SELECT
          "id", "status", "congress", "requestedLimit", "fetchedBillCount", "normalizedBillCount",
          "upsertedBillCount", "upsertedMemberCount", "sourceMaxActionAt", "completedAt", "failedAt"
        FROM "CongressDocketSyncRun"
        WHERE "status" = 'failed'
          AND "congress" = ${congress}
        ORDER BY "failedAt" DESC
        LIMIT 1
      `
    ]);

    return resolveCongressDocketFreshness({
      available: true,
      lastFailure: failedRows[0] ? mapSyncRun(failedRows[0]) : undefined,
      lastSuccess: successfulRows[0] ? mapSyncRun(successfulRows[0]) : undefined,
      now
    });
  } catch {
    // A missing/unapplied source-only migration must never turn a render into a
    // false freshness claim or make the stored docket unavailable.
    return resolveCongressDocketFreshness({ available: false, now });
  }
}

export function reconcileCongressDocketFreshnessWithVisibleBills(
  freshness: CongressDocketFreshness,
  visibleRecentBillCount: number
): CongressDocketFreshness {
  if (freshness.kind !== "fresh" || !freshness.checkedBillCount || visibleRecentBillCount > 0) {
    return freshness;
  }

  return {
    ...freshness,
    badge: "Stored",
    kind: "unavailable",
    label: "Stored activity · synced bill records unavailable"
  };
}

function formatBillDisplay(type: string, number: string) {
  const normalizedType = type.toUpperCase();
  if (normalizedType === "HR") return `H.R. ${number}`;
  if (normalizedType === "HJRES") return `H.J.Res. ${number}`;
  if (normalizedType === "HCONRES") return `H.Con.Res. ${number}`;
  if (normalizedType === "HRES") return `H.Res. ${number}`;
  if (normalizedType === "S") return `S. ${number}`;
  if (normalizedType === "SJRES") return `S.J.Res. ${number}`;
  if (normalizedType === "SCONRES") return `S.Con.Res. ${number}`;
  if (normalizedType === "SRES") return `S.Res. ${number}`;
  return `${normalizedType} ${number}`;
}

function mapStoredDocketBill(bill: PrismaBill): Bill {
  return {
    billNumber: bill.billNumber,
    billType: bill.billType,
    congress: bill.congress,
    displayNumber: formatBillDisplay(bill.billType, bill.billNumber),
    id: bill.id,
    latestActionDate: bill.latestActionDate?.toISOString().slice(0, 10) ?? "1970-01-01",
    latestActionText: bill.latestActionText ?? "Latest action pending from Congress.gov.",
    policyArea: bill.policyArea ?? "Legislation",
    shortTitle: bill.shortTitle ?? bill.title,
    sourceUrl: bill.sourceUrl ?? "https://www.congress.gov/",
    sponsorBioguideId: bill.sponsorBioguideId ?? undefined,
    summary: bill.summary ?? "Stored Congress.gov bill record.",
    title: bill.title
  };
}

function parseStableBillId(value: string) {
  const match = value.match(/^live-(\d+)-([a-z]+)-(.+)$/i);
  if (!match) return null;

  return {
    billNumber: match[3],
    billType: match[2].toUpperCase(),
    congress: Number(match[1])
  };
}

function docketBillKey(bill: Pick<Bill, "billNumber" | "billType" | "congress">) {
  return `${bill.congress}:${bill.billType.toUpperCase()}:${bill.billNumber}`;
}

export function withStableSavedDocketBillId(bill: Bill, targetIds: string[]) {
  const stableTarget = targetIds
    .map((alias) => ({ alias, target: parseStableBillId(alias) }))
    .find(({ target }) =>
      target?.congress === bill.congress &&
      target.billType === bill.billType.toUpperCase() &&
      target.billNumber === bill.billNumber
    );

  return stableTarget ? { ...bill, id: stableTarget.alias } : bill;
}

export function mergeRecentAndSavedDocketBills(
  recentBills: Bill[],
  savedBills: Bill[],
  recentLimit = congressDocketRecentBillLimit
) {
  const boundedLimit = Number.isInteger(recentLimit) && recentLimit >= 0 ? recentLimit : congressDocketRecentBillLimit;
  const merged: Bill[] = [];
  const indexByKey = new Map<string, number>();
  const seenIds = new Set<string>();

  recentBills.slice(0, boundedLimit).forEach((bill) => {
    const key = docketBillKey(bill);
    if (seenIds.has(bill.id) || indexByKey.has(key)) return;
    seenIds.add(bill.id);
    indexByKey.set(key, merged.length);
    merged.push(bill);
  });

  savedBills.forEach((bill) => {
    const key = docketBillKey(bill);
    const existingIndex = indexByKey.get(key);
    if (existingIndex !== undefined) {
      // The account ledger may identify a bill by its stable live-* alias
      // while the database row has an internal ID. Let the saved identity win
      // so favorite, priority, and risk lookups continue to recognize it.
      seenIds.delete(merged[existingIndex].id);
      merged[existingIndex] = bill;
      seenIds.add(bill.id);
      return;
    }
    if (seenIds.has(bill.id)) return;
    seenIds.add(bill.id);
    indexByKey.set(key, merged.length);
    merged.push(bill);
  });

  return merged;
}

export function buildDocketSponsorNames(
  bills: Bill[],
  members: Array<Pick<Member, "bioguideId" | "fullName">>
) {
  const namesByBioguideId = new Map(members.map((member) => [member.bioguideId, member.fullName]));

  return Object.fromEntries(
    bills.map((bill) => [
      bill.id,
      (bill.sponsorBioguideId && namesByBioguideId.get(bill.sponsorBioguideId)) || sponsorUnavailableLabel
    ])
  );
}

export function alignDocketVoteFeedAliases<
  T extends {
    bill?: Bill;
    vote: Vote;
  }
>(voteFeed: T[], docketBills: Bill[]): T[] {
  const billsByKey = new Map(docketBills.map((bill) => [docketBillKey(bill), bill]));

  return voteFeed.map((candidate) => {
    if (!candidate.bill) return candidate;
    const docketBill = billsByKey.get(docketBillKey(candidate.bill));
    if (!docketBill || docketBill.id === candidate.bill.id) return candidate;

    return {
      ...candidate,
      bill: docketBill,
      vote: candidate.vote.billId
        ? { ...candidate.vote, billId: docketBill.id }
        : candidate.vote
    } as T;
  });
}

export async function readCurrentSavedDocketBillIds() {
  const session = await getCurrentSession();
  if (!session?.user) return [];

  const accountUserId = await getAccountPersistenceUserId(session.user).catch(() => session.user.id);
  const usesDatabase = canUseDatabasePersistence();
  const ledger = (await readLedgerFromDatabase(accountUserId).catch(() => null)) ??
    (usesDatabase ? normalizeAccountLedger() : getAccountLedger(accountUserId));

  return Array.from(
    new Set(
      ledger.follows
        .filter((follow) => follow.type === "bill" && follow.id)
        .map((follow) => follow.id)
    )
  );
}

export async function readStoredDocketBillsByIds(targetIds: string[]) {
  if (!hasDatabaseUrl() || !targetIds.length) return [];

  const uniqueTargetIds = Array.from(new Set(targetIds.filter(Boolean)));
  const targetChunks = Array.from(
    { length: Math.ceil(uniqueTargetIds.length / savedDocketBillReadChunkSize) },
    (_, index) => uniqueTargetIds.slice(
      index * savedDocketBillReadChunkSize,
      (index + 1) * savedDocketBillReadChunkSize
    )
  );

  try {
    const prisma = getPrisma();
    const rowsById = new Map<string, PrismaBill>();
    for (let offset = 0; offset < targetChunks.length; offset += savedDocketBillReadConcurrency) {
      const chunkRows = await Promise.all(
        targetChunks.slice(offset, offset + savedDocketBillReadConcurrency).map(async (targetChunk) => {
          const stableTargets = targetChunk
            .map(parseStableBillId)
            .filter((target): target is NonNullable<ReturnType<typeof parseStableBillId>> => Boolean(target));
          const where: Prisma.BillWhereInput = {
            OR: [
              { id: { in: targetChunk } },
              ...stableTargets.map((target) => ({
                billNumber: target.billNumber,
                billType: target.billType,
                congress: target.congress
              }))
            ]
          };
          return prisma.bill.findMany({
            orderBy: [{ latestActionDate: "desc" }, { updatedAt: "desc" }],
            take: targetChunk.length * 2,
            where
          });
        })
      );
      chunkRows.flat().forEach((row) => rowsById.set(row.id, row));
    }
    const rows = Array.from(rowsById.values()).sort((left, right) => {
      const actionDelta = (right.latestActionDate?.getTime() ?? 0) - (left.latestActionDate?.getTime() ?? 0);
      return actionDelta || right.updatedAt.getTime() - left.updatedAt.getTime();
    });
    return rows.map((row) => withStableSavedDocketBillId(mapStoredDocketBill(row), uniqueTargetIds));
  } catch {
    return [];
  }
}

export async function readCurrentSavedDocketBills() {
  return readStoredDocketBillsByIds(await readCurrentSavedDocketBillIds());
}

export function withCongressDocketContext<
  V extends {
    bill?: Bill;
    vote: Vote;
  },
  T extends {
    favoriteTargets: {
      bills: Bill[];
    };
    voteFeed?: V[];
  }
>(data: T, savedBills: Bill[], freshness: CongressDocketFreshness) {
  const visibleFreshness = reconcileCongressDocketFreshnessWithVisibleBills(
    freshness,
    data.favoriteTargets.bills.length
  );

  const docketBills = mergeRecentAndSavedDocketBills(
    data.favoriteTargets.bills,
    savedBills,
    data.favoriteTargets.bills.length
  );

  return {
    ...data,
    docketFreshness: visibleFreshness,
    favoriteTargets: {
      ...data.favoriteTargets,
      bills: docketBills
    },
    ...(data.voteFeed
      ? { voteFeed: alignDocketVoteFeedAliases(data.voteFeed, docketBills) }
      : {})
  };
}
