import { DashboardClient } from "@/components/dashboard-client";
import { getAccountLedger } from "@/lib/account-ledger";
import { getAccountPersistenceUserId, readLedgerFromDatabase } from "@/lib/account-database";
import { getCurrentSession } from "@/lib/auth";
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
  const [data, { accountLedger, effectiveSubscription, initialTeamAccess }] = await Promise.all([
    getDashboardDataWithLiveData(),
    getDashboardAccountData()
  ]);

  return <DashboardClient data={data} initialLedger={accountLedger} initialSubscription={effectiveSubscription} initialTeamAccess={initialTeamAccess} />;
}
