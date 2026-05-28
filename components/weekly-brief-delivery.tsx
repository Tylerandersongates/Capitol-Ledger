"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, MailCheck } from "lucide-react";
import { useSubscriptionState } from "@/components/subscription-controls";
import { accountProfileChangedEvent, readLocalNotificationPreferences } from "@/lib/browser-account-profile";
import { isPlanFeatureEnabled } from "@/lib/subscription-plans";
import { getWeeklyBriefStatusLabel, type WeeklyBriefDeliveryRecord } from "@/lib/weekly-brief-history";
import type { WeeklyBriefSnapshot } from "@/lib/weekly-brief";

type DeliveryResponse = {
  brief?: WeeklyBriefSnapshot;
  delivery?: WeeklyBriefSnapshot["delivery"] & {
    preparedAt?: string;
    status?: string;
  };
  history?: WeeklyBriefDeliveryRecord[];
  message?: string;
};

export function WeeklyBriefDeliveryCard() {
  const [subscription] = useSubscriptionState();
  const [enabled, setEnabled] = useState(false);
  const [history, setHistory] = useState<WeeklyBriefDeliveryRecord[]>([]);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const unlocked = isPlanFeatureEnabled(subscription.plan, "weeklyBrief");
  const deliveryReady = unlocked && enabled;

  useEffect(() => {
    function refresh() {
      setEnabled(readLocalNotificationPreferences().weeklyBrief);
    }

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(accountProfileChangedEvent, refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(accountProfileChangedEvent, refresh);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      const response = await fetch("/api/account/weekly-brief").catch(() => null);
      if (!response?.ok) return;

      const data = (await response.json().catch(() => ({}))) as DeliveryResponse;
      if (!active) return;

      if (data.brief) {
        setEnabled(data.brief.delivery.enabled);
      }
      setHistory(data.history ?? []);
    }

    void loadHistory();

    return () => {
      active = false;
    };
  }, []);

  async function prepareBrief() {
    if (!unlocked) {
      setStatus("Weekly Brief delivery unlocks with Pro Intelligence.");
      return;
    }

    setPending(true);
    const response = await fetch("/api/account/weekly-brief", {
      method: "POST"
    }).catch(() => null);
    setPending(false);

    if (!response?.ok) {
      setStatus("Start a demo or signed-in session to prepare the brief.");
      return;
    }

    const data = (await response.json().catch(() => ({}))) as DeliveryResponse;
    setHistory(data.history ?? []);
    setStatus(data.message ?? "Weekly Brief prepared.");
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#ffb12b]">
            <CalendarClock className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            <span className="text-[13px] font-medium uppercase tracking-wide">Weekly Brief</span>
          </div>
          <h2 className="mt-2 text-[21px] font-medium leading-tight text-white">Personal civic intelligence delivery</h2>
          <p className="mt-3 text-[15px] leading-snug text-white/58">
            Combines your district, saved ledger, policy interests, unread alerts, and subscription level into a Monday brief.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${deliveryReady ? "bg-[#43ed74]/12 text-[#43ed74]" : "bg-white/8 text-white/52"}`}>
          {unlocked ? (enabled ? "Ready" : "Paused") : "Locked"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link href="/brief" className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 text-[14px] font-semibold text-white/72">
          Preview
          <ArrowRight className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
        </Link>
        {unlocked ? (
          <button
            type="button"
            onClick={() => void prepareBrief()}
            disabled={pending}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[14px] font-semibold text-[#071225] disabled:opacity-60"
          >
            <MailCheck className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
            {pending ? "Preparing" : "Prepare"}
          </button>
        ) : (
          <Link href="/upgrade" className="flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[14px] font-semibold text-[#071225]">
            Upgrade
          </Link>
        )}
      </div>

      {status ? <p className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] leading-snug text-white/62">{status}</p> : null}

      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-medium text-white">Delivery history</h3>
          <span className="text-[12px] font-medium text-white/45">{history.length ? `${history.length} records` : "No records"}</span>
        </div>

        {history.length ? (
          <div className="mt-3 space-y-2">
            {history.slice(0, 3).map((record) => (
              <div key={record.id} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-white/82">{record.summary}</p>
                    <p className="mt-1 text-[12px] leading-snug text-white/45">
                      {formatHistoryDate(record.createdAt)} - {record.trackedBillCount} bills - {record.unreadAlertCount} unread alerts
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${getHistoryStatusClass(record.status)}`}>
                    {getWeeklyBriefStatusLabel(record.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3 text-[13px] leading-snug text-white/48">
            Prepared briefs will appear here once Pro delivery is queued.
          </p>
        )}
      </div>
    </div>
  );
}

function getHistoryStatusClass(status: WeeklyBriefDeliveryRecord["status"]) {
  if (status === "sent") return "bg-[#43ed74]/12 text-[#43ed74]";
  if (status === "failed") return "bg-[#ff5c4d]/12 text-[#ff7c72]";
  if (status === "paused" || status === "preview_only") return "bg-white/8 text-white/52";
  return "bg-[#ffb12b]/12 text-[#ffbd3f]";
}

function formatHistoryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Prepared";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}
