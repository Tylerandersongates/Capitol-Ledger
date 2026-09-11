import { getTeamAppStoreProducts } from "@/lib/subscription-seat-count";
import type { AccountSubscriptionSnapshot, BillingCycle, SubscriptionPlanId, SubscriptionStatus } from "@/types/capitol";

export type AppStoreEnvironmentName = "Production" | "Sandbox" | "Xcode";

export type AppStoreTransactionLike = {
  appAccountToken?: string;
  bundleId?: string;
  environment?: AppStoreEnvironmentName | string;
  expiresDate?: number;
  inAppOwnershipType?: string;
  isUpgraded?: boolean;
  originalPurchaseDate?: number;
  originalTransactionId?: string;
  productId?: string;
  purchaseDate?: number;
  revocationDate?: number;
  signedDate?: number;
  transactionId?: string;
  type?: string;
};

export const appStoreProducts: Record<
  string,
  {
    cycle: BillingCycle;
    plan: Exclude<SubscriptionPlanId, "free">;
    seatCount?: number;
  }
> = {
  "com.capitolwonk.pro.annual": {
    cycle: "annual",
    plan: "pro"
  },
  "com.capitolwonk.pro.monthly": {
    cycle: "monthly",
    plan: "pro"
  },
  ...Object.fromEntries(
    getTeamAppStoreProducts().map(({ cycle, productId, seatCount }) => [
      productId,
      {
        cycle,
        plan: "team" as const,
        seatCount
      }
    ])
  )
};

export function getAppStoreProduct(productId?: string) {
  return productId ? appStoreProducts[productId] ?? null : null;
}

export function isActiveAppStoreTransaction(payload: AppStoreTransactionLike, now = Date.now()) {
  if (payload.revocationDate && payload.revocationDate <= now) return false;
  return Boolean(payload.expiresDate && Number.isFinite(payload.expiresDate) && payload.expiresDate > now);
}

export function toAppStoreSubscriptionSnapshot(
  payload: AppStoreTransactionLike,
  options: { appleStatus?: number; environment?: Exclude<AppStoreEnvironmentName, "Xcode"> } = {}
): AccountSubscriptionSnapshot {
  const product = getAppStoreProduct(payload.productId);
  const environment =
    options.environment ??
    (payload.environment === "Production" || payload.environment === "Sandbox" ? payload.environment : undefined);
  const naturallyActive = Boolean(environment) && isActiveAppStoreTransaction(payload);
  const active = Boolean(product) && Boolean(environment) && (
    options.appleStatus === undefined
      ? naturallyActive
      : (options.appleStatus === 1 || options.appleStatus === 4) && !payload.revocationDate
  );
  const status: SubscriptionStatus = active ? (options.appleStatus === 4 ? "past_due" : "active") : "canceled";
  const subscriptionId = payload.originalTransactionId || payload.transactionId || "app-store-transaction";

  return {
    cycle: product?.cycle ?? "monthly",
    plan: active ? product?.plan ?? "free" : "free",
    provider: "app-store",
    providerCustomerId: environment ? `app-store-${environment}`.toLowerCase() : "app-store-unverified",
    providerEntitlementId: payload.productId ?? "capitolwonk-free",
    providerSubscriptionId: subscriptionId,
    seatCount: active && product?.plan === "team" ? product.seatCount : undefined,
    status,
    updatedAt: new Date().toISOString()
  };
}
