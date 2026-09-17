import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __capitolLedgerPrisma: PrismaClient | undefined;
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPrisma() {
  const client = globalThis.__capitolLedgerPrisma ?? new PrismaClient();
  globalThis.__capitolLedgerPrisma = client;
  return client;
}
