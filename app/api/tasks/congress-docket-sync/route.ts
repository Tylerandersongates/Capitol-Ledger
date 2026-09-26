import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  authorizeCongressDocketSyncTask,
  CongressDocketSyncInputError,
  parseCongressDocketIdempotencyKey,
  parseCongressDocketSyncLimit,
  runCongressDocketSync
} from "@/lib/congress-docket-sync";

function configuredTaskSecret() {
  return process.env.CONGRESS_DOCKET_SYNC_SECRET;
}

function requestTaskSecret(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  return (
    bearer ||
    request.headers.get("x-capitol-ledger-task-secret") ||
    request.headers.get("x-vercel-cron-signature")
  );
}

async function runFromRequest(request: NextRequest) {
  const authorization = authorizeCongressDocketSyncTask({
    actualSecret: requestTaskSecret(request),
    enabledValue: process.env.CONGRESS_DOCKET_SYNC_ENABLED,
    expectedSecret: configuredTaskSecret()
  });
  if (!authorization.ok) {
    return NextResponse.json(
      {
        code: authorization.code,
        error:
          authorization.status === 401
            ? "Congress docket sync task is not authorized."
            : "Congress docket sync task is not enabled and configured."
      },
      { status: authorization.status }
    );
  }

  try {
    const body = (request.method === "POST"
      ? await request.json().catch(() => ({}))
      : {}) as {
      idempotencyKey?: unknown;
      limit?: unknown;
    };
    const limit = parseCongressDocketSyncLimit(
      body.limit ?? request.nextUrl.searchParams.get("limit") ?? undefined
    );
    const idempotencyKey = parseCongressDocketIdempotencyKey(
      body.idempotencyKey ??
        request.headers.get("idempotency-key") ??
        request.headers.get("x-idempotency-key") ??
        request.nextUrl.searchParams.get("idempotencyKey")
    );
    const result = await runCongressDocketSync({ idempotencyKey, limit });
    if (result.outcome === "succeeded") {
      ["/dashboard", "/live-docket", "/priority-feed", "/risk-watch"].forEach((path) =>
        revalidatePath(path)
      );
    }

    return NextResponse.json(result, {
      status: result.outcome === "in-progress" ? 409 : 200
    });
  } catch (error) {
    if (error instanceof CongressDocketSyncInputError) {
      return NextResponse.json(
        {
          code: "CONGRESS_DOCKET_SYNC_INVALID_REQUEST",
          error: error.message
        },
        { status: 400 }
      );
    }

    console.error("[congress-docket-sync] bounded task failed; persisted failure evidence when available.");
    return NextResponse.json(
      {
        code: "CONGRESS_DOCKET_SYNC_FAILED",
        error: "Congress docket sync failed safely; the last successful source sync remains authoritative."
      },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  return runFromRequest(request);
}

export async function POST(request: NextRequest) {
  return runFromRequest(request);
}
