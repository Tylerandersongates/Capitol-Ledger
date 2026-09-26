import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";
import { withAccountPersistenceRoute } from "@/lib/account-persistence-safety";
import { acceptTeamInviteWithBillingGate } from "@/lib/team-invite-acceptance";
import { TeamWorkspaceError } from "@/lib/team-workspace";

async function acceptTeamInvite(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    appleBillingAcknowledged?: boolean;
    inviteId?: string;
    token?: string;
  };
  const guard = await guardMutationRequest(request, "team-invite-accept", {
    key: body.inviteId ?? body.token,
    limit: 10,
    windowMs: 15 * 60 * 1000
  });
  if (guard) return guard;

  const session = await getCurrentSession();
  if (!session) return NextResponse.json(requireAuthMessage(), { status: 401 });

  try {
    const outcome = await acceptTeamInviteWithBillingGate(body, session.user);
    if (outcome.kind === "acknowledgement-required") {
      return NextResponse.json(
        {
          code: "APPLE_BILLING_ACKNOWLEDGEMENT_REQUIRED",
          error: "Confirm that joining this Team does not pause or cancel your Apple subscription."
        },
        { status: 409 }
      );
    }
    const result = outcome.result;

    return NextResponse.json({
      membership: result.membership,
      mode: result.mode,
      workspace: result.workspace
    });
  } catch (error) {
    if (error instanceof TeamWorkspaceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }
}

export const POST = withAccountPersistenceRoute(acceptTeamInvite);
