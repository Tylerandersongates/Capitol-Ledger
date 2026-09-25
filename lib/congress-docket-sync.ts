import { randomUUID, timingSafeEqual } from "crypto";
import {
  CongressApiError,
  fetchBill,
  fetchBills,
  fetchMember,
  type CongressBillListItem
} from "@/lib/congress/client";
import {
  normalizeCongressBill,
  normalizeCongressMemberDetail
} from "@/lib/congress/normalizers";
import {
  upsertCongressBills,
  upsertCongressMembers
} from "@/lib/congress/upserts";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";
import type { Bill, Member } from "@/types/capitol";

export const congressDocketSyncDefaultLimit = 25;
export const congressDocketSyncMaximumLimit = 50;
export const congressDocketSyncMinimumLimit = 1;
const interruptedRunRetryAfterMs = 15 * 60 * 1000;

export class CongressDocketSyncInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CongressDocketSyncInputError";
  }
}

export type CongressDocketSyncCounts = {
  fetchedBillCount: number;
  missingSponsorCount: number;
  normalizedBillCount: number;
  sourceMaxActionAt?: string;
  upsertedBillCount: number;
  upsertedMemberCount: number;
};

export type CongressDocketSyncResult = CongressDocketSyncCounts & {
  attemptCount: number;
  idempotencyKey: string;
  outcome: "in-progress" | "replayed" | "succeeded";
  runId: string;
};

type ClaimedRun = {
  attemptCount: number;
  congress: number;
  kind: "claimed";
  requestedLimit: number;
  runId: string;
};

type InProgressRun = {
  attemptCount: number;
  congress: number;
  kind: "in-progress";
  requestedLimit: number;
  runId: string;
};

type ReplayedRun = CongressDocketSyncCounts & {
  attemptCount: number;
  congress: number;
  kind: "replayed";
  requestedLimit: number;
  runId: string;
};

export type CongressDocketSyncClaim = ClaimedRun | InProgressRun | ReplayedRun;

export type CongressDocketSyncDependencies = {
  claimRun: (input: {
    congress: number;
    idempotencyKey: string;
    now: Date;
    requestedLimit: number;
  }) => Promise<CongressDocketSyncClaim>;
  failRun: (
    runId: string,
    input: {
      attemptCount: number;
      counts: CongressDocketSyncCounts;
      errorCode: string;
      failedAt: Date;
    }
  ) => Promise<void>;
  fetchBillDetail: (bill: CongressBillListItem) => Promise<CongressBillListItem | null>;
  fetchRecentBills: (congress: number, limit: number) => Promise<CongressBillListItem[]>;
  fetchSponsorMember: (bioguideId: string) => Promise<Member | null>;
  now: () => Date;
  persistBatchAndComplete: (input: {
    attemptCount: number;
    bills: Bill[];
    completedAt: Date;
    counts: CongressDocketSyncCounts;
    rawBills: CongressBillListItem[];
    runId: string;
    sponsors: Member[];
  }) => Promise<CongressDocketSyncCounts>;
};

type StoredRunRow = {
  attemptCount: number;
  congress: number;
  fetchedBillCount: number;
  id: string;
  missingSponsorCount: number;
  normalizedBillCount: number;
  requestedLimit: number;
  sourceMaxActionAt: Date | null;
  status: string;
  upsertedBillCount: number;
  upsertedMemberCount: number;
};

function emptyCounts(): CongressDocketSyncCounts {
  return {
    fetchedBillCount: 0,
    missingSponsorCount: 0,
    normalizedBillCount: 0,
    upsertedBillCount: 0,
    upsertedMemberCount: 0
  };
}

function mapStoredCounts(row: StoredRunRow): CongressDocketSyncCounts {
  return {
    fetchedBillCount: row.fetchedBillCount,
    missingSponsorCount: row.missingSponsorCount,
    normalizedBillCount: row.normalizedBillCount,
    sourceMaxActionAt: row.sourceMaxActionAt?.toISOString(),
    upsertedBillCount: row.upsertedBillCount,
    upsertedMemberCount: row.upsertedMemberCount
  };
}

export function parseCongressDocketSyncLimit(value: unknown) {
  if (value === undefined || value === null || value === "") return congressDocketSyncDefaultLimit;
  const parsed = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : Number.NaN;

  if (
    !Number.isInteger(parsed) ||
    parsed < congressDocketSyncMinimumLimit ||
    parsed > congressDocketSyncMaximumLimit
  ) {
    throw new CongressDocketSyncInputError(
      `Congress docket sync limit must be an integer from ${congressDocketSyncMinimumLimit} to ${congressDocketSyncMaximumLimit}.`
    );
  }

  return parsed;
}

export function parseCongressDocketIdempotencyKey(value: unknown) {
  if (typeof value !== "string") {
    throw new CongressDocketSyncInputError("Congress docket sync requires an idempotency key.");
  }

  const normalized = value.trim();
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(normalized)) {
    throw new CongressDocketSyncInputError(
      "Congress docket sync idempotency key must be 8-128 URL-safe characters."
    );
  }

  return normalized;
}

function secretsMatch(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export function authorizeCongressDocketSyncTask({
  actualSecret,
  enabledValue,
  expectedSecret
}: {
  actualSecret?: string | null;
  enabledValue?: string;
  expectedSecret?: string;
}) {
  if (enabledValue !== "true") {
    return {
      code: "CONGRESS_DOCKET_SYNC_DISABLED",
      ok: false as const,
      status: 503
    };
  }

  if (!expectedSecret) {
    return {
      code: "CONGRESS_DOCKET_SYNC_SECRET_MISSING",
      ok: false as const,
      status: 503
    };
  }

  if (!actualSecret || !secretsMatch(expectedSecret, actualSecret)) {
    return {
      code: "CONGRESS_DOCKET_SYNC_UNAUTHORIZED",
      ok: false as const,
      status: 401
    };
  }

  return {
    code: "CONGRESS_DOCKET_SYNC_AUTHORIZED",
    ok: true as const,
    status: 200
  };
}

function readConfiguredCongress() {
  const congress = Number(process.env.CONGRESS_SYNC_CONGRESS ?? 119);
  return Number.isInteger(congress) && congress >= 1 && congress <= 999 ? congress : 119;
}

async function claimDatabaseRun({
  congress,
  idempotencyKey,
  now,
  requestedLimit
}: {
  congress: number;
  idempotencyKey: string;
  now: Date;
  requestedLimit: number;
}): Promise<CongressDocketSyncClaim> {
  const prisma = getPrisma();
  const runId = randomUUID();
  const staleBefore = new Date(now.getTime() - interruptedRunRetryAfterMs);
  const claimed = await prisma.$queryRaw<StoredRunRow[]>`
    INSERT INTO "CongressDocketSyncRun" (
      "id", "idempotencyKey", "status", "congress", "requestedLimit", "attemptCount",
      "fetchedBillCount", "normalizedBillCount", "upsertedBillCount", "upsertedMemberCount",
      "missingSponsorCount", "startedAt", "createdAt", "updatedAt"
    )
    VALUES (
      ${runId}, ${idempotencyKey}, 'running', ${congress}, ${requestedLimit}, 1,
      0, 0, 0, 0, 0, ${now}, ${now}, ${now}
    )
    ON CONFLICT ("idempotencyKey") DO UPDATE SET
      "status" = 'running',
      "attemptCount" = "CongressDocketSyncRun"."attemptCount" + 1,
      "fetchedBillCount" = 0,
      "normalizedBillCount" = 0,
      "upsertedBillCount" = 0,
      "upsertedMemberCount" = 0,
      "missingSponsorCount" = 0,
      "sourceMaxActionAt" = NULL,
      "startedAt" = EXCLUDED."startedAt",
      "completedAt" = NULL,
      "failedAt" = NULL,
      "errorCode" = NULL,
      "updatedAt" = EXCLUDED."updatedAt"
    WHERE "CongressDocketSyncRun"."congress" = EXCLUDED."congress"
      AND "CongressDocketSyncRun"."requestedLimit" = EXCLUDED."requestedLimit"
      AND (
        "CongressDocketSyncRun"."status" = 'failed'
        OR (
          "CongressDocketSyncRun"."status" = 'running'
          AND "CongressDocketSyncRun"."startedAt" < ${staleBefore}
        )
      )
    RETURNING
      "id", "status", "attemptCount", "congress", "requestedLimit", "fetchedBillCount", "normalizedBillCount",
      "upsertedBillCount", "upsertedMemberCount", "missingSponsorCount", "sourceMaxActionAt"
  `;

  if (claimed[0]) {
    return {
      attemptCount: claimed[0].attemptCount,
      congress: claimed[0].congress,
      kind: "claimed",
      requestedLimit: claimed[0].requestedLimit,
      runId: claimed[0].id
    };
  }

  const existing = await prisma.$queryRaw<StoredRunRow[]>`
    SELECT
      "id", "status", "attemptCount", "congress", "requestedLimit", "fetchedBillCount", "normalizedBillCount",
      "upsertedBillCount", "upsertedMemberCount", "missingSponsorCount", "sourceMaxActionAt"
    FROM "CongressDocketSyncRun"
    WHERE "idempotencyKey" = ${idempotencyKey}
    LIMIT 1
  `;
  const row = existing[0];
  if (!row) throw new Error("Congress docket sync run could not be claimed.");
  if (row.congress !== congress || row.requestedLimit !== requestedLimit) {
    throw new CongressDocketSyncInputError(
      "Congress docket sync idempotency key is already bound to different sync bounds."
    );
  }

  if (row.status === "succeeded") {
    return {
      ...mapStoredCounts(row),
      attemptCount: row.attemptCount,
      congress: row.congress,
      kind: "replayed",
      requestedLimit: row.requestedLimit,
      runId: row.id
    };
  }

  return {
    attemptCount: row.attemptCount,
    congress: row.congress,
    kind: "in-progress",
    requestedLimit: row.requestedLimit,
    runId: row.id
  };
}

async function failDatabaseRun(
  runId: string,
  {
    attemptCount,
    counts,
    errorCode,
    failedAt
  }: {
    attemptCount: number;
    counts: CongressDocketSyncCounts;
    errorCode: string;
    failedAt: Date;
  }
) {
  const sourceMaxActionAt = counts.sourceMaxActionAt ? new Date(counts.sourceMaxActionAt) : null;
  await getPrisma().$executeRaw`
    UPDATE "CongressDocketSyncRun"
    SET
      "status" = 'failed',
      "fetchedBillCount" = ${counts.fetchedBillCount},
      "normalizedBillCount" = ${counts.normalizedBillCount},
      "upsertedBillCount" = ${counts.upsertedBillCount},
      "upsertedMemberCount" = ${counts.upsertedMemberCount},
      "missingSponsorCount" = ${counts.missingSponsorCount},
      "sourceMaxActionAt" = ${sourceMaxActionAt},
      "failedAt" = ${failedAt},
      "completedAt" = NULL,
      "errorCode" = ${errorCode},
      "updatedAt" = ${failedAt}
    WHERE "id" = ${runId}
      AND "status" = 'running'
      AND "attemptCount" = ${attemptCount}
  `;
}

async function persistDatabaseBatchAndComplete({
  attemptCount,
  bills,
  completedAt,
  counts,
  rawBills,
  runId,
  sponsors
}: {
  attemptCount: number;
  bills: Bill[];
  completedAt: Date;
  counts: CongressDocketSyncCounts;
  rawBills: CongressBillListItem[];
  runId: string;
  sponsors: Member[];
}) {
  const prisma = getPrisma();
  return prisma.$transaction(async (transaction) => {
    // These shared helpers only use model/query methods exposed by an
    // interactive transaction client. Keep the compatibility cast local.
    const transactionClient = transaction as unknown as typeof prisma;
    const memberResult = await upsertCongressMembers(transactionClient, sponsors);
    const billResult = await upsertCongressBills(transactionClient, bills, rawBills, {
      preserveExistingEnrichment: true
    });
    const sponsorBioguideIds = Array.from(
      new Set(bills.map((bill) => bill.sponsorBioguideId).filter((value): value is string => Boolean(value)))
    );
    const activeSponsorRows = sponsorBioguideIds.length
      ? await transaction.member.findMany({
          select: { bioguideId: true },
          where: {
            active: true,
            bioguideId: { in: sponsorBioguideIds }
          }
        })
      : [];
    const liveSponsorIds = new Set(activeSponsorRows.map((member) => member.bioguideId));
    const completedCounts: CongressDocketSyncCounts = {
      ...counts,
      missingSponsorCount: bills.filter(
        (bill) => !bill.sponsorBioguideId || !liveSponsorIds.has(bill.sponsorBioguideId)
      ).length,
      upsertedBillCount: billResult.createdOrUpdated,
      upsertedMemberCount: memberResult.createdOrUpdated
    };
    const sourceMaxActionAt = completedCounts.sourceMaxActionAt
      ? new Date(completedCounts.sourceMaxActionAt)
      : null;
    const updated = await transaction.$executeRaw`
      UPDATE "CongressDocketSyncRun"
      SET
        "status" = 'succeeded',
        "fetchedBillCount" = ${completedCounts.fetchedBillCount},
        "normalizedBillCount" = ${completedCounts.normalizedBillCount},
        "upsertedBillCount" = ${completedCounts.upsertedBillCount},
        "upsertedMemberCount" = ${completedCounts.upsertedMemberCount},
        "missingSponsorCount" = ${completedCounts.missingSponsorCount},
        "sourceMaxActionAt" = ${sourceMaxActionAt},
        "completedAt" = ${completedAt},
        "failedAt" = NULL,
        "errorCode" = NULL,
        "updatedAt" = ${completedAt}
      WHERE "id" = ${runId}
        AND "status" = 'running'
        AND "attemptCount" = ${attemptCount}
    `;

    if (updated !== 1) {
      throw new Error("Congress docket sync completion was rejected for a superseded attempt.");
    }
    return completedCounts;
  }, {
    maxWait: 5_000,
    timeout: 60_000
  });
}

const defaultDependencies: CongressDocketSyncDependencies = {
  claimRun: claimDatabaseRun,
  failRun: failDatabaseRun,
  fetchBillDetail: async (bill) => {
    if (!bill.congress || !bill.type || !bill.number) return null;
    const response = await fetchBill(bill.congress, bill.type, bill.number, { timeoutMs: 8_000 });
    return response.bill ?? null;
  },
  fetchRecentBills: async (congress, limit) => {
    const response = await fetchBills(congress, { limit, timeoutMs: 15_000 });
    return (response.bills ?? []).slice(0, limit);
  },
  fetchSponsorMember: async (bioguideId) => {
    const response = await fetchMember(bioguideId, { timeoutMs: 8_000 });
    return response.member ? normalizeCongressMemberDetail(response.member) : null;
  },
  now: () => new Date(),
  persistBatchAndComplete: persistDatabaseBatchAndComplete
};

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>
) {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker())
  );
  return results;
}

function sourceMaxActionAt(bills: Bill[]) {
  const latestTime = bills.reduce((latest, bill) => {
    const time = Date.parse(bill.latestActionDate);
    return Number.isFinite(time) && time > latest ? time : latest;
  }, Number.NEGATIVE_INFINITY);

  return Number.isFinite(latestTime) ? new Date(latestTime).toISOString() : undefined;
}

function uniqueSponsorBioguideIds(rawBills: CongressBillListItem[]) {
  return Array.from(
    new Set(
      rawBills.flatMap((bill) =>
        (bill.sponsors ?? [])
          .map((sponsor) => sponsor.bioguideId)
          .filter((bioguideId): bioguideId is string => Boolean(bioguideId))
      )
    )
  );
}

function syncFailureCode(error: unknown) {
  if (error instanceof CongressApiError) {
    if (error.status === 408) return "CONGRESS_SOURCE_TIMEOUT";
    if (error.status === 429) return "CONGRESS_SOURCE_RATE_LIMITED";
    return "CONGRESS_SOURCE_UNAVAILABLE";
  }
  if (error instanceof CongressDocketSyncInputError) return "CONGRESS_DOCKET_SYNC_INVALID";
  return "CONGRESS_DOCKET_SYNC_FAILED";
}

export async function runCongressDocketSync(
  {
    congress = readConfiguredCongress(),
    idempotencyKey,
    limit
  }: {
    congress?: number;
    idempotencyKey: string;
    limit?: unknown;
  },
  dependencies: CongressDocketSyncDependencies = defaultDependencies
): Promise<CongressDocketSyncResult> {
  if (!hasDatabaseUrl() && dependencies === defaultDependencies) {
    throw new CongressDocketSyncInputError("Congress docket sync requires database persistence.");
  }
  if (!Number.isInteger(congress) || congress < 1 || congress > 999) {
    throw new CongressDocketSyncInputError("Congress docket sync congress must be an integer from 1 to 999.");
  }

  const requestedLimit = parseCongressDocketSyncLimit(limit);
  const normalizedIdempotencyKey = parseCongressDocketIdempotencyKey(idempotencyKey);
  const claimed = await dependencies.claimRun({
    congress,
    idempotencyKey: normalizedIdempotencyKey,
    now: dependencies.now(),
    requestedLimit
  });
  if (claimed.congress !== congress || claimed.requestedLimit !== requestedLimit) {
    throw new CongressDocketSyncInputError(
      "Congress docket sync idempotency key is already bound to different sync bounds."
    );
  }

  if (claimed.kind === "replayed") {
    return {
      ...claimed,
      idempotencyKey: normalizedIdempotencyKey,
      outcome: "replayed"
    };
  }
  if (claimed.kind === "in-progress") {
    return {
      ...emptyCounts(),
      attemptCount: claimed.attemptCount,
      idempotencyKey: normalizedIdempotencyKey,
      outcome: "in-progress",
      runId: claimed.runId
    };
  }

  let counts = emptyCounts();
  try {
    const listedBills = (await dependencies.fetchRecentBills(congress, requestedLimit)).slice(0, requestedLimit);
    counts = {
      ...counts,
      fetchedBillCount: listedBills.length
    };
    if (!listedBills.length) {
      throw new CongressApiError("Congress.gov returned an empty docket batch.");
    }

    const rawBills = await mapWithConcurrency(listedBills, 5, async (bill) => {
      if (bill.sponsors?.some((sponsor) => sponsor.bioguideId)) return bill;
      try {
        return (await dependencies.fetchBillDetail(bill)) ?? bill;
      } catch {
        // A sponsor-detail miss must not discard otherwise valid bill activity.
        // The run records it through missingSponsorCount and the UI says
        // "Sponsor unavailable" rather than manufacturing a name.
        return bill;
      }
    });

    const bills = rawBills
      .map(normalizeCongressBill)
      .filter((bill): bill is Bill => Boolean(bill));
    counts = {
      ...counts,
      normalizedBillCount: bills.length,
      sourceMaxActionAt: sourceMaxActionAt(bills)
    };
    if (!bills.length) {
      throw new CongressApiError("Congress.gov returned no usable docket bills.");
    }

    const sponsors = (
      await mapWithConcurrency(uniqueSponsorBioguideIds(rawBills), 5, async (bioguideId) => {
        try {
          return await dependencies.fetchSponsorMember(bioguideId);
        } catch {
          // A member-detail miss must not manufacture an active member. An
          // existing authoritative member may still satisfy the bill upsert;
          // otherwise the relationship remains unavailable.
          return null;
        }
      })
    ).filter((member): member is Member => Boolean(member));
    const completedAt = dependencies.now();
    counts = await dependencies.persistBatchAndComplete({
      attemptCount: claimed.attemptCount,
      bills,
      completedAt,
      counts,
      rawBills,
      runId: claimed.runId,
      sponsors
    });

    return {
      ...counts,
      attemptCount: claimed.attemptCount,
      idempotencyKey: normalizedIdempotencyKey,
      outcome: "succeeded",
      runId: claimed.runId
    };
  } catch (error) {
    await dependencies.failRun(claimed.runId, {
      attemptCount: claimed.attemptCount,
      counts,
      errorCode: syncFailureCode(error),
      failedAt: dependencies.now()
    });
    throw error;
  }
}
