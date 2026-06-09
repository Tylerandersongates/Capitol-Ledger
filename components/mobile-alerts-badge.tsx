"use client";

import { useEffect, useState } from "react";

const readAlertsKey = "capitol-ledger:read-alerts";
const readAlertsChangedEvent = "capitol-ledger:read-alerts-changed";

type AlertSummaryResponse = {
  activeAlertCount?: number;
  activeAlertIds?: string[];
};

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

function countUnopenedActiveAlerts(activeAlertIds: string[], fallbackCount?: number) {
  if (!activeAlertIds.length) return Number(fallbackCount ?? 0);

  const readIds = new Set(readAlertIds());
  return activeAlertIds.filter((id) => !readIds.has(id)).length;
}

export function MobileAlertsBadge({ fallbackBadge }: { fallbackBadge?: string }) {
  const [badge, setBadge] = useState(fallbackBadge ?? "");

  useEffect(() => {
    let active = true;
    let activeAlertIds: string[] = [];

    function updateBadge(count: number) {
      setBadge(count > 0 ? formatBadgeValue(count) : "");
    }

    function refreshFromLocalReads() {
      updateBadge(countUnopenedActiveAlerts(activeAlertIds));
    }

    async function refreshBadge() {
      const response = await fetch("/api/alerts/summary", { cache: "no-store" }).catch(() => null);
      if (!active || !response?.ok) return;

      const data = (await response.json().catch(() => null)) as AlertSummaryResponse | null;
      activeAlertIds = Array.isArray(data?.activeAlertIds) ? data.activeAlertIds : [];
      updateBadge(countUnopenedActiveAlerts(activeAlertIds, data?.activeAlertCount));
    }

    void refreshBadge();
    window.addEventListener("storage", refreshFromLocalReads);
    window.addEventListener("focus", refreshBadge);
    window.addEventListener("pageshow", refreshBadge);
    window.addEventListener(readAlertsChangedEvent, refreshFromLocalReads);

    return () => {
      active = false;
      window.removeEventListener("storage", refreshFromLocalReads);
      window.removeEventListener("focus", refreshBadge);
      window.removeEventListener("pageshow", refreshBadge);
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
