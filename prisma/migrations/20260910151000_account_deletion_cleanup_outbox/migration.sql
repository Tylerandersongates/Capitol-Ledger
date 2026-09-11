-- Provider and Team-member cleanup must survive the account transaction so
-- external effects can be retried idempotently after the local account is gone.
CREATE TABLE "AccountDeletionCleanupJob" (
  "id" TEXT NOT NULL,
  "deletionRequestId" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountDeletionCleanupJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountDeletionCleanupJob_deletionRequestId_fkey"
    FOREIGN KEY ("deletionRequestId") REFERENCES "AccountDeletionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountDeletionCleanupJob_dedupeKey_key"
  ON "AccountDeletionCleanupJob"("dedupeKey");
CREATE INDEX "AccountDeletionCleanupJob_status_availableAt_idx"
  ON "AccountDeletionCleanupJob"("status", "availableAt");
CREATE INDEX "AccountDeletionCleanupJob_deletionRequestId_idx"
  ON "AccountDeletionCleanupJob"("deletionRequestId");
