CREATE TABLE "AccountGamificationCredit" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dedupeHash" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "activityDate" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountGamificationCredit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountGamificationCredit_activity_date_check"
    CHECK ("activityDate" ~ '^\\d{4}-\\d{2}-\\d{2}$')
);

CREATE UNIQUE INDEX "AccountGamificationCredit_userId_dedupeHash_key"
  ON "AccountGamificationCredit"("userId", "dedupeHash");

CREATE INDEX "AccountGamificationCredit_userId_activityDate_idx"
  ON "AccountGamificationCredit"("userId", "activityDate");

ALTER TABLE "AccountGamificationCredit"
  ADD CONSTRAINT "AccountGamificationCredit_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
