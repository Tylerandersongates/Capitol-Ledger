import { NextRequest, NextResponse } from "next/server";
import { getAccountPersistenceUserId, readSubscriptionFromDatabase } from "@/lib/account-database";
import { getAccountSubscription } from "@/lib/account-subscription";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";
import { normalizeTeamSeatCount } from "@/lib/subscription-seat-count";
import { releaseTeamWorkspaceSeat, TeamWorkspaceError } from "@/lib/team-workspace";
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
      error: "An active Team subscription is required to manage workspace seats.",
      subscription
    },
    { status: 403 }
  );
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    seatId?: string;
    seatType?: string;
  };
  const guard = guardMutationRequest(request, "team-seats", {
    key: body.seatId,
    limit: 24,
    windowMs: 60 * 1000
  });
  if (guard) return guard;

  const account = await readTeamAccount();

  if (!account) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  if (!hasActiveTeamAccess(account.subscription)) return forbiddenTeamResponse(account.subscription);

  try {
    const result = await releaseTeamWorkspaceSeat({
      email: account.session.user.email,
      name: account.session.user.name,
      seatCount: normalizeTeamSeatCount(account.subscription.seatCount),
      seatId: body.seatId ?? "",
      seatType: body.seatType,
      userId: account.accountUserId
    });

    return NextResponse.json({
      mode: result.mode,
      release: result.release,
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
