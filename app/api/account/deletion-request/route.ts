import { NextRequest, NextResponse } from "next/server";
import { createAccountDeletionRequest, getActiveAccountDeletionRequest } from "@/lib/account-deletion";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";

export async function GET() {
  const session = await getCurrentSession();
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
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const guard = guardMutationRequest(request, "account-deletion-request", { limit: 3, windowMs: 24 * 60 * 60 * 1000 });
  if (guard) return guard;

  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  if (session.mode !== "production") {
    return NextResponse.json({ error: "Preview accounts do not store a production account to delete." }, { status: 400 });
  }

  if (body.confirmation !== "DELETE" || body.subscriptionAcknowledged !== true) {
    return NextResponse.json(
      {
        error: "Confirm permanent account deletion and acknowledge that Apple subscription billing is managed separately."
      },
      { status: 400 }
    );
  }

  const result = await createAccountDeletionRequest(session.user);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    mode: result.mode,
    request: result.request,
    status: result.mode === "existing" ? "already-requested" : "received"
  });
}
