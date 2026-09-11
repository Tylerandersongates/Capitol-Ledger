import type { AccountSubscriptionSnapshot } from "@/types/capitol";
import { getAppStoreProduct } from "@/lib/billing/app-store-products";

export const appleSubscriptionManagementUrl = "https://apps.apple.com/account/subscriptions";

type AppleSubscriptionManagementWindow = Window & {
  capitolLedgerPurchase?: { postMessage: (message: { action: "manage" }) => void };
  webkit?: {
    messageHandlers?: {
      capitolLedgerPurchase?: { postMessage: (message: { action: "manage" }) => void };
    };
  };
};

export function openAppleSubscriptionManagement() {
  if (typeof window === "undefined") return false;

  const nativeWindow = window as AppleSubscriptionManagementWindow;
  const bridge =
    nativeWindow.webkit?.messageHandlers?.capitolLedgerPurchase ??
    nativeWindow.capitolLedgerPurchase;
  if (bridge) {
    bridge.postMessage({ action: "manage" });
    return true;
  }

  window.location.assign(appleSubscriptionManagementUrl);
  return true;
}

const activePersonalSubscriptionStatuses = new Set<AccountSubscriptionSnapshot["status"]>([
  "active",
  "trialing",
  "past_due"
]);

export function hasActivePersonalAppStorePro(
  subscription?: Pick<AccountSubscriptionSnapshot, "plan" | "provider" | "status"> | null
) {
  return Boolean(
    subscription &&
      subscription.plan === "pro" &&
      subscription.provider === "app-store" &&
      activePersonalSubscriptionStatuses.has(subscription.status)
  );
}

export function requiresAppleTeamBillingAcknowledgement(
  subscription?: Pick<
    AccountSubscriptionSnapshot,
    "plan" | "provider" | "providerEntitlementId" | "status"
  > | null,
  state?: { appleStatus?: number; productId?: string } | null
) {
  if (!subscription || subscription.provider !== "app-store") return false;

  const product = getAppStoreProduct(state?.productId ?? subscription.providerEntitlementId);
  const personalProLineage = product?.plan === "pro" || subscription.plan === "pro";
  if (!personalProLineage) return false;

  if (state?.appleStatus !== undefined) {
    return state.appleStatus !== 2 && state.appleStatus !== 5;
  }

  // Without canonical state, fail safely toward disclosure: a stored Apple Pro
  // lineage may still be in billing retry even when its access projection is Free.
  return true;
}
