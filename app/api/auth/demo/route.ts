import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, demoUser, getDemoSession, setDemoSessionCookie } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";

function demoAuthEnabled() {
  const isVercelDeployment = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
  return process.env.AUTH_DEMO_ENABLED === "true" && !isVercelDeployment;
}

export async function GET() {
  if (!demoAuthEnabled()) {
    return NextResponse.json({
      authenticated: false,
      mode: "demo",
      user: null
    });
  }

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
  if (!demoAuthEnabled()) {
    return NextResponse.json(
      {
        error: "Demo mode is disabled for this deployment."
      },
      { status: 403 }
    );
  }

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
