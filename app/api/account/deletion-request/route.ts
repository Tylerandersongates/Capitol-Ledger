import { NextRequest, NextResponse } from "next/server";
import {
  AccountDeletionUnavailableError,
  deleteAccountAndAssociatedData,
  getActiveAccountDeletionRequest
} from "@/lib/account-deletion";
import { isAccountDeletionEnabled } from "@/lib/account-deletion-activation";
import { clearAuthCookies, getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { clearRateLimitSubjects, guardMutationRequest } from "@/lib/request-security";

function accountDeletionDisabledResponse() {
  return NextResponse.json(
    {
      code: "ACCOUNT_DELETION_DISABLED",
      error: "Account deletion is temporarily unavailable. No account data was changed."
    },
    {
      headers: { "Cache-Control": "no-store" },
      status: 503
    }
  );
}

export async function GET() {
  if (!isAccountDeletionEnabled()) return accountDeletionDisabledResponse();

  const session = await getCurrentSession({ includeUnverified: true });
  if (!session?.user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  if (session.mode !== "production") {
    return NextResponse.json({ eligible: false, request: null });
  }

  return NextResponse.json({
    eligible: true,
    request: await getActiveAccountDeletionRequest(session.user)
  });
}

export async function POST(request: NextRequest) {
  if (!isAccountDeletionEnabled()) return accountDeletionDisabledResponse();

  const originGuard = guardMutationRequest(request, "account-deletion-request");
  if (originGuard) return originGuard;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const session = await getCurrentSession({ includeUnverified: true });
  if (!session?.user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  if (session.mode !== "production") {
    return NextResponse.json({ error: "Preview accounts do not store a production account to delete." }, { status: 400 });
  }

  const rateLimitGuard = guardMutationRequest(request, "account-deletion-request", {
    key: session.user.id,
    limit: 5,
    windowMs: 60 * 60 * 1000
  });
  if (rateLimitGuard) return rateLimitGuard;

  if (body.confirmation !== "DELETE" || body.subscriptionAcknowledged !== true) {
    return NextResponse.json(
      {
        error: "Confirm permanent account deletion and acknowledge that Apple subscription billing is managed separately."
      },
      { status: 400 }
    );
  }

  try {
    const result = await deleteAccountAndAssociatedData(session.user);
    const response = NextResponse.json({
      completedAt: result.completedAt,
      mode: result.mode,
      request: result.request,
      status: result.mode === "already-deleted" ? "already-deleted" : "completed"
    });

    clearRateLimitSubjects(session.user.id, session.user.email);
    clearAuthCookies(response);
    return response;
  } catch (error) {
    console.error("[account-deletion] permanent deletion failed", {
      name: error instanceof Error ? error.name : "unknown"
    });
    const status = error instanceof AccountDeletionUnavailableError ? error.status : 503;
    return NextResponse.json(
      { error: "Account deletion could not be completed. Your account is unchanged; please try again shortly." },
      { status }
    );
  }
}
