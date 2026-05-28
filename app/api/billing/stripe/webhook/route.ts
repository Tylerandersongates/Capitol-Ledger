import { NextRequest, NextResponse } from "next/server";
import { setAccountSubscription } from "@/lib/account-subscription";
import { writeSubscriptionToDatabase } from "@/lib/account-database";
import { getStripeWebhookSecret, mapStripeStatus, parseStripeWebhookEvent, verifyStripeWebhookSignature } from "@/lib/billing/stripe";
import type { BillingCycle, SubscriptionPlanId } from "@/types/capitol";

function readPlan(value?: string): SubscriptionPlanId {
  if (value === "pro" || value === "team") return value;
  return "free";
}

function readCycle(value?: string): BillingCycle {
  return value === "annual" ? "annual" : "monthly";
}

export async function POST(request: NextRequest) {
  const secret = getStripeWebhookSecret();

  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();

  if (!signature || !verifyStripeWebhookSignature(payload, signature, secret)) {
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  const event = parseStripeWebhookEvent(payload);
  const object = event.data?.object;
  const metadata = object?.metadata ?? {};
  const userId = metadata.userId ?? object?.client_reference_id;

  if (!object || !userId) {
    return NextResponse.json({ received: true, ignored: true });
  }

  if (event.type === "checkout.session.completed") {
    const plan = readPlan(metadata.plan);
    const cycle = readCycle(metadata.cycle);
    const nextSubscription = {
      cycle,
      plan,
      provider: "stripe" as const,
      providerCustomerId: object.customer,
      providerEntitlementId: `capitol-ledger-${plan}`,
      providerSubscriptionId: object.subscription,
      status: "active" as const
    };

    await writeSubscriptionToDatabase(userId, nextSubscription).catch(() => null);
    setAccountSubscription(userId, nextSubscription);
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const plan = readPlan(metadata.plan);
    const cycle = readCycle(metadata.cycle);
    const nextSubscription = {
      cycle,
      plan,
      provider: "stripe" as const,
      providerCustomerId: object.customer,
      providerEntitlementId: `capitol-ledger-${plan}`,
      providerSubscriptionId: object.id,
      status: event.type === "customer.subscription.deleted" ? ("canceled" as const) : mapStripeStatus(object.status)
    };

    await writeSubscriptionToDatabase(userId, nextSubscription).catch(() => null);
    setAccountSubscription(userId, nextSubscription);
  }

  return NextResponse.json({ received: true });
}
