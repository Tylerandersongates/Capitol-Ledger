-- Move account-linked runtime tables into durable schema management and ensure
-- that deleting a User also removes late writes from already-open sessions.
CREATE TABLE IF NOT EXISTS "OfficialContactMessage" (
  "id" TEXT NOT NULL,
  "memberBioguideId" TEXT NOT NULL,
  "senderKey" TEXT NOT NULL,
  "senderEmail" TEXT NOT NULL,
  "userId" TEXT,
  "memberName" TEXT,
  "memberChamber" TEXT,
  "memberState" TEXT,
  "memberDistrict" TEXT,
  "subject" TEXT,
  "messagePreview" TEXT,
  "deliveryMode" TEXT NOT NULL DEFAULT 'manual',
  "deliveryStatus" TEXT NOT NULL DEFAULT 'prepared',
  "contactUrl" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OfficialContactMessage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "memberName" TEXT;
ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "memberChamber" TEXT;
ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "memberState" TEXT;
ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "memberDistrict" TEXT;
ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "messagePreview" TEXT;
ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "deliveryMode" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT NOT NULL DEFAULT 'prepared';
ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "contactUrl" TEXT;
ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3);
ALTER TABLE "OfficialContactMessage" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "PetitionSignature" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "petitionId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "progressLabel" TEXT,
  "targetLabel" TEXT,
  "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PetitionSignature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeamSubscriptionPause" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "workspaceId" TEXT,
  "teamMemberId" TEXT NOT NULL,
  "previousSubscription" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "pausedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "restoredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TeamSubscriptionPause_pkey" PRIMARY KEY ("id")
);

-- Remove legacy orphan rows before validating the new cascade constraints.
DELETE FROM "OfficialContactMessage" record
WHERE record."userId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" account WHERE account."id" = record."userId");

DELETE FROM "PetitionSignature" record
WHERE NOT EXISTS (SELECT 1 FROM "User" account WHERE account."id" = record."userId");

DELETE FROM "TeamSubscriptionPause" record
WHERE NOT EXISTS (SELECT 1 FROM "User" account WHERE account."id" = record."userId");

ALTER TABLE "OfficialContactMessage"
  DROP CONSTRAINT IF EXISTS "OfficialContactMessage_userId_fkey";
ALTER TABLE "OfficialContactMessage"
  ADD CONSTRAINT "OfficialContactMessage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PetitionSignature"
  DROP CONSTRAINT IF EXISTS "PetitionSignature_userId_fkey";
ALTER TABLE "PetitionSignature"
  ADD CONSTRAINT "PetitionSignature_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamSubscriptionPause"
  DROP CONSTRAINT IF EXISTS "TeamSubscriptionPause_userId_fkey";
ALTER TABLE "TeamSubscriptionPause"
  ADD CONSTRAINT "TeamSubscriptionPause_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "OfficialContactMessage_member_sender_sentAt_idx"
  ON "OfficialContactMessage"("memberBioguideId", "senderKey", "sentAt");
CREATE INDEX IF NOT EXISTS "OfficialContactMessage_userId_idx"
  ON "OfficialContactMessage"("userId");
CREATE INDEX IF NOT EXISTS "OfficialContactMessage_userId_sentAt_idx"
  ON "OfficialContactMessage"("userId", "sentAt");

CREATE UNIQUE INDEX IF NOT EXISTS "PetitionSignature_userId_petitionId_key"
  ON "PetitionSignature"("userId", "petitionId");
CREATE INDEX IF NOT EXISTS "PetitionSignature_userId_signedAt_idx"
  ON "PetitionSignature"("userId", "signedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "TeamSubscriptionPause_userId_active_key"
  ON "TeamSubscriptionPause"("userId") WHERE "status" = 'active';
CREATE INDEX IF NOT EXISTS "TeamSubscriptionPause_userId_status_idx"
  ON "TeamSubscriptionPause"("userId", "status");
CREATE INDEX IF NOT EXISTS "TeamSubscriptionPause_workspaceId_idx"
  ON "TeamSubscriptionPause"("workspaceId");
