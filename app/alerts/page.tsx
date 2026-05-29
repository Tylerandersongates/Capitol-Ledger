import { AlertsInboxClient, type AlertsInboxFilter, type AlertsInboxIcon, type AlertsInboxItem } from "@/components/alerts-inbox-client";
import { MobileShell } from "@/components/mobile-shell";
import { getBill, getDashboardData, getMember, getRecentUpdates } from "@/lib/data";
import { formatDate } from "@/lib/utils";

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

function getNotificationGroup(index: number) {
  if (index === 0) return "today";
  if (index === 1) return "yesterday";
  return "earlier";
}

export default function AlertsPage({ searchParams }: { searchParams?: { filter?: string } }) {
  const activeFilter = normalizeNotificationFilter(searchParams?.filter);
  const dashboardData = getDashboardData();
  const voteAlertBill = dashboardData.recentVote?.bill ?? dashboardData.trackedBill;
  const notifications: AlertsInboxItem[] = getRecentUpdates().map((event, index) => {
    const bill = event.targetType === "bill" ? getBill(event.targetId) : undefined;
    const member = event.targetType === "member" ? getMember(event.targetId) : undefined;
    const href = bill ? `/bills/${bill.id}` : member ? `/members/${member.bioguideId}` : "/search";
    const targetLabel = bill?.displayNumber ?? member?.fullName ?? "Record";
    const icon: AlertsInboxIcon = bill ? "file" : member ? "user" : "scale";

    return {
      id: event.id,
      title: event.title,
      body: `${targetLabel} - ${event.body}`,
      categoryLabel: eventCategoryLabel(event),
      actionNeeded: index === 0,
      action: bill ? "View Bill" : member ? "View Profile" : "View Record",
      href,
      group: getNotificationGroup(index + 1),
      time: formatDate(event.occurredAt),
      defaultUnread: index < 2,
      icon
    };
  });
  const systemAlerts: AlertsInboxItem[] = voteAlertBill
    ? [
        {
          id: "system-vote-reminder",
          title: "Vote reminder",
          body: `${voteAlertBill.displayNumber} - ${voteAlertBill.shortTitle} has a tracked civic action pending.`,
          categoryLabel: "Vote Reminder",
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
      <header className="mt-12">
        <h1 className="text-[28px] font-medium leading-none text-white">Notifications</h1>
      </header>

      <AlertsInboxClient activeFilter={activeFilter} notifications={[...systemAlerts, ...notifications]} />
    </MobileShell>
  );
}
