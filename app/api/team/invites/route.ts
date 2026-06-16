import { NextRequest, NextResponse } from "next/server";
import { getAccountPersistenceUserId, readSubscriptionFromDatabase } from "@/lib/account-database";
import { getAccountSubscription } from "@/lib/account-subscription";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";
import { normalizeTeamSeatCount } from "@/lib/subscription-seat-count";
import { deliverTeamInviteEmail } from "@/lib/team-invite-email";
import { createTeamWorkspaceInvite, readOrCreateTeamWorkspaceForOwner, readTeamWorkspaceForMember, TeamWorkspaceError } from "@/lib/team-workspace";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

function hasActiveTeamAccess(subscription: AccountSubscriptionSnapshot) {
  return subscription.plan === "team" && (subscription.status === "active" || subscription.status === "trialing");
}

async function readTeamAccount() {
  const session = await getCurrentSession();
  if (!session) return null;

  const accountUserId = await getAccountPersistenceUserId(session.user).catch(() => session.user.id);
  const databaseSubscription = await readSubscriptionFromDatabase(accountUserId).catch(() => null);
  const subscription = databaseSubscription ?? getAccountSubscription(accountUserId);

  return {
    accountUserId,
    mode: databaseSubscription ? "database" : "account",
    session,
    subscription
  };
}

async function readTeamManagerAccount() {
  const account = await readTeamAccount();
  if (!account) return null;

  if (hasActiveTeamAccess(account.subscription)) {
    const seatCount = normalizeTeamSeatCount(account.subscription.seatCount);
    const result = await readOrCreateTeamWorkspaceForOwner({
      email: account.session.user.email,
      name: account.session.user.name,
      seatCount,
      userId: account.accountUserId
    });

    return {
      ...account,
      managerRole: "owner" as const,
      seatCount,
      workspace: result.workspace,
      workspaceMode: result.mode
    };
  }

  const memberResult = await readTeamWorkspaceForMember({
    email: account.session.user.email,
    userId: account.accountUserId
  }).catch(() => null);

  if (memberResult?.membership.role !== "admin") {
    return {
      ...account,
      managerRole: null,
      seatCount: 0,
      workspace: null,
      workspaceMode: null
    };
  }

  return {
    ...account,
    managerRole: "admin" as const,
    seatCount: memberResult.workspace.seatCount,
    workspace: memberResult.workspace,
    workspaceMode: memberResult.mode
  };
}

function forbiddenTeamResponse(subscription: AccountSubscriptionSnapshot) {
  return NextResponse.json(
    {
      error: "Team owner or admin access is required for workspace invites.",
      subscription
    },
    { status: 403 }
  );
}

export async function GET() {
  const account = await readTeamManagerAccount();

  if (!account) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  if (!account.managerRole || !account.workspace) return forbiddenTeamResponse(account.subscription);

  return NextResponse.json({
    managerRole: account.managerRole,
    mode: account.workspaceMode,
    subscriptionMode: account.mode,
    workspace: account.workspace
  });
}

export async function POST(request: NextRequest) {
  const guard = guardMutationRequest(request, "team-invites", {
    key: "workspace",
    limit: 18,
    windowMs: 60 * 1000
  });
  if (guard) return guard;

  const account = await readTeamManagerAccount();

  if (!account) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  if (!account.managerRole || !account.workspace) return forbiddenTeamResponse(account.subscription);

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    role?: string;
  };

  try {
    const result = await createTeamWorkspaceInvite({
      email: account.session.user.email,
      inviteEmail: body.email ?? "",
      name: account.session.user.name,
      role: body.role,
      seatCount: account.seatCount,
      userId: account.workspace.ownerUserId,
      workspaceId: account.workspace.id
    });
    const inviteDelivery = await deliverTeamInviteEmail({
      invitedBy: {
        email: account.session.user.email,
        name: account.session.user.name
      },
      role: result.invite.role,
      to: result.invite.email,
      token: result.invite.token,
      workspaceName: result.workspace.name
    }).catch((error: unknown) => ({
      delivered: false as const,
      error: error instanceof Error ? error.message : "Team invite delivery failed.",
      mode: "disabled" as const
    }));

    return NextResponse.json({
      inviteDelivery:
        "actionUrl" in inviteDelivery
          ? {
              inviteLink: inviteDelivery.actionUrl,
              mode: inviteDelivery.mode,
              sent: inviteDelivery.delivered
            }
          : {
              error: "error" in inviteDelivery ? inviteDelivery.error : undefined,
              mode: inviteDelivery.mode,
              sent: inviteDelivery.delivered
            },
      mode: result.mode,
      managerRole: account.managerRole,
      subscriptionMode: account.mode,
      workspace: result.workspace
    });
  } catch (error) {
    if (error instanceof TeamWorkspaceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }
}
