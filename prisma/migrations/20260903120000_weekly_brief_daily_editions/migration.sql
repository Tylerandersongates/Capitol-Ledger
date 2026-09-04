ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timeZone" TEXT;

CREATE TABLE IF NOT EXISTS "WeeklyBriefEdition" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "editionDate" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WeeklyBriefEdition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WeeklyBriefEdition_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyBriefEdition_userId_editionDate_key"
  ON "WeeklyBriefEdition"("userId", "editionDate");
CREATE INDEX IF NOT EXISTS "WeeklyBriefEdition_userId_generatedAt_idx"
  ON "WeeklyBriefEdition"("userId", "generatedAt");
