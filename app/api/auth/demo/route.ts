import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, demoUser, getDemoSession, setDemoSessionCookie } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";

export async function GET() {
  const session = await getDemoSession();
  return NextResponse.json({
    authenticated: Boolean(session),
    mode: "demo",
    user: session?.user ?? null
  });
}

export async function POST(request: NextRequest) {
  const guard = guardMutationRequest(request, "auth-demo", { limit: 30, windowMs: 15 * 60 * 1000 });
  if (guard) return guard;

  const response = NextResponse.json({
    authenticated: true,
    mode: "demo",
    user: demoUser
  });

  clearAuthCookies(response);
  setDemoSessionCookie(response);

  return response;
}

export async function DELETE(request: NextRequest) {
  const guard = guardMutationRequest(request, "auth-demo-sign-out");
  if (guard) return guard;

  const response = NextResponse.json({
    authenticated: false,
    mode: "demo"
  });

  clearAuthCookies(response);

  return response;
}
