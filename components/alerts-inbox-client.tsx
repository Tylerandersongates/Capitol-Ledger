"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Bell, FileText, Home, Scale, Search, UserRound } from "lucide-react";
import { MobileBottomNav, MobileCard } from "@/components/mobile-ui";
import { PlanFeatureGate } from "@/components/subscription-controls";
import { recordGamificationEvent } from "@/lib/browser-gamification";
import {
  accountProfileChangedEvent,
  fetchAccountProfile,
  readLocalNotificationPreferences,
  writeLocalNotificationPreferences
} from "@/lib/browser-account-profile";
import type { AccountLedgerSnapshot } from "@/types/capitol";

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

const readAlertKey = "capitol-ledger:read-alerts";
const accountLedgerEndpoint = "/api/account/ledger";
const readAlertsChangedEvent = "capitol-ledger:read-alerts-changed";
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

function filterHref(filter: AlertsInboxFilter) {
  return filter === "all" ? "/alerts" : `/alerts?filter=${filter}`;
}

function readAlertIds() {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage?.getItem(readAlertKey);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeAlertIds(ids: string[]) {
  try {
    window.localStorage?.setItem(readAlertKey, JSON.stringify(uniqueStrings(ids)));
    window.dispatchEvent(new Event(readAlertsChangedEvent));
  } catch {
    // Restricted browser contexts can still render notifications without persistence.
  }
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function mergeReadAlertIds(local: string[], account: string[] = []) {
  return uniqueStrings([...local, ...account]);
}

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

async function syncReadAlertsToAccount(ids = readAlertIds()) {
  const response = await fetch(accountLedgerEndpoint, {
    body: JSON.stringify({ readAlerts: uniqueStrings(ids) }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  }).catch(() => null);

  if (!response?.ok) return ids;

  const data = (await response.json().catch(() => null)) as { ledger?: AccountLedgerSnapshot } | null;
  const merged = mergeReadAlertIds(ids, data?.ledger?.readAlerts);
  readAlertsHydrationPromise = Promise.resolve(merged);
  if (!sameStringSet(ids, merged)) writeAlertIds(merged);
  return merged;
}

async function hydrateReadAlertsFromAccount() {
  if (readAlertsHydrationPromise) return readAlertsHydrationPromise;

  readAlertsHydrationPromise = hydrateReadAlertsFromApi();
  return readAlertsHydrationPromise;
}

async function hydrateReadAlertsFromApi() {
  const response = await fetch(accountLedgerEndpoint, { cache: "no-store" }).catch(() => null);
  const local = readAlertIds();

  if (!response?.ok) {
    readAlertsHydrationPromise = null;
    return local;
  }

  const data = (await response.json().catch(() => null)) as { ledger?: AccountLedgerSnapshot } | null;
  const merged = mergeReadAlertIds(local, data?.ledger?.readAlerts);
  if (!sameStringSet(local, merged)) {
    writeAlertIds(merged);
    void syncReadAlertsToAccount(merged);
  }
  return merged;
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
  notifications
}: {
  activeFilter: AlertsInboxFilter;
  notifications: AlertsInboxItem[];
}) {
  const [readIds, setReadIds] = useState<string[]>([]);
  const [notificationPreferences, setNotificationPreferences] = useState(() => readLocalNotificationPreferences());

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
    setReadIds(readAlertIds());
    void hydrateReadAlertsFromAccount().then(setReadIds);
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

  const groupedNotifications = useMemo(
    () =>
      (["today", "yesterday", "earlier"] as AlertsInboxGroup[]).map((group) => ({
        group,
        notifications: filteredNotifications.filter((notification) => notification.group === group)
      })),
    [filteredNotifications]
  );

  return (
    <>
      <nav className="mt-7 rounded-full border border-white/10 bg-white/6 p-1 shadow-[inset_0_0_18px_rgba(255,255,255,0.04),0_10px_28px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="grid grid-cols-3 gap-1 text-center text-[14px] font-medium">
          {notificationFilters.map((filter) => (
            <Link
              key={filter.value}
              href={filterHref(filter.value)}
              className={`rounded-full px-2 py-2.5 transition ${
                activeFilter === filter.value ? "bg-white/10 text-[#ffb12b] shadow-[inset_0_0_16px_rgba(255,255,255,0.04)]" : "text-white/54"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="mt-7 space-y-4 pb-8">
        <PlanFeatureGate feature="priorityAlerts">
          <MobileCard variant="dashboard" className="px-5 py-5">
            <div className="grid grid-cols-[34px_minmax(0,1fr)_auto] gap-3">
              <div className="pt-1 text-[#ffb12b]">
                <Bell className="h-6 w-6" strokeWidth={1.9} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="rounded-full border border-[#43ed74]/30 bg-[#43ed74]/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[#43ed74] inline-flex">
                  Priority alert lane
                </div>
                <h2 className="mt-3 text-[21px] font-medium leading-tight text-white">Pro reminders surface first</h2>
                <p className="mt-3 text-[16px] leading-snug text-white/58">
                  Vote reminders, hearings, and district-specific movement are promoted above standard civic updates.
                </p>
              </div>
              <div className="whitespace-nowrap rounded-full bg-white/8 px-3 py-2 text-[14px] font-medium leading-none text-white/60">Pro</div>
            </div>
          </MobileCard>
        </PlanFeatureGate>

        {filteredNotifications.length ? (
          <>
            {groupedNotifications.map(({ group, notifications: groupedItems }) =>
              groupedItems.length ? (
                <section key={group} className="space-y-4">
                  <SectionLabel>{groupLabels[group]}</SectionLabel>
                  {groupedItems.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      {...notification}
                      iconElement={notificationIcon(notification.icon)}
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
        className="sticky bottom-0 -mx-8 mt-auto border-t border-white/8 bg-[#031126]/96 px-8 pb-3 pt-4 backdrop-blur-xl"
        indicatorClassName="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white"
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { href: "/search", icon: <Search />, label: "Track" },
          { active: true, href: "/alerts", icon: <Bell />, label: "Alerts" },
          { href: "/account", icon: <UserRound />, label: "Profile" }
        ]}
      />
    </>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="pt-1 text-[15px] font-medium uppercase tracking-wide text-white/52">{children}</h2>;
}

function EmptyNotifications({ activeFilter }: { activeFilter: AlertsInboxFilter }) {
  const label = notificationFilters.find((filter) => filter.value === activeFilter)?.label ?? "Notifications";

  return (
    <MobileCard variant="dashboard" className="px-5 py-6 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/8 text-[#ffb12b]">
        <Bell className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-[21px] font-medium leading-tight text-white">No {label.toLowerCase()} yet</h2>
      <p className="mt-2 text-[15px] leading-6 text-white/56">New civic activity will appear here as bills, votes, and official updates are tracked.</p>
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
  time,
  title,
  unread
}: AlertsInboxItem & {
  iconElement: ReactNode;
  onRead: () => void;
  unread: boolean;
}) {
  return (
    <MobileCard variant="dashboard" className="px-5 py-5">
      <Link href={href} onClick={onRead} className="grid grid-cols-[34px_minmax(0,1fr)_auto] gap-3">
        <div className="pt-1 text-[#ffb12b] [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[1.9]">{iconElement}</div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-rust/35 bg-rust/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[#ffb12b]">{categoryLabel}</span>
            {actionNeeded ? <span className="rounded-full border border-[#43ed74]/30 bg-[#43ed74]/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[#43ed74]">Action</span> : null}
            {unread ? <span className="h-2 w-2 rounded-full bg-[#ffb12b] shadow-[0_0_12px_rgba(255,177,43,0.8)]" aria-label="Unread" /> : null}
          </div>
          <h3 className="mt-3 text-[21px] font-medium leading-tight text-white">{title}</h3>
          <p className="mt-3 text-[17px] leading-snug text-white/58">{body}</p>
          <span className="mt-4 inline-flex items-center gap-2 text-[17px] font-medium text-[#ffb12b]">
            {action}
            <ArrowRight className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
          </span>
        </div>
        <div className="whitespace-nowrap rounded-full bg-white/8 px-3 py-2 text-[14px] font-medium leading-none text-white/60">{time}</div>
      </Link>
    </MobileCard>
  );
}
