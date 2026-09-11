import { NextRequest, NextResponse } from "next/server";
import { setAccountSubscription } from "@/lib/account-subscription";
import {
  accountPersistenceUserExists,
  canUseDatabasePersistence,
  findSubscriptionUserIdByProvider,
  readSubscriptionFromDatabase,
  writeSubscriptionToDatabase
} from "@/lib/account-database";
import {
  accountDeletionCleanupKinds,
  executeAccountDeletionCleanupJob
} from "@/lib/account-deletion-cleanup";
import {
  fallbackUnlessAccountPersistenceUnavailable,
  throwAccountPersistenceUnavailable,
  withAccountPersistenceRoute
} from "@/lib/account-persistence-safety";
import { shouldIgnoreStaleStripeSubscriptionEvent } from "@/lib/billing/subscription-event-guards";
import {
  getStripeWebhookSecret,
  isStripeResourceMissingError,
  parseStripeWebhookEvent,
  readStripeCustomerSubscriptionForPlan,
  readStripeSubscription,
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
import type { AccountSubscriptionSnapshot, BillingCycle, SubscriptionPlanId } from "@/types/capitol";

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

async function persistWebhookSubscription(userId: string, subscription: Partial<AccountSubscriptionSnapshot>) {
  if (!canUseDatabasePersistence()) return setAccountSubscription(userId, subscription);

  const persisted = await writeSubscriptionToDatabase(userId, subscription);
  if (!persisted) throwAccountPersistenceUnavailable("persistWebhookSubscription");
  return persisted;
}

async function receiveStripeWebhook(request: NextRequest) {
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

  const supportedSubscriptionEvent =
    event.type === "checkout.session.completed" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted";
  if (!supportedSubscriptionEvent) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const userId =
    metadata.userId ??
    object.client_reference_id ??
    (await findSubscriptionUserIdByProvider({
      customerId: object.customer,
      subscriptionId: object.id ?? object.subscription
    }));

  if (!userId) {
    return NextResponse.json({ received: true, ignored: true });
  }

  if (!(await accountPersistenceUserExists(userId))) {
    await executeAccountDeletionCleanupJob({
      kind: accountDeletionCleanupKinds.cancelDeletedAccountStripeSubscription,
      payload: {
        customerId: object.customer,
        subscriptionId: event.type === "checkout.session.completed" ? object.subscription : readEventSubscriptionId(object)
      }
    });
    return NextResponse.json({ deletedAccountCleanup: true, received: true });
  }

  if (event.type === "checkout.session.completed") {
    let liveSubscription: Awaited<ReturnType<typeof readStripeSubscription>> | null = null;
    if (object.subscription?.startsWith("sub_")) {
      try {
        liveSubscription = await readStripeSubscription(object.subscription);
      } catch (error) {
        if (!isStripeResourceMissingError(error)) throw error;
        return NextResponse.json({ received: true, staleCheckoutSession: true });
      }
    }
    const liveDetails = liveSubscription ? readStripeSubscriptionDetails(liveSubscription) : null;
    const plan = liveDetails?.plan ?? readPlan(metadata.plan);
    const cycle = liveDetails?.cycle ?? readCycle(metadata.cycle);
    const seatCount = liveDetails?.seatCount ?? readSeatCount(plan, metadata.seatCount);
    const currentSubscription = await readSubscriptionFromDatabase(userId);
    if (plan === "team") {
      await rememberPersonalProSubscriptionForTeamOwnerUpgrade({
        email: metadata.userEmail,
        previousSubscription: currentSubscription,
        teamSubscriptionId: object.subscription,
        userId
      }).catch((error) => fallbackUnlessAccountPersistenceUnavailable(error, null));
    }
    if (plan === "pro") {
      await cancelPreviousTeamSubscriptionForProCheckout({
        previousSubscription: currentSubscription
      }).catch((error) => fallbackUnlessAccountPersistenceUnavailable(error, null));
    }

    const nextSubscription = {
      cycle,
      plan,
      provider: "stripe" as const,
      providerCustomerId: liveSubscription?.customer ?? object.customer,
      providerEntitlementId: `capitol-ledger-${plan}`,
      providerSubscriptionId: liveSubscription?.id ?? object.subscription,
      seatCount,
      status: liveDetails?.status ?? ("active" as const)
    };

    await persistWebhookSubscription(userId, nextSubscription);
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const eventSubscriptionId = readEventSubscriptionId(object);
    let providerObject = object;
    if (event.type === "customer.subscription.updated" && eventSubscriptionId?.startsWith("sub_")) {
      try {
        providerObject = await readStripeSubscription(eventSubscriptionId);
      } catch (error) {
        if (!isStripeResourceMissingError(error)) throw error;
        providerObject = { ...object, status: "canceled" };
      }
    }
    const providerMetadata = providerObject.metadata ?? metadata;
    const details = readStripeSubscriptionDetails({
      cancel_at: providerObject.cancel_at,
      cancel_at_period_end: providerObject.cancel_at_period_end,
      items: providerObject.items,
      metadata: providerMetadata,
      status: event.type === "customer.subscription.deleted" ? "canceled" : providerObject.status
    });
    const nextSubscription = {
      cycle: details.cycle,
      plan: details.plan,
      provider: "stripe" as const,
      providerCustomerId: providerObject.customer ?? object.customer,
      providerEntitlementId: `capitol-ledger-${details.plan}`,
      providerSubscriptionId: providerObject.id ?? object.id,
      seatCount: details.seatCount,
      status: details.status
    };
    const currentSubscription = await readSubscriptionFromDatabase(userId);
    if (shouldIgnoreStaleStripeSubscriptionEvent(currentSubscription, eventSubscriptionId)) {
      return NextResponse.json({ received: true, staleSubscriptionEvent: true });
    }

    if (currentSubscription?.providerEntitlementId === teamPausedProEntitlementId && details.plan === "free") {
      return NextResponse.json({ received: true, pausedForTeam: true });
    }

    if (currentSubscription?.plan === "team" && currentSubscription.providerSubscriptionId === eventSubscriptionId && details.plan === "free") {
      const restoreResult = await restorePausedPersonalSubscriptionForReleasedTeamSeat({ userId }).catch((error) =>
        fallbackUnlessAccountPersistenceUnavailable(error, null)
      );
      if (restoreResult?.restored || restoreResult?.checkoutRequired) {
        return NextResponse.json({
          checkoutRequired: restoreResult.checkoutRequired,
          received: true,
          restoredPreviousPro: restoreResult.restored
        });
      }

      const providerCustomerId = providerObject.customer ?? object.customer;
      const legacyProSubscription = providerCustomerId ? await readStripeCustomerSubscriptionForPlan(providerCustomerId, "pro").catch(() => null) : null;
      const legacyProDetails = readStripeSubscriptionDetails(legacyProSubscription ?? undefined);
      if (legacyProSubscription?.id && legacyProDetails.plan === "pro") {
        const restoredSubscription = {
          cycle: legacyProDetails.cycle,
          plan: "pro" as const,
          provider: "stripe" as const,
          providerCustomerId: legacyProSubscription.customer ?? providerCustomerId,
          providerEntitlementId: "capitol-ledger-pro",
          providerSubscriptionId: legacyProSubscription.id,
          seatCount: undefined,
          status: legacyProDetails.status
        };

        await persistWebhookSubscription(userId, restoredSubscription);

        return NextResponse.json({
          legacyProFallback: true,
          received: true,
          restoredPreviousPro: true
        });
      }
    }

    await persistWebhookSubscription(userId, nextSubscription);
  }

  return NextResponse.json({ received: true });
}

export const POST = withAccountPersistenceRoute(receiveStripeWebhook);
