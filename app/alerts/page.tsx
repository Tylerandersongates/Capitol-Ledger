import {
  AlertsInboxClient,
  type AlertsInboxFilter,
  type AlertsInboxIcon,
  type AlertsInboxItem,
  type AlertsInboxPreference
} from "@/components/alerts-inbox-client";
import { HistoryBackButton } from "@/components/history-back-button";
import { MobileShell } from "@/components/mobile-shell";
import { mobileIconButtonClass } from "@/components/mobile-ui";
import { getAlertGroupFromDate, systemVoteReminderAlertId } from "@/lib/alert-rules";
import { isActionNeededAlertEvent } from "@/lib/alert-summary";
import { getBill, getDashboardDataWithLiveData, getMember, getRecentUpdates } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

function normalizeNotificationFilter(filter?: string): AlertsInboxFilter {
  return filter === "action" || filter === "unread" ? filter : "all";
}

function eventCategoryLabel(event: ReturnType<typeof getRecentUpdates>[number]) {
  const text = `${event.title} ${event.body}`.toLowerCase();

  if (text.includes("committee")) return "Committee";
  if (text.includes("vote")) return "Vote Update";
  if (event.targetType === "member") return "Representative";
  if (event.targetType === "bill") return "Bill Update";

  return "Civic Update";
}

function getNotificationPreference(event: ReturnType<typeof getRecentUpdates>[number]): AlertsInboxPreference {
  const text = `${event.title} ${event.body}`.toLowerCase();
  if (text.includes("vote") || text.includes("committee") || text.includes("hearing")) return "voteReminders";
  return "districtAlerts";
}

export default async function AlertsPage({ searchParams }: { searchParams?: { filter?: string } }) {
  const activeFilter = normalizeNotificationFilter(searchParams?.filter);
  const dashboardData = await getDashboardDataWithLiveData();
  const voteAlertBill = dashboardData.recentVote?.bill ?? dashboardData.trackedBill;
  const notifications: AlertsInboxItem[] = getRecentUpdates().map((event) => {
    const bill = event.targetType === "bill" ? getBill(event.targetId) : undefined;
    const member = event.targetType === "member" ? getMember(event.targetId) : undefined;
    const href = bill ? `/bills/${bill.id}` : member ? `/members/${member.bioguideId}` : "/search";
    const targetLabel = bill?.displayNumber ?? member?.fullName ?? "Record";
    const icon: AlertsInboxIcon = bill ? "file" : member ? "user" : "scale";
    const group = getAlertGroupFromDate(event.occurredAt);

    return {
      id: event.id,
      title: event.title,
      body: `${targetLabel} - ${event.body}`,
      categoryLabel: eventCategoryLabel(event),
      preference: getNotificationPreference(event),
      actionNeeded: isActionNeededAlertEvent(event),
      action: bill ? "View Bill" : member ? "View Profile" : "View Record",
      href,
      group,
      time: group === "today" ? "Today" : group === "yesterday" ? "Yesterday" : formatDate(event.occurredAt),
      defaultUnread: group !== "earlier",
      icon
    };
  });
  const systemAlerts: AlertsInboxItem[] = voteAlertBill
    ? [
        {
          id: systemVoteReminderAlertId,
          title: "Vote reminder",
          body: `${voteAlertBill.displayNumber} - ${voteAlertBill.shortTitle} has a tracked civic action pending.`,
          categoryLabel: "Vote Reminder",
          preference: "voteReminders",
          actionNeeded: true,
          action: "View Alert",
          href: "/alerts/detail",
          group: "today",
          time: "Today",
          icon: "bell",
          defaultUnread: true
        }
      ]
    : [];

  return (
    <MobileShell
      minHeight="min-h-[1060px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
      <header className="mt-12 flex items-center gap-4">
        <HistoryBackButton className={mobileIconButtonClass}>
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </HistoryBackButton>
        <h1 className="text-[28px] font-medium leading-none text-white">Alerts</h1>
      </header>

      <AlertsInboxClient activeFilter={activeFilter} notifications={[...systemAlerts, ...notifications]} />
    </MobileShell>
  );
}
