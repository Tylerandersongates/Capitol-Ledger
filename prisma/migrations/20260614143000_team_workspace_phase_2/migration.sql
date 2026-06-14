CREATE TABLE IF NOT EXISTS "TeamWorkspace" (
  "id" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TeamWorkspace_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeamWorkspace_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TeamMember" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "displayName" TEXT,
  "role" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeamMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "TeamWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TeamInvite" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "invitedByUserId" TEXT,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TeamInvite_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeamInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "TeamWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TeamInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeamWorkspace_ownerUserId_key" ON "TeamWorkspace"("ownerUserId");
CREATE INDEX IF NOT EXISTS "TeamWorkspace_updatedAt_idx" ON "TeamWorkspace"("updatedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "TeamMember_workspaceId_email_key" ON "TeamMember"("workspaceId", "email");
CREATE INDEX IF NOT EXISTS "TeamMember_userId_idx" ON "TeamMember"("userId");
CREATE INDEX IF NOT EXISTS "TeamMember_workspaceId_status_idx" ON "TeamMember"("workspaceId", "status");
CREATE INDEX IF NOT EXISTS "TeamMember_workspaceId_role_idx" ON "TeamMember"("workspaceId", "role");

CREATE UNIQUE INDEX IF NOT EXISTS "TeamInvite_tokenHash_key" ON "TeamInvite"("tokenHash");
CREATE INDEX IF NOT EXISTS "TeamInvite_workspaceId_status_idx" ON "TeamInvite"("workspaceId", "status");
CREATE INDEX IF NOT EXISTS "TeamInvite_workspaceId_email_idx" ON "TeamInvite"("workspaceId", "email");
CREATE INDEX IF NOT EXISTS "TeamInvite_invitedByUserId_idx" ON "TeamInvite"("invitedByUserId");
CREATE INDEX IF NOT EXISTS "TeamInvite_expiresAt_idx" ON "TeamInvite"("expiresAt");
