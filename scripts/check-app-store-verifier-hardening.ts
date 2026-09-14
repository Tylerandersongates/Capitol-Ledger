#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { NextRequest } from "next/server";
import { GET as requestAppStoreAccountToken } from "@/app/api/account/subscription/app-store/account-token/route";
import { POST as syncAppStoreSubscription } from "@/app/api/account/subscription/app-store/route";
import { POST as receiveAppStoreNotification } from "@/app/api/billing/app-store/notifications/route";
import {
  appStoreServerNotificationsAreEnabled,
  appStoreServerVerificationIsEnabled,
  readValidatedAppStoreStatusGroups
} from "@/lib/billing/app-store-server";
import {
  AppStoreVerificationBoundaryError,
  appStoreMaximumActiveVerifications,
  appStoreVerificationTimeoutMs,
  createAppStoreVerificationBoundary
} from "@/lib/billing/app-store-verifier-boundary";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

async function nextTurn() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

function checkExactActivationGates() {
  const names = [
    "APP_STORE_SERVER_VERIFICATION_ENABLED",
    "APP_STORE_SERVER_NOTIFICATIONS_ENABLED"
  ] as const;
  const original = Object.fromEntries(names.map((name) => [name, process.env[name]]));

  try {
    for (const name of names) delete process.env[name];
    assert.equal(appStoreServerVerificationIsEnabled(), false, "Verification must be disabled when its gate is absent");
    assert.equal(appStoreServerNotificationsAreEnabled(), false, "Notifications must be disabled when both gates are absent");

    process.env.APP_STORE_SERVER_VERIFICATION_ENABLED = "TRUE";
    process.env.APP_STORE_SERVER_NOTIFICATIONS_ENABLED = "1";
    assert.equal(appStoreServerVerificationIsEnabled(), false, "Truthy-looking verification values must remain disabled");
    assert.equal(appStoreServerNotificationsAreEnabled(), false, "Truthy-looking notification values must remain disabled");

    process.env.APP_STORE_SERVER_VERIFICATION_ENABLED = "true";
    assert.equal(appStoreServerVerificationIsEnabled(), true, "The exact verification activation value must be recognized");
    assert.equal(appStoreServerNotificationsAreEnabled(), false, "The callback must retain its independent kill switch");

    process.env.APP_STORE_SERVER_NOTIFICATIONS_ENABLED = "true";
    assert.equal(appStoreServerNotificationsAreEnabled(), true, "Notifications require both exact activation values");
  } finally {
    for (const name of names) {
      const value = original[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

async function checkRouteKillSwitches() {
  const names = [
    "APP_STORE_SERVER_VERIFICATION_ENABLED",
    "APP_STORE_SERVER_NOTIFICATIONS_ENABLED"
  ] as const;
  const original = Object.fromEntries(names.map((name) => [name, process.env[name]]));

  try {
    for (const name of names) delete process.env[name];
    const responses = await Promise.all([
      requestAppStoreAccountToken(),
      syncAppStoreSubscription(
        new NextRequest("http://localhost/api/account/subscription/app-store", {
          body: "not-json",
          method: "POST"
        })
      ),
      receiveAppStoreNotification(
        new NextRequest("http://localhost/api/billing/app-store/notifications", {
          body: "not-json",
          method: "POST"
        })
      )
    ]);
    const expectedCodes = [
      "APP_STORE_SERVER_VERIFICATION_DISABLED",
      "APP_STORE_SERVER_VERIFICATION_DISABLED",
      "APP_STORE_SERVER_NOTIFICATIONS_DISABLED"
    ];

    for (const [index, response] of responses.entries()) {
      assert.ok(response, "Every disabled Apple server entry point must return an HTTP response");
      assert.equal(response.status, 503, "Every disabled Apple server entry point must fail retryably");
      assert.equal(response.headers.get("cache-control"), "no-store", "Disabled responses must not be cached");
      assert.equal(response.headers.get("retry-after"), "30", "Disabled responses must request a bounded retry");
      assert.equal((await response.json()).code, expectedCodes[index], "Disabled routes must return stable machine codes");
    }
  } finally {
    for (const name of names) {
      const value = original[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

async function checkCapacityBoundary() {
  const boundary = createAppStoreVerificationBoundary({ maximumActive: 4, timeoutMs: 1_000 });
  const operations = Array.from({ length: 4 }, () => deferred<number>());
  const pending = operations.map((operation) => boundary.run(() => operation.promise));
  await nextTurn();
  assert.equal(boundary.activeCount(), 4, "Four verifier operations may be active at once");

  await assert.rejects(
    boundary.run(async () => 5),
    (error: unknown) =>
      error instanceof AppStoreVerificationBoundaryError &&
      error.code === "app_store_verification_capacity_exceeded" &&
      error.retryable,
    "A fifth verifier operation must fail retryably without entering an in-memory queue"
  );
  assert.equal(boundary.activeCount(), 4, "Rejected excess work must not consume another slot");

  operations.forEach((operation, index) => operation.resolve(index));
  assert.deepEqual(await Promise.all(pending), [0, 1, 2, 3]);
  assert.equal(boundary.activeCount(), 0, "Completed verifier operations must release their slots");
}

async function checkTimeoutContainment() {
  const boundary = createAppStoreVerificationBoundary({ maximumActive: 1, timeoutMs: 10 });
  const operation = deferred<string>();
  const timedOut = boundary.run(() => operation.promise);

  await assert.rejects(
    timedOut,
    (error: unknown) =>
      error instanceof AppStoreVerificationBoundaryError &&
      error.code === "app_store_verification_timed_out" &&
      error.retryable,
    "The end-to-end deadline must fail retryably"
  );
  assert.equal(
    boundary.activeCount(),
    1,
    "Apple 3.1.0 work that cannot be aborted must retain its slot after the caller deadline"
  );
  await assert.rejects(
    boundary.run(async () => "excess"),
    (error: unknown) =>
      error instanceof AppStoreVerificationBoundaryError &&
      error.code === "app_store_verification_capacity_exceeded",
    "A timed-out background operation must continue counting against the hard capacity ceiling"
  );

  operation.resolve("settled");
  await nextTurn();
  assert.equal(boundary.activeCount(), 0, "The slot may be released only when the real Apple operation settles");
}

function checkMalformedStatusResponses() {
  const valid = {
    data: [
      {
        lastTransactions: [
          {
            originalTransactionId: "original-1",
            signedRenewalInfo: "renewal-jws",
            signedTransactionInfo: "transaction-jws",
            status: 1
          }
        ],
        subscriptionGroupIdentifier: "group-1"
      }
    ]
  };
  assert.equal(readValidatedAppStoreStatusGroups(valid).length, 1);

  const malformed = [
    {},
    { data: {} },
    { data: [{}] },
    { data: [{ lastTransactions: [{}] }] },
    { data: [{ lastTransactions: [{ originalTransactionId: "original-1", signedTransactionInfo: "jws" }] }] },
    { data: [{ lastTransactions: [{ originalTransactionId: "original-1", signedTransactionInfo: "jws", status: 99 }] }] },
    { data: [{ lastTransactions: [{ originalTransactionId: "", signedTransactionInfo: "jws", status: 1 }] }] },
    { data: [{ lastTransactions: [{ originalTransactionId: "original-1", signedTransactionInfo: "", status: 1 }] }] },
    { data: [{ lastTransactions: [{ originalTransactionId: "original-1", signedRenewalInfo: {}, signedTransactionInfo: "jws", status: 1 }] }] }
  ];
  for (const response of malformed) {
    assert.throws(
      () => readValidatedAppStoreStatusGroups(response as never),
      /App Store status response/,
      "Missing or malformed nested App Store status data must fail closed"
    );
  }
}

function checkSourceWiring() {
  const server = fs.readFileSync("lib/billing/app-store-server.ts", "utf8");
  const boundary = fs.readFileSync("lib/billing/app-store-verifier-boundary.ts", "utf8");
  const notificationRoute = fs.readFileSync("app/api/billing/app-store/notifications/route.ts", "utf8");
  const syncRoute = fs.readFileSync("app/api/account/subscription/app-store/route.ts", "utf8");
  const accountTokenRoute = fs.readFileSync("app/api/account/subscription/app-store/account-token/route.ts", "utf8");
  const teamTransition = fs.readFileSync("lib/team-subscription-transition.ts", "utf8");
  const notificationHandler = notificationRoute.slice(notificationRoute.indexOf("async function handleAppStoreNotification"));
  const syncHandler = syncRoute.slice(syncRoute.indexOf("async function syncAppStoreSubscription"));
  const accountTokenHandler = accountTokenRoute.slice(accountTokenRoute.indexOf("async function getAppStoreAccountToken"));

  assert.equal(appStoreMaximumActiveVerifications, 4, "The approved per-instance admission ceiling must remain four");
  assert.equal(appStoreVerificationTimeoutMs, 15_000, "The caller verification deadline must remain fifteen seconds");
  assert.ok(
    /new SignedDataVerifier\(\s*getAppleRootCertificates\(\),\s*true,/.test(server),
    "Apple online revocation checks must remain enabled"
  );
  assert.ok(
    server.includes("runAppStoreServerVerification") &&
      server.indexOf("assertAppStoreServerVerificationEnabled();", server.indexOf("export async function reconcileAppStoreSubscription")) <
        server.indexOf("reserveAppStoreObservationVersion", server.indexOf("export async function reconcileAppStoreSubscription")),
    "Verifier entry points must be bounded and reconciliation must stop before its first database sequence write"
  );
  assert.ok(
    boundary.includes("activeCount >= maximumActive") &&
      boundary.includes("void pending.then(release, release)") &&
      !boundary.includes("queue.push"),
    "Admission control must reject excess work without queueing or prematurely releasing timed-out work"
  );
  assert.ok(
    notificationHandler.indexOf("appStoreServerNotificationsAreEnabled()") < notificationHandler.indexOf("readSignedPayload(request)"),
    "The Notifications V2 kill switch must run before reading or hashing the request"
  );
  assert.ok(
    syncHandler.indexOf("appStoreServerVerificationIsEnabled()") < syncHandler.indexOf("guardMutationRequest(") &&
      syncHandler.indexOf("appStoreServerVerificationIsEnabled()") < syncHandler.indexOf("getCurrentSession()"),
    "The account-sync kill switch must run before rate-limit, authentication, body, or database work"
  );
  assert.ok(
    accountTokenHandler.indexOf("appStoreServerVerificationIsEnabled()") < accountTokenHandler.indexOf("getCurrentSession()") &&
      accountTokenHandler.indexOf("appStoreServerVerificationIsEnabled()") < accountTokenHandler.indexOf("upsertAppStoreAccountTokenBinding("),
    "The purchase account-token kill switch must run before authentication or ownership persistence"
  );
  assert.ok(
    teamTransition.includes("error instanceof AppStoreServerConfigurationError") &&
      teamTransition.includes("error instanceof AppStoreServerVerificationError"),
    "A verifier/configuration failure must not downgrade or overwrite a paused App Store entitlement"
  );
}

async function main() {
  checkExactActivationGates();
  await checkRouteKillSwitches();
  await checkCapacityBoundary();
  await checkTimeoutContainment();
  checkMalformedStatusResponses();
  checkSourceWiring();
  console.log("App Store verifier hardening fixture check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
