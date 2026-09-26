import { NextRequest, NextResponse } from "next/server";
import { withAccountPersistenceRoute } from "@/lib/account-persistence-safety";
import { getProductionSession, requireAuthMessage } from "@/lib/auth";
import { privacyRequestPayloadSchema } from "@/lib/privacy-request-contract";
import { isPrivacyRequestIntakeEnabled } from "@/lib/privacy-request-activation";
import { createPrivacyRequestForUser, listPrivacyRequestsForUser } from "@/lib/privacy-requests";
import { hasDatabaseUrl } from "@/lib/prisma";
import { guardMutationRequest } from "@/lib/request-security";

const noStoreHeaders = { "Cache-Control": "no-store" };
const privacyRequestBodyLimit = 4096;

function privacyRequestDisabledResponse() {
  return NextResponse.json(
    {
      code: "PRIVACY_REQUEST_INTAKE_DISABLED",
      error: "Privacy-request intake is not active in this build. No request was submitted."
    },
    { headers: noStoreHeaders, status: 503 }
  );
}

function privacyRequestUnavailableResponse() {
  return NextResponse.json(
    {
      code: "PRIVACY_REQUEST_INTAKE_UNAVAILABLE",
      error: "Privacy-request intake is temporarily unavailable. No request was submitted."
    },
    { headers: noStoreHeaders, status: 503 }
  );
}

async function getPrivacyRequests() {
  if (!isPrivacyRequestIntakeEnabled()) return privacyRequestDisabledResponse();
  if (!hasDatabaseUrl()) return privacyRequestUnavailableResponse();

  const session = await getProductionSession({ includeUnverified: true });
  if (!session?.user) {
    return NextResponse.json(requireAuthMessage(), { headers: noStoreHeaders, status: 401 });
  }

  return NextResponse.json(
    { requests: await listPrivacyRequestsForUser(session.user.id) },
    { headers: noStoreHeaders }
  );
}

async function createPrivacyRequest(request: NextRequest) {
  if (!isPrivacyRequestIntakeEnabled()) return privacyRequestDisabledResponse();
  if (!hasDatabaseUrl()) return privacyRequestUnavailableResponse();

  const originGuard = await guardMutationRequest(request, "privacy-request-intake");
  if (originGuard) return originGuard;

  const session = await getProductionSession({ includeUnverified: true });
  if (!session?.user) {
    return NextResponse.json(requireAuthMessage(), { headers: noStoreHeaders, status: 401 });
  }

  const rateLimitGuard = await guardMutationRequest(request, "privacy-request-intake", {
    key: session.user.id,
    limit: 5,
    windowMs: 24 * 60 * 60 * 1000
  });
  if (rateLimitGuard) return rateLimitGuard;

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > privacyRequestBodyLimit) {
    return NextResponse.json({ error: "Privacy request is too large." }, { headers: noStoreHeaders, status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid privacy request." }, { headers: noStoreHeaders, status: 400 });
  }

  const parsed = privacyRequestPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose a valid request type and keep optional detail to 1,000 characters or fewer." },
      { headers: noStoreHeaders, status: 400 }
    );
  }

  const result = await createPrivacyRequestForUser(session.user.id, parsed.data);
  return NextResponse.json(result, { headers: noStoreHeaders, status: result.created ? 201 : 200 });
}

export const GET = withAccountPersistenceRoute(getPrivacyRequests);
export const POST = withAccountPersistenceRoute(createPrivacyRequest);
