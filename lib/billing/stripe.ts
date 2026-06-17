import { createHmac, timingSafeEqual } from "crypto";
import type { BillingCycle, SubscriptionPlanId, SubscriptionStatus } from "../../types/capitol";
import { normalizeTeamSeatCount } from "../subscription-seat-count";

type CheckoutInput = {
  cancelUrl: string;
  cycle: BillingCycle;
  plan: Exclude<SubscriptionPlanId, "free">;
  seatCount?: number;
  successUrl: string;
  user: {
    email: string;
    id: string;
  };
};

type CheckoutResult =
  | {
      configured: false;
      missing: string[];
    }
  | {
      checkoutUrl: string;
      configured: true;
      sessionId: string;
    };

type BillingPortalInput = {
  customerId?: string;
  returnUrl: string;
};

type BillingPortalResult =
  | {
      configured: false;
      missing: string[];
    }
  | {
      configured: true;
      portalUrl: string;
      sessionId: string;
    };

type StripeCheckoutSession = {
  customer?: string;
  id: string;
  subscription?: string;
  url?: string;
};

type StripePortalSession = {
  id: string;
  url?: string;
};

type StripeSubscriptionItem = {
  price?: {
    id?: string;
  };
  quantity?: number;
};

type StripeSubscriptionObject = StripeCheckoutSession & {
  cancel_at?: number | null;
  cancel_at_period_end?: boolean;
  client_reference_id?: string;
  created?: number;
  current_period_end?: number;
  customer?: string;
  id?: string;
  items?: {
    data?: StripeSubscriptionItem[];
  };
  metadata?: Record<string, string | undefined>;
  status?: string;
  subscription?: string;
};

type StripeWebhookEvent = {
  data?: {
    object?: StripeSubscriptionObject;
  };
  type?: string;
};

type StripeSubscriptionList = {
  data?: StripeSubscriptionObject[];
};

const STRIPE_API_BASE = "https://api.stripe.com/v1";

const priceEnvByPlanCycle: Record<Exclude<SubscriptionPlanId, "free">, Record<BillingCycle, string>> = {
  pro: {
    monthly: "CAPITOL_LEDGER_STRIPE_PRO_MONTHLY_PRICE_ID",
    annual: "CAPITOL_LEDGER_STRIPE_PRO_ANNUAL_PRICE_ID"
  },
  team: {
    monthly: "CAPITOL_LEDGER_STRIPE_TEAM_MONTHLY_PRICE_ID",
    annual: "CAPITOL_LEDGER_STRIPE_TEAM_ANNUAL_PRICE_ID"
  }
};

function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY;
}

function getPriceId(plan: Exclude<SubscriptionPlanId, "free">, cycle: BillingCycle) {
  return process.env[priceEnvByPlanCycle[plan][cycle]];
}

function getPlanCycleForPrice(priceId?: string): { cycle: BillingCycle; plan: Exclude<SubscriptionPlanId, "free"> } | null {
  if (!priceId) return null;

  for (const plan of Object.keys(priceEnvByPlanCycle) as Array<Exclude<SubscriptionPlanId, "free">>) {
    for (const cycle of Object.keys(priceEnvByPlanCycle[plan]) as BillingCycle[]) {
      if (getPriceId(plan, cycle) === priceId) return { cycle, plan };
    }
  }

  return null;
}

function readMetadataPlan(value?: string): SubscriptionPlanId {
  if (value === "pro" || value === "team") return value;
  return "free";
}

function appendParam(params: URLSearchParams, key: string, value?: string | number) {
  if (value === undefined || value === "") return;
  params.append(key, String(value));
}

export async function createStripeCheckoutSession(input: CheckoutInput): Promise<CheckoutResult> {
  const secretKey = getStripeSecretKey();
  const priceId = getPriceId(input.plan, input.cycle);
  const missing = [
    !secretKey ? "STRIPE_SECRET_KEY" : "",
    !priceId ? priceEnvByPlanCycle[input.plan][input.cycle] : ""
  ].filter(Boolean);

  if (!secretKey || !priceId) {
    return {
      configured: false,
      missing
    };
  }

  const params = new URLSearchParams();
  appendParam(params, "mode", "subscription");
  appendParam(params, "client_reference_id", input.user.id);
  appendParam(params, "customer_email", input.user.email);
  appendParam(params, "success_url", input.successUrl);
  appendParam(params, "cancel_url", input.cancelUrl);
  appendParam(params, "line_items[0][price]", priceId);
  appendParam(params, "line_items[0][quantity]", input.plan === "team" ? normalizeTeamSeatCount(input.seatCount) : 1);
  appendParam(params, "metadata[userId]", input.user.id);
  appendParam(params, "metadata[plan]", input.plan);
  appendParam(params, "metadata[cycle]", input.cycle);
  appendParam(params, "metadata[seatCount]", input.plan === "team" ? normalizeTeamSeatCount(input.seatCount) : undefined);
  appendParam(params, "subscription_data[metadata][userId]", input.user.id);
  appendParam(params, "subscription_data[metadata][plan]", input.plan);
  appendParam(params, "subscription_data[metadata][cycle]", input.cycle);
  appendParam(params, "subscription_data[metadata][seatCount]", input.plan === "team" ? normalizeTeamSeatCount(input.seatCount) : undefined);

  const response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "Stripe checkout failed.");
    throw new Error(message);
  }

  const session = (await response.json()) as StripeCheckoutSession;
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");

  return {
    checkoutUrl: session.url,
    configured: true,
    sessionId: session.id
  };
}

export async function createStripeBillingPortalSession(input: BillingPortalInput): Promise<BillingPortalResult> {
  const secretKey = getStripeSecretKey();
  const missing = [!secretKey ? "STRIPE_SECRET_KEY" : "", !input.customerId ? "Stripe customer ID" : ""].filter(Boolean);

  if (!secretKey || !input.customerId) {
    return {
      configured: false,
      missing
    };
  }

  const params = new URLSearchParams();
  appendParam(params, "customer", input.customerId);
  appendParam(params, "return_url", input.returnUrl);

  const response = await fetch(`${STRIPE_API_BASE}/billing_portal/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "Stripe billing portal failed.");
    throw new Error(message);
  }

  const session = (await response.json()) as StripePortalSession;
  if (!session.url) throw new Error("Stripe did not return a billing portal URL.");

  return {
    configured: true,
    portalUrl: session.url,
    sessionId: session.id
  };
}

function parseStripeSignature(signature: string) {
  return signature.split(",").reduce(
    (values, part) => {
      const [key, value] = part.split("=", 2);
      if (key === "t") values.timestamp = value;
      if (key === "v1") values.signatures.push(value);
      return values;
    },
    { signatures: [] as string[], timestamp: "" }
  );
}

export function verifyStripeWebhookSignature(payload: string, signature: string, secret: string) {
  const { signatures, timestamp } = parseStripeSignature(signature);
  if (!timestamp || !signatures.length) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = createHmac("sha256", secret).update(signedPayload).digest("hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  return signatures.some((candidate) => {
    const candidateBuffer = Buffer.from(candidate, "hex");
    return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
  });
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET;
}

export function mapStripeStatus(status?: string, cancelAtPeriodEnd = false, cancelAt?: number | null): SubscriptionStatus {
  if (cancelAtPeriodEnd || Boolean(cancelAt)) return "canceled";
  if (status === "trialing") return "trialing";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled" || status === "incomplete_expired") return "canceled";
  return "active";
}

export function readStripeSubscriptionDetails(object?: {
  cancel_at?: number | null;
  cancel_at_period_end?: boolean;
  items?: {
    data?: StripeSubscriptionItem[];
  };
  metadata?: Record<string, string | undefined>;
  status?: string;
}): { cycle: BillingCycle; plan: SubscriptionPlanId; seatCount?: number; status: SubscriptionStatus } {
  const metadata = object?.metadata ?? {};
  const item = object?.items?.data?.[0];
  const matchedPrice = getPlanCycleForPrice(item?.price?.id);
  const status = mapStripeStatus(object?.status, object?.cancel_at_period_end, object?.cancel_at);
  const plan = matchedPrice?.plan ?? readMetadataPlan(metadata.plan);
  const activePlan = status === "canceled" ? "free" : plan;
  const cycle = matchedPrice?.cycle ?? (metadata.cycle === "annual" ? "annual" : "monthly");

  return {
    cycle,
    plan: activePlan,
    seatCount: activePlan === "team" ? normalizeTeamSeatCount(item?.quantity ?? metadata.seatCount) : undefined,
    status
  };
}

export function parseStripeWebhookEvent(payload: string) {
  return JSON.parse(payload) as StripeWebhookEvent;
}

function isCapitolLedgerStripeSubscription(subscription: StripeSubscriptionObject) {
  const metadataPlan = readMetadataPlan(subscription.metadata?.plan);
  return metadataPlan !== "free" || Boolean(getPlanCycleForPrice(subscription.items?.data?.[0]?.price?.id));
}

function isPendingCancellation(subscription: StripeSubscriptionObject) {
  return Boolean(subscription.cancel_at_period_end || subscription.cancel_at);
}

function isUsableSubscription(subscription: StripeSubscriptionObject) {
  return subscription.status === "active" || subscription.status === "trialing" || subscription.status === "past_due" || subscription.status === "unpaid";
}

export async function readStripeSubscription(subscriptionId: string): Promise<StripeSubscriptionObject> {
  const secretKey = getStripeSecretKey();
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");

  const response = await fetch(`${STRIPE_API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`
    }
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "Stripe subscription lookup failed.");
    throw new Error(message);
  }

  return (await response.json()) as StripeSubscriptionObject;
}

export async function readStripeCustomerSubscription(customerId: string): Promise<StripeSubscriptionObject | null> {
  const secretKey = getStripeSecretKey();
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");

  const params = new URLSearchParams({
    customer: customerId,
    limit: "10",
    status: "all"
  });

  const response = await fetch(`${STRIPE_API_BASE}/subscriptions?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`
    }
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "Stripe customer subscription lookup failed.");
    throw new Error(message);
  }

  const subscriptions = ((await response.json()) as StripeSubscriptionList).data ?? [];
  const matchingSubscriptions = subscriptions.filter(isCapitolLedgerStripeSubscription);
  return (
    matchingSubscriptions.find(isPendingCancellation) ??
    matchingSubscriptions.find(isUsableSubscription) ??
    matchingSubscriptions[0] ??
    subscriptions.find(isPendingCancellation) ??
    subscriptions.find(isUsableSubscription) ??
    subscriptions[0] ??
    null
  );
}

async function updateStripeSubscription(subscriptionId: string, params: URLSearchParams): Promise<StripeSubscriptionObject> {
  const secretKey = getStripeSecretKey();
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");

  const response = await fetch(`${STRIPE_API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "Stripe subscription update failed.");
    throw new Error(message);
  }

  return (await response.json()) as StripeSubscriptionObject;
}

export async function cancelStripeSubscriptionAtPeriodEnd(subscriptionId: string) {
  const params = new URLSearchParams();
  params.append("cancel_at_period_end", "true");

  return updateStripeSubscription(subscriptionId, params);
}

export async function resumeStripeSubscriptionFromPeriodEnd(subscriptionId: string) {
  const params = new URLSearchParams();
  params.append("cancel_at_period_end", "false");

  return updateStripeSubscription(subscriptionId, params);
}
