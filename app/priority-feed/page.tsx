import { PolicyEdgeFeed } from "@/components/policy-edge-feed";
import {
  buildDocketSponsorNames,
  getConfiguredCongressDocketCongress,
  mergeRecentAndSavedDocketBills,
  readCongressDocketFreshness,
  readCurrentSavedDocketBills,
  reconcileCongressDocketFreshnessWithVisibleBills
} from "@/lib/congress-docket";
import { getCurrentEffectiveAccountSubscription } from "@/lib/effective-account-subscription";
import { getDashboardDataWithLiveData } from "@/lib/data";
import { isPlanFeatureEnabled } from "@/lib/subscription-plans";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PriorityFeedPage() {
  const congress = getConfiguredCongressDocketCongress();
  const sourceFreshness = await readCongressDocketFreshness(new Date(), congress);
  const [data, subscription, savedBills] = await Promise.all([
    getDashboardDataWithLiveData({ bypassCache: true, congress }),
    getCurrentEffectiveAccountSubscription(),
    readCurrentSavedDocketBills()
  ]);
  const hasAccess = isPlanFeatureEnabled(subscription?.plan ?? "free", "aiPolicyLens");
  const freshness = reconcileCongressDocketFreshnessWithVisibleBills(
    sourceFreshness,
    data.favoriteTargets.bills.length
  );
  const bills = hasAccess ? mergeRecentAndSavedDocketBills(data.favoriteTargets.bills, savedBills) : [];
  const sponsorNamesByBillId = buildDocketSponsorNames(bills, data.favoriteTargets.members);

  return <PolicyEdgeFeed bills={bills} freshness={freshness} locked={!hasAccess} mode="priority" personalPriorityOnly sponsorNamesByBillId={sponsorNamesByBillId} />;
}
