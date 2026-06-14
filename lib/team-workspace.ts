import { createHash, randomUUID } from "crypto";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";
import { normalizeTeamSeatCount } from "@/lib/subscription-seat-count";
import type {
  TeamInviteStatus,
  TeamMemberStatus,
  TeamWorkspaceInvite,
  TeamWorkspaceMember,
  TeamWorkspaceRole,
  TeamWorkspaceSnapshot
} from "@/types/capitol";

type TeamWorkspaceMode = "database" | "memory";

export type TeamWorkspaceResult = {
  mode: TeamWorkspaceMode;
  workspace: TeamWorkspaceSnapshot;
};

type TeamWorkspaceOwnerInput = {
  email: string;
  name?: string;
  seatCount: number;
  userId: string;
  workspaceName?: string;
};

type TeamWorkspaceInviteInput = TeamWorkspaceOwnerInput & {
  inviteEmail: string;
  role?: unknown;
};

type DbTeamWorkspace = {
  id: string;
  ownerUserId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

type DbTeamMember = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  status: string;
  joinedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type DbTeamInvite = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type CountRecord = {
  count: bigint | number | string;
};

type MemoryTeamWorkspace = {
  id: string;
  ownerUserId: string;
  name: string;
  members: TeamWorkspaceMember[];
  invites: TeamWorkspaceInvite[];
  createdAt: string;
  updatedAt: string;
};

export class TeamWorkspaceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "TeamWorkspaceError";
    this.status = status;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __capitolLedgerTeamWorkspaceStore: Map<string, MemoryTeamWorkspace> | undefined;
}

const memoryWorkspaceStore = globalThis.__capitolLedgerTeamWorkspaceStore ?? new Map<string, MemoryTeamWorkspace>();
globalThis.__capitolLedgerTeamWorkspaceStore = memoryWorkspaceStore;

let teamWorkspaceSchemaReady: Promise<boolean> | null = null;

function isDatabaseConnectionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Can't reach database server") ||
    message.includes("P1001") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND") ||
    message.includes("timeout")
  );
}

function logTeamWorkspaceFallback(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[team-workspace] ${scope} fallback: ${message}`);
}

function teamWorkspaceName(input: TeamWorkspaceOwnerInput) {
  const ownerName = input.name?.trim() || input.email.trim();
  return input.workspaceName?.trim() || (ownerName ? `${ownerName}'s team` : "Team workspace");
}

function normalizeRole(value: unknown): TeamWorkspaceRole {
  if (value === "owner" || value === "viewer") return value;
  return "analyst";
}

export function normalizeTeamInviteRole(value: unknown): Exclude<TeamWorkspaceRole, "owner"> {
  return value === "viewer" ? "viewer" : "analyst";
}

export function normalizeTeamInviteEmail(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

export function isValidTeamInviteEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeMemberStatus(value: string): TeamMemberStatus {
  return value === "removed" ? "removed" : "active";
}

function normalizeInviteStatus(value: string): TeamInviteStatus {
  if (value === "accepted" || value === "revoked" || value === "expired") return value;
  return "pending";
}

function toIsoString(value: Date | string | undefined | null) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function toCount(value: CountRecord["count"]) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return Number.parseInt(value, 10) || 0;
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function inviteExpiresAt() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
}

function sortMembers(members: TeamWorkspaceMember[]) {
  const roleRank: Record<TeamWorkspaceRole, number> = {
    owner: 0,
    analyst: 1,
    viewer: 2
  };

  return [...members].sort((left, right) => roleRank[left.role] - roleRank[right.role] || left.email.localeCompare(right.email));
}

function snapshotFromParts({
  createdAt,
  id,
  invites,
  members,
  name,
  ownerUserId,
  seatCount,
  updatedAt
}: {
  createdAt: Date | string;
  id: string;
  invites: TeamWorkspaceInvite[];
  members: TeamWorkspaceMember[];
  name: string;
  ownerUserId: string;
  seatCount: number;
  updatedAt: Date | string;
}): TeamWorkspaceSnapshot {
  const normalizedSeatCount = normalizeTeamSeatCount(seatCount);
  const activeMembers = sortMembers(members.filter((member) => member.status === "active"));
  const pendingInvites = invites
    .filter((invite) => invite.status === "pending" && Date.parse(invite.expiresAt) > Date.now())
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const occupiedSeats = activeMembers.length + pendingInvites.length;

  return {
    id,
    ownerUserId,
    name,
    seatCount: normalizedSeatCount,
    occupiedSeats,
    openSeats: Math.max(normalizedSeatCount - occupiedSeats, 0),
    members: activeMembers,
    invites: pendingInvites,
    createdAt: toIsoString(createdAt),
    updatedAt: toIsoString(updatedAt)
  };
}

function memberFromDb(record: DbTeamMember): TeamWorkspaceMember {
  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName ?? undefined,
    role: normalizeRole(record.role),
    status: normalizeMemberStatus(record.status),
    joinedAt: record.joinedAt ? toIsoString(record.joinedAt) : undefined,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

function inviteFromDb(record: DbTeamInvite): TeamWorkspaceInvite {
  return {
    id: record.id,
    email: record.email,
    role: normalizeTeamInviteRole(record.role),
    status: normalizeInviteStatus(record.status),
    expiresAt: toIsoString(record.expiresAt),
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

async function ensureTeamWorkspaceSchema() {
  if (!hasDatabaseUrl()) return false;
  if (teamWorkspaceSchemaReady) return teamWorkspaceSchemaReady;

  teamWorkspaceSchemaReady = (async () => {
    try {
      const prisma = getPrisma();

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "TeamWorkspace" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "ownerUserId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "TeamWorkspace_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "TeamMember" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "workspaceId" TEXT NOT NULL,
          "userId" TEXT,
          "email" TEXT NOT NULL,
          "displayName" TEXT,
          "role" TEXT NOT NULL,
          "status" TEXT NOT NULL,
          "joinedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "TeamMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "TeamWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "TeamInvite" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "workspaceId" TEXT NOT NULL,
          "invitedByUserId" TEXT,
          "email" TEXT NOT NULL,
          "role" TEXT NOT NULL,
          "status" TEXT NOT NULL,
          "tokenHash" TEXT NOT NULL,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "TeamInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "TeamWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "TeamInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
        )
      `);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "TeamWorkspace_ownerUserId_key" ON "TeamWorkspace"("ownerUserId")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TeamWorkspace_updatedAt_idx" ON "TeamWorkspace"("updatedAt")`);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "TeamMember_workspaceId_email_key" ON "TeamMember"("workspaceId", "email")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TeamMember_userId_idx" ON "TeamMember"("userId")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TeamMember_workspaceId_status_idx" ON "TeamMember"("workspaceId", "status")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TeamMember_workspaceId_role_idx" ON "TeamMember"("workspaceId", "role")`);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "TeamInvite_tokenHash_key" ON "TeamInvite"("tokenHash")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TeamInvite_workspaceId_status_idx" ON "TeamInvite"("workspaceId", "status")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TeamInvite_workspaceId_email_idx" ON "TeamInvite"("workspaceId", "email")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TeamInvite_invitedByUserId_idx" ON "TeamInvite"("invitedByUserId")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TeamInvite_expiresAt_idx" ON "TeamInvite"("expiresAt")`);

      return true;
    } catch (error) {
      logTeamWorkspaceFallback("ensureTeamWorkspaceSchema", error);
      teamWorkspaceSchemaReady = null;
      if (isDatabaseConnectionError(error)) return false;
      throw error;
    }
  })();

  return teamWorkspaceSchemaReady;
}

function readOrCreateMemoryTeamWorkspace(input: TeamWorkspaceOwnerInput): TeamWorkspaceResult {
  const ownerEmail = normalizeTeamInviteEmail(input.email);
  const now = new Date().toISOString();
  const existing = memoryWorkspaceStore.get(input.userId);

  if (existing) {
    const ownerMember = existing.members.find((member) => member.role === "owner") ?? existing.members[0];
    if (ownerMember) {
      ownerMember.email = ownerEmail;
      ownerMember.displayName = input.name?.trim() || ownerMember.displayName;
      ownerMember.status = "active";
      ownerMember.updatedAt = now;
    }

    existing.updatedAt = now;
    return {
      mode: "memory",
      workspace: snapshotFromParts({
        ...existing,
        seatCount: input.seatCount
      })
    };
  }

  const workspace: MemoryTeamWorkspace = {
    id: randomUUID(),
    ownerUserId: input.userId,
    name: teamWorkspaceName(input),
    members: [
      {
        id: randomUUID(),
        email: ownerEmail,
        displayName: input.name?.trim() || undefined,
        role: "owner",
        status: "active",
        joinedAt: now,
        createdAt: now,
        updatedAt: now
      }
    ],
    invites: [],
    createdAt: now,
    updatedAt: now
  };

  memoryWorkspaceStore.set(input.userId, workspace);

  return {
    mode: "memory",
    workspace: snapshotFromParts({
      ...workspace,
      seatCount: input.seatCount
    })
  };
}

async function readWorkspaceSnapshotFromDatabase(workspace: DbTeamWorkspace, seatCount: number): Promise<TeamWorkspaceSnapshot> {
  const prisma = getPrisma();

  await prisma.$executeRaw`
    UPDATE "TeamInvite"
    SET "status" = 'expired', "updatedAt" = NOW()
    WHERE "workspaceId" = ${workspace.id} AND "status" = 'pending' AND "expiresAt" <= NOW()
  `;

  const [members, invites] = await Promise.all([
    prisma.$queryRaw<DbTeamMember[]>`
      SELECT "id", "email", "displayName", "role", "status", "joinedAt", "createdAt", "updatedAt"
      FROM "TeamMember"
      WHERE "workspaceId" = ${workspace.id} AND "status" = 'active'
      ORDER BY
        CASE "role" WHEN 'owner' THEN 0 WHEN 'analyst' THEN 1 ELSE 2 END,
        "email" ASC
    `,
    prisma.$queryRaw<DbTeamInvite[]>`
      SELECT "id", "email", "role", "status", "expiresAt", "createdAt", "updatedAt"
      FROM "TeamInvite"
      WHERE "workspaceId" = ${workspace.id} AND "status" = 'pending' AND "expiresAt" > NOW()
      ORDER BY "createdAt" DESC
      LIMIT 24
    `
  ]);

  return snapshotFromParts({
    createdAt: workspace.createdAt,
    id: workspace.id,
    invites: invites.map(inviteFromDb),
    members: members.map(memberFromDb),
    name: workspace.name,
    ownerUserId: workspace.ownerUserId,
    seatCount,
    updatedAt: workspace.updatedAt
  });
}

async function readOrCreateDatabaseTeamWorkspace(input: TeamWorkspaceOwnerInput): Promise<TeamWorkspaceResult> {
  if (!(await ensureTeamWorkspaceSchema())) return readOrCreateMemoryTeamWorkspace(input);

  const prisma = getPrisma();
  const ownerEmail = normalizeTeamInviteEmail(input.email);
  const workspaceName = teamWorkspaceName(input);

  try {
    await prisma.$executeRaw`
      INSERT INTO "TeamWorkspace" ("id", "ownerUserId", "name", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${input.userId}, ${workspaceName}, NOW(), NOW())
      ON CONFLICT ("ownerUserId") DO NOTHING
    `;

    const workspaces = await prisma.$queryRaw<DbTeamWorkspace[]>`
      SELECT "id", "ownerUserId", "name", "createdAt", "updatedAt"
      FROM "TeamWorkspace"
      WHERE "ownerUserId" = ${input.userId}
      LIMIT 1
    `;
    const workspace = workspaces[0];
    if (!workspace) throw new TeamWorkspaceError("Unable to prepare the Team workspace.", 500);

    await prisma.$executeRaw`
      INSERT INTO "TeamMember" ("id", "workspaceId", "userId", "email", "displayName", "role", "status", "joinedAt", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${workspace.id}, ${input.userId}, ${ownerEmail}, ${input.name?.trim() || null}, 'owner', 'active', NOW(), NOW(), NOW())
      ON CONFLICT ("workspaceId", "email") DO UPDATE
      SET
        "userId" = EXCLUDED."userId",
        "displayName" = COALESCE(EXCLUDED."displayName", "TeamMember"."displayName"),
        "role" = 'owner',
        "status" = 'active',
        "joinedAt" = COALESCE("TeamMember"."joinedAt", NOW()),
        "updatedAt" = NOW()
    `;

    const refreshedWorkspace = {
      ...workspace,
      updatedAt: new Date()
    };

    return {
      mode: "database",
      workspace: await readWorkspaceSnapshotFromDatabase(refreshedWorkspace, input.seatCount)
    };
  } catch (error) {
    if (!isDatabaseConnectionError(error)) throw error;
    logTeamWorkspaceFallback("readOrCreateDatabaseTeamWorkspace", error);
    return readOrCreateMemoryTeamWorkspace(input);
  }
}

export async function readOrCreateTeamWorkspaceForOwner(input: TeamWorkspaceOwnerInput): Promise<TeamWorkspaceResult> {
  if (!hasDatabaseUrl()) return readOrCreateMemoryTeamWorkspace(input);
  return readOrCreateDatabaseTeamWorkspace(input);
}

function createMemoryTeamInvite(input: TeamWorkspaceInviteInput): TeamWorkspaceResult {
  const existingResult = readOrCreateMemoryTeamWorkspace(input);
  const workspace = memoryWorkspaceStore.get(input.userId);
  if (!workspace) return existingResult;

  const email = normalizeTeamInviteEmail(input.inviteEmail);
  if (!isValidTeamInviteEmail(email)) throw new TeamWorkspaceError("Enter a valid teammate email.", 400);
  if (workspace.members.some((member) => member.status === "active" && member.email === email)) {
    throw new TeamWorkspaceError("That email already has an active workspace seat.", 409);
  }

  const now = new Date().toISOString();
  const role = normalizeTeamInviteRole(input.role);
  const existingInvite = workspace.invites.find((invite) => invite.status === "pending" && invite.email === email && Date.parse(invite.expiresAt) > Date.now());

  if (existingInvite) {
    existingInvite.role = role;
    existingInvite.updatedAt = now;
  } else {
    const current = snapshotFromParts({
      ...workspace,
      seatCount: input.seatCount
    });

    if (current.openSeats <= 0) throw new TeamWorkspaceError("All paid Team seats are already assigned or invited.", 409);

    workspace.invites.unshift({
      id: randomUUID(),
      email,
      role,
      status: "pending",
      expiresAt: inviteExpiresAt().toISOString(),
      createdAt: now,
      updatedAt: now
    });
  }

  workspace.updatedAt = now;

  return {
    mode: "memory",
    workspace: snapshotFromParts({
      ...workspace,
      seatCount: input.seatCount
    })
  };
}

async function createDatabaseTeamInvite(input: TeamWorkspaceInviteInput): Promise<TeamWorkspaceResult> {
  if (!(await ensureTeamWorkspaceSchema())) return createMemoryTeamInvite(input);

  const email = normalizeTeamInviteEmail(input.inviteEmail);
  if (!isValidTeamInviteEmail(email)) throw new TeamWorkspaceError("Enter a valid teammate email.", 400);

  const workspaceResult = await readOrCreateDatabaseTeamWorkspace(input);
  if (workspaceResult.mode !== "database") return createMemoryTeamInvite(input);

  const prisma = getPrisma();
  const role = normalizeTeamInviteRole(input.role);
  const seatCount = normalizeTeamSeatCount(input.seatCount);

  try {
    await prisma.$executeRaw`
      UPDATE "TeamInvite"
      SET "status" = 'expired', "updatedAt" = NOW()
      WHERE "workspaceId" = ${workspaceResult.workspace.id} AND "status" = 'pending' AND "expiresAt" <= NOW()
    `;

    const activeMembers = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "TeamMember"
      WHERE "workspaceId" = ${workspaceResult.workspace.id} AND "email" = ${email} AND "status" = 'active'
      LIMIT 1
    `;

    if (activeMembers.length) {
      throw new TeamWorkspaceError("That email already has an active workspace seat.", 409);
    }

    const existingInvites = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "TeamInvite"
      WHERE "workspaceId" = ${workspaceResult.workspace.id} AND "email" = ${email} AND "status" = 'pending' AND "expiresAt" > NOW()
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    if (existingInvites[0]) {
      await prisma.$executeRaw`
        UPDATE "TeamInvite"
        SET "role" = ${role}, "updatedAt" = NOW()
        WHERE "id" = ${existingInvites[0].id}
      `;
    } else {
      const occupiedRecords = await prisma.$queryRaw<CountRecord[]>`
        SELECT
          (
            (SELECT COUNT(*) FROM "TeamMember" WHERE "workspaceId" = ${workspaceResult.workspace.id} AND "status" = 'active') +
            (SELECT COUNT(*) FROM "TeamInvite" WHERE "workspaceId" = ${workspaceResult.workspace.id} AND "status" = 'pending' AND "expiresAt" > NOW())
          ) AS "count"
      `;
      const occupiedSeats = toCount(occupiedRecords[0]?.count ?? 0);

      if (occupiedSeats >= seatCount) throw new TeamWorkspaceError("All paid Team seats are already assigned or invited.", 409);

      const inviteToken = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO "TeamInvite" ("id", "workspaceId", "invitedByUserId", "email", "role", "status", "tokenHash", "expiresAt", "createdAt", "updatedAt")
        VALUES (${randomUUID()}, ${workspaceResult.workspace.id}, ${input.userId}, ${email}, ${role}, 'pending', ${tokenHash(inviteToken)}, ${inviteExpiresAt()}, NOW(), NOW())
      `;
    }

    const workspaces = await prisma.$queryRaw<DbTeamWorkspace[]>`
      SELECT "id", "ownerUserId", "name", "createdAt", "updatedAt"
      FROM "TeamWorkspace"
      WHERE "id" = ${workspaceResult.workspace.id}
      LIMIT 1
    `;
    const workspace = workspaces[0];
    if (!workspace) throw new TeamWorkspaceError("Unable to reload the Team workspace.", 500);

    return {
      mode: "database",
      workspace: await readWorkspaceSnapshotFromDatabase(workspace, seatCount)
    };
  } catch (error) {
    if (error instanceof TeamWorkspaceError) throw error;
    if (!isDatabaseConnectionError(error)) throw error;
    logTeamWorkspaceFallback("createDatabaseTeamInvite", error);
    return createMemoryTeamInvite(input);
  }
}

export async function createTeamWorkspaceInvite(input: TeamWorkspaceInviteInput): Promise<TeamWorkspaceResult> {
  if (!hasDatabaseUrl()) return createMemoryTeamInvite(input);
  return createDatabaseTeamInvite(input);
}
