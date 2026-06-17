import { NextRequest, NextResponse } from "next/server";
import { getAccountPersistenceUserId } from "@/lib/account-database";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";
import { acceptTeamWorkspaceInvite, acceptTeamWorkspaceInviteById, TeamWorkspaceError } from "@/lib/team-workspace";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    inviteId?: string;
    token?: string;
  };
  const guard = guardMutationRequest(request, "team-invite-accept", {
    key: body.inviteId ?? body.token,
    limit: 10,
    windowMs: 15 * 60 * 1000
  });
  if (guard) return guard;

  const session = await getCurrentSession();
  if (!session) return NextResponse.json(requireAuthMessage(), { status: 401 });

  try {
    const accountUserId = await getAccountPersistenceUserId(session.user).catch(() => session.user.id);
    const result = body.inviteId?.trim()
      ? await acceptTeamWorkspaceInviteById({
          email: session.user.email,
          inviteId: body.inviteId,
          name: session.user.name,
          userId: accountUserId
        })
      : await acceptTeamWorkspaceInvite({
          email: session.user.email,
          name: session.user.name,
          token: body.token ?? "",
          userId: accountUserId
        });

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
