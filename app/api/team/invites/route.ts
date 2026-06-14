import { NextRequest, NextResponse } from "next/server";
import { getAccountPersistenceUserId, readSubscriptionFromDatabase } from "@/lib/account-database";
import { getAccountSubscription } from "@/lib/account-subscription";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";
import { normalizeTeamSeatCount } from "@/lib/subscription-seat-count";
import { createTeamWorkspaceInvite, readOrCreateTeamWorkspaceForOwner, TeamWorkspaceError } from "@/lib/team-workspace";
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

function forbiddenTeamResponse(subscription: AccountSubscriptionSnapshot) {
  return NextResponse.json(
    {
      error: "An active Team subscription is required for workspace invites.",
      subscription
    },
    { status: 403 }
  );
}

export async function GET() {
  const account = await readTeamAccount();

  if (!account) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  if (!hasActiveTeamAccess(account.subscription)) return forbiddenTeamResponse(account.subscription);

  const seatCount = normalizeTeamSeatCount(account.subscription.seatCount);
  const result = await readOrCreateTeamWorkspaceForOwner({
    email: account.session.user.email,
    name: account.session.user.name,
    seatCount,
    userId: account.accountUserId
  });

  return NextResponse.json({
    mode: result.mode,
    subscriptionMode: account.mode,
    workspace: result.workspace
  });
}

export async function POST(request: NextRequest) {
  const guard = guardMutationRequest(request, "team-invites", {
    key: "workspace",
    limit: 18,
    windowMs: 60 * 1000
  });
  if (guard) return guard;

  const account = await readTeamAccount();

  if (!account) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  if (!hasActiveTeamAccess(account.subscription)) return forbiddenTeamResponse(account.subscription);

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    role?: string;
  };
  const seatCount = normalizeTeamSeatCount(account.subscription.seatCount);

  try {
    const result = await createTeamWorkspaceInvite({
      email: account.session.user.email,
      inviteEmail: body.email ?? "",
      name: account.session.user.name,
      role: body.role,
      seatCount,
      userId: account.accountUserId
    });

    return NextResponse.json({
      mode: result.mode,
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
