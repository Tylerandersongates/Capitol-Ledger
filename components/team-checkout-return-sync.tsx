"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

const subscriptionStorageKey = "capitol-ledger:subscription";
const subscriptionEvent = "capitol-ledger:subscription-changed";

function hasActiveTeamAccess(subscription?: AccountSubscriptionSnapshot) {
  return subscription?.plan === "team" && (subscription.status === "active" || subscription.status === "trialing");
}

function writeBrowserSubscription(subscription: AccountSubscriptionSnapshot) {
  window.localStorage.setItem(subscriptionStorageKey, JSON.stringify(subscription));
  window.dispatchEvent(new CustomEvent(subscriptionEvent, { detail: subscription }));
}

export function TeamCheckoutReturnSync() {
  const router = useRouter();
  const [status, setStatus] = useState("Checking Stripe subscription...");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function refreshSubscription() {
      attempts += 1;
      const response = await fetch("/api/account/subscription", { cache: "no-store" }).catch(() => null);
      const data = response?.ok ? ((await response.json().catch(() => null)) as { subscription?: AccountSubscriptionSnapshot } | null) : null;
      const subscription = data?.subscription;

      if (cancelled) return;

      if (hasActiveTeamAccess(subscription)) {
        writeBrowserSubscription(subscription);
        setReady(true);
        setStatus("Team plan active. Opening workspace...");
        router.replace("/team");
        router.refresh();
        return;
      }

      if (attempts >= 12) {
        setStatus("Stripe is still finalizing the Team subscription. Refresh this page in a few seconds.");
        return;
      }

      setStatus(attempts < 3 ? "Checking Stripe subscription..." : "Waiting for Stripe webhook...");
      timeoutId = window.setTimeout(refreshSubscription, 1000);
    }

    void refreshSubscription();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [router]);

  return (
    <div className="mt-5 rounded-2xl border border-[#ffb12b]/22 bg-[#ffb12b]/10 px-4 py-3">
      <div className="flex items-center gap-3 text-[13px] font-semibold text-[#ffcf54]">
        {ready ? <CheckCircle2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> : <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" />}
        {status}
      </div>
    </div>
  );
}
