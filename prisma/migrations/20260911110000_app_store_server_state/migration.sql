-- Persist the account binding and latest canonical App Store state separately
-- from the provider-neutral subscription projection used by the application.
CREATE SEQUENCE "AppStoreObservationSequence";

CREATE TABLE "AppStoreSubscriptionState" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "appAccountToken" TEXT NOT NULL,
  "originalTransactionId" TEXT,
  "transactionId" TEXT,
  "environment" TEXT,
  "productId" TEXT,
  "appleStatus" INTEGER,
  "expiresAt" TIMESTAMP(3),
  "signedAt" TIMESTAMP(3),
  "transactionPurchasedAt" TIMESTAMP(3),
  "transactionRevokedAt" TIMESTAMP(3),
  "autoRenewProductId" TEXT,
  "autoRenewStatus" INTEGER,
  "gracePeriodExpiresAt" TIMESTAMP(3),
  "reconciledAt" TIMESTAMP(3),
  "observationVersion" BIGINT,
  "relinkPending" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AppStoreSubscriptionState_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AppStoreSubscriptionState_environment_check"
    CHECK ("environment" IS NULL OR "environment" IN ('Production', 'Sandbox')),
  CONSTRAINT "AppStoreSubscriptionState_autoRenewStatus_check"
    CHECK ("autoRenewStatus" IS NULL OR "autoRenewStatus" IN (0, 1)),
  CONSTRAINT "AppStoreSubscriptionState_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AppStoreSubscriptionState_userId_key"
  ON "AppStoreSubscriptionState"("userId");
CREATE UNIQUE INDEX "AppStoreSubscriptionState_appAccountToken_key"
  ON "AppStoreSubscriptionState"("appAccountToken");
CREATE UNIQUE INDEX "AppStoreSubscriptionState_originalTransactionId_key"
  ON "AppStoreSubscriptionState"("originalTransactionId");
CREATE INDEX "AppStoreSubscriptionState_environment_appleStatus_idx"
  ON "AppStoreSubscriptionState"("environment", "appleStatus");
CREATE INDEX "AppStoreSubscriptionState_reconciledAt_idx"
  ON "AppStoreSubscriptionState"("reconciledAt");

-- Notification receipts retain only the Apple notification identifier,
-- normalized metadata, and a SHA-256 payload hash. The signed payload and
-- transaction identifiers are deliberately excluded. Account deletion
-- deidentifies retained receipts while deleting the account-bound state.
CREATE TABLE "AppStoreNotificationReceipt" (
  "id" TEXT NOT NULL,
  "notificationUUID" TEXT NOT NULL,
  "claimToken" TEXT,
  "userId" TEXT,
  "payloadHash" TEXT NOT NULL,
  "notificationType" TEXT NOT NULL,
  "subtype" TEXT,
  "environment" TEXT,
  "signedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'received',
  "errorCode" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AppStoreNotificationReceipt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AppStoreNotificationReceipt_payloadHash_check"
    CHECK ("payloadHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "AppStoreNotificationReceipt_claimToken_check"
    CHECK ("claimToken" IS NULL OR "claimToken" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  CONSTRAINT "AppStoreNotificationReceipt_environment_check"
    CHECK ("environment" IS NULL OR "environment" IN ('Production', 'Sandbox')),
  CONSTRAINT "AppStoreNotificationReceipt_status_check"
    CHECK ("status" IN ('received', 'processing', 'processed', 'unlinked', 'conflict', 'ignored', 'failed')),
  CONSTRAINT "AppStoreNotificationReceipt_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AppStoreNotificationReceipt_notificationUUID_key"
  ON "AppStoreNotificationReceipt"("notificationUUID");
CREATE INDEX "AppStoreNotificationReceipt_status_createdAt_idx"
  ON "AppStoreNotificationReceipt"("status", "createdAt");
CREATE INDEX "AppStoreNotificationReceipt_userId_createdAt_idx"
  ON "AppStoreNotificationReceipt"("userId", "createdAt");
