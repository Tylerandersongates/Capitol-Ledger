#!/usr/bin/env node

import assert from "node:assert/strict";

const expectedDatabaseName = "Capitol%20Ledger";
const expectedSchemaName = "public";

function validateTargetSnapshot(snapshot) {
  const problems = [];

  if (snapshot.databaseName !== expectedDatabaseName) {
    problems.push(`database name must be exactly ${expectedDatabaseName}`);
  }
  if (snapshot.schemaName !== expectedSchemaName) {
    problems.push(`current schema must be exactly ${expectedSchemaName}`);
  }
  if (!snapshot.hasMigrations) problems.push("public._prisma_migrations must exist");
  if (!snapshot.hasUser) problems.push("public.User must exist");
  if (!snapshot.hasDeletionRequest) problems.push("public.AccountDeletionRequest must exist");

  return problems;
}

function runSelfTest() {
  assert.deepEqual(
    validateTargetSnapshot({
      databaseName: expectedDatabaseName,
      schemaName: expectedSchemaName,
      hasMigrations: true,
      hasUser: true,
      hasDeletionRequest: true
    }),
    []
  );

  assert.deepEqual(
    validateTargetSnapshot({
      databaseName: "Capitol Ledger",
      schemaName: expectedSchemaName,
      hasMigrations: false,
      hasUser: false,
      hasDeletionRequest: false
    }),
    [
      `database name must be exactly ${expectedDatabaseName}`,
      "public._prisma_migrations must exist",
      "public.User must exist",
      "public.AccountDeletionRequest must exist"
    ]
  );

  console.log("Database-target guard self-test passed.");
}

async function checkDatabaseTarget() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required for the database-target guard.");
    process.exitCode = 1;
    return;
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const rows = await prisma.$queryRaw`
      SELECT
        current_database()::text AS "databaseName",
        current_schema()::text AS "schemaName",
        to_regclass('public."_prisma_migrations"') IS NOT NULL AS "hasMigrations",
        to_regclass('public."User"') IS NOT NULL AS "hasUser",
        to_regclass('public."AccountDeletionRequest"') IS NOT NULL AS "hasDeletionRequest"
    `;
    const snapshot = rows[0];
    const problems = snapshot ? validateTargetSnapshot(snapshot) : ["target query returned no result"];

    if (problems.length > 0) {
      console.error("Database-target guard failed:");
      problems.forEach((problem) => console.error(`- ${problem}`));
      process.exitCode = 1;
      return;
    }

    console.log(`Database-target guard passed for ${expectedDatabaseName} / ${expectedSchemaName}.`);
  } catch {
    console.error("Database-target guard could not query the database. Connection details were not printed.");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv.includes("--self-test")) {
  runSelfTest();
} else {
  await checkDatabaseTarget();
}
