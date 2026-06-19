import { PolicyEdgeFeed } from "@/components/policy-edge-feed";
import { getCurrentEffectiveAccountSubscription } from "@/lib/effective-account-subscription";
import { searchRecordsWithLiveData } from "@/lib/data";
import { isPlanFeatureEnabled } from "@/lib/subscription-plans";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RiskWatchPage() {
  const [{ results }, subscription] = await Promise.all([
    searchRecordsWithLiveData({ status: "in-progress", type: "bills" }),
    getCurrentEffectiveAccountSubscription()
  ]);
  const hasAccess = isPlanFeatureEnabled(subscription?.plan ?? "free", "aiPolicyLens");

  return <PolicyEdgeFeed bills={hasAccess ? results.bills : []} generatedAt={new Date().toISOString()} locked={!hasAccess} mode="risk" />;
}
