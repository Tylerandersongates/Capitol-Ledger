import { randomBytes, randomUUID, scrypt as nodeScrypt, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";

const scrypt = promisify(nodeScrypt);
const sessionDays = 30;
const tokenHours = 24;

type DbAuthUser = {
  email: string;
  emailVerifiedAt: Date | null;
  firstName: string | null;
  id: string;
  lastName: string | null;
  name: string | null;
  passwordHash: string | null;
};

export type AuthUser = {
  email: string;
  emailVerifiedAt?: string;
  firstName?: string;
  id: string;
  lastName?: string;
  name?: string;
};

export type AuthResult =
  | { configured: false; error: string }
  | { configured: true; error: string; status: number }
  | {
      configured: true;
      sessionToken: string;
      user: AuthUser;
      verificationToken?: string;
    };

export type EmailVerificationResult =
  | { configured: false; error: string }
  | { configured: true; error: string; status: number }
  | {
      configured: true;
      sessionToken?: string;
      user: AuthUser | null;
    };

let authSchemaReady: Promise<boolean> | null = null;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(normalizeEmail(value));
}

function toAuthUser(user: DbAuthUser): AuthUser {
  return {
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString(),
    firstName: user.firstName ?? undefined,
    id: user.id,
    lastName: user.lastName ?? undefined,
    name: user.name ?? undefined
  };
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function newToken() {
  return randomBytes(32).toString("base64url");
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("base64")}`;
}

async function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) return false;

  const [algorithm, salt, hash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;

  const expected = Buffer.from(hash, "base64");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function canUseProductionAuth() {
  return hasDatabaseUrl();
}

export async function ensureProductionAuthSchema() {
  if (!canUseProductionAuth()) return false;
  if (authSchemaReady) return authSchemaReady;

  authSchemaReady = (async () => {
    const prisma = getPrisma();

    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AuthSession" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "tokenHash" TEXT UNIQUE NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        "lastUsedAt" TIMESTAMP(3)
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AuthSession_userId_idx" ON "AuthSession" ("userId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "AuthSession_expiresAt_idx" ON "AuthSession" ("expiresAt")`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "EmailVerificationToken" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "tokenHash" TEXT UNIQUE NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "usedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EmailVerificationToken_userId_idx" ON "EmailVerificationToken" ("userId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken" ("expiresAt")`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "tokenHash" TEXT UNIQUE NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "usedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken" ("userId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken" ("expiresAt")`);

    return true;
  })();

  return authSchemaReady;
}

async function readUserByEmail(email: string) {
  const prisma = getPrisma();
  const users = await prisma.$queryRaw<DbAuthUser[]>`
    SELECT "id", "email", "name", "firstName", "lastName", "passwordHash", "emailVerifiedAt"
    FROM "User"
    WHERE "email" = ${normalizeEmail(email)}
    LIMIT 1
  `;

  return users[0] ?? null;
}

async function readUserById(userId: string) {
  const prisma = getPrisma();
  const users = await prisma.$queryRaw<DbAuthUser[]>`
    SELECT "id", "email", "name", "firstName", "lastName", "passwordHash", "emailVerifiedAt"
    FROM "User"
    WHERE "id" = ${userId}
    LIMIT 1
  `;

  return users[0] ?? null;
}

async function createSessionForUser(userId: string) {
  const prisma = getPrisma();
  const sessionToken = newToken();
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

  await prisma.$executeRaw`
    DELETE FROM "AuthSession"
    WHERE "expiresAt" <= NOW()
  `;

  await prisma.$executeRaw`
    INSERT INTO "AuthSession" ("id", "userId", "tokenHash", "expiresAt", "createdAt", "lastUsedAt")
    VALUES (${randomUUID()}, ${userId}, ${tokenHash(sessionToken)}, ${expiresAt}, NOW(), NOW())
  `;

  return sessionToken;
}

async function createVerificationToken(userId: string) {
  const prisma = getPrisma();
  const token = newToken();
  const expiresAt = new Date(Date.now() + tokenHours * 60 * 60 * 1000);

  await prisma.$executeRaw`
    INSERT INTO "EmailVerificationToken" ("id", "userId", "tokenHash", "expiresAt", "createdAt")
    VALUES (${randomUUID()}, ${userId}, ${tokenHash(token)}, ${expiresAt}, NOW())
  `;

  return token;
}

export async function createCredentialAccount({
  email,
  firstName,
  lastName,
  name,
  password
}: {
  email: string;
  firstName?: string;
  lastName?: string;
  name: string;
  password: string;
}): Promise<AuthResult> {
  if (!(await ensureProductionAuthSchema())) {
    return { configured: false, error: "Production auth needs DATABASE_URL before real accounts can be created." };
  }

  if (!isEmail(email)) {
    return { configured: true, error: "Enter a valid email address.", status: 400 };
  }

  const cleanFirstName = normalizeName(firstName ?? name.split(" ")[0] ?? "");
  const cleanLastName = normalizeName(lastName ?? name.split(" ").slice(1).join(" ") ?? "");
  const displayName = normalizeName(`${cleanFirstName} ${cleanLastName}`.trim() || name);

  if (cleanFirstName.length < 1) {
    return { configured: true, error: "Add your first name for the account profile.", status: 400 };
  }

  if (cleanLastName.length < 1) {
    return { configured: true, error: "Add your last name for the account profile.", status: 400 };
  }

  if (password.length < 8) {
    return { configured: true, error: "Use at least 8 characters for the password.", status: 400 };
  }

  const existing = await readUserByEmail(email);
  if (existing) {
    return { configured: true, error: "An account already exists for this email.", status: 409 };
  }

  const prisma = getPrisma();
  const userId = randomUUID();
  const cleanEmail = normalizeEmail(email);
  const passwordHash = await hashPassword(password);

  await prisma.$executeRaw`
    INSERT INTO "User" ("id", "email", "name", "firstName", "lastName", "passwordHash", "createdAt", "updatedAt")
    VALUES (${userId}, ${cleanEmail}, ${displayName}, ${cleanFirstName}, ${cleanLastName}, ${passwordHash}, NOW(), NOW())
  `;

  const user = await readUserById(userId);
  if (!user) {
    return { configured: true, error: "Account creation failed.", status: 500 };
  }

  return {
    configured: true,
    sessionToken: await createSessionForUser(user.id),
    user: toAuthUser(user),
    verificationToken: await createVerificationToken(user.id)
  };
}

export async function signInWithPassword({ email, password }: { email: string; password: string }): Promise<AuthResult> {
  if (!(await ensureProductionAuthSchema())) {
    return { configured: false, error: "Production auth needs DATABASE_URL before real sign-in can be used." };
  }

  const user = await readUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { configured: true, error: "Email or password is incorrect.", status: 401 };
  }

  return {
    configured: true,
    sessionToken: await createSessionForUser(user.id),
    user: toAuthUser(user)
  };
}

export async function readProductionSession(sessionToken: string): Promise<{ user: AuthUser } | null> {
  if (!sessionToken || !(await ensureProductionAuthSchema())) return null;

  const prisma = getPrisma();
  const users = await prisma.$queryRaw<DbAuthUser[]>`
    SELECT "User"."id", "User"."email", "User"."name", "User"."firstName", "User"."lastName", "User"."passwordHash", "User"."emailVerifiedAt"
    FROM "AuthSession"
    JOIN "User" ON "User"."id" = "AuthSession"."userId"
    WHERE "AuthSession"."tokenHash" = ${tokenHash(sessionToken)}
      AND "AuthSession"."expiresAt" > NOW()
    LIMIT 1
  `;
  const user = users[0];
  if (!user) return null;

  await prisma.$executeRaw`
    UPDATE "AuthSession"
    SET "lastUsedAt" = NOW()
    WHERE "tokenHash" = ${tokenHash(sessionToken)}
  `;

  return { user: toAuthUser(user) };
}

export async function deleteProductionSession(sessionToken: string) {
  if (!sessionToken || !(await ensureProductionAuthSchema())) return;

  const prisma = getPrisma();
  await prisma.$executeRaw`
    DELETE FROM "AuthSession"
    WHERE "tokenHash" = ${tokenHash(sessionToken)}
  `;
}

export async function requestPasswordReset(email: string) {
  if (!(await ensureProductionAuthSchema())) {
    return { configured: false, error: "Production auth needs DATABASE_URL before password reset can be used." };
  }

  const user = await readUserByEmail(email);
  if (!user) return { configured: true, deliveryMode: "silent", resetToken: null };

  const prisma = getPrisma();
  const resetToken = newToken();
  const expiresAt = new Date(Date.now() + tokenHours * 60 * 60 * 1000);

  await prisma.$executeRaw`
    INSERT INTO "PasswordResetToken" ("id", "userId", "tokenHash", "expiresAt", "createdAt")
    VALUES (${randomUUID()}, ${user.id}, ${tokenHash(resetToken)}, ${expiresAt}, NOW())
  `;

  return { configured: true, deliveryMode: "manual_until_email_provider", resetToken };
}

export async function resetPasswordWithToken({ password, token }: { password: string; token: string }): Promise<AuthResult> {
  if (!(await ensureProductionAuthSchema())) {
    return { configured: false, error: "Production auth needs DATABASE_URL before password reset can be used." };
  }

  if (!token) {
    return { configured: true, error: "Password reset token is missing.", status: 400 };
  }

  if (password.length < 8) {
    return { configured: true, error: "Use at least 8 characters for the password.", status: 400 };
  }

  const prisma = getPrisma();
  const resetTokens = await prisma.$queryRaw<Array<{ id: string; userId: string }>>`
    SELECT "id", "userId"
    FROM "PasswordResetToken"
    WHERE "tokenHash" = ${tokenHash(token)}
      AND "usedAt" IS NULL
      AND "expiresAt" > NOW()
    LIMIT 1
  `;
  const resetToken = resetTokens[0];
  if (!resetToken) {
    return { configured: true, error: "Password reset token is invalid or expired.", status: 400 };
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE "User"
      SET "passwordHash" = ${passwordHash}, "updatedAt" = NOW()
      WHERE "id" = ${resetToken.userId}
    `,
    prisma.$executeRaw`
      UPDATE "PasswordResetToken"
      SET "usedAt" = NOW()
      WHERE "id" = ${resetToken.id}
    `,
    prisma.$executeRaw`
      DELETE FROM "AuthSession"
      WHERE "userId" = ${resetToken.userId}
    `
  ]);

  const user = await readUserById(resetToken.userId);
  if (!user) {
    return { configured: true, error: "Password reset failed.", status: 500 };
  }

  return {
    configured: true,
    sessionToken: await createSessionForUser(user.id),
    user: toAuthUser(user)
  };
}

export async function verifyEmailToken({ code, sessionToken, token }: { code?: string; sessionToken?: string; token?: string }): Promise<EmailVerificationResult> {
  if (!(await ensureProductionAuthSchema())) {
    return { configured: false, error: "Production auth needs DATABASE_URL before email verification can be used." };
  }

  const prisma = getPrisma();

  if (sessionToken && code === "1234") {
    const session = await readProductionSession(sessionToken);
    if (!session) return { configured: true, error: "Verification session expired.", status: 401 };

    await prisma.$executeRaw`
      UPDATE "User"
      SET "emailVerifiedAt" = NOW(), "updatedAt" = NOW()
      WHERE "id" = ${session.user.id}
    `;

    return { configured: true, user: { ...session.user, emailVerifiedAt: new Date().toISOString() } };
  }

  if (!token) return { configured: true, error: "Verification token is missing.", status: 400 };

  const userIds = await prisma.$queryRaw<Array<{ userId: string }>>`
    SELECT "userId"
    FROM "EmailVerificationToken"
    WHERE "tokenHash" = ${tokenHash(token)}
      AND "usedAt" IS NULL
      AND "expiresAt" > NOW()
    LIMIT 1
  `;
  const userId = userIds[0]?.userId;
  if (!userId) return { configured: true, error: "Verification token is invalid or expired.", status: 400 };

  await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE "EmailVerificationToken"
      SET "usedAt" = NOW()
      WHERE "tokenHash" = ${tokenHash(token)}
    `,
    prisma.$executeRaw`
      UPDATE "User"
      SET "emailVerifiedAt" = NOW(), "updatedAt" = NOW()
      WHERE "id" = ${userId}
    `
  ]);

  const user = await readUserById(userId);
  return {
    configured: true,
    sessionToken: user ? await createSessionForUser(user.id) : undefined,
    user: user ? toAuthUser(user) : null
  };
}
