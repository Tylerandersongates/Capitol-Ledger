import { systemVoteReminderAlertId } from "@/lib/alert-rules";
import { getDashboardDataWithLiveData, getRecentUpdates } from "@/lib/data";

type RecentUpdate = ReturnType<typeof getRecentUpdates>[number];

export type ActiveAlertSummary = {
  activeAlertCount: number;
  activeAlertIds: string[];
};

export function isActionNeededAlertEvent(event: RecentUpdate) {
  const text = `${event.title} ${event.body}`.toLowerCase();
  if (text.includes("action pending") || text.includes("deadline")) return true;
  if (event.targetType === "bill" && (text.includes("vote") || text.includes("hearing") || text.includes("committee"))) return true;
  return false;
}

export async function getActiveAlertSummary(): Promise<ActiveAlertSummary> {
  const dashboardData = await getDashboardDataWithLiveData();
  const voteAlertBill = dashboardData.recentVote?.bill ?? dashboardData.trackedBill;
  const activeAlertIds = [
    voteAlertBill ? systemVoteReminderAlertId : "",
    ...getRecentUpdates()
      .filter(isActionNeededAlertEvent)
      .map((event) => event.id)
  ].filter(Boolean);

  return {
    activeAlertCount: activeAlertIds.length,
    activeAlertIds
  };
}
