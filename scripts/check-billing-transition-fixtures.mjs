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

assert.ok(
  guardSource.includes("currentSubscription.providerSubscriptionId !== eventSubscriptionId"),
  "stale-event guard should compare current and incoming Stripe subscription ids"
);
assert.ok(
  webhookSource.includes("rememberPersonalProSubscriptionForTeamOwnerUpgrade"),
  "Team checkout completion should remember the owner's previous Pro subscription"
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
assert.ok(stripeSource.includes("metadata[userEmail]"), "Stripe checkout metadata should include user email for future audit records");
assert.ok(stripeSource.includes("readStripeCustomerSubscriptionForPlan"), "Stripe helper should expose plan-specific subscription lookup");

console.log("Billing transition fixture check passed.");
