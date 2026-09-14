"use client";

import { useEffect } from "react";
import { isBrowserAccountDeletionFenced } from "@/lib/browser-auth-state";
import {
  requestNativePendingStoreKitSync,
  syncNativeAppStoreResult,
  type NativeAppStoreDeliveryAcknowledgement,
  type NativeStoreKitResult
} from "@/lib/native-storekit-sync";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

const nativePurchaseResultEvent = "capitol-ledger:native-purchase-result";
const subscriptionEvent = "capitol-ledger:subscription-changed";
const subscriptionStorageKey = "capitol-ledger:subscription";

const failClosedSubscription = (): AccountSubscriptionSnapshot => ({
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
  interface Window {
    __capitolWonkSyncAppStoreResult?: (
      result: NativeStoreKitResult
    ) => Promise<NativeAppStoreDeliveryAcknowledgement>;
  }
}

function publishResult(result: NativeStoreKitResult & Record<string, unknown>) {
  if (isBrowserAccountDeletionFenced()) return false;
  const publicResult = { ...result };
  delete publicResult.signedTransactionJWS;

  if (publicResult.subscription) {
    try {
      window.localStorage.setItem(subscriptionStorageKey, JSON.stringify(publicResult.subscription));
    } catch {
      // The in-document event still updates mounted controls when storage is unavailable.
    }
    window.dispatchEvent(new CustomEvent(subscriptionEvent, { detail: publicResult.subscription }));
  }
  window.dispatchEvent(new CustomEvent(nativePurchaseResultEvent, { detail: publicResult }));
  return true;
}

async function readAuthoritativeSubscription() {
  try {
    const response = await fetch("/api/account/subscription?scope=effective", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({})) as { subscription?: AccountSubscriptionSnapshot };
    return response.ok && data.subscription ? data.subscription : failClosedSubscription();
  } catch {
    return failClosedSubscription();
  }
}

export function NativeStoreKitSyncBridge() {
  useEffect(() => {
    const sync = (result: NativeStoreKitResult) => syncNativeAppStoreResult(result, {
      accountDeletionFenceActive: isBrowserAccountDeletionFenced,
      publishResult,
      readAuthoritativeSubscription,
      requestSync: async (input) => {
        const response = await fetch("/api/account/subscription/app-store", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input)
        });
        return {
          data: await response.json().catch(() => ({})) as Record<string, unknown>,
          ok: response.ok
        };
      }
    });
    window.__capitolWonkSyncAppStoreResult = sync;

    const requestPendingSync = () => requestNativePendingStoreKitSync();
    window.addEventListener("online", requestPendingSync);
    requestPendingSync();

    return () => {
      window.removeEventListener("online", requestPendingSync);
      if (window.__capitolWonkSyncAppStoreResult === sync) {
        delete window.__capitolWonkSyncAppStoreResult;
      }
    };
  }, []);

  return null;
}
