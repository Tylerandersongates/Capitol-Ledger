import { existsSync, readFileSync } from "fs";

loadLocalEnv();

const retiredStripeEnvNames = [
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CAPITOL_LEDGER_STRIPE_PRO_MONTHLY_PRICE_ID",
  "CAPITOL_LEDGER_STRIPE_PRO_ANNUAL_PRICE_ID",
  "CAPITOL_LEDGER_STRIPE_TEAM_MONTHLY_PRICE_ID",
  "CAPITOL_LEDGER_STRIPE_TEAM_ANNUAL_PRICE_ID"
];

const requiredProductIds = [
  "com.capitolwonk.pro.monthly",
  "com.capitolwonk.pro.annual",
  "com.capitolwonk.team.monthly",
  "com.capitolwonk.team.annual"
];

const requireAppStore = process.env.BILLING_REQUIRE_APP_STORE === "true";
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

function isValidUrl(value) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || (!productionMode && url.protocol === "http:");
  } catch {
    return false;
  }
}

function readIfPresent(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function checkDatabase() {
  if (process.env.DATABASE_URL) {
    pass("DATABASE_URL is configured");
    return;
  }

  if (requireAppStore || productionMode) {
    fail("DATABASE_URL is configured", "App Store account sync needs database-backed users and subscriptions.");
  } else {
    warn("DATABASE_URL is configured", "Device-local demo billing can run without it, but account-wide paid sync needs a database.");
  }
}

function checkAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (isValidUrl(appUrl)) {
    pass("NEXT_PUBLIC_APP_URL is configured");
    return;
  }

  if (productionMode) {
    fail("NEXT_PUBLIC_APP_URL is configured", "Use the deployed HTTPS app URL in production.");
  } else {
    warn("NEXT_PUBLIC_APP_URL is configured", "Set this before deployed App Store purchase QA.");
  }
}

function checkAppStoreBundleId() {
  const bundleId = process.env.APP_STORE_BUNDLE_ID || "com.capitolwonk.ce";

  if (!bundleId.includes(".")) {
    fail("APP_STORE_BUNDLE_ID is configured", "Expected a reverse-DNS bundle identifier.");
    return;
  }

  if (!process.env.APP_STORE_BUNDLE_ID) {
    if (requireAppStore || productionMode) {
      fail("APP_STORE_BUNDLE_ID is configured", "Set the final App Store bundle identifier before sandbox/TestFlight purchase QA.");
      return;
    }

    warn("APP_STORE_BUNDLE_ID is configured", "Using the built-in default; set it explicitly before launch.");
    return;
  }

  pass("APP_STORE_BUNDLE_ID is configured");
}

function checkAppStoreAccountTokenNamespace() {
  if (process.env.APP_STORE_ACCOUNT_TOKEN_NAMESPACE) {
    pass("APP_STORE_ACCOUNT_TOKEN_NAMESPACE is configured");
    return;
  }

  if (requireAppStore || productionMode) {
    fail(
      "APP_STORE_ACCOUNT_TOKEN_NAMESPACE is configured",
      "Set a stable namespace before first TestFlight purchase so Apple account tokens remain consistent."
    );
    return;
  }

  warn(
    "APP_STORE_ACCOUNT_TOKEN_NAMESPACE is configured",
    "Optional, but set a stable value before first TestFlight purchase if the bundle ID may change."
  );
}

function checkAppStoreCredential(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    if (requireAppStore || productionMode) {
      fail(`${name} is configured`, "Required for App Store Server API transaction validation.");
    } else {
      warn(`${name} is configured`, "Required before sandbox/TestFlight account-sync QA.");
    }
    return;
  }

  if (name === "APP_STORE_CONNECT_PRIVATE_KEY" && !value.includes("PRIVATE KEY")) {
    fail(`${name} is configured`, "Expected the App Store Connect .p8 private key content.");
    return;
  }

  pass(`${name} is configured`);
}

function checkStoreKitProductIds() {
  const webControls = readIfPresent("components/subscription-controls.tsx");
  const nativeModels = readIfPresent("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerSubscriptionModels.swift");
  const appStoreValidator = readIfPresent("lib/billing/app-store.ts");
  const teamSeats = readIfPresent("lib/subscription-seat-count.ts");

  for (const productId of requiredProductIds) {
    const teamProduct = productId.startsWith("com.capitolwonk.team.");
    const productLabel = `${teamProduct ? "Team" : "Pro"} ${productId.endsWith(".annual") ? "annual" : "monthly"} StoreKit product`;
    const present = teamProduct
      ? webControls.includes("getTeamAppStoreProductId") &&
        nativeModels.includes(productId) &&
        appStoreValidator.includes("getTeamAppStoreProducts") &&
        teamSeats.includes(productId)
      : webControls.includes(productId) && nativeModels.includes(productId) && appStoreValidator.includes(productId);
    if (present) {
      pass(`${productLabel} is wired`);
    } else {
      fail(`${productLabel} is wired`, "Product ID must match web controls, native StoreKit models, and server validation.");
    }
  }

  const teamSeatLadderWired =
    webControls.includes("getTeamAppStoreProductId") &&
    webControls.includes("seatCount: teamSeatCount") &&
    nativeModels.includes("maximumTeamSeatCount = 20") &&
    nativeModels.includes("maximumAnnualTeamSeatCount = 16") &&
    nativeModels.includes("teamProductId") &&
    appStoreValidator.includes("getTeamAppStoreProducts") &&
    teamSeats.includes("maximumTeamSeatCount = 20") &&
    teamSeats.includes("maximumAnnualTeamSeatCount = 16") &&
    teamSeats.includes("com.capitolwonk.team.${seats}.${cycle}");

  if (teamSeatLadderWired) {
    pass("Supported Team StoreKit seat ladders are wired");
  } else {
    fail("Supported Team StoreKit seat ladders are wired", "Web, native, server, and seat-limit configuration must agree on monthly 3-20 and annual 3-16 products.");
  }
}

function checkAppStoreEndpoint() {
  const route = readIfPresent("app/api/account/subscription/app-store/route.ts");
  const accountTokenRoute = readIfPresent("app/api/account/subscription/app-store/account-token/route.ts");
  const validator = readIfPresent("lib/billing/app-store.ts");

  if (
    route.includes("validateAppStoreTransaction") &&
    route.includes("createAppStoreAccountToken") &&
    route.includes("writeSubscriptionToDatabase") &&
    accountTokenRoute.includes("createAppStoreAccountToken") &&
    validator.includes("expectedAppAccountToken") &&
    validator.includes("inApps/v1/transactions")
  ) {
    pass("App Store account-sync endpoint is wired");
    return;
  }

  fail("App Store account-sync endpoint is wired", "Expected server-side App Store transaction validation before account subscription writes.");
}

function checkRetiredStripeConfig() {
  const configured = retiredStripeEnvNames.filter((name) => process.env[name]);
  if (!configured.length) {
    pass("Stripe launch config is absent", "App-only launch path is Apple in-app purchase.");
    return;
  }

  warn("Stripe launch config is present", "Keep Stripe disabled for App Store launch unless a web checkout path is deliberately reintroduced.");
}

function checkProductionCookie() {
  if (!productionMode) {
    pass("Production cookie mode", "Not running with NODE_ENV=production.");
    return;
  }

  if (process.env.AUTH_COOKIE_SECURE === "true") {
    pass("AUTH_COOKIE_SECURE is enabled");
  } else {
    warn("AUTH_COOKIE_SECURE is enabled", "Set AUTH_COOKIE_SECURE=true for deployed HTTPS auth and account sync.");
  }
}

function main() {
  console.log("Checking CapitolWonk CE App Store billing readiness");

  checkDatabase();
  checkAppUrl();
  checkAppStoreBundleId();
  checkAppStoreAccountTokenNamespace();
  checkAppStoreCredential("APP_STORE_CONNECT_ISSUER_ID");
  checkAppStoreCredential("APP_STORE_CONNECT_KEY_ID");
  checkAppStoreCredential("APP_STORE_CONNECT_PRIVATE_KEY");
  checkStoreKitProductIds();
  checkAppStoreEndpoint();
  checkRetiredStripeConfig();
  checkProductionCookie();

  const failures = results.filter((result) => result.kind === "error" && !result.ok);
  if (failures.length) {
    console.error(`Billing readiness has ${failures.length} blocking issue(s).`);
    process.exit(1);
  }

  if (!requireAppStore && !productionMode) {
    console.log("Billing readiness check passed for app-only demo mode. Use BILLING_REQUIRE_APP_STORE=true for App Store Server API readiness.");
    return;
  }

  console.log("Billing readiness check passed for App Store billing readiness.");
}

main();
