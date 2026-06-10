import { NextRequest, NextResponse } from "next/server";
import { ensureAccountUser } from "@/lib/account-database";
import { getCurrentSession } from "@/lib/auth";
import { getBetaFeedbackRecords, saveBetaFeedback, summarizeBetaFeedbackRecords, updateBetaFeedbackStatus } from "@/lib/beta-feedback";
import { guardMutationRequest } from "@/lib/request-security";

export async function GET() {
  const session = await getCurrentSession();
  const feedback = await getBetaFeedbackRecords(session?.user);

  return NextResponse.json({
    mode: feedback.mode,
    records: feedback.records,
    summary: summarizeBetaFeedbackRecords(feedback.records)
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const guard = guardMutationRequest(request, "beta-feedback", {
    key: typeof body.contactEmail === "string" ? body.contactEmail : undefined,
    limit: 12,
    windowMs: 60 * 60 * 1000
  });
  if (guard) return guard;

  const session = await getCurrentSession();
  if (session?.user) {
    await ensureAccountUser(session.user).catch(() => undefined);
  }

  const result = await saveBetaFeedback(
    {
      category: body.category as never,
      contactEmail: typeof body.contactEmail === "string" ? body.contactEmail : undefined,
      context: body.context && typeof body.context === "object" ? (body.context as Record<string, unknown>) : undefined,
      message: typeof body.message === "string" ? body.message : "",
      pageUrl: typeof body.pageUrl === "string" ? body.pageUrl : undefined,
      severity: body.severity as never,
      title: typeof body.title === "string" ? body.title : ""
    },
    session?.user
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    mode: result.mode,
    record: result.record,
    status: "received"
  });
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const guard = guardMutationRequest(request, "beta-feedback-status", {
    key: typeof body.id === "string" ? body.id : undefined,
    limit: 40,
    windowMs: 60 * 60 * 1000
  });
  if (guard) return guard;

  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in is required to review feedback." }, { status: 401 });
  }

  const result = await updateBetaFeedbackStatus({
    id: typeof body.id === "string" ? body.id : "",
    releaseDecision: body.releaseDecision,
    status: body.status,
    user: session.user
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    mode: result.mode,
    record: result.record,
    status: "updated"
  });
}
