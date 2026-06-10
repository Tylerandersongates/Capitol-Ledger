"use client";

import { useEffect, useState } from "react";
import {
  accountProfileChangedEvent,
  fetchAccountProfile,
  readLocalNotificationPreferences,
  writeLocalNotificationPreferences
} from "@/lib/browser-account-profile";
import type { AccountNotificationPreferences } from "@/types/capitol";

const readAlertsKey = "capitol-ledger:read-alerts";
const readAlertsChangedEvent = "capitol-ledger:read-alerts-changed";

type AlertPreference = keyof Pick<AccountNotificationPreferences, "districtAlerts" | "voteReminders">;
type AlertSummaryItem = {
  id: string;
  preference?: AlertPreference;
};
type AlertSummaryResponse = {
  activeAlerts?: AlertSummaryItem[];
  activeAlertCount?: number;
  activeAlertIds?: string[];
};

let alertSummaryCache: AlertSummaryResponse | null = null;
let alertSummaryCacheUpdatedAt = 0;
let alertSummaryPromise: Promise<AlertSummaryResponse | null> | null = null;
const alertSummaryCacheTtlMs = 20_000;

function formatBadgeValue(value: number) {
  if (value > 99) return "99+";
  return String(value);
}

function readAlertIds() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(readAlertsKey) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function alertPreferenceEnabled(preferences: AccountNotificationPreferences, preference?: AlertPreference) {
  if (!preference) return true;
  return preferences[preference];
}

function countUnopenedActiveAlerts(activeAlerts: AlertSummaryItem[], fallbackIds: string[], fallbackCount?: number) {
  const preferences = readLocalNotificationPreferences();
  const alerts = activeAlerts.length
    ? activeAlerts.filter((alert) => alert.id && alertPreferenceEnabled(preferences, alert.preference))
    : fallbackIds.map((id) => ({ id }));

  if (!alerts.length) return activeAlerts.length || fallbackIds.length ? 0 : Number(fallbackCount ?? 0);

  const readIds = new Set(readAlertIds());
  return alerts.filter((alert) => !readIds.has(alert.id)).length;
}

async function fetchAlertSummary() {
  if (alertSummaryCache && Date.now() - alertSummaryCacheUpdatedAt < alertSummaryCacheTtlMs) return alertSummaryCache;
  if (alertSummaryPromise) return alertSummaryPromise;

  alertSummaryPromise = fetch("/api/alerts/summary", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) return null;
      const data = (await response.json().catch(() => null)) as AlertSummaryResponse | null;
      if (!data) return null;
      alertSummaryCache = {
        activeAlerts: Array.isArray(data.activeAlerts)
          ? data.activeAlerts.filter((alert): alert is AlertSummaryItem => Boolean(alert?.id))
          : [],
        activeAlertCount: data.activeAlertCount,
        activeAlertIds: Array.isArray(data.activeAlertIds) ? data.activeAlertIds : []
      };
      alertSummaryCacheUpdatedAt = Date.now();
      return alertSummaryCache;
    })
    .catch(() => null)
    .finally(() => {
      alertSummaryPromise = null;
    });

  return alertSummaryPromise;
}

export function MobileAlertsBadge({ fallbackBadge }: { fallbackBadge?: string }) {
  const [badge, setBadge] = useState(fallbackBadge ?? "");

  useEffect(() => {
    let active = true;
    let activeAlerts: AlertSummaryItem[] = [];
    let activeAlertIds: string[] = [];

    function updateBadge(count: number) {
      setBadge(count > 0 ? formatBadgeValue(count) : "");
    }

    function refreshFromLocalReads() {
      updateBadge(countUnopenedActiveAlerts(activeAlerts, activeAlertIds));
    }

    async function refreshBadge() {
      const data = await fetchAlertSummary();
      if (!active || !data) return;

      activeAlerts = Array.isArray(data?.activeAlerts) ? data.activeAlerts : [];
      activeAlertIds = Array.isArray(data?.activeAlertIds) ? data.activeAlertIds : [];
      updateBadge(countUnopenedActiveAlerts(activeAlerts, activeAlertIds, data?.activeAlertCount));
    }

    async function refreshPreferences() {
      const profile = await fetchAccountProfile();
      if (!active) return;
      if (profile) writeLocalNotificationPreferences(profile.notificationPreferences);
      refreshFromLocalReads();
    }

    void refreshBadge();
    void refreshPreferences();
    window.addEventListener("storage", refreshFromLocalReads);
    window.addEventListener("focus", refreshBadge);
    window.addEventListener("focus", refreshPreferences);
    window.addEventListener("pageshow", refreshBadge);
    window.addEventListener("pageshow", refreshPreferences);
    window.addEventListener(accountProfileChangedEvent, refreshFromLocalReads);
    window.addEventListener(readAlertsChangedEvent, refreshFromLocalReads);

    return () => {
      active = false;
      window.removeEventListener("storage", refreshFromLocalReads);
      window.removeEventListener("focus", refreshBadge);
      window.removeEventListener("focus", refreshPreferences);
      window.removeEventListener("pageshow", refreshBadge);
      window.removeEventListener("pageshow", refreshPreferences);
      window.removeEventListener(accountProfileChangedEvent, refreshFromLocalReads);
      window.removeEventListener(readAlertsChangedEvent, refreshFromLocalReads);
    };
  }, []);

  if (!badge) return null;

  return (
    <span
      aria-label={`${badge} active alerts`}
      className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full border border-white/70 bg-[#ffb12b] px-1 text-[11px] font-semibold leading-none text-[#06142b] shadow-[0_0_14px_rgba(255,177,43,0.65)]"
    >
      {badge}
    </span>
  );
}
