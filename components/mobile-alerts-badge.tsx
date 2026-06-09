"use client";

import { useEffect, useState } from "react";

type AlertSummaryResponse = {
  activeAlertCount?: number;
};

function formatBadgeValue(value: number) {
  if (value > 99) return "99+";
  return String(value);
}

export function MobileAlertsBadge({ fallbackBadge }: { fallbackBadge?: string }) {
  const [badge, setBadge] = useState(fallbackBadge ?? "");

  useEffect(() => {
    let active = true;

    async function refreshBadge() {
      const response = await fetch("/api/alerts/summary", { cache: "no-store" }).catch(() => null);
      if (!active || !response?.ok) return;

      const data = (await response.json().catch(() => null)) as AlertSummaryResponse | null;
      const count = Number(data?.activeAlertCount ?? 0);
      setBadge(count > 0 ? formatBadgeValue(count) : "");
    }

    void refreshBadge();

    return () => {
      active = false;
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
