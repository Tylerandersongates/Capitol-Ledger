#!/usr/bin/env node

import { existsSync, readFileSync } from "fs";

loadLocalEnv();

const requireReady = process.env.TESTFLIGHT_REQUIRE_READY === "true";
const results = [];
const appDocsDir = ["Capitol", "Ledger App"].join(" ");
const appStoreSetupPacketPath = `${appDocsDir}/App Store Connect Setup Packet.md`;
const testFlightChecklistPath = `${appDocsDir}/TestFlight Readiness Checklist.md`;
const publicReleaseCandidateChecklistPath = "docs/public-testflight-release-candidate-checklist.md";
const publicTesterGuidePath = "docs/public-testflight-tester-guide.md";
const privacyCorrectionPacketPath = "docs/app-store-privacy-correction-2026-09-10.md";
const sandboxQaMatrixPath = "docs/app-store-sandbox-qa-matrix-2026-09-11.md";

const requiredFiles = [
  "ios/CapitolLedgerNative/CapitolLedgerNative.xcodeproj/project.pbxproj",
  "ios/CapitolLedgerNative/CapitolLedgerNative.xcodeproj/xcshareddata/xcschemes/CapitolLedgerNative.xcscheme",
  "ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerApp.swift",
  "ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerWebView.swift",
  "ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerPurchaseBridge.swift",
  "ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerStoreKitService.swift",
  "ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerSubscriptionModels.swift",
  "ios/CapitolLedgerNative/CapitolLedgerNative/Info.plist",
  "ios/CapitolLedgerNative/README.md",
  "lib/billing/app-store.ts",
  "lib/billing/app-store-products.ts",
  "lib/billing/app-store-server.ts",
  "lib/billing/app-store-verifier-boundary.ts",
  "lib/billing/app-store-state.ts",
  "app/api/account/subscription/app-store/route.ts",
  "app/api/account/subscription/app-store/account-token/route.ts",
  "app/api/billing/app-store/notifications/route.ts",
  "app/api/account/deletion-request/route.ts",
  "components/account-deletion-control.tsx",
  "lib/account-deletion.ts",
  "components/feedback-form.tsx",
  "instrumentation-client.ts",
  "sentry.server.config.ts",
  "sentry.edge.config.ts",
  "app/privacy/page.tsx",
  "app/support/page.tsx",
  appStoreSetupPacketPath,
  privacyCorrectionPacketPath,
  testFlightChecklistPath,
  sandboxQaMatrixPath,
  publicReleaseCandidateChecklistPath,
  publicTesterGuidePath
];

const requiredProductIds = [
  "com.capitolwonk.pro.monthly",
  "com.capitolwonk.pro.annual",
  "com.capitolwonk.team.monthly",
  "com.capitolwonk.team.annual"
];

const appStoreEnvNames = [
  "APP_STORE_BUNDLE_ID",
  "APP_STORE_APP_APPLE_ID",
  "APP_STORE_ACCOUNT_TOKEN_NAMESPACE",
  "APP_STORE_CONNECT_ISSUER_ID",
  "APP_STORE_CONNECT_KEY_ID",
  "APP_STORE_CONNECT_PRIVATE_KEY",
  "APP_STORE_SERVER_VERIFICATION_ENABLED",
  "APP_STORE_SERVER_NOTIFICATIONS_ENABLED"
];

const exactTrueAppStoreEnvNames = new Set([
  "APP_STORE_SERVER_VERIFICATION_ENABLED",
  "APP_STORE_SERVER_NOTIFICATIONS_ENABLED"
]);

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

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
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

function checkFileInventory() {
  console.log("\nNative/TestFlight files");
  for (const file of requiredFiles) {
    if (existsSync(file)) {
      pass(file);
    } else {
      fail(file, "Required before TestFlight packaging.");
    }
  }
}

function checkProductIds() {
  console.log("\nStoreKit products");
  const webControls = read("components/subscription-controls.tsx");
  const nativeModels = read("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerSubscriptionModels.swift");
  const serverProducts = read("lib/billing/app-store-products.ts");
  const teamSeats = read("lib/subscription-seat-count.ts");
  const productPlan = `${read(testFlightChecklistPath)}\n${read(appStoreSetupPacketPath)}`;

  for (const productId of requiredProductIds) {
    const teamProduct = productId.startsWith("com.capitolwonk.team.");
    const wired = teamProduct
      ? webControls.includes("getTeamAppStoreProductId") &&
        nativeModels.includes(productId) &&
        serverProducts.includes("getTeamAppStoreProducts") &&
        teamSeats.includes(productId) &&
        productPlan.includes(productId)
      : webControls.includes(productId) && nativeModels.includes(productId) && serverProducts.includes(productId) && productPlan.includes(productId);
    if (wired) {
      pass(`${productId} is wired`);
    } else {
      fail(`${productId} is wired`, "Product ID must match web, native, server validation, and App Store setup notes.");
    }
  }
}

function checkAppStoreSetupPacket() {
  console.log("\nApp Store setup packet");
  const packet = read(appStoreSetupPacketPath);
  const privacyPage = read("app/privacy/page.tsx");
  const supportPage = read("app/support/page.tsx");
  const settingsPage = read("app/settings/page.tsx");
  const accountDeletionRoute = read("app/api/account/deletion-request/route.ts");
  const accountDeletionControl = read("components/account-deletion-control.tsx");
  const accountDeletionService = read("lib/account-deletion.ts");
  const dailyBriefProOffer = read("components/daily-brief-pro-offer.tsx");
  const privacyCorrection = read(privacyCorrectionPacketPath);
  const sandboxQaMatrix = read(sandboxQaMatrixPath);
  const upgradePage = read("app/upgrade/page.tsx");

  const requiredPacketPhrases = [
    "App Store Connect Setup Packet",
    "CapitolWonk",
    "com.capitolwonk.ce",
    "capitolwonk-ce-ios-v1",
    "com.capitolwonk.pro.monthly",
    "com.capitolwonk.pro.annual",
    "com.capitolwonk.team.monthly",
    "com.capitolwonk.team.annual",
    "com.capitolwonk.team.{seatCount}.{cycle}",
    "eligible new subscribers",
    "Apple confirms eligibility",
    "7 days free",
    "$4.99/month",
    "$39.99",
    "$17.99",
    "$179.99",
    "Support URL",
    "Privacy Policy URL",
    "App Review Notes",
    "Screenshot Candidates",
    "BILLING_REQUIRE_APP_STORE=true pnpm billing:check"
  ];

  for (const phrase of requiredPacketPhrases) {
    if (packet.includes(phrase)) {
      pass(`Setup packet includes ${phrase}`);
    } else {
      fail(`Setup packet includes ${phrase}`, "Required before App Store Connect handoff.");
    }
  }

  const subscriptionPlans = read("lib/subscription-plans.ts");
  const subscriptionControls = read("components/subscription-controls.tsx");
  const seatConfiguration = read("lib/subscription-seat-count.ts");
  const nativeModels = read("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerSubscriptionModels.swift");
  const serverProducts = read("lib/billing/app-store-products.ts");
  const pricingAligned =
    subscriptionPlans.includes('monthly: "$4.99"') &&
    subscriptionPlans.includes('annual: "$39.99"') &&
    subscriptionPlans.includes('monthly: "$5.99"') &&
    subscriptionPlans.includes('annual: "$59.99"') &&
    subscriptionControls.includes("TeamSeatSelector") &&
    subscriptionControls.includes("getTeamAppStoreProductId") &&
    seatConfiguration.includes("maximumTeamSeatCount = 20") &&
    seatConfiguration.includes("maximumAnnualTeamSeatCount = 16") &&
    seatConfiguration.includes("getTeamAppStoreProducts") &&
    nativeModels.includes("maximumTeamSeatCount = 20") &&
    nativeModels.includes("maximumAnnualTeamSeatCount = 16") &&
    nativeModels.includes("teamProductId") &&
    serverProducts.includes("getTeamAppStoreProducts");

  if (pricingAligned) {
    pass("Pro and supported Team seat prices are aligned");
  } else {
    fail("Pro and supported Team seat prices are aligned", "Expected $4.99/$39.99 Pro plus monthly 3-20 and annual 3-16 Team products using $5.99/$59.99 per-seat economics.");
  }

  const truthfulIntroductoryOfferCopy =
    subscriptionPlans.includes('ctaLabel: "Continue with Apple"') &&
    subscriptionPlans.includes("Eligible new subscribers may receive 7 days free, then $4.99/month.") &&
    subscriptionControls.includes("Apple will confirm ${trial.label} eligibility and show the exact terms") &&
    upgradePage.includes("Eligible new monthly Pro subscribers may receive 7 days free, then $4.99/month") &&
    supportPage.includes("Apple confirms eligibility and shows exact terms before purchase") &&
    dailyBriefProOffer.includes('selectedDisclosure="Eligible new subscribers may receive 7 days free, then $4.99/month."') &&
    dailyBriefProOffer.includes("Apple confirms introductory-offer eligibility and shows exact terms before purchase") &&
    !`${subscriptionPlans}\n${subscriptionControls}\n${upgradePage}\n${supportPage}`.includes("Start 7-day free trial") &&
    !`${upgradePage}\n${supportPage}`.includes("Monthly Pro starts with 7 days free");

  if (truthfulIntroductoryOfferCopy) {
    pass("Introductory-offer copy is conditional on Apple eligibility and exact purchase terms");
  } else {
    fail("Introductory-offer copy is conditional on Apple eligibility and exact purchase terms", "Eligible and ineligible subscribers must not see an unconditional seven-day trial promise.");
  }

  const requiredSandboxOfferEvidence = [
    "App Store Connect product-configuration screenshot",
    "Eligible new subscriber",
    "Ineligible or previously subscribed",
    "7 days free",
    "$4.99/month",
    "Cancel during introductory offer",
    "Conversion to standard monthly renewal",
    "Offer expires without conversion",
    "Notifications V2",
    "canonical server state"
  ];

  if (requiredSandboxOfferEvidence.every((phrase) => sandboxQaMatrix.includes(phrase))) {
    pass("Sandbox matrix covers introductory-offer eligibility, exact terms, lifecycle, notifications, and server state");
  } else {
    fail("Sandbox matrix covers introductory-offer eligibility, exact terms, lifecycle, notifications, and server state", "Add eligible/ineligible offer proof, exact 7-day/$4.99 terms, conversion/cancel/expiry cases, notification evidence, and canonical-state evidence.");
  }

  if (
    privacyPage.includes("publicBrand.privacyTitle") &&
    privacyPage.includes("Apple purchases") &&
    privacyPage.includes("account deletion") &&
    accountDeletionRoute.includes('body.confirmation !== "DELETE"') &&
    accountDeletionRoute.includes("deleteAccountAndAssociatedData") &&
    accountDeletionRoute.includes("clearAuthCookies(response)") &&
    accountDeletionService.includes("client.$transaction") &&
    accountDeletionService.includes('DELETE FROM "User"') &&
    accountDeletionService.includes("assertAccountRowsDeleted") &&
    accountDeletionControl.includes("Permanently delete account") &&
    accountDeletionControl.includes("Deleting CapitolWonk does not cancel an Apple subscription") &&
    supportPage.includes("publicBrand.supportTitle") &&
    supportPage.includes("Privacy requests") &&
    settingsPage.includes('href: "/privacy"') &&
    settingsPage.includes('href: "/support"')
  ) {
    pass("Support, privacy, and in-app account deletion are linked for App Store setup");
  } else {
    fail("Support, privacy, and in-app account deletion are linked for App Store setup", "Expected /privacy, /support, and a confirmed deletion-request entry point in Settings.");
  }

  const correctionPhrases = [
    "Provisional Answer Matrix",
    "Emails or Text Messages",
    "Device ID",
    "Crash Data",
    "Performance Data",
    "Other Diagnostic Data",
    "exact Release archive",
    "App Store Connect questionnaire: unchanged"
  ];
  if (correctionPhrases.every((phrase) => privacyCorrection.includes(phrase)) && packet.includes(privacyCorrectionPacketPath)) {
    pass("Provisional App Privacy correction is documented and linked from the setup packet");
  } else {
    fail("Provisional App Privacy correction is documented and linked from the setup packet", "Expected proposed additions, open verification gates, and an unchanged-remote-state record.");
  }
}

function checkNativeBridge() {
  console.log("\nNative purchase bridge");
  const webControls = read("components/subscription-controls.tsx");
  const webView = read("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerWebView.swift");
  const purchaseBridge = read("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerPurchaseBridge.swift");
  const storeKit = read("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerStoreKitService.swift");
  const nativeSync = read("lib/native-storekit-sync.ts");
  const pageBridge = read("components/native-storekit-sync-bridge.tsx");
  const validator = read("lib/billing/app-store.ts");

  if (
    webControls.includes("capitolLedgerPurchase") &&
    webView.includes('name: "capitolLedgerPurchase"') &&
    webView.includes("decidePolicyFor navigationAction") &&
    webView.includes("guard !trustedOrigin.matches(url)") &&
    pageBridge.includes('fetch("/api/account/subscription/app-store"') &&
    pageBridge.includes("window.__capitolWonkSyncAppStoreResult = sync") &&
    nativeSync.includes("const sourceAction = result.action") &&
    purchaseBridge.includes("message.frameInfo.isMainFrame") &&
    purchaseBridge.includes("trustedOrigin.matches(message.frameInfo.securityOrigin)") &&
    purchaseBridge.includes("callAsyncJavaScript") &&
    purchaseBridge.includes("acceptedTransactionId == transactionId") &&
    storeKit.includes("let appAccountToken = UUID(uuidString: token)") &&
    storeKit.includes("product.purchase(options: [.appAccountToken(appAccountToken)])") &&
    storeKit.includes("Transaction.unfinished") &&
    storeKit.includes("stillPending.signedTransactionJWS == update.signedTransactionJWS") &&
    (storeKit.match(/\.finish\(\)/g) ?? []).length === 1 &&
    !storeKit.includes("return []") &&
    validator.includes("expectedAppAccountToken")
  ) {
    pass("StoreKit bridge and account binding are wired");
  } else {
    fail("StoreKit bridge and account binding are wired", "Native purchase, signed transaction sync, and appAccountToken binding must all be present.");
  }
}

function checkEnvironment() {
  console.log("\nApp Store environment");
  for (const envName of appStoreEnvNames) {
    const exactTrue = exactTrueAppStoreEnvNames.has(envName);
    const configured = exactTrue
      ? process.env[envName] === "true"
      : Boolean(process.env[envName]?.trim());
    const label = `${envName} is ${exactTrue ? "enabled" : "configured"}`;
    if (configured) {
      pass(label);
    } else if (requireReady) {
      fail(label, "Required before sandbox/TestFlight account-sync QA; activation switches require the exact value true.");
    } else {
      warn(label, "Needed before sandbox/TestFlight account-sync QA.");
    }
  }
}

function checkTextToneGate() {
  console.log("\nFinal text-tone gate");
  const checklist = read(testFlightChecklistPath);
  const hasGate =
    checklist.includes("Final Text Tone Pass") &&
    checklist.includes("/sign-in") &&
    checklist.includes("/settings") &&
    checklist.includes("/upgrade") &&
    checklist.includes("/feedback") &&
    checklist.includes("empty states") &&
    checklist.includes("error states");

  if (hasGate) {
    pass("Final text-tone pass is tracked");
  } else {
    fail("Final text-tone pass is tracked", "Checklist should name the final launch-facing tone areas before TestFlight.");
  }
}

function checkPublicReleaseCandidateChecklist() {
  console.log("\nPublic TestFlight release candidate");
  const checklist = read(publicReleaseCandidateChecklistPath);
  const requiredSections = [
    "Completed Evidence",
    "Beta Blockers",
    "Protected Configuration And Device QA",
    "Build-Upload Approval",
    "Tester-Distribution Approval",
    "Hard Stop Before Review",
    "TestFlight Beta App Review",
    "App Review"
  ];

  for (const section of requiredSections) {
    if (checklist.includes(section)) {
      pass(`Public release-candidate checklist includes ${section}`);
    } else {
      fail(`Public release-candidate checklist includes ${section}`, "Required before external/public TestFlight preparation.");
    }
  }
}

function checkPublicTesterGuide() {
  console.log("\nPublic TestFlight tester guide");
  const guide = read(publicTesterGuidePath);
  const checklist = read(publicReleaseCandidateChecklistPath);
  const requiredPhrases = [
    "Before You Start",
    "Core Test Pass",
    "Officials, Bills, and Votes",
    "Daily Brief and Alerts",
    "Actions, Impact, and Badges",
    "Privacy and Support",
    "Permanently delete account",
    "Force-close",
    "Subscriptions: Assigned Scenarios Only",
    "Send Beta Feedback",
    "`/feedback`",
    "Severity",
    "Stop Testing and Report Immediately",
    "real charge",
    "unexpected credential request",
    "privacy exposure",
    "repeated crash",
    "lost paid entitlement",
    "data corruption"
  ];

  for (const phrase of requiredPhrases) {
    if (guide.includes(phrase)) {
      pass(`Public tester guide includes ${phrase}`);
    } else {
      fail(`Public tester guide includes ${phrase}`, "Required before external/public TestFlight distribution.");
    }
  }

  const retiredPhrases = ["Stripe", "web checkout", "feedback queue", "App Review preparation"];
  for (const phrase of retiredPhrases) {
    if (guide.toLowerCase().includes(phrase.toLowerCase())) {
      fail(`Public tester guide excludes ${phrase}`, "Retired or private operator material must not be distributed to testers.");
    } else {
      pass(`Public tester guide excludes ${phrase}`);
    }
  }

  if (checklist.includes(publicTesterGuidePath) && checklist.includes("[x] Prepare and verify the sanitized external TestFlight tester guide")) {
    pass("Public release-candidate checklist marks the sanitized tester guide complete");
  } else {
    fail("Public release-candidate checklist marks the sanitized tester guide complete");
  }
}

function checkCommandPlan() {
  console.log("\nVerification plan");
  const packageJson = read("package.json");
  const hasScript = packageJson.includes('"testflight:check"') && packageJson.includes("check-testflight-readiness.mjs");
  if (hasScript) {
    pass("pnpm testflight:check is registered");
  } else {
    fail("pnpm testflight:check is registered");
  }

  const checklist = read(testFlightChecklistPath);
  for (const command of ["pnpm launch-copy:check", "pnpm ios-native:check", "pnpm billing:check", "pnpm feedback:check", "pnpm lint", "pnpm exec tsc --noEmit --pretty false"]) {
    if (checklist.includes(command)) {
      pass(`${command} is in the TestFlight verification plan`);
    } else {
      fail(`${command} is in the TestFlight verification plan`);
    }
  }
}

function main() {
  console.log("Checking TestFlight readiness");

  checkFileInventory();
  checkProductIds();
  checkNativeBridge();
  checkEnvironment();
  checkAppStoreSetupPacket();
  checkTextToneGate();
  checkPublicReleaseCandidateChecklist();
  checkPublicTesterGuide();
  checkCommandPlan();

  const failures = results.filter((result) => result.kind === "error" && !result.ok);
  if (failures.length) {
    console.error(`TestFlight readiness has ${failures.length} blocking issue(s).`);
    process.exit(1);
  }

  if (!requireReady) {
    console.log("TestFlight readiness check passed for local prep mode. Use TESTFLIGHT_REQUIRE_READY=true after App Store Connect/env setup.");
    return;
  }

  console.log("TestFlight readiness check passed for upload prep.");
}

main();
