#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { NextRequest } from "next/server";
import { POST as receiveAppStoreNotification } from "@/app/api/billing/app-store/notifications/route";
import { appStoreServerRequestTimeoutMs } from "@/lib/billing/app-store-server";
import {
  AppStoreStateConflictError,
  AppStoreStateValidationError,
  appStoreNotificationClaimDecision,
  appStoreNotificationProcessingLeaseMs,
  finalizeAppStoreTeamSeatRelease,
  finalizeAppStoreNotificationReceipt,
  findAppStoreUserMapping,
  insertAppStoreNotificationReceipt,
  persistCanonicalAppStoreState,
  shouldApplyAppStoreObservation,
  upsertAppStoreAccountTokenBinding
} from "@/lib/billing/app-store-state";

const endpoint = "http://localhost/api/billing/app-store/notifications";
const accountToken = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const notificationClaimToken = "11111111-2222-4333-8444-555555555555";

function request(body: string, headers: HeadersInit = {}) {
  return new NextRequest(endpoint, {
    body,
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    method: "POST"
  });
}

async function assertStatus(responsePromise: Promise<Response | undefined>, expected: number, label: string) {
  const response = await responsePromise;
  assert.ok(response, `${label} must return an HTTP response`);
  assert.equal(response.status, expected, label);
  assert.equal(response.headers.get("cache-control"), "no-store", `${label} must be non-cacheable`);
  return response;
}

async function checkNotificationRequestBoundary() {
  await assertStatus(receiveAppStoreNotification(request("{")), 400, "Malformed notification JSON must fail closed");
  await assertStatus(receiveAppStoreNotification(request("{}")), 400, "A missing signed payload must fail closed");
  await assertStatus(
    receiveAppStoreNotification(
      request(JSON.stringify({ signedPayload: "ignored" }), { "Content-Length": String(128 * 1024 + 1) })
    ),
    413,
    "An oversized declared notification must be rejected before verification"
  );
  await assertStatus(
    receiveAppStoreNotification(request(`"${"x".repeat(128 * 1024)}"`)),
    413,
    "An oversized streamed notification must be rejected while reading"
  );

  const names = [
    "APP_STORE_BUNDLE_ID",
    "APP_STORE_APP_APPLE_ID",
    "APP_STORE_CONNECT_ISSUER_ID",
    "APP_STORE_CONNECT_KEY_ID",
    "APP_STORE_CONNECT_PRIVATE_KEY"
  ] as const;
  const original = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    for (const name of names) delete process.env[name];
    const response = await assertStatus(
      receiveAppStoreNotification(request(JSON.stringify({ signedPayload: "not-a-jws" }))),
      503,
      "Signed-data verification must stay unavailable until protected Apple configuration is complete"
    );
    assert.equal(response.headers.get("retry-after"), "30", "A configuration-gated notification should request a bounded retry");
  } finally {
    for (const name of names) {
      const value = original[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

async function checkStateValidationBoundary() {
  assert.deepEqual(
    await findAppStoreUserMapping({}),
    { kind: "none" },
    "A notification without an account token or transaction lineage must remain unlinked"
  );

  await assert.rejects(
    upsertAppStoreAccountTokenBinding({ appAccountToken: "not-a-uuid", userId: "user-1" }),
    (error: unknown) => error instanceof AppStoreStateValidationError && error.code === "invalid_app_account_token",
    "Account-token binding must reject malformed UUIDs before persistence"
  );

  await assert.rejects(
    finalizeAppStoreNotificationReceipt({
      claimToken: notificationClaimToken,
      notificationUUID: "notification-1",
      status: "processing" as never,
      userId: null
    }),
    (error: unknown) => error instanceof AppStoreStateValidationError && error.code === "invalid_final_notification_status",
    "A receipt cannot be finalized into its in-flight processing state"
  );

  await assert.rejects(
    insertAppStoreNotificationReceipt({
      notificationType: "DID_RENEW",
      notificationUUID: "notification-1",
      payloadHash: "raw-payload"
    }),
    (error: unknown) => error instanceof AppStoreStateValidationError && error.code === "invalid_payload_hash",
    "Notification receipts must accept only normalized SHA-256 hashes"
  );

  await assert.rejects(
    finalizeAppStoreNotificationReceipt({
      claimToken: notificationClaimToken,
      notificationUUID: "notification-1",
      status: "received" as never,
      userId: null
    }),
    (error: unknown) => error instanceof AppStoreStateValidationError && error.code === "invalid_final_notification_status",
    "A receipt cannot be finalized back to its non-terminal received state"
  );

  await assert.rejects(
    finalizeAppStoreNotificationReceipt({
      claimToken: notificationClaimToken,
      errorCode: "contains private data",
      notificationUUID: "notification-1",
      status: "failed",
      userId: null
    }),
    (error: unknown) => error instanceof AppStoreStateValidationError && error.code === "invalid_error_code",
    "Receipt error codes must remain bounded machine identifiers"
  );

  await assert.rejects(
    persistCanonicalAppStoreState({
      appAccountToken: accountToken,
      appleStatus: 1,
      environment: "Xcode" as never,
      observedAt: new Date(),
      observationVersion: BigInt(1),
      originalTransactionId: "original-1",
      productId: "com.capitolwonk.pro.monthly",
      subscription: { cycle: "monthly", plan: "pro", status: "active" },
      transactionId: "transaction-1",
      userId: "user-1"
    }),
    (error: unknown) => error instanceof AppStoreStateValidationError && error.code === "invalid_environment",
    "Canonical state must reject unverified Xcode transactions"
  );

  await assert.rejects(
    persistCanonicalAppStoreState({
      appAccountToken: accountToken,
      appleStatus: 1,
      autoRenewStatus: 2,
      environment: "Sandbox",
      observedAt: new Date(),
      observationVersion: BigInt(1),
      originalTransactionId: "original-1",
      productId: "com.capitolwonk.pro.monthly",
      subscription: { cycle: "monthly", plan: "pro", status: "active" },
      transactionId: "transaction-1",
      userId: "user-1"
    }),
    (error: unknown) => error instanceof AppStoreStateValidationError && error.code === "invalid_auto_renew_status",
    "Canonical state must reject unknown auto-renew status values"
  );
}

async function checkObservationOrderingBoundary() {
  const olderObservedAt = new Date("2026-09-11T20:00:00.000Z");
  const newerObservedAt = new Date("2026-09-11T20:00:05.000Z");
  const olderObservationVersion = BigInt(41);
  const newerObservationVersion = BigInt(42);
  assert.equal(shouldApplyAppStoreObservation(null, olderObservationVersion), true);
  assert.equal(shouldApplyAppStoreObservation(olderObservationVersion, newerObservationVersion), true);
  assert.equal(shouldApplyAppStoreObservation(newerObservationVersion, newerObservationVersion), false);
  assert.equal(
    shouldApplyAppStoreObservation(newerObservationVersion, olderObservationVersion),
    false,
    "A delayed old Apple observation must lose to the newer persisted observation"
  );
  let persistedVersion: bigint | null = null;
  for (const response of [newerObservationVersion, olderObservationVersion]) {
    if (shouldApplyAppStoreObservation(persistedVersion, response)) persistedVersion = response;
  }
  assert.equal(
    persistedVersion,
    newerObservationVersion,
    "Response-order inversion must not let the earlier-started Apple request overwrite the later request"
  );

  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalPrisma = globalThis.__capitolLedgerPrisma;
  const queries: string[] = [];
  const currentState = {
    appAccountToken: accountToken,
    appleStatus: 2,
    autoRenewProductId: null,
    autoRenewStatus: 0,
    createdAt: olderObservedAt,
    environment: "Sandbox",
    expiresAt: olderObservedAt,
    gracePeriodExpiresAt: null,
    id: "state-1",
    originalTransactionId: "original-1",
    observationVersion: newerObservationVersion,
    productId: "com.capitolwonk.pro.monthly",
    reconciledAt: newerObservedAt,
    relinkPending: false,
    signedAt: newerObservedAt,
    transactionId: "newer-transaction",
    updatedAt: newerObservedAt,
    userId: "user-1"
  };
  const currentSubscription = {
    cycle: "monthly",
    plan: "free",
    provider: "app-store",
    providerCustomerId: "app-store-sandbox",
    providerEntitlementId: "com.capitolwonk.pro.monthly",
    providerSubscriptionId: "original-1",
    seatCount: null,
    status: "canceled",
    updatedAt: newerObservedAt
  };
  const transaction = {
    $queryRaw: async (strings: TemplateStringsArray) => {
      const sql = strings.join(" ");
      queries.push(sql);
      if (sql.includes('FROM "User"')) return [{ id: "user-1" }];
      if (sql.includes('FROM "AppStoreSubscriptionState"')) return [currentState];
      if (sql.includes('FROM "AccountSubscription"') && sql.includes('"provider" = \'app-store\'')) return [];
      if (sql.includes('FROM "AccountSubscription"')) return [currentSubscription];
      throw new Error(`Unexpected observation fixture query: ${sql}`);
    }
  };
  const fakePrisma = {
    $transaction: async (operation: (client: typeof transaction) => Promise<unknown>) => operation(transaction)
  };

  try {
    process.env.DATABASE_URL = "postgresql://fixture.invalid/capitolwonk";
    globalThis.__capitolLedgerPrisma = fakePrisma as never;
    const result = await persistCanonicalAppStoreState({
      appAccountToken: accountToken,
      appleStatus: 1,
      environment: "Sandbox",
      observedAt: olderObservedAt,
      observationVersion: olderObservationVersion,
      originalTransactionId: "original-1",
      productId: "com.capitolwonk.pro.monthly",
      subscription: { cycle: "monthly", plan: "pro", status: "active" },
      transactionId: "older-transaction",
      userId: "user-1"
    });
    assert.equal(result.observationApplied, false);
    assert.equal(result.accountSubscriptionUpdated, false);
    assert.equal(result.accountSubscription?.plan, "free");
    assert.equal(result.accountSubscription?.status, "canceled");
    assert.equal(result.state.transactionId, "newer-transaction");
    assert.equal(result.state.reconciledAt?.toISOString(), newerObservedAt.toISOString());
    assert.ok(
      queries.every((sql) => !sql.includes('INSERT INTO "AppStoreSubscriptionState"')),
      "A stale observation must not write canonical state or its incoming entitlement"
    );
  } finally {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalPrisma === undefined) delete globalThis.__capitolLedgerPrisma;
    else globalThis.__capitolLedgerPrisma = originalPrisma;
  }

  const stateSource = fs.readFileSync("lib/billing/app-store-state.ts", "utf8");
  const serverSource = fs.readFileSync("lib/billing/app-store-server.ts", "utf8");
  const accountRouteSource = fs.readFileSync("app/api/account/subscription/app-store/route.ts", "utf8");
  const notificationRouteSource = fs.readFileSync("app/api/billing/app-store/notifications/route.ts", "utf8");
  const cleanupSource = fs.readFileSync("lib/account-deletion-cleanup.ts", "utf8");
  const teamSource = fs.readFileSync("lib/team-subscription-transition.ts", "utf8");
  assert.ok(
    serverSource.indexOf("reserveAppStoreObservationVersion()") < serverSource.indexOf("getAllSubscriptionStatuses"),
    "A database-issued observation version must be reserved before the Apple request starts"
  );
  assert.ok(
    stateSource.indexOf("shouldApplyAppStoreObservation(currentState.observationVersion, observationVersion)") <
      stateSource.indexOf('INSERT INTO "AppStoreSubscriptionState"', stateSource.indexOf("persistCanonicalAppStoreState")),
    "Persistence must reject a stale observation before either entitlement table is updated"
  );
  const canonicalPersistenceSource = stateSource.slice(
    stateSource.indexOf("export async function persistCanonicalAppStoreState"),
    stateSource.indexOf("export async function finalizeAppStoreTeamSeatRelease")
  );
  assert.ok(
    canonicalPersistenceSource.indexOf('FROM "User"') < canonicalPersistenceSource.indexOf('FROM "AppStoreSubscriptionState"') &&
      canonicalPersistenceSource.indexOf("FOR UPDATE") < canonicalPersistenceSource.indexOf('FROM "AppStoreSubscriptionState"'),
    "An exclusive User-row lock must serialize the first canonical insert when no state row exists yet"
  );
  for (const [label, source] of [
    ["account sync", accountRouteSource],
    ["notification", notificationRouteSource],
    ["account cleanup", cleanupSource],
    ["team transition", teamSource]
  ] as const) {
    assert.ok(
      source.includes("observedAt: canonical.observedAt"),
      `${label} persistence must carry the provider-response observation timestamp`
    );
    assert.ok(
      source.includes("observationVersion: canonical.observationVersion"),
      `${label} persistence must carry the pre-request database observation version`
    );
    assert.ok(
      !source.includes("reconciledAt: new Date()"),
      `${label} persistence must not replace provider-response ordering with a later local timestamp`
    );
  }
  assert.ok(!accountRouteSource.includes("persisted.accountSubscription ?? canonical.snapshot"));
  assert.ok(!cleanupSource.includes("result.accountSubscription ?? canonical.snapshot"));
  assert.ok(
    teamSource.indexOf("if (!persistence.observationApplied)") <
      teamSource.indexOf("isActivePaidSubscription(canonical.snapshot)", teamSource.indexOf("if (!persistence.observationApplied)")),
    "Team-seat release must stop before consulting an incoming entitlement when persistence rejects it as stale"
  );
}

async function checkTeamSeatReleaseObservationFence() {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalPrisma = globalThis.__capitolLedgerPrisma;
  const now = new Date("2026-09-11T20:00:00.000Z");
  const currentObservationVersion = BigInt(42);
  const originalTransactionId = "original-1";
  const productId = "com.capitolwonk.pro.monthly";
  let pauseActive = true;
  let projectionWrites = 0;
  const currentSubscription = {
    cycle: "monthly",
    plan: "free",
    provider: "app-store",
    providerCustomerId: "app-store-sandbox",
    providerEntitlementId: productId,
    providerSubscriptionId: originalTransactionId,
    seatCount: null,
    status: "canceled",
    updatedAt: now
  };
  const transaction = {
    $executeRaw: async (strings: TemplateStringsArray) => {
      const sql = strings.join(" ");
      if (!sql.includes('UPDATE "TeamSubscriptionPause"')) {
        throw new Error(`Unexpected Team-seat finalization write: ${sql}`);
      }
      pauseActive = false;
      return 1;
    },
    $queryRaw: async (strings: TemplateStringsArray) => {
      const sql = strings.join(" ");
      if (sql.includes('FROM "User"')) return [{ id: "user-1" }];
      if (sql.includes('FROM "AppStoreSubscriptionState"')) {
        return [{
          appAccountToken: accountToken,
          observationVersion: currentObservationVersion,
          originalTransactionId,
          productId,
          relinkPending: false
        }];
      }
      if (sql.includes('FROM "AccountSubscription"')) return [currentSubscription];
      if (sql.includes('FROM "TeamSubscriptionPause"')) return pauseActive ? [{ id: "pause-1" }] : [];
      if (sql.includes('INSERT INTO "AccountSubscription"')) {
        projectionWrites += 1;
        return [currentSubscription];
      }
      throw new Error(`Unexpected Team-seat finalization query: ${sql}`);
    }
  };
  const fakePrisma = {
    $transaction: async (operation: (client: typeof transaction) => Promise<unknown>) => operation(transaction)
  };
  const activeSnapshot = {
    cycle: "monthly" as const,
    plan: "pro" as const,
    provider: "app-store" as const,
    providerCustomerId: "app-store-sandbox",
    providerEntitlementId: productId,
    providerSubscriptionId: originalTransactionId,
    status: "active" as const,
    updatedAt: now.toISOString()
  };

  try {
    process.env.DATABASE_URL = "postgresql://fixture.invalid/capitolwonk";
    globalThis.__capitolLedgerPrisma = fakePrisma as never;
    const stale = await finalizeAppStoreTeamSeatRelease({
      appAccountToken: accountToken,
      observationVersion: BigInt(41),
      originalTransactionId,
      pauseStatus: "restored",
      productId,
      subscription: activeSnapshot,
      userId: "user-1"
    });
    assert.equal(stale.finalized, false);
    assert.equal(stale.accountSubscription?.plan, "free");
    assert.equal(projectionWrites, 0, "An older active response must not re-grant Pro after a newer cancellation");
    assert.equal(pauseActive, true, "A stale response must not consume the Team-seat pause");

    const current = await finalizeAppStoreTeamSeatRelease({
      appAccountToken: accountToken,
      observationVersion: currentObservationVersion,
      originalTransactionId,
      pauseStatus: "checkout_required",
      productId,
      subscription: {
        ...activeSnapshot,
        plan: "free",
        status: "canceled"
      },
      userId: "user-1"
    });
    assert.equal(current.finalized, true);
    assert.equal(projectionWrites, 1);
    assert.equal(pauseActive, false);
  } finally {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalPrisma === undefined) delete globalThis.__capitolLedgerPrisma;
    else globalThis.__capitolLedgerPrisma = originalPrisma;
  }
}

function checkNotificationClaimBoundary() {
  const now = new Date("2026-09-11T20:00:00.000Z");
  const receipt = (status: Parameters<typeof appStoreNotificationClaimDecision>[0]["status"], updatedAt = now) => ({
    status,
    updatedAt
  });

  assert.equal(appStoreNotificationClaimDecision(receipt("received"), now), "claim");
  assert.equal(appStoreNotificationClaimDecision(receipt("failed"), now), "claim");
  assert.equal(appStoreNotificationClaimDecision(receipt("processing"), now), "busy");
  assert.equal(
    appStoreNotificationClaimDecision(
      receipt("processing", new Date(now.getTime() - appStoreNotificationProcessingLeaseMs - 1)),
      now
    ),
    "claim",
    "A crashed notification worker's expired lease must be recoverable"
  );
  for (const status of ["processed", "unlinked", "conflict", "ignored"] as const) {
    assert.equal(appStoreNotificationClaimDecision(receipt(status), now), "terminal");
  }
  assert.ok(
    appStoreServerRequestTimeoutMs < appStoreNotificationProcessingLeaseMs,
    "Apple network calls must time out before a notification processing lease can be reclaimed"
  );

  const stateSource = fs.readFileSync("lib/billing/app-store-state.ts", "utf8");
  const routeSource = fs.readFileSync("app/api/billing/app-store/notifications/route.ts", "utf8");
  const migrationSource = fs.readFileSync("prisma/migrations/20260911110000_app_store_server_state/migration.sql", "utf8");
  const claimSource = stateSource.slice(
    stateSource.indexOf("export async function claimAppStoreNotificationReceipt"),
    stateSource.indexOf("export async function finalizeAppStoreNotificationReceipt")
  );
  assert.ok(
    claimSource.includes("FOR UPDATE") &&
      claimSource.includes('"status" = \'processing\'') &&
      claimSource.includes('"claimToken" = ${claimToken}') &&
      claimSource.includes("appStoreNotificationClaimDecision"),
    "The tested claim decision must issue a unique fencing token while holding the receipt row lock"
  );
  assert.ok(
    routeSource.indexOf("claimAppStoreNotificationReceipt") < routeSource.indexOf("verifyAppStoreTransactionInEnvironment(", routeSource.indexOf("async function handleAppStoreNotification")) &&
      routeSource.includes('claim.decision === "busy"') &&
      routeSource.includes('claim.decision === "terminal"'),
    "Every notification must own the processing lease before transaction reconciliation"
  );
  assert.ok(migrationSource.includes("'processing'"), "The database status constraint must permit the processing lease state");
  assert.ok(
    migrationSource.includes('CREATE SEQUENCE "AppStoreObservationSequence"') &&
      migrationSource.includes('"observationVersion" BIGINT') &&
      stateSource.includes("SELECT nextval('\"AppStoreObservationSequence\"')") &&
      stateSource.includes("observationVersion > currentObservationVersion"),
    "Database-issued request ordering must survive response inversion across application instances"
  );
  assert.ok(
    migrationSource.includes('"claimToken" TEXT') &&
      routeSource.includes("notificationClaim: { claimToken, notificationUUID }") &&
      stateSource.includes('AND "claimToken" = ${notificationClaim.claimToken}') &&
      stateSource.includes('AND "claimToken" = ${claimToken}'),
    "A reclaimed notification must fence the prior worker from canonical persistence and finalization"
  );
}

async function checkLostNotificationClaimBoundary() {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalPrisma = globalThis.__capitolLedgerPrisma;
  const queries: string[] = [];
  const now = new Date("2026-09-11T20:00:00.000Z");
  const stolenClaimToken = "99999999-8888-4777-8666-555555555555";
  const receiptRow = {
    claimToken: stolenClaimToken,
    createdAt: now,
    environment: "Sandbox",
    errorCode: null,
    id: "receipt-1",
    notificationType: "DID_RENEW",
    notificationUUID: "notification-1",
    payloadHash: "a".repeat(64),
    processedAt: null,
    signedAt: now,
    status: "processing",
    subtype: null,
    updatedAt: now,
    userId: null
  };
  const transaction = {
    $queryRaw: async (strings: TemplateStringsArray) => {
      const sql = strings.join(" ");
      queries.push(sql);
      return [receiptRow];
    }
  };
  const fakePrisma = {
    $transaction: async (operation: (client: typeof transaction) => Promise<unknown>) => operation(transaction)
  };

  try {
    process.env.DATABASE_URL = "postgresql://fixture.invalid/capitolwonk";
    globalThis.__capitolLedgerPrisma = fakePrisma as never;
    await assert.rejects(
      finalizeAppStoreNotificationReceipt({
        claimToken: notificationClaimToken,
        notificationUUID: "notification-1",
        status: "processed",
        userId: null
      }),
      (error: unknown) => error instanceof AppStoreStateConflictError && error.code === "notification_claim_lost",
      "A worker whose lease was reclaimed must not finalize the newer worker's receipt"
    );
    assert.equal(
      queries.some((sql) => sql.includes('UPDATE "AppStoreNotificationReceipt"')),
      false,
      "A lost fencing token must be rejected before any receipt mutation"
    );
  } finally {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalPrisma === undefined) delete globalThis.__capitolLedgerPrisma;
    else globalThis.__capitolLedgerPrisma = originalPrisma;
  }
}

async function main() {
  await checkNotificationRequestBoundary();
  await checkStateValidationBoundary();
  await checkObservationOrderingBoundary();
  await checkTeamSeatReleaseObservationFence();
  checkNotificationClaimBoundary();
  await checkLostNotificationClaimBoundary();
  console.log("App Store state and notification boundary fixture check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
