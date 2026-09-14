import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const checkoutSource = read("app/api/account/subscription/checkout/route.ts");
const webhookSource = read("app/api/billing/stripe/webhook/route.ts");

assert.match(
  checkoutSource,
  /APP_STORE_ONLY_CHECKOUT_RETIRED/,
  "retired checkout must preserve its stable response code"
);
assert.match(checkoutSource, /status:\s*410/, "retired checkout must fail closed with HTTP 410");

for (const forbidden of [
  "createStripeCheckoutSession",
  "writeSubscriptionToDatabase",
  "setAccountSubscription",
  'provider: "demo"',
  'provider: "stripe"'
]) {
  assert.equal(
    checkoutSource.includes(forbidden),
    false,
    `retired checkout must not retain mutation path: ${forbidden}`
  );
}

const retiredWebhookIndex = webhookSource.indexOf('event.type === "checkout.session.completed"');
const userLookupIndex = webhookSource.indexOf("const userId =");
const subscriptionUpdateIndex = webhookSource.indexOf(
  'if (event.type === "customer.subscription.updated"',
  userLookupIndex
);

assert.notEqual(retiredWebhookIndex, -1, "legacy checkout completion must have an explicit retired-event branch");
assert.notEqual(userLookupIndex, -1, "legacy subscription lifecycle events must retain their account lookup");
assert.ok(
  retiredWebhookIndex < userLookupIndex,
  "legacy checkout completion must return before account lookup or database mutation"
);
assert.ok(
  subscriptionUpdateIndex > userLookupIndex,
  "existing subscription update/deletion handling must remain after account lookup"
);

const retiredWebhookBranch = webhookSource.slice(retiredWebhookIndex, userLookupIndex);
assert.match(retiredWebhookBranch, /checkoutRetired:\s*true/, "retired checkout completion must be explicitly acknowledged");
assert.match(retiredWebhookBranch, /ignored:\s*true/, "retired checkout completion must be marked ignored");
assert.match(retiredWebhookBranch, /return NextResponse\.json/, "retired checkout completion must return immediately");

for (const forbidden of [
  "rememberPersonalProSubscriptionForTeamOwnerUpgrade",
  "cancelPreviousTeamSubscriptionForProCheckout",
  "team-owner-upgrade"
]) {
  assert.equal(
    webhookSource.includes(forbidden),
    false,
    `legacy checkout completion must not retain incompatible behavior: ${forbidden}`
  );
}

console.log("Pre-migration Stripe compatibility checks passed.");
