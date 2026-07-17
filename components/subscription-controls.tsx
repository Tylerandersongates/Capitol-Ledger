"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Bell, Crown, ListChecks, LockKeyhole, Minus, Plus, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import {
  getSubscriptionFeature,
  isPlanFeatureEnabled,
  subscriptionPlans,
  type SubscriptionFeatureId
} from "@/lib/subscription-plans";
import { publicBrand } from "@/lib/brand";
import { hasActiveBrowserSession } from "@/lib/browser-auth-state";
import {
  formatTeamSeatPrice,
  getTeamAppStoreProductId,
  getMaximumTeamSeatCount,
  maximumTeamSeatCount,
  maximumAnnualTeamSeatCount,
  minimumTeamSeatCount,
  normalizeOptionalTeamSeatCount,
  normalizeTeamSeatCountForCycle,
  teamAnnualSeatReferencePrice,
  teamMonthlySeatReferencePrice
} from "@/lib/subscription-seat-count";
import type { AccountSubscriptionSnapshot, SubscriptionPlanId } from "@/types/capitol";

const storageKey = "capitol-ledger:subscription";
const subscriptionEvent = "capitol-ledger:subscription-changed";
const nativePurchaseResultEvent = "capitol-ledger:native-purchase-result";
const accountSubscriptionEndpoint = "/api/account/subscription";
const appStoreAccountTokenEndpoint = "/api/account/subscription/app-store/account-token";
type SubscriptionHydrationScope = "effective" | "personal";
type SubscriptionDefaultCycle = AccountSubscriptionSnapshot["cycle"];
let accountHydrationPromises: Partial<Record<SubscriptionHydrationScope, Promise<AccountSubscriptionSnapshot | null>>> = {};
let appStoreAccountTokenPromise: Promise<string | null> | undefined;

type NativePurchaseMessage =
  | {
      action: "purchase";
      cycle: SubscriptionDefaultCycle;
      plan: Exclude<SubscriptionPlanId, "free">;
      productId: string;
      appAccountToken?: string;
      seatCount?: number;
    }
  | { action: "restore" }
  | { action: "manage" };

type NativePurchaseBridge = {
  postMessage(message: NativePurchaseMessage): void;
};

type NativePurchaseResult = {
  action: "entitlement" | "manage" | "purchase" | "restore" | string;
  message?: string;
  ok: boolean;
  productId?: string;
  serverSynced?: boolean;
  subscription?: AccountSubscriptionSnapshot;
};

declare global {
  interface Window {
    __capitolLedgerNativeStoreKit?: boolean;
    capitolLedgerPurchase?: NativePurchaseBridge;
    webkit?: {
      messageHandlers?: {
        capitolLedgerPurchase?: NativePurchaseBridge;
      };
    };
  }
}

const proAppStoreProductIds: Record<SubscriptionDefaultCycle, string> = {
  annual: "com.capitolwonk.pro.annual",
  monthly: "com.capitolwonk.pro.monthly"
};

const teamWorkspaceSignals = [
  {
    detail: `Choose ${minimumTeamSeatCount}-${maximumTeamSeatCount} monthly or ${minimumTeamSeatCount}-${maximumAnnualTeamSeatCount} annual teammate seats.`,
    icon: <ListChecks />,
    label: "Team seats",
    value: `${minimumTeamSeatCount}-${maximumTeamSeatCount}`
  },
  {
    detail: "The owner manages subscription access and invites.",
    icon: <Bell />,
    label: "Owner access",
    value: "Included"
  },
  {
    detail: "Pending invites reserve a seat until accepted.",
    icon: <ShieldCheck />,
    label: "Invites",
    value: "Tracked"
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

function shouldPreferNativeStoreKitSubscription(subscription: AccountSubscriptionSnapshot) {
  return Boolean(typeof window !== "undefined" && window.__capitolLedgerNativeStoreKit && subscription.provider === "app-store");
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

function applyDefaultCycle(subscription: AccountSubscriptionSnapshot, defaultCycle?: SubscriptionDefaultCycle) {
  if (!defaultCycle || subscription.cycle === defaultCycle) return subscription;

  return normalizeSubscription({
    ...subscription,
    cycle: defaultCycle
  });
}

async function syncSubscriptionToAccount(subscription = readSubscription()) {
  if (typeof window === "undefined") return;
  if (!(await hasActiveBrowserSession())) return;
  if (subscription.plan !== "free" || subscription.provider !== "demo") return;

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

async function hydrateSubscriptionFromAccount(scope: SubscriptionHydrationScope) {
  if (typeof window === "undefined") return null;
  if (!(await hasActiveBrowserSession())) return null;

  if (!accountHydrationPromises[scope]) {
    const endpoint = scope === "effective" ? `${accountSubscriptionEndpoint}?scope=effective` : accountSubscriptionEndpoint;
    accountHydrationPromises[scope] = fetch(endpoint, {
      cache: "no-store"
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = (await response.json().catch(() => null)) as { subscription?: AccountSubscriptionSnapshot } | null;
        return data?.subscription ? normalizeSubscription(data.subscription) : null;
      })
      .catch(() => null)
      .finally(() => {
        accountHydrationPromises = {
          ...accountHydrationPromises,
          [scope]: undefined
        };
      });
  }

  const subscription = await accountHydrationPromises[scope];
  if (!subscription) return null;

  if (!subscriptionsMatch(readSubscription(), subscription)) writeSubscription(subscription, false);
  return subscription;
}

async function readAppStoreAccountToken() {
  if (typeof window === "undefined") return null;
  if (!(await hasActiveBrowserSession())) return null;

  if (!appStoreAccountTokenPromise) {
    appStoreAccountTokenPromise = fetch(appStoreAccountTokenEndpoint, {
      cache: "no-store"
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = (await response.json().catch(() => null)) as { appAccountToken?: string } | null;
        return data?.appAccountToken ?? null;
      })
      .catch(() => null)
      .finally(() => {
        appStoreAccountTokenPromise = undefined;
      });
  }

  return appStoreAccountTokenPromise;
}

export function useSubscriptionState(
  initialSubscription?: AccountSubscriptionSnapshot | null,
  options: { defaultCycle?: SubscriptionDefaultCycle; scope?: SubscriptionHydrationScope } = {}
) {
  const [subscription, setSubscription] = useState<AccountSubscriptionSnapshot>(() => applyDefaultCycle(normalizeSubscription(initialSubscription ?? defaultSubscription), options.defaultCycle));
  const defaultCycle = options.defaultCycle;
  const scope = options.scope ?? "personal";

  useEffect(() => {
    let active = true;
    const normalizedInitialSubscription = initialSubscription ? applyDefaultCycle(normalizeSubscription(initialSubscription), defaultCycle) : null;

    function publishDefaultCycle(nextSubscription: AccountSubscriptionSnapshot) {
      const next = applyDefaultCycle(nextSubscription, defaultCycle);
      if (!subscriptionsMatch(readSubscription(), next)) writeSubscription(next, false);
      return next;
    }

    async function refresh() {
      const nativeSubscription = readSubscription();
      if (shouldPreferNativeStoreKitSubscription(nativeSubscription)) {
        const nextSubscription = publishDefaultCycle(nativeSubscription);
        if (active) setSubscription(nextSubscription);
        return;
      }

      if (normalizedInitialSubscription && !subscriptionsMatch(readSubscription(), normalizedInitialSubscription)) {
        writeSubscription(normalizedInitialSubscription, false);
      }

      if (await hasActiveBrowserSession()) {
        const accountSubscription = await hydrateSubscriptionFromAccount(scope);
        const refreshedNativeSubscription = readSubscription();
        if (shouldPreferNativeStoreKitSubscription(refreshedNativeSubscription)) {
          const nextSubscription = publishDefaultCycle(refreshedNativeSubscription);
          if (active) setSubscription(nextSubscription);
          return;
        }

        const nextSubscription = publishDefaultCycle(accountSubscription ?? normalizedInitialSubscription ?? defaultSubscription);
        if (active) setSubscription(nextSubscription);
        return;
      }

      const nextSubscription = publishDefaultCycle(normalizedInitialSubscription ?? readSubscription());
      if (active) setSubscription(nextSubscription);
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
  }, [defaultCycle, initialSubscription, scope]);

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

function postNativePurchaseMessage(message: NativePurchaseMessage) {
  if (typeof window === "undefined") return false;

  const webkitBridge = window.webkit?.messageHandlers?.capitolLedgerPurchase;
  if (webkitBridge) {
    webkitBridge.postMessage(message);
    return true;
  }

  if (window.capitolLedgerPurchase) {
    window.capitolLedgerPurchase.postMessage(message);
    return true;
  }

  return false;
}

export function BillingCycleToggle({
  defaultCycle,
  initialSubscription = null
}: {
  defaultCycle?: SubscriptionDefaultCycle;
  initialSubscription?: AccountSubscriptionSnapshot | null;
}) {
  const [subscription, updateSubscription] = useSubscriptionState(initialSubscription, { defaultCycle });

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
  defaultCycle,
  plan,
  priceClassName,
  unitClassName = "pb-2 text-[17px] text-white/56",
  initialSubscription = null
}: {
  className?: string;
  defaultCycle?: SubscriptionDefaultCycle;
  initialSubscription?: AccountSubscriptionSnapshot | null;
  plan: SubscriptionPlanId;
  priceClassName?: string;
  unitClassName?: string;
}) {
  const [subscription] = useSubscriptionState(initialSubscription, { defaultCycle });
  const planDetails = subscriptionPlans[plan];
  const price = subscription.cycle === "annual" ? planDetails.pricing.annual : planDetails.pricing.monthly;
  const unit =
    plan === "free"
      ? ""
      : plan === "team"
        ? subscription.cycle === "annual"
          ? "/ seat / year, min 3"
          : "/ seat / month, min 3"
        : subscription.cycle === "annual"
          ? "/ year"
          : planDetails.pricing.unit;

  return (
    <div className={className}>
      <span className={priceClassName ?? `${plan === "team" ? "text-[48px]" : plan === "free" ? "text-[46px] text-white" : "text-[54px]"} font-semibold leading-none text-[#ffb12b]`}>
        {price}
      </span>
      {unit ? <span className={unitClassName}>{unit}</span> : null}
    </div>
  );
}

export function PlanTrialDisclosure({
  defaultCycle,
  initialSubscription = null,
  plan
}: {
  defaultCycle?: SubscriptionDefaultCycle;
  initialSubscription?: AccountSubscriptionSnapshot | null;
  plan: SubscriptionPlanId;
}) {
  const [subscription] = useSubscriptionState(initialSubscription, { defaultCycle });
  const trial = subscriptionPlans[plan].trial;
  if (!trial) return null;

  const trialSelected = subscription.cycle === trial.cycle;
  const annualPrice = subscriptionPlans[plan].pricing.annual;

  return (
    <div className="mt-4 whitespace-nowrap rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-3 py-3 text-[11px] leading-none text-[#ffe0a1] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      {trialSelected ? trial.disclosure : `${trial.label} is available on monthly Pro. Annual Pro is ${annualPrice}/year.`}
    </div>
  );
}

export function PlanActionButton({
  className,
  defaultCycle,
  inactiveLabel,
  initialSubscription = null,
  plan
}: {
  className: string;
  defaultCycle?: SubscriptionDefaultCycle;
  inactiveLabel: string;
  initialSubscription?: AccountSubscriptionSnapshot | null;
  plan: SubscriptionPlanId;
}) {
  const [subscription, updateSubscription] = useSubscriptionState(initialSubscription, { defaultCycle });
  const [pending, setPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const pendingProductId = useRef<string | null>(null);
  const active = subscription.plan === plan;
  const activePaidSubscription = subscription.plan !== "free";
  const paidPlan = plan === "pro" || plan === "team";
  const managesCurrentSubscription = activePaidSubscription && (active || plan === "free");
  const disabled = pending || (active && !managesCurrentSubscription);
  const trial = subscriptionPlans[plan].trial;
  const trialSelected = Boolean(trial && subscription.cycle === trial.cycle);

  useEffect(() => {
    function handleNativePurchaseResult(event: Event) {
      if (!(event instanceof CustomEvent) || !pendingProductId.current) return;

      const result = event.detail as NativePurchaseResult | undefined;
      if (!result || result.action !== "purchase") return;
      if (result.productId && result.productId !== pendingProductId.current) return;

      setStatusMessage(result.message || (result.ok ? "Purchase completed." : "Purchase could not be completed."));
      setPending(false);
    }

    window.addEventListener(nativePurchaseResultEvent, handleNativePurchaseResult);
    return () => window.removeEventListener(nativePurchaseResultEvent, handleNativePurchaseResult);
  }, []);

  async function handlePlanAction() {
    if (disabled) return;
    setPending(true);
    setStatusMessage("");

    try {
      if (managesCurrentSubscription) {
        const opened = postNativePurchaseMessage({ action: "manage" });
        setStatusMessage(
          opened
            ? "Opening App Store subscription management."
            : `Open ${publicBrand.name} in the iOS app or TestFlight to manage App Store purchases.`
        );
        setPending(false);
        return;
      }

      if (paidPlan) {
        const appAccountToken = window.__capitolLedgerNativeStoreKit ? await readAppStoreAccountToken() : null;
        if (window.__capitolLedgerNativeStoreKit && !appAccountToken) {
          setStatusMessage(`Sign in before upgrading so Apple can link ${subscriptionPlans[plan].name} to this account.`);
          setPending(false);
          return;
        }

        const teamSeatCount = plan === "team" ? normalizeTeamSeatCountForCycle(subscription.seatCount, subscription.cycle) : undefined;
        const productId = plan === "team" ? getTeamAppStoreProductId(subscription.cycle, teamSeatCount) : proAppStoreProductIds[subscription.cycle];
        pendingProductId.current = productId;
        const opened = postNativePurchaseMessage({
          action: "purchase",
          appAccountToken: appAccountToken ?? undefined,
          cycle: subscription.cycle,
          plan,
          productId,
          seatCount: teamSeatCount
        });
        setStatusMessage(
          opened
            ? trialSelected && trial
              ? `Opening Apple in-app purchase for ${subscriptionPlans[plan].name}. Apple will show the ${trial.label} terms before you confirm.`
              : `Opening Apple in-app purchase for ${teamSeatCount ? `${teamSeatCount}-seat ` : ""}${subscriptionPlans[plan].name}.`
            : trialSelected && trial
              ? `Open ${publicBrand.name} in the iOS app or TestFlight to start the ${trial.label}.`
              : `Open ${publicBrand.name} in the iOS app or TestFlight to complete this purchase.`
        );
        if (!opened) {
          pendingProductId.current = null;
          setPending(false);
        }
        return;
      }

      if (plan === "free") {
        updateSubscription({ plan });
        setStatusMessage("Free plan is active.");
        setPending(false);
        return;
      }
    } catch {
      pendingProductId.current = null;
      if (plan === "free") updateSubscription({ plan });
      setStatusMessage(plan === "free" ? "Free plan is active." : "Purchase could not open. Try again.");
      setPending(false);
    }
  }

  const actionLabel = managesCurrentSubscription ? "Manage subscription" : active ? "Current plan" : trialSelected && trial ? trial.ctaLabel : inactiveLabel;

  return (
    <>
      <button type="button" onClick={handlePlanAction} className={className} aria-pressed={active} disabled={disabled}>
        {pending ? "Opening..." : actionLabel}
      </button>
      {statusMessage ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-[12px] font-semibold leading-snug text-white/62">
          <span>{statusMessage}</span>
        </div>
      ) : null}
    </>
  );
}

export function RestorePurchasesButton({ className }: { className: string }) {
  const [pending, setPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const restoreRequested = useRef(false);

  useEffect(() => {
    function handleNativeRestoreResult(event: Event) {
      if (!(event instanceof CustomEvent) || !restoreRequested.current) return;

      const result = event.detail as NativePurchaseResult | undefined;
      if (!result || result.action !== "restore") return;

      setStatusMessage(result.message || (result.ok ? "Purchase restored." : "No active App Store purchase was found."));
      setPending(false);
    }

    window.addEventListener(nativePurchaseResultEvent, handleNativeRestoreResult);
    return () => window.removeEventListener(nativePurchaseResultEvent, handleNativeRestoreResult);
  }, []);

  function handleRestore() {
    if (pending) return;
    setPending(true);
    setStatusMessage("");

    restoreRequested.current = true;
    const opened = postNativePurchaseMessage({ action: "restore" });
    setStatusMessage(
      opened
        ? "Checking App Store purchases."
        : `Open ${publicBrand.name} in the iOS app or TestFlight to restore App Store purchases.`
    );
    if (!opened) {
      restoreRequested.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" onClick={handleRestore} className={className} disabled={pending}>
        {pending ? "Checking..." : "Restore purchases"}
      </button>
      {statusMessage ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-[12px] font-semibold leading-snug text-white/62">
          {statusMessage}
        </div>
      ) : null}
    </>
  );
}

export function SubscriptionBadge({ initialSubscription = null }: { initialSubscription?: AccountSubscriptionSnapshot | null }) {
  const [subscription] = useSubscriptionState(initialSubscription, { scope: "effective" });
  const planName = subscriptionPlans[subscription.plan].name;

  return (
    <Link
      href="/upgrade"
      aria-label={`Manage ${publicBrand.name} ${planName}`}
      className="mt-3 inline-flex max-w-full items-center gap-1.5 overflow-hidden rounded-full border border-rust/35 bg-rust/10 px-3 py-1 text-[12px] font-medium text-[#ffb12b]"
    >
      <Crown className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
      <span className="min-w-0 truncate">{planName}</span>
    </Link>
  );
}

export function TeamSeatSelector({
  className = "",
  compact = false,
  defaultCycle,
  initialSubscription = null
}: {
  className?: string;
  compact?: boolean;
  defaultCycle?: SubscriptionDefaultCycle;
  initialSubscription?: AccountSubscriptionSnapshot | null;
}) {
  const [subscription, updateSubscription] = useSubscriptionState(initialSubscription, { defaultCycle });
  const [customPlanRequested, setCustomPlanRequested] = useState(false);
  const maximumSeatCount = getMaximumTeamSeatCount(subscription.cycle);
  const seatCount = normalizeTeamSeatCountForCycle(subscription.seatCount, subscription.cycle);
  const totalPrice = formatTeamSeatPrice(subscription.cycle, seatCount);
  const seatReferencePrice = subscription.cycle === "annual" ? teamAnnualSeatReferencePrice : teamMonthlySeatReferencePrice;
  const seatUnit = subscription.cycle === "annual" ? "seat / year" : "seat / month";
  const totalUnit = subscription.cycle === "annual" ? "team / year" : "team / month";
  const showingCustomPlanCue = customPlanRequested || seatCount >= maximumSeatCount;

  function updateSeatCount(value: unknown) {
    const parsed = typeof value === "number" ? value : Number(value);
    const overMaximum = Number.isFinite(parsed) && Math.floor(parsed) > maximumSeatCount;
    setCustomPlanRequested(overMaximum);
    updateSubscription({ seatCount: normalizeTeamSeatCountForCycle(value, subscription.cycle) });
  }

  return (
    <div className={`${className} rounded-2xl border border-white/10 bg-[#071a38]/62 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/42">Team seats</div>
          <div className="mt-1 text-[13px] leading-snug text-white/56">
            Choose {minimumTeamSeatCount}-{maximumSeatCount} {subscription.cycle} seats. The billing owner is included and does not use a seat.
          </div>
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
          max={maximumSeatCount}
          step={1}
          value={seatCount}
          onChange={(event) => updateSeatCount(event.target.value)}
          aria-label="Team seats"
          className="h-10 min-w-0 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-center text-[15px] font-semibold text-white outline-none transition focus:border-[#ffb12b]/60"
        />
        <button
          type="button"
          onClick={() => {
            if (seatCount >= maximumSeatCount) {
              setCustomPlanRequested(true);
              return;
            }

            updateSeatCount(seatCount + 1);
          }}
          aria-label={seatCount >= maximumSeatCount ? "Show custom plan option" : "Increase team seats"}
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-white/62 transition hover:text-white"
        >
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {showingCustomPlanCue ? (
        <div className="mt-3 rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-4 py-3">
          <div className="grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ffb12b]/14 text-[#ffb12b]">
              <UsersRound className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-white">
                {subscription.cycle === "annual" ? `Need ${maximumAnnualTeamSeatCount + 1}-${maximumTeamSeatCount} annual seats?` : `Need more than ${maximumTeamSeatCount} seats?`}
              </div>
              <div className="mt-1 text-[12px] leading-snug text-white/54">
                {subscription.cycle === "annual" ? "Work with us on a custom annual Team plan." : "Work with us on a custom Team plan."}
              </div>
            </div>
            <Link href="/feedback?source=team-custom-plan" className="shrink-0 rounded-full border border-[#ffb12b]/28 bg-[#ffb12b]/12 px-3 py-1.5 text-[11px] font-semibold text-[#ffb12b] transition hover:bg-[#ffb12b]/18">
              Contact us
            </Link>
          </div>
        </div>
      ) : null}

      <div className={`${compact ? "mt-3" : "mt-4"} grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(25,73,130,0.28)_0%,rgba(6,22,49,0.72)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]`}>
        <div className="min-w-0">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/42">App Store total</div>
          <div className="mt-1 text-[12px] leading-snug text-white/48">
            {seatCount} seats, starting from {seatReferencePrice} / {seatUnit}
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
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46">Team plan</div>
          <h2 className="mt-2 text-[22px] font-medium leading-tight text-white">Work from one shared view</h2>
          <p className="mt-2 text-[13px] leading-snug text-white/54">
            Built for campaigns, nonprofits, local offices, and civic groups that need shared bills, officials, topics, and alerts.
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
          After Team is active, use the Team page to invite teammates and manage shared watchlists.
        </span>
      </div>

      <Link
        href="/team"
        className="mt-4 flex h-11 items-center justify-center rounded-xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[14px] font-semibold text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:brightness-110"
      >
        Open Team page
      </Link>
    </div>
  );
}

export function PlanFeatureGate({
  children,
  fallback,
  feature,
  initialSubscription
}: {
  children: ReactNode;
  fallback?: ReactNode;
  feature: SubscriptionFeatureId;
  initialSubscription?: AccountSubscriptionSnapshot | null;
}) {
  const [subscription] = useSubscriptionState(initialSubscription, { scope: "effective" });

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
          <div className="text-[12px] font-medium uppercase tracking-wide text-white/45">Upgrade required</div>
          <h3 className="mt-1 text-[18px] font-medium leading-tight text-white">{featureEntitlement?.label ?? "Pro feature"}</h3>
          <p className="mt-2 text-[14px] leading-snug text-white/56">
            {featureEntitlement?.description ?? `This feature is available on an upgraded ${publicBrand.name} plan.`}
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
