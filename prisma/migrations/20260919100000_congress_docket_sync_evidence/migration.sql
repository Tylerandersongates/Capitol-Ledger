CREATE TABLE "CongressDocketSyncRun" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "congress" INTEGER NOT NULL,
  "requestedLimit" INTEGER NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 1,
  "fetchedBillCount" INTEGER NOT NULL DEFAULT 0,
  "normalizedBillCount" INTEGER NOT NULL DEFAULT 0,
  "upsertedBillCount" INTEGER NOT NULL DEFAULT 0,
  "upsertedMemberCount" INTEGER NOT NULL DEFAULT 0,
  "missingSponsorCount" INTEGER NOT NULL DEFAULT 0,
  "sourceMaxActionAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CongressDocketSyncRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CongressDocketSyncRun_status_check" CHECK ("status" IN ('running', 'succeeded', 'failed')),
  CONSTRAINT "CongressDocketSyncRun_limit_check" CHECK ("requestedLimit" BETWEEN 1 AND 50),
  CONSTRAINT "CongressDocketSyncRun_attempt_count_check" CHECK ("attemptCount" >= 1),
  CONSTRAINT "CongressDocketSyncRun_counts_check" CHECK (
    "fetchedBillCount" >= 0 AND
    "normalizedBillCount" >= 0 AND
    "upsertedBillCount" >= 0 AND
    "upsertedMemberCount" >= 0 AND
    "missingSponsorCount" >= 0
  )
);

CREATE UNIQUE INDEX "CongressDocketSyncRun_idempotencyKey_key"
  ON "CongressDocketSyncRun"("idempotencyKey");

CREATE INDEX "CongressDocketSyncRun_congress_status_completedAt_idx"
  ON "CongressDocketSyncRun"("congress", "status", "completedAt");

CREATE INDEX "CongressDocketSyncRun_congress_status_failedAt_idx"
  ON "CongressDocketSyncRun"("congress", "status", "failedAt");
