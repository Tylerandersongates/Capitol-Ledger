import { existsSync, readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

loadLocalEnv();

const requiredColumns = {
  AccountGamification: ["userId", "civicScore", "dayStreak", "eventCounts", "earnedBadgeIds"],
  AccountSubscription: ["userId", "plan", "cycle", "provider", "status"],
  AuthSession: ["userId", "tokenHash", "expiresAt", "lastUsedAt"],
  EmailVerificationToken: ["userId", "tokenHash", "expiresAt", "usedAt"],
  Follow: ["userId", "targetType", "targetId"],
  IssueInterest: ["userId", "interest"],
  PasswordResetToken: ["userId", "tokenHash", "expiresAt", "usedAt"],
  ReadAlert: ["userId", "alertId", "readAt"],
  SavedAlert: ["userId", "alertId"],
  User: ["email", "name", "firstName", "lastName", "passwordHash", "emailVerifiedAt", "partyAffiliation", "districtLabel", "districtState", "districtCode", "notificationPreferences"],
  WeeklyBriefDelivery: ["userId", "status", "deliveryMode", "plan", "preparedAt", "sentAt", "failedAt"]
};

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;

  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not configured. Production auth cannot be verified.");
    process.exit(1);
  }

  if (process.env.AUTH_COOKIE_SECURE !== "true") {
    console.warn("AUTH_COOKIE_SECURE is not true. Set it to true for deployed HTTPS production.");
  }

  const prisma = new PrismaClient();

  try {
    const rows = await prisma.$queryRaw`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `;
    const columnsByTable = rows.reduce((tables, row) => {
      tables[row.table_name] = tables[row.table_name] ?? new Set();
      tables[row.table_name].add(row.column_name);
      return tables;
    }, {});
    const missing = [];

    Object.entries(requiredColumns).forEach(([table, columns]) => {
      if (!columnsByTable[table]) {
        missing.push(`${table} table`);
        return;
      }

      columns.forEach((column) => {
        if (!columnsByTable[table].has(column)) missing.push(`${table}.${column}`);
      });
    });

    if (missing.length) {
      console.error("Production auth database is missing required schema:");
      missing.forEach((item) => console.error(`- ${item}`));
      console.error("Run the Prisma production migration, then run this check again.");
      process.exit(1);
    }

    console.log("Production auth database schema is ready.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
