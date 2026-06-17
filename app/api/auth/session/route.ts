import { NextResponse } from "next/server";
import { getDemoSession, getProductionSession } from "@/lib/auth";

export async function GET() {
  const productionSession = await getProductionSession({ includeUnverified: true });
  const requiresVerification = Boolean(productionSession && !productionSession.user.emailVerifiedAt);
  const session = requiresVerification ? await getDemoSession() : productionSession ?? (await getDemoSession());

  return NextResponse.json({
    authenticated: Boolean(session),
    mode: session?.mode ?? "anonymous",
    requiresVerification,
    user: session?.user ?? null
  });
}
