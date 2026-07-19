#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function shouldIgnoreStaleStripeSubscriptionEvent(currentSubscription, eventSubscriptionId) {
  if (currentSubscription?.provider !== "stripe") return false;
  if (!currentSubscription.providerSubscriptionId?.startsWith("sub_") || !eventSubscriptionId?.startsWith("sub_")) return false;

  return currentSubscription.providerSubscriptionId !== eventSubscriptionId;
}

const currentPro = {
  plan: "pro",
  provider: "stripe",
  providerSubscriptionId: "sub_current",
  status: "active"
};

assert.equal(
  shouldIgnoreStaleStripeSubscriptionEvent(currentPro, "sub_old_team"),
  true,
  "old canceled Team subscription events must not overwrite a newer active Pro subscription"
);
assert.equal(
  shouldIgnoreStaleStripeSubscriptionEvent({ ...currentPro, plan: "team", providerSubscriptionId: "sub_team" }, "sub_team"),
  false,
  "matching Team subscription events must still be handled so cancellation can restore previous Pro"
);
assert.equal(
  shouldIgnoreStaleStripeSubscriptionEvent({ ...currentPro, provider: "demo", providerSubscriptionId: "demo-pro" }, "sub_old_team"),
  false,
  "demo subscriptions should not be treated as stale Stripe events"
);
assert.equal(shouldIgnoreStaleStripeSubscriptionEvent(null, "sub_old_team"), false, "missing current state should not hide webhook events");

const guardSource = read("lib/billing/subscription-event-guards.ts");
const webhookSource = read("app/api/billing/stripe/webhook/route.ts");
const transitionSource = read("lib/team-subscription-transition.ts");
const stripeSource = read("lib/billing/stripe.ts");
const subscriptionControlsSource = read("components/subscription-controls.tsx");
const checkoutRouteSource = read("app/api/account/subscription/checkout/route.ts");
const upgradePageSource = read("app/upgrade/page.tsx");

assert.ok(
  guardSource.includes("currentSubscription.providerSubscriptionId !== eventSubscriptionId"),
  "stale-event guard should compare current and incoming Stripe subscription ids"
);
assert.ok(
  webhookSource.includes("rememberPersonalProSubscriptionForTeamOwnerUpgrade"),
  "Team checkout completion should remember the owner's previous Pro subscription"
);
assert.ok(
  webhookSource.includes("cancelPreviousTeamSubscriptionForProCheckout") && webhookSource.includes('if (plan === "pro")'),
  "Pro checkout completion should cancel the previous Team subscription in the background"
);
assert.ok(
  webhookSource.includes("restorePausedPersonalSubscriptionForReleasedTeamSeat"),
  "Team cancellation should restore a remembered previous Pro subscription"
);
assert.ok(
  webhookSource.includes("readStripeCustomerSubscriptionForPlan") && webhookSource.includes("legacyProFallback"),
  "legacy Team cancellations should look for an active Pro subscription before writing Free"
);
assert.ok(webhookSource.includes("staleSubscriptionEvent"), "webhook should expose stale-event ignore path");
assert.ok(transitionSource.includes("team-owner-upgrade"), "owner Team upgrades should be tracked distinctly in the pause table");
assert.ok(
  transitionSource.includes("cancelStripeSubscriptionAtPeriodEnd(previousSubscription.providerSubscriptionId)"),
  "owner Team upgrades should cancel the previous Pro subscription in the background"
);
assert.ok(
  transitionSource.includes("isActiveTeamSubscription") && transitionSource.includes("cancelPreviousTeamSubscriptionForProCheckout"),
  "owner Pro downgrades should detect and cancel the previous active Team subscription"
);
assert.ok(stripeSource.includes("metadata[userEmail]"), "Stripe checkout metadata should include user email for future audit records");
assert.ok(stripeSource.includes("readStripeCustomerSubscriptionForPlan"), "Stripe helper should expose plan-specific subscription lookup");
assert.ok(
  subscriptionControlsSource.includes("capitolLedgerPurchase") &&
    subscriptionControlsSource.includes('action: "purchase"') &&
    subscriptionControlsSource.includes('action: "restore"') &&
    subscriptionControlsSource.includes('action: "manage"') &&
    subscriptionControlsSource.includes("proAppStoreProductIds") &&
    subscriptionControlsSource.includes("getTeamAppStoreProductId"),
  "visible subscription controls should use the native Apple purchase bridge"
);
assert.ok(
  !subscriptionControlsSource.includes("checkoutEndpoint") &&
    !subscriptionControlsSource.includes("billingPortalEndpoint") &&
    !subscriptionControlsSource.includes("Open Stripe Checkout") &&
    !subscriptionControlsSource.includes("checkoutHandoff"),
  "visible subscription controls should not call Stripe checkout or billing portal"
);
assert.ok(
  upgradePageSource.includes("RestorePurchasesButton") &&
    upgradePageSource.includes("Start Pro Trial") &&
    upgradePageSource.includes("PlanTrialDisclosure") &&
    upgradePageSource.includes("Start Team Plan") &&
    !upgradePageSource.includes("showStripeSandboxNotice") &&
    !upgradePageSource.includes("STRIPE") &&
    !upgradePageSource.includes("Test checkout") &&
    !upgradePageSource.includes("No real payment needed"),
  "Upgrade page should present Apple purchase and restore controls instead of Stripe test checkout"
);
assert.ok(
  checkoutRouteSource.includes("cancelStripeSubscriptionAtPeriodEnd(currentSubscription.providerSubscriptionId)") &&
    checkoutRouteSource.includes("canceledPreviousSubscription") &&
    checkoutRouteSource.includes('plan === "free"'),
  "Free downgrades should cancel the previous paid Stripe subscription in the background"
);

console.log("Billing transition fixture check passed.");
