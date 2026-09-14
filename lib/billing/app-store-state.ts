import { randomUUID } from "crypto";
import { clearAccountSubscriptionMemory, normalizeAccountSubscription } from "@/lib/account-subscription";
import { throwAccountPersistenceUnavailable } from "@/lib/account-persistence-safety";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

export type AppStoreServerEnvironment = "Production" | "Sandbox";

export type AppStoreNotificationReceiptStatus =
  | "received"
  | "processing"
  | "processed"
  | "unlinked"
  | "conflict"
  | "ignored"
  | "failed";

export type AppStoreNotificationFinalStatus = Exclude<AppStoreNotificationReceiptStatus, "received" | "processing">;
export type AppStoreNotificationClaimDecision = "claim" | "busy" | "terminal";
export const appStoreNotificationProcessingLeaseMs = 5 * 60 * 1000;
const terminalNotificationStatuses: AppStoreNotificationReceiptStatus[] = [
  "processed",
  "unlinked",
  "conflict",
  "ignored"
];
type DateInput = Date | number | string | null | undefined;

type AppStoreSubscriptionStateRow = {
  appAccountToken: string;
  appleStatus: number | null;
  autoRenewProductId: string | null;
  autoRenewStatus: number | null;
  createdAt: Date;
  environment: string | null;
  expiresAt: Date | null;
  gracePeriodExpiresAt: Date | null;
  id: string;
  originalTransactionId: string | null;
  observationVersion: bigint | null;
  productId: string | null;
  reconciledAt: Date | null;
  relinkPending: boolean;
  signedAt: Date | null;
  transactionId: string | null;
  transactionPurchasedAt: Date | null;
  transactionRevokedAt: Date | null;
  updatedAt: Date;
  userId: string;
};

type AppStoreNotificationReceiptRow = {
  claimToken: string | null;
  createdAt: Date;
  environment: string | null;
  errorCode: string | null;
  id: string;
  notificationType: string;
  notificationUUID: string;
  payloadHash: string;
  processedAt: Date | null;
  signedAt: Date | null;
  status: string;
  subtype: string | null;
  updatedAt: Date;
  userId: string | null;
};

type AccountSubscriptionRow = {
  cycle: string;
  plan: string;
  provider: string;
  providerCustomerId: string | null;
  providerEntitlementId: string | null;
  providerSubscriptionId: string | null;
  seatCount: number | null;
  status: string;
  updatedAt: Date;
};

export type AppStoreSubscriptionState = {
  appAccountToken: string;
  appleStatus?: number;
  autoRenewProductId?: string;
  autoRenewStatus?: number;
  createdAt: Date;
  environment?: AppStoreServerEnvironment;
  expiresAt?: Date;
  gracePeriodExpiresAt?: Date;
  id: string;
  originalTransactionId?: string;
  observationVersion?: bigint;
  productId?: string;
  reconciledAt?: Date;
  relinkPending: boolean;
  signedAt?: Date;
  transactionId?: string;
  transactionPurchasedAt?: Date;
  transactionRevokedAt?: Date;
  updatedAt: Date;
  userId: string;
};

export type AppStoreNotificationReceipt = {
  createdAt: Date;
  environment?: AppStoreServerEnvironment;
  errorCode?: string;
  id: string;
  notificationType: string;
  notificationUUID: string;
  payloadHash: string;
  processedAt?: Date;
  signedAt?: Date;
  status: AppStoreNotificationReceiptStatus;
  subtype?: string;
  updatedAt: Date;
  userId?: string;
};

export type AppStoreNotificationClaim = {
  claimToken: string;
  notificationUUID: string;
};

export type AppStoreUserMapping =
  | {
      kind: "none";
    }
  | {
      kind: "matched";
      matchedBy: Array<"appAccountToken" | "originalTransactionId" | "accountSubscription">;
      userId: string;
    }
  | {
      candidateUserIds: string[];
      kind: "conflict";
    };

export class AppStoreStateConflictError extends Error {
  readonly code: string;
  readonly status = 409;

  constructor(code: string) {
    super("App Store account or transaction mapping conflicts with existing state.");
    this.name = "AppStoreStateConflictError";
    this.code = code;
  }
}

export class AppStoreStateValidationError extends Error {
  readonly code: string;
  readonly status = 400;

  constructor(code: string) {
    super("App Store state input is invalid.");
    this.name = "AppStoreStateValidationError";
    this.code = code;
  }
}

function requiredText(value: string, field: string, maximumLength = 255) {
  const normalized = value.trim();
  if (!normalized || normalized.length > maximumLength) {
    throw new AppStoreStateValidationError(`invalid_${field}`);
  }
  return normalized;
}

function optionalText(value: string | null | undefined, field: string, maximumLength = 255) {
  if (value === null || value === undefined) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maximumLength) throw new AppStoreStateValidationError(`invalid_${field}`);
  return normalized;
}

function accountToken(value: string) {
  const normalized = requiredText(value, "app_account_token", 36).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(normalized)) {
    throw new AppStoreStateValidationError("invalid_app_account_token");
  }
  return normalized;
}

function optionalDate(value: DateInput, field: string) {
  if (value === null || value === undefined) return null;
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : typeof value === "number"
        ? new Date(value)
        : new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppStoreStateValidationError(`invalid_${field}`);
  return date;
}

function appleStatus(value: number) {
  if (!Number.isSafeInteger(value) || value < 1) throw new AppStoreStateValidationError("invalid_apple_status");
  return value;
}

function optionalAutoRenewStatus(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  if (value !== 0 && value !== 1) throw new AppStoreStateValidationError("invalid_auto_renew_status");
  return value;
}

function notificationStatus(value: string): AppStoreNotificationReceiptStatus {
  if (
    value === "received" ||
    value === "processing" ||
    value === "processed" ||
    value === "unlinked" ||
    value === "conflict" ||
    value === "ignored" ||
    value === "failed"
  ) {
    return value;
  }
  throw new AppStoreStateValidationError("invalid_notification_status");
}

export function appStoreNotificationClaimDecision(
  receipt: Pick<AppStoreNotificationReceipt, "status" | "updatedAt">,
  now = new Date()
): AppStoreNotificationClaimDecision {
  if (terminalNotificationStatuses.includes(receipt.status)) return "terminal";
  if (
    receipt.status === "processing" &&
    receipt.updatedAt.getTime() > now.getTime() - appStoreNotificationProcessingLeaseMs
  ) {
    return "busy";
  }
  return "claim";
}

export function shouldApplyAppStoreObservation(
  currentObservationVersion: bigint | null | undefined,
  observationVersion: bigint
) {
  return currentObservationVersion === null ||
    currentObservationVersion === undefined ||
    observationVersion > currentObservationVersion;
}

function environment(value: string | null): AppStoreServerEnvironment | undefined {
  if (value === null) return undefined;
  if (value === "Production" || value === "Sandbox") return value;
  throw new AppStoreStateValidationError("invalid_environment");
}

function payloadHash(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new AppStoreStateValidationError("invalid_payload_hash");
  }
  return normalized;
}

function errorCode(value: string | null | undefined) {
  const normalized = optionalText(value, "error_code", 80);
  if (normalized && !/^[a-z0-9][a-z0-9._-]*$/i.test(normalized)) {
    throw new AppStoreStateValidationError("invalid_error_code");
  }
  return normalized;
}

function mapState(row: AppStoreSubscriptionStateRow): AppStoreSubscriptionState {
  return {
    appAccountToken: row.appAccountToken,
    appleStatus: row.appleStatus ?? undefined,
    autoRenewProductId: row.autoRenewProductId ?? undefined,
    autoRenewStatus: row.autoRenewStatus ?? undefined,
    createdAt: row.createdAt,
    environment: environment(row.environment),
    expiresAt: row.expiresAt ?? undefined,
    gracePeriodExpiresAt: row.gracePeriodExpiresAt ?? undefined,
    id: row.id,
    originalTransactionId: row.originalTransactionId ?? undefined,
    observationVersion: row.observationVersion ?? undefined,
    productId: row.productId ?? undefined,
    reconciledAt: row.reconciledAt ?? undefined,
    relinkPending: row.relinkPending,
    signedAt: row.signedAt ?? undefined,
    transactionId: row.transactionId ?? undefined,
    transactionPurchasedAt: row.transactionPurchasedAt ?? undefined,
    transactionRevokedAt: row.transactionRevokedAt ?? undefined,
    updatedAt: row.updatedAt,
    userId: row.userId
  };
}

function mapReceipt(row: AppStoreNotificationReceiptRow): AppStoreNotificationReceipt {
  return {
    createdAt: row.createdAt,
    environment: environment(row.environment),
    errorCode: row.errorCode ?? undefined,
    id: row.id,
    notificationType: row.notificationType,
    notificationUUID: row.notificationUUID,
    payloadHash: row.payloadHash,
    processedAt: row.processedAt ?? undefined,
    signedAt: row.signedAt ?? undefined,
    status: notificationStatus(row.status),
    subtype: row.subtype ?? undefined,
    updatedAt: row.updatedAt,
    userId: row.userId ?? undefined
  };
}

function mapSubscription(row: AccountSubscriptionRow | undefined): AccountSubscriptionSnapshot | null {
  if (!row) return null;
  const subscription = normalizeAccountSubscription({
    cycle: row.cycle as AccountSubscriptionSnapshot["cycle"],
    plan: row.plan as AccountSubscriptionSnapshot["plan"],
    provider: row.provider as AccountSubscriptionSnapshot["provider"],
    providerCustomerId: row.providerCustomerId ?? undefined,
    providerEntitlementId: row.providerEntitlementId ?? undefined,
    providerSubscriptionId: row.providerSubscriptionId ?? undefined,
    seatCount: row.seatCount ?? undefined,
    status: row.status as AccountSubscriptionSnapshot["status"],
    updatedAt: row.updatedAt.toISOString()
  });

  return {
    ...subscription,
    updatedAt: row.updatedAt.toISOString()
  };
}

async function withAppStoreStatePersistence<T>(scope: string, operation: () => Promise<T>) {
  if (!hasDatabaseUrl()) throwAccountPersistenceUnavailable(scope);
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AppStoreStateConflictError || error instanceof AppStoreStateValidationError) throw error;
    throwAccountPersistenceUnavailable(scope, error);
  }
}

export async function reserveAppStoreObservationVersion() {
  return withAppStoreStatePersistence("reserveAppStoreObservationVersion", async () => {
    const rows = await getPrisma().$queryRaw<Array<{ observationVersion: bigint }>>`
      SELECT nextval('"AppStoreObservationSequence"') AS "observationVersion"
    `;
    const observationVersion = rows[0]?.observationVersion;
    if (typeof observationVersion !== "bigint" || observationVersion <= BigInt(0)) {
      throw new Error("App Store observation sequence returned an invalid value.");
    }
    return observationVersion;
  });
}

export async function clearUnlinkedAppStoreSubscriptionProjection(input: {
  appAccountToken: string;
  userId: string;
}) {
  const userId = requiredText(input.userId, "user_id");
  const token = accountToken(input.appAccountToken);

  return withAppStoreStatePersistence("clearUnlinkedAppStoreSubscriptionProjection", () =>
    getPrisma().$transaction(async (transaction) => {
      const users = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${userId}
        LIMIT 1
        FOR UPDATE
      `;
      if (!users[0]) throw new AppStoreStateConflictError("account_not_found");

      const states = await transaction.$queryRaw<
        Array<{
          observationVersion: bigint | null;
          originalTransactionId: string | null;
          relinkPending: boolean;
        }>
      >`
        SELECT "originalTransactionId", "observationVersion", "relinkPending"
        FROM "AppStoreSubscriptionState"
        WHERE "userId" = ${userId} AND "appAccountToken" = ${token}
        LIMIT 1
        FOR UPDATE
      `;
      const currentSubscriptionRows = await transaction.$queryRaw<AccountSubscriptionRow[]>`
        SELECT
          "plan", "cycle", "provider", "providerCustomerId", "providerEntitlementId",
          "providerSubscriptionId", "seatCount", "status", "updatedAt"
        FROM "AccountSubscription"
        WHERE "userId" = ${userId}
        LIMIT 1
        FOR UPDATE
      `;
      const state = states[0];
      const currentSubscription = mapSubscription(currentSubscriptionRows[0]);
      if (
        state?.originalTransactionId ||
        state?.observationVersion !== null && state?.observationVersion !== undefined ||
        state?.relinkPending
      ) {
        return { cleared: false, subscription: currentSubscription };
      }
      if (currentSubscription?.provider !== "app-store") {
        return { cleared: false, subscription: currentSubscription };
      }

      const cleared = normalizeAccountSubscription({
        ...currentSubscription,
        plan: "free",
        seatCount: undefined,
        status: "canceled"
      });
      const updated = await transaction.$queryRaw<AccountSubscriptionRow[]>`
        UPDATE "AccountSubscription"
        SET
          "plan" = ${cleared.plan},
          "cycle" = ${cleared.cycle},
          "provider" = ${cleared.provider},
          "providerCustomerId" = ${cleared.providerCustomerId ?? null},
          "providerEntitlementId" = ${cleared.providerEntitlementId ?? null},
          "providerSubscriptionId" = ${cleared.providerSubscriptionId ?? null},
          "seatCount" = NULL,
          "status" = ${cleared.status},
          "updatedAt" = NOW()
        WHERE "userId" = ${userId}
        RETURNING
          "plan", "cycle", "provider", "providerCustomerId", "providerEntitlementId",
          "providerSubscriptionId", "seatCount", "status", "updatedAt"
      `;
      clearAccountSubscriptionMemory(userId);
      return { cleared: true, subscription: mapSubscription(updated[0]) };
    })
  );
}

export async function upsertAppStoreAccountTokenBinding(input: {
  appAccountToken: string;
  userId: string;
}): Promise<AppStoreSubscriptionState> {
  const userId = requiredText(input.userId, "user_id");
  const token = accountToken(input.appAccountToken);

  return withAppStoreStatePersistence("upsertAppStoreAccountTokenBinding", () =>
    getPrisma().$transaction(async (transaction) => {
      const users = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${userId}
        LIMIT 1
        FOR UPDATE
      `;
      if (!users[0]) throw new AppStoreStateConflictError("account_not_found");

      await transaction.$executeRaw`
        INSERT INTO "AppStoreSubscriptionState" (
          "id", "userId", "appAccountToken", "createdAt", "updatedAt"
        )
        VALUES (${randomUUID()}, ${userId}, ${token}, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `;

      const matches = await transaction.$queryRaw<AppStoreSubscriptionStateRow[]>`
        SELECT
          "id", "userId", "appAccountToken", "originalTransactionId", "transactionId",
          "environment", "productId", "appleStatus", "expiresAt", "signedAt", "transactionPurchasedAt", "transactionRevokedAt",
          "autoRenewProductId", "autoRenewStatus", "gracePeriodExpiresAt", "reconciledAt", "relinkPending",
          "createdAt", "updatedAt"
        FROM "AppStoreSubscriptionState"
        WHERE "userId" = ${userId} OR "appAccountToken" = ${token}
        FOR UPDATE
      `;
      const exact = matches.find((row) => row.userId === userId && row.appAccountToken === token);
      if (!exact || matches.some((row) => row.userId !== userId || row.appAccountToken !== token)) {
        throw new AppStoreStateConflictError("account_token_already_bound");
      }

      const updated = await transaction.$queryRaw<AppStoreSubscriptionStateRow[]>`
        UPDATE "AppStoreSubscriptionState"
        SET "updatedAt" = NOW()
        WHERE "id" = ${exact.id}
        RETURNING
          "id", "userId", "appAccountToken", "originalTransactionId", "transactionId",
          "environment", "productId", "appleStatus", "expiresAt", "signedAt", "transactionPurchasedAt", "transactionRevokedAt",
          "autoRenewProductId", "autoRenewStatus", "gracePeriodExpiresAt", "reconciledAt", "relinkPending",
          "createdAt", "updatedAt"
      `;
      return mapState(updated[0] ?? exact);
    })
  );
}

export async function findAppStoreUserMapping(input: {
  appAccountToken?: string | null;
  originalTransactionId?: string | null;
}): Promise<AppStoreUserMapping> {
  const token = input.appAccountToken ? accountToken(input.appAccountToken) : "";
  const originalTransactionId = optionalText(input.originalTransactionId, "original_transaction_id") ?? "";
  if (!token && !originalTransactionId) return { kind: "none" };

  return withAppStoreStatePersistence("findAppStoreUserMapping", async () => {
    const candidates = await getPrisma().$queryRaw<Array<{ matchedBy: string; userId: string }>>`
      SELECT "userId", 'appAccountToken'::TEXT AS "matchedBy"
      FROM "AppStoreSubscriptionState"
      WHERE ${token} <> '' AND "appAccountToken" = ${token}
      UNION ALL
      SELECT "userId", 'originalTransactionId'::TEXT AS "matchedBy"
      FROM "AppStoreSubscriptionState"
      WHERE ${originalTransactionId} <> '' AND "originalTransactionId" = ${originalTransactionId}
      UNION ALL
      SELECT "userId", 'accountSubscription'::TEXT AS "matchedBy"
      FROM "AccountSubscription"
      WHERE ${originalTransactionId} <> ''
        AND "provider" = 'app-store'
        AND "providerSubscriptionId" = ${originalTransactionId}
    `;
    const userIds = [...new Set(candidates.map((candidate) => candidate.userId))];
    if (!userIds.length) return { kind: "none" };
    if (userIds.length > 1) return { candidateUserIds: userIds.sort(), kind: "conflict" };

    return {
      kind: "matched",
      matchedBy: [...new Set(candidates.map((candidate) => candidate.matchedBy))].filter(
        (value): value is "appAccountToken" | "originalTransactionId" | "accountSubscription" =>
          value === "appAccountToken" || value === "originalTransactionId" || value === "accountSubscription"
      ),
      userId: userIds[0]
    };
  });
}

export async function readAppStoreSubscriptionState(userIdInput: string): Promise<AppStoreSubscriptionState | null> {
  const userId = requiredText(userIdInput, "user_id");
  return withAppStoreStatePersistence("readAppStoreSubscriptionState", async () => {
    const rows = await getPrisma().$queryRaw<AppStoreSubscriptionStateRow[]>`
      SELECT
        "id", "userId", "appAccountToken", "originalTransactionId", "transactionId",
        "environment", "productId", "appleStatus", "expiresAt", "signedAt", "transactionPurchasedAt", "transactionRevokedAt",
        "autoRenewProductId", "autoRenewStatus", "gracePeriodExpiresAt", "reconciledAt", "observationVersion", "relinkPending",
        "createdAt", "updatedAt"
      FROM "AppStoreSubscriptionState"
      WHERE "userId" = ${userId}
      LIMIT 1
    `;
    return rows[0] ? mapState(rows[0]) : null;
  });
}

export function isPendingAppStoreLineageClaim(
  state?: Pick<AppStoreSubscriptionState, "originalTransactionId" | "relinkPending"> | null
) {
  return Boolean(state?.originalTransactionId && state.relinkPending);
}

export async function reserveAppStoreLineageClaim(input: {
  appAccountToken: string;
  originalTransactionId: string;
  previousAppAccountToken?: string | null;
  userId: string;
}): Promise<AppStoreSubscriptionState> {
  const userId = requiredText(input.userId, "user_id");
  const token = accountToken(input.appAccountToken);
  const previousToken = input.previousAppAccountToken
    ? accountToken(input.previousAppAccountToken)
    : "";
  const originalTransactionId = requiredText(input.originalTransactionId, "original_transaction_id");

  return withAppStoreStatePersistence("reserveAppStoreLineageClaim", () =>
    getPrisma().$transaction(async (transaction) => {
      await transaction.$queryRaw<Array<{ lock: string }>>`
        SELECT pg_advisory_xact_lock(hashtextextended(${originalTransactionId}, 0))::TEXT AS "lock"
      `;

      const users = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${userId}
        LIMIT 1
        FOR UPDATE
      `;
      if (!users[0]) throw new AppStoreStateConflictError("account_not_found");

      const stateMatches = await transaction.$queryRaw<AppStoreSubscriptionStateRow[]>`
        SELECT
          "id", "userId", "appAccountToken", "originalTransactionId", "transactionId",
          "environment", "productId", "appleStatus", "expiresAt", "signedAt", "transactionPurchasedAt", "transactionRevokedAt",
          "autoRenewProductId", "autoRenewStatus", "gracePeriodExpiresAt", "reconciledAt", "relinkPending",
          "createdAt", "updatedAt"
        FROM "AppStoreSubscriptionState"
        WHERE "userId" = ${userId}
           OR "appAccountToken" = ${token}
           OR (${previousToken} <> '' AND "appAccountToken" = ${previousToken})
           OR "originalTransactionId" = ${originalTransactionId}
        FOR UPDATE
      `;
      if (stateMatches.some((row) => row.userId !== userId)) {
        throw new AppStoreStateConflictError("lineage_claim_owned_by_another_account");
      }

      const currentState = stateMatches.find((row) => row.userId === userId);
      if (
        currentState?.originalTransactionId &&
        currentState.originalTransactionId !== originalTransactionId
      ) {
        throw new AppStoreStateConflictError("account_has_different_app_store_lineage");
      }
      if (
        currentState?.reconciledAt &&
        currentState.appAccountToken !== token
      ) {
        throw new AppStoreStateConflictError("reconciled_account_token_change_requires_ops");
      }

      const legacyOwners = await transaction.$queryRaw<Array<{ userId: string }>>`
        SELECT "userId"
        FROM "AccountSubscription"
        WHERE "provider" = 'app-store'
          AND "providerSubscriptionId" = ${originalTransactionId}
          AND "userId" <> ${userId}
        FOR UPDATE
      `;
      if (legacyOwners.length) {
        throw new AppStoreStateConflictError("lineage_claim_owned_by_legacy_subscription");
      }

      const claimed = currentState
        ? await transaction.$queryRaw<AppStoreSubscriptionStateRow[]>`
            UPDATE "AppStoreSubscriptionState"
            SET
              "appAccountToken" = ${token},
              "originalTransactionId" = ${originalTransactionId},
              "relinkPending" = TRUE,
              "updatedAt" = NOW()
            WHERE "id" = ${currentState.id}
            RETURNING
              "id", "userId", "appAccountToken", "originalTransactionId", "transactionId",
              "environment", "productId", "appleStatus", "expiresAt", "signedAt", "transactionPurchasedAt", "transactionRevokedAt",
              "autoRenewProductId", "autoRenewStatus", "gracePeriodExpiresAt", "reconciledAt", "relinkPending",
              "createdAt", "updatedAt"
          `
        : await transaction.$queryRaw<AppStoreSubscriptionStateRow[]>`
            INSERT INTO "AppStoreSubscriptionState" (
              "id", "userId", "appAccountToken", "originalTransactionId", "relinkPending", "createdAt", "updatedAt"
            )
            VALUES (${randomUUID()}, ${userId}, ${token}, ${originalTransactionId}, TRUE, NOW(), NOW())
            RETURNING
              "id", "userId", "appAccountToken", "originalTransactionId", "transactionId",
              "environment", "productId", "appleStatus", "expiresAt", "signedAt", "transactionPurchasedAt", "transactionRevokedAt",
              "autoRenewProductId", "autoRenewStatus", "gracePeriodExpiresAt", "reconciledAt", "relinkPending",
              "createdAt", "updatedAt"
          `;
      if (!claimed[0]) throw new Error("App Store lineage reservation returned no row.");
      return mapState(claimed[0]);
    })
  );
}

export async function releasePendingAppStoreLineageClaim(input: {
  appAccountToken: string;
  originalTransactionId: string;
  userId: string;
}) {
  const userId = requiredText(input.userId, "user_id");
  const token = accountToken(input.appAccountToken);
  const originalTransactionId = requiredText(input.originalTransactionId, "original_transaction_id");

  return withAppStoreStatePersistence("releasePendingAppStoreLineageClaim", () =>
    getPrisma().$transaction(async (transaction) => {
      await transaction.$queryRaw<Array<{ lock: string }>>`
        SELECT pg_advisory_xact_lock(hashtextextended(${originalTransactionId}, 0))::TEXT AS "lock"
      `;
      const released = await transaction.$executeRaw`
        UPDATE "AppStoreSubscriptionState"
        SET
          "originalTransactionId" = CASE
            WHEN "transactionId" IS NULL
              AND "environment" IS NULL
              AND "productId" IS NULL
              AND "appleStatus" IS NULL
              AND "reconciledAt" IS NULL
            THEN NULL
            ELSE "originalTransactionId"
          END,
          "relinkPending" = FALSE,
          "updatedAt" = NOW()
        WHERE "userId" = ${userId}
          AND "appAccountToken" = ${token}
          AND "originalTransactionId" = ${originalTransactionId}
          AND "relinkPending" = TRUE
      `;
      return released === 1;
    })
  );
}

export async function persistCanonicalAppStoreState(input: {
  appAccountToken: string;
  appleStatus: number;
  autoRenewProductId?: string | null;
  autoRenewStatus?: number | null;
  environment: AppStoreServerEnvironment;
  expiresAt?: DateInput;
  gracePeriodExpiresAt?: DateInput;
  observedAt: Date | number | string;
  observationVersion: bigint;
  notificationClaim?: AppStoreNotificationClaim;
  originalTransactionId: string;
  productId: string;
  signedAt?: DateInput;
  subscription: Partial<AccountSubscriptionSnapshot>;
  transactionId?: string | null;
  transactionPurchasedAt?: DateInput;
  transactionRevokedAt?: DateInput;
  userId: string;
}): Promise<{
  accountSubscription: AccountSubscriptionSnapshot | null;
  accountSubscriptionUpdated: boolean;
  observationApplied: boolean;
  state: AppStoreSubscriptionState;
}> {
  const userId = requiredText(input.userId, "user_id");
  const token = accountToken(input.appAccountToken);
  const originalTransactionId = requiredText(input.originalTransactionId, "original_transaction_id");
  const transactionId = optionalText(input.transactionId, "transaction_id");
  const productId = requiredText(input.productId, "product_id");
  const currentEnvironment = environment(input.environment);
  if (!currentEnvironment) throw new AppStoreStateValidationError("invalid_environment");
  const currentAppleStatus = appleStatus(input.appleStatus);
  const expiresAt = optionalDate(input.expiresAt, "expires_at");
  const signedAt = optionalDate(input.signedAt, "signed_at");
  const transactionPurchasedAt = optionalDate(input.transactionPurchasedAt, "transaction_purchased_at");
  const transactionRevokedAt = optionalDate(input.transactionRevokedAt, "transaction_revoked_at");
  const gracePeriodExpiresAt = optionalDate(input.gracePeriodExpiresAt, "grace_period_expires_at");
  const observedAt = optionalDate(input.observedAt, "observed_at");
  if (!observedAt) throw new AppStoreStateValidationError("invalid_observed_at");
  const observationVersion = input.observationVersion;
  if (typeof observationVersion !== "bigint" || observationVersion <= BigInt(0)) {
    throw new AppStoreStateValidationError("invalid_observation_version");
  }
  const notificationClaim = input.notificationClaim
    ? {
        claimToken: accountToken(input.notificationClaim.claimToken),
        notificationUUID: requiredText(input.notificationClaim.notificationUUID, "notification_uuid", 128)
      }
    : undefined;
  const autoRenewProductId = optionalText(input.autoRenewProductId, "auto_renew_product_id");
  const autoRenewStatus = optionalAutoRenewStatus(input.autoRenewStatus);
  const subscription = normalizeAccountSubscription({
    ...input.subscription,
    provider: "app-store",
    providerCustomerId: `app-store-${currentEnvironment.toLowerCase()}`,
    providerEntitlementId: productId,
    providerSubscriptionId: originalTransactionId
  });

  return withAppStoreStatePersistence("persistCanonicalAppStoreState", () =>
    getPrisma().$transaction(async (transaction) => {
      if (notificationClaim) {
        const claimedReceipts = await transaction.$queryRaw<Array<{ id: string }>>`
          SELECT "id"
          FROM "AppStoreNotificationReceipt"
          WHERE "notificationUUID" = ${notificationClaim.notificationUUID}
            AND "status" = 'processing'
            AND "claimToken" = ${notificationClaim.claimToken}
          LIMIT 1
          FOR UPDATE
        `;
        if (!claimedReceipts[0]) {
          throw new AppStoreStateConflictError("notification_claim_lost");
        }
      }

      const users = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${userId}
        LIMIT 1
        FOR UPDATE
      `;
      if (!users[0]) throw new AppStoreStateConflictError("account_not_found");

      const stateMatches = await transaction.$queryRaw<AppStoreSubscriptionStateRow[]>`
        SELECT
          "id", "userId", "appAccountToken", "originalTransactionId", "transactionId",
          "environment", "productId", "appleStatus", "expiresAt", "signedAt", "transactionPurchasedAt", "transactionRevokedAt",
          "autoRenewProductId", "autoRenewStatus", "gracePeriodExpiresAt", "reconciledAt", "observationVersion", "relinkPending",
          "createdAt", "updatedAt"
        FROM "AppStoreSubscriptionState"
        WHERE "userId" = ${userId}
           OR "appAccountToken" = ${token}
           OR "originalTransactionId" = ${originalTransactionId}
        FOR UPDATE
      `;
      const currentState = stateMatches.find((row) => row.userId === userId);
      if (stateMatches.some((row) => row.userId !== userId)) {
        throw new AppStoreStateConflictError("canonical_state_owned_by_another_account");
      }
      if (currentState && currentState.appAccountToken !== token) {
        throw new AppStoreStateConflictError("account_token_mismatch");
      }
      if (
        currentState?.originalTransactionId &&
        currentState.originalTransactionId !== originalTransactionId
      ) {
        throw new AppStoreStateConflictError("original_transaction_mismatch");
      }

      const legacyOwners = await transaction.$queryRaw<Array<{ userId: string }>>`
        SELECT "userId"
        FROM "AccountSubscription"
        WHERE "provider" = 'app-store'
          AND "providerSubscriptionId" = ${originalTransactionId}
          AND "userId" <> ${userId}
        FOR UPDATE
      `;
      if (legacyOwners.length) throw new AppStoreStateConflictError("legacy_subscription_owned_by_another_account");

      if (currentState && !shouldApplyAppStoreObservation(currentState.observationVersion, observationVersion)) {
        const currentSubscriptionRows = await transaction.$queryRaw<AccountSubscriptionRow[]>`
          SELECT
            "plan", "cycle", "provider", "providerCustomerId", "providerEntitlementId",
            "providerSubscriptionId", "seatCount", "status", "updatedAt"
          FROM "AccountSubscription"
          WHERE "userId" = ${userId}
          LIMIT 1
        `;
        return {
          accountSubscription: mapSubscription(currentSubscriptionRows[0]),
          accountSubscriptionUpdated: false,
          observationApplied: false,
          state: mapState(currentState)
        };
      }

      const stateRows = await transaction.$queryRaw<AppStoreSubscriptionStateRow[]>`
        INSERT INTO "AppStoreSubscriptionState" (
          "id", "userId", "appAccountToken", "originalTransactionId", "transactionId",
          "environment", "productId", "appleStatus", "expiresAt", "signedAt", "transactionPurchasedAt", "transactionRevokedAt",
          "autoRenewProductId", "autoRenewStatus", "gracePeriodExpiresAt", "reconciledAt", "observationVersion", "relinkPending",
          "createdAt", "updatedAt"
        )
        VALUES (
          ${randomUUID()}, ${userId}, ${token}, ${originalTransactionId}, ${transactionId},
          ${currentEnvironment}, ${productId}, ${currentAppleStatus}, ${expiresAt}, ${signedAt}, ${transactionPurchasedAt}, ${transactionRevokedAt},
          ${autoRenewProductId}, ${autoRenewStatus}, ${gracePeriodExpiresAt}, ${observedAt},
          ${observationVersion}, FALSE, NOW(), NOW()
        )
        ON CONFLICT ("userId") DO UPDATE
        SET
          "appAccountToken" = EXCLUDED."appAccountToken",
          "originalTransactionId" = EXCLUDED."originalTransactionId",
          "transactionId" = EXCLUDED."transactionId",
          "environment" = EXCLUDED."environment",
          "productId" = EXCLUDED."productId",
          "appleStatus" = EXCLUDED."appleStatus",
          "expiresAt" = EXCLUDED."expiresAt",
          "signedAt" = EXCLUDED."signedAt",
          "transactionPurchasedAt" = EXCLUDED."transactionPurchasedAt",
          "transactionRevokedAt" = EXCLUDED."transactionRevokedAt",
          "autoRenewProductId" = EXCLUDED."autoRenewProductId",
          "autoRenewStatus" = EXCLUDED."autoRenewStatus",
          "gracePeriodExpiresAt" = EXCLUDED."gracePeriodExpiresAt",
          "reconciledAt" = EXCLUDED."reconciledAt",
          "observationVersion" = EXCLUDED."observationVersion",
          "relinkPending" = FALSE,
          "updatedAt" = NOW()
        RETURNING
          "id", "userId", "appAccountToken", "originalTransactionId", "transactionId",
          "environment", "productId", "appleStatus", "expiresAt", "signedAt", "transactionPurchasedAt", "transactionRevokedAt",
          "autoRenewProductId", "autoRenewStatus", "gracePeriodExpiresAt", "reconciledAt", "observationVersion", "relinkPending",
          "createdAt", "updatedAt"
      `;

      const pauseRows = await transaction.$queryRaw<Array<{ paused: boolean }>>`
        SELECT EXISTS (
          SELECT 1
          FROM "TeamSubscriptionPause" pause
          JOIN "TeamMember" member
            ON member."id" = pause."teamMemberId"
           AND member."workspaceId" = pause."workspaceId"
           AND member."userId" = pause."userId"
          WHERE pause."userId" = ${userId}
            AND pause."status" = 'active'
            AND member."status" = 'active'
        ) AS "paused"
      `;
      const pausedForMemberSeat = Boolean(pauseRows[0]?.paused);

      let subscriptionRows: AccountSubscriptionRow[];
      if (pausedForMemberSeat) {
        subscriptionRows = await transaction.$queryRaw<AccountSubscriptionRow[]>`
          SELECT
            "plan", "cycle", "provider", "providerCustomerId", "providerEntitlementId",
            "providerSubscriptionId", "seatCount", "status", "updatedAt"
          FROM "AccountSubscription"
          WHERE "userId" = ${userId}
          LIMIT 1
        `;
      } else {
        subscriptionRows = await transaction.$queryRaw<AccountSubscriptionRow[]>`
          INSERT INTO "AccountSubscription" (
            "id", "userId", "plan", "cycle", "provider", "providerCustomerId",
            "providerEntitlementId", "providerSubscriptionId", "seatCount", "status",
            "createdAt", "updatedAt"
          )
          VALUES (
            ${randomUUID()}, ${userId}, ${subscription.plan}, ${subscription.cycle},
            ${subscription.provider}, ${subscription.providerCustomerId ?? null},
            ${subscription.providerEntitlementId ?? null}, ${subscription.providerSubscriptionId ?? null},
            ${subscription.seatCount ?? null}, ${subscription.status}, NOW(), NOW()
          )
          ON CONFLICT ("userId") DO UPDATE
          SET
            "plan" = EXCLUDED."plan",
            "cycle" = EXCLUDED."cycle",
            "provider" = EXCLUDED."provider",
            "providerCustomerId" = EXCLUDED."providerCustomerId",
            "providerEntitlementId" = EXCLUDED."providerEntitlementId",
            "providerSubscriptionId" = EXCLUDED."providerSubscriptionId",
            "seatCount" = EXCLUDED."seatCount",
            "status" = EXCLUDED."status",
            "updatedAt" = NOW()
          RETURNING
            "plan", "cycle", "provider", "providerCustomerId", "providerEntitlementId",
            "providerSubscriptionId", "seatCount", "status", "updatedAt"
        `;
      }

      const state = stateRows[0];
      if (!state) throw new Error("Canonical App Store state write returned no row.");
      return {
        accountSubscription: mapSubscription(subscriptionRows[0]),
        accountSubscriptionUpdated: !pausedForMemberSeat,
        observationApplied: true,
        state: mapState(state)
      };
    })
  );
}

export async function finalizeAppStoreTeamSeatRelease(input: {
  appAccountToken: string;
  observationVersion: bigint | null;
  originalTransactionId: string;
  pauseStatus: "checkout_required" | "restored";
  productId: string;
  subscription: AccountSubscriptionSnapshot;
  userId: string;
}): Promise<{ accountSubscription: AccountSubscriptionSnapshot | null; finalized: boolean }> {
  const userId = requiredText(input.userId, "user_id");
  const token = accountToken(input.appAccountToken);
  const originalTransactionId = requiredText(input.originalTransactionId, "original_transaction_id");
  const productId = requiredText(input.productId, "product_id");
  const observationVersion = input.observationVersion;
  if (
    observationVersion !== null &&
    (typeof observationVersion !== "bigint" || observationVersion <= BigInt(0))
  ) {
    throw new AppStoreStateValidationError("invalid_observation_version");
  }
  const subscription = normalizeAccountSubscription(input.subscription);
  const paidStatus = subscription.status === "active" ||
    subscription.status === "trialing" ||
    subscription.status === "past_due";
  const validTarget = subscription.provider === "app-store" &&
    subscription.providerEntitlementId === productId &&
    subscription.providerSubscriptionId === originalTransactionId &&
    (input.pauseStatus === "restored"
      ? (subscription.plan === "pro" || subscription.plan === "team") && paidStatus
      : subscription.plan === "free" && !paidStatus);
  if (!validTarget) throw new AppStoreStateValidationError("invalid_team_seat_release_subscription");

  const result = await withAppStoreStatePersistence("finalizeAppStoreTeamSeatRelease", () =>
    getPrisma().$transaction(async (transaction) => {
      const users = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${userId}
        LIMIT 1
        FOR UPDATE
      `;
      if (!users[0]) throw new AppStoreStateConflictError("account_not_found");

      const states = await transaction.$queryRaw<
        Array<{
          appAccountToken: string;
          observationVersion: bigint | null;
          originalTransactionId: string | null;
          productId: string | null;
          relinkPending: boolean;
        }>
      >`
        SELECT
          "appAccountToken", "observationVersion", "originalTransactionId", "productId", "relinkPending"
        FROM "AppStoreSubscriptionState"
        WHERE "userId" = ${userId}
        LIMIT 1
        FOR UPDATE
      `;
      const currentSubscriptionRows = await transaction.$queryRaw<AccountSubscriptionRow[]>`
        SELECT
          "plan", "cycle", "provider", "providerCustomerId", "providerEntitlementId",
          "providerSubscriptionId", "seatCount", "status", "updatedAt"
        FROM "AccountSubscription"
        WHERE "userId" = ${userId}
        LIMIT 1
        FOR UPDATE
      `;
      const state = states[0];
      const currentSubscription = mapSubscription(currentSubscriptionRows[0]);
      if (
        !state ||
        state.appAccountToken !== token ||
        state.originalTransactionId !== originalTransactionId ||
        state.productId !== productId ||
        (state.observationVersion ?? null) !== observationVersion ||
        state.relinkPending
      ) {
        return { accountSubscription: currentSubscription, finalized: false };
      }

      const pauses = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "TeamSubscriptionPause"
        WHERE "userId" = ${userId} AND "status" = 'active'
        ORDER BY "updatedAt" DESC
        LIMIT 1
        FOR UPDATE
      `;
      const pause = pauses[0];
      if (!pause) return { accountSubscription: currentSubscription, finalized: false };

      const updatedPause = await transaction.$executeRaw`
        UPDATE "TeamSubscriptionPause"
        SET
          "status" = ${input.pauseStatus},
          "restoredAt" = NOW(),
          "updatedAt" = NOW()
        WHERE "id" = ${pause.id} AND "status" = 'active'
      `;
      if (updatedPause !== 1) throw new Error("App Store Team-seat pause finalization lost its row lock.");

      const subscriptions = await transaction.$queryRaw<AccountSubscriptionRow[]>`
        INSERT INTO "AccountSubscription" (
          "id", "userId", "plan", "cycle", "provider", "providerCustomerId",
          "providerEntitlementId", "providerSubscriptionId", "seatCount", "status",
          "createdAt", "updatedAt"
        )
        VALUES (
          ${randomUUID()}, ${userId}, ${subscription.plan}, ${subscription.cycle},
          ${subscription.provider}, ${subscription.providerCustomerId ?? null},
          ${subscription.providerEntitlementId ?? null}, ${subscription.providerSubscriptionId ?? null},
          ${subscription.seatCount ?? null}, ${subscription.status}, NOW(), NOW()
        )
        ON CONFLICT ("userId") DO UPDATE
        SET
          "plan" = EXCLUDED."plan",
          "cycle" = EXCLUDED."cycle",
          "provider" = EXCLUDED."provider",
          "providerCustomerId" = EXCLUDED."providerCustomerId",
          "providerEntitlementId" = EXCLUDED."providerEntitlementId",
          "providerSubscriptionId" = EXCLUDED."providerSubscriptionId",
          "seatCount" = EXCLUDED."seatCount",
          "status" = EXCLUDED."status",
          "updatedAt" = NOW()
        RETURNING
          "plan", "cycle", "provider", "providerCustomerId", "providerEntitlementId",
          "providerSubscriptionId", "seatCount", "status", "updatedAt"
      `;
      return { accountSubscription: mapSubscription(subscriptions[0]), finalized: true };
    })
  );
  if (result.finalized) clearAccountSubscriptionMemory(userId);
  return result;
}

export async function insertAppStoreNotificationReceipt(input: {
  environment?: AppStoreServerEnvironment | null;
  notificationType: string;
  notificationUUID: string;
  payloadHash: string;
  signedAt?: DateInput;
  subtype?: string | null;
  userId?: string | null;
}): Promise<{ inserted: boolean; receipt: AppStoreNotificationReceipt }> {
  const notificationUUID = requiredText(input.notificationUUID, "notification_uuid", 128);
  const notificationType = requiredText(input.notificationType, "notification_type", 100);
  const subtype = optionalText(input.subtype, "notification_subtype", 100);
  const currentEnvironment = input.environment ? environment(input.environment) : undefined;
  const signedAt = optionalDate(input.signedAt, "signed_at");
  const hash = payloadHash(input.payloadHash);
  const userId = optionalText(input.userId, "user_id") ?? "";

  return withAppStoreStatePersistence("insertAppStoreNotificationReceipt", async () => {
    const inserted = await getPrisma().$queryRaw<AppStoreNotificationReceiptRow[]>`
      INSERT INTO "AppStoreNotificationReceipt" (
        "id", "notificationUUID", "userId", "payloadHash", "notificationType",
        "subtype", "environment", "signedAt", "status", "createdAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${notificationUUID},
        (SELECT "id" FROM "User" WHERE "id" = ${userId} LIMIT 1),
        ${hash},
        ${notificationType},
        ${subtype},
        ${currentEnvironment ?? null},
        ${signedAt},
        'received',
        NOW(),
        NOW()
      )
      ON CONFLICT ("notificationUUID") DO NOTHING
      RETURNING
        "id", "notificationUUID", "claimToken", "userId", "payloadHash", "notificationType", "subtype",
        "environment", "signedAt", "status", "errorCode", "processedAt", "createdAt", "updatedAt"
    `;
    if (inserted[0]) return { inserted: true, receipt: mapReceipt(inserted[0]) };

    const existing = await getPrisma().$queryRaw<AppStoreNotificationReceiptRow[]>`
      SELECT
        "id", "notificationUUID", "claimToken", "userId", "payloadHash", "notificationType", "subtype",
        "environment", "signedAt", "status", "errorCode", "processedAt", "createdAt", "updatedAt"
      FROM "AppStoreNotificationReceipt"
      WHERE "notificationUUID" = ${notificationUUID}
      LIMIT 1
    `;
    if (!existing[0]) throw new Error("Notification receipt conflict returned no existing row.");
    if (existing[0].payloadHash !== hash) {
      throw new AppStoreStateConflictError("notification_uuid_payload_mismatch");
    }
    return { inserted: false, receipt: mapReceipt(existing[0]) };
  });
}

export async function claimAppStoreNotificationReceipt(input: {
  notificationUUID: string;
  now?: DateInput;
}): Promise<{
  claimToken?: string;
  decision: AppStoreNotificationClaimDecision;
  receipt: AppStoreNotificationReceipt;
}> {
  const notificationUUID = requiredText(input.notificationUUID, "notification_uuid", 128);
  const now = optionalDate(input.now, "claim_time") ?? new Date();

  return withAppStoreStatePersistence("claimAppStoreNotificationReceipt", () =>
    getPrisma().$transaction(async (transaction) => {
      const existing = await transaction.$queryRaw<AppStoreNotificationReceiptRow[]>`
        SELECT
          "id", "notificationUUID", "claimToken", "userId", "payloadHash", "notificationType", "subtype",
          "environment", "signedAt", "status", "errorCode", "processedAt", "createdAt", "updatedAt"
        FROM "AppStoreNotificationReceipt"
        WHERE "notificationUUID" = ${notificationUUID}
        LIMIT 1
        FOR UPDATE
      `;
      if (!existing[0]) throw new AppStoreStateConflictError("notification_receipt_not_found");

      const receipt = mapReceipt(existing[0]);
      const decision = appStoreNotificationClaimDecision(receipt, now);
      if (decision !== "claim") return { decision, receipt };
      const claimToken = randomUUID();

      const claimed = await transaction.$queryRaw<AppStoreNotificationReceiptRow[]>`
        UPDATE "AppStoreNotificationReceipt"
        SET
          "status" = 'processing',
          "claimToken" = ${claimToken},
          "errorCode" = NULL,
          "processedAt" = NULL,
          "updatedAt" = ${now}
        WHERE "id" = ${receipt.id}
        RETURNING
          "id", "notificationUUID", "claimToken", "userId", "payloadHash", "notificationType", "subtype",
          "environment", "signedAt", "status", "errorCode", "processedAt", "createdAt", "updatedAt"
      `;
      if (!claimed[0]) throw new Error("Notification receipt claim returned no row.");
      return { claimToken, decision, receipt: mapReceipt(claimed[0]) };
    })
  );
}

export async function finalizeAppStoreNotificationReceipt(input: {
  claimToken: string;
  errorCode?: string | null;
  notificationUUID: string;
  status: AppStoreNotificationFinalStatus;
  userId: string | null;
}): Promise<{ finalized: boolean; receipt: AppStoreNotificationReceipt }> {
  const notificationUUID = requiredText(input.notificationUUID, "notification_uuid", 128);
  const status = notificationStatus(input.status);
  if (status === "received" || status === "processing") {
    throw new AppStoreStateValidationError("invalid_final_notification_status");
  }
  const nextErrorCode = errorCode(input.errorCode);
  const claimToken = accountToken(input.claimToken);
  const userId = optionalText(input.userId, "user_id") ?? "";
  return withAppStoreStatePersistence("finalizeAppStoreNotificationReceipt", () =>
    getPrisma().$transaction(async (transaction) => {
      const existing = await transaction.$queryRaw<AppStoreNotificationReceiptRow[]>`
        SELECT
          "id", "notificationUUID", "claimToken", "userId", "payloadHash", "notificationType", "subtype",
          "environment", "signedAt", "status", "errorCode", "processedAt", "createdAt", "updatedAt"
        FROM "AppStoreNotificationReceipt"
        WHERE "notificationUUID" = ${notificationUUID}
        LIMIT 1
        FOR UPDATE
      `;
      if (!existing[0]) throw new AppStoreStateConflictError("notification_receipt_not_found");

      const currentStatus = notificationStatus(existing[0].status);
      if (terminalNotificationStatuses.includes(currentStatus)) {
        return { finalized: false, receipt: mapReceipt(existing[0]) };
      }
      if (currentStatus !== "processing" || existing[0].claimToken !== claimToken) {
        throw new AppStoreStateConflictError("notification_claim_lost");
      }

      const updated = await transaction.$queryRaw<AppStoreNotificationReceiptRow[]>`
        UPDATE "AppStoreNotificationReceipt"
        SET
          "userId" = (SELECT "id" FROM "User" WHERE "id" = ${userId} LIMIT 1),
          "status" = ${status},
          "claimToken" = NULL,
          "errorCode" = ${nextErrorCode},
          "processedAt" = NOW(),
          "updatedAt" = NOW()
        WHERE "notificationUUID" = ${notificationUUID}
          AND "claimToken" = ${claimToken}
        RETURNING
          "id", "notificationUUID", "claimToken", "userId", "payloadHash", "notificationType", "subtype",
          "environment", "signedAt", "status", "errorCode", "processedAt", "createdAt", "updatedAt"
      `;
      if (!updated[0]) throw new Error("Notification receipt finalization returned no row.");
      return { finalized: true, receipt: mapReceipt(updated[0]) };
    })
  );
}
