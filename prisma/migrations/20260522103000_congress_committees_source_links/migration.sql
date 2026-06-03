-- CreateTable
CREATE TABLE "Committee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chamber" "Chamber",
    "systemCode" TEXT,
    "sourceUrl" TEXT,
    "rawJson" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Committee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficialSourceLink" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficialSourceLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Committee_chamber_idx" ON "Committee"("chamber");

-- CreateIndex
CREATE INDEX "Committee_systemCode_idx" ON "Committee"("systemCode");

-- CreateIndex
CREATE INDEX "OfficialSourceLink_targetType_targetId_idx" ON "OfficialSourceLink"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "OfficialSourceLink_source_idx" ON "OfficialSourceLink"("source");
