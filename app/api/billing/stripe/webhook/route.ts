import { NextRequest, NextResponse } from "next/server";
import { setAccountSubscription } from "@/lib/account-subscription";
import { findSubscriptionUserIdByProvider, readSubscriptionFromDatabase, writeSubscriptionToDatabase } from "@/lib/account-database";
import { shouldIgnoreStaleStripeSubscriptionEvent } from "@/lib/billing/subscription-event-guards";
import {
  getStripeWebhookSecret,
  parseStripeWebhookEvent,
  readStripeCustomerSubscriptionForPlan,
  readStripeSubscriptionDetails,
  verifyStripeWebhookSignature
} from "@/lib/billing/stripe";
import { normalizeTeamSeatCount } from "@/lib/subscription-seat-count";
import { teamPausedProEntitlementId } from "@/lib/team-subscription-constants";
import {
  cancelPreviousTeamSubscriptionForProCheckout,
  rememberPersonalProSubscriptionForTeamOwnerUpgrade,
  restorePausedPersonalSubscriptionForReleasedTeamSeat
} from "@/lib/team-subscription-transition";
import type { BillingCycle, SubscriptionPlanId } from "@/types/capitol";

function readPlan(value?: string): SubscriptionPlanId {
  if (value === "pro" || value === "team") return value;
  return "free";
}

function readCycle(value?: string): BillingCycle {
  return value === "annual" ? "annual" : "monthly";
}

function readSeatCount(plan: SubscriptionPlanId, value?: string) {
  return plan === "team" ? normalizeTeamSeatCount(value) : undefined;
}

function readEventSubscriptionId(object: { id?: string; subscription?: string }) {
  return object.id ?? object.subscription;
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

  if (!object) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const userId =
    metadata.userId ??
    object.client_reference_id ??
    (await findSubscriptionUserIdByProvider({
      customerId: object.customer,
      subscriptionId: object.id ?? object.subscription
    }).catch(() => null));

  if (!userId) {
    return NextResponse.json({ received: true, ignored: true });
  }

  if (event.type === "checkout.session.completed") {
    const plan = readPlan(metadata.plan);
    const cycle = readCycle(metadata.cycle);
    const seatCount = readSeatCount(plan, metadata.seatCount);
    const currentSubscription = await readSubscriptionFromDatabase(userId).catch(() => null);
    if (plan === "team") {
      await rememberPersonalProSubscriptionForTeamOwnerUpgrade({
        email: metadata.userEmail,
        previousSubscription: currentSubscription,
        teamSubscriptionId: object.subscription,
        userId
      }).catch(() => null);
    }
    if (plan === "pro") {
      await cancelPreviousTeamSubscriptionForProCheckout({
        previousSubscription: currentSubscription
      }).catch(() => null);
    }

    const nextSubscription = {
      cycle,
      plan,
      provider: "stripe" as const,
      providerCustomerId: object.customer,
      providerEntitlementId: `capitol-ledger-${plan}`,
      providerSubscriptionId: object.subscription,
      seatCount,
      status: "active" as const
    };

    await writeSubscriptionToDatabase(userId, nextSubscription).catch(() => null);
    setAccountSubscription(userId, nextSubscription);
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const eventSubscriptionId = readEventSubscriptionId(object);
    const details = readStripeSubscriptionDetails({
      cancel_at: object.cancel_at,
      cancel_at_period_end: object.cancel_at_period_end,
      items: object.items,
      metadata,
      status: event.type === "customer.subscription.deleted" ? "canceled" : object.status
    });
    const nextSubscription = {
      cycle: details.cycle,
      plan: details.plan,
      provider: "stripe" as const,
      providerCustomerId: object.customer,
      providerEntitlementId: `capitol-ledger-${details.plan}`,
      providerSubscriptionId: object.id,
      seatCount: details.seatCount,
      status: details.status
    };
    const currentSubscription = await readSubscriptionFromDatabase(userId).catch(() => null);
    if (shouldIgnoreStaleStripeSubscriptionEvent(currentSubscription, eventSubscriptionId)) {
      return NextResponse.json({ received: true, staleSubscriptionEvent: true });
    }

    if (currentSubscription?.providerEntitlementId === teamPausedProEntitlementId && details.plan === "free") {
      return NextResponse.json({ received: true, pausedForTeam: true });
    }

    if (currentSubscription?.plan === "team" && currentSubscription.providerSubscriptionId === eventSubscriptionId && details.plan === "free") {
      const restoreResult = await restorePausedPersonalSubscriptionForReleasedTeamSeat({ userId }).catch(() => null);
      if (restoreResult?.restored || restoreResult?.checkoutRequired) {
        return NextResponse.json({
          checkoutRequired: restoreResult.checkoutRequired,
          received: true,
          restoredPreviousPro: restoreResult.restored
        });
      }

      const legacyProSubscription = object.customer ? await readStripeCustomerSubscriptionForPlan(object.customer, "pro").catch(() => null) : null;
      const legacyProDetails = readStripeSubscriptionDetails(legacyProSubscription ?? undefined);
      if (legacyProSubscription?.id && legacyProDetails.plan === "pro") {
        const restoredSubscription = {
          cycle: legacyProDetails.cycle,
          plan: "pro" as const,
          provider: "stripe" as const,
          providerCustomerId: legacyProSubscription.customer ?? object.customer,
          providerEntitlementId: "capitol-ledger-pro",
          providerSubscriptionId: legacyProSubscription.id,
          seatCount: undefined,
          status: legacyProDetails.status
        };

        await writeSubscriptionToDatabase(userId, restoredSubscription).catch(() => null);
        setAccountSubscription(userId, restoredSubscription);

        return NextResponse.json({
          legacyProFallback: true,
          received: true,
          restoredPreviousPro: true
        });
      }
    }

    await writeSubscriptionToDatabase(userId, nextSubscription).catch(() => null);
    setAccountSubscription(userId, nextSubscription);
  }

  return NextResponse.json({ received: true });
}
