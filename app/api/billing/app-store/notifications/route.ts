import { createHash } from "crypto";
import { Type } from "@apple/app-store-server-library";
import { NextRequest, NextResponse } from "next/server";
import { isAccountPersistenceUnavailableError } from "@/lib/account-persistence-safety";
import { getAppStoreProduct } from "@/lib/billing/app-store-products";
import {
  AppStoreServerConfigurationError,
  AppStoreServerVerificationError,
  AppStoreSubscriptionConflictError,
  reconcileAppStoreSubscription,
  verifyAppStoreNotification,
  verifyAppStoreRenewalInfoInEnvironment,
  verifyAppStoreTransactionInEnvironment
} from "@/lib/billing/app-store-server";
import {
  AppStoreStateConflictError,
  AppStoreStateValidationError,
  claimAppStoreNotificationReceipt,
  finalizeAppStoreNotificationReceipt,
  findAppStoreUserMapping,
  insertAppStoreNotificationReceipt,
  isPendingAppStoreLineageClaim,
  persistCanonicalAppStoreState,
  readAppStoreSubscriptionState,
  type AppStoreNotificationFinalStatus
} from "@/lib/billing/app-store-state";

export const runtime = "nodejs";

const maximumRequestBytes = 128 * 1024;
function json(status: number, body: Record<string, unknown>, retryAfter = false) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
      ...(retryAfter ? { "Retry-After": "30" } : {})
    },
    status
  });
}

async function readSignedPayload(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumRequestBytes) {
    return { error: json(413, { error: "App Store notification is too large." }) };
  }

  const chunks: Buffer[] = [];
  let receivedBytes = 0;
  const reader = request.body?.getReader();
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > maximumRequestBytes) {
        await reader.cancel();
        return { error: json(413, { error: "App Store notification is too large." }) };
      }
      chunks.push(Buffer.from(value));
    }
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  if (Buffer.byteLength(rawBody, "utf8") > maximumRequestBytes) {
    return { error: json(413, { error: "App Store notification is too large." }) };
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { error: json(400, { error: "Invalid App Store notification body." }) };
  }

  const signedPayload =
    body && typeof body === "object" && "signedPayload" in body && typeof body.signedPayload === "string"
      ? body.signedPayload.trim()
      : "";
  if (!signedPayload) {
    return { error: json(400, { error: "App Store signed payload is required." }) };
  }

  return { signedPayload };
}

async function finalizeReceipt(input: {
  claimToken: string;
  errorCode?: string;
  notificationUUID: string;
  status: AppStoreNotificationFinalStatus;
  userId?: string | null;
}) {
  await finalizeAppStoreNotificationReceipt({
    claimToken: input.claimToken,
    errorCode: input.errorCode,
    notificationUUID: input.notificationUUID,
    status: input.status,
    userId: input.userId ?? null
  });
}

async function handleAppStoreNotification(request: NextRequest) {
  const body = await readSignedPayload(request);
  if ("error" in body) return body.error;

  const payloadHash = createHash("sha256").update(body.signedPayload).digest("hex");
  let verifiedNotification;
  try {
    verifiedNotification = await verifyAppStoreNotification(body.signedPayload);
  } catch (error) {
    if (error instanceof AppStoreServerConfigurationError) {
      return json(503, { error: "App Store notification verification is not configured." }, true);
    }
    if (error instanceof AppStoreServerVerificationError) {
      return json(
        error.retryable ? 503 : 401,
        { error: "App Store notification verification failed." },
        error.retryable
      );
    }
    return json(503, { error: "App Store notification verification is unavailable." }, true);
  }

  const notification = verifiedNotification.value;
  const notificationUUID = notification.notificationUUID?.trim();
  const notificationType = notification.notificationType?.trim();
  if (notification.version !== "2.0" || !notificationUUID || !notificationType) {
    return json(400, { error: "Unsupported App Store notification metadata." });
  }

  const notificationEnvironment = notification.data?.environment;
  if (notificationEnvironment && notificationEnvironment !== verifiedNotification.environment) {
    return json(400, { error: "App Store notification environment mismatch." });
  }

  try {
    await insertAppStoreNotificationReceipt({
      environment: verifiedNotification.environment,
      notificationType,
      notificationUUID,
      payloadHash,
      signedAt: notification.signedDate,
      subtype: notification.subtype
    });
  } catch (error) {
    if (error instanceof AppStoreStateConflictError || error instanceof AppStoreStateValidationError) {
      return json(409, { error: "App Store notification receipt conflict." });
    }
    if (isAccountPersistenceUnavailableError(error)) {
      return json(503, { error: "App Store notification persistence is unavailable." }, true);
    }
    return json(503, { error: "App Store notification persistence failed." }, true);
  }

  let claim;
  try {
    claim = await claimAppStoreNotificationReceipt({ notificationUUID });
  } catch (error) {
    if (error instanceof AppStoreStateConflictError || error instanceof AppStoreStateValidationError) {
      return json(409, { error: "App Store notification claim conflict." });
    }
    return json(503, { error: "App Store notification claim is unavailable." }, true);
  }
  if (claim.decision === "terminal") {
    return json(200, { duplicate: true, received: true });
  }
  if (claim.decision === "busy") {
    return json(503, { error: "App Store notification processing is already in progress." }, true);
  }
  if (!claim.claimToken) {
    return json(503, { error: "App Store notification claim is unavailable." }, true);
  }
  const claimToken = claim.claimToken;

  const signedTransactionInfo = notification.data?.signedTransactionInfo;
  if (notificationType === "TEST" || !signedTransactionInfo) {
    await finalizeReceipt({
      claimToken,
      errorCode: notificationType === "TEST" ? "test_notification" : "no_transaction",
      notificationUUID,
      status: "ignored"
    });
    return json(200, { received: true });
  }

  let transaction;
  let renewal;
  try {
    transaction = await verifyAppStoreTransactionInEnvironment(
      signedTransactionInfo,
      verifiedNotification.environment
    );
    renewal = notification.data?.signedRenewalInfo
      ? await verifyAppStoreRenewalInfoInEnvironment(
          notification.data.signedRenewalInfo,
          verifiedNotification.environment
        )
      : undefined;
  } catch (error) {
    const retryable = error instanceof AppStoreServerVerificationError && error.retryable;
    await finalizeReceipt({
      claimToken,
      errorCode: retryable ? "inner_verification_retryable" : "inner_verification_invalid",
      notificationUUID,
      status: retryable ? "failed" : "ignored"
    });
    return json(
      retryable ? 503 : 400,
      { error: "App Store notification transaction verification failed." },
      retryable
    );
  }

  const originalTransactionId = transaction.originalTransactionId?.trim();
  const transactionId = transaction.transactionId?.trim();
  const appAccountToken = transaction.appAccountToken?.trim().toLowerCase();
  const supportedProduct = getAppStoreProduct(transaction.productId);
  const lineageMismatch = Boolean(
    renewal?.originalTransactionId && renewal.originalTransactionId !== originalTransactionId
  );
  const tokenMismatch = Boolean(
    renewal?.appAccountToken &&
      appAccountToken &&
      renewal.appAccountToken.toLowerCase() !== appAccountToken
  );

  if (
    !supportedProduct ||
    transaction.type !== Type.AUTO_RENEWABLE_SUBSCRIPTION ||
    !originalTransactionId ||
    !transactionId ||
    lineageMismatch ||
    tokenMismatch
  ) {
    await finalizeReceipt({
      claimToken,
      errorCode: "unsupported_transaction",
      notificationUUID,
      status: "ignored"
    });
    return json(200, { received: true });
  }

  let mappedUserId: string | null = null;
  let pendingLineageClaim = false;
  try {
    const mapping = await findAppStoreUserMapping({
      appAccountToken,
      originalTransactionId
    });
    if (mapping.kind === "conflict") {
      await finalizeReceipt({ claimToken, errorCode: "account_mapping_conflict", notificationUUID, status: "conflict" });
      return json(200, { received: true });
    }
    if (mapping.kind === "none") {
      await finalizeReceipt({ claimToken, errorCode: "account_mapping_missing", notificationUUID, status: "unlinked" });
      return json(200, { received: true });
    }

    mappedUserId = mapping.userId;
    const storedState = await readAppStoreSubscriptionState(mappedUserId);
    pendingLineageClaim = isPendingAppStoreLineageClaim(storedState);
    const expectedAppAccountToken = pendingLineageClaim
      ? storedState?.appAccountToken
      : appAccountToken || storedState?.appAccountToken;
    if (!expectedAppAccountToken) {
      await finalizeReceipt({
        claimToken,
        errorCode: "account_token_missing",
        notificationUUID,
        status: "unlinked",
        userId: mappedUserId
      });
      return json(200, { received: true });
    }

    const canonical = await reconcileAppStoreSubscription({
      anyTransactionId: originalTransactionId,
      environment: verifiedNotification.environment,
      expectedAppAccountToken,
      expectedOriginalTransactionId: originalTransactionId
    });
    if (canonical.originalTransactionId !== originalTransactionId) {
      throw new AppStoreSubscriptionConflictError("App Store notification lineage mismatch.");
    }

    await persistCanonicalAppStoreState({
      appAccountToken: expectedAppAccountToken,
      appleStatus: canonical.appleStatus,
      autoRenewProductId: canonical.autoRenewProductId,
      autoRenewStatus: canonical.autoRenewStatus,
      environment: canonical.environment,
      expiresAt: canonical.expiresAt,
      gracePeriodExpiresAt: canonical.gracePeriodExpiresAt,
      observedAt: canonical.observedAt,
      observationVersion: canonical.observationVersion,
      notificationClaim: { claimToken, notificationUUID },
      originalTransactionId: canonical.originalTransactionId,
      productId: canonical.productId,
      signedAt: canonical.signedAt,
      subscription: canonical.snapshot,
      transactionId: canonical.transactionId,
      transactionPurchasedAt: canonical.transactionPurchasedAt,
      transactionRevokedAt: canonical.transactionRevokedAt,
      userId: mappedUserId
    });
    await finalizeReceipt({ claimToken, notificationUUID, status: "processed", userId: mappedUserId });
    return json(200, { received: true });
  } catch (error) {
    if (error instanceof AppStoreSubscriptionConflictError || error instanceof AppStoreStateConflictError) {
      await finalizeReceipt({
        claimToken,
        errorCode: "canonical_state_conflict",
        notificationUUID,
        status: "conflict",
        userId: mappedUserId
      });
      return json(200, { received: true });
    }
    if (error instanceof AppStoreStateValidationError) {
      await finalizeReceipt({
        claimToken,
        errorCode: "canonical_state_invalid",
        notificationUUID,
        status: "ignored",
        userId: mappedUserId
      });
      return json(200, { received: true });
    }

    const retryable =
      error instanceof AppStoreServerConfigurationError ||
      (error instanceof AppStoreServerVerificationError && (error.retryable || pendingLineageClaim)) ||
      isAccountPersistenceUnavailableError(error);
    await finalizeReceipt({
      claimToken,
      errorCode: pendingLineageClaim ? "relink_pending" : retryable ? "reconciliation_retryable" : "reconciliation_failed",
      notificationUUID,
      status: retryable ? "failed" : "ignored",
      userId: mappedUserId
    });
    return json(
      retryable ? 503 : 200,
      retryable ? { error: "App Store reconciliation is temporarily unavailable." } : { received: true },
      retryable
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleAppStoreNotification(request);
  } catch (error) {
    if (isAccountPersistenceUnavailableError(error)) {
      return json(503, { error: "App Store notification persistence is unavailable." }, true);
    }
    return json(503, { error: "App Store notification processing is unavailable." }, true);
  }
}
