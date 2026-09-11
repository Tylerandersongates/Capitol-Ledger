#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { completedAppStoreTeamSeatReleaseResult } from "../lib/billing/team-seat-release-result.ts";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function shouldIgnoreStaleStripeSubscriptionEvent(currentSubscription, eventSubscriptionId) {
  if (currentSubscription?.provider !== "stripe") return true;
  if (!currentSubscription.providerSubscriptionId?.startsWith("sub_") || !eventSubscriptionId?.startsWith("sub_")) return true;

  return currentSubscription.providerSubscriptionId !== eventSubscriptionId;
}

const currentPro = {
  plan: "pro",
  provider: "stripe",
  providerSubscriptionId: "sub_current",
  status: "active"
};

const canonicalApplePro = {
  cycle: "monthly",
  plan: "pro",
  provider: "app-store",
  providerEntitlementId: "com.capitolwonk.pro.monthly",
  providerSubscriptionId: "original-current",
  status: "active",
  updatedAt: "2026-09-11T20:00:00.000Z"
};

assert.equal(
  completedAppStoreTeamSeatReleaseResult(
    {
      accountSubscription: canonicalApplePro,
      finalized: false
    },
    canonicalApplePro,
    true
  ),
  null,
  "a stale Team-seat finalizer must not report terminal restoration while its pause remains active"
);
assert.equal(
  completedAppStoreTeamSeatReleaseResult(
    {
      accountSubscription: { ...canonicalApplePro, plan: "free", status: "canceled" },
      finalized: false
    },
    { ...canonicalApplePro, plan: "free", status: "canceled" },
    false
  ),
  null,
  "a stale Team-seat finalizer must not report checkout completion while its pause remains active"
);
assert.deepEqual(
  completedAppStoreTeamSeatReleaseResult(
    {
      accountSubscription: canonicalApplePro,
      finalized: true
    },
    canonicalApplePro,
    true
  ),
  {
    checkoutRequired: false,
    restored: true,
    subscription: canonicalApplePro
  },
  "a finalized Team-seat restoration may return terminal success"
);

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
  true,
  "Stripe events must not overwrite a non-Stripe entitlement"
);
assert.equal(shouldIgnoreStaleStripeSubscriptionEvent(null, "sub_old_team"), true, "missing current state must not accept a Stripe entitlement event");

const guardSource = read("lib/billing/subscription-event-guards.ts");
const webhookSource = read("app/api/billing/stripe/webhook/route.ts");
const transitionSource = read("lib/team-subscription-transition.ts");
const appleRestoreSource = transitionSource.slice(
  transitionSource.indexOf('if (previousSubscription.provider === "app-store")')
);
const stripeSource = read("lib/billing/stripe.ts");
const subscriptionPlansSource = read("lib/subscription-plans.ts");
const subscriptionControlsSource = read("components/subscription-controls.tsx");
const dailyBriefProOfferSource = read("components/daily-brief-pro-offer.tsx");
const checkoutRouteSource = read("app/api/account/subscription/checkout/route.ts");
const supportPageSource = read("app/support/page.tsx");
const upgradePageSource = read("app/upgrade/page.tsx");

assert.ok(
  guardSource.includes("currentSubscription.providerSubscriptionId !== eventSubscriptionId"),
  "stale-event guard should compare current and incoming Stripe subscription ids"
);
assert.ok(
  webhookSource.includes('event.type === "checkout.session.completed"') && webhookSource.includes("checkoutRetired: true"),
  "legacy checkout-completion webhooks must be acknowledged without granting access"
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
assert.ok(
  webhookSource.includes("accountPersistenceUserExists") &&
    webhookSource.includes("cancelDeletedAccountStripeSubscription") &&
    webhookSource.includes("deletedAccountCleanup"),
  "late Stripe events for a deleted account must stop renewal and detach account metadata before acknowledgement"
);
assert.ok(
  webhookSource.includes("readStripeSubscription(eventSubscriptionId)") &&
    webhookSource.includes("const userId = await findSubscriptionUserIdByProvider") &&
    !webhookSource.includes("metadata.userId ??"),
  "legacy Stripe updates must reconcile live provider state only after matching an existing provider record"
);
assert.ok(transitionSource.includes("team-owner-upgrade"), "owner Team upgrades should be tracked distinctly in the pause table");
assert.ok(
  transitionSource.includes("cancelStripeSubscriptionAtPeriodEnd(previousSubscription.providerSubscriptionId)"),
  "owner Team upgrades should cancel the previous Pro subscription in the background"
);
assert.ok(
  transitionSource.includes("isActiveTeamSubscription") && transitionSource.includes("cancelPreviousTeamSubscriptionForProCheckout"),
  "owner Pro downgrades should detect and cancel the previous active Team subscription"
);
assert.ok(
  transitionSource.includes("FOR KEY SHARE OF workspace, account") &&
    transitionSource.includes("failed to compensate an uncommitted Stripe pause"),
  "member subscription pausing should serialize with workspace/account deletion and compensate a rolled-back provider change"
);
assert.ok(
  appleRestoreSource.includes("readAppStoreSubscriptionState(userId)") &&
    appleRestoreSource.includes("reconcileAppStoreSubscription") &&
    appleRestoreSource.includes("persistReconciledAppStoreState"),
  "released Team seats must reconcile and persist current App Store state before restoring personal access"
);
assert.ok(
  appleRestoreSource.includes("!state?.originalTransactionId || !state.environment || !state.appAccountToken") &&
    appleRestoreSource.includes("isActivePaidSubscription(canonical.snapshot)") &&
    appleRestoreSource.includes("finalizeAppStoreTeamSeatRelease") &&
    appleRestoreSource.includes("observationVersion: canonical.observationVersion"),
  "App Store restoration must finalize paid or checkout state only against the accepted canonical observation"
);
assert.ok(
  appleRestoreSource.includes("if (!persistence.observationApplied) continue") &&
    !appleRestoreSource.includes("persistSubscription(userId, canonical.snapshot)"),
  "a stale Apple response must retry without an unfenced entitlement or checkout write"
);
assert.ok(
  stripeSource.includes("toleranceSeconds = 5 * 60") && stripeSource.includes("Math.abs(nowSeconds - timestampSeconds)"),
  "Stripe signatures should reject replay outside the configured timestamp tolerance"
);
assert.ok(
  !stripeSource.includes("/checkout/sessions") && !stripeSource.includes("createStripeCheckoutSession"),
  "legacy Stripe maintenance adapter must not create new checkout sessions"
);
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
  subscriptionPlansSource.includes('ctaLabel: "Continue with Apple"') &&
    subscriptionPlansSource.includes("Eligible new subscribers may receive 7 days free, then $4.99/month.") &&
    subscriptionPlansSource.includes("Apple confirms eligibility and exact terms before purchase.") &&
    !subscriptionPlansSource.includes("Start 7-day free trial") &&
    !subscriptionPlansSource.includes('disclosure: "7 days free'),
  "subscription-plan copy must make the introductory offer conditional on Apple eligibility"
);
assert.ok(
  subscriptionControlsSource.includes("Apple will confirm ${trial.label} eligibility and show the exact terms") &&
    subscriptionControlsSource.includes("The ${trial.label} is only for eligible new monthly Pro subscribers") &&
    !subscriptionControlsSource.includes("to start the ${trial.label}"),
  "purchase controls must defer introductory-offer eligibility and exact terms to Apple"
);
assert.ok(
  upgradePageSource.includes("RestorePurchasesButton") &&
    upgradePageSource.includes("Eligible new monthly Pro subscribers may receive 7 days free, then $4.99/month") &&
    upgradePageSource.includes("Apple confirms eligibility and exact terms before purchase") &&
    upgradePageSource.includes("Continue with Apple") &&
    upgradePageSource.includes("PlanTrialDisclosure") &&
    upgradePageSource.includes("Start Team Plan") &&
    !upgradePageSource.includes("Start Pro Trial") &&
    !upgradePageSource.includes("7-Day Trial") &&
    !upgradePageSource.includes("showStripeSandboxNotice") &&
    !upgradePageSource.includes("STRIPE") &&
    !upgradePageSource.includes("Test checkout") &&
    !upgradePageSource.includes("No real payment needed"),
  "Upgrade page should present Apple purchase and restore controls instead of Stripe test checkout"
);
assert.ok(
  supportPageSource.includes("Eligible new monthly Pro subscribers may receive 7 days free") &&
    supportPageSource.includes("Apple confirms eligibility and shows exact terms before purchase") &&
    !supportPageSource.includes("Monthly Pro starts with 7 days free") &&
    !supportPageSource.includes("Review the 7-day Pro trial") &&
    dailyBriefProOfferSource.includes("Apple confirms introductory-offer eligibility and shows exact terms before purchase"),
  "support and Daily Brief purchase copy must not promise an introductory offer to ineligible subscribers"
);
assert.ok(
  checkoutRouteSource.includes("APP_STORE_ONLY_CHECKOUT_RETIRED") &&
    checkoutRouteSource.includes("status: 410") &&
    !checkoutRouteSource.includes("createStripeCheckoutSession") &&
    !checkoutRouteSource.includes("writeSubscriptionToDatabase"),
  "retired web checkout should fail closed without Stripe calls or entitlement writes"
);

console.log("Billing transition fixture check passed.");
