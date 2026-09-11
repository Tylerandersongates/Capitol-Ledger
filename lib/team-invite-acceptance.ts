import { getAccountPersistenceUserId } from "@/lib/account-database";
import { readAppStoreSubscriptionState } from "@/lib/billing/app-store-state";
import { getSubscriptionForAccountUser } from "@/lib/server-account-subscription";
import { requiresAppleTeamBillingAcknowledgement } from "@/lib/team-invite-billing";
import { acceptTeamWorkspaceInvite, acceptTeamWorkspaceInviteById } from "@/lib/team-workspace";
import type { AccountSubscriptionSnapshot } from "@/types/capitol";

export type TeamInviteAcceptanceBody = {
  appleBillingAcknowledged?: boolean;
  inviteId?: string;
  token?: string;
};

export type TeamInviteAcceptanceUser = {
  email: string;
  id: string;
  name?: string;
};

type AppStoreStateForAcknowledgement = {
  appleStatus?: number;
  productId?: string;
} | null;

export type TeamInviteAcceptanceDependencies = {
  acceptById: typeof acceptTeamWorkspaceInviteById;
  acceptByToken: typeof acceptTeamWorkspaceInvite;
  getAccountUserId: typeof getAccountPersistenceUserId;
  getSubscription: (user: TeamInviteAcceptanceUser) => Promise<AccountSubscriptionSnapshot>;
  readAppStoreState: (userId: string) => Promise<AppStoreStateForAcknowledgement>;
};

const defaultDependencies: TeamInviteAcceptanceDependencies = {
  acceptById: acceptTeamWorkspaceInviteById,
  acceptByToken: acceptTeamWorkspaceInvite,
  getAccountUserId: getAccountPersistenceUserId,
  getSubscription: getSubscriptionForAccountUser,
  readAppStoreState: readAppStoreSubscriptionState
};

export async function acceptTeamInviteWithBillingGate(
  body: TeamInviteAcceptanceBody,
  user: TeamInviteAcceptanceUser,
  dependencies: TeamInviteAcceptanceDependencies = defaultDependencies
) {
  const accountUserId = await dependencies.getAccountUserId(user);
  const subscription = await dependencies.getSubscription(user);
  const appStoreState = subscription.provider === "app-store"
    ? await dependencies.readAppStoreState(accountUserId)
    : null;

  if (
    requiresAppleTeamBillingAcknowledgement(subscription, appStoreState) &&
    body.appleBillingAcknowledged !== true
  ) {
    return { kind: "acknowledgement-required" as const };
  }

  const result = body.inviteId?.trim()
    ? await dependencies.acceptById({
        email: user.email,
        inviteId: body.inviteId,
        name: user.name,
        userId: accountUserId
      })
    : await dependencies.acceptByToken({
        email: user.email,
        name: user.name,
        token: body.token ?? "",
        userId: accountUserId
      });

  return { kind: "accepted" as const, result };
}
