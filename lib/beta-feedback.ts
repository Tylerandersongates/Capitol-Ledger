import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";
import type { AuthUser } from "@/lib/auth-database";

export type BetaFeedbackCategory = "bug" | "flow" | "missing" | "data" | "design" | "other";
export type BetaFeedbackReleaseDecision = "launch_blocker" | "beta_acceptable" | "later" | "known_issue" | "duplicate";
export type BetaFeedbackSeverity = "low" | "medium" | "high";
export type BetaFeedbackStatus = "new" | "reviewing" | "planned" | "resolved";

export type BetaFeedbackInput = {
  category: BetaFeedbackCategory;
  contactEmail?: string;
  context?: Record<string, unknown>;
  message: string;
  pageUrl?: string;
  severity: BetaFeedbackSeverity;
  title: string;
};

export type BetaFeedbackRecord = BetaFeedbackInput & {
  createdAt: string;
  id: string;
  releaseDecision?: BetaFeedbackReleaseDecision;
  status: BetaFeedbackStatus;
  userId?: string;
};

export type BetaFeedbackSummary = {
  active: number;
  account: number;
  activeAccount: number;
  byCategory: Record<BetaFeedbackCategory, number>;
  byReleaseDecision: Record<BetaFeedbackReleaseDecision, number>;
  bySeverity: Record<BetaFeedbackSeverity, number>;
  byStatus: Record<BetaFeedbackStatus, number>;
  launchBlockers: number;
  open: number;
  resolved: number;
  total: number;
  untriaged: number;
};

type DbBetaFeedbackRow = {
  category: BetaFeedbackCategory;
  contactEmail: string | null;
  context: Record<string, unknown> | null;
  createdAt: Date;
  id: string;
  message: string;
  pageUrl: string | null;
  releaseDecision: BetaFeedbackReleaseDecision | null;
  severity: BetaFeedbackSeverity;
  status: BetaFeedbackStatus;
  title: string;
  userId: string | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __capitolLedgerBetaFeedbackStore: BetaFeedbackRecord[] | undefined;
}

const betaFeedbackStore = globalThis.__capitolLedgerBetaFeedbackStore ?? [];
globalThis.__capitolLedgerBetaFeedbackStore = betaFeedbackStore;

let betaFeedbackSchemaReady: Promise<boolean> | null = null;

function trimTo(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeCategory(value: unknown): BetaFeedbackCategory {
  return value === "bug" || value === "flow" || value === "missing" || value === "data" || value === "design" || value === "other"
    ? value
    : "other";
}

function normalizeSeverity(value: unknown): BetaFeedbackSeverity {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function normalizeStatus(value: unknown): BetaFeedbackStatus | null {
  return value === "new" || value === "reviewing" || value === "planned" || value === "resolved" ? value : null;
}

function normalizeReleaseDecision(value: unknown): BetaFeedbackReleaseDecision | null {
  return value === "launch_blocker" || value === "beta_acceptable" || value === "later" || value === "known_issue" || value === "duplicate" ? value : null;
}

function normalizeFeedbackPath(value?: string) {
  if (!value) return "";

  try {
    return new URL(value, "https://capitol-ledger.local").pathname.toLowerCase();
  } catch {
    return value.trim().split("?")[0].toLowerCase();
  }
}

function getContextString(context: BetaFeedbackRecord["context"], key: string) {
  const value = context?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function isAccountFeedbackRecord(record: Pick<BetaFeedbackRecord, "context" | "pageUrl">) {
  const path = normalizeFeedbackPath(record.pageUrl);
  const reportSource = getContextString(record.context, "reportSource").toLowerCase();
  const reportSourceLabel = getContextString(record.context, "reportSourceLabel").toLowerCase();

  return (
    reportSource === "account" ||
    reportSourceLabel.includes("account") ||
    reportSourceLabel.includes("sign-in") ||
    path === "/account" ||
    path.startsWith("/account/") ||
    path === "/settings" ||
    path.startsWith("/settings/") ||
    path === "/sign-in" ||
    path.startsWith("/sign-in/")
  );
}

export function normalizeBetaFeedbackInput(value: Partial<BetaFeedbackInput>): BetaFeedbackInput {
  return {
    category: normalizeCategory(value.category),
    contactEmail: trimTo(value.contactEmail, 160) || undefined,
    context: value.context && typeof value.context === "object" ? value.context : undefined,
    message: trimTo(value.message, 2400),
    pageUrl: trimTo(value.pageUrl, 500) || undefined,
    severity: normalizeSeverity(value.severity),
    title: trimTo(value.title, 140)
  };
}

async function ensureBetaFeedbackSchema() {
  if (!hasDatabaseUrl()) return false;
  if (betaFeedbackSchemaReady) return betaFeedbackSchemaReady;

  betaFeedbackSchemaReady = (async () => {
    const prisma = getPrisma();

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BetaFeedback" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT,
        "category" TEXT NOT NULL,
        "severity" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'new',
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "pageUrl" TEXT,
        "releaseDecision" TEXT,
        "contactEmail" TEXT,
        "context" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BetaFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE "BetaFeedback" ADD COLUMN IF NOT EXISTS "releaseDecision" TEXT`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BetaFeedback_status_createdAt_idx" ON "BetaFeedback"("status", "createdAt")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BetaFeedback_category_idx" ON "BetaFeedback"("category")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BetaFeedback_releaseDecision_idx" ON "BetaFeedback"("releaseDecision")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BetaFeedback_userId_idx" ON "BetaFeedback"("userId")`);

    return true;
  })();

  return betaFeedbackSchemaReady;
}

export async function saveBetaFeedback(input: BetaFeedbackInput, user?: AuthUser | null) {
  const feedback = normalizeBetaFeedbackInput(input);
  if (!feedback.title || !feedback.message) {
    return {
      error: "A short title and feedback details are required.",
      status: 400 as const
    };
  }

  const id = `feedback-${randomUUID()}`;
  const createdAt = new Date().toISOString();

  if (await ensureBetaFeedbackSchema().catch(() => false)) {
    const prisma = getPrisma();
    const contextJson = feedback.context ? JSON.stringify(feedback.context) : null;
    const rows = await prisma
      .$queryRaw<Array<{ createdAt: Date; id: string }>>`
        INSERT INTO "BetaFeedback" (
          "id", "userId", "category", "severity", "status", "title", "message", "pageUrl", "contactEmail", "context", "createdAt", "updatedAt"
        )
        VALUES (
          ${id},
          ${user?.id ?? null},
          ${feedback.category},
          ${feedback.severity},
          'new',
          ${feedback.title},
          ${feedback.message},
          ${feedback.pageUrl ?? null},
          ${feedback.contactEmail ?? user?.email ?? null},
          ${contextJson ? Prisma.sql`CAST(${contextJson} AS JSONB)` : Prisma.sql`NULL`},
          NOW(),
          NOW()
        )
        RETURNING "id", "createdAt"
      `
      .catch(() => []);

    const row = rows[0];
    if (row) {
      return {
        mode: "database" as const,
        record: {
          ...feedback,
          contactEmail: feedback.contactEmail ?? user?.email,
          createdAt: row.createdAt.toISOString(),
          id: row.id,
          status: "new" as const,
          userId: user?.id
        }
      };
    }
  }

  const record: BetaFeedbackRecord = {
    ...feedback,
    contactEmail: feedback.contactEmail ?? user?.email,
    createdAt,
    id,
    status: "new",
    userId: user?.id
  };
  betaFeedbackStore.unshift(record);

  return {
    mode: "demo" as const,
    record
  };
}

export function canReviewAllBetaFeedback(user?: AuthUser | null) {
  if (!user) return false;

  const reviewers = (process.env.BETA_REVIEWER_EMAILS ?? process.env.BETA_REVIEWER_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return reviewers.includes(user.email.toLowerCase());
}

function canPreviewAllBetaFeedbackLocally(user?: AuthUser | null) {
  return (
    process.env.NODE_ENV !== "production" &&
    user?.id === "local-feedback-review" &&
    user.email.toLowerCase() === "local-feedback-review@capitol-ledger.local"
  );
}

export async function getBetaFeedbackRecords(user?: AuthUser | null) {
  if (await ensureBetaFeedbackSchema().catch(() => false)) {
    const prisma = getPrisma();
    const includeAll = canReviewAllBetaFeedback(user) || canPreviewAllBetaFeedbackLocally(user);
    const rows = includeAll
      ? await prisma.$queryRaw<DbBetaFeedbackRow[]>`
          SELECT "id", "userId", "category", "severity", "status", "releaseDecision", "title", "message", "pageUrl", "contactEmail", "context", "createdAt"
          FROM "BetaFeedback"
          ORDER BY "createdAt" DESC
          LIMIT 50
        `
      : await prisma.$queryRaw<DbBetaFeedbackRow[]>`
          SELECT "id", "userId", "category", "severity", "status", "releaseDecision", "title", "message", "pageUrl", "contactEmail", "context", "createdAt"
          FROM "BetaFeedback"
          WHERE "userId" = ${user?.id ?? ""}
          ORDER BY "createdAt" DESC
          LIMIT 50
        `;

    return {
      mode: "database" as const,
      records: rows.map((row) => ({
        category: row.category,
        contactEmail: row.contactEmail ?? undefined,
        context: row.context ?? undefined,
        createdAt: row.createdAt.toISOString(),
        id: row.id,
        message: row.message,
        pageUrl: row.pageUrl ?? undefined,
        releaseDecision: row.releaseDecision ?? undefined,
        severity: row.severity,
        status: row.status,
        title: row.title,
        userId: row.userId ?? undefined
      }))
    };
  }

  return {
    mode: "demo" as const,
    records: getBetaFeedbackDemoRecords()
  };
}

export function summarizeBetaFeedbackRecords(records: BetaFeedbackRecord[]): BetaFeedbackSummary {
  const byCategory: Record<BetaFeedbackCategory, number> = {
    bug: 0,
    data: 0,
    design: 0,
    flow: 0,
    missing: 0,
    other: 0
  };
  const byReleaseDecision: Record<BetaFeedbackReleaseDecision, number> = {
    beta_acceptable: 0,
    duplicate: 0,
    known_issue: 0,
    later: 0,
    launch_blocker: 0
  };
  const bySeverity: Record<BetaFeedbackSeverity, number> = {
    high: 0,
    low: 0,
    medium: 0
  };
  const byStatus: Record<BetaFeedbackStatus, number> = {
    new: 0,
    planned: 0,
    resolved: 0,
    reviewing: 0
  };

  for (const record of records) {
    byCategory[record.category] += 1;
    bySeverity[record.severity] += 1;
    byStatus[record.status] += 1;
    if (record.releaseDecision) byReleaseDecision[record.releaseDecision] += 1;
  }

  const activeRecords = records.filter((record) => record.status !== "resolved");

  return {
    active: activeRecords.length,
    account: records.filter(isAccountFeedbackRecord).length,
    activeAccount: activeRecords.filter(isAccountFeedbackRecord).length,
    byCategory,
    byReleaseDecision,
    bySeverity,
    byStatus,
    launchBlockers: activeRecords.filter((record) => record.releaseDecision === "launch_blocker").length,
    open: activeRecords.filter((record) => record.status === "new" || record.status === "reviewing").length,
    resolved: byStatus.resolved,
    total: records.length,
    untriaged: activeRecords.filter((record) => !record.releaseDecision).length
  };
}

export async function updateBetaFeedbackStatus({
  id,
  releaseDecision,
  status,
  user
}: {
  id: string;
  releaseDecision?: unknown;
  status: unknown;
  user?: AuthUser | null;
}) {
  const nextStatus = normalizeStatus(status);
  const nextReleaseDecision = normalizeReleaseDecision(releaseDecision);
  if (!nextStatus && !nextReleaseDecision) {
    return {
      error: "Choose a valid feedback review update.",
      status: 400 as const
    };
  }

  if (!canReviewAllBetaFeedback(user)) {
    return {
      error: "Feedback review access is required.",
      status: 403 as const
    };
  }

  if (await ensureBetaFeedbackSchema().catch(() => false)) {
    const prisma = getPrisma();
    const rows = await prisma
      .$queryRaw<DbBetaFeedbackRow[]>`
        UPDATE "BetaFeedback"
        SET
          "status" = COALESCE(${nextStatus}, "status"),
          "releaseDecision" = COALESCE(${nextReleaseDecision}, "releaseDecision"),
          "updatedAt" = NOW()
        WHERE "id" = ${id}
        RETURNING "id", "userId", "category", "severity", "status", "releaseDecision", "title", "message", "pageUrl", "contactEmail", "context", "createdAt"
      `
      .catch(() => []);

    const row = rows[0];
    if (row) {
      return {
        mode: "database" as const,
        record: {
          category: row.category,
          contactEmail: row.contactEmail ?? undefined,
          context: row.context ?? undefined,
          createdAt: row.createdAt.toISOString(),
          id: row.id,
          message: row.message,
          pageUrl: row.pageUrl ?? undefined,
          releaseDecision: row.releaseDecision ?? undefined,
          severity: row.severity,
          status: row.status,
          title: row.title,
          userId: row.userId ?? undefined
        }
      };
    }
  }

  const index = betaFeedbackStore.findIndex((record) => record.id === id);
  if (index === -1) {
    return {
      error: "Feedback report was not found.",
      status: 404 as const
    };
  }

  betaFeedbackStore[index] = {
    ...betaFeedbackStore[index],
    ...(nextReleaseDecision ? { releaseDecision: nextReleaseDecision } : {}),
    ...(nextStatus ? { status: nextStatus } : {})
  };

  return {
    mode: "demo" as const,
    record: betaFeedbackStore[index]
  };
}

export function getBetaFeedbackDemoRecords() {
  return betaFeedbackStore.slice(0, 25);
}
