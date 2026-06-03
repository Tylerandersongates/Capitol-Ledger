import { NextRequest, NextResponse } from "next/server";
import { clearCurrentAuthSession } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";

export async function DELETE(request: NextRequest) {
  const guard = guardMutationRequest(request, "auth-sign-out");
  if (guard) return guard;

  const response = NextResponse.json({
    authenticated: false
  });

  await clearCurrentAuthSession(response);

  return response;
}
