import { PrismaClient } from "@prisma/client";

type CountRow = Record<string, bigint | Date | number | string | null>;

const prisma = new PrismaClient();

function requireDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for the read-only legacy billing audit.");
  }
}

function printable(rows: CountRow[]) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        typeof value === "bigint" ? Number(value) : value instanceof Date ? value.toISOString() : value
      ])
    )
  );
}

async function main() {
  requireDatabaseUrl();

  const report = await prisma.$transaction(
    async (transaction) => {
      await transaction.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      await transaction.$executeRawUnsafe("SET LOCAL statement_timeout = '15000ms'");

      const subscriptions = await transaction.$queryRawUnsafe<CountRow[]>(`
        SELECT
          COALESCE("provider", '(missing)') AS "provider",
          COALESCE("plan", '(missing)') AS "plan",
          COALESCE("status", '(missing)') AS "status",
          COUNT(*) AS "count",
          COUNT(*) FILTER (WHERE "providerCustomerId" LIKE 'cus\\_%' ESCAPE '\\') AS "stripeCustomerReferences",
          COUNT(*) FILTER (WHERE "providerSubscriptionId" LIKE 'sub\\_%' ESCAPE '\\') AS "stripeSubscriptionReferences",
          MIN("updatedAt") AS "oldestUpdatedAt",
          MAX("updatedAt") AS "newestUpdatedAt"
        FROM "AccountSubscription"
        GROUP BY "provider", "plan", "status"
        ORDER BY "provider", "plan", "status"
      `);

      const tables = await transaction.$queryRawUnsafe<Array<{ cleanup_jobs: string | null; team_pauses: string | null }>>(`
        SELECT
          to_regclass('public."AccountDeletionCleanupJob"')::text AS "cleanup_jobs",
          to_regclass('public."TeamSubscriptionPause"')::text AS "team_pauses"
      `);

      const hasTeamPauses = Boolean(tables[0]?.team_pauses);
      const hasCleanupJobs = Boolean(tables[0]?.cleanup_jobs);

      const teamPauses = hasTeamPauses
        ? await transaction.$queryRawUnsafe<CountRow[]>(`
            SELECT
              COALESCE("previousSubscription"->>'provider', '(missing)') AS "provider",
              COALESCE("previousSubscription"->>'plan', '(missing)') AS "plan",
              COALESCE("previousSubscription"->>'status', '(missing)') AS "previousStatus",
              COALESCE("status", '(missing)') AS "pauseStatus",
              COUNT(*) AS "count",
              COUNT(*) FILTER (
                WHERE COALESCE("previousSubscription"->>'providerCustomerId', '') LIKE 'cus\\_%' ESCAPE '\\'
              ) AS "stripeCustomerReferences",
              COUNT(*) FILTER (
                WHERE COALESCE("previousSubscription"->>'providerSubscriptionId', '') LIKE 'sub\\_%' ESCAPE '\\'
              ) AS "stripeSubscriptionReferences"
            FROM "TeamSubscriptionPause"
            GROUP BY
              "previousSubscription"->>'provider',
              "previousSubscription"->>'plan',
              "previousSubscription"->>'status',
              "status"
            ORDER BY "provider", "plan", "previousStatus", "pauseStatus"
          `)
        : [];

      const cleanupJobs = hasCleanupJobs
        ? await transaction.$queryRawUnsafe<CountRow[]>(`
            SELECT
              COALESCE("kind", '(missing)') AS "kind",
              COALESCE("status", '(missing)') AS "status",
              COUNT(*) AS "count",
              MIN("availableAt") AS "oldestAvailableAt",
              MAX("attempts") AS "maximumAttempts"
            FROM "AccountDeletionCleanupJob"
            GROUP BY "kind", "status"
            ORDER BY "kind", "status"
          `)
        : [];

      return {
        cleanupJobs,
        hasCleanupJobs,
        hasTeamPauses,
        subscriptions,
        teamPauses
      };
    },
    { maxWait: 5_000, timeout: 30_000 }
  );

  console.log("CapitolWonk legacy billing audit (aggregate, read-only)");
  console.log("\nAccountSubscription groups");
  console.table(printable(report.subscriptions));

  console.log("\nTeamSubscriptionPause groups");
  if (report.hasTeamPauses) console.table(printable(report.teamPauses));
  else console.log("TeamSubscriptionPause is not present.");

  console.log("\nAccountDeletionCleanupJob groups");
  if (report.hasCleanupJobs) console.table(printable(report.cleanupJobs));
  else console.log("AccountDeletionCleanupJob is not present.");
}

main()
  .catch(() => {
    console.error("Legacy billing audit failed; no account-level output was emitted.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
