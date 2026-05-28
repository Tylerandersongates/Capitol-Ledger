-- CreateTable
CREATE TABLE "WeeklyBriefDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "deliveryMode" TEXT NOT NULL,
    "summary" TEXT,
    "recipient" TEXT,
    "plan" TEXT NOT NULL,
    "trackedBillCount" INTEGER NOT NULL DEFAULT 0,
    "unreadAlertCount" INTEGER NOT NULL DEFAULT 0,
    "issueCount" INTEGER NOT NULL DEFAULT 0,
    "savedRecordCount" INTEGER NOT NULL DEFAULT 0,
    "preparedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyBriefDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyBriefDelivery_userId_createdAt_idx" ON "WeeklyBriefDelivery"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WeeklyBriefDelivery_status_idx" ON "WeeklyBriefDelivery"("status");

-- AddForeignKey
ALTER TABLE "WeeklyBriefDelivery" ADD CONSTRAINT "WeeklyBriefDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
