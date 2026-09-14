#!/usr/bin/env node

import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import { Type } from "@apple/app-store-server-library";
import {
  appStoreProducts,
  getAppStoreProduct,
  toAppStoreSubscriptionSnapshot,
  type AppStoreTransactionLike
} from "@/lib/billing/app-store-products";
import {
  AppStoreSubscriptionConflictError,
  readAppStoreServerConfiguration,
  selectCanonicalCandidate,
  type VerifiedSubscriptionCandidate
} from "@/lib/billing/app-store-server";
import { isSupportedSubmittedAppStoreTransaction } from "@/lib/billing/app-store";
import { getAppleRootCertificates } from "@/lib/billing/apple-root-certificates";
import { getTeamAppStoreProducts } from "@/lib/subscription-seat-count";

const proMonthlyProductId = "com.capitolwonk.pro.monthly";
const proAnnualProductId = "com.capitolwonk.pro.annual";

const expectedAppleRootFingerprints = [
  "B0:B1:73:0E:CB:C7:FF:45:05:14:2C:49:F1:29:5E:6E:DA:6B:CA:ED:7E:2C:68:C5:BE:91:B5:A1:10:01:F0:24",
  "C2:B9:B0:42:DD:57:83:0E:7D:11:7D:AC:55:AC:8A:E1:94:07:D3:8E:41:D8:8F:32:15:BC:3A:89:04:44:A0:50",
  "63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79"
] as const;

function transaction(overrides: Partial<AppStoreTransactionLike> = {}): AppStoreTransactionLike {
  return {
    environment: "Sandbox",
    expiresDate: Date.now() + 60_000,
    originalTransactionId: "original-transaction-123",
    productId: proMonthlyProductId,
    transactionId: "transaction-456",
    type: Type.AUTO_RENEWABLE_SUBSCRIPTION,
    ...overrides
  };
}

function candidate(input: {
  expiresDate?: number;
  isUpgraded?: boolean;
  originalTransactionId?: string;
  status: number;
  transactionId?: string;
}): VerifiedSubscriptionCandidate {
  return {
    status: input.status,
    transaction: {
      environment: "Sandbox",
      expiresDate: input.expiresDate ?? Date.now() + 60_000,
      isUpgraded: input.isUpgraded,
      originalTransactionId: input.originalTransactionId ?? "lineage-a",
      productId: proMonthlyProductId,
      transactionId: input.transactionId ?? "transaction-a"
    }
  };
}

function checkConfigurationBoundary() {
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
    const missing = readAppStoreServerConfiguration();
    assert.equal(missing.configured, false, "App Store server access must fail readiness when protected configuration is absent");
    assert.deepEqual(missing.missing, [...names], "Readiness must name every absent App Store server setting");

    process.env.APP_STORE_BUNDLE_ID = "com.capitolwonk.ce";
    process.env.APP_STORE_APP_APPLE_ID = "not-a-number";
    process.env.APP_STORE_CONNECT_ISSUER_ID = "issuer";
    process.env.APP_STORE_CONNECT_KEY_ID = "key";
    process.env.APP_STORE_CONNECT_PRIVATE_KEY = "private-key";
    assert.deepEqual(
      readAppStoreServerConfiguration().missing,
      ["APP_STORE_APP_APPLE_ID"],
      "The Apple app id must be a positive integer"
    );

    process.env.APP_STORE_APP_APPLE_ID = "1234567890";
    assert.deepEqual(
      readAppStoreServerConfiguration(),
      { configured: true, missing: [] },
      "Complete App Store server settings must pass the local configuration boundary"
    );
  } finally {
    for (const name of names) {
      const value = original[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

function main() {
  assert.equal(
    isSupportedSubmittedAppStoreTransaction(transaction()),
    true,
    "A submitted allowlisted auto-renewable subscription may proceed to current-status reconciliation"
  );
  assert.equal(
    isSupportedSubmittedAppStoreTransaction(
      transaction({ productId: "com.capitolwonk.team.17.annual" })
    ),
    false,
    "A submitted reserved or unsupported product must be rejected before reconciliation"
  );
  assert.equal(
    isSupportedSubmittedAppStoreTransaction(
      transaction({ type: Type.NON_CONSUMABLE })
    ),
    false,
    "A submitted non-subscription transaction must be rejected before reconciliation"
  );

  const active = toAppStoreSubscriptionSnapshot(transaction(), { appleStatus: 1 });
  assert.equal(active.plan, "pro", "Apple status 1 must retain paid access");
  assert.equal(active.status, "active", "Apple status 1 must map to active");

  const billingRetry = toAppStoreSubscriptionSnapshot(
    transaction({ expiresDate: Date.now() - 60_000 }),
    { appleStatus: 4 }
  );
  assert.equal(billingRetry.plan, "pro", "Apple status 4 must retain paid access during billing retry");
  assert.equal(billingRetry.status, "past_due", "Apple status 4 must map to past_due even after transaction expiry");

  for (const appleStatus of [2, 3, 5]) {
    const inactive = toAppStoreSubscriptionSnapshot(transaction(), { appleStatus });
    assert.equal(inactive.plan, "free", `Apple status ${appleStatus} must remove paid access`);
    assert.equal(inactive.status, "canceled", `Apple status ${appleStatus} must map to canceled`);
  }

  const revoked = toAppStoreSubscriptionSnapshot(
    transaction({ revocationDate: Date.now() - 1_000 }),
    { appleStatus: 1 }
  );
  assert.equal(revoked.plan, "free", "A revoked transaction must never retain paid access");
  assert.equal(revoked.status, "canceled", "A revoked transaction must map to canceled");

  const unknownProduct = toAppStoreSubscriptionSnapshot(
    transaction({ productId: "com.capitolwonk.unknown.monthly" }),
    { appleStatus: 1 }
  );
  assert.equal(unknownProduct.plan, "free", "An unknown product must never grant paid access");
  assert.equal(unknownProduct.status, "canceled", "An unknown product must remain canceled");

  const missingExpiry = toAppStoreSubscriptionSnapshot(
    transaction({ expiresDate: undefined }),
    {}
  );
  assert.equal(missingExpiry.plan, "free", "A transaction without a current Apple status or finite expiry must not grant access");

  const unknownEnvironment = toAppStoreSubscriptionSnapshot(
    transaction({ environment: "Xcode" }),
    {}
  );
  assert.equal(unknownEnvironment.plan, "free", "An unverified App Store environment must not grant access");
  assert.equal(unknownEnvironment.providerCustomerId, "app-store-unverified");

  const proMonthly = toAppStoreSubscriptionSnapshot(
    transaction({ productId: proMonthlyProductId }),
    { appleStatus: 1 }
  );
  const proAnnual = toAppStoreSubscriptionSnapshot(
    transaction({ productId: proAnnualProductId }),
    { appleStatus: 1 }
  );
  assert.equal(proMonthly.cycle, "monthly", "The monthly Pro product must retain its billing cycle");
  assert.equal(proAnnual.cycle, "annual", "The annual Pro product must retain its billing cycle");

  const teamMonthly = toAppStoreSubscriptionSnapshot(
    transaction({ productId: "com.capitolwonk.team.11.monthly" }),
    { appleStatus: 1 }
  );
  const teamAnnual = toAppStoreSubscriptionSnapshot(
    transaction({ productId: "com.capitolwonk.team.16.annual" }),
    { appleStatus: 1 }
  );
  assert.deepEqual(
    { cycle: teamMonthly.cycle, plan: teamMonthly.plan, seatCount: teamMonthly.seatCount },
    { cycle: "monthly", plan: "team", seatCount: 11 },
    "A monthly Team product must retain its seat entitlement"
  );
  assert.deepEqual(
    { cycle: teamAnnual.cycle, plan: teamAnnual.plan, seatCount: teamAnnual.seatCount },
    { cycle: "annual", plan: "team", seatCount: 16 },
    "An annual Team product must retain its seat entitlement"
  );

  const supportedTeamProducts = getTeamAppStoreProducts();
  assert.equal(supportedTeamProducts.length, 32, "The launch allowlist must contain monthly 3-20 and annual 3-16 Team products");
  assert.equal(Object.keys(appStoreProducts).length, 34, "The server allowlist must contain 2 Pro plus 32 sale-enabled Team products");
  for (const product of supportedTeamProducts) {
    const configured = getAppStoreProduct(product.productId);
    assert.deepEqual(
      configured,
      { cycle: product.cycle, plan: "team", seatCount: product.seatCount },
      `${product.productId} must map to the matching Team entitlement`
    );
  }
  for (const seatCount of [17, 18, 19, 20]) {
    assert.equal(
      getAppStoreProduct(`com.capitolwonk.team.${seatCount}.annual`),
      null,
      `reserved annual ${seatCount}-seat records must not grant an unavailable entitlement`
    );
  }

  assert.equal(
    active.providerSubscriptionId,
    "original-transaction-123",
    "The original App Store transaction ID must be retained as the stable subscription ID"
  );

  const activeOlderThanExpired = selectCanonicalCandidate(
    [
      candidate({ expiresDate: Date.now() + 120_000, status: 1, transactionId: "active-older" }),
      candidate({ expiresDate: Date.now() + 240_000, status: 2, transactionId: "expired-newer" })
    ],
    "lineage-a"
  );
  assert.equal(activeOlderThanExpired?.transaction.transactionId, "active-older", "Current paid access must outrank a newer non-granting record");

  const latestRenewal = selectCanonicalCandidate(
    [
      candidate({ expiresDate: Date.now() + 120_000, status: 1, transactionId: "renewal-1" }),
      candidate({ expiresDate: Date.now() + 240_000, status: 1, transactionId: "renewal-2" })
    ],
    "lineage-a"
  );
  assert.equal(latestRenewal?.transaction.transactionId, "renewal-2", "Restore/reconciliation must select the newest transaction in one active lineage");

  const supersededUpgrade = selectCanonicalCandidate(
    [
      candidate({ expiresDate: Date.now() + 240_000, isUpgraded: true, status: 1, transactionId: "superseded" }),
      candidate({ expiresDate: Date.now() - 60_000, status: 2, transactionId: "current" })
    ],
    "lineage-a"
  );
  assert.equal(supersededUpgrade?.transaction.transactionId, "current", "An upgraded-away transaction must not restore stale paid access");

  const onlySupersededUpgrade = selectCanonicalCandidate(
    [candidate({ expiresDate: Date.now() + 240_000, isUpgraded: true, status: 1, transactionId: "superseded-only" })],
    "lineage-a"
  );
  assert.equal(onlySupersededUpgrade, undefined, "An all-upgraded result must fail closed instead of restoring stale paid access");

  assert.throws(
    () =>
      selectCanonicalCandidate(
        [
          candidate({ originalTransactionId: "lineage-a", status: 1, transactionId: "active-a" }),
          candidate({ originalTransactionId: "lineage-b", status: 4, transactionId: "active-b" })
        ],
        "lineage-a"
      ),
    AppStoreSubscriptionConflictError,
    "Multiple simultaneously granting Apple lineages must fail closed"
  );

  const matchingInactiveLineage = selectCanonicalCandidate(
    [
      candidate({ expiresDate: Date.now() - 120_000, originalTransactionId: "lineage-a", status: 2, transactionId: "lineage-a-old" }),
      candidate({ expiresDate: Date.now() - 60_000, originalTransactionId: "lineage-b", status: 5, transactionId: "lineage-b-new" })
    ],
    "lineage-a"
  );
  assert.equal(
    matchingInactiveLineage?.transaction.transactionId,
    "lineage-a-old",
    "A non-granting reconciliation must stay on the requested original transaction lineage"
  );

  checkConfigurationBoundary();

  const certificates = getAppleRootCertificates().map((der) => new X509Certificate(der));
  assert.equal(certificates.length, expectedAppleRootFingerprints.length, "The Apple trust set must contain exactly three root certificates");
  assert.deepEqual(
    certificates.map((certificate) => certificate.fingerprint256),
    expectedAppleRootFingerprints,
    "Embedded Apple root certificates must match the reviewed SHA-256 fingerprints"
  );
  for (const certificate of certificates) {
    assert.equal(certificate.ca, true, `${certificate.subject} must parse as a certificate authority`);
    assert.equal(certificate.subject, certificate.issuer, `${certificate.subject} must be self-issued`);
  }

  console.log("App Store subscription fixture check passed.");
}

main();
