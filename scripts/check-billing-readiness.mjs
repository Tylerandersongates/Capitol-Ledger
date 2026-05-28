const paidPriceEnvNames = [
  "CAPITOL_LEDGER_STRIPE_PRO_MONTHLY_PRICE_ID",
  "CAPITOL_LEDGER_STRIPE_PRO_ANNUAL_PRICE_ID",
  "CAPITOL_LEDGER_STRIPE_TEAM_MONTHLY_PRICE_ID",
  "CAPITOL_LEDGER_STRIPE_TEAM_ANNUAL_PRICE_ID"
];

const requireStripe = process.env.BILLING_REQUIRE_STRIPE === "true";
const liveMode = process.env.STRIPE_LIVE_MODE === "true";
const productionMode = process.env.NODE_ENV === "production";
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

function isValidUrl(value) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || (!productionMode && url.protocol === "http:");
  } catch {
    return false;
  }
}

function looksLikeStripeSecret(value) {
  return typeof value === "string" && (value.startsWith("sk_test_") || value.startsWith("sk_live_"));
}

function looksLikeStripeWebhookSecret(value) {
  return typeof value === "string" && value.startsWith("whsec_") && value.length >= 16;
}

function looksLikeStripePrice(value) {
  return typeof value === "string" && value.startsWith("price_") && value.length >= 12;
}

function checkDatabase() {
  if (process.env.DATABASE_URL) {
    pass("DATABASE_URL is configured");
    return;
  }

  if (requireStripe || productionMode) {
    fail("DATABASE_URL is configured", "Live billing needs database-backed users and subscriptions.");
  } else {
    warn("DATABASE_URL is configured", "Demo billing can run without it, but live Stripe billing needs a database.");
  }
}

function checkAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (isValidUrl(appUrl)) {
    pass("NEXT_PUBLIC_APP_URL is configured", appUrl);
    return;
  }

  if (productionMode) {
    fail("NEXT_PUBLIC_APP_URL is configured", "Use the deployed HTTPS app URL in production.");
  } else {
    warn("NEXT_PUBLIC_APP_URL is configured", "Set this before deployed checkout, QA, and provider links.");
  }
}

function checkStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    if (requireStripe) {
      fail("STRIPE_SECRET_KEY is configured", "Required when BILLING_REQUIRE_STRIPE=true.");
    } else {
      warn("STRIPE_SECRET_KEY is configured", "Missing key means paid checkout will fall back to demo mode.");
    }
    return;
  }

  if (!looksLikeStripeSecret(key)) {
    fail("STRIPE_SECRET_KEY is configured", "Expected a Stripe secret key starting with sk_test_ or sk_live_.");
    return;
  }

  if (liveMode && !key.startsWith("sk_live_")) {
    fail("STRIPE_SECRET_KEY is live", "STRIPE_LIVE_MODE=true requires an sk_live_ key.");
    return;
  }

  if (!liveMode && key.startsWith("sk_live_")) {
    warn("STRIPE_SECRET_KEY mode", "Live key is present while STRIPE_LIVE_MODE is not true.");
  }

  pass("STRIPE_SECRET_KEY is configured", key.startsWith("sk_live_") ? "live key shape" : "test key shape");
}

function checkStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    if (requireStripe) {
      fail("STRIPE_WEBHOOK_SECRET is configured", "Required so Stripe subscription events can update accounts.");
    } else {
      warn("STRIPE_WEBHOOK_SECRET is configured", "Missing secret means the webhook route rejects live Stripe events.");
    }
    return;
  }

  if (!looksLikeStripeWebhookSecret(secret)) {
    fail("STRIPE_WEBHOOK_SECRET is configured", "Expected a Stripe webhook secret starting with whsec_.");
    return;
  }

  pass("STRIPE_WEBHOOK_SECRET is configured");
}

function checkStripePriceIds() {
  paidPriceEnvNames.forEach((envName) => {
    const priceId = process.env[envName];

    if (!priceId) {
      if (requireStripe) {
        fail(`${envName} is configured`, "Required for paid checkout.");
      } else {
        warn(`${envName} is configured`, "Missing price ID means this paid plan/cycle falls back to demo mode.");
      }
      return;
    }

    if (!looksLikeStripePrice(priceId)) {
      fail(`${envName} is configured`, "Expected a Stripe price ID starting with price_.");
      return;
    }

    pass(`${envName} is configured`, priceId);
  });
}

function checkProductionCookie() {
  if (!productionMode) {
    pass("Production cookie mode", "Not running with NODE_ENV=production.");
    return;
  }

  if (process.env.AUTH_COOKIE_SECURE === "true") {
    pass("AUTH_COOKIE_SECURE is enabled");
  } else {
    warn("AUTH_COOKIE_SECURE is enabled", "Set AUTH_COOKIE_SECURE=true for deployed HTTPS billing/auth flows.");
  }
}

function main() {
  console.log("Checking Capitol Ledger billing readiness");

  checkDatabase();
  checkAppUrl();
  checkStripeSecretKey();
  checkStripeWebhookSecret();
  checkStripePriceIds();
  checkProductionCookie();

  const failures = results.filter((result) => result.kind === "error" && !result.ok);
  if (failures.length) {
    console.error(`Billing readiness has ${failures.length} blocking issue(s).`);
    process.exit(1);
  }

  if (!requireStripe) {
    console.log("Billing readiness check passed for demo-safe mode. Use BILLING_REQUIRE_STRIPE=true for live Stripe readiness.");
    return;
  }

  console.log("Billing readiness check passed for live Stripe readiness.");
}

main();
