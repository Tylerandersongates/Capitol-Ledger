CREATE TABLE IF NOT EXISTS "BetaFeedback" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "category" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'new',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "pageUrl" TEXT,
  "contactEmail" TEXT,
  "context" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BetaFeedback_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "BetaFeedback"
    ADD CONSTRAINT "BetaFeedback_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "BetaFeedback_status_createdAt_idx" ON "BetaFeedback"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "BetaFeedback_category_idx" ON "BetaFeedback"("category");
CREATE INDEX IF NOT EXISTS "BetaFeedback_userId_idx" ON "BetaFeedback"("userId");
