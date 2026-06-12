import { DashboardClient } from "@/components/dashboard-client";
import { getAccountLedger } from "@/lib/account-ledger";
import { ensureAccountUser, readLedgerFromDatabase } from "@/lib/account-database";
import { getCurrentSession } from "@/lib/auth";
import { getDashboardDataWithLiveData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [data, session] = await Promise.all([getDashboardDataWithLiveData(), getCurrentSession()]);
  const initialLedger = session?.user
    ? await ensureAccountUser(session.user)
        .then(() => readLedgerFromDatabase(session.user.id))
        .catch(() => null)
    : null;
  const accountLedger = session?.user ? (initialLedger ?? getAccountLedger(session.user.id)) : null;

  return <DashboardClient data={data} initialLedger={accountLedger} />;
}
