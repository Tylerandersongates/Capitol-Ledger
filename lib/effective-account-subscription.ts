import { getAccountPersistenceUserId } from "@/lib/account-database";
import { getCurrentSession } from "@/lib/auth";
import { getSubscriptionForAccountUser } from "@/lib/server-account-subscription";
import { readTeamWorkspaceForMember } from "@/lib/team-workspace";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

type AccountSubscriptionUser = {
  email: string;
  id: string;
  name?: string;
};

function hasActiveTeamBilling(subscription: AccountSubscriptionSnapshot) {
  return subscription.plan === "team" && (subscription.status === "active" || subscription.status === "trialing");
}

export async function getEffectiveSubscriptionForAccountUser(
  user: AccountSubscriptionUser,
  personalSubscription?: AccountSubscriptionSnapshot | null
): Promise<AccountSubscriptionSnapshot> {
  const subscription = personalSubscription ?? (await getSubscriptionForAccountUser(user));
  if (hasActiveTeamBilling(subscription)) return subscription;

  const accountUserId = await getAccountPersistenceUserId(user).catch(() => user.id);
  const memberWorkspace = await readTeamWorkspaceForMember({
    email: user.email,
    userId: accountUserId
  }).catch(() => null);

  if (!memberWorkspace) return subscription;

  return {
    cycle: subscription.cycle,
    plan: "team",
    provider: "demo",
    providerCustomerId: subscription.providerCustomerId,
    providerEntitlementId: "capitol-ledger-team-member",
    providerSubscriptionId: `team-member-${memberWorkspace.workspace.id}`,
    seatCount: memberWorkspace.workspace.seatCount,
    status: "active",
    updatedAt: memberWorkspace.membership.updatedAt
  };
}

export async function getCurrentEffectiveAccountSubscription(): Promise<AccountSubscriptionSnapshot | null> {
  const session = await getCurrentSession();
  if (!session?.user) return null;

  return getEffectiveSubscriptionForAccountUser(session.user);
}
