#!/usr/bin/env node

import { existsSync, readFileSync } from "fs";

loadLocalEnv();

const requireReady = process.env.TESTFLIGHT_REQUIRE_READY === "true";
const results = [];

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
  "app/api/account/subscription/app-store/route.ts",
  "app/api/account/subscription/app-store/account-token/route.ts",
  "app/privacy/page.tsx",
  "app/support/page.tsx",
  "Capitol Ledger App/App Store Connect Setup Packet.md",
  "Capitol Ledger App/TestFlight Readiness Checklist.md"
];

const requiredProductIds = [
  "com.capitolledger.pro.monthly",
  "com.capitolledger.pro.annual"
];

const appStoreEnvNames = [
  "APP_STORE_BUNDLE_ID",
  "APP_STORE_ACCOUNT_TOKEN_NAMESPACE",
  "APP_STORE_CONNECT_ISSUER_ID",
  "APP_STORE_CONNECT_KEY_ID",
  "APP_STORE_CONNECT_PRIVATE_KEY"
];

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
  const serverValidator = read("lib/billing/app-store.ts");
  const productPlan = `${read("Capitol Ledger App/TestFlight Readiness Checklist.md")}\n${read("Capitol Ledger App/App Store Connect Setup Packet.md")}`;

  for (const productId of requiredProductIds) {
    const wired = webControls.includes(productId) && nativeModels.includes(productId) && serverValidator.includes(productId) && productPlan.includes(productId);
    if (wired) {
      pass(`${productId} is wired`);
    } else {
      fail(`${productId} is wired`, "Product ID must match web, native, server validation, and App Store setup notes.");
    }
  }
}

function checkAppStoreSetupPacket() {
  console.log("\nApp Store setup packet");
  const packet = read("Capitol Ledger App/App Store Connect Setup Packet.md");
  const privacyPage = read("app/privacy/page.tsx");
  const supportPage = read("app/support/page.tsx");
  const settingsPage = read("app/settings/page.tsx");

  const requiredPacketPhrases = [
    "App Store Connect Setup Packet",
    "Capitol Ledger CE",
    "com.capitolledger.app",
    "com.capitolledger.pro.monthly",
    "com.capitolledger.pro.annual",
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

  if (
    privacyPage.includes("Privacy Policy") &&
    privacyPage.includes("Apple purchases") &&
    privacyPage.includes("account deletion") &&
    supportPage.includes("Support") &&
    supportPage.includes("Privacy requests") &&
    settingsPage.includes('href: "/privacy"') &&
    settingsPage.includes('href: "/support"')
  ) {
    pass("Support and privacy pages are linked for App Store setup");
  } else {
    fail("Support and privacy pages are linked for App Store setup", "Expected /privacy, /support, and Settings entry points.");
  }
}

function checkNativeBridge() {
  console.log("\nNative purchase bridge");
  const webControls = read("components/subscription-controls.tsx");
  const webView = read("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerWebView.swift");
  const purchaseBridge = read("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerPurchaseBridge.swift");
  const storeKit = read("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerStoreKitService.swift");
  const validator = read("lib/billing/app-store.ts");

  if (
    webControls.includes("capitolLedgerPurchase") &&
    webView.includes('name: "capitolLedgerPurchase"') &&
    purchaseBridge.includes('fetch("/api/account/subscription/app-store"') &&
    storeKit.includes(".appAccountToken(uuid)") &&
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
    const configured = Boolean(process.env[envName]?.trim());
    if (configured) {
      pass(`${envName} is configured`);
    } else if (requireReady) {
      fail(`${envName} is configured`, "Required before sandbox/TestFlight account-sync QA.");
    } else {
      warn(`${envName} is configured`, "Needed before sandbox/TestFlight account-sync QA.");
    }
  }
}

function checkTextToneGate() {
  console.log("\nFinal text-tone gate");
  const checklist = read("Capitol Ledger App/TestFlight Readiness Checklist.md");
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

function checkCommandPlan() {
  console.log("\nVerification plan");
  const packageJson = read("package.json");
  const hasScript = packageJson.includes('"testflight:check"') && packageJson.includes("check-testflight-readiness.mjs");
  if (hasScript) {
    pass("pnpm testflight:check is registered");
  } else {
    fail("pnpm testflight:check is registered");
  }

  const checklist = read("Capitol Ledger App/TestFlight Readiness Checklist.md");
  for (const command of ["pnpm launch-copy:check", "pnpm ios-native:check", "pnpm billing:check", "pnpm lint", "pnpm exec tsc --noEmit --pretty false"]) {
    if (checklist.includes(command)) {
      pass(`${command} is in the TestFlight verification plan`);
    } else {
      fail(`${command} is in the TestFlight verification plan`);
    }
  }
}

function main() {
  console.log("Checking Capitol Ledger CE TestFlight readiness");

  checkFileInventory();
  checkProductIds();
  checkNativeBridge();
  checkEnvironment();
  checkAppStoreSetupPacket();
  checkTextToneGate();
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
