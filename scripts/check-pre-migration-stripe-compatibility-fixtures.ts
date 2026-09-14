import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { POST as checkoutPost } from "@/app/api/account/subscription/checkout/route";
import { POST as webhookPost } from "@/app/api/billing/stripe/webhook/route";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalStripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const originalFetch = globalThis.fetch;
const fixtureWebhookSecret = "whsec_local_pre_migration_fixture";

async function main() {
  try {
    delete process.env.DATABASE_URL;
    process.env.STRIPE_WEBHOOK_SECRET = fixtureWebhookSecret;
    globalThis.fetch = async () => {
      throw new Error("Pre-migration compatibility fixtures must not call a provider.");
    };

    const checkoutResponse = await checkoutPost();
    assert.equal(checkoutResponse.status, 410, "web checkout must fail closed before the database migration");
    assert.deepEqual(await checkoutResponse.json(), {
      code: "APP_STORE_ONLY_CHECKOUT_RETIRED",
      error: "Web checkout is no longer available. Use the CapitolWonk iOS app to purchase or manage an App Store subscription."
    });

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = JSON.stringify({
      data: {
        object: {
          client_reference_id: "fixture-user-must-not-be-looked-up",
          customer: "cus_fixture_must_not_be_called",
          metadata: {
            cycle: "annual",
            plan: "team",
            seatCount: "3",
            userId: "fixture-user-must-not-be-looked-up"
          },
          subscription: "sub_fixture_must_not_be_written"
        }
      },
      id: "evt_fixture_checkout_completed",
      type: "checkout.session.completed"
    });
    const signature = createHmac("sha256", fixtureWebhookSecret)
      .update(`${timestamp}.${payload}`)
      .digest("hex");
    const request = new NextRequest("https://fixture.invalid/api/billing/stripe/webhook", {
      body: payload,
      headers: {
        "content-type": "application/json",
        "stripe-signature": `t=${timestamp},v1=${signature}`
      },
      method: "POST"
    });
    const webhookResponse = await webhookPost(request);

    assert.equal(webhookResponse.status, 200, "retired checkout completion must be acknowledged");
    assert.deepEqual(await webhookResponse.json(), {
      checkoutRetired: true,
      ignored: true,
      received: true
    });

    console.log("Pre-migration Stripe compatibility runtime fixtures passed.");
  } finally {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;

    if (originalStripeWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = originalStripeWebhookSecret;

    globalThis.fetch = originalFetch;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
