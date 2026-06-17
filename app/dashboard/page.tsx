import { DashboardClient } from "@/components/dashboard-client";
import { getAccountLedger } from "@/lib/account-ledger";
import { getAccountPersistenceUserId, readLedgerFromDatabase } from "@/lib/account-database";
import { getCurrentSession } from "@/lib/auth";
import { getDashboardDataWithLiveData } from "@/lib/data";
import { getEffectiveSubscriptionForAccountUser } from "@/lib/effective-account-subscription";
import { getSubscriptionForAccountUser } from "@/lib/server-account-subscription";
import { readTeamAccessSummaryForUser } from "@/lib/team-access";

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
  const [initialTeamAccess, effectiveSubscription] = session?.user
    ? await Promise.all([
        readTeamAccessSummaryForUser(session.user, initialSubscription).catch(() => null),
        getEffectiveSubscriptionForAccountUser(session.user, initialSubscription).catch(() => initialSubscription)
      ])
    : [null, initialSubscription];
  const accountLedger = accountUserId ? (initialLedger ?? getAccountLedger(accountUserId)) : null;

  return <DashboardClient data={data} initialLedger={accountLedger} initialSubscription={effectiveSubscription} initialTeamAccess={initialTeamAccess} />;
}
