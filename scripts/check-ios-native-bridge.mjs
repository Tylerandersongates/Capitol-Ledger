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
const appStoreProducts = read("lib/billing/app-store-products.ts");
const appStoreServer = read("lib/billing/app-store-server.ts");
const appStoreState = read("lib/billing/app-store-state.ts");
const appStoreRelink = read("lib/billing/app-store-relink.ts");
const nativeStoreKitSync = read("lib/native-storekit-sync.ts");
const nativeStoreKitSyncBridge = read("components/native-storekit-sync-bridge.tsx");
const browserAuthState = read("lib/browser-auth-state.ts");
const rootLayout = read("app/layout.tsx");
const teamSeats = read("lib/subscription-seat-count.ts");
const appStoreRoute = read("app/api/account/subscription/app-store/route.ts");
const appStoreAccountTokenRoute = read("app/api/account/subscription/app-store/account-token/route.ts");
const teamInviteBilling = read("lib/team-invite-billing.ts");
const teamInviteControls = read("components/team-invite-acceptance-controls.tsx");
const alertsInbox = read("components/alerts-inbox-client.tsx");
const purchaseHandler = storeKit.slice(
  storeKit.indexOf("func purchase("),
  storeKit.indexOf("func restore()")
);
const transactionUpdateHandler = storeKit.slice(
  storeKit.indexOf("private func handleTransactionUpdate"),
  storeKit.indexOf("func publishPendingTransactionUpdates")
);
const pendingPublisher = storeKit.slice(
  storeKit.indexOf("func publishPendingTransactionUpdates"),
  storeKit.indexOf("private func ingestUnfinishedTransactions")
);
const nativeTransactionFinishCalls = storeKit.match(/\.finish\(\)/g) ?? [];

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
  bridge.indexOf("message.frameInfo.isMainFrame") < bridge.indexOf("decodePurchaseMessage(message.body)") &&
    bridge.includes("trustedOrigin.matches(message.frameInfo.securityOrigin)") &&
    bridge.includes("trustedOrigin.matches(pageURL)") &&
    webView.includes("CapitolLedgerTrustedOrigin") &&
    webView.includes("decidePolicyFor navigationAction") &&
    webView.includes("guard !trustedOrigin.matches(url)") &&
    webView.includes("decisionHandler(.cancel)"),
  "only the CapitolWonk main-frame origin may invoke StoreKit, and external main-frame navigation must leave the WebView"
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
  teamInviteBilling.includes("capitolLedgerPurchase") &&
    teamInviteBilling.includes('postMessage({ action: "manage" })') &&
    teamInviteBilling.includes("window.location.assign(appleSubscriptionManagementUrl)") &&
    teamInviteControls.includes("onClick={openAppleSubscriptionManagement}") &&
    alertsInbox.includes("onClick={openAppleSubscriptionManagement}") &&
    !teamInviteControls.includes('target="_blank"') &&
    !alertsInbox.includes('target="_blank"'),
  "Team invite Apple-subscription management should use the native manage bridge with a same-window web fallback"
);

assert.ok(
  webControls.includes("getTeamAppStoreProductId") &&
    webControls.includes("seatCount: teamSeatCount") &&
    models.includes("maximumTeamSeatCount = 20") &&
    models.includes("maximumAnnualTeamSeatCount = 16") &&
    models.includes("teamProductId") &&
    models.includes("let seatCount: Int?") &&
    storeKit.includes("selectedTeamSeatCount") &&
    appStoreProducts.includes("getTeamAppStoreProducts"),
  "Team purchases should map supported monthly 3-20 and annual 3-16 seat counts to matching web, native, and server product entitlements"
);

assert.ok(
  storeKit.includes("Product.products") &&
    storeKit.includes("product.purchase(options:") &&
    storeKit.includes("AppStore.sync()") &&
    storeKit.includes("Transaction.currentEntitlements") &&
    storeKit.includes("Transaction.all") &&
    storeKit.includes("latestSupportedPurchaseHistory") &&
    storeKit.includes("transaction.ownershipType == .purchased") &&
    storeKit.includes("Transaction.updates") &&
    storeKit.includes("Transaction.unfinished") &&
    storeKit.includes("pendingTransactionUpdates") &&
    storeKit.includes("pendingTransactionPublishInProgress") &&
    storeKit.includes("pendingTransactionPublishRequested") &&
    purchaseHandler.includes("enqueueTransaction(") &&
    purchaseHandler.includes("verification.jwsRepresentation") &&
    !purchaseHandler.includes(".finish()") &&
    transactionUpdateHandler.includes("signedTransactionJWS: update.jwsRepresentation") &&
    transactionUpdateHandler.includes('action: "transaction-update"') &&
    !transactionUpdateHandler.includes(".finish()") &&
    pendingPublisher.includes("await ingestUnfinishedTransactions()") &&
    pendingPublisher.includes("let accepted = await transactionUpdatePublisher") &&
    pendingPublisher.includes("stillPending.signedTransactionJWS == update.signedTransactionJWS") &&
    pendingPublisher.indexOf("guard accepted else { continue }") < pendingPublisher.indexOf("await update.transaction.finish()") &&
    pendingPublisher.indexOf("await update.transaction.finish()") < pendingPublisher.indexOf("pendingTransactionUpdates.removeValue") &&
    nativeTransactionFinishCalls.length === 1 &&
    bridge.includes("transactionUpdatePublisher") &&
    bridge.includes("UIApplication.didBecomeActiveNotification") &&
    bridge.includes("storeKitService.publishPendingTransactionUpdates()") &&
    models.includes('case syncPending = "sync-pending"') &&
    bridge.includes("case .syncPending:") &&
    routeAcceptsTransactionUpdates(appStoreRoute),
  "StoreKit unfinished transactions should be queued, serialized through server reconciliation, and finished only after acceptance"
);

assert.ok(
  nativeStoreKitSyncBridge.includes('"capitol-ledger:subscription-changed"') &&
    nativeStoreKitSyncBridge.includes('"capitol-ledger:native-purchase-result"') &&
    nativeStoreKitSyncBridge.includes('"capitol-ledger:subscription"') &&
    webControls.includes('nativePurchaseResultEvent = "capitol-ledger:native-purchase-result"') &&
    webControls.includes("handleNativePurchaseResult") &&
    webControls.includes("handleNativeRestoreResult") &&
    nativeStoreKitSyncBridge.includes('fetch("/api/account/subscription/app-store"') &&
    nativeStoreKitSyncBridge.includes("window.__capitolWonkSyncAppStoreResult = sync") &&
    nativeStoreKitSyncBridge.includes('window.addEventListener("online", requestPendingSync)') &&
    nativeStoreKitSyncBridge.includes("delete publicResult.signedTransactionJWS") &&
    rootLayout.includes("<NativeStoreKitSyncBridge />") &&
    browserAuthState.match(/requestNativePendingStoreKitSync\(\)/g)?.length >= 2 &&
    webControls.includes("appStoreAccountTokenEndpoint") &&
    webControls.includes("appAccountToken") &&
    models.includes("appAccountToken") &&
    storeKit.includes("let token = message.appAccountToken") &&
    storeKit.includes("let appAccountToken = UUID(uuidString: token)") &&
    storeKit.includes("product.purchase(options: [.appAccountToken(appAccountToken)])") &&
    !storeKit.includes("return []") &&
    nativeStoreKitSync.includes("signedTransactionJWS") &&
    storeKit.includes("jwsRepresentation") &&
    nativeStoreKitSync.includes('(result.action === "purchase" || result.action === "transaction-update") && !result.signedTransactionJWS') &&
    nativeStoreKitSync.includes('sourceAction: "entitlement" | "purchase" | "restore" | "transaction-update"') &&
    !nativeStoreKitSync.includes('result.action === "transaction-update" ? "entitlement"') &&
    models.includes("let pendingApproval: Bool?") &&
    storeKit.includes("pendingApproval: true") &&
    webControls.includes('result.action !== "transaction-update"') &&
    nativeStoreKitSync.includes("response.data.operationSucceeded === true") &&
    nativeStoreKitSync.includes('response.data.syncOutcome === "linked-inactive"') &&
    nativeStoreKitSync.includes("response.data.transactionAccepted === true") &&
    nativeStoreKitSync.includes("acceptedTransactionId === result.transactionId") &&
    bridge.includes("webView.callAsyncJavaScript(") &&
    bridge.includes('arguments: ["resultJSON": json]') &&
    bridge.includes("contentWorld: .page") &&
    bridge.includes("window.__capitolWonkSyncAppStoreResult") &&
    bridge.includes('acknowledgement["transactionAccepted"] as? Bool == true') &&
    bridge.includes("acceptedTransactionId == transactionId") &&
    !bridge.includes('fetch("/api/account/subscription/app-store"') &&
    !bridge.includes("evaluateJavaScript("),
  "the awaited page bridge should perform authenticated server sync and return an exact transaction acknowledgement"
);

assert.ok(
  webView.includes("__capitolLedgerAccountDeletionFenceKey") &&
    webView.includes("capitolwonk:account-deletion-fence") &&
    nativeStoreKitSync.includes("if (dependencies.accountDeletionFenceActive()) return rejectedDelivery") &&
    nativeStoreKitSync.match(/dependencies\.accountDeletionFenceActive\(\)/g)?.length >= 3 &&
    nativeStoreKitSyncBridge.includes("accountDeletionFenceActive: isBrowserAccountDeletionFenced") &&
    bridge.includes("return await accountDeletionFenceIsClear(in: webView)") &&
    bridge.indexOf("acceptedTransactionId == transactionId") < bridge.indexOf("return await accountDeletionFenceIsClear(in: webView)"),
  "server delivery should be fenced before and after publication, including a native post-ack deletion-fence check"
);

assert.ok(
    appStoreRoute.includes("validateAppStoreTransaction") &&
    appStoreRoute.includes("createAppStoreAccountToken") &&
    appStoreRoute.includes("findAppStoreUserMapping") &&
    appStoreRoute.includes("persistCanonicalAppStoreState") &&
    appStoreRoute.includes("readAppStoreSubscriptionState") &&
    appStoreRoute.includes("getEffectiveSubscriptionForAccountUser") &&
    appStoreRoute.includes("appStoreSyncResponsePayload") &&
    appStoreRoute.includes("appStoreTransactionDeliveryAcknowledgement") &&
    appStoreRelink.includes("appStoreTransactionDeliveryAcknowledgement") &&
    appStoreRelink.includes("persistedState") &&
    appStoreRelink.includes("submittedTransaction") &&
    appStoreRelink.includes("transactionPurchasedAt") &&
    appStoreRelink.includes("transactionRevokedAt") &&
    appStoreRelink.includes("input.observationApplied") &&
    appStoreRelink.includes("input.persistedState?.relinkPending") &&
    appStoreRelink.includes("originalTransactionId") &&
    appStoreRoute.includes("publicBrandName") &&
    !appStoreRoute.includes("writeSubscriptionToDatabase") &&
    appStoreAccountTokenRoute.includes("createAppStoreAccountToken") &&
    appStoreAccountTokenRoute.includes("upsertAppStoreAccountTokenBinding") &&
    appStoreValidator.includes("expectedAppAccountToken") &&
    appStoreValidator.includes("APP_STORE_ACCOUNT_TOKEN_NAMESPACE") &&
    appStoreServer.includes("SignedDataVerifier") &&
    appStoreServer.includes("AppStoreServerAPIClient") &&
    appStoreServer.includes("getAllSubscriptionStatuses") &&
    appStoreServer.includes("APP_STORE_CONNECT_ISSUER_ID") &&
    appStoreServer.includes("APP_STORE_CONNECT_KEY_ID") &&
    appStoreServer.includes("APP_STORE_CONNECT_PRIVATE_KEY") &&
    appStoreServer.includes("APP_STORE_BUNDLE_ID") &&
    appStoreServer.includes("APP_STORE_APP_APPLE_ID") &&
    appStoreState.includes("appAccountToken") &&
    appStoreState.includes("transactionRevokedAt") &&
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

function routeAcceptsTransactionUpdates(route) {
  return route.includes('value === "transaction-update"') &&
    route.includes('sourceAction === "transaction-update"') &&
    route.includes("!signedTransactionJWS") &&
    route.includes("appStoreTransactionDeliveryAcknowledgement({") &&
    route.includes("canonicalTransaction:") &&
    route.includes("observationApplied:") &&
    route.includes("persistedState:") &&
    route.includes("submittedTransaction");
}
