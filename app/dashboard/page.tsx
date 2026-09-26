import { DashboardClient } from "@/components/dashboard-client";
import { getAccountLedger } from "@/lib/account-ledger";
import { getAccountPersistenceUserId, readLedgerFromDatabase } from "@/lib/account-database";
import { getCurrentSession } from "@/lib/auth";
import {
  getConfiguredCongressDocketCongress,
  readCongressDocketFreshness,
  readStoredDocketBillsByIds,
  withCongressDocketContext
} from "@/lib/congress-docket";
import { getDashboardDataWithLiveData } from "@/lib/data";
import { getEffectiveSubscriptionForAccountUser } from "@/lib/effective-account-subscription";
import { getSubscriptionForAccountUser } from "@/lib/server-account-subscription";
import { readTeamAccessSummaryForUser } from "@/lib/team-access";

export const dynamic = "force-dynamic";

async function getDashboardAccountData() {
  const session = await getCurrentSession();
  if (!session?.user) return { accountLedger: null, effectiveSubscription: null, initialTeamAccess: null };

  const accountUserId = await getAccountPersistenceUserId(session.user).catch(() => session.user.id);
  const [initialLedger, initialSubscription] = await Promise.all([
    readLedgerFromDatabase(accountUserId).catch(() => null),
    getSubscriptionForAccountUser(session.user).catch(() => null)
  ]);
  const [initialTeamAccess, effectiveSubscription] = await Promise.all([
    readTeamAccessSummaryForUser(session.user, initialSubscription).catch(() => null),
    getEffectiveSubscriptionForAccountUser(session.user, initialSubscription).catch(() => initialSubscription)
  ]);

  return {
    accountLedger: initialLedger ?? getAccountLedger(accountUserId),
    effectiveSubscription,
    initialTeamAccess
  };
}

export default async function DashboardPage() {
  const congress = getConfiguredCongressDocketCongress();
  // Read evidence first, then uncached rows. If a sync commits between these
  // reads, the rows can only be newer than the displayed evidence—not older.
  const freshness = await readCongressDocketFreshness(new Date(), congress);
  const [baseData, { accountLedger, effectiveSubscription, initialTeamAccess }] = await Promise.all([
    getDashboardDataWithLiveData({ bypassCache: true, congress }),
    getDashboardAccountData()
  ]);
  const savedBillIds = accountLedger?.follows
    .filter((follow) => follow.type === "bill")
    .map((follow) => follow.id) ?? [];
  const savedBills = await readStoredDocketBillsByIds(savedBillIds);
  const data = withCongressDocketContext(baseData, savedBills, freshness);

  return <DashboardClient data={data} initialLedger={accountLedger} initialSubscription={effectiveSubscription} initialTeamAccess={initialTeamAccess} />;
}
