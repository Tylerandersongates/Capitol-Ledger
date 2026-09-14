import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";

const defaultBatchLimit = 25;
const maximumBatchLimit = 100;
const expiredInviteGraceDays = 30;
const legacyFeedbackRetentionDays = 365;
const staleCleanupJobMinutes = 10;

export type PrivacyRetentionCounts = {
  authSessions: number;
  emailVerificationTokens: number;
  legacyFeedback: number;
  passwordResetTokens: number;
  staleCleanupJobsRecovered: number;
  teamInvites: number;
};

export type PrivacyRetentionRun = {
  counts: PrivacyRetentionCounts;
  enabled: boolean;
  legacyFeedbackEnabled: boolean;
};

export type PrivacyRetentionDependencies = {
  deleteExpiredAuthSessions: (cutoff: Date, limit: number) => Promise<number>;
  deleteExpiredEmailVerificationTokens: (cutoff: Date, limit: number) => Promise<number>;
  deleteExpiredPasswordResetTokens: (cutoff: Date, limit: number) => Promise<number>;
  deleteLegacyFeedback: (cutoff: Date, limit: number) => Promise<number>;
  deleteOldTeamInvites: (cutoff: Date, limit: number) => Promise<number>;
  hasDatabase: () => boolean;
  recoverStaleCleanupJobs: (cutoff: Date, limit: number) => Promise<number>;
};

type PrivacyRetentionOptions = {
  dependencies?: PrivacyRetentionDependencies;
  environment?: Record<string, string | undefined>;
  limit?: number;
  now?: Date;
};

function emptyCounts(): PrivacyRetentionCounts {
  return {
    authSessions: 0,
    emailVerificationTokens: 0,
    legacyFeedback: 0,
    passwordResetTokens: 0,
    staleCleanupJobsRecovered: 0,
    teamInvites: 0
  };
}

function boundedLimit(value: number | undefined) {
  if (!Number.isFinite(value)) return defaultBatchLimit;
  return Math.max(1, Math.min(maximumBatchLimit, Math.floor(value ?? defaultBatchLimit)));
}

function before(now: Date, milliseconds: number) {
  return new Date(now.getTime() - milliseconds);
}

async function executeBoundedDelete(sql: string, cutoff: Date, limit: number) {
  return getPrisma().$executeRawUnsafe(sql, cutoff, limit);
}

const defaultDependencies: PrivacyRetentionDependencies = {
  hasDatabase: hasDatabaseUrl,
  deleteExpiredAuthSessions: (cutoff, limit) => executeBoundedDelete(
    `
      WITH expired AS (
        SELECT "id" FROM "AuthSession"
        WHERE "expiresAt" <= $1
        ORDER BY "expiresAt" ASC, "id" ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM "AuthSession" record
      USING expired
      WHERE record."id" = expired."id"
    `,
    cutoff,
    limit
  ),
  deleteExpiredEmailVerificationTokens: (cutoff, limit) => executeBoundedDelete(
    `
      WITH expired AS (
        SELECT "id" FROM "EmailVerificationToken"
        WHERE "expiresAt" <= $1
        ORDER BY "expiresAt" ASC, "id" ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM "EmailVerificationToken" record
      USING expired
      WHERE record."id" = expired."id"
    `,
    cutoff,
    limit
  ),
  deleteExpiredPasswordResetTokens: (cutoff, limit) => executeBoundedDelete(
    `
      WITH expired AS (
        SELECT "id" FROM "PasswordResetToken"
        WHERE "expiresAt" <= $1
        ORDER BY "expiresAt" ASC, "id" ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM "PasswordResetToken" record
      USING expired
      WHERE record."id" = expired."id"
    `,
    cutoff,
    limit
  ),
  deleteOldTeamInvites: (cutoff, limit) => executeBoundedDelete(
    `
      WITH expired AS (
        SELECT "id" FROM "TeamInvite"
        WHERE "expiresAt" <= $1
        ORDER BY "expiresAt" ASC, "id" ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM "TeamInvite" record
      USING expired
      WHERE record."id" = expired."id"
    `,
    cutoff,
    limit
  ),
  recoverStaleCleanupJobs: (cutoff, limit) => executeBoundedDelete(
    `
      WITH stale AS (
        SELECT "id" FROM "AccountDeletionCleanupJob"
        WHERE "status" = 'processing' AND "updatedAt" <= $1
        ORDER BY "updatedAt" ASC, "id" ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "AccountDeletionCleanupJob" record
      SET "status" = 'pending',
          "lastError" = 'Interrupted cleanup attempt recovered for automatic retry.',
          "availableAt" = NOW(),
          "updatedAt" = NOW()
      FROM stale
      WHERE record."id" = stale."id"
    `,
    cutoff,
    limit
  ),
  deleteLegacyFeedback: (cutoff, limit) => executeBoundedDelete(
    `
      WITH expired AS (
        SELECT feedback."id"
        FROM "BetaFeedback" feedback
        WHERE feedback."createdAt" <= $1
          AND (
            feedback."context"->>'requestType' IS DISTINCT FROM 'account-deletion'
            OR EXISTS (
              SELECT 1 FROM "AccountDeletionRequest" request
              WHERE request."id" = feedback."id"
            )
          )
        ORDER BY feedback."createdAt" ASC, feedback."id" ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM "BetaFeedback" record
      USING expired
      WHERE record."id" = expired."id"
    `,
    cutoff,
    limit
  )
};

/**
 * The scheduled deletion worker can call this on every run. It performs no
 * reads or writes unless the retention switch is explicitly enabled.
 * Legacy feedback deletion requires its own second switch because that table
 * remains an archive until its export/migration is independently approved.
 */
export async function runPrivacyRetentionSweep({
  dependencies = defaultDependencies,
  environment = process.env,
  limit,
  now = new Date()
}: PrivacyRetentionOptions = {}): Promise<PrivacyRetentionRun> {
  const enabled = environment.CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED === "true";
  const legacyFeedbackEnabled = enabled && environment.CAPITOLWONK_LEGACY_FEEDBACK_RETENTION_ENABLED === "true";
  const counts = emptyCounts();

  if (!enabled || !dependencies.hasDatabase()) {
    return { counts, enabled: false, legacyFeedbackEnabled: false };
  }

  const safeLimit = boundedLimit(limit);
  counts.staleCleanupJobsRecovered = await dependencies.recoverStaleCleanupJobs(
    before(now, staleCleanupJobMinutes * 60 * 1000),
    safeLimit
  );
  counts.authSessions = await dependencies.deleteExpiredAuthSessions(now, safeLimit);
  counts.emailVerificationTokens = await dependencies.deleteExpiredEmailVerificationTokens(now, safeLimit);
  counts.passwordResetTokens = await dependencies.deleteExpiredPasswordResetTokens(now, safeLimit);
  counts.teamInvites = await dependencies.deleteOldTeamInvites(
    before(now, expiredInviteGraceDays * 24 * 60 * 60 * 1000),
    safeLimit
  );

  if (legacyFeedbackEnabled) {
    counts.legacyFeedback = await dependencies.deleteLegacyFeedback(
      before(now, legacyFeedbackRetentionDays * 24 * 60 * 60 * 1000),
      safeLimit
    );
  }

  return { counts, enabled: true, legacyFeedbackEnabled };
}
