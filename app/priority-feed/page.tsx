import { PolicyEdgeFeed } from "@/components/policy-edge-feed";
import { getCurrentEffectiveAccountSubscription } from "@/lib/effective-account-subscription";
import { getBillSponsor, searchRecordsWithLiveData } from "@/lib/data";
import { isPlanFeatureEnabled } from "@/lib/subscription-plans";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PriorityFeedPage() {
  const [{ results }, subscription] = await Promise.all([
    searchRecordsWithLiveData({ type: "bills" }),
    getCurrentEffectiveAccountSubscription()
  ]);
  const hasAccess = isPlanFeatureEnabled(subscription?.plan ?? "free", "aiPolicyLens");
  const bills = hasAccess ? results.bills : [];
  const sponsorNamesByBillId = Object.fromEntries(bills.map((bill) => [bill.id, getBillSponsor(bill)?.fullName ?? "Congress"]));

  return <PolicyEdgeFeed bills={bills} generatedAt={new Date().toISOString()} locked={!hasAccess} mode="priority" personalPriorityOnly sponsorNamesByBillId={sponsorNamesByBillId} />;
}
