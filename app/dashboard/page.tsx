import { DashboardClient } from "@/components/dashboard-client";
import { getAccountLedger } from "@/lib/account-ledger";
import { getAccountPersistenceUserId, readLedgerFromDatabase } from "@/lib/account-database";
import { getCurrentSession } from "@/lib/auth";
import { getDashboardDataWithLiveData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [data, session] = await Promise.all([getDashboardDataWithLiveData(), getCurrentSession()]);
  const accountUserId = session?.user ? await getAccountPersistenceUserId(session.user).catch(() => session.user.id) : null;
  const initialLedger = accountUserId ? await readLedgerFromDatabase(accountUserId).catch(() => null) : null;
  const accountLedger = accountUserId ? (initialLedger ?? getAccountLedger(accountUserId)) : null;

  return <DashboardClient data={data} initialLedger={accountLedger} />;
}
