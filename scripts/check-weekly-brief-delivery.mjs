const allowedDeliveryModes = new Set(["disabled", "manual_demo", "resend", "webhook"]);
const deliveryMode = process.env.WEEKLY_BRIEF_DELIVERY || "disabled";
const requireProvider = process.env.WEEKLY_BRIEF_REQUIRE_PROVIDER === "true";
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

function isUsableSecret(value) {
  return typeof value === "string" && value.trim().length >= 24;
}

function isValidUrl(value) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:");
  } catch {
    return false;
  }
}

function checkDatabase() {
  if (process.env.DATABASE_URL) {
    pass("DATABASE_URL is configured");
  } else {
    fail("DATABASE_URL is configured", "Weekly Brief delivery needs database-backed users and delivery history.");
  }
}

function checkTaskSecret() {
  const secret = process.env.WEEKLY_BRIEF_CRON_SECRET || process.env.CAPITOL_LEDGER_TASK_SECRET || process.env.CRON_SECRET;

  if (isUsableSecret(secret)) {
    pass("Weekly Brief task secret is configured");
  } else if (secret) {
    fail("Weekly Brief task secret is configured", "Use at least 24 unpredictable characters.");
  } else {
    fail("Weekly Brief task secret is configured", "Set WEEKLY_BRIEF_CRON_SECRET before exposing the scheduled route.");
  }
}

function checkAppUrl() {
  if (isValidUrl(process.env.NEXT_PUBLIC_APP_URL)) {
    pass("NEXT_PUBLIC_APP_URL is configured", process.env.NEXT_PUBLIC_APP_URL);
  } else {
    warn("NEXT_PUBLIC_APP_URL is configured", "Set the deployed app URL before sending user-facing brief links.");
  }
}

function checkDeliveryMode() {
  if (!allowedDeliveryModes.has(deliveryMode)) {
    fail("WEEKLY_BRIEF_DELIVERY mode is valid", "Use disabled, manual_demo, resend, or webhook.");
    return;
  }

  pass("WEEKLY_BRIEF_DELIVERY mode is valid", deliveryMode);

  if (deliveryMode === "resend") {
    checkResend();
    return;
  }

  if (deliveryMode === "webhook") {
    checkWebhook();
    return;
  }

  if (requireProvider) {
    fail("Weekly Brief provider is connected", "Set WEEKLY_BRIEF_DELIVERY=resend (with RESEND_API_KEY) or webhook (with WEEKLY_BRIEF_WEBHOOK_URL).");
  } else {
    warn(
      "Weekly Brief provider is connected",
      deliveryMode === "manual_demo"
        ? "Manual demo mode will queue records but will not send real email or push."
        : "Delivery is disabled; queued/sent provider behavior will not run until a provider is connected."
    );
  }
}

function checkResend() {
  if (isUsableSecret(process.env.RESEND_API_KEY)) {
    pass("RESEND_API_KEY is configured");
  } else {
    fail("RESEND_API_KEY is configured", "Resend delivery mode requires a valid API key.");
  }
}

function checkWebhook() {
  if (isValidUrl(process.env.WEEKLY_BRIEF_WEBHOOK_URL)) {
    pass("WEEKLY_BRIEF_WEBHOOK_URL is configured", process.env.WEEKLY_BRIEF_WEBHOOK_URL);
  } else {
    fail("WEEKLY_BRIEF_WEBHOOK_URL is configured", "Webhook delivery mode requires a valid provider endpoint.");
  }

  if (isUsableSecret(process.env.WEEKLY_BRIEF_WEBHOOK_SECRET)) {
    pass("WEEKLY_BRIEF_WEBHOOK_SECRET is configured");
  } else {
    warn("WEEKLY_BRIEF_WEBHOOK_SECRET is configured", "Add a provider webhook secret before production delivery.");
  }
}

function checkSender() {
  if (process.env.WEEKLY_BRIEF_FROM || process.env.AUTH_EMAIL_FROM) {
    pass("Weekly Brief sender identity is configured", process.env.WEEKLY_BRIEF_FROM || process.env.AUTH_EMAIL_FROM);
  } else {
    warn("Weekly Brief sender identity is configured", "Set WEEKLY_BRIEF_FROM or AUTH_EMAIL_FROM before sending real messages.");
  }
}

function main() {
  console.log("Checking CapitolWonk CE Weekly Brief delivery configuration");

  checkDatabase();
  checkTaskSecret();
  checkAppUrl();
  checkDeliveryMode();
  checkSender();

  const failures = results.filter((result) => result.kind === "error" && !result.ok);
  if (failures.length) {
    console.error(`Weekly Brief delivery configuration has ${failures.length} blocking issue(s).`);
    process.exit(1);
  }

  console.log("Weekly Brief delivery configuration check passed.");
}

main();
