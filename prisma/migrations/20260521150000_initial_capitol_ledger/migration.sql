-- CreateEnum
CREATE TYPE "Chamber" AS ENUM ('HOUSE', 'SENATE');

-- CreateEnum
CREATE TYPE "Party" AS ENUM ('DEMOCRAT', 'REPUBLICAN', 'INDEPENDENT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "VotePosition" AS ENUM ('YES', 'NO', 'PRESENT', 'NOT_VOTING');

-- CreateEnum
CREATE TYPE "FollowTargetType" AS ENUM ('MEMBER', 'BILL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "partyAffiliation" TEXT,
    "districtLabel" TEXT,
    "districtState" TEXT,
    "districtCode" TEXT,
    "notificationPreferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "bioguideId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "party" "Party" NOT NULL DEFAULT 'UNKNOWN',
    "state" TEXT NOT NULL,
    "district" TEXT,
    "chamber" "Chamber" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "photoUrl" TEXT,
    "officialUrl" TEXT,
    "sourceUrl" TEXT,
    "rawJson" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "congress" INTEGER NOT NULL,
    "billType" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortTitle" TEXT,
    "sponsorBioguideId" TEXT,
    "policyArea" TEXT,
    "latestActionText" TEXT,
    "latestActionDate" TIMESTAMP(3),
    "summary" TEXT,
    "sourceUrl" TEXT,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cosponsor" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "memberBioguideId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),

    CONSTRAINT "Cosponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "congress" INTEGER NOT NULL,
    "chamber" "Chamber" NOT NULL,
    "rollCall" TEXT NOT NULL,
    "session" TEXT,
    "question" TEXT NOT NULL,
    "result" TEXT,
    "voteDate" TIMESTAMP(3) NOT NULL,
    "sourceUrl" TEXT,
    "billId" TEXT,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberVote" (
    "id" TEXT NOT NULL,
    "voteId" TEXT NOT NULL,
    "memberBioguideId" TEXT NOT NULL,
    "position" "VotePosition" NOT NULL,

    CONSTRAINT "MemberVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" "FollowTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueInterest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "interest" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "cycle" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerCustomerId" TEXT,
    "providerEntitlementId" TEXT,
    "providerSubscriptionId" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountGamification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "civicScore" INTEGER NOT NULL,
    "dayStreak" INTEGER NOT NULL,
    "monthlyGain" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "levelTitle" TEXT NOT NULL,
    "nextLevelScore" INTEGER NOT NULL,
    "eventCounts" JSONB NOT NULL,
    "earnedBadgeIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountGamification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpdateEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "targetType" "FollowTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "seenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UpdateEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Member_bioguideId_key" ON "Member"("bioguideId");

-- CreateIndex
CREATE INDEX "Member_state_chamber_party_idx" ON "Member"("state", "chamber", "party");

-- CreateIndex
CREATE INDEX "Bill_sponsorBioguideId_idx" ON "Bill"("sponsorBioguideId");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_congress_billType_billNumber_key" ON "Bill"("congress", "billType", "billNumber");

-- CreateIndex
CREATE INDEX "Cosponsor_memberBioguideId_idx" ON "Cosponsor"("memberBioguideId");

-- CreateIndex
CREATE UNIQUE INDEX "Cosponsor_billId_memberBioguideId_key" ON "Cosponsor"("billId", "memberBioguideId");

-- CreateIndex
CREATE INDEX "Vote_billId_idx" ON "Vote"("billId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_congress_chamber_rollCall_key" ON "Vote"("congress", "chamber", "rollCall");

-- CreateIndex
CREATE INDEX "MemberVote_memberBioguideId_idx" ON "MemberVote"("memberBioguideId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberVote_voteId_memberBioguideId_key" ON "MemberVote"("voteId", "memberBioguideId");

-- CreateIndex
CREATE INDEX "Follow_targetType_targetId_idx" ON "Follow"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_userId_targetType_targetId_key" ON "Follow"("userId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "SavedAlert_alertId_idx" ON "SavedAlert"("alertId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedAlert_userId_alertId_key" ON "SavedAlert"("userId", "alertId");

-- CreateIndex
CREATE INDEX "ReadAlert_alertId_idx" ON "ReadAlert"("alertId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadAlert_userId_alertId_key" ON "ReadAlert"("userId", "alertId");

-- CreateIndex
CREATE INDEX "IssueInterest_interest_idx" ON "IssueInterest"("interest");

-- CreateIndex
CREATE UNIQUE INDEX "IssueInterest_userId_interest_key" ON "IssueInterest"("userId", "interest");

-- CreateIndex
CREATE UNIQUE INDEX "AccountSubscription_userId_key" ON "AccountSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountGamification_userId_key" ON "AccountGamification"("userId");

-- CreateIndex
CREATE INDEX "UpdateEvent_targetType_targetId_idx" ON "UpdateEvent"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "UpdateEvent_userId_idx" ON "UpdateEvent"("userId");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_sponsorBioguideId_fkey" FOREIGN KEY ("sponsorBioguideId") REFERENCES "Member"("bioguideId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cosponsor" ADD CONSTRAINT "Cosponsor_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cosponsor" ADD CONSTRAINT "Cosponsor_memberBioguideId_fkey" FOREIGN KEY ("memberBioguideId") REFERENCES "Member"("bioguideId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberVote" ADD CONSTRAINT "MemberVote_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "Vote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberVote" ADD CONSTRAINT "MemberVote_memberBioguideId_fkey" FOREIGN KEY ("memberBioguideId") REFERENCES "Member"("bioguideId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedAlert" ADD CONSTRAINT "SavedAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadAlert" ADD CONSTRAINT "ReadAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueInterest" ADD CONSTRAINT "IssueInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountSubscription" ADD CONSTRAINT "AccountSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountGamification" ADD CONSTRAINT "AccountGamification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpdateEvent" ADD CONSTRAINT "UpdateEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
