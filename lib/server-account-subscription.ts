import { getAccountSubscription } from "@/lib/account-subscription";
import { getAccountPersistenceUserId, readSubscriptionFromDatabase, writeSubscriptionToDatabase } from "@/lib/account-database";
import { getCurrentSession } from "@/lib/auth";
import { readStripeCustomerSubscription, readStripeSubscription, readStripeSubscriptionDetails } from "@/lib/billing/stripe";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

type AccountSubscriptionUser = {
  email: string;
  id: string;
  name?: string;
};

type PersistedSubscriptionState = Omit<AccountSubscriptionSnapshot, "updatedAt">;

function canSyncStripeSubscription(subscription: AccountSubscriptionSnapshot) {
  return (
    subscription.provider === "stripe" &&
    (Boolean(subscription.providerSubscriptionId?.startsWith("sub_")) || Boolean(subscription.providerCustomerId?.startsWith("cus_")))
  );
}

function hasSamePersistedSubscriptionState(left: AccountSubscriptionSnapshot, right: PersistedSubscriptionState) {
  return (
    left.cycle === right.cycle &&
    left.plan === right.plan &&
    left.provider === right.provider &&
    left.providerCustomerId === right.providerCustomerId &&
    left.providerEntitlementId === right.providerEntitlementId &&
    left.providerSubscriptionId === right.providerSubscriptionId &&
    left.seatCount === right.seatCount &&
    left.status === right.status
  );
}

async function readStripeSubscriptionForSnapshot(subscription: AccountSubscriptionSnapshot) {
  if (subscription.providerSubscriptionId?.startsWith("sub_")) {
    return readStripeSubscription(subscription.providerSubscriptionId).catch((error: unknown) => {
      if (!subscription.providerCustomerId?.startsWith("cus_")) throw error;
      return readStripeCustomerSubscription(subscription.providerCustomerId);
    });
  }

  if (subscription.providerCustomerId?.startsWith("cus_")) {
    return readStripeCustomerSubscription(subscription.providerCustomerId);
  }

  return null;
}

export async function syncStripeSubscriptionForAccount(userId: string, subscription: AccountSubscriptionSnapshot) {
  if (!canSyncStripeSubscription(subscription)) return subscription;

  const stripeSubscription = await readStripeSubscriptionForSnapshot(subscription);
  if (!stripeSubscription?.id) return subscription;

  const details = readStripeSubscriptionDetails(stripeSubscription);
  const nextSubscription = {
    cycle: details.cycle,
    plan: details.plan,
    provider: "stripe" as const,
    providerCustomerId: stripeSubscription.customer ?? subscription.providerCustomerId,
    providerEntitlementId: `capitol-ledger-${details.plan}`,
    providerSubscriptionId: stripeSubscription.id,
    seatCount: details.seatCount,
    status: details.status
  };

  if (hasSamePersistedSubscriptionState(subscription, nextSubscription)) return subscription;

  const fallbackSubscription = {
    ...subscription,
    ...nextSubscription,
    updatedAt: new Date().toISOString()
  } satisfies AccountSubscriptionSnapshot;

  return (await writeSubscriptionToDatabase(userId, nextSubscription).catch(() => null)) ?? fallbackSubscription;
}

export async function getSubscriptionForAccountUser(user: AccountSubscriptionUser): Promise<AccountSubscriptionSnapshot> {
  const accountUserId = await getAccountPersistenceUserId(user).catch(() => user.id);
  const subscription = (await readSubscriptionFromDatabase(accountUserId).catch(() => null)) ?? getAccountSubscription(accountUserId);
  return syncStripeSubscriptionForAccount(accountUserId, subscription).catch(() => subscription);
}

export async function getCurrentAccountSubscription(): Promise<AccountSubscriptionSnapshot | null> {
  const session = await getCurrentSession();
  if (!session?.user) return null;

  return getSubscriptionForAccountUser(session.user);
}
