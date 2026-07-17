#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const webControls = read("components/subscription-controls.tsx");
const app = read("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerApp.swift");
const webView = read("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerWebView.swift");
const bridge = read("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerPurchaseBridge.swift");
const storeKit = read("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerStoreKitService.swift");
const models = read("ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerSubscriptionModels.swift");
const plist = read("ios/CapitolLedgerNative/CapitolLedgerNative/Info.plist");
const project = read("ios/CapitolLedgerNative/CapitolLedgerNative.xcodeproj/project.pbxproj");
const appStoreValidator = read("lib/billing/app-store.ts");
const teamSeats = read("lib/subscription-seat-count.ts");
const appStoreRoute = read("app/api/account/subscription/app-store/route.ts");
const appStoreAccountTokenRoute = read("app/api/account/subscription/app-store/account-token/route.ts");

for (const productId of [
  "com.capitolwonk.pro.monthly",
  "com.capitolwonk.pro.annual",
  "com.capitolwonk.team.monthly",
  "com.capitolwonk.team.annual"
]) {
  assert.ok(
    productId.startsWith("com.capitolwonk.team.") ? webControls.includes("getTeamAppStoreProductId") && teamSeats.includes(productId) : webControls.includes(productId),
    `web controls should reference ${productId}`
  );
  assert.ok(models.includes(productId), `native models should reference ${productId}`);
}

assert.ok(
  webControls.includes("capitolLedgerPurchase") &&
    webControls.includes("__capitolLedgerNativeStoreKit") &&
    webView.includes('name: "capitolLedgerPurchase"') &&
    webView.includes("__capitolLedgerNativeStoreKit") &&
    bridge.includes("WKScriptMessageHandler"),
  "native WebView should register the same purchase bridge name used by the web paywall"
);

assert.ok(
  models.includes("case purchase") &&
    models.includes("case restore") &&
    models.includes("case manage") &&
    bridge.includes("storeKitService.purchase") &&
    bridge.includes("storeKitService.restore") &&
    bridge.includes("openSubscriptionManagement"),
  "native bridge should handle purchase, restore, and manage actions"
);

assert.ok(
  webControls.includes("getTeamAppStoreProductId") &&
    webControls.includes("seatCount: teamSeatCount") &&
    models.includes("maximumTeamSeatCount = 20") &&
    models.includes("maximumAnnualTeamSeatCount = 16") &&
    models.includes("teamProductId") &&
    models.includes("let seatCount: Int?") &&
    storeKit.includes("selectedTeamSeatCount") &&
    appStoreValidator.includes("getTeamAppStoreProducts"),
  "Team purchases should map supported monthly 3-20 and annual 3-16 seat counts to matching web, native, and server product entitlements"
);

assert.ok(
  storeKit.includes("Product.products") &&
    storeKit.includes("product.purchase(options:") &&
    storeKit.includes("AppStore.sync()") &&
    storeKit.includes("Transaction.currentEntitlements") &&
    storeKit.includes("Transaction.updates"),
  "native StoreKit service should load products, purchase, restore, and monitor entitlement changes"
);

assert.ok(
  bridge.includes("capitol-ledger:subscription") &&
    bridge.includes("capitol-ledger:subscription-changed") &&
    bridge.includes("capitol-ledger:native-purchase-result") &&
    webControls.includes('nativePurchaseResultEvent = "capitol-ledger:native-purchase-result"') &&
    webControls.includes("handleNativePurchaseResult") &&
    webControls.includes("handleNativeRestoreResult") &&
    bridge.includes('fetch("/api/account/subscription/app-store"') &&
    webControls.includes("appStoreAccountTokenEndpoint") &&
    webControls.includes("appAccountToken") &&
    models.includes("appAccountToken") &&
    storeKit.includes(".appAccountToken(uuid)") &&
    bridge.includes("signedTransactionJWS") &&
    storeKit.includes("jwsRepresentation"),
  "native bridge should publish StoreKit results back into the WebView subscription state"
);

assert.ok(
    appStoreRoute.includes("validateAppStoreTransaction") &&
    appStoreRoute.includes("createAppStoreAccountToken") &&
    appStoreRoute.includes("findSubscriptionUserIdByProvider") &&
    appStoreRoute.includes("already linked to another ${publicBrandName} account") &&
    appStoreRoute.includes("publicBrandName") &&
    appStoreRoute.includes("writeSubscriptionToDatabase") &&
    appStoreAccountTokenRoute.includes("createAppStoreAccountToken") &&
    appStoreValidator.includes("expectedAppAccountToken") &&
    appStoreValidator.includes("APP_STORE_ACCOUNT_TOKEN_NAMESPACE") &&
    appStoreValidator.includes("inApps/v1/transactions") &&
    appStoreValidator.includes("APP_STORE_CONNECT_ISSUER_ID") &&
    appStoreValidator.includes("APP_STORE_CONNECT_KEY_ID") &&
    appStoreValidator.includes("APP_STORE_CONNECT_PRIVATE_KEY") &&
    appStoreValidator.includes("APP_STORE_BUNDLE_ID") &&
    appStoreValidator.includes("product.purchase()") === false,
  "server endpoint should validate App Store transactions with App Store Server API before writing account subscriptions"
);

assert.ok(
  app.includes("CapitolLedgerWebView") &&
    plist.includes("CapitolLedgerAppURL") &&
    plist.includes("$(APP_DISPLAY_NAME)") &&
    project.includes("APP_DISPLAY_NAME") &&
    project.includes("CapitolLedgerNative.app"),
  "native app target should load the configured WebView URL and build display name"
);

console.log("iOS native StoreKit bridge check passed.");
