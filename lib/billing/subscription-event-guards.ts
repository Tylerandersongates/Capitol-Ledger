import type { AccountSubscriptionSnapshot } from "@/types/capitol";

function hasStripeSubscriptionId(value?: string | null) {
  return Boolean(value?.startsWith("sub_"));
}

export function shouldIgnoreStaleStripeSubscriptionEvent(
  currentSubscription: AccountSubscriptionSnapshot | null | undefined,
  eventSubscriptionId?: string | null
) {
  if (currentSubscription?.provider !== "stripe") return true;
  if (!hasStripeSubscriptionId(currentSubscription.providerSubscriptionId) || !hasStripeSubscriptionId(eventSubscriptionId)) return true;

  return currentSubscription.providerSubscriptionId !== eventSubscriptionId;
}
