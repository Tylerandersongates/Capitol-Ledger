import { existsSync, readFileSync } from "fs";

loadLocalEnv();

const retiredStripeEnvNames = [
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_LIVE_MODE",
  "BILLING_REQUIRE_STRIPE",
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

function isValidUrl(value, requireHttps = false) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || (!requireHttps && !productionMode && url.protocol === "http:");
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

  if (isValidUrl(appUrl, requireAppStore || productionMode)) {
    pass("NEXT_PUBLIC_APP_URL is configured");
    return;
  }

  if (requireAppStore || productionMode) {
    fail("NEXT_PUBLIC_APP_URL is configured", "Use the deployed HTTPS app URL for strict App Store readiness.");
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

  if (name === "APP_STORE_APP_APPLE_ID") {
    const appAppleId = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(appAppleId) || appAppleId <= 0) {
      fail(`${name} is configured`, "Expected the positive numeric Apple app ID from App Store Connect.");
      return;
    }
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
  const appStoreProducts = readIfPresent("lib/billing/app-store-products.ts");
  const teamSeats = readIfPresent("lib/subscription-seat-count.ts");

  for (const productId of requiredProductIds) {
    const teamProduct = productId.startsWith("com.capitolwonk.team.");
    const productLabel = `${teamProduct ? "Team" : "Pro"} ${productId.endsWith(".annual") ? "annual" : "monthly"} StoreKit product`;
    const present = teamProduct
      ? webControls.includes("getTeamAppStoreProductId") &&
        nativeModels.includes(productId) &&
        appStoreProducts.includes("getTeamAppStoreProducts") &&
        teamSeats.includes(productId)
      : webControls.includes(productId) && nativeModels.includes(productId) && appStoreProducts.includes(productId);
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
    appStoreProducts.includes("getTeamAppStoreProducts") &&
    teamSeats.includes("maximumTeamSeatCount = 20") &&
    teamSeats.includes("maximumAnnualTeamSeatCount = 16") &&
    teamSeats.includes("com.capitolwonk.team.${seats}.${cycle}");

  if (teamSeatLadderWired) {
    pass("Supported Team StoreKit seat ladders are wired");
  } else {
    fail("Supported Team StoreKit seat ladders are wired", "Web, native, server, and seat-limit configuration must agree on monthly 3-20 and annual 3-16 products.");
  }
}

function checkAppStoreServerFoundation() {
  const packageManifest = readIfPresent("package.json");
  const server = readIfPresent("lib/billing/app-store-server.ts");
  const roots = readIfPresent("lib/billing/apple-root-certificates.ts");
  const validator = readIfPresent("lib/billing/app-store.ts");
  const dependencyPresent = packageManifest.includes('"@apple/app-store-server-library"');
  const verifierWired =
    server.includes("SignedDataVerifier") &&
    server.includes("AppStoreServerAPIClient") &&
    server.includes("verifyAndDecodeNotification") &&
    server.includes("verifyAndDecodeTransaction") &&
    server.includes("verifyAndDecodeRenewalInfo") &&
    server.includes("getAllSubscriptionStatuses") &&
    server.includes("Environment.PRODUCTION") &&
    server.includes("Environment.SANDBOX") &&
    /new SignedDataVerifier\(\s*getAppleRootCertificates\(\),\s*true,/.test(server);
  const appIdentityBound =
    server.includes("APP_STORE_APP_APPLE_ID") &&
    server.includes("APP_STORE_BUNDLE_ID") &&
    server.includes("response.appAppleId") &&
    server.includes("response.bundleId") &&
    server.includes("expectedAppAccountToken");
  const productAllowlistWired =
    server.includes("getAppStoreProduct") &&
    server.includes("Type.AUTO_RENEWABLE_SUBSCRIPTION") &&
    validator.includes("reconcileAppStoreSubscription");
  const reviewedTrustRoots =
    roots.includes("getAppleRootCertificates") &&
    roots.includes("Apple Root Certificates") &&
    roots.includes("apple.com/certificateauthority");

  if (dependencyPresent && verifierWired && appIdentityBound && productAllowlistWired && reviewedTrustRoots) {
    pass(
      "App Store server verification is wired",
      "Official signed-data verification, Apple trust roots, app identity checks, and current-status reconciliation are present."
    );
    return;
  }

  fail(
    "App Store server verification is wired",
    !dependencyPresent
      ? "Add the official @apple/app-store-server-library dependency."
      : !verifierWired
        ? "Use Apple's signed-data verifier with online checks and the server API current-status endpoint."
        : !appIdentityBound
          ? "Bind verified data to the configured bundle ID, numeric Apple app ID, and account token."
          : !productAllowlistWired
            ? "Reconcile only allowlisted auto-renewable CapitolWonk products."
            : "Embed the reviewed Apple root certificate set used by the verifier."
  );
}

function checkAppStorePersistenceFoundation() {
  const schema = readIfPresent("prisma/schema.prisma");
  const migration = readIfPresent("prisma/migrations/20260911110000_app_store_server_state/migration.sql");
  const state = readIfPresent("lib/billing/app-store-state.ts");
  const schemaWired =
    schema.includes("model AppStoreSubscriptionState") &&
    /observationVersion\s+BigInt\?/.test(schema) &&
    schema.includes("model AppStoreNotificationReceipt") &&
    migration.includes('CREATE SEQUENCE "AppStoreObservationSequence"') &&
    migration.includes('"observationVersion" BIGINT') &&
    migration.includes('CREATE TABLE "AppStoreSubscriptionState"') &&
    migration.includes('CREATE UNIQUE INDEX "AppStoreSubscriptionState_appAccountToken_key"') &&
    migration.includes('CREATE UNIQUE INDEX "AppStoreSubscriptionState_originalTransactionId_key"') &&
    migration.includes('CREATE UNIQUE INDEX "AppStoreNotificationReceipt_notificationUUID_key"');
  const stateWired =
    state.includes("upsertAppStoreAccountTokenBinding") &&
    state.includes("findAppStoreUserMapping") &&
    state.includes("readAppStoreSubscriptionState") &&
    state.includes("reserveAppStoreObservationVersion") &&
    state.includes("persistCanonicalAppStoreState") &&
    state.includes("insertAppStoreNotificationReceipt") &&
    state.includes("finalizeAppStoreNotificationReceipt") &&
    state.includes("TeamSubscriptionPause") &&
    state.includes("getPrisma().$transaction");
  const rawPayloadExcluded =
    !schema.includes("signedPayload") &&
    !schema.includes("signedTransactionJWS") &&
    !migration.includes("signedPayload") &&
    !migration.includes("signedTransactionJWS") &&
    !state.includes('"signedPayload"') &&
    !state.includes('"signedTransactionJWS"');

  if (schemaWired && stateWired && rawPayloadExcluded) {
    pass(
      "App Store canonical state persistence is wired",
      "Account tokens and transaction lineages are unique, writes are transactional, and receipts retain hashes instead of signed payloads."
    );
    return;
  }

  fail(
    "App Store canonical state persistence is wired",
    !schemaWired
      ? "Add the canonical subscription-state and idempotent notification-receipt migration."
      : !stateWired
        ? "Add transactional token binding, mapping, state persistence, Team pause protection, and receipt helpers."
        : "Do not store raw signed App Store payloads or transaction JWS values."
  );
}

function checkAppStoreEndpoint() {
  const route = readIfPresent("app/api/account/subscription/app-store/route.ts");
  const accountTokenRoute = readIfPresent("app/api/account/subscription/app-store/account-token/route.ts");
  const nativeBridge = readIfPresent("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerPurchaseBridge.swift");
  const storeKit = readIfPresent("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerStoreKitService.swift");
  const nativeModels = readIfPresent("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerSubscriptionModels.swift");
  const nativeSync = readIfPresent("lib/native-storekit-sync.ts");
  const nativeSyncBridge = readIfPresent("components/native-storekit-sync-bridge.tsx");
  const browserAuthState = readIfPresent("lib/browser-auth-state.ts");
  const rootLayout = readIfPresent("app/layout.tsx");
  const relink = readIfPresent("lib/billing/app-store-relink.ts");
  const accountTokenBound =
    accountTokenRoute.includes("createAppStoreAccountToken") &&
    accountTokenRoute.includes("upsertAppStoreAccountTokenBinding");
  const canonicalSync =
    route.includes("validateAppStoreTransaction") &&
    route.includes("createAppStoreAccountToken") &&
    route.includes("findAppStoreUserMapping") &&
    route.includes("readAppStoreSubscriptionState") &&
    route.includes("persistCanonicalAppStoreState") &&
    route.includes('value === "transaction-update"') &&
    route.includes('sourceAction === "transaction-update"') &&
    route.includes("appStoreTransactionDeliveryAcknowledgement({") &&
    route.includes("persistedState:") &&
    route.includes("submittedTransaction") &&
    relink.includes("appStoreTransactionDeliveryAcknowledgement") &&
    relink.includes("transactionPurchasedAt") &&
    relink.includes("transactionRevokedAt") &&
    relink.includes("input.observationApplied") &&
    relink.includes("input.persistedState?.relinkPending") &&
    relink.includes("originalTransactionId") &&
    !route.includes("App Store signed transaction is required.");
  const durableNativeDelivery =
    storeKit.includes("Transaction.updates") &&
    storeKit.includes("Transaction.unfinished") &&
    storeKit.includes("pendingTransactionUpdates") &&
    storeKit.includes("pendingTransactionPublishInProgress") &&
    storeKit.includes("pendingTransactionPublishRequested") &&
    storeKit.includes('action: "transaction-update"') &&
    storeKit.includes("await ingestUnfinishedTransactions()") &&
    storeKit.includes("guard accepted else { continue }") &&
    storeKit.includes("stillPending.signedTransactionJWS == update.signedTransactionJWS") &&
    (storeKit.match(/\.finish\(\)/g) ?? []).length === 1 &&
    storeKit.includes("await update.transaction.finish()") &&
    nativeBridge.includes("transactionUpdatePublisher") &&
    nativeBridge.includes("UIApplication.didBecomeActiveNotification") &&
    nativeBridge.includes("storeKitService.publishPendingTransactionUpdates()") &&
    nativeModels.includes('case syncPending = "sync-pending"');
  const awaitedServerBridge =
    nativeBridge.includes("webView.callAsyncJavaScript(") &&
    nativeBridge.includes('arguments: ["resultJSON": json]') &&
    nativeBridge.includes("contentWorld: .page") &&
    nativeBridge.includes("window.__capitolWonkSyncAppStoreResult") &&
    nativeBridge.includes('acknowledgement["transactionAccepted"] as? Bool == true') &&
    nativeBridge.includes("acceptedTransactionId == transactionId") &&
    nativeBridge.includes("return await accountDeletionFenceIsClear(in: webView)") &&
    !nativeBridge.includes('fetch("/api/account/subscription/app-store"') &&
    !nativeBridge.includes("evaluateJavaScript(") &&
    nativeSync.includes('sourceAction: "entitlement" | "purchase" | "restore" | "transaction-update"') &&
    !nativeSync.includes('result.action === "transaction-update" ? "entitlement"') &&
    nativeSync.includes("response.data.transactionAccepted === true") &&
    nativeSync.includes("acceptedTransactionId === result.transactionId") &&
    nativeSyncBridge.includes("window.__capitolWonkSyncAppStoreResult = sync") &&
    nativeSyncBridge.includes('fetch("/api/account/subscription/app-store"') &&
    nativeSyncBridge.includes('window.addEventListener("online", requestPendingSync)') &&
    nativeSyncBridge.includes("delete publicResult.signedTransactionJWS") &&
    rootLayout.includes("<NativeStoreKitSyncBridge />") &&
    (browserAuthState.match(/requestNativePendingStoreKitSync\(\)/g) ?? []).length >= 2;

  if (accountTokenBound && canonicalSync && durableNativeDelivery && awaitedServerBridge) {
    pass(
      "App Store account-sync endpoint is wired",
      "Canonical reconciliation acknowledges only exact or provably superseded durable transactions before StoreKit removes them from Apple's unfinished queue."
    );
    return;
  }

  fail(
    "App Store account-sync endpoint is wired",
    !accountTokenBound
      ? "Persist the authenticated account-token binding before returning it to StoreKit."
      : !canonicalSync
        ? "Reconcile transaction-update JWS data and acknowledge it only when persisted canonical state covers the submitted transaction."
        : !durableNativeDelivery
          ? "Retain verified transactions in StoreKit's unfinished queue and serialize retries until the server accepts the exact transaction."
          : "Use the awaited root page bridge, exact transaction acknowledgement, online/auth retry triggers, and post-ack deletion fence."
  );
}

function checkAppStoreNotificationEndpoint() {
  const route = readIfPresent("app/api/billing/app-store/notifications/route.ts");
  const verifiesSignedData =
    route.includes("verifyAppStoreNotification") &&
    route.includes("verifyAppStoreTransactionInEnvironment") &&
    route.includes("verifyAppStoreRenewalInfoInEnvironment") &&
    /version\s*!==\s*["']2\.0["']/.test(route);
  const reconcilesCurrentState =
    route.includes("reconcileAppStoreSubscription") &&
    route.includes("findAppStoreUserMapping") &&
    route.includes("persistCanonicalAppStoreState");
  const idempotentReceipt =
    route.includes("insertAppStoreNotificationReceipt") &&
    route.includes("finalizeAppStoreNotificationReceipt") &&
    route.includes("notificationUUID") &&
    route.includes("payloadHash");
  const boundedAndHashOnly =
    /runtime\s*=\s*["']nodejs["']/.test(route) &&
    /128\s*\*\s*1024|131072/.test(route) &&
    route.includes("Buffer.byteLength") &&
    /createHash\(["']sha256["']\)/.test(route) &&
    /\.digest\(["']hex["']\)/.test(route) &&
    !route.includes("console.");

  if (verifiesSignedData && reconcilesCurrentState && idempotentReceipt && boundedAndHashOnly) {
    pass(
      "App Store Server Notifications V2 endpoint is wired",
      "The bounded endpoint verifies outer and inner signed data, deduplicates by UUID, stores only a hash, and reconciles current status."
    );
    return;
  }

  fail(
    "App Store Server Notifications V2 endpoint is wired",
    !route
      ? "Add the POST /api/billing/app-store/notifications endpoint before configuring its App Store Connect URL."
      : !verifiesSignedData
        ? "Verify Notifications V2 outer and inner signed data and reject unsupported versions."
        : !reconcilesCurrentState
          ? "Resolve the bound account and reconcile current server status instead of trusting notification type."
          : !idempotentReceipt
            ? "Deduplicate notifications by UUID and record a terminal receipt status."
            : "Enforce a 128 KiB Node request boundary, hash the payload, and never log raw signed data."
  );
}

function checkAppStoreTestCoverage() {
  const packageManifest = readIfPresent("package.json");
  const workflow = readIfPresent(".github/workflows/ci.yml");
  const subscriptionFixtures = readIfPresent("scripts/check-app-store-subscription-fixtures.ts");
  const stateFixtures = readIfPresent("scripts/check-app-store-state-fixtures.ts");
  const qaMatrix = readIfPresent("docs/app-store-sandbox-qa-matrix-2026-09-11.md");
  const automatedCoverage =
    packageManifest.includes("check-app-store-subscription-fixtures.ts") &&
    packageManifest.includes("check-app-store-state-fixtures.ts") &&
    subscriptionFixtures.includes("Multiple simultaneously granting Apple lineages must fail closed") &&
    subscriptionFixtures.includes("reserved annual") &&
    stateFixtures.includes("oversized streamed notification") &&
    stateFixtures.includes("Notification receipts must accept only normalized SHA-256 hashes");
  const ciCoverage =
    packageManifest.includes('"release-source:check"') &&
    packageManifest.includes('"release-candidate:check"') &&
    packageManifest.includes("pnpm run audit:prod && pnpm run audit:full && BILLING_REQUIRE_APP_STORE=true TESTFLIGHT_REQUIRE_READY=true pnpm run release-source:check") &&
    workflow.includes("pnpm run audit:prod") &&
    workflow.includes("pnpm run audit:full") &&
    workflow.includes("pnpm run release-source:check");
  const executionCoverage =
    qaMatrix.includes("Purchase and identity") &&
    qaMatrix.includes("Lifecycle and current-state reconciliation") &&
    qaMatrix.includes("Notifications V2, replay, and ordering") &&
    qaMatrix.includes("Team transitions") &&
    qaMatrix.includes("Account deletion and privacy");

  if (automatedCoverage && ciCoverage && executionCoverage) {
    pass(
      "App Store lifecycle verification is release-gated",
      "Automated boundaries run in CI and the signed-device matrix covers purchase, lifecycle, replay, Team, and deletion cases."
    );
    return;
  }

  fail(
    "App Store lifecycle verification is release-gated",
    !automatedCoverage
      ? "Add automated product, state, configuration, and notification-boundary fixtures."
      : !ciCoverage
        ? "Run source-safe safeguards in CI and retain the separately configured strict candidate wrapper."
        : "Check in the signed sandbox/device matrix before T07 execution."
  );
}

function checkRetiredStripeConfig() {
  const configured = retiredStripeEnvNames.filter((name) => process.env[name]);
  if (!configured.length) {
    pass("Stripe launch config is absent", "App-only launch path is Apple in-app purchase.");
    return;
  }

  warn("Stripe launch config is present", "Keep Stripe disabled for App Store launch unless a web checkout path is deliberately reintroduced.");
}

function checkRetiredWebCheckout() {
  const route = readIfPresent("app/api/account/subscription/checkout/route.ts");
  const stripeAdapter = readIfPresent("lib/billing/stripe.ts");
  const stripeWebhook = readIfPresent("app/api/billing/stripe/webhook/route.ts");
  const stripeEventGuard = readIfPresent("lib/billing/subscription-event-guards.ts");
  const forbiddenPaths = [
    "@/lib/account-database",
    "@/lib/account-persistence-safety",
    "@/lib/account-subscription",
    "@/lib/auth",
    "@/lib/billing/stripe",
    "createStripeCheckoutSession",
    "setAccountSubscription",
    "writeSubscriptionToDatabase",
    'checkoutMode: "demo"',
    'provider: "demo"',
    'provider: "stripe"'
  ];
  const forbiddenPath = forbiddenPaths.find((value) => route.includes(value));
  const retiredMarker = route.includes('"APP_STORE_ONLY_CHECKOUT_RETIRED"');
  const retiredStatus = /status:\s*410/.test(route);

  const checkoutCreatorRemoved = !stripeAdapter.includes("/checkout/sessions") && !stripeAdapter.includes("createStripeCheckoutSession");
  const legacyWebhookQuarantined =
    stripeWebhook.includes("checkoutRetired: true") &&
    !stripeWebhook.includes("metadata.userId ??") &&
    /provider\s*!==\s*["']stripe["']\)\s*return true/.test(stripeEventGuard);

  if (retiredMarker && retiredStatus && !forbiddenPath && checkoutCreatorRemoved && legacyWebhookQuarantined) {
    pass(
      "Legacy web checkout is fail-closed",
      "POST and checkout-completion webhooks cannot create or replace an entitlement; legacy updates require matching Stripe state."
    );
    return;
  }

  fail(
    "Legacy web checkout is fail-closed",
    forbiddenPath
      ? `Remove the retired Stripe/demo checkout path: ${forbiddenPath}.`
      : !checkoutCreatorRemoved
        ? "Remove the Stripe checkout-session creator from the legacy maintenance adapter."
        : !legacyWebhookQuarantined
          ? "Ignore checkout completions and require matching legacy Stripe state before webhook persistence."
          : "Expected the stable APP_STORE_ONLY_CHECKOUT_RETIRED response with HTTP 410."
  );
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
  console.log("Checking CapitolWonk App Store billing readiness");

  checkDatabase();
  checkAppUrl();
  checkAppStoreBundleId();
  checkAppStoreCredential("APP_STORE_APP_APPLE_ID");
  checkAppStoreAccountTokenNamespace();
  checkAppStoreCredential("APP_STORE_CONNECT_ISSUER_ID");
  checkAppStoreCredential("APP_STORE_CONNECT_KEY_ID");
  checkAppStoreCredential("APP_STORE_CONNECT_PRIVATE_KEY");
  checkStoreKitProductIds();
  checkAppStoreServerFoundation();
  checkAppStorePersistenceFoundation();
  checkAppStoreEndpoint();
  checkAppStoreNotificationEndpoint();
  checkAppStoreTestCoverage();
  checkRetiredStripeConfig();
  checkRetiredWebCheckout();
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
