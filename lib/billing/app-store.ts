import { createHash } from "crypto";
import { Type } from "@apple/app-store-server-library";
import { publicBrandName } from "@/lib/brand";
import {
  AppStoreServerConfigurationError,
  AppStoreServerVerificationError,
  readAppStoreServerConfiguration,
  reconcileAppStoreSubscription,
  verifyAppStoreTransaction,
  type CanonicalAppStoreSubscription
} from "@/lib/billing/app-store-server";
import { getAppStoreProduct, type AppStoreTransactionLike } from "@/lib/billing/app-store-products";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

type AppStoreValidationResult =
  | {
      configured: false;
      missing: string[];
    }
  | {
      canonical: CanonicalAppStoreSubscription;
      configured: true;
      environment: "Production" | "Sandbox";
      payload: AppStoreTransactionLike;
      subscription: AccountSubscriptionSnapshot;
    };

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

export function isSupportedSubmittedAppStoreTransaction(transaction: AppStoreTransactionLike) {
  return transaction.type === Type.AUTO_RENEWABLE_SUBSCRIPTION &&
    Boolean(getAppStoreProduct(transaction.productId));
}

export async function validateAppStoreTransaction(
  signedTransactionJWS: string,
  options: { expectedAppAccountToken?: string } = {}
): Promise<AppStoreValidationResult> {
  const configuration = readAppStoreServerConfiguration();
  if (!configuration.configured) {
    return {
      configured: false,
      missing: configuration.missing
    };
  }

  try {
    const verified = await verifyAppStoreTransaction(signedTransactionJWS);
    const submittedTransaction = verified.value;
    if (!isSupportedSubmittedAppStoreTransaction(submittedTransaction)) {
      throw new AppStoreServerVerificationError(
        `App Store transaction is not a supported ${publicBrandName} auto-renewable subscription.`
      );
    }
    const transactionId = submittedTransaction.transactionId || submittedTransaction.originalTransactionId;
    if (!transactionId) {
      throw new AppStoreServerVerificationError("App Store transaction is missing a transaction id.");
    }
    if (
      options.expectedAppAccountToken &&
      submittedTransaction.appAccountToken?.toLowerCase() !== options.expectedAppAccountToken.toLowerCase()
    ) {
      throw new AppStoreServerVerificationError(
        `App Store transaction is not linked to this ${publicBrandName} account.`
      );
    }

    const canonical = await reconcileAppStoreSubscription({
      anyTransactionId: submittedTransaction.originalTransactionId || transactionId,
      environment: verified.environment,
      expectedAppAccountToken: options.expectedAppAccountToken,
      expectedOriginalTransactionId: submittedTransaction.originalTransactionId
    });
    if (
      submittedTransaction.originalTransactionId &&
      submittedTransaction.originalTransactionId !== canonical.originalTransactionId
    ) {
      throw new AppStoreServerVerificationError("App Store transaction lineage mismatch.");
    }

    return {
      canonical,
      configured: true,
      environment: canonical.environment,
      payload: submittedTransaction,
      subscription: canonical.snapshot
    };
  } catch (error) {
    if (error instanceof AppStoreServerConfigurationError) {
      return {
        configured: false,
        missing: error.missing
      };
    }
    throw error;
  }
}
