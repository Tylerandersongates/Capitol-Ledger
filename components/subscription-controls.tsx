"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Bell, Check, Crown, ListChecks, LockKeyhole, Minus, Plus, ShieldCheck, Sparkles, UserPlus, UsersRound } from "lucide-react";
import {
  getPlanEntitlements,
  getSubscriptionFeature,
  isPlanFeatureEnabled,
  subscriptionPlanOrder,
  subscriptionPlans,
  type SubscriptionFeatureId
} from "@/lib/subscription-plans";
import { hasActiveBrowserSession } from "@/lib/browser-auth-state";
import { minimumTeamSeatCount, normalizeOptionalTeamSeatCount, normalizeTeamSeatCount } from "@/lib/subscription-seat-count";
import type { AccountSubscriptionSnapshot, SubscriptionPlanId } from "@/types/capitol";

const storageKey = "capitol-ledger:subscription";
const subscriptionEvent = "capitol-ledger:subscription-changed";
const accountSubscriptionEndpoint = "/api/account/subscription";
const checkoutEndpoint = "/api/account/subscription/checkout";
let accountHydrationPromise: Promise<AccountSubscriptionSnapshot | null> | null = null;

const planSwitcherLabels: Record<SubscriptionPlanId, string> = {
  free: "Free",
  pro: "Pro",
  team: "Team"
};

const teamWorkspaceSignals = [
  {
    detail: "Checkout quantity sets the paid workspace capacity.",
    icon: <ListChecks />,
    label: "Seat-managed setup",
    value: "3+"
  },
  {
    detail: "The Team buyer owns setup, billing, and access rollout.",
    icon: <Bell />,
    label: "Owner controls",
    value: "Ready"
  },
  {
    detail: "Watchlists, alerts, and roles are the next shared-workspace layer.",
    icon: <ShieldCheck />,
    label: "Shared records",
    value: "Next"
  }
];

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
    seatCount: normalizeOptionalTeamSeatCount(value.seatCount),
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
  window.dispatchEvent(new CustomEvent(subscriptionEvent, { detail: next }));

  if (syncAccount) void syncSubscriptionToAccount(next);
}

function subscriptionsMatch(left: AccountSubscriptionSnapshot, right: AccountSubscriptionSnapshot) {
  return (
    left.cycle === right.cycle &&
    left.plan === right.plan &&
    left.provider === right.provider &&
    left.providerCustomerId === right.providerCustomerId &&
    left.providerEntitlementId === right.providerEntitlementId &&
    left.providerSubscriptionId === right.providerSubscriptionId &&
    normalizeOptionalTeamSeatCount(left.seatCount) === normalizeOptionalTeamSeatCount(right.seatCount) &&
    left.status === right.status
  );
}

async function syncSubscriptionToAccount(subscription = readSubscription()) {
  if (typeof window === "undefined") return;
  if (!(await hasActiveBrowserSession())) return;

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
  if (typeof window === "undefined") return null;
  if (!(await hasActiveBrowserSession())) return null;

  if (!accountHydrationPromise) {
    accountHydrationPromise = fetch(accountSubscriptionEndpoint, {
      cache: "no-store"
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = (await response.json().catch(() => null)) as { subscription?: AccountSubscriptionSnapshot } | null;
        return data?.subscription ? normalizeSubscription(data.subscription) : null;
      })
      .catch(() => null)
      .finally(() => {
        accountHydrationPromise = null;
      });
  }

  const subscription = await accountHydrationPromise;
  if (!subscription) return null;

  if (!subscriptionsMatch(readSubscription(), subscription)) writeSubscription(subscription, false);
  return subscription;
}

export function useSubscriptionState() {
  const [subscription, setSubscription] = useState<AccountSubscriptionSnapshot>(defaultSubscription);

  useEffect(() => {
    let active = true;

    async function refresh() {
      if (await hasActiveBrowserSession()) {
        const accountSubscription = await hydrateSubscriptionFromAccount();
        if (active) setSubscription(accountSubscription ?? defaultSubscription);
        return;
      }

      if (active) setSubscription(readSubscription());
    }

    void refresh();

    function refreshSubscription(event?: Event) {
      if (event instanceof CustomEvent && event.detail) {
        setSubscription(normalizeSubscription(event.detail as Partial<AccountSubscriptionSnapshot>));
        return;
      }

      void refresh();
    }

    window.addEventListener("storage", refreshSubscription);
    window.addEventListener(subscriptionEvent, refreshSubscription);

    return () => {
      active = false;
      window.removeEventListener("storage", refreshSubscription);
      window.removeEventListener(subscriptionEvent, refreshSubscription);
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
    <div className="grid grid-cols-2 rounded-full border border-white/12 bg-white/[0.07] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.11)] backdrop-blur-xl">
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

export function PlanPrice({
  className = "mt-5 flex items-end gap-2",
  plan,
  priceClassName,
  unitClassName = "pb-2 text-[17px] text-white/56"
}: {
  className?: string;
  plan: SubscriptionPlanId;
  priceClassName?: string;
  unitClassName?: string;
}) {
  const [subscription] = useSubscriptionState();
  const planDetails = subscriptionPlans[plan];
  const price = subscription.cycle === "annual" ? planDetails.pricing.annual : planDetails.pricing.monthly;
  const unit = plan === "free" ? "" : subscription.cycle === "annual" ? (plan === "team" ? "/ seat / year" : "/ year") : planDetails.pricing.unit;

  return (
    <div className={className}>
      <span className={priceClassName ?? `${plan === "team" ? "text-[48px]" : plan === "free" ? "text-[46px] text-white" : "text-[54px]"} font-semibold leading-none text-[#ffb12b]`}>
        {price}
      </span>
      {unit ? <span className={unitClassName}>{unit}</span> : null}
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
      seatCount: plan === "team" ? normalizeTeamSeatCount(subscription.seatCount) : subscription.seatCount,
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
          plan,
          seatCount: plan === "team" ? normalizeTeamSeatCount(subscription.seatCount) : undefined
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
  const seatCount = subscription.plan === "team" ? normalizeTeamSeatCount(subscription.seatCount) : undefined;

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] font-medium uppercase tracking-wide text-white/50">Current Plan</div>
          <h2 className="mt-2 text-[21px] font-medium leading-none">{plan.name}</h2>
          <p className="mt-3 text-[15px] text-white/58">
            {price} {cycleLabel} - {plan.description}
            {seatCount ? ` - ${seatCount} seats` : ""}
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
  const planName = subscriptionPlans[subscription.plan].name;

  return (
    <Link
      href="/upgrade"
      aria-label={`Manage Capitol Ledger ${planName}`}
      className="mt-3 inline-flex max-w-full items-center gap-1.5 overflow-hidden rounded-full border border-rust/35 bg-rust/10 px-3 py-1 text-[12px] font-medium text-[#ffb12b]"
    >
      <Crown className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
      <span className="min-w-0 truncate">{planName}</span>
    </Link>
  );
}

export function SubscriptionDemoSwitcher({ showPreview = true }: { showPreview?: boolean }) {
  const [subscription, updateSubscription] = useSubscriptionState();
  const entitlements = getPlanEntitlements(subscription.plan);

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46">Plan Preview</div>
          <h2 className="mt-2 text-[22px] font-medium leading-tight text-white">{subscriptionPlans[subscription.plan].name}</h2>
          <p className="mt-2 text-[13px] leading-snug text-white/54">
            Switch modes to preview how locked and unlocked features behave.
          </p>
        </div>
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/14 bg-white/8 text-[#ffb12b] shadow-[0_12px_28px_rgba(1,8,24,0.3)]">
          <Sparkles className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 rounded-full border border-white/12 bg-white/[0.07] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.11)] backdrop-blur-xl">
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

      <div className="mt-4 rounded-2xl border border-white/10 bg-[#071a38]/62 px-4 py-3 text-[13px] leading-snug text-white/56 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
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

export function TeamSeatSelector({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const [subscription, updateSubscription] = useSubscriptionState();
  const seatCount = normalizeTeamSeatCount(subscription.seatCount);
  const pricePerSeat = subscription.cycle === "annual" ? 59.99 : 5.99;
  const totalPrice = formatCurrency(pricePerSeat * seatCount);
  const seatUnit = subscription.cycle === "annual" ? "seat / year" : "seat / month";
  const totalUnit = subscription.cycle === "annual" ? "workspace / year" : "workspace / month";

  function updateSeatCount(value: unknown) {
    updateSubscription({ seatCount: normalizeTeamSeatCount(value) });
  }

  return (
    <div className={`${className} rounded-2xl border border-white/10 bg-[#071a38]/62 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/42">Checkout quantity</div>
          <div className="mt-1 text-[13px] leading-snug text-white/56">Billed per seat in Stripe. Minimum {minimumTeamSeatCount} seats.</div>
        </div>
        <span className="shrink-0 rounded-full border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-3 py-1.5 text-[11px] font-semibold text-[#ffb12b]">
          {seatCount} seats
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2">
        <button
          type="button"
          onClick={() => updateSeatCount(seatCount - 1)}
          disabled={seatCount <= minimumTeamSeatCount}
          aria-label="Decrease team seats"
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-white/62 transition hover:text-white disabled:opacity-35"
        >
          <Minus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
        <input
          type="number"
          min={minimumTeamSeatCount}
          step={1}
          value={seatCount}
          onChange={(event) => updateSeatCount(event.target.value)}
          aria-label="Team seats"
          className="h-10 min-w-0 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-center text-[15px] font-semibold text-white outline-none transition focus:border-[#ffb12b]/60"
        />
        <button
          type="button"
          onClick={() => updateSeatCount(seatCount + 1)}
          aria-label="Increase team seats"
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-white/62 transition hover:text-white"
        >
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <div className={`${compact ? "mt-3" : "mt-4"} grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(25,73,130,0.28)_0%,rgba(6,22,49,0.72)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]`}>
        <div className="min-w-0">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/42">Estimated total</div>
          <div className="mt-1 text-[12px] leading-snug text-white/48">
            Stripe quantity {seatCount} x {formatCurrency(pricePerSeat)} / {seatUnit}
          </div>
        </div>
        <div className="text-right">
          <div className={`${compact ? "text-[22px]" : "text-[26px]"} font-semibold leading-none text-[#ffb12b]`}>{totalPrice}</div>
          <div className="mt-1 text-[11px] text-white/42">/ {totalUnit}</div>
        </div>
      </div>
    </div>
  );
}

export function TeamWorkspacePreview() {
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46">Team Workspace</div>
          <h2 className="mt-2 text-[22px] font-medium leading-tight text-white">Coordinate civic monitoring together</h2>
          <p className="mt-2 text-[13px] leading-snug text-white/54">
            Built for campaigns, nonprofits, advocacy teams, local offices, and civic groups that need one shared view of bills,
            officials, issues, and alerts.
          </p>
        </div>
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/14 bg-white/8 text-[#ffb12b] shadow-[0_12px_28px_rgba(1,8,24,0.3)]">
          <UsersRound className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        {teamWorkspaceSignals.map((item) => (
          <div key={item.label} className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-[#ffb12b] [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[1.8]">
              {item.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-white">{item.label}</span>
              <span className="mt-1 block text-[12px] leading-snug text-white/48">{item.detail}</span>
            </span>
            <span className="text-[18px] font-semibold text-[#ffb12b]">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-[34px_minmax(0,1fr)] gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-[13px] leading-snug text-white/54">
        <span className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.045] text-[#ffb12b]">
          <UserPlus className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span>
          Team checkout now opens workspace setup. Invite flow and shared records are the next rollout layer.
        </span>
      </div>

      <Link
        href="/team"
        className="mt-4 flex h-11 items-center justify-center rounded-xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[14px] font-semibold text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:brightness-110"
      >
        Open Team Workspace
      </Link>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    style: "currency"
  }).format(value);
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
    <div className="rounded-[1.35rem] border border-white/12 bg-[linear-gradient(180deg,rgba(12,48,90,0.5)_0%,rgba(3,17,40,0.8)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.11),inset_0_0_30px_rgba(43,141,255,0.07),0_20px_44px_rgba(0,0,0,0.3)] backdrop-blur-xl">
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
      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.2)_0%,rgba(7,23,50,0.64)_100%)] px-4 py-3">
        <span className="text-[13px] font-medium text-white/52">Unlocks with {minimumPlan}</span>
        <Link
          href="/upgrade"
          className="shrink-0 rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(26,73,127,0.28)_0%,rgba(6,25,55,0.66)_100%)] px-4 py-2 text-[13px] font-medium text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_10px_24px_rgba(1,8,24,0.42)] transition hover:brightness-110"
        >
          View plans
        </Link>
      </div>
    </div>
  );
}
