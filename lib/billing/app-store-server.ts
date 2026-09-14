import {
  APIError,
  APIException,
  AppStoreServerAPIClient,
  Environment,
  InAppOwnershipType,
  SignedDataVerifier,
  Status,
  Type,
  VerificationException,
  VerificationStatus,
  type JWSRenewalInfoDecodedPayload,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
  type StatusResponse
} from "@apple/app-store-server-library";
import { getAppleRootCertificates } from "@/lib/billing/apple-root-certificates";
import {
  getAppStoreProduct,
  toAppStoreSubscriptionSnapshot,
  type AppStoreEnvironmentName
} from "@/lib/billing/app-store-products";
import {
  AppStoreVerificationBoundaryError,
  runAppStoreServerVerification
} from "@/lib/billing/app-store-verifier-boundary";
import { reserveAppStoreObservationVersion } from "@/lib/billing/app-store-state";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

type ServerEnvironment = Exclude<AppStoreEnvironmentName, "Xcode">;
export const appStoreServerRequestTimeoutMs = 60 * 1000;
export const appStoreServerVerificationGateName = "APP_STORE_SERVER_VERIFICATION_ENABLED";
export const appStoreServerNotificationsGateName = "APP_STORE_SERVER_NOTIFICATIONS_ENABLED";

type AppStoreServerConfig = {
  appAppleId?: number;
  bundleId: string;
  issuerId: string;
  keyId: string;
  privateKey: string;
};

export type VerifiedSubscriptionCandidate = {
  renewal?: JWSRenewalInfoDecodedPayload;
  status: number;
  transaction: JWSTransactionDecodedPayload;
};

export type CanonicalAppStoreSubscription = {
  appleStatus: number;
  autoRenewProductId?: string;
  autoRenewStatus?: number;
  environment: ServerEnvironment;
  expiresAt?: Date;
  gracePeriodExpiresAt?: Date;
  observedAt: Date;
  observationVersion: bigint;
  originalTransactionId: string;
  productId: string;
  renewal?: JWSRenewalInfoDecodedPayload;
  signedAt?: Date;
  snapshot: AccountSubscriptionSnapshot;
  transaction: JWSTransactionDecodedPayload;
  transactionId: string;
  transactionPurchasedAt?: Date;
  transactionRevokedAt?: Date;
};

export class AppStoreServerConfigurationError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(`App Store server configuration is missing: ${missing.join(", ")}.`);
    this.name = "AppStoreServerConfigurationError";
    this.missing = missing;
  }
}

export class AppStoreServerVerificationError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = false, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "AppStoreServerVerificationError";
    this.retryable = retryable;
  }
}

export class AppStoreSubscriptionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppStoreSubscriptionConflictError";
  }
}

function configuredBundleId() {
  return process.env.APP_STORE_BUNDLE_ID || "com.capitolwonk.ce";
}

function normalizePrivateKey(value?: string) {
  return value?.replace(/\\n/g, "\n").trim() ?? "";
}

function configuredAppAppleId() {
  const value = Number(process.env.APP_STORE_APP_APPLE_ID);
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

export function appStoreServerVerificationIsEnabled() {
  return process.env[appStoreServerVerificationGateName] === "true";
}

export function appStoreServerNotificationsAreEnabled() {
  return (
    appStoreServerVerificationIsEnabled() &&
    process.env[appStoreServerNotificationsGateName] === "true"
  );
}

function assertAppStoreServerVerificationEnabled() {
  if (!appStoreServerVerificationIsEnabled()) {
    throw new AppStoreServerConfigurationError([appStoreServerVerificationGateName]);
  }
}

function readConfig(): AppStoreServerConfig {
  return {
    appAppleId: configuredAppAppleId(),
    bundleId: configuredBundleId(),
    issuerId: process.env.APP_STORE_CONNECT_ISSUER_ID ?? "",
    keyId: process.env.APP_STORE_CONNECT_KEY_ID ?? "",
    privateKey: normalizePrivateKey(process.env.APP_STORE_CONNECT_PRIVATE_KEY)
  };
}

export function readAppStoreServerConfiguration() {
  const config = readConfig();
  const missing = [
    !appStoreServerVerificationIsEnabled() ? appStoreServerVerificationGateName : "",
    !process.env.APP_STORE_BUNDLE_ID ? "APP_STORE_BUNDLE_ID" : "",
    !config.appAppleId ? "APP_STORE_APP_APPLE_ID" : "",
    !config.issuerId ? "APP_STORE_CONNECT_ISSUER_ID" : "",
    !config.keyId ? "APP_STORE_CONNECT_KEY_ID" : "",
    !config.privateKey ? "APP_STORE_CONNECT_PRIVATE_KEY" : ""
  ].filter(Boolean);

  return {
    configured: missing.length === 0,
    missing
  };
}

function appleEnvironment(environment: ServerEnvironment) {
  return environment === "Production" ? Environment.PRODUCTION : Environment.SANDBOX;
}

function createVerifier(environment: ServerEnvironment) {
  assertAppStoreServerVerificationEnabled();
  const config = readConfig();
  if (environment === "Production" && !config.appAppleId) {
    throw new AppStoreServerConfigurationError(["APP_STORE_APP_APPLE_ID"]);
  }

  return new SignedDataVerifier(
    getAppleRootCertificates(),
    true,
    appleEnvironment(environment),
    config.bundleId,
    environment === "Production" ? config.appAppleId : undefined
  );
}

function createClient(environment: ServerEnvironment) {
  assertAppStoreServerVerificationEnabled();
  const config = readConfig();
  const missing = [
    !config.issuerId ? "APP_STORE_CONNECT_ISSUER_ID" : "",
    !config.keyId ? "APP_STORE_CONNECT_KEY_ID" : "",
    !config.privateKey ? "APP_STORE_CONNECT_PRIVATE_KEY" : ""
  ].filter(Boolean);
  if (missing.length) throw new AppStoreServerConfigurationError(missing);

  return new AppStoreServerAPIClient(
    config.privateKey,
    config.keyId,
    config.issuerId,
    config.bundleId,
    appleEnvironment(environment)
  );
}

function verificationIsRetryable(error: unknown) {
  return (
    error instanceof AppStoreVerificationBoundaryError ||
    (error instanceof VerificationException && error.status === VerificationStatus.RETRYABLE_VERIFICATION_FAILURE)
  );
}

function normalizeVerificationError(message: string, error: unknown) {
  if (error instanceof AppStoreServerConfigurationError || error instanceof AppStoreServerVerificationError) {
    return error;
  }
  return new AppStoreServerVerificationError(message, verificationIsRetryable(error), error);
}

async function withAppStoreServerRequestTimeout<T>(operation: Promise<T>, message: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new AppStoreServerVerificationError(message, true)),
      appStoreServerRequestTimeoutMs
    );
    timeout.unref?.();
  });

  try {
    return await Promise.race([operation, timedOut]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function verifyAcrossEnvironments<T>(
  verify: (verifier: SignedDataVerifier) => Promise<T>
): Promise<{ environment: ServerEnvironment; value: T }> {
  const errors: unknown[] = [];
  const environments: ServerEnvironment[] = configuredAppAppleId() ? ["Production", "Sandbox"] : ["Sandbox"];

  for (const environment of environments) {
    try {
      return {
        environment,
        value: await verify(createVerifier(environment))
      };
    } catch (error) {
      errors.push(error);
    }
  }

  const retryable = errors.some(verificationIsRetryable);
  if (!configuredAppAppleId() && !retryable) {
    throw new AppStoreServerConfigurationError(["APP_STORE_APP_APPLE_ID"]);
  }

  throw new AppStoreServerVerificationError("App Store signed data could not be verified.", retryable, errors.at(-1));
}

async function withAppStoreVerificationBoundary<T>(
  operation: () => Promise<T>,
  message: string
) {
  assertAppStoreServerVerificationEnabled();
  try {
    return await runAppStoreServerVerification(operation);
  } catch (error) {
    throw normalizeVerificationError(message, error);
  }
}

export async function verifyAppStoreNotification(signedPayload: string) {
  return withAppStoreVerificationBoundary(
    () => verifyAcrossEnvironments<ResponseBodyV2DecodedPayload>((verifier) => verifier.verifyAndDecodeNotification(signedPayload)),
    "App Store notification verification did not complete safely."
  );
}

export async function verifyAppStoreTransaction(signedTransactionInfo: string) {
  return withAppStoreVerificationBoundary(
    () => verifyAcrossEnvironments<JWSTransactionDecodedPayload>((verifier) => verifier.verifyAndDecodeTransaction(signedTransactionInfo)),
    "App Store transaction verification did not complete safely."
  );
}

export async function verifyAppStoreTransactionInEnvironment(signedTransactionInfo: string, environment: ServerEnvironment) {
  return withAppStoreVerificationBoundary(
    () => createVerifier(environment).verifyAndDecodeTransaction(signedTransactionInfo),
    "App Store transaction data could not be verified."
  );
}

export async function verifyAppStoreRenewalInfoInEnvironment(signedRenewalInfo: string, environment: ServerEnvironment) {
  return withAppStoreVerificationBoundary(
    () => createVerifier(environment).verifyAndDecodeRenewalInfo(signedRenewalInfo),
    "App Store renewal data could not be verified."
  );
}

function compareTransactionRecency(left: JWSTransactionDecodedPayload, right: JWSTransactionDecodedPayload) {
  const fields: Array<keyof JWSTransactionDecodedPayload> = ["expiresDate", "purchaseDate", "originalPurchaseDate", "signedDate"];
  for (const field of fields) {
    const difference = Number(right[field] ?? 0) - Number(left[field] ?? 0);
    if (difference) return difference;
  }
  return String(right.transactionId ?? "").localeCompare(String(left.transactionId ?? ""));
}

export function selectCanonicalCandidate(candidates: VerifiedSubscriptionCandidate[], anyTransactionId: string) {
  const current = candidates.filter((candidate) => candidate.transaction.isUpgraded !== true);
  // Apple marks the superseded transaction in an upgrade path with isUpgraded.
  // If every returned candidate is superseded, fail closed instead of reviving
  // the newest stale entitlement.
  if (!current.length) return undefined;
  const selectable = current;
  const granting = selectable.filter((candidate) => candidate.status === Status.ACTIVE || candidate.status === Status.BILLING_GRACE_PERIOD);
  const grantingOriginalIds = new Set(granting.map((candidate) => candidate.transaction.originalTransactionId).filter(Boolean));

  if (grantingOriginalIds.size > 1) {
    throw new AppStoreSubscriptionConflictError("Multiple active App Store subscription lineages were returned for one account.");
  }

  const pool = granting.length
    ? granting
    : selectable.filter(
        (candidate) =>
          candidate.transaction.transactionId === anyTransactionId || candidate.transaction.originalTransactionId === anyTransactionId
      );
  const ranked = (pool.length ? pool : selectable).sort((left, right) =>
    compareTransactionRecency(left.transaction, right.transaction)
  );
  return ranked[0];
}

const relinkableAppleStatuses = new Set<number>([
  Status.ACTIVE,
  Status.BILLING_RETRY,
  Status.BILLING_GRACE_PERIOD
]);

export function isAppStoreLineageRelinkEligible(
  canonical: Pick<CanonicalAppStoreSubscription, "appleStatus" | "transaction">
) {
  return (
    relinkableAppleStatuses.has(canonical.appleStatus) &&
    canonical.transaction.inAppOwnershipType === InAppOwnershipType.PURCHASED &&
    canonical.transaction.isUpgraded !== true &&
    !canonical.transaction.revocationDate
  );
}

function toDate(value?: number) {
  return value && Number.isFinite(value) ? new Date(value) : undefined;
}

function isTransientApiError(error: unknown) {
  if (!(error instanceof APIException)) return true;
  const retryableApiErrors = new Set<number>([
    APIError.ACCOUNT_NOT_FOUND_RETRYABLE,
    APIError.APP_NOT_FOUND_RETRYABLE,
    APIError.ORIGINAL_TRANSACTION_ID_NOT_FOUND_RETRYABLE,
    APIError.GENERAL_INTERNAL_RETRYABLE
  ]);
  return (
    error.httpStatusCode === 401 ||
    error.httpStatusCode === 403 ||
    error.httpStatusCode === 429 ||
    error.httpStatusCode >= 500 ||
    (typeof error.apiError === "number" && retryableApiErrors.has(error.apiError))
  );
}

export async function reassignAppStoreAccountToken(input: {
  appAccountToken: string;
  environment: ServerEnvironment;
  originalTransactionId: string;
}) {
  assertAppStoreServerVerificationEnabled();
  try {
    await withAppStoreServerRequestTimeout(
      createClient(input.environment).setAppAccountToken(input.originalTransactionId, {
        appAccountToken: input.appAccountToken
      }),
      "App Store account relinking timed out."
    );
  } catch (error) {
    if (error instanceof AppStoreServerConfigurationError || error instanceof AppStoreServerVerificationError) throw error;
    throw new AppStoreServerVerificationError(
      "App Store could not relink this subscription to the current CapitolWonk account.",
      isTransientApiError(error),
      error
    );
  }
}

type ValidatedStatusItem = {
  originalTransactionId: string;
  signedRenewalInfo?: string;
  signedTransactionInfo: string;
  status: number;
};

type ValidatedStatusGroup = {
  lastTransactions: ValidatedStatusItem[];
  subscriptionGroupIdentifier?: string;
};

const supportedAppStoreStatuses = new Set<number>([
  Status.ACTIVE,
  Status.EXPIRED,
  Status.BILLING_RETRY,
  Status.BILLING_GRACE_PERIOD,
  Status.REVOKED
]);

export function readValidatedAppStoreStatusGroups(response: StatusResponse): ValidatedStatusGroup[] {
  if (!response || typeof response !== "object" || !Array.isArray(response.data)) {
    throw new AppStoreServerVerificationError("App Store status response is missing its subscription data.");
  }

  return response.data.map((group) => {
    if (!group || typeof group !== "object" || !Array.isArray(group.lastTransactions)) {
      throw new AppStoreServerVerificationError("App Store status response contains a malformed subscription group.");
    }
    if (
      group.subscriptionGroupIdentifier !== undefined &&
      (typeof group.subscriptionGroupIdentifier !== "string" || !group.subscriptionGroupIdentifier.trim())
    ) {
      throw new AppStoreServerVerificationError("App Store status response contains an invalid subscription group identifier.");
    }

    const lastTransactions = group.lastTransactions.map((item) => {
      if (!item || typeof item !== "object") {
        throw new AppStoreServerVerificationError("App Store status response contains a malformed transaction item.");
      }
      if (
        typeof item.status !== "number" ||
        !Number.isInteger(item.status) ||
        !supportedAppStoreStatuses.has(item.status)
      ) {
        throw new AppStoreServerVerificationError("App Store status response contains an invalid subscription status.");
      }
      if (typeof item.originalTransactionId !== "string" || !item.originalTransactionId.trim()) {
        throw new AppStoreServerVerificationError("App Store status response is missing an original transaction id.");
      }
      if (typeof item.signedTransactionInfo !== "string" || !item.signedTransactionInfo.trim()) {
        throw new AppStoreServerVerificationError("App Store status response is missing signed transaction data.");
      }
      if (
        item.signedRenewalInfo !== undefined &&
        (typeof item.signedRenewalInfo !== "string" || !item.signedRenewalInfo.trim())
      ) {
        throw new AppStoreServerVerificationError("App Store status response contains invalid signed renewal data.");
      }

      return {
        originalTransactionId: item.originalTransactionId,
        signedRenewalInfo: item.signedRenewalInfo,
        signedTransactionInfo: item.signedTransactionInfo,
        status: item.status
      };
    });

    return {
      lastTransactions,
      subscriptionGroupIdentifier: group.subscriptionGroupIdentifier
    };
  });
}

export async function reconcileAppStoreSubscription(input: {
  anyTransactionId: string;
  environment: ServerEnvironment;
  expectedAppAccountToken?: string;
  expectedOriginalTransactionId?: string;
}): Promise<CanonicalAppStoreSubscription> {
  assertAppStoreServerVerificationEnabled();
  const observationVersion = await reserveAppStoreObservationVersion();
  const observedAt = new Date();
  let response;
  try {
    response = await withAppStoreServerRequestTimeout(
      createClient(input.environment).getAllSubscriptionStatuses(input.anyTransactionId),
      "App Store subscription reconciliation timed out."
    );
  } catch (error) {
    if (error instanceof AppStoreServerConfigurationError || error instanceof AppStoreServerVerificationError) throw error;
    throw new AppStoreServerVerificationError(
      "App Store subscription status could not be reconciled.",
      isTransientApiError(error),
      error
    );
  }

  const config = readConfig();
  if (response.bundleId !== config.bundleId || response.environment !== appleEnvironment(input.environment)) {
    throw new AppStoreServerVerificationError("App Store status response does not match the configured app.");
  }
  if (input.environment === "Production" && response.appAppleId !== config.appAppleId) {
    throw new AppStoreServerVerificationError("App Store status response does not match the configured Apple app id.");
  }

  const groups = readValidatedAppStoreStatusGroups(response);
  const candidates = await withAppStoreVerificationBoundary(async () => {
    const verifiedCandidates: VerifiedSubscriptionCandidate[] = [];
    const verifier = createVerifier(input.environment);
    const expectedToken = input.expectedAppAccountToken?.toLowerCase();
    for (const group of groups) {
      for (const item of group.lastTransactions) {
        let transaction: JWSTransactionDecodedPayload;
        let renewal: JWSRenewalInfoDecodedPayload | undefined;
        try {
          transaction = await verifier.verifyAndDecodeTransaction(item.signedTransactionInfo);
          renewal = item.signedRenewalInfo
            ? await verifier.verifyAndDecodeRenewalInfo(item.signedRenewalInfo)
            : undefined;
        } catch (error) {
          throw normalizeVerificationError("App Store subscription status contained unverifiable signed data.", error);
        }
        if (!getAppStoreProduct(transaction.productId)) continue;
        if (transaction.type !== Type.AUTO_RENEWABLE_SUBSCRIPTION) continue;
        if (expectedToken && transaction.appAccountToken?.toLowerCase() !== expectedToken) continue;
        if (
          input.expectedOriginalTransactionId &&
          transaction.originalTransactionId !== input.expectedOriginalTransactionId
        ) {
          continue;
        }
        if (item.originalTransactionId !== transaction.originalTransactionId) {
          throw new AppStoreServerVerificationError("App Store status transaction lineage does not match its signed data.");
        }
        if (
          group.subscriptionGroupIdentifier &&
          transaction.subscriptionGroupIdentifier &&
          group.subscriptionGroupIdentifier !== transaction.subscriptionGroupIdentifier
        ) {
          throw new AppStoreServerVerificationError("App Store status subscription group does not match its signed data.");
        }
        if (renewal?.originalTransactionId && renewal.originalTransactionId !== transaction.originalTransactionId) {
          throw new AppStoreServerVerificationError("App Store renewal lineage does not match its signed transaction.");
        }
        if (renewal?.productId && renewal.productId !== transaction.productId) {
          throw new AppStoreServerVerificationError("App Store renewal product does not match its signed transaction.");
        }
        if (
          renewal?.appAccountToken &&
          transaction.appAccountToken &&
          renewal.appAccountToken.toLowerCase() !== transaction.appAccountToken.toLowerCase()
        ) {
          throw new AppStoreServerVerificationError("App Store renewal account token does not match its signed transaction.");
        }
        verifiedCandidates.push({ renewal, status: item.status, transaction });
      }
    }
    return verifiedCandidates;
  }, "App Store subscription status verification did not complete safely.");

  const candidate = selectCanonicalCandidate(candidates, input.anyTransactionId);
  if (!candidate) {
    throw new AppStoreServerVerificationError("App Store returned no supported CapitolWonk subscription.");
  }

  const { renewal, status: appleStatus, transaction } = candidate;
  const originalTransactionId = transaction.originalTransactionId;
  const productId = transaction.productId;
  const transactionId = transaction.transactionId;
  if (!originalTransactionId || !productId || !transactionId) {
    throw new AppStoreServerVerificationError("App Store subscription status is missing required transaction fields.");
  }
  if (
    input.expectedAppAccountToken &&
    transaction.appAccountToken?.toLowerCase() !== input.expectedAppAccountToken.toLowerCase()
  ) {
    throw new AppStoreServerVerificationError("App Store subscription is not linked to this CapitolWonk account.");
  }

  return {
    appleStatus,
    autoRenewProductId: renewal?.autoRenewProductId,
    autoRenewStatus: typeof renewal?.autoRenewStatus === "number" ? renewal.autoRenewStatus : undefined,
    environment: input.environment,
    expiresAt: toDate(transaction.expiresDate),
    gracePeriodExpiresAt: toDate(renewal?.gracePeriodExpiresDate),
    observedAt,
    observationVersion,
    originalTransactionId,
    productId,
    renewal,
    signedAt: toDate(transaction.signedDate),
    snapshot: toAppStoreSubscriptionSnapshot(transaction, {
      appleStatus,
      environment: input.environment
    }),
    transaction,
    transactionId,
    transactionPurchasedAt: toDate(transaction.purchaseDate),
    transactionRevokedAt: toDate(transaction.revocationDate)
  };
}
