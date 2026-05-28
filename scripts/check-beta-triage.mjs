import { existsSync, readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

loadLocalEnv();

const failOnBlockers = process.env.BETA_TRIAGE_FAIL_ON_BLOCKERS === "true";
const failOnUntriaged = process.env.BETA_TRIAGE_FAIL_ON_UNTRIAGED === "true";

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

function isSet(value) {
  return typeof value === "string" && value.trim().length > 0 && value !== "replace_me";
}

function formatCount(label, count) {
  return `${label.padEnd(18, " ")} ${count}`;
}

async function main() {
  console.log("Checking Capitol Ledger beta triage");

  if (!isSet(process.env.DATABASE_URL)) {
    console.log("WARN DATABASE_URL is not configured, so no beta feedback queue can be checked.");
    return;
  }

  const prisma = new PrismaClient();

  try {
    const table = await prisma.$queryRawUnsafe(`SELECT to_regclass('"BetaFeedback"')::text AS table_name`);
    if (!table?.[0]?.table_name) {
      console.log("WARN BetaFeedback table was not found. Run migrations before beta review.");
      return;
    }

    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        "status",
        "severity",
        "category",
        "releaseDecision",
        COUNT(*)::int AS "count"
      FROM "BetaFeedback"
      GROUP BY "status", "severity", "category", "releaseDecision"
    `);

    const totals = {
      active: 0,
      betaAcceptable: 0,
      blockers: 0,
      later: 0,
      resolved: 0,
      total: 0,
      untriaged: 0
    };
    const byStatus = { new: 0, planned: 0, resolved: 0, reviewing: 0 };
    const bySeverity = { high: 0, low: 0, medium: 0 };
    const byCategory = { bug: 0, data: 0, design: 0, flow: 0, missing: 0, other: 0 };

    for (const row of rows) {
      const count = Number(row.count ?? 0);
      const active = row.status !== "resolved";
      totals.total += count;
      if (active) totals.active += count;
      if (row.status in byStatus) byStatus[row.status] += count;
      if (active && row.severity in bySeverity) bySeverity[row.severity] += count;
      if (active && row.category in byCategory) byCategory[row.category] += count;

      if (!active) {
        totals.resolved += count;
      } else if (row.releaseDecision === "launch_blocker") {
        totals.blockers += count;
      } else if (row.releaseDecision === "beta_acceptable") {
        totals.betaAcceptable += count;
      } else if (row.releaseDecision === "later") {
        totals.later += count;
      } else {
        totals.untriaged += count;
      }
    }

    console.log("\nQueue");
    console.log(formatCount("Total reports", totals.total));
    console.log(formatCount("Active reports", totals.active));
    console.log(formatCount("Resolved", totals.resolved));

    console.log("\nLaunch triage");
    console.log(formatCount("Launch blockers", totals.blockers));
    console.log(formatCount("Beta OK", totals.betaAcceptable));
    console.log(formatCount("Later", totals.later));
    console.log(formatCount("Untriaged", totals.untriaged));

    console.log("\nStatus");
    for (const [status, count] of Object.entries(byStatus)) console.log(formatCount(status, count));

    console.log("\nActive severity");
    for (const [severity, count] of Object.entries(bySeverity)) console.log(formatCount(severity, count));

    console.log("\nActive categories");
    for (const [category, count] of Object.entries(byCategory)) console.log(formatCount(category, count));

    const failures = [];
    if (failOnBlockers && totals.blockers > 0) failures.push(`${totals.blockers} launch blocker(s) remain.`);
    if (failOnUntriaged && totals.untriaged > 0) failures.push(`${totals.untriaged} active report(s) are untriaged.`);

    if (failures.length) {
      console.error(`\nBeta triage check failed: ${failures.join(" ")}`);
      process.exit(1);
    }

    console.log("\nBeta triage snapshot completed.");
  } catch (error) {
    console.log(`WARN Beta triage check could not read the database. ${error instanceof Error ? error.message : "Unknown database error"}`);
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

main();
