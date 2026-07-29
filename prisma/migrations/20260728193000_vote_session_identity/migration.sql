-- Backfill any legacy vote without an explicit congressional session from its vote date.
UPDATE "Vote"
SET "session" = CASE
  WHEN EXTRACT(YEAR FROM "voteDate")::INTEGER <= 1789 + (("congress" - 1) * 2) THEN '1'
  ELSE '2'
END
WHERE "session" IS NULL;

-- Roll-call numbers restart each session, so session is part of the durable identity.
ALTER TABLE "Vote" ALTER COLUMN "session" SET NOT NULL;

DROP INDEX "Vote_congress_chamber_rollCall_key";

CREATE UNIQUE INDEX "Vote_congress_chamber_session_rollCall_key"
  ON "Vote"("congress", "chamber", "session", "rollCall");

ALTER TYPE "VotePosition" ADD VALUE IF NOT EXISTS 'OTHER';

ALTER TABLE "MemberVote"
  ADD COLUMN "positionLabel" TEXT;
