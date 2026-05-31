"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, Crown, LockKeyhole, Sparkles } from "lucide-react";
import {
  getPlanEntitlements,
  getSubscriptionFeature,
  isPlanFeatureEnabled,
  subscriptionPlanOrder,
  subscriptionPlans,
  type SubscriptionFeatureId
} from "@/lib/subscription-plans";
import type { AccountSubscriptionSnapshot, SubscriptionPlanId } from "@/types/capitol";

const storageKey = "capitol-ledger:subscription";
const subscriptionEvent = "capitol-ledger:subscription-changed";
const accountSubscriptionEndpoint = "/api/account/subscription";
const checkoutEndpoint = "/api/account/subscription/checkout";
let accountHydrationStarted = false;

const planSwitcherLabels: Record<SubscriptionPlanId, string> = {
  free: "Free",
  pro: "Pro",
  team: "Team"
};

const defaultSubscription: AccountSubscriptionSnapshot = {
  cycle: "monthly",
  plan: "free",
  provider: "demo",
  providerCustomerId: "demo-customer",
  providerEntitlementId: "capitol-ledger-free",
  providerSubscriptionId: "demo-free",
  status: "active",
  updatedAt: ""
};

function normalizeSubscription(value: Partial<AccountSubscriptionSnapshot> = {}): AccountSubscriptionSnapshot {
  const plan = value.plan === "pro" || value.plan === "team" ? value.plan : "free";
  const cycle = value.cycle === "annual" ? "annual" : "monthly";
  const provider = value.provider === "stripe" || value.provider === "revenuecat" || value.provider === "app-store" ? value.provider : "demo";
  const status = value.status === "trialing" || value.status === "past_due" || value.status === "canceled" ? value.status : "active";

  return {
    ...defaultSubscription,
    ...value,
    cycle,
    plan,
    provider,
    providerEntitlementId: value.providerEntitlementId ?? `capitol-ledger-${plan}`,
    providerSubscriptionId: value.providerSubscriptionId ?? `demo-${plan}-${cycle}`,
    status
  };
}

function readSubscription(): AccountSubscriptionSnapshot {
  if (typeof window === "undefined") return defaultSubscription;

  try {
    return normalizeSubscription(JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as Partial<AccountSubscriptionSnapshot>);
  } catch {
    return defaultSubscription;
  }
}

function writeSubscription(next: AccountSubscriptionSnapshot, syncAccount = true) {
  window.localStorage.setItem(storageKey, JSON.stringify(next));
  window.dispatchEvent(new Event(subscriptionEvent));

  if (syncAccount) void syncSubscriptionToAccount(next);
}

async function syncSubscriptionToAccount(subscription = readSubscription()) {
  if (typeof window === "undefined") return;

  const response = await fetch(accountSubscriptionEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(subscription)
  }).catch(() => null);

  if (!response?.ok) return;

  const data = (await response.json().catch(() => null)) as { subscription?: AccountSubscriptionSnapshot } | null;
  if (data?.subscription) writeSubscription(normalizeSubscription(data.subscription), false);
}

async function hydrateSubscriptionFromAccount() {
  if (typeof window === "undefined" || accountHydrationStarted) return;
  accountHydrationStarted = true;

  const response = await fetch(accountSubscriptionEndpoint, {
    cache: "no-store"
  }).catch(() => null);

  if (!response?.ok) return;

  const data = (await response.json().catch(() => null)) as { subscription?: AccountSubscriptionSnapshot } | null;
  if (data?.subscription) writeSubscription(normalizeSubscription(data.subscription), false);
}

export function useSubscriptionState() {
  const [subscription, setSubscription] = useState<AccountSubscriptionSnapshot>(defaultSubscription);

  useEffect(() => {
    function refresh() {
      setSubscription(readSubscription());
    }

    refresh();
    void hydrateSubscriptionFromAccount();
    window.addEventListener("storage", refresh);
    window.addEventListener(subscriptionEvent, refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(subscriptionEvent, refresh);
    };
  }, []);

  function updateSubscription(next: Partial<AccountSubscriptionSnapshot>) {
    const updated = normalizeSubscription({
      ...readSubscription(),
      ...next,
      updatedAt: new Date().toISOString()
    });

    writeSubscription(updated);
    setSubscription(updated);
  }

  return [subscription, updateSubscription] as const;
}

function applySubscriptionSnapshot(subscription: AccountSubscriptionSnapshot) {
  const normalized = normalizeSubscription(subscription);
  writeSubscription(normalized, false);
  return normalized;
}

export function BillingCycleToggle() {
  const [subscription, updateSubscription] = useSubscriptionState();

  return (
    <div className="grid grid-cols-2 rounded-full border border-white/10 bg-white/6 p-1 shadow-[inset_0_0_18px_rgba(255,255,255,0.04)] backdrop-blur-xl">
      {(["monthly", "annual"] as const).map((cycle) => {
        const active = subscription.cycle === cycle;
        return (
          <button
            key={cycle}
            type="button"
            onClick={() => updateSubscription({ cycle })}
            className={`h-10 rounded-full text-[14px] font-semibold capitalize transition ${active ? "bg-[#ffb12b] text-[#061126] shadow-[0_0_18px_rgba(255,177,43,0.18)]" : "text-white/58"}`}
            aria-pressed={active}
          >
            {cycle === "monthly" ? "Monthly" : "Annual"}
          </button>
        );
      })}
    </div>
  );
}

export function PlanPrice({ plan }: { plan: SubscriptionPlanId }) {
  const [subscription] = useSubscriptionState();
  const planDetails = subscriptionPlans[plan];
  const price = subscription.cycle === "annual" ? planDetails.pricing.annual : planDetails.pricing.monthly;
  const unit = plan === "free" ? "" : subscription.cycle === "annual" ? (plan === "team" ? "/ seat / year" : "/ year") : planDetails.pricing.unit;

  return (
    <div className="mt-5 flex items-end gap-2">
      <span className={`${plan === "team" ? "text-[48px]" : plan === "free" ? "text-[46px] text-white" : "text-[54px]"} font-semibold leading-none text-[#ffb12b]`}>
        {price}
      </span>
      {unit ? <span className="pb-2 text-[17px] text-white/56">{unit}</span> : null}
    </div>
  );
}

export function PlanActionButton({
  className,
  inactiveLabel,
  plan
}: {
  className: string;
  inactiveLabel: string;
  plan: SubscriptionPlanId;
}) {
  const [subscription, updateSubscription] = useSubscriptionState();
  const [pending, setPending] = useState(false);
  const active = subscription.plan === plan;

  async function handlePlanAction() {
    if (active || pending) return;
    setPending(true);

    const fallbackSubscription = normalizeSubscription({
      ...subscription,
      plan,
      updatedAt: new Date().toISOString()
    });

    try {
      const response = await fetch(checkoutEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          cycle: subscription.cycle,
          plan
        })
      });

      if (!response.ok) {
        updateSubscription({ plan });
        return;
      }

      const data = (await response.json()) as {
        checkoutMode?: "demo" | "stripe";
        checkoutUrl?: string;
        subscription?: AccountSubscriptionSnapshot;
      };

      if (data.checkoutMode === "stripe" && data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }

      if (data.subscription) {
        applySubscriptionSnapshot(data.subscription);
        return;
      }

      applySubscriptionSnapshot(fallbackSubscription);
    } catch {
      updateSubscription({ plan });
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" onClick={handlePlanAction} className={className} aria-pressed={active} disabled={pending}>
      {pending ? "Preparing..." : active ? "Current Plan" : inactiveLabel}
    </button>
  );
}

export function AccountSubscriptionSummary() {
  const [subscription] = useSubscriptionState();
  const plan = subscriptionPlans[subscription.plan];
  const price = subscription.cycle === "annual" ? plan.pricing.annual : plan.pricing.monthly;
  const cycleLabel = subscription.cycle === "annual" ? "annual" : "monthly";
  const providerLabel = subscription.provider === "demo" ? "Demo billing record" : `${subscription.provider} billing record`;

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] font-medium uppercase tracking-wide text-white/50">Current Plan</div>
          <h2 className="mt-2 text-[21px] font-medium leading-none">{plan.name}</h2>
          <p className="mt-3 text-[15px] text-white/58">
            {price} {cycleLabel} - {plan.description}
          </p>
          <div className="mt-3 inline-flex rounded-full border border-[#43ed74]/28 bg-[#43ed74]/10 px-3 py-1 text-[12px] font-medium text-[#43ed74]">
            {providerLabel}
          </div>
        </div>
        <Crown className="h-8 w-8 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
      </div>
      <Link href="/upgrade" className="mt-5 flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[17px] font-semibold text-[#071225] shadow-[0_0_24px_rgba(255,177,43,0.22)]">
        Manage Subscription
      </Link>
    </>
  );
}

export function SubscriptionBadge() {
  const [subscription] = useSubscriptionState();

  return (
    <Link href="/upgrade" className="mt-3 inline-flex max-w-full items-center gap-2 truncate rounded-full border border-rust/35 bg-rust/10 px-3 py-1 text-[12px] font-medium text-[#ffb12b]">
      <Crown className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
      Capitol Ledger {subscriptionPlans[subscription.plan].name}
    </Link>
  );
}

export function SubscriptionDemoSwitcher({ showPreview = true }: { showPreview?: boolean }) {
  const [subscription, updateSubscription] = useSubscriptionState();
  const entitlements = getPlanEntitlements(subscription.plan);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] font-medium uppercase tracking-wide text-white/50">Subscription Demo</div>
          <h2 className="mt-2 text-[21px] font-medium leading-none">{subscriptionPlans[subscription.plan].name}</h2>
          <p className="mt-3 text-[14px] leading-snug text-white/56">
            Switch modes to preview how locked and unlocked features behave.
          </p>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-rust/35 bg-rust/10 text-[#ffb12b]">
          <Sparkles className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 rounded-full border border-white/10 bg-white/6 p-1 shadow-[inset_0_0_18px_rgba(255,255,255,0.04)] backdrop-blur-xl">
        {subscriptionPlanOrder.map((plan) => {
          const active = subscription.plan === plan;

          return (
            <button
              key={plan}
              type="button"
              onClick={() => updateSubscription({ plan })}
              className={`h-10 rounded-full px-2 text-center text-[13px] font-semibold leading-none transition ${
                active ? "bg-[#ffb12b] text-[#061126] shadow-[0_0_18px_rgba(255,177,43,0.24)]" : "text-white/58"
              }`}
              aria-pressed={active}
            >
              {planSwitcherLabels[plan]}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 text-[13px] leading-snug text-white/58">
        {subscriptionPlans[subscription.plan].demoUseCase}
      </div>

      {showPreview ? (
        <div className="mt-5 grid gap-3">
          <div className="rounded-2xl border border-[#43ed74]/16 bg-[#43ed74]/8 p-4">
            <div className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-wide text-[#43ed74]">
              <Check className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              Unlocked in this mode
            </div>
            <div className="mt-3 space-y-2">
              {entitlements.included.slice(0, 4).map((feature) => (
                <div key={feature.id} className="text-[14px] leading-snug text-white/70">
                  {feature.label}
                </div>
              ))}
            </div>
          </div>

          {entitlements.locked.length ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
              <div className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-wide text-white/42">
                <LockKeyhole className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                Locked preview
              </div>
              <div className="mt-3 space-y-2">
                {entitlements.locked.slice(0, 3).map((feature) => (
                  <div key={feature.id} className="text-[14px] leading-snug text-white/48">
                    {feature.label}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function PlanFeatureGate({
  children,
  fallback,
  feature
}: {
  children: ReactNode;
  fallback?: ReactNode;
  feature: SubscriptionFeatureId;
}) {
  const [subscription] = useSubscriptionState();

  if (isPlanFeatureEnabled(subscription.plan, feature)) return <>{children}</>;
  return fallback ?? <LockedPlanPreview feature={feature} />;
}

function LockedPlanPreview({ feature }: { feature: SubscriptionFeatureId }) {
  const featureEntitlement = getSubscriptionFeature(feature);
  const minimumPlan = featureEntitlement ? subscriptionPlans[featureEntitlement.minimumPlan].name : "a higher plan";

  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-[#061a33]/76 p-5 shadow-[inset_0_0_24px_rgba(43,141,255,0.06),0_18px_42px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-rust/30 bg-rust/10 text-[#ffb12b]">
          <LockKeyhole className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="text-[12px] font-medium uppercase tracking-wide text-white/45">Locked preview</div>
          <h3 className="mt-1 text-[18px] font-medium leading-tight text-white">{featureEntitlement?.label ?? "Premium feature"}</h3>
          <p className="mt-2 text-[14px] leading-snug text-white/56">
            {featureEntitlement?.description ?? "This feature is available on an upgraded Capitol Ledger plan."}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3">
        <span className="text-[13px] font-medium text-white/52">Unlocks with {minimumPlan}</span>
        <Link href="/upgrade" className="shrink-0 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-[13px] font-medium text-[#ffb12b]">
          View plans
        </Link>
      </div>
    </div>
  );
}
