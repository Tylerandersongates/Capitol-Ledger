import { DashboardClient } from "@/components/dashboard-client";
import { getDashboardDataWithLiveData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardDataWithLiveData();

  return <DashboardClient data={data} />;
}
