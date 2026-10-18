#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { completedAppStoreTeamSeatReleaseResult } from "../lib/billing/team-seat-release-result.ts";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

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

const transitionSource = read("lib/team-subscription-transition.ts");
const appleRestoreSource = transitionSource.slice(
  transitionSource.indexOf('if (previousSubscription.provider === "app-store")')
);
const subscriptionPlansSource = read("lib/subscription-plans.ts");
const subscriptionControlsSource = read("components/subscription-controls.tsx");
const dailyBriefProOfferSource = read("components/daily-brief-pro-offer.tsx");
const checkoutRouteSource = read("app/api/account/subscription/checkout/route.ts");
const supportPageSource = read("app/support/page.tsx");
const upgradePageSource = read("app/upgrade/page.tsx");

assert.ok(transitionSource.includes("team-owner-upgrade"), "owner Team upgrades should be tracked distinctly in the pause table");
assert.ok(transitionSource.includes("FOR KEY SHARE OF workspace, account"), "member pausing must preserve account/workspace deletion locking");
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
    dailyBriefProOfferSource.includes('selectedDisclosure="Eligible new subscribers may receive 7 days free, then $4.99/month."') &&
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
