-- Account deletion requests must remain durable after the legacy app-feedback queue is retired.
CREATE TABLE IF NOT EXISTS "AccountDeletionRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completionBy" TIMESTAMP(3) NOT NULL,
  "appleSubscriptionAcknowledged" BOOLEAN NOT NULL DEFAULT true,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountDeletionRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AccountDeletionRequest_status_requestedAt_idx"
  ON "AccountDeletionRequest"("status", "requestedAt");
CREATE INDEX IF NOT EXISTS "AccountDeletionRequest_userId_idx"
  ON "AccountDeletionRequest"("userId");
-- Preserve account-deletion requests previously stored inside BetaFeedback.
INSERT INTO "AccountDeletionRequest" (
  "id",
  "userId",
  "status",
  "requestedAt",
  "completionBy",
  "appleSubscriptionAcknowledged",
  "completedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "userId",
  "status",
  COALESCE(NULLIF("context"->>'requestedAt', '')::TIMESTAMPTZ AT TIME ZONE 'UTC', "createdAt"),
  COALESCE(NULLIF("context"->>'completionBy', '')::TIMESTAMPTZ AT TIME ZONE 'UTC', "createdAt" + INTERVAL '7 days'),
  COALESCE(("context"->>'appleSubscriptionAcknowledged')::BOOLEAN, true),
  CASE WHEN "status" = 'resolved' THEN "updatedAt" ELSE NULL END,
  "createdAt",
  "updatedAt"
FROM "BetaFeedback" AS feedback
WHERE feedback."userId" IS NOT NULL
  AND feedback."context"->>'requestType' = 'account-deletion'
  AND (
    feedback."status" = 'resolved'
    OR feedback."id" = (
      SELECT active."id"
      FROM "BetaFeedback" AS active
      WHERE active."userId" = feedback."userId"
        AND active."context"->>'requestType' = 'account-deletion'
        AND active."status" <> 'resolved'
      ORDER BY active."createdAt" DESC
      LIMIT 1
    )
  )
ON CONFLICT ("id") DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS "AccountDeletionRequest_one_active_per_user_idx"
  ON "AccountDeletionRequest"("userId")
  WHERE "userId" IS NOT NULL AND "status" <> 'resolved';

-- BetaFeedback is intentionally not dropped here. It remains a read-only archive
-- until production feedback has been exported and the migration verified.
