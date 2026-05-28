import type { AccountSubscriptionSnapshot } from "../types/capitol";

const defaultSubscription = (): AccountSubscriptionSnapshot => ({
  cycle: "monthly",
  plan: "free",
  provider: "demo",
  providerCustomerId: "demo-customer",
  providerEntitlementId: "capitol-ledger-free",
  providerSubscriptionId: "demo-free",
  status: "active",
  updatedAt: new Date().toISOString()
});

declare global {
  // eslint-disable-next-line no-var
  var __capitolLedgerSubscriptionStore: Map<string, AccountSubscriptionSnapshot> | undefined;
}

const subscriptionStore = globalThis.__capitolLedgerSubscriptionStore ?? new Map<string, AccountSubscriptionSnapshot>();
globalThis.__capitolLedgerSubscriptionStore = subscriptionStore;

export function normalizeAccountSubscription(value: Partial<AccountSubscriptionSnapshot> = {}): AccountSubscriptionSnapshot {
  const plan = value.plan === "pro" || value.plan === "team" ? value.plan : "free";
  const cycle = value.cycle === "annual" ? "annual" : "monthly";
  const provider = value.provider === "stripe" || value.provider === "revenuecat" || value.provider === "app-store" ? value.provider : "demo";
  const status = value.status === "trialing" || value.status === "past_due" || value.status === "canceled" ? value.status : "active";

  return {
    cycle,
    plan,
    provider,
    providerCustomerId: value.providerCustomerId ?? "demo-customer",
    providerEntitlementId: value.providerEntitlementId ?? `capitol-ledger-${plan}`,
    providerSubscriptionId: value.providerSubscriptionId ?? `demo-${plan}-${cycle}`,
    status,
    updatedAt: new Date().toISOString()
  };
}

export function getAccountSubscription(userId: string) {
  const subscription = subscriptionStore.get(userId) ?? defaultSubscription();
  subscriptionStore.set(userId, subscription);
  return subscription;
}

export function setAccountSubscription(userId: string, value: Partial<AccountSubscriptionSnapshot>) {
  const current = getAccountSubscription(userId);
  const next = normalizeAccountSubscription({
    ...current,
    ...value
  });

  subscriptionStore.set(userId, next);
  return next;
}
