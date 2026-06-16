import { createHash, randomBytes, randomUUID } from "crypto";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";
import { getAccountSubscription, setAccountSubscription } from "@/lib/account-subscription";
import { writeSubscriptionToDatabase } from "@/lib/account-database";
import { normalizeTeamSeatCount } from "@/lib/subscription-seat-count";
import type {
  AccountSubscriptionSnapshot,
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

export type TeamWorkspaceInviteResult = TeamWorkspaceResult & {
  invite: {
    email: string;
    expiresAt: string;
    role: Exclude<TeamWorkspaceRole, "owner">;
    token: string;
  };
};

export type TeamWorkspaceAcceptancePreview = {
  invite: TeamWorkspaceInvite;
  mode: TeamWorkspaceMode;
  owner: {
    email?: string;
    name?: string;
  };
  workspace: {
    id: string;
    name: string;
    ownerUserId: string;
  };
};

export type TeamWorkspaceAcceptanceResult = TeamWorkspaceResult & {
  membership: TeamWorkspaceMember;
};

export type TeamWorkspaceMemberAccessResult = TeamWorkspaceResult & {
  membership: TeamWorkspaceMember;
};

type TeamWorkspaceSeatType = "invite" | "member";

export type TeamWorkspaceSeatReleaseResult = TeamWorkspaceResult & {
  release: {
    accountConvertedToFree: boolean;
    email: string;
    id: string;
    status: "removed" | "revoked";
    type: TeamWorkspaceSeatType;
  };
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

type TeamWorkspaceSeatReleaseInput = TeamWorkspaceOwnerInput & {
  seatId: string;
  seatType: unknown;
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
  userId: string | null;
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

type DbTeamInviteAcceptance = DbTeamInvite & {
  ownerEmail: string | null;
  ownerName: string | null;
  ownerUserId: string;
  workspaceCreatedAt: Date;
  workspaceId: string;
  workspaceName: string;
  workspaceUpdatedAt: Date;
};

type DbOwnerSubscription = {
  plan: string;
  provider: string;
  seatCount: number | null;
  status: string;
};

type DbMemberAccess = DbTeamMember & {
  ownerUserId: string;
  workspaceCreatedAt: Date;
  workspaceId: string;
  workspaceName: string;
  workspaceUpdatedAt: Date;
};

type CountRecord = {
  count: bigint | number | string;
};

type RawQueryClient = {
  $queryRaw: <T = unknown>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
};

type MemoryTeamWorkspaceInvite = TeamWorkspaceInvite & {
  tokenHash?: string;
};

type MemoryTeamWorkspace = {
  id: string;
  ownerUserId: string;
  name: string;
  members: TeamWorkspaceMember[];
  invites: MemoryTeamWorkspaceInvite[];
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

function normalizeSeatType(value: unknown): TeamWorkspaceSeatType {
  if (value === "invite" || value === "member") return value;
  throw new TeamWorkspaceError("Choose a Team member or pending invite to release.", 400);
}

function normalizeSeatId(value: unknown) {
  const seatId = typeof value === "string" ? value.trim() : "";
  if (!seatId) throw new TeamWorkspaceError("Choose a Team seat to release.", 400);
  return seatId;
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

function newInviteToken() {
  return randomBytes(32).toString("base64url");
}

function inviteExpiresAt() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
}

function hasActiveTeamAccess(subscription: Pick<AccountSubscriptionSnapshot, "plan" | "status">) {
  return subscription.plan === "team" && (subscription.status === "active" || subscription.status === "trialing");
}

function normalizeOwnerSubscription(record: DbOwnerSubscription | undefined, ownerUserId: string) {
  const fallback = getAccountSubscription(ownerUserId);

  if (!record) return fallback;

  return {
    ...fallback,
    plan: record.plan === "team" || record.plan === "pro" ? record.plan : "free",
    provider:
      record.provider === "stripe" || record.provider === "revenuecat" || record.provider === "app-store" ? record.provider : "demo",
    seatCount: record.seatCount ?? undefined,
    status: record.status === "trialing" || record.status === "past_due" || record.status === "canceled" ? record.status : "active"
  } satisfies AccountSubscriptionSnapshot;
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
    userId: record.userId ?? undefined,
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
      ownerMember.userId = input.userId;
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
        userId: input.userId,
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
      SELECT "id", "userId", "email", "displayName", "role", "status", "joinedAt", "createdAt", "updatedAt"
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

async function readOwnerTeamSeatCount(ownerUserId: string, client: RawQueryClient = getPrisma()) {
  const records = await client.$queryRaw<DbOwnerSubscription[]>`
    SELECT "plan", "provider", "seatCount", "status"
    FROM "AccountSubscription"
    WHERE "userId" = ${ownerUserId}
    LIMIT 1
  `;
  const subscription = normalizeOwnerSubscription(records[0], ownerUserId);

  if (!hasActiveTeamAccess(subscription)) {
    throw new TeamWorkspaceError("The workspace owner needs an active Team subscription before this seat can be used.", 403);
  }

  return normalizeTeamSeatCount(subscription.seatCount);
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

function createMemoryTeamInvite(input: TeamWorkspaceInviteInput): TeamWorkspaceInviteResult {
  readOrCreateMemoryTeamWorkspace(input);
  const workspace = memoryWorkspaceStore.get(input.userId);
  if (!workspace) {
    throw new TeamWorkspaceError("Unable to prepare the Team workspace.", 500);
  }

  const email = normalizeTeamInviteEmail(input.inviteEmail);
  if (!isValidTeamInviteEmail(email)) throw new TeamWorkspaceError("Enter a valid teammate email.", 400);
  if (workspace.members.some((member) => member.status === "active" && member.email === email)) {
    throw new TeamWorkspaceError("That email already has an active workspace seat.", 409);
  }

  const now = new Date().toISOString();
  const role = normalizeTeamInviteRole(input.role);
  const inviteToken = newInviteToken();
  const expiresAt = inviteExpiresAt();
  const existingInvite = workspace.invites.find((invite) => invite.status === "pending" && invite.email === email && Date.parse(invite.expiresAt) > Date.now());

  if (existingInvite) {
    existingInvite.role = role;
    existingInvite.tokenHash = tokenHash(inviteToken);
    existingInvite.expiresAt = expiresAt.toISOString();
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
      tokenHash: tokenHash(inviteToken),
      expiresAt: expiresAt.toISOString(),
      createdAt: now,
      updatedAt: now
    });
  }

  workspace.updatedAt = now;

  return {
    invite: {
      email,
      expiresAt: expiresAt.toISOString(),
      role,
      token: inviteToken
    },
    mode: "memory",
    workspace: snapshotFromParts({
      ...workspace,
      seatCount: input.seatCount
    })
  };
}

async function createDatabaseTeamInvite(input: TeamWorkspaceInviteInput): Promise<TeamWorkspaceInviteResult> {
  if (!(await ensureTeamWorkspaceSchema())) return createMemoryTeamInvite(input);

  const email = normalizeTeamInviteEmail(input.inviteEmail);
  if (!isValidTeamInviteEmail(email)) throw new TeamWorkspaceError("Enter a valid teammate email.", 400);

  const workspaceResult = await readOrCreateDatabaseTeamWorkspace(input);
  if (workspaceResult.mode !== "database") return createMemoryTeamInvite(input);

  const prisma = getPrisma();
  const role = normalizeTeamInviteRole(input.role);
  const seatCount = normalizeTeamSeatCount(input.seatCount);
  const inviteToken = newInviteToken();
  const expiresAt = inviteExpiresAt();

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
        SET "role" = ${role}, "tokenHash" = ${tokenHash(inviteToken)}, "expiresAt" = ${expiresAt}, "updatedAt" = NOW()
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

      await prisma.$executeRaw`
        INSERT INTO "TeamInvite" ("id", "workspaceId", "invitedByUserId", "email", "role", "status", "tokenHash", "expiresAt", "createdAt", "updatedAt")
        VALUES (${randomUUID()}, ${workspaceResult.workspace.id}, ${input.userId}, ${email}, ${role}, 'pending', ${tokenHash(inviteToken)}, ${expiresAt}, NOW(), NOW())
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
      invite: {
        email,
        expiresAt: expiresAt.toISOString(),
        role,
        token: inviteToken
      },
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

export async function createTeamWorkspaceInvite(input: TeamWorkspaceInviteInput): Promise<TeamWorkspaceInviteResult> {
  if (!hasDatabaseUrl()) return createMemoryTeamInvite(input);
  return createDatabaseTeamInvite(input);
}

function releaseMemoryTeamSeat(input: TeamWorkspaceSeatReleaseInput): TeamWorkspaceSeatReleaseResult {
  readOrCreateMemoryTeamWorkspace(input);
  const workspace = memoryWorkspaceStore.get(input.userId);
  if (!workspace) throw new TeamWorkspaceError("Unable to prepare the Team workspace.", 500);

  const seatType = normalizeSeatType(input.seatType);
  const seatId = normalizeSeatId(input.seatId);
  const now = new Date().toISOString();
  let release: TeamWorkspaceSeatReleaseResult["release"] | null = null;
  let releasedUserId: string | undefined;

  if (seatType === "member") {
    const member = workspace.members.find((row) => row.id === seatId);
    if (!member || member.status !== "active") throw new TeamWorkspaceError("That Team member seat is not active.", 404);
    if (member.role === "owner") throw new TeamWorkspaceError("The workspace owner seat cannot be removed.", 403);

    member.status = "removed";
    member.updatedAt = now;
    releasedUserId = member.userId;
    release = {
      accountConvertedToFree: Boolean(releasedUserId),
      email: member.email,
      id: member.id,
      status: "removed",
      type: "member"
    };
  } else {
    const invite = workspace.invites.find((row) => row.id === seatId);
    if (!invite) throw new TeamWorkspaceError("That Team invite is not available.", 404);
    if (invite.status !== "pending" || Date.parse(invite.expiresAt) <= Date.now()) {
      throw new TeamWorkspaceError("That Team invite is not pending.", 410);
    }

    invite.status = "revoked";
    invite.updatedAt = now;
    release = {
      accountConvertedToFree: false,
      email: invite.email,
      id: invite.id,
      status: "revoked",
      type: "invite"
    };
  }

  if (!release) throw new TeamWorkspaceError("Unable to release this Team seat.", 500);
  if (releasedUserId) setAccountSubscription(releasedUserId, releasedSeatFreeSubscription);
  workspace.updatedAt = now;

  return {
    mode: "memory",
    release,
    workspace: snapshotFromParts({
      ...workspace,
      seatCount: input.seatCount
    })
  };
}

async function releaseDatabaseTeamSeat(input: TeamWorkspaceSeatReleaseInput): Promise<TeamWorkspaceSeatReleaseResult> {
  if (!(await ensureTeamWorkspaceSchema())) return releaseMemoryTeamSeat(input);

  const workspaceResult = await readOrCreateDatabaseTeamWorkspace(input);
  if (workspaceResult.mode !== "database") return releaseMemoryTeamSeat(input);

  const prisma = getPrisma();
  const seatType = normalizeSeatType(input.seatType);
  const seatId = normalizeSeatId(input.seatId);
  const seatCount = normalizeTeamSeatCount(input.seatCount);

  try {
    const releasedSeat = await prisma.$transaction(async (transaction): Promise<{
      release: TeamWorkspaceSeatReleaseResult["release"];
      userId: string | null;
    }> => {
      await transaction.$executeRaw`
        UPDATE "TeamInvite"
        SET "status" = 'expired', "updatedAt" = NOW()
        WHERE "workspaceId" = ${workspaceResult.workspace.id} AND "status" = 'pending' AND "expiresAt" <= NOW()
      `;

      if (seatType === "member") {
        const members = await transaction.$queryRaw<DbTeamMember[]>`
          SELECT "id", "userId", "email", "displayName", "role", "status", "joinedAt", "createdAt", "updatedAt"
          FROM "TeamMember"
          WHERE "workspaceId" = ${workspaceResult.workspace.id} AND "id" = ${seatId}
          LIMIT 1
          FOR UPDATE
        `;
        const member = members[0];
        if (!member || normalizeMemberStatus(member.status) !== "active") throw new TeamWorkspaceError("That Team member seat is not active.", 404);
        if (normalizeRole(member.role) === "owner") throw new TeamWorkspaceError("The workspace owner seat cannot be removed.", 403);

        await transaction.$executeRaw`
          UPDATE "TeamMember"
          SET "status" = 'removed', "updatedAt" = NOW()
          WHERE "id" = ${member.id}
        `;

        const userRecords = await transaction.$queryRaw<Array<{ id: string }>>`
          SELECT "id"
          FROM "User"
          WHERE lower("email") = lower(${member.email})
          LIMIT 1
        `;
        const userId = member.userId ?? userRecords[0]?.id ?? null;

        await transaction.$executeRaw`
          UPDATE "TeamWorkspace"
          SET "updatedAt" = NOW()
          WHERE "id" = ${workspaceResult.workspace.id}
        `;

        return {
          release: {
            accountConvertedToFree: Boolean(userId),
            email: member.email,
            id: member.id,
            status: "removed",
            type: "member"
          },
          userId
        };
      }

      const invites = await transaction.$queryRaw<DbTeamInvite[]>`
        SELECT "id", "email", "role", "status", "expiresAt", "createdAt", "updatedAt"
        FROM "TeamInvite"
        WHERE "workspaceId" = ${workspaceResult.workspace.id} AND "id" = ${seatId}
        LIMIT 1
        FOR UPDATE
      `;
      const invite = invites[0];
      if (!invite) throw new TeamWorkspaceError("That Team invite is not available.", 404);

      assertPendingSeatInvite(invite);

      await transaction.$executeRaw`
        UPDATE "TeamInvite"
        SET "status" = 'revoked', "updatedAt" = NOW()
        WHERE "id" = ${invite.id}
      `;

      const userRecords = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "User"
        WHERE lower("email") = lower(${invite.email})
        LIMIT 1
      `;
      const userId = userRecords[0]?.id ?? null;

      await transaction.$executeRaw`
        UPDATE "TeamWorkspace"
        SET "updatedAt" = NOW()
        WHERE "id" = ${workspaceResult.workspace.id}
      `;

      return {
        release: {
          accountConvertedToFree: Boolean(userId),
          email: invite.email,
          id: invite.id,
          status: "revoked",
          type: "invite"
        },
        userId
      };
    });

    const release = {
      ...releasedSeat.release,
      accountConvertedToFree: await convertAccountToFree(releasedSeat.userId)
    };

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
      release,
      workspace: await readWorkspaceSnapshotFromDatabase(workspace, seatCount)
    };
  } catch (error) {
    if (error instanceof TeamWorkspaceError) throw error;
    if (!isDatabaseConnectionError(error)) throw error;
    logTeamWorkspaceFallback("releaseDatabaseTeamSeat", error);
    return releaseMemoryTeamSeat(input);
  }
}

export async function releaseTeamWorkspaceSeat(input: TeamWorkspaceSeatReleaseInput): Promise<TeamWorkspaceSeatReleaseResult> {
  if (!hasDatabaseUrl()) return releaseMemoryTeamSeat(input);
  return releaseDatabaseTeamSeat(input);
}

function invitePreviewFromRecord(record: DbTeamInviteAcceptance): TeamWorkspaceAcceptancePreview {
  return {
    invite: inviteFromDb(record),
    mode: "database",
    owner: {
      email: record.ownerEmail ?? undefined,
      name: record.ownerName ?? undefined
    },
    workspace: {
      id: record.workspaceId,
      name: record.workspaceName,
      ownerUserId: record.ownerUserId
    }
  };
}

function assertPendingInvite(record: Pick<DbTeamInviteAcceptance, "expiresAt" | "id" | "status">) {
  const status = normalizeInviteStatus(record.status);

  if (status === "accepted") throw new TeamWorkspaceError("This Team invite has already been accepted.", 409);
  if (status === "revoked") throw new TeamWorkspaceError("This Team invite has been revoked.", 410);
  if (status === "expired" || record.expiresAt.getTime() <= Date.now()) {
    throw new TeamWorkspaceError("This Team invite has expired.", 410);
  }
  if (status !== "pending") throw new TeamWorkspaceError("This Team invite is not available.", 410);
}

function assertPendingSeatInvite(record: Pick<DbTeamInvite, "expiresAt" | "id" | "status">) {
  const status = normalizeInviteStatus(record.status);

  if (status === "accepted") throw new TeamWorkspaceError("This Team invite has already been accepted.", 409);
  if (status === "revoked") throw new TeamWorkspaceError("This Team invite has already been revoked.", 410);
  if (status === "expired" || record.expiresAt.getTime() <= Date.now()) {
    throw new TeamWorkspaceError("This Team invite has expired.", 410);
  }
  if (status !== "pending") throw new TeamWorkspaceError("This Team invite is not available.", 410);
}

const releasedSeatFreeSubscription = {
  cycle: "monthly",
  plan: "free",
  provider: "demo",
  providerCustomerId: "demo-customer",
  providerEntitlementId: "capitol-ledger-free",
  providerSubscriptionId: "demo-free",
  seatCount: undefined,
  status: "active"
} satisfies Partial<AccountSubscriptionSnapshot>;

async function convertAccountToFree(userId?: string | null) {
  if (!userId) return false;

  await writeSubscriptionToDatabase(userId, releasedSeatFreeSubscription).catch(() => null);
  setAccountSubscription(userId, releasedSeatFreeSubscription);
  return true;
}

async function readDatabaseInviteAcceptance(token: string): Promise<TeamWorkspaceAcceptancePreview> {
  if (!(await ensureTeamWorkspaceSchema())) return readMemoryInviteAcceptance(token);

  const prisma = getPrisma();

  try {
    const records = await prisma.$queryRaw<DbTeamInviteAcceptance[]>`
      SELECT
        "TeamInvite"."id",
        "TeamInvite"."workspaceId",
        "TeamInvite"."email",
        "TeamInvite"."role",
        "TeamInvite"."status",
        "TeamInvite"."expiresAt",
        "TeamInvite"."createdAt",
        "TeamInvite"."updatedAt",
        "TeamWorkspace"."name" AS "workspaceName",
        "TeamWorkspace"."ownerUserId",
        "TeamWorkspace"."createdAt" AS "workspaceCreatedAt",
        "TeamWorkspace"."updatedAt" AS "workspaceUpdatedAt",
        "User"."email" AS "ownerEmail",
        "User"."name" AS "ownerName"
      FROM "TeamInvite"
      JOIN "TeamWorkspace" ON "TeamWorkspace"."id" = "TeamInvite"."workspaceId"
      LEFT JOIN "User" ON "User"."id" = "TeamWorkspace"."ownerUserId"
      WHERE "TeamInvite"."tokenHash" = ${tokenHash(token)}
      LIMIT 1
    `;
    const record = records[0];
    if (!record) throw new TeamWorkspaceError("This Team invite link is invalid.", 404);

    if (normalizeInviteStatus(record.status) === "pending" && record.expiresAt.getTime() <= Date.now()) {
      await prisma.$executeRaw`
        UPDATE "TeamInvite"
        SET "status" = 'expired', "updatedAt" = NOW()
        WHERE "id" = ${record.id}
      `;
      record.status = "expired";
    }

    assertPendingInvite(record);

    return invitePreviewFromRecord(record);
  } catch (error) {
    if (error instanceof TeamWorkspaceError) throw error;
    if (!isDatabaseConnectionError(error)) throw error;
    logTeamWorkspaceFallback("readDatabaseInviteAcceptance", error);
    return readMemoryInviteAcceptance(token);
  }
}

function readMemoryInviteAcceptance(token: string): TeamWorkspaceAcceptancePreview {
  const hash = tokenHash(token);

  for (const workspace of memoryWorkspaceStore.values()) {
    const invite = workspace.invites.find((candidate) => candidate.tokenHash === hash);
    if (!invite) continue;

    if (invite.status === "pending" && Date.parse(invite.expiresAt) <= Date.now()) {
      invite.status = "expired";
      invite.updatedAt = new Date().toISOString();
    }

    const expiresAt = new Date(invite.expiresAt);
    assertPendingInvite({
      expiresAt,
      id: invite.id,
      status: invite.status
    });

    const owner = workspace.members.find((member) => member.role === "owner");

    return {
      invite,
      mode: "memory",
      owner: {
        email: owner?.email,
        name: owner?.displayName
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        ownerUserId: workspace.ownerUserId
      }
    };
  }

  throw new TeamWorkspaceError("This Team invite link is invalid.", 404);
}

export async function readTeamWorkspaceInviteAcceptance({ token }: { token: string }): Promise<TeamWorkspaceAcceptancePreview> {
  if (!token?.trim()) throw new TeamWorkspaceError("Team invite token is missing.", 400);
  if (!hasDatabaseUrl()) return readMemoryInviteAcceptance(token);
  return readDatabaseInviteAcceptance(token);
}

function acceptMemoryInvite({
  email,
  name,
  token,
  userId
}: {
  email: string;
  name?: string;
  token: string;
  userId: string;
}): TeamWorkspaceAcceptanceResult {
  const preview = readMemoryInviteAcceptance(token);
  const workspace = memoryWorkspaceStore.get(preview.workspace.ownerUserId);
  if (!workspace) throw new TeamWorkspaceError("This Team workspace is no longer available.", 404);

  const invite = workspace.invites.find((candidate) => candidate.tokenHash === tokenHash(token));
  if (!invite) throw new TeamWorkspaceError("This Team invite link is invalid.", 404);

  const memberEmail = normalizeTeamInviteEmail(email);
  if (memberEmail !== invite.email) {
    throw new TeamWorkspaceError(`Sign in with ${invite.email} to accept this Team invite.`, 403);
  }

  const current = snapshotFromParts({
    ...workspace,
    seatCount: normalizeTeamSeatCount(undefined)
  });
  const existingMember = workspace.members.find((member) => member.email === memberEmail && member.status === "active");
  const occupiedAfterAcceptance = existingMember ? current.occupiedSeats - 1 : current.occupiedSeats;
  if (occupiedAfterAcceptance > current.seatCount) {
    throw new TeamWorkspaceError("This workspace has no open paid Team seats. Ask the owner to add seats, then retry the invite.", 409);
  }

  const now = new Date().toISOString();
  let membership = existingMember;
  if (membership) {
    membership.displayName = name?.trim() || membership.displayName;
    membership.role = invite.role;
    membership.status = "active";
    membership.joinedAt = membership.joinedAt ?? now;
    membership.updatedAt = now;
  } else {
    membership = {
      id: randomUUID(),
      userId,
      email: memberEmail,
      displayName: name?.trim() || undefined,
      role: invite.role,
      status: "active",
      joinedAt: now,
      createdAt: now,
      updatedAt: now
    };
    workspace.members.push(membership);
  }

  invite.status = "accepted";
  invite.updatedAt = now;
  workspace.updatedAt = now;

  return {
    membership,
    mode: "memory",
    workspace: snapshotFromParts({
      ...workspace,
      seatCount: current.seatCount
    })
  };
}

async function acceptDatabaseInvite({
  email,
  name,
  token,
  userId
}: {
  email: string;
  name?: string;
  token: string;
  userId: string;
}): Promise<TeamWorkspaceAcceptanceResult> {
  if (!(await ensureTeamWorkspaceSchema())) return acceptMemoryInvite({ email, name, token, userId });

  const prisma = getPrisma();
  const memberEmail = normalizeTeamInviteEmail(email);

  if (!isValidTeamInviteEmail(memberEmail)) throw new TeamWorkspaceError("Sign in with the invited email address.", 403);

  try {
    let acceptedWorkspace: DbTeamWorkspace | null = null;
    let acceptedSeatCount = normalizeTeamSeatCount(undefined);
    let acceptedMembershipId = "";

    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        UPDATE "TeamInvite"
        SET "status" = 'expired', "updatedAt" = NOW()
        WHERE "status" = 'pending' AND "expiresAt" <= NOW()
      `;

      const records = await transaction.$queryRaw<DbTeamInviteAcceptance[]>`
        SELECT
          "TeamInvite"."id",
          "TeamInvite"."workspaceId",
          "TeamInvite"."email",
          "TeamInvite"."role",
          "TeamInvite"."status",
          "TeamInvite"."expiresAt",
          "TeamInvite"."createdAt",
          "TeamInvite"."updatedAt",
          "TeamWorkspace"."name" AS "workspaceName",
          "TeamWorkspace"."ownerUserId",
          "TeamWorkspace"."createdAt" AS "workspaceCreatedAt",
          "TeamWorkspace"."updatedAt" AS "workspaceUpdatedAt",
          "User"."email" AS "ownerEmail",
          "User"."name" AS "ownerName"
        FROM "TeamInvite"
        JOIN "TeamWorkspace" ON "TeamWorkspace"."id" = "TeamInvite"."workspaceId"
        LEFT JOIN "User" ON "User"."id" = "TeamWorkspace"."ownerUserId"
        WHERE "TeamInvite"."tokenHash" = ${tokenHash(token)}
        LIMIT 1
        FOR UPDATE OF "TeamInvite"
      `;
      const invite = records[0];
      if (!invite) throw new TeamWorkspaceError("This Team invite link is invalid.", 404);

      assertPendingInvite(invite);

      if (normalizeTeamInviteEmail(invite.email) !== memberEmail) {
        throw new TeamWorkspaceError(`Sign in with ${invite.email} to accept this Team invite.`, 403);
      }

      acceptedSeatCount = await readOwnerTeamSeatCount(invite.ownerUserId, transaction);

      const occupiedRecords = await transaction.$queryRaw<CountRecord[]>`
        SELECT
          (
            (SELECT COUNT(*) FROM "TeamMember" WHERE "workspaceId" = ${invite.workspaceId} AND "status" = 'active') +
            (SELECT COUNT(*) FROM "TeamInvite" WHERE "workspaceId" = ${invite.workspaceId} AND "status" = 'pending' AND "expiresAt" > NOW())
          ) AS "count"
      `;
      const activeRecords = await transaction.$queryRaw<CountRecord[]>`
        SELECT COUNT(*) AS "count"
        FROM "TeamMember"
        WHERE "workspaceId" = ${invite.workspaceId} AND "email" = ${memberEmail} AND "status" = 'active'
      `;
      const occupiedSeats = toCount(occupiedRecords[0]?.count ?? 0);
      const existingActiveSeats = toCount(activeRecords[0]?.count ?? 0);
      const occupiedAfterAcceptance = existingActiveSeats > 0 ? occupiedSeats - 1 : occupiedSeats;

      if (occupiedAfterAcceptance > acceptedSeatCount) {
        throw new TeamWorkspaceError("This workspace has no open paid Team seats. Ask the owner to add seats, then retry the invite.", 409);
      }

      const memberships = await transaction.$queryRaw<Array<{ id: string }>>`
        INSERT INTO "TeamMember" ("id", "workspaceId", "userId", "email", "displayName", "role", "status", "joinedAt", "createdAt", "updatedAt")
        VALUES (${randomUUID()}, ${invite.workspaceId}, ${userId}, ${memberEmail}, ${name?.trim() || null}, ${normalizeTeamInviteRole(invite.role)}, 'active', NOW(), NOW(), NOW())
        ON CONFLICT ("workspaceId", "email") DO UPDATE
        SET
          "userId" = EXCLUDED."userId",
          "displayName" = COALESCE(EXCLUDED."displayName", "TeamMember"."displayName"),
          "role" = EXCLUDED."role",
          "status" = 'active',
          "joinedAt" = COALESCE("TeamMember"."joinedAt", NOW()),
          "updatedAt" = NOW()
        RETURNING "id"
      `;

      acceptedMembershipId = memberships[0]?.id ?? "";

      await transaction.$executeRaw`
        UPDATE "TeamInvite"
        SET "status" = 'accepted', "updatedAt" = NOW()
        WHERE "id" = ${invite.id}
      `;

      acceptedWorkspace = {
        createdAt: invite.workspaceCreatedAt,
        id: invite.workspaceId,
        name: invite.workspaceName,
        ownerUserId: invite.ownerUserId,
        updatedAt: new Date()
      };
    });

    if (!acceptedWorkspace || !acceptedMembershipId) {
      throw new TeamWorkspaceError("Unable to accept this Team invite.", 500);
    }

    const workspace = await readWorkspaceSnapshotFromDatabase(acceptedWorkspace, acceptedSeatCount);
    const membership = workspace.members.find((member) => member.id === acceptedMembershipId || member.email === memberEmail);
    if (!membership) throw new TeamWorkspaceError("Unable to load the accepted Team seat.", 500);

    return {
      membership,
      mode: "database",
      workspace
    };
  } catch (error) {
    if (error instanceof TeamWorkspaceError) throw error;
    if (!isDatabaseConnectionError(error)) throw error;
    logTeamWorkspaceFallback("acceptDatabaseInvite", error);
    return acceptMemoryInvite({ email, name, token, userId });
  }
}

export async function acceptTeamWorkspaceInvite(input: {
  email: string;
  name?: string;
  token: string;
  userId: string;
}): Promise<TeamWorkspaceAcceptanceResult> {
  if (!input.token?.trim()) throw new TeamWorkspaceError("Team invite token is missing.", 400);
  if (!hasDatabaseUrl()) return acceptMemoryInvite(input);
  return acceptDatabaseInvite(input);
}

function readMemoryTeamWorkspaceForMember({
  email
}: {
  email: string;
  userId: string;
}): TeamWorkspaceMemberAccessResult | null {
  const memberEmail = normalizeTeamInviteEmail(email);

  for (const workspace of memoryWorkspaceStore.values()) {
    const membership = workspace.members.find((member) => member.status === "active" && member.email === memberEmail);
    if (!membership) continue;

    return {
      membership,
      mode: "memory",
      workspace: snapshotFromParts({
        ...workspace,
        seatCount: normalizeTeamSeatCount(undefined)
      })
    };
  }

  return null;
}

async function readDatabaseTeamWorkspaceForMember({
  email,
  userId
}: {
  email: string;
  userId: string;
}): Promise<TeamWorkspaceMemberAccessResult | null> {
  if (!(await ensureTeamWorkspaceSchema())) return readMemoryTeamWorkspaceForMember({ email, userId });

  const prisma = getPrisma();
  const memberEmail = normalizeTeamInviteEmail(email);

  try {
    const memberships = await prisma.$queryRaw<DbMemberAccess[]>`
      SELECT
        "TeamMember"."id",
        "TeamMember"."userId",
        "TeamMember"."email",
        "TeamMember"."displayName",
        "TeamMember"."role",
        "TeamMember"."status",
        "TeamMember"."joinedAt",
        "TeamMember"."createdAt",
        "TeamMember"."updatedAt",
        "TeamWorkspace"."id" AS "workspaceId",
        "TeamWorkspace"."name" AS "workspaceName",
        "TeamWorkspace"."ownerUserId",
        "TeamWorkspace"."createdAt" AS "workspaceCreatedAt",
        "TeamWorkspace"."updatedAt" AS "workspaceUpdatedAt"
      FROM "TeamMember"
      JOIN "TeamWorkspace" ON "TeamWorkspace"."id" = "TeamMember"."workspaceId"
      WHERE "TeamMember"."status" = 'active'
        AND ("TeamMember"."userId" = ${userId} OR "TeamMember"."email" = ${memberEmail})
      ORDER BY "TeamMember"."updatedAt" DESC
      LIMIT 5
    `;

    for (const membershipRecord of memberships) {
      const seatCount = await readOwnerTeamSeatCount(membershipRecord.ownerUserId).catch(() => null);
      if (!seatCount) continue;

      const workspace = await readWorkspaceSnapshotFromDatabase(
        {
          createdAt: membershipRecord.workspaceCreatedAt,
          id: membershipRecord.workspaceId,
          name: membershipRecord.workspaceName,
          ownerUserId: membershipRecord.ownerUserId,
          updatedAt: membershipRecord.workspaceUpdatedAt
        },
        seatCount
      );
      const membership = workspace.members.find((member) => member.id === membershipRecord.id || member.email === memberEmail);
      if (!membership) continue;

      return {
        membership,
        mode: "database",
        workspace
      };
    }

    return null;
  } catch (error) {
    if (!isDatabaseConnectionError(error)) throw error;
    logTeamWorkspaceFallback("readDatabaseTeamWorkspaceForMember", error);
    return readMemoryTeamWorkspaceForMember({ email, userId });
  }
}

export async function readTeamWorkspaceForMember(input: {
  email: string;
  userId: string;
}): Promise<TeamWorkspaceMemberAccessResult | null> {
  if (!hasDatabaseUrl()) return readMemoryTeamWorkspaceForMember(input);
  return readDatabaseTeamWorkspaceForMember(input);
}
