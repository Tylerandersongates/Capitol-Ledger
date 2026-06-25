const productionMode = process.env.NODE_ENV === "production";
const requireProduction = process.env.BACKEND_REQUIRE_PRODUCTION === "true";
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
  return requireProduction || productionMode;
}

function isSet(value) {
  return typeof value === "string" && value.trim().length > 0 && value !== "replace_me";
}

function isLongSecret(value) {
  return typeof value === "string" && value.trim().length >= 24 && value !== "replace_me";
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

function required(name, value, detail) {
  if (isSet(value)) {
    pass(`${name} is configured`);
    return;
  }

  if (shouldFailRequired()) {
    fail(`${name} is configured`, detail);
  } else {
    warn(`${name} is configured`, detail);
  }
}

function optional(name, value, detail) {
  if (isSet(value)) {
    pass(`${name} is configured`);
  } else {
    warn(`${name} is configured`, detail);
  }
}

function checkCore() {
  console.log("\nCore app");
  required("DATABASE_URL", process.env.DATABASE_URL, "Needed for real accounts, saved ledger, subscriptions, gamification, alerts, and Weekly Brief history.");

  if (isValidUrl(process.env.NEXT_PUBLIC_APP_URL)) {
    pass("NEXT_PUBLIC_APP_URL is configured", process.env.NEXT_PUBLIC_APP_URL);
  } else if (shouldFailRequired()) {
    fail("NEXT_PUBLIC_APP_URL is configured", "Set the deployed HTTPS app URL.");
  } else {
    warn("NEXT_PUBLIC_APP_URL is configured", "Set the deployed app URL before provider links, auth email, and checkout QA.");
  }

  if (isLongSecret(process.env.AUTH_SECRET)) {
    pass("AUTH_SECRET is configured");
  } else if (shouldFailRequired()) {
    fail("AUTH_SECRET is configured", "Use at least 24 unpredictable characters.");
  } else {
    warn("AUTH_SECRET is configured", "Set a long secret before deployed auth.");
  }

  if (productionMode && process.env.AUTH_COOKIE_SECURE !== "true") {
    warn("AUTH_COOKIE_SECURE is enabled", "Set AUTH_COOKIE_SECURE=true for deployed HTTPS.");
  } else {
    pass("AUTH_COOKIE_SECURE mode", process.env.AUTH_COOKIE_SECURE || "not set");
  }
}

function checkAuthEmail() {
  console.log("\nAuth email");
  const mode = process.env.AUTH_EMAIL_DELIVERY || "disabled";

  if (["disabled", "manual_demo", "resend", "webhook"].includes(mode)) {
    pass("AUTH_EMAIL_DELIVERY mode is valid", mode);
  } else {
    fail("AUTH_EMAIL_DELIVERY mode is valid", "Use disabled, manual_demo, resend, or webhook.");
  }

  optional("AUTH_EMAIL_FROM", process.env.AUTH_EMAIL_FROM, "Set the visible sender identity before real email delivery.");

  if (mode === "resend") {
    if (isSet(process.env.RESEND_API_KEY)) {
      pass("RESEND_API_KEY is configured");
    } else {
      fail("RESEND_API_KEY is configured", "Required when auth email delivery uses Resend.");
    }
  } else if (mode === "webhook" || shouldFailRequired()) {
    if (isValidUrl(process.env.AUTH_EMAIL_WEBHOOK_URL)) {
      pass("AUTH_EMAIL_WEBHOOK_URL is configured", process.env.AUTH_EMAIL_WEBHOOK_URL);
    } else {
      (mode === "webhook" || requireProduction ? fail : warn)(
        "AUTH_EMAIL_WEBHOOK_URL is configured",
        "Required when auth email delivery uses a provider bridge."
      );
    }

    if (isLongSecret(process.env.AUTH_EMAIL_WEBHOOK_SECRET)) {
      pass("AUTH_EMAIL_WEBHOOK_SECRET is configured");
    } else {
      warn("AUTH_EMAIL_WEBHOOK_SECRET is configured", "Recommended before production email delivery.");
    }
  }
}

function checkData() {
  console.log("\nGovernment data");
  required("CONGRESS_API_KEY", process.env.CONGRESS_API_KEY, "Needed for live federal bill, member, committee, and summary sync.");

  const congress = Number(process.env.CONGRESS_SYNC_CONGRESS ?? 119);
  if (Number.isInteger(congress) && congress >= 1 && congress <= 999) {
    pass("CONGRESS_SYNC_CONGRESS is valid", String(congress));
  } else {
    warn("CONGRESS_SYNC_CONGRESS is valid", "Use an integer such as 119.");
  }

  const limit = Number(process.env.CONGRESS_SYNC_LIMIT ?? 25);
  if (Number.isInteger(limit) && limit >= 1 && limit <= 250) {
    pass("CONGRESS_SYNC_LIMIT is valid", String(limit));
  } else {
    warn("CONGRESS_SYNC_LIMIT is valid", "Use an integer from 1 to 250.");
  }

  if (process.env.CONGRESS_SYNC_WRITE === "true") {
    pass("CONGRESS_SYNC_WRITE mode", "Write mode enabled for sync:congress.");
  } else {
    warn("CONGRESS_SYNC_WRITE mode", "Dry-run mode; set true only after DATABASE_URL and API key are ready.");
  }
}

function checkBilling() {
  console.log("\nSubscriptions and billing");
  optional("APP_STORE_BUNDLE_ID", process.env.APP_STORE_BUNDLE_ID, "Defaults to com.capitolledger.app; set explicitly before App Store launch.");
  optional("APP_STORE_ACCOUNT_TOKEN_NAMESPACE", process.env.APP_STORE_ACCOUNT_TOKEN_NAMESPACE, "Set a stable value before first TestFlight purchase if the bundle ID may change.");
  optional("APP_STORE_CONNECT_ISSUER_ID", process.env.APP_STORE_CONNECT_ISSUER_ID, "Needed before App Store Server API account-sync QA.");
  optional("APP_STORE_CONNECT_KEY_ID", process.env.APP_STORE_CONNECT_KEY_ID, "Needed before App Store Server API account-sync QA.");
  optional("APP_STORE_CONNECT_PRIVATE_KEY", process.env.APP_STORE_CONNECT_PRIVATE_KEY, "Needed before App Store Server API account-sync QA.");

  if (process.env.STRIPE_SECRET_KEY || process.env.STRIPE_WEBHOOK_SECRET) {
    warn("Stripe launch config", "Present but not part of the app-only Apple in-app purchase launch path.");
  } else {
    pass("Stripe launch config", "Absent from the app-only launch path.");
  }
}

function checkWeeklyBrief() {
  console.log("\nWeekly Brief");
  const mode = process.env.WEEKLY_BRIEF_DELIVERY || "disabled";

  if (["disabled", "manual_demo", "resend", "webhook"].includes(mode)) {
    pass("WEEKLY_BRIEF_DELIVERY mode is valid", mode);
  } else {
    fail("WEEKLY_BRIEF_DELIVERY mode is valid", "Use disabled, manual_demo, resend, or webhook.");
  }

  optional("WEEKLY_BRIEF_FROM", process.env.WEEKLY_BRIEF_FROM || process.env.AUTH_EMAIL_FROM, "Set sender identity before real brief delivery.");

  if (isLongSecret(process.env.WEEKLY_BRIEF_CRON_SECRET || process.env.CAPITOL_LEDGER_TASK_SECRET || process.env.CRON_SECRET)) {
    pass("Weekly Brief task secret is configured");
  } else if (shouldFailRequired()) {
    fail("Weekly Brief task secret is configured", "Set WEEKLY_BRIEF_CRON_SECRET before scheduling delivery.");
  } else {
    warn("Weekly Brief task secret is configured", "Needed before scheduling delivery.");
  }

  if (mode === "resend") {
    if (isSet(process.env.RESEND_API_KEY)) {
      pass("RESEND_API_KEY is configured");
    } else {
      fail("RESEND_API_KEY is configured", "Required when Weekly Brief delivery uses Resend.");
    }
  } else if (mode === "webhook" || shouldFailRequired()) {
    if (isValidUrl(process.env.WEEKLY_BRIEF_WEBHOOK_URL)) {
      pass("WEEKLY_BRIEF_WEBHOOK_URL is configured", process.env.WEEKLY_BRIEF_WEBHOOK_URL);
    } else {
      (mode === "webhook" || requireProduction ? fail : warn)(
        "WEEKLY_BRIEF_WEBHOOK_URL is configured",
        "Required when Weekly Brief delivery uses a provider bridge."
      );
    }

    if (isLongSecret(process.env.WEEKLY_BRIEF_WEBHOOK_SECRET)) {
      pass("WEEKLY_BRIEF_WEBHOOK_SECRET is configured");
    } else {
      warn("WEEKLY_BRIEF_WEBHOOK_SECRET is configured", "Recommended before production brief delivery.");
    }
  }
}

function checkHardening() {
  console.log("\nHardening and observability");
  optional("UPSTASH_REDIS_REST_URL", process.env.UPSTASH_REDIS_REST_URL, "Recommended for persistent rate limiting across deployed instances.");
  optional("UPSTASH_REDIS_REST_TOKEN", process.env.UPSTASH_REDIS_REST_TOKEN, "Recommended with UPSTASH_REDIS_REST_URL.");
  optional("OPENAI_API_KEY", process.env.OPENAI_API_KEY, "Needed before live AI bill analysis and policy lens generation.");
  optional("SENTRY_DSN", process.env.SENTRY_DSN, "Optional deeper error monitoring after basic hosting logs.");
}

function main() {
  console.log("Checking Capitol Ledger CE backend setup");

  checkCore();
  checkAuthEmail();
  checkData();
  checkBilling();
  checkWeeklyBrief();
  checkHardening();

  const failures = results.filter((result) => result.kind === "error" && !result.ok);
  if (failures.length) {
    console.error(`Backend setup has ${failures.length} blocking issue(s).`);
    process.exit(1);
  }

  console.log("\nBackend setup check completed.");
  if (!requireProduction) {
    console.log("Use BACKEND_REQUIRE_PRODUCTION=true pnpm backend:check when checking production readiness.");
  }
}

main();
