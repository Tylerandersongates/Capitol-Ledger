import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runWeeklyBriefDelivery } from "@/lib/weekly-brief-delivery-runner";

function configuredTaskSecret() {
  return process.env.WEEKLY_BRIEF_CRON_SECRET || process.env.CAPITOL_LEDGER_TASK_SECRET || process.env.CRON_SECRET;
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

function guardTaskRequest(request: NextRequest) {
  const expected = configuredTaskSecret();

  if (!expected) {
    if (process.env.NODE_ENV !== "production") return null;
    return NextResponse.json({ error: "Weekly Brief task secret is not configured." }, { status: 503 });
  }

  const actual = requestTaskSecret(request);
  if (actual && secretsMatch(expected, actual)) return null;

  return NextResponse.json({ error: "Weekly Brief task is not authorized." }, { status: 401 });
}

async function runFromRequest(request: NextRequest) {
  const guard = guardTaskRequest(request);
  if (guard) return guard;

  const body = (request.method === "POST" ? await request.json().catch(() => ({})) : {}) as {
    dryRun?: boolean;
    limit?: number;
  };
  const limitParam = request.nextUrl.searchParams.get("limit");
  const dryRunParam = request.nextUrl.searchParams.get("dryRun");
  const limit = typeof body.limit === "number" ? body.limit : limitParam ? Number(limitParam) : 50;
  const dryRun = typeof body.dryRun === "boolean" ? body.dryRun : dryRunParam === "true";
  const result = await runWeeklyBriefDelivery({ dryRun, limit });

  return NextResponse.json(result, { status: result.configured ? 200 : 503 });
}

export async function GET(request: NextRequest) {
  return runFromRequest(request);
}

export async function POST(request: NextRequest) {
  return runFromRequest(request);
}
