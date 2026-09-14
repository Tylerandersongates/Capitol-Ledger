import { privacyRequestResolutions, type PrivacyRequestResolution } from "@/lib/privacy-request-contract";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";

export const privacyRequestAgeBands = [
  "none",
  "under_24_hours",
  "one_to_three_days",
  "four_to_seven_days",
  "over_seven_days"
] as const;

export type PrivacyRequestAgeBand = (typeof privacyRequestAgeBands)[number];

type PrivacyRequestMonitorRow = {
  deniedCount: number | bigint | string;
  duplicateCount: number | bigint | string;
  fulfilledCount: number | bigint | string;
  newCount: number | bigint | string;
  newOldestAgeSeconds: number | bigint | string | null;
  noActionNeededCount: number | bigint | string;
  partiallyFulfilledCount: number | bigint | string;
  redirectedToAccountDeletionCount: number | bigint | string;
  reviewingCount: number | bigint | string;
  reviewingOldestAgeSeconds: number | bigint | string | null;
  withdrawnCount: number | bigint | string;
};

export type PrivacyRequestMonitorDatabaseClient = {
  $queryRawUnsafe: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
};

export type PrivacyRequestMonitorSnapshot = {
  generatedAt: string;
  queue: {
    new: { count: number; oldestAgeBand: PrivacyRequestAgeBand };
    reviewing: { count: number; oldestAgeBand: PrivacyRequestAgeBand };
  };
  resolvedByResolution: Record<PrivacyRequestResolution, number>;
};

type PrivacyRequestMonitorOptions = {
  database?: PrivacyRequestMonitorDatabaseClient;
  environment?: Record<string, string | undefined>;
  hasDatabase?: () => boolean;
  now?: Date;
};

function numeric(value: number | bigint | string | null) {
  if (value === null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Privacy request monitor returned an invalid aggregate.");
  return Math.max(0, Math.floor(parsed));
}

export function privacyRequestAgeBand(value: number | bigint | string | null): PrivacyRequestAgeBand {
  const seconds = numeric(value);
  if (seconds === null) return "none";
  if (seconds < 24 * 60 * 60) return "under_24_hours";
  if (seconds < 4 * 24 * 60 * 60) return "one_to_three_days";
  if (seconds < 8 * 24 * 60 * 60) return "four_to_seven_days";
  return "over_seven_days";
}

export function isPrivacyRequestMonitorEnabled(
  environment: Record<string, string | undefined> = process.env
) {
  return environment.PRIVACY_REQUEST_MONITOR_ENABLED === "true";
}

function emptyResolutionCounts(): Record<PrivacyRequestResolution, number> {
  return Object.fromEntries(privacyRequestResolutions.map((resolution) => [resolution, 0])) as Record<
    PrivacyRequestResolution,
    number
  >;
}

function databaseFrom(options: PrivacyRequestMonitorOptions) {
  return options.database ?? (getPrisma() as unknown as PrivacyRequestMonitorDatabaseClient);
}

/**
 * Reads one aggregate-only snapshot. The exact opt-in gate is checked before
 * database access, and the returned value never contains request, account,
 * mailbox, provider, or free-form-detail identifiers.
 */
export async function readPrivacyRequestMonitor(
  options: PrivacyRequestMonitorOptions = {}
): Promise<{ enabled: boolean; snapshot: PrivacyRequestMonitorSnapshot | null }> {
  const environment = options.environment ?? process.env;
  if (!isPrivacyRequestMonitorEnabled(environment)) return { enabled: false, snapshot: null };

  const databaseAvailable = options.database ? true : (options.hasDatabase ?? hasDatabaseUrl)();
  if (!databaseAvailable) return { enabled: false, snapshot: null };

  const now = options.now ?? new Date();
  const rows = await databaseFrom(options).$queryRawUnsafe<PrivacyRequestMonitorRow[]>(
    `
      SELECT
        COUNT(*) FILTER (WHERE "status" = 'new')::int AS "newCount",
        FLOOR(EXTRACT(EPOCH FROM ($1::timestamptz - MIN("requestedAt") FILTER (WHERE "status" = 'new'))))::int AS "newOldestAgeSeconds",
        COUNT(*) FILTER (WHERE "status" = 'reviewing')::int AS "reviewingCount",
        FLOOR(EXTRACT(EPOCH FROM ($1::timestamptz - MIN("requestedAt") FILTER (WHERE "status" = 'reviewing'))))::int AS "reviewingOldestAgeSeconds",
        COUNT(*) FILTER (WHERE "status" = 'resolved' AND "resolution" = 'fulfilled')::int AS "fulfilledCount",
        COUNT(*) FILTER (WHERE "status" = 'resolved' AND "resolution" = 'partially_fulfilled')::int AS "partiallyFulfilledCount",
        COUNT(*) FILTER (WHERE "status" = 'resolved' AND "resolution" = 'denied')::int AS "deniedCount",
        COUNT(*) FILTER (WHERE "status" = 'resolved' AND "resolution" = 'redirected_to_account_deletion')::int AS "redirectedToAccountDeletionCount",
        COUNT(*) FILTER (WHERE "status" = 'resolved' AND "resolution" = 'withdrawn')::int AS "withdrawnCount",
        COUNT(*) FILTER (WHERE "status" = 'resolved' AND "resolution" = 'duplicate')::int AS "duplicateCount",
        COUNT(*) FILTER (WHERE "status" = 'resolved' AND "resolution" = 'no_action_needed')::int AS "noActionNeededCount"
      FROM "PrivacyRequest"
    `,
    now
  );

  const row = rows[0];
  if (!row) throw new Error("Privacy request monitor returned no aggregate row.");

  const resolvedByResolution = emptyResolutionCounts();
  resolvedByResolution.fulfilled = numeric(row.fulfilledCount) ?? 0;
  resolvedByResolution.partially_fulfilled = numeric(row.partiallyFulfilledCount) ?? 0;
  resolvedByResolution.denied = numeric(row.deniedCount) ?? 0;
  resolvedByResolution.redirected_to_account_deletion = numeric(row.redirectedToAccountDeletionCount) ?? 0;
  resolvedByResolution.withdrawn = numeric(row.withdrawnCount) ?? 0;
  resolvedByResolution.duplicate = numeric(row.duplicateCount) ?? 0;
  resolvedByResolution.no_action_needed = numeric(row.noActionNeededCount) ?? 0;

  return {
    enabled: true,
    snapshot: {
      generatedAt: now.toISOString(),
      queue: {
        new: {
          count: numeric(row.newCount) ?? 0,
          oldestAgeBand: privacyRequestAgeBand(row.newOldestAgeSeconds)
        },
        reviewing: {
          count: numeric(row.reviewingCount) ?? 0,
          oldestAgeBand: privacyRequestAgeBand(row.reviewingOldestAgeSeconds)
        }
      },
      resolvedByResolution
    }
  };
}
