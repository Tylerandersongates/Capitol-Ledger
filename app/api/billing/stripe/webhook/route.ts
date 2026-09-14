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
import { teamPausedProEntitlementId } from "@/lib/team-subscription-constants";
import {
  restorePausedPersonalSubscriptionForReleasedTeamSeat
} from "@/lib/team-subscription-transition";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

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

  if (event.type === "checkout.session.completed") {
    return NextResponse.json({ checkoutRetired: true, ignored: true, received: true });
  }

  const supportedSubscriptionEvent = event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted";
  if (!supportedSubscriptionEvent) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const eventSubscriptionId = readEventSubscriptionId(object);
  const userId = await findSubscriptionUserIdByProvider({
    customerId: object.customer,
    subscriptionId: eventSubscriptionId
  });

  if (!userId) {
    const deletedUserId = metadata.userId;
    if (deletedUserId && !(await accountPersistenceUserExists(deletedUserId))) {
      await executeAccountDeletionCleanupJob({
        kind: accountDeletionCleanupKinds.cancelDeletedAccountStripeSubscription,
        payload: {
          customerId: object.customer,
          subscriptionId: eventSubscriptionId
        }
      });
      return NextResponse.json({ deletedAccountCleanup: true, received: true });
    }
    return NextResponse.json({ received: true, ignored: true });
  }

  if (!(await accountPersistenceUserExists(userId))) {
    await executeAccountDeletionCleanupJob({
      kind: accountDeletionCleanupKinds.cancelDeletedAccountStripeSubscription,
      payload: {
        customerId: object.customer,
        subscriptionId: eventSubscriptionId
      }
    });
    return NextResponse.json({ deletedAccountCleanup: true, received: true });
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const currentSubscription = await readSubscriptionFromDatabase(userId);
    if (shouldIgnoreStaleStripeSubscriptionEvent(currentSubscription, eventSubscriptionId)) {
      return NextResponse.json({ received: true, staleSubscriptionEvent: true });
    }

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
