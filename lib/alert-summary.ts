import { systemVoteReminderAlertId } from "@/lib/alert-rules";
import { getDashboardDataWithLiveData, getRecentUpdates } from "@/lib/data";

type RecentUpdate = ReturnType<typeof getRecentUpdates>[number];
type AlertPreference = "districtAlerts" | "voteReminders";

export type ActiveAlertSummaryItem = {
  id: string;
  preference: AlertPreference;
};

export type ActiveAlertSummary = {
  activeAlerts: ActiveAlertSummaryItem[];
  activeAlertCount: number;
  activeAlertIds: string[];
};

export function isActionNeededAlertEvent(event: RecentUpdate) {
  const text = `${event.title} ${event.body}`.toLowerCase();
  if (text.includes("action pending") || text.includes("deadline")) return true;
  if (event.targetType === "bill" && (text.includes("vote") || text.includes("hearing") || text.includes("committee"))) return true;
  return false;
}

export function getAlertNotificationPreference(event: RecentUpdate): AlertPreference {
  const text = `${event.title} ${event.body}`.toLowerCase();
  if (text.includes("vote") || text.includes("committee") || text.includes("hearing")) return "voteReminders";
  return "districtAlerts";
}

export async function getActiveAlertSummary(): Promise<ActiveAlertSummary> {
  const dashboardData = await getDashboardDataWithLiveData();
  const voteAlertBill = dashboardData.recentVote?.bill ?? dashboardData.trackedBill;
  const activeAlerts = [
    ...(voteAlertBill ? [{ id: systemVoteReminderAlertId, preference: "voteReminders" as const }] : []),
    ...getRecentUpdates()
      .filter(isActionNeededAlertEvent)
      .map((event) => ({
        id: event.id,
        preference: getAlertNotificationPreference(event)
      }))
  ];
  const activeAlertIds = activeAlerts.map((alert) => alert.id);

  return {
    activeAlerts,
    activeAlertCount: activeAlertIds.length,
    activeAlertIds
  };
}
