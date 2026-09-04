import { readFileSync } from "fs";

const productionMode = process.env.NODE_ENV === "production";
const requireLive = process.env.CONGRESS_REQUIRE_LIVE === "true";
const checkLive = process.env.CONGRESS_CHECK_LIVE === "true";
const results = [];

function record(kind, name, ok, detail = "") {
  results.push({ detail, kind, name, ok });
  const marker = kind === "warn" ? "WARN" : ok ? "PASS" : "FAIL";
  console.log(`${marker} ${name}${detail ? ` - ${detail}` : ""}`);
}

function pass(name, detail = "") {
  record("pass", name, true, detail);
}

function fail(name, detail = "") {
  record("error", name, false, detail);
}

function warn(name, detail = "") {
  record("warn", name, true, detail);
}

function shouldFailRequired() {
  return requireLive || productionMode;
}

function isSet(value) {
  return typeof value === "string" && value.trim().length > 0 && value !== "replace_me";
}

function isValidUrl(value) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || (!productionMode && url.protocol === "http:");
  } catch {
    return false;
  }
}

function readIntegerEnv(name, fallback, { max, min }) {
  const raw = process.env[name];
  const value = Number(raw ?? fallback);

  if (!Number.isInteger(value) || value < min || value > max) {
    fail(`${name} is valid`, `Use an integer from ${min} to ${max}.`);
    return fallback;
  }

  pass(`${name} is valid`, String(value));
  return value;
}

function checkBooleanEnv(name, fallback) {
  const raw = process.env[name];
  const value = raw ?? String(fallback);

  if (value !== "true" && value !== "false") {
    fail(`${name} is valid`, "Use true or false.");
    return;
  }

  pass(`${name} is valid`, value);
}

function checkApiKey() {
  if (isSet(process.env.CONGRESS_API_KEY)) {
    pass("CONGRESS_API_KEY is configured");
    return;
  }

  if (shouldFailRequired()) {
    fail("CONGRESS_API_KEY is configured", "Needed for live federal bill, member, committee, and summary sync.");
  } else {
    warn("CONGRESS_API_KEY is configured", "Needed before live Congress.gov sync can run.");
  }
}

function checkDatabase() {
  if (isSet(process.env.DATABASE_URL)) {
    pass("DATABASE_URL is configured");
    return;
  }

  if (shouldFailRequired()) {
    fail("DATABASE_URL is configured", "Needed before normalized Congress.gov records can be persisted.");
  } else {
    warn("DATABASE_URL is configured", "API previews can run without it, but real sync needs persistence.");
  }
}

function checkAppUrl() {
  if (isValidUrl(process.env.NEXT_PUBLIC_APP_URL)) {
    pass("NEXT_PUBLIC_APP_URL is configured", process.env.NEXT_PUBLIC_APP_URL);
    return;
  }

  warn("NEXT_PUBLIC_APP_URL is configured", "Set deployed app URL before scheduler QA and public links.");
}

function checkSchema() {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const requiredModels = ["model Member", "model Bill", "model Committee", "model OfficialSourceLink", "model Cosponsor", "model Vote", "model MemberVote"];
  const missing = requiredModels.filter((model) => !schema.includes(model));

  if (missing.length) {
    fail("Prisma civic-data models exist", `Missing ${missing.join(", ")}.`);
  } else {
    pass("Prisma civic-data models exist", "Member, Bill, Committee, OfficialSourceLink, Cosponsor, Vote, and MemberVote models are present.");
  }

  if (schema.includes("@@unique([congress, billType, billNumber])")) {
    pass("Bill upsert key is available", "congress + billType + billNumber");
  } else {
    fail("Bill upsert key is available", "Bill model needs a stable unique key before live sync.");
  }

  if (schema.includes("@@unique([congress, chamber, session, rollCall])")) {
    pass("Vote upsert key is available", "congress + chamber + session + rollCall");
  } else {
    fail("Vote upsert key is available", "Vote model needs a session-aware unique key before full live sync.");
  }

  if (schema.includes("model OfficialSourceLink") && schema.includes("@@index([targetType, targetId])")) {
    pass("Official source-link lookup is available", "targetType + targetId");
  } else {
    fail("Official source-link lookup is available", "OfficialSourceLink needs target indexes before source-map sync.");
  }
}

async function checkLiveCongressApi(congress, limit) {
  if (!checkLive) {
    warn("Live Congress.gov request check", "Skipped; set CONGRESS_CHECK_LIVE=true to make a live API request.");
    return;
  }

  if (!isSet(process.env.CONGRESS_API_KEY)) {
    fail("Live Congress.gov request check", "CONGRESS_API_KEY is required.");
    return;
  }

  const url = new URL(`https://api.congress.gov/v3/bill/${congress}`);
  url.searchParams.set("api_key", process.env.CONGRESS_API_KEY);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(Math.min(limit, 5)));

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      fail("Live Congress.gov request check", `Request failed with status ${response.status}.`);
      return;
    }

    const data = await response.json();
    const count = Array.isArray(data.bills) ? data.bills.length : 0;
    pass("Live Congress.gov request check", `Fetched ${count} bill record${count === 1 ? "" : "s"}.`);
  } catch (error) {
    fail("Live Congress.gov request check", error instanceof Error ? error.message : "Request failed.");
  }
}

async function main() {
  console.log("Checking CapitolWonk Congress.gov live-data readiness");

  const congress = readIntegerEnv("CONGRESS_SYNC_CONGRESS", 119, { min: 1, max: 999 });
  const limit = readIntegerEnv("CONGRESS_SYNC_LIMIT", 25, { min: 1, max: 250 });
  const fullBillCatalog = process.env.CONGRESS_SYNC_FULL_BILL_CATALOG ?? "false";
  checkBooleanEnv("CONGRESS_SYNC_FULL_BILL_CATALOG", false);
  const billPageLimit = readIntegerEnv("CONGRESS_SYNC_BILL_PAGE_LIMIT", 250, { min: 1, max: 250 });
  const billMaxPages = readIntegerEnv("CONGRESS_SYNC_BILL_MAX_PAGES", 100, { min: 1, max: 250 });
  const billMinimumCount = readIntegerEnv("CONGRESS_SYNC_BILL_MIN_COUNT", 10_000, { min: 1, max: 50_000 });
  readIntegerEnv("CONGRESS_SYNC_BILL_ENRICHMENT_LIMIT", 25, { min: 0, max: 250 });
  if (fullBillCatalog === "true" && billMaxPages * billPageLimit < billMinimumCount) {
    fail("Full bill catalog page capacity", "Configured page limits cannot reach the minimum catalog count.");
  } else {
    pass("Full bill catalog page capacity", fullBillCatalog === "true" ? "pagination capacity is sufficient" : "full catalog disabled");
  }
  const fullMemberRoster = process.env.CONGRESS_SYNC_FULL_MEMBER_ROSTER ?? "false";
  const reconcileRoster = process.env.CONGRESS_SYNC_RECONCILE_ROSTER ?? "false";
  checkBooleanEnv("CONGRESS_SYNC_FULL_MEMBER_ROSTER", false);
  readIntegerEnv("CONGRESS_SYNC_MEMBER_PAGE_LIMIT", 250, { min: 1, max: 250 });
  readIntegerEnv("CONGRESS_SYNC_MEMBER_MAX_PAGES", 10, { min: 1, max: 25 });
  readIntegerEnv("CONGRESS_SYNC_MEMBER_MIN_COUNT", 500, { min: 500, max: 600 });
  checkBooleanEnv("CONGRESS_SYNC_RECONCILE_ROSTER", false);
  if (reconcileRoster === "true" && fullMemberRoster !== "true") {
    fail("Roster reconciliation guard", "CONGRESS_SYNC_RECONCILE_ROSTER=true requires CONGRESS_SYNC_FULL_MEMBER_ROSTER=true.");
  } else {
    pass("Roster reconciliation guard", reconcileRoster === "true" ? "full-roster validation required" : "reconciliation disabled");
  }
  if (process.env.CONGRESS_SYNC_WRITE === "true") {
    pass("CONGRESS_SYNC_WRITE mode", "Write mode enabled for sync:congress.");
  } else {
    warn("CONGRESS_SYNC_WRITE mode", "Dry-run mode; set CONGRESS_SYNC_WRITE=true to persist members, bills, committees, official source links, and resolved summaries.");
  }
  checkBooleanEnv("CONGRESS_SYNC_SUMMARIES", true);
  checkBooleanEnv("CONGRESS_SYNC_COSPONSORS", true);
  readIntegerEnv("CONGRESS_SYNC_COSPONSOR_LIMIT", 50, { min: 1, max: 250 });
  checkBooleanEnv("CONGRESS_SYNC_HOUSE_VOTES", false);
  readIntegerEnv("CONGRESS_SYNC_HOUSE_SESSION", 1, { min: 1, max: 2 });
  readIntegerEnv("CONGRESS_SYNC_HOUSE_VOTE_LIMIT", 5, { min: 1, max: 100 });
  checkBooleanEnv("CONGRESS_SYNC_HOUSE_MEMBER_VOTES", true);
  readIntegerEnv("CONGRESS_SYNC_HOUSE_MEMBER_VOTE_LIMIT", 500, { min: 1, max: 500 });
  const fullVoteCatalog = process.env.CONGRESS_SYNC_FULL_VOTE_CATALOG ?? "false";
  checkBooleanEnv("CONGRESS_SYNC_FULL_VOTE_CATALOG", false);
  const voteSessions = process.env.CONGRESS_SYNC_VOTE_SESSIONS ?? "1,2";
  if (/^(1|2)(,(1|2))*$/.test(voteSessions) && new Set(voteSessions.split(",")).size === voteSessions.split(",").length) {
    pass("CONGRESS_SYNC_VOTE_SESSIONS is valid", voteSessions);
  } else {
    fail("CONGRESS_SYNC_VOTE_SESSIONS is valid", "Use 1, 2, or 1,2 without duplicate sessions.");
  }
  const voteMinimumCount = readIntegerEnv("CONGRESS_SYNC_VOTE_MIN_COUNT", 1_000, { min: 1, max: 5_000 });
  const votePageLimit = readIntegerEnv("CONGRESS_SYNC_VOTE_PAGE_LIMIT", 250, { min: 1, max: 250 });
  const voteMaxPages = readIntegerEnv("CONGRESS_SYNC_VOTE_MAX_PAGES", 10, { min: 1, max: 25 });
  readIntegerEnv("CONGRESS_SYNC_VOTE_CONCURRENCY", 6, { min: 1, max: 20 });
  readIntegerEnv("CONGRESS_SYNC_VOTE_TIMEOUT_MS", 20_000, { min: 1_000, max: 60_000 });
  readIntegerEnv("CONGRESS_SYNC_VOTE_POSITION_BATCH_SIZE", 2_000, { min: 1, max: 5_000 });
  if (fullVoteCatalog === "true" && voteMaxPages * votePageLimit < voteMinimumCount) {
    fail("Full vote catalog page capacity", "Configured House page limits cannot reach the minimum catalog count.");
  } else {
    pass("Full vote catalog page capacity", fullVoteCatalog === "true" ? "pagination capacity is sufficient" : "full catalog disabled");
  }

  checkApiKey();
  checkDatabase();
  checkAppUrl();
  checkSchema();
  await checkLiveCongressApi(congress, limit);

  const failures = results.filter((result) => result.kind === "error" && !result.ok);
  if (failures.length) {
    console.error(`Congress.gov readiness has ${failures.length} blocking issue(s).`);
    process.exit(1);
  }

  if (!requireLive) {
    console.log("Congress.gov readiness check passed for demo-safe mode. Use CONGRESS_REQUIRE_LIVE=true for production sync readiness.");
    return;
  }

  console.log("Congress.gov readiness check passed for production sync readiness.");
}

main();
