import { existsSync, readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

loadLocalEnv();

const requireProduction = process.env.REPORTS_REQUIRE_PRODUCTION === "true" || process.env.BETA_REQUIRE_PRODUCTION === "true" || process.env.NODE_ENV === "production";
const checkDatabaseTable = process.env.REPORTS_CHECK_DATABASE === "true" || process.env.BETA_CHECK_DATABASE === "true" || requireProduction;
const checks = [];

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

function record(kind, name, detail = "") {
  checks.push({ kind, name });
  const marker = kind === "pass" ? "PASS" : kind === "fail" ? "FAIL" : "WARN";
  console.log(`${marker} ${name}${detail ? ` - ${detail}` : ""}`);
}

function pass(name, detail = "") {
  record("pass", name, detail);
}

function warn(name, detail = "") {
  record("warn", name, detail);
}

function fail(name, detail = "") {
  record("fail", name, detail);
}

function isSet(value) {
  return typeof value === "string" && value.trim().length > 0 && value !== "replace_me";
}

function isLocalUrl(value) {
  if (!isSet(value)) return false;

  try {
    const url = new URL(value);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  } catch {
    return false;
  }
}

function required(name, value, detail) {
  if (isSet(value)) {
    pass(`${name} is configured`);
    return;
  }

  if (requireProduction) {
    fail(`${name} is configured`, detail);
  } else {
    warn(`${name} is configured`, detail);
  }
}

function fileExists(path, detail) {
  if (existsSync(path)) {
    pass(`${path} exists`);
  } else {
    fail(`${path} exists`, detail);
  }
}

async function checkDatabase() {
  if (!isSet(process.env.DATABASE_URL)) return;
  if (!checkDatabaseTable) {
    warn("Feedback table check", "Skipped locally. Use REPORTS_CHECK_DATABASE=true pnpm reports:check to verify the database table.");
    return;
  }

  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe(`SELECT to_regclass('"BetaFeedback"')::text AS table_name`);
    if (rows?.[0]?.table_name) {
      pass("Feedback table is present");
    } else if (requireProduction) {
      fail("Feedback table is present", "Run pnpm prisma:migrate:deploy against the target database.");
    } else {
      warn("Feedback table is present", "Run migrations before relying on live app reports.");
    }

    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'BetaFeedback' AND column_name = 'releaseDecision'
    `);
    if (columns?.[0]?.column_name) {
      pass("Feedback release triage column is present");
    } else if (requireProduction) {
      fail("Feedback release triage column is present", "Run the latest feedback migration before relying on live app reports.");
    } else {
      warn("Feedback release triage column is present", "Run the latest feedback migration before relying on live app reports.");
    }
  } catch (error) {
    if (requireProduction) {
      fail("Database report check can connect", error instanceof Error ? error.message : "Unknown database error");
    } else {
      warn("Database report check can connect", error instanceof Error ? error.message : "Unknown database error");
    }
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

async function main() {
  console.log("Checking Capitol Ledger live app reporting readiness");

  console.log("\nFeedback intake");
  fileExists("app/feedback/page.tsx", "Report form page is required.");
  fileExists("app/feedback/review/page.tsx", "Review queue page is required.");
  fileExists("app/api/feedback/route.ts", "Feedback API route is required.");
  fileExists("prisma/migrations/20260527103000_beta_feedback/migration.sql", "Feedback database migration is required.");
  fileExists("prisma/migrations/20260527104500_beta_feedback_release_decision/migration.sql", "Feedback release-triage migration is required.");

  console.log("\nEnvironment");
  required("DATABASE_URL", process.env.DATABASE_URL, "Needed to store live app reports outside the preview session.");
  required("NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL, "Set the deployed app URL before using live app reporting.");
  if (requireProduction && isLocalUrl(process.env.NEXT_PUBLIC_APP_URL)) {
    fail("NEXT_PUBLIC_APP_URL points to deployed app URL", "Replace the local preview URL with the deployed app URL before relying on live app reports.");
  }
  if (isSet(process.env.BETA_REVIEWER_EMAILS) || isSet(process.env.BETA_REVIEWER_EMAIL)) {
    pass("Reviewer email is configured");
  } else if (requireProduction) {
    fail("Reviewer email is configured", "Set BETA_REVIEWER_EMAILS so reviewer accounts can see and triage the full report queue.");
  } else {
    warn("Reviewer email is configured", "Set BETA_REVIEWER_EMAILS so only reviewer accounts can see the full queue.");
  }

  console.log("\nDatabase");
  await checkDatabase();

  const failures = checks.filter((check) => check.kind === "fail");
  if (failures.length) {
    console.error(`Live app reporting readiness has ${failures.length} blocking issue(s).`);
    process.exit(1);
  }

  console.log("\nLive app reporting readiness check completed.");
  if (!requireProduction) {
    console.log("Use REPORTS_REQUIRE_PRODUCTION=true pnpm reports:check before relying on deployed live app reporting.");
  }
}

main();
