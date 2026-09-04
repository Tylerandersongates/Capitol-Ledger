import { existsSync, readFileSync } from "fs";

loadLocalEnv();

const allowedDeliveryModes = new Set(["disabled", "manual_demo", "resend", "webhook"]);
const deliveryMode = process.env.AUTH_EMAIL_DELIVERY || "disabled";
const requireProvider = process.env.AUTH_EMAIL_REQUIRE_PROVIDER === "true";
const productionMode = process.env.NODE_ENV === "production";
const results = [];

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
  return typeof value === "string" && value.trim().length >= 24 && value !== "replace_me";
}

function isLikelyEmail(value) {
  return typeof value === "string" && value.includes("@");
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

function shouldFailForProduction() {
  return requireProvider || productionMode;
}

function checkDatabase() {
  if (process.env.DATABASE_URL) {
    pass("DATABASE_URL is configured");
    return;
  }

  if (shouldFailForProduction()) {
    fail("DATABASE_URL is configured", "Auth email needs database-backed verification and password-reset tokens.");
  } else {
    warn("DATABASE_URL is configured", "Demo/manual links can work locally, but real auth email needs database-backed tokens.");
  }
}

function checkAppUrl() {
  if (isValidUrl(process.env.NEXT_PUBLIC_APP_URL)) {
    pass("NEXT_PUBLIC_APP_URL is configured", process.env.NEXT_PUBLIC_APP_URL);
    return;
  }

  if (shouldFailForProduction()) {
    fail("NEXT_PUBLIC_APP_URL is configured", "Verification and reset links need the deployed app URL.");
  } else {
    warn("NEXT_PUBLIC_APP_URL is configured", "Set this before testing real verification or reset email links.");
  }
}

function checkAuthSecret() {
  if (isUsableSecret(process.env.AUTH_SECRET)) {
    pass("AUTH_SECRET is configured");
    return;
  }

  if (shouldFailForProduction()) {
    fail("AUTH_SECRET is configured", "Use at least 24 unpredictable characters.");
  } else {
    warn("AUTH_SECRET is configured", "Set a long secret before deployed auth email testing.");
  }
}

function checkCookieMode() {
  if (!productionMode) {
    pass("Production cookie mode", "Not running with NODE_ENV=production.");
    return;
  }

  if (process.env.AUTH_COOKIE_SECURE === "true") {
    pass("AUTH_COOKIE_SECURE is enabled");
  } else {
    warn("AUTH_COOKIE_SECURE is enabled", "Set AUTH_COOKIE_SECURE=true for deployed HTTPS auth flows.");
  }
}

function checkDeliveryMode() {
  if (!allowedDeliveryModes.has(deliveryMode)) {
    fail("AUTH_EMAIL_DELIVERY mode is valid", "Use disabled, manual_demo, resend, or webhook.");
    return;
  }

  pass("AUTH_EMAIL_DELIVERY mode is valid", deliveryMode);

  if (deliveryMode === "resend") {
    checkResend();
    return;
  }

  if (deliveryMode === "webhook") {
    checkWebhook();
    return;
  }

  if (requireProvider) {
    fail("Auth email provider is connected", "Set AUTH_EMAIL_DELIVERY=resend (with RESEND_API_KEY) or webhook (with AUTH_EMAIL_WEBHOOK_URL).");
  } else {
    warn(
      "Auth email provider is connected",
      deliveryMode === "manual_demo"
        ? "Manual demo mode exposes verification/reset links locally but does not send email."
        : "Delivery is disabled; production users will not receive verification or reset emails."
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
  if (isValidUrl(process.env.AUTH_EMAIL_WEBHOOK_URL)) {
    pass("AUTH_EMAIL_WEBHOOK_URL is configured", process.env.AUTH_EMAIL_WEBHOOK_URL);
  } else {
    fail("AUTH_EMAIL_WEBHOOK_URL is configured", "Webhook delivery mode requires a valid provider endpoint.");
  }

  if (isUsableSecret(process.env.AUTH_EMAIL_WEBHOOK_SECRET)) {
    pass("AUTH_EMAIL_WEBHOOK_SECRET is configured");
  } else if (requireProvider) {
    fail("AUTH_EMAIL_WEBHOOK_SECRET is configured", "Use a long shared secret before production email delivery.");
  } else {
    warn("AUTH_EMAIL_WEBHOOK_SECRET is configured", "Recommended before production email delivery.");
  }
}

function checkSender() {
  const sender = process.env.AUTH_EMAIL_FROM;

  if (isLikelyEmail(sender)) {
    pass("AUTH_EMAIL_FROM is configured", sender);
    return;
  }

  if (shouldFailForProduction()) {
    fail("AUTH_EMAIL_FROM is configured", "Set a verified sender identity from the email provider.");
  } else {
    warn("AUTH_EMAIL_FROM is configured", "Set a sender identity before sending real auth email.");
  }
}

function main() {
  console.log("Checking CapitolWonk auth email delivery configuration");

  checkDatabase();
  checkAppUrl();
  checkAuthSecret();
  checkCookieMode();
  checkDeliveryMode();
  checkSender();

  const failures = results.filter((result) => result.kind === "error" && !result.ok);
  if (failures.length) {
    console.error(`Auth email delivery configuration has ${failures.length} blocking issue(s).`);
    process.exit(1);
  }

  if (!requireProvider) {
    console.log("Auth email delivery check passed for demo-safe mode. Use AUTH_EMAIL_REQUIRE_PROVIDER=true for production provider readiness.");
    return;
  }

  console.log("Auth email delivery check passed for production provider readiness.");
}

main();
