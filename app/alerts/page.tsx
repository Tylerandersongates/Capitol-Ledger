import {
  AlertsInboxClient,
  type AlertsInboxFilter,
  type AlertsInboxIcon,
  type AlertsInboxItem
} from "@/components/alerts-inbox-client";
import { HistoryBackButton } from "@/components/history-back-button";
import { MobileShell } from "@/components/mobile-shell";
import { mobileIconButtonClass } from "@/components/mobile-ui";
import { getAccountPersistenceUserId } from "@/lib/account-database";
import { getAlertGroupFromDate, systemVoteReminderAlertId } from "@/lib/alert-rules";
import { getAlertNotificationPreference, isActionNeededAlertEvent } from "@/lib/alert-summary";
import { getCurrentSession } from "@/lib/auth";
import { getBill, getDashboardDataWithLiveData, getMember, getRecentUpdates } from "@/lib/data";
import { getCurrentEffectiveAccountSubscription } from "@/lib/effective-account-subscription";
import { readPendingTeamWorkspaceInvitesForEmail, type TeamWorkspacePendingInvite } from "@/lib/team-workspace";
import { formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

function normalizeNotificationFilter(filter?: string): AlertsInboxFilter {
  return filter === "action" || filter === "unread" ? filter : "all";
}

function eventCategoryLabel(event: ReturnType<typeof getRecentUpdates>[number]) {
  const text = `${event.title} ${event.body}`.toLowerCase();

  if (text.includes("committee")) return "Committee";
  if (text.includes("vote")) return "Vote";
  if (event.targetType === "member") return "Official";
  if (event.targetType === "bill") return "Bill";

  return "Update";
}

function teamRoleLabel(role: TeamWorkspacePendingInvite["invite"]["role"]) {
  if (role === "admin") return "Admin";
  if (role === "viewer") return "Viewer";
  return "Analyst";
}

function teamInviteAlert(invite: TeamWorkspacePendingInvite): AlertsInboxItem {
  const group = getAlertGroupFromDate(invite.invite.createdAt);
  const ownerName = invite.owner.name || invite.owner.email || "A workspace admin";
  const roleLabel = teamRoleLabel(invite.invite.role);

  return {
    id: `team-invite:${invite.invite.id}`,
    title: "Team invite",
    body: `${ownerName} invited you to join ${invite.workspace.name} as ${roleLabel}.`,
    categoryLabel: "Team invite",
    preference: "account",
    actionNeeded: true,
    action: "Accept invite",
    actionKind: "teamInviteAccept",
    teamInviteId: invite.invite.id,
    href: "/team",
    group,
    time: group === "today" ? "Today" : group === "yesterday" ? "Yesterday" : formatDate(invite.invite.createdAt),
    defaultUnread: true,
    icon: "user"
  };
}

export default async function AlertsPage(props: { searchParams?: Promise<{ filter?: string }> }) {
  const searchParams = await props.searchParams;
  const activeFilter = normalizeNotificationFilter(searchParams?.filter);
  const [dashboardData, initialSubscription, session] = await Promise.all([getDashboardDataWithLiveData(), getCurrentEffectiveAccountSubscription(), getCurrentSession()]);
  const pendingTeamInvites = session?.user
    ? await readPendingTeamWorkspaceInvitesForEmail({
        email: session.user.email,
        userId: await getAccountPersistenceUserId(session.user).catch(() => session.user.id)
      }).catch(() => [])
    : [];
  const voteAlertBill = dashboardData.recentVote?.bill ?? dashboardData.trackedBill;
  const notifications: AlertsInboxItem[] = getRecentUpdates().map((event) => {
    const bill = event.targetType === "bill" ? getBill(event.targetId) : undefined;
    const member = event.targetType === "member" ? getMember(event.targetId) : undefined;
    const href = bill ? `/bills/${bill.id}` : member ? `/members/${member.bioguideId}` : "/search";
    const targetLabel = bill?.displayNumber ?? member?.fullName ?? "Update";
    const icon: AlertsInboxIcon = bill ? "file" : member ? "user" : "scale";
    const group = getAlertGroupFromDate(event.occurredAt);

    return {
      id: event.id,
      title: event.title,
      body: `${targetLabel} - ${event.body}`,
      categoryLabel: eventCategoryLabel(event),
      preference: getAlertNotificationPreference(event),
      actionNeeded: isActionNeededAlertEvent(event),
      action: bill ? "View bill" : member ? "View official" : "View update",
      href,
      group,
      time: group === "today" ? "Today" : group === "yesterday" ? "Yesterday" : formatDate(event.occurredAt),
      defaultUnread: group !== "earlier",
      icon
    };
  });
  const teamInviteAlerts = pendingTeamInvites.map(teamInviteAlert);
  const systemAlerts: AlertsInboxItem[] = voteAlertBill
    ? [
        {
          id: systemVoteReminderAlertId,
          title: "Vote reminder",
          body: `${voteAlertBill.displayNumber} - ${voteAlertBill.shortTitle} needs your attention.`,
          categoryLabel: "Vote reminder",
          preference: "voteReminders",
          actionNeeded: true,
          action: "View details",
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

      <AlertsInboxClient activeFilter={activeFilter} initialSubscription={initialSubscription} notifications={[...teamInviteAlerts, ...systemAlerts, ...notifications]} />
    </MobileShell>
  );
}
