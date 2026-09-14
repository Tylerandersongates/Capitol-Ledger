import type { AccountSubscriptionSnapshot } from "@/types/capitol";

type AppStoreTeamSeatReleaseFinalization = {
  accountSubscription: AccountSubscriptionSnapshot | null;
  finalized: boolean;
};

export type AppStoreTeamSeatReleaseTerminalResult = {
  checkoutRequired: boolean;
  restored: boolean;
  subscription: AccountSubscriptionSnapshot;
};

export function completedAppStoreTeamSeatReleaseResult(
  finalization: AppStoreTeamSeatReleaseFinalization,
  canonicalSubscription: AccountSubscriptionSnapshot,
  restoresPaidAccess: boolean
): AppStoreTeamSeatReleaseTerminalResult | null {
  if (!finalization.finalized) return null;

  return {
    checkoutRequired: !restoresPaidAccess,
    restored: restoresPaidAccess,
    subscription: finalization.accountSubscription ?? canonicalSubscription
  };
}
