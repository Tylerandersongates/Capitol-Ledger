import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { processAccountDeletionCleanupJobs } from "@/lib/account-deletion-cleanup";

function configuredTaskSecret() {
  return process.env.ACCOUNT_DELETION_CLEANUP_SECRET || process.env.CAPITOL_LEDGER_TASK_SECRET || process.env.CRON_SECRET;
}

function requestTaskSecret(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
  return bearer || request.headers.get("x-capitol-ledger-task-secret") || request.headers.get("x-vercel-cron-signature");
}

function secretsMatch(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

async function runCleanup(request: NextRequest) {
  const expected = configuredTaskSecret();
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Account-deletion cleanup task secret is not configured." }, { status: 503 });
    }
  } else {
    const actual = requestTaskSecret(request);
    if (!actual || !secretsMatch(expected, actual)) {
      return NextResponse.json({ error: "Account-deletion cleanup task is not authorized." }, { status: 401 });
    }
  }

  const body = (request.method === "POST" ? await request.json().catch(() => ({})) : {}) as { limit?: number };
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = typeof body.limit === "number" ? body.limit : limitParam ? Number(limitParam) : 25;
  const result = await processAccountDeletionCleanupJobs({ limit: Number.isFinite(limit) ? limit : 25 });
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return runCleanup(request);
}

export async function POST(request: NextRequest) {
  return runCleanup(request);
}
