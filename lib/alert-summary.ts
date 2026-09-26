import { getAccountLedger, normalizeAccountLedger } from "@/lib/account-ledger";
import { getAccountProfile, getDefaultAccountProfile } from "@/lib/account-profile";
import {
  canUseDatabasePersistence,
  getAccountPersistenceUserId,
  readLedgerFromDatabase,
  readProfileFromDatabase
} from "@/lib/account-database";
import { getCurrentVoteReminder } from "@/lib/alert-rules";
import { getCurrentSession } from "@/lib/auth";
import {
  getCurrentVoteCandidatesForFollowedBills,
  getDashboardDataWithLiveData,
  getRecentUpdates,
  getRecentUpdatesWithLiveData
} from "@/lib/data";

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
  const session = await getCurrentSession();
  if (!session?.user) return { activeAlerts: [], activeAlertCount: 0, activeAlertIds: [] };

  const accountUserId = await getAccountPersistenceUserId(session.user).catch(() => session.user.id);
  const [dashboardData, recentUpdates, databaseProfile, databaseLedger] = await Promise.all([
    getDashboardDataWithLiveData(),
    getRecentUpdatesWithLiveData(),
    readProfileFromDatabase(accountUserId).catch(() => null),
    readLedgerFromDatabase(accountUserId).catch(() => null)
  ]);
  const usesDatabase = canUseDatabasePersistence();
  const profile = databaseProfile ?? (usesDatabase ? getDefaultAccountProfile() : getAccountProfile(accountUserId));
  const ledger = databaseLedger ?? (usesDatabase ? normalizeAccountLedger() : getAccountLedger(accountUserId));
  const followedBillIds = ledger.follows.filter((follow) => follow.type === "bill").map((follow) => follow.id);
  const voteCandidates = await getCurrentVoteCandidatesForFollowedBills({ followedBillIds });
  const voteReminder = getCurrentVoteReminder({
    districtCode: profile.districtCode,
    enabled: profile.notificationPreferences.voteReminders,
    followedBillIds: voteCandidates.map((candidate) => candidate.bill.id),
    members: dashboardData.favoriteTargets.members,
    voteFeed: voteCandidates
  });
  const activeAlerts = [
    ...(voteReminder ? [{ id: voteReminder.id, preference: "voteReminders" as const }] : []),
    ...recentUpdates
      .filter(isActionNeededAlertEvent)
      .filter((event) => profile.notificationPreferences[getAlertNotificationPreference(event)])
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
