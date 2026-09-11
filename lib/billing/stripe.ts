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
  has_more?: boolean;
};

type StripeErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class StripeRequestError extends Error {
  readonly code?: string;
  readonly status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "StripeRequestError";
    this.status = status;
    this.code = code;
  }
}

const STRIPE_API_BASE = "https://api.stripe.com/v1";

function stripeRequestError(status: number, rawBody: string, fallback: string) {
  let code: string | undefined;
  let message = rawBody || fallback;

  try {
    const body = JSON.parse(rawBody) as StripeErrorBody;
    code = body.error?.code;
    message = body.error?.message || message;
  } catch {
    // Preserve Stripe's plain-text response when it is not JSON.
  }

  return new StripeRequestError(message, status, code);
}

export function isStripeResourceMissingError(error: unknown) {
  return error instanceof StripeRequestError && (error.status === 404 || error.code === "resource_missing");
}

export function isTerminalStripeSubscriptionError(error: unknown) {
  return error instanceof StripeRequestError &&
    (isStripeResourceMissingError(error) || error.status === 400 || error.status === 402);
}

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
  appendParam(params, "metadata[userEmail]", input.user.email);
  appendParam(params, "metadata[plan]", input.plan);
  appendParam(params, "metadata[cycle]", input.cycle);
  appendParam(params, "metadata[seatCount]", input.plan === "team" ? normalizeTeamSeatCount(input.seatCount) : undefined);
  appendParam(params, "subscription_data[metadata][userId]", input.user.id);
  appendParam(params, "subscription_data[metadata][userEmail]", input.user.email);
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

export function verifyStripeWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = 5 * 60
) {
  const { signatures, timestamp } = parseStripeSignature(signature);
  if (!timestamp || !signatures.length) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > toleranceSeconds) return false;

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

function getStripeSubscriptionPlan(subscription: StripeSubscriptionObject): SubscriptionPlanId {
  return getPlanCycleForPrice(subscription.items?.data?.[0]?.price?.id)?.plan ?? readMetadataPlan(subscription.metadata?.plan);
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
    },
    signal: AbortSignal.timeout(8_000)
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "Stripe subscription lookup failed.");
    throw stripeRequestError(response.status, message, "Stripe subscription lookup failed.");
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

export async function readStripeCustomerSubscriptionIds(customerId: string): Promise<string[]> {
  const secretKey = getStripeSecretKey();
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");

  const subscriptionIds = new Set<string>();
  const paginationCursors = new Set<string>();
  let startingAfter: string | undefined;

  while (true) {
    const params = new URLSearchParams({
      customer: customerId,
      limit: "100",
      status: "all"
    });
    if (startingAfter) params.set("starting_after", startingAfter);

    const response = await fetch(`${STRIPE_API_BASE}/subscriptions?${params.toString()}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
      signal: AbortSignal.timeout(8_000)
    });
    if (!response.ok) {
      const message = await response.text().catch(() => "Stripe customer subscription lookup failed.");
      const error = stripeRequestError(response.status, message, "Stripe customer subscription lookup failed.");
      if (isStripeResourceMissingError(error) && !startingAfter) return [];
      throw error;
    }

    const page = (await response.json()) as StripeSubscriptionList;
    const subscriptions = page.data ?? [];
    subscriptions
      .filter(isCapitolLedgerStripeSubscription)
      .map((subscription) => subscription.id)
      .filter((id): id is string => Boolean(id))
      .forEach((id) => subscriptionIds.add(id));

    if (page.has_more !== true) return [...subscriptionIds];

    const nextCursor = subscriptions.at(-1)?.id;
    if (!nextCursor || paginationCursors.has(nextCursor)) {
      throw new Error("Stripe customer subscription pagination returned an invalid cursor.");
    }
    paginationCursors.add(nextCursor);
    startingAfter = nextCursor;
  }
}

export async function readStripeCustomerSubscriptionForPlan(
  customerId: string,
  plan: Exclude<SubscriptionPlanId, "free">
): Promise<StripeSubscriptionObject | null> {
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
  const matchingSubscriptions = subscriptions.filter(
    (subscription) => isCapitolLedgerStripeSubscription(subscription) && getStripeSubscriptionPlan(subscription) === plan
  );

  return (
    matchingSubscriptions.find((subscription) => isUsableSubscription(subscription) && !isPendingCancellation(subscription)) ??
    matchingSubscriptions.find(isUsableSubscription) ??
    matchingSubscriptions[0] ??
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
    body: params,
    signal: AbortSignal.timeout(8_000)
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "Stripe subscription update failed.");
    throw stripeRequestError(response.status, message, "Stripe subscription update failed.");
  }

  return (await response.json()) as StripeSubscriptionObject;
}

export async function cancelStripeSubscriptionAtPeriodEnd(subscriptionId: string) {
  const params = new URLSearchParams();
  params.append("cancel_at_period_end", "true");

  return updateStripeSubscription(subscriptionId, params);
}

export async function detachStripeSubscriptionFromDeletedAccount(subscriptionId: string) {
  let currentSubscription: StripeSubscriptionObject;
  try {
    currentSubscription = await readStripeSubscription(subscriptionId);
  } catch (error) {
    if (isStripeResourceMissingError(error)) return null;
    throw error;
  }
  if (currentSubscription.status === "canceled" || currentSubscription.status === "incomplete_expired") {
    return currentSubscription;
  }

  const params = new URLSearchParams();
  params.append("cancel_at_period_end", "true");
  params.append("metadata[userId]", "");
  params.append("metadata[userEmail]", "");

  try {
    return await updateStripeSubscription(subscriptionId, params);
  } catch (error) {
    if (isStripeResourceMissingError(error)) return null;
    if (isTerminalStripeSubscriptionError(error)) {
      try {
        const latestSubscription = await readStripeSubscription(subscriptionId);
        if (latestSubscription.status === "canceled" || latestSubscription.status === "incomplete_expired") {
          return latestSubscription;
        }
      } catch (lookupError) {
        if (isStripeResourceMissingError(lookupError)) return null;
        throw lookupError;
      }
    }
    throw error;
  }
}

export async function resumeStripeSubscriptionFromPeriodEnd(subscriptionId: string) {
  const params = new URLSearchParams();
  params.append("cancel_at_period_end", "false");

  return updateStripeSubscription(subscriptionId, params);
}
