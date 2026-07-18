import { createHash, sign as signJwt } from "crypto";
import { publicBrandName } from "@/lib/brand";
import { getTeamAppStoreProducts } from "@/lib/subscription-seat-count";
import type { AccountSubscriptionSnapshot, BillingCycle, SubscriptionPlanId } from "@/types/capitol";

type AppStoreEnvironment = "Production" | "Sandbox" | "Xcode";

type AppStoreTransactionPayload = {
  appAccountToken?: string;
  bundleId?: string;
  environment?: AppStoreEnvironment | string;
  expiresDate?: number;
  inAppOwnershipType?: string;
  originalPurchaseDate?: number;
  originalTransactionId?: string;
  productId?: string;
  purchaseDate?: number;
  revocationDate?: number;
  signedDate?: number;
  transactionId?: string;
  type?: string;
};

type AppStoreServerTransactionResponse = {
  signedTransactionInfo?: string;
};

type AppStoreValidationResult =
  | {
      configured: false;
      missing: string[];
    }
  | {
      configured: true;
      environment: Exclude<AppStoreEnvironment, "Xcode">;
      payload: AppStoreTransactionPayload;
      subscription: AccountSubscriptionSnapshot;
    };

const appStoreServerApiBaseUrl: Record<Exclude<AppStoreEnvironment, "Xcode">, string> = {
  Production: "https://api.storekit.apple.com",
  Sandbox: "https://api.storekit-sandbox.apple.com"
};

const appStoreProducts: Record<
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

function base64UrlEncode(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecodeJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function decodeJwsPayload<T>(jws: string): T {
  const [, payload] = jws.split(".");
  if (!payload) throw new Error("App Store transaction JWS is malformed.");

  return base64UrlDecodeJson<T>(payload);
}

function normalizePrivateKey(value?: string) {
  return value?.replace(/\\n/g, "\n").trim() ?? "";
}

function configuredAppStoreBundleId() {
  return process.env.APP_STORE_BUNDLE_ID || "com.capitolwonk.ce";
}

export function createAppStoreAccountToken(userId: string) {
  const namespace = process.env.APP_STORE_ACCOUNT_TOKEN_NAMESPACE || configuredAppStoreBundleId();
  const bytes = Buffer.from(createHash("sha256").update(`${namespace}:${userId}`).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function readAppStoreServerApiConfig() {
  const bundleId = configuredAppStoreBundleId();
  const issuerId = process.env.APP_STORE_CONNECT_ISSUER_ID ?? "";
  const keyId = process.env.APP_STORE_CONNECT_KEY_ID ?? "";
  const privateKey = normalizePrivateKey(process.env.APP_STORE_CONNECT_PRIVATE_KEY);
  const missing = [
    !bundleId ? "APP_STORE_BUNDLE_ID" : "",
    !issuerId ? "APP_STORE_CONNECT_ISSUER_ID" : "",
    !keyId ? "APP_STORE_CONNECT_KEY_ID" : "",
    !privateKey ? "APP_STORE_CONNECT_PRIVATE_KEY" : ""
  ].filter(Boolean);

  return {
    bundleId,
    configured: missing.length === 0,
    issuerId,
    keyId,
    missing,
    privateKey
  };
}

function createAppStoreServerApiToken() {
  const config = readAppStoreServerApiConfig();
  if (!config.configured) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "ES256",
    kid: config.keyId,
    typ: "JWT"
  };
  const payload = {
    aud: "appstoreconnect-v1",
    bid: config.bundleId,
    exp: now + 300,
    iat: now,
    iss: config.issuerId
  };
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const signature = signJwt("sha256", Buffer.from(signingInput), {
    dsaEncoding: "ieee-p1363",
    key: config.privateKey
  });

  return `${signingInput}.${signature.toString("base64url")}`;
}

function readEnvironmentCandidates(environment?: string): Array<Exclude<AppStoreEnvironment, "Xcode">> {
  if (environment === "Sandbox") return ["Sandbox"];
  if (environment === "Production") return ["Production"];

  return ["Production", "Sandbox"];
}

function getAppStoreProduct(productId?: string) {
  return productId ? appStoreProducts[productId] ?? null : null;
}

function isActiveTransaction(payload: AppStoreTransactionPayload) {
  const now = Date.now();
  if (payload.revocationDate && payload.revocationDate <= now) return false;
  if (payload.expiresDate && payload.expiresDate <= now) return false;

  return true;
}

function toSubscriptionSnapshot(payload: AppStoreTransactionPayload): AccountSubscriptionSnapshot {
  const active = isActiveTransaction(payload);
  const product = getAppStoreProduct(payload.productId);
  const subscriptionId = payload.originalTransactionId || payload.transactionId || "app-store-transaction";

  return {
    cycle: product?.cycle ?? "monthly",
    plan: active ? product?.plan ?? "free" : "free",
    provider: "app-store",
    providerCustomerId: `app-store-${payload.environment ?? "unknown"}`.toLowerCase(),
    providerEntitlementId: payload.productId ?? "capitol-ledger-free",
    providerSubscriptionId: subscriptionId,
    seatCount: active && product?.plan === "team" ? product.seatCount : undefined,
    status: active ? "active" : "canceled",
    updatedAt: new Date().toISOString()
  };
}

function assertValidAppStoreTransactionPayload(
  payload: AppStoreTransactionPayload,
  expectedTransactionId?: string,
  expectedAppAccountToken?: string
) {
  const expectedBundleId = configuredAppStoreBundleId();
  const product = getAppStoreProduct(payload.productId);

  if (!payload.transactionId) throw new Error("App Store transaction is missing a transaction id.");
  if (expectedTransactionId && payload.transactionId !== expectedTransactionId) throw new Error("App Store transaction id mismatch.");
  if (expectedAppAccountToken && payload.appAccountToken !== expectedAppAccountToken) {
    throw new Error(`App Store transaction is not linked to this ${publicBrandName} account.`);
  }
  if (payload.bundleId !== expectedBundleId) throw new Error("App Store transaction bundle id does not match this app.");
  if (!product) throw new Error(`App Store transaction product id is not a supported ${publicBrandName} product.`);
  if (payload.revocationDate) throw new Error("App Store transaction has been revoked.");
  if (!isActiveTransaction(payload)) throw new Error("App Store transaction is expired.");
}

async function readAppStoreServerTransaction(
  transactionId: string,
  environment: Exclude<AppStoreEnvironment, "Xcode">,
  token: string
) {
  const response = await fetch(`${appStoreServerApiBaseUrl[environment]}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) return null;

  const data = (await response.json().catch(() => null)) as AppStoreServerTransactionResponse | null;
  return data?.signedTransactionInfo ?? null;
}

export function decodeAppStoreTransactionJws(signedTransactionJWS: string) {
  return decodeJwsPayload<AppStoreTransactionPayload>(signedTransactionJWS);
}

export async function validateAppStoreTransaction(
  signedTransactionJWS: string,
  options: { expectedAppAccountToken?: string } = {}
): Promise<AppStoreValidationResult> {
  const config = readAppStoreServerApiConfig();
  if (!config.configured) {
    return {
      configured: false,
      missing: config.missing
    };
  }

  const token = createAppStoreServerApiToken();
  if (!token) {
    return {
      configured: false,
      missing: config.missing
    };
  }

  const submittedPayload = decodeAppStoreTransactionJws(signedTransactionJWS);
  if (submittedPayload.environment === "Xcode") {
    throw new Error("Local Xcode StoreKit transactions cannot be server-validated. Use StoreKit sandbox or TestFlight for account sync.");
  }

  const transactionId = submittedPayload.transactionId || submittedPayload.originalTransactionId;
  if (!transactionId) throw new Error("App Store transaction JWS is missing a transaction id.");

  for (const environment of readEnvironmentCandidates(submittedPayload.environment)) {
    const serverSignedTransactionInfo = await readAppStoreServerTransaction(transactionId, environment, token);
    if (!serverSignedTransactionInfo) continue;

    const payload = decodeAppStoreTransactionJws(serverSignedTransactionInfo);
    assertValidAppStoreTransactionPayload(payload, submittedPayload.transactionId, options.expectedAppAccountToken);

    return {
      configured: true,
      environment,
      payload,
      subscription: toSubscriptionSnapshot(payload)
    };
  }

  throw new Error("App Store transaction could not be found in Production or Sandbox.");
}
