import { getAccountPersistenceUserId } from "@/lib/account-database";
import { getSubscriptionForAccountUser } from "@/lib/server-account-subscription";
import { normalizeTeamSeatCount } from "@/lib/subscription-seat-count";
import { readOrCreateTeamWorkspaceForOwner, readTeamWorkspaceForMember } from "@/lib/team-workspace";
import type { AccountSubscriptionSnapshot, TeamWorkspaceRole } from "@/types/capitol";

type TeamAccessUser = {
  email: string;
  id: string;
  name?: string;
};

export type TeamAccessSummary = {
  canManageTeam: boolean;
  isBillingOwner: boolean;
  role: TeamWorkspaceRole;
  workspace: {
    id: string;
    name: string;
    occupiedSeats: number;
    openSeats: number;
    ownerUserId: string;
    seatCount: number;
  };
};

function hasActiveTeamSubscription(subscription: AccountSubscriptionSnapshot) {
  return subscription.plan === "team" && (subscription.status === "active" || subscription.status === "trialing");
}

export async function readTeamAccessSummaryForUser(
  user: TeamAccessUser,
  subscription?: AccountSubscriptionSnapshot | null
): Promise<TeamAccessSummary | null> {
  const accountUserId = await getAccountPersistenceUserId(user).catch(() => user.id);
  const activeSubscription = subscription ?? (await getSubscriptionForAccountUser(user));

  if (hasActiveTeamSubscription(activeSubscription)) {
    const seatCount = normalizeTeamSeatCount(activeSubscription.seatCount);
    const ownerName = user.name?.trim() || user.email;
    const workspaceResult = await readOrCreateTeamWorkspaceForOwner({
      email: user.email,
      name: user.name,
      seatCount,
      userId: accountUserId,
      workspaceName: ownerName ? `${ownerName}'s team` : "Team workspace"
    });

    return {
      canManageTeam: true,
      isBillingOwner: true,
      role: "owner",
      workspace: {
        id: workspaceResult.workspace.id,
        name: workspaceResult.workspace.name,
        occupiedSeats: workspaceResult.workspace.occupiedSeats,
        openSeats: workspaceResult.workspace.openSeats,
        ownerUserId: workspaceResult.workspace.ownerUserId,
        seatCount: workspaceResult.workspace.seatCount
      }
    };
  }

  const memberResult = await readTeamWorkspaceForMember({
    email: user.email,
    userId: accountUserId
  });

  if (!memberResult) return null;

  return {
    canManageTeam: memberResult.membership.role === "admin",
    isBillingOwner: false,
    role: memberResult.membership.role,
    workspace: {
      id: memberResult.workspace.id,
      name: memberResult.workspace.name,
      occupiedSeats: memberResult.workspace.occupiedSeats,
      openSeats: memberResult.workspace.openSeats,
      ownerUserId: memberResult.workspace.ownerUserId,
      seatCount: memberResult.workspace.seatCount
    }
  };
}
