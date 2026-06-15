import { DashboardClient } from "@/components/dashboard-client";
import { getAccountLedger } from "@/lib/account-ledger";
import { getAccountPersistenceUserId, readLedgerFromDatabase } from "@/lib/account-database";
import { getCurrentSession } from "@/lib/auth";
import { getDashboardDataWithLiveData } from "@/lib/data";
import { getSubscriptionForAccountUser } from "@/lib/server-account-subscription";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [data, session] = await Promise.all([getDashboardDataWithLiveData(), getCurrentSession()]);
  const accountUserId = session?.user ? await getAccountPersistenceUserId(session.user).catch(() => session.user.id) : null;
  const [initialLedger, initialSubscription] = accountUserId
    ? await Promise.all([
        readLedgerFromDatabase(accountUserId).catch(() => null),
        session?.user ? getSubscriptionForAccountUser(session.user).catch(() => null) : null
      ])
    : [null, null];
  const accountLedger = accountUserId ? (initialLedger ?? getAccountLedger(accountUserId)) : null;

  return <DashboardClient data={data} initialLedger={accountLedger} initialSubscription={initialSubscription} />;
}
