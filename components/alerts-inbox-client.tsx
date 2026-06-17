"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Bell, FileText, Home, Scale, Search, Sparkles, Settings, UserRound } from "lucide-react";
import { MobileBottomNav, MobileCard } from "@/components/mobile-ui";
import { PlanFeatureGate, useSubscriptionState } from "@/components/subscription-controls";
import { recordGamificationEvent } from "@/lib/browser-gamification";
import { hasActiveBrowserSession } from "@/lib/browser-auth-state";
import { isPlanFeatureEnabled } from "@/lib/subscription-plans";
import {
  accountProfileChangedEvent,
  defaultNotificationPreferences,
  fetchAccountProfile,
  readLocalNotificationPreferences,
  writeLocalNotificationPreferences
} from "@/lib/browser-account-profile";
import {
  hydrateAccountLedgerFromAccount,
  readAlertsChangedEvent,
  readReadAlertIds,
  sameStringSet,
  uniqueStrings,
  writeLocalAccountLedger,
  writeReadAlertIds
} from "@/lib/browser-account-ledger";
import type { AccountLedgerSnapshot, AccountSubscriptionSnapshot } from "@/types/capitol";

export type AlertsInboxFilter = "all" | "action" | "unread";
export type AlertsInboxGroup = "today" | "yesterday" | "earlier";
export type AlertsInboxIcon = "bell" | "file" | "scale" | "user";
export type AlertsInboxPreference = "districtAlerts" | "voteReminders";
export type AlertsInboxItem = {
  action: string;
  actionNeeded: boolean;
  body: string;
  categoryLabel: string;
  defaultUnread: boolean;
  group: AlertsInboxGroup;
  href: string;
  icon: AlertsInboxIcon;
  id: string;
  preference: AlertsInboxPreference;
  time: string;
  title: string;
};

const accountLedgerEndpoint = "/api/account/ledger";
let readAlertsHydrationPromise: Promise<string[]> | null = null;

const notificationFilters: Array<{ label: string; value: AlertsInboxFilter }> = [
  { label: "All", value: "all" },
  { label: "Action Needed", value: "action" },
  { label: "Unread", value: "unread" }
];

const groupLabels: Record<AlertsInboxGroup, string> = {
  today: "Today",
  yesterday: "Yesterday",
  earlier: "Earlier"
};

const groupPriorityWeight: Record<AlertsInboxGroup, number> = {
  today: 12,
  yesterday: 6,
  earlier: 0
};

function filterHref(filter: AlertsInboxFilter) {
  return filter === "all" ? "/alerts" : `/alerts?filter=${filter}`;
}

function getAlertPriorityScore(notification: AlertsInboxItem) {
  const text = `${notification.title} ${notification.body} ${notification.categoryLabel}`.toLowerCase();
  let score = groupPriorityWeight[notification.group];

  if (notification.actionNeeded) score += 80;
  if (notification.preference === "voteReminders") score += 28;
  if (notification.defaultUnread) score += 12;
  if (text.includes("vote")) score += 24;
  if (text.includes("hearing") || text.includes("committee")) score += 18;
  if (text.includes("deadline") || text.includes("pending")) score += 16;
  if (text.includes("district") || text.includes("tracked")) score += 10;

  return score;
}

function sortAlertsByPriority(notifications: AlertsInboxItem[]) {
  return notifications
    .map((notification, index) => ({
      index,
      notification,
      score: getAlertPriorityScore(notification)
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.index - right.index;
    })
    .map(({ notification }) => notification);
}

function shouldShowInPriorityLane(notification: AlertsInboxItem) {
  return getAlertPriorityScore(notification) >= 70;
}

function readAlertIds() {
  return readReadAlertIds();
}

function writeAlertIds(ids: string[]) {
  writeReadAlertIds(ids);
}

async function syncReadAlertsToAccount(ids = readAlertIds()) {
  if (!(await hasActiveBrowserSession())) return ids;

  const response = await fetch(accountLedgerEndpoint, {
    body: JSON.stringify({ readAlerts: uniqueStrings(ids) }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  }).catch(() => null);

  if (!response?.ok) return ids;

  const data = (await response.json().catch(() => null)) as { ledger?: AccountLedgerSnapshot } | null;
  const accountReadAlerts = uniqueStrings(data?.ledger?.readAlerts ?? ids);
  readAlertsHydrationPromise = Promise.resolve(accountReadAlerts);
  if (data?.ledger) {
    writeLocalAccountLedger(data.ledger);
  } else if (!sameStringSet(ids, accountReadAlerts)) {
    writeAlertIds(accountReadAlerts);
  }
  return accountReadAlerts;
}

async function hydrateReadAlertsFromAccount() {
  if (!(await hasActiveBrowserSession())) return readAlertIds();
  if (readAlertsHydrationPromise) return readAlertsHydrationPromise;

  readAlertsHydrationPromise = hydrateAccountLedgerFromAccount().then((ledger) => uniqueStrings(ledger?.readAlerts ?? readAlertIds()));
  return readAlertsHydrationPromise.finally(() => {
    readAlertsHydrationPromise = null;
  });
}

export function markAlertIdRead(id: string) {
  if (typeof window === "undefined") return;

  const current = readAlertIds();
  if (current.includes(id)) return;
  const next = [...current, id];
  writeAlertIds(next);
  readAlertsHydrationPromise = Promise.resolve(next);
  void syncReadAlertsToAccount(next);
  recordGamificationEvent("read-alert", id);
}

function notificationIcon(icon: AlertsInboxIcon) {
  if (icon === "bell") return <Bell />;
  if (icon === "user") return <UserRound />;
  if (icon === "scale") return <Scale />;
  return <FileText />;
}

export function AlertsInboxClient({
  activeFilter,
  initialSubscription = null,
  notifications
}: {
  activeFilter: AlertsInboxFilter;
  initialSubscription?: AccountSubscriptionSnapshot | null;
  notifications: AlertsInboxItem[];
}) {
  const [subscription] = useSubscriptionState(initialSubscription, { scope: "effective" });
  const [readIds, setReadIds] = useState<string[]>([]);
  const [readStateReady, setReadStateReady] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState(defaultNotificationPreferences);
  const priorityAlertsEnabled = isPlanFeatureEnabled(subscription.plan, "priorityAlerts");

  useEffect(() => {
    function refreshPreferences() {
      setNotificationPreferences(readLocalNotificationPreferences());
    }

    refreshPreferences();
    void fetchAccountProfile().then((profile) => {
      if (!profile) return;
      writeLocalNotificationPreferences(profile.notificationPreferences);
      setNotificationPreferences(readLocalNotificationPreferences());
    });
    window.addEventListener("storage", refreshPreferences);
    window.addEventListener("focus", refreshPreferences);
    window.addEventListener("pageshow", refreshPreferences);
    window.addEventListener(accountProfileChangedEvent, refreshPreferences);

    return () => {
      window.removeEventListener("storage", refreshPreferences);
      window.removeEventListener("focus", refreshPreferences);
      window.removeEventListener("pageshow", refreshPreferences);
      window.removeEventListener(accountProfileChangedEvent, refreshPreferences);
    };
  }, []);

  useEffect(() => {
    let active = true;

    function refreshFromLocalReads() {
      if (!active) return;
      setReadIds(readAlertIds());
      setReadStateReady(true);
    }

    function refetchReadAlerts(showLoading = false) {
      if (showLoading) setReadStateReady(false);
      if (active) setReadIds(readAlertIds());
      void hydrateReadAlertsFromAccount().then((ids) => {
        if (!active) return;
        setReadIds(ids);
        setReadStateReady(true);
      });
    }

    function visibilityHandler() {
      if (document.visibilityState === "visible") refetchReadAlerts();
    }

    const refetchHandler = () => refetchReadAlerts();

    refetchReadAlerts(true);
    window.addEventListener("storage", refreshFromLocalReads);
    window.addEventListener(readAlertsChangedEvent, refreshFromLocalReads);
    window.addEventListener("focus", refetchHandler);
    window.addEventListener("pageshow", refetchHandler);
    document.addEventListener("visibilitychange", visibilityHandler);

    return () => {
      active = false;
      window.removeEventListener("storage", refreshFromLocalReads);
      window.removeEventListener(readAlertsChangedEvent, refreshFromLocalReads);
      window.removeEventListener("focus", refetchHandler);
      window.removeEventListener("pageshow", refetchHandler);
      document.removeEventListener("visibilitychange", visibilityHandler);
    };
  }, []);

  function isUnread(notification: AlertsInboxItem) {
    return notification.defaultUnread && !readIds.includes(notification.id);
  }

  function markRead(id: string) {
    setReadIds((current) => {
      if (current.includes(id)) return current;
      const next = [...current, id];
      markAlertIdRead(id);
      return next;
    });
  }

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        if (!notificationPreferences[notification.preference]) return false;
        if (activeFilter === "action") return notification.actionNeeded;
        if (activeFilter === "unread") return notification.defaultUnread && !readIds.includes(notification.id);
        return true;
      }),
    [activeFilter, notificationPreferences, notifications, readIds]
  );

  const priorityNotifications = useMemo(() => {
    if (!priorityAlertsEnabled || activeFilter !== "all") return [];
    return sortAlertsByPriority(filteredNotifications).filter(shouldShowInPriorityLane);
  }, [activeFilter, filteredNotifications, priorityAlertsEnabled]);

  const standardNotifications = useMemo(() => {
    if (!priorityNotifications.length) return priorityAlertsEnabled ? sortAlertsByPriority(filteredNotifications) : filteredNotifications;
    const priorityIds = new Set(priorityNotifications.map((notification) => notification.id));
    return filteredNotifications.filter((notification) => !priorityIds.has(notification.id));
  }, [filteredNotifications, priorityAlertsEnabled, priorityNotifications]);

  const groupedNotifications = useMemo(
    () =>
      (["today", "yesterday", "earlier"] as AlertsInboxGroup[]).map((group) => ({
        group,
        notifications: standardNotifications.filter((notification) => notification.group === group)
      })),
    [standardNotifications]
  );

  return (
    <>
      <nav className="mt-7 rounded-full border border-white/12 bg-white/[0.07] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_10px_28px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <div className="grid grid-cols-3 gap-1 text-center text-[14px] font-medium">
          {notificationFilters.map((filter) => (
            <Link
              key={filter.value}
              href={filterHref(filter.value)}
              className={`rounded-full px-2 py-2.5 transition ${
                activeFilter === filter.value ? "bg-white/11 text-[#ffb12b] shadow-[inset_0_0_16px_rgba(255,255,255,0.05)]" : "text-white/54"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="mt-7 space-y-4 pb-8">
        {activeFilter === "all" ? (
          <PlanFeatureGate feature="priorityAlerts" initialSubscription={initialSubscription}>
            <MobileCard variant="dashboard" className="px-5 py-5">
              <div className="grid grid-cols-[34px_minmax(0,1fr)_auto] gap-3">
                <div className="pt-1 text-[#ffb12b]">
                  <Bell className="h-6 w-6" strokeWidth={1.9} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="inline-flex rounded-full border border-[#43ed74]/30 bg-[#43ed74]/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[#43ed74]">
                    Priority alert lane
                  </div>
                  <h2 className="mt-3 text-[21px] font-medium leading-tight text-white">Pro reminders surface first</h2>
                  <p className="mt-3 text-[16px] leading-snug text-white/58">
                    {priorityNotifications.length
                      ? `${priorityNotifications.length} urgent ${priorityNotifications.length === 1 ? "alert is" : "alerts are"} ranked above standard updates.`
                      : "Vote reminders, hearings, and district-specific movement are promoted above standard civic updates."}
                  </p>
                </div>
                <div className="self-start whitespace-nowrap rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(26,73,127,0.28)_0%,rgba(6,25,55,0.66)_100%)] px-3 py-2 text-[14px] font-medium leading-none text-white/66 shadow-[inset_0_1px_0_rgba(255,255,255,0.11)]">
                  Pro
                </div>
              </div>
            </MobileCard>
          </PlanFeatureGate>
        ) : null}

        {!readStateReady ? (
          <LoadingNotifications />
        ) : filteredNotifications.length ? (
          <>
            {priorityNotifications.length ? (
              <section className="space-y-4">
                <SectionLabel>Priority Lane</SectionLabel>
                {priorityNotifications.map((notification, index) => (
                  <NotificationCard
                    key={notification.id}
                    {...notification}
                    iconElement={notificationIcon(notification.icon)}
                    opened={readIds.includes(notification.id)}
                    priorityRank={index + 1}
                    unread={isUnread(notification)}
                    onRead={() => markRead(notification.id)}
                  />
                ))}
              </section>
            ) : null}
            {groupedNotifications.map(({ group, notifications: groupedItems }) =>
              groupedItems.length ? (
                <section key={group} className="space-y-4">
                  <SectionLabel>{groupLabels[group]}</SectionLabel>
                  {groupedItems.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      {...notification}
                      iconElement={notificationIcon(notification.icon)}
                      opened={readIds.includes(notification.id)}
                      unread={isUnread(notification)}
                      onRead={() => markRead(notification.id)}
                    />
                  ))}
                </section>
              ) : null
            )}
          </>
        ) : (
          <EmptyNotifications activeFilter={activeFilter} />
        )}
      </main>

      <MobileBottomNav
        indicatorClassName="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white"
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { href: "/search", icon: <Search />, label: "Track" },
          { active: true, href: "/alerts", icon: <Bell />, label: "Alerts" },
          { href: "/settings", icon: <Settings />, label: "Settings" }
        ]}
      />
    </>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="pt-1 text-[15px] font-medium uppercase tracking-wide text-white/52">{children}</h2>;
}

function EmptyNotifications({ activeFilter }: { activeFilter: AlertsInboxFilter }) {
  const title =
    activeFilter === "all"
      ? "No alerts yet"
      : activeFilter === "action"
        ? "No action needed yet"
        : "No unread alerts yet";
  const description =
    activeFilter === "all"
      ? "New civic activity will appear here as bills, votes, and official updates are tracked."
      : activeFilter === "action"
        ? "Alerts that need a response will appear here when tracked civic activity requires attention."
        : "Unread alerts will appear here when new tracked civic activity arrives.";

  return (
    <MobileCard variant="dashboard" className="px-5 py-6 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/8 text-[#ffb12b]">
        <Bell className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-[21px] font-medium leading-tight text-white">{title}</h2>
      <p className="mt-2 text-[15px] leading-6 text-white/56">{description}</p>
    </MobileCard>
  );
}

function LoadingNotifications() {
  return (
    <MobileCard variant="dashboard" className="px-5 py-6 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/8 text-[#ffb12b]">
        <Bell className="h-6 w-6 animate-pulse" strokeWidth={1.8} aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-[21px] font-medium leading-tight text-white">Syncing alerts</h2>
      <p className="mt-2 text-[15px] leading-6 text-white/56">Checking your account ledger before showing unread updates.</p>
    </MobileCard>
  );
}

function NotificationCard({
  action,
  actionNeeded,
  body,
  categoryLabel,
  href,
  iconElement,
  onRead,
  opened,
  priorityRank,
  time,
  title,
  unread
}: AlertsInboxItem & {
  iconElement: ReactNode;
  onRead: () => void;
  opened: boolean;
  priorityRank?: number;
  unread: boolean;
}) {
  const showStatusIndicator = unread || (actionNeeded && !opened);

  return (
    <MobileCard variant="dashboard" className="px-5 py-5">
      <Link href={href} onClick={onRead} className="flex items-start gap-3">
        <div className="pt-1 text-[#ffb12b] [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[1.9]">{iconElement}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-rust/35 bg-rust/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[#ffb12b]">{categoryLabel}</span>
              {actionNeeded ? <span className="rounded-full border border-[#43ed74]/30 bg-[#43ed74]/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[#43ed74]">Action</span> : null}
              {priorityRank ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#4aa3ff]/35 bg-[#168dff]/12 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[#9fd1ff]">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  #{priorityRank}
                </span>
              ) : null}
              {showStatusIndicator ? <span className="h-2 w-2 rounded-full bg-[#ffb12b] shadow-[0_0_12px_rgba(255,177,43,0.8)]" aria-label={unread ? "Unread" : "Action needed"} /> : null}
            </div>
            <div className="shrink-0 whitespace-nowrap rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(26,73,127,0.28)_0%,rgba(6,25,55,0.66)_100%)] px-3 py-2 text-[14px] font-medium leading-none text-white/66 shadow-[inset_0_1px_0_rgba(255,255,255,0.11)]">
              {time}
            </div>
          </div>
          <h3 className="mt-3 text-[21px] font-medium leading-tight text-white">{title}</h3>
          <p className="mt-3 text-[17px] leading-snug text-white/58">{body}</p>
          <span className="mt-4 inline-flex items-center gap-2 text-[17px] font-medium text-[#ffb12b]">
            {action}
            <ArrowRight className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
          </span>
        </div>
      </Link>
    </MobileCard>
  );
}
