"use client";

import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";
import { PlanFeatureGate } from "@/components/subscription-controls";
import Link from "next/link";
import { Bell, CalendarClock, ChevronRight, FileText, Home, Sparkles, UserRound, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { getDashboardData } from "@/lib/data";
import type { AccountLedgerSnapshot } from "@/types/capitol";

type DashboardData = ReturnType<typeof getDashboardData>;
const readAlertKey = "capitol-ledger:read-alerts";
const accountLedgerEndpoint = "/api/account/ledger";
const readAlertsChangedEvent = "capitol-ledger:read-alerts-changed";

function buildRecentVoteDots(totals: { no: number; notVoting: number; yes: number }) {
  const total = Math.max(1, totals.yes + totals.no + totals.notVoting);
  const yesEnd = Math.round((totals.yes / total) * 100);
  const noEnd = yesEnd + Math.round((totals.no / total) * 100);

  return Array.from({ length: 100 }).map((_, index) => {
    const columns = 25;
    const rows = 4;
    const col = Math.floor(index / rows);
    const row = index % rows;
    const progress = col / (columns - 1);
    const arcLift = Math.sin(progress * Math.PI) * 47;

    return {
      x: 9 + col * 3.45,
      y: 70 - arcLift + row * 8.2,
      color: index < yesEnd ? "#35d990" : index < noEnd ? "#ff5747" : "#9ca5b1"
    };
  });
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const defaultUnreadAlertIds = useMemo(() => data.defaultUnreadAlertIds, [data.defaultUnreadAlertIds]);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const recentVoteBill = data.recentVote?.bill;
  const recentVote = data.recentVote?.vote;
  const recentVoteTotals = data.recentVote?.totals;
  const trackedBill = data.trackedBill;
  const inProgressCount = data.statusCounts.inProgress || Math.max(0, data.billsInAction - data.statusCounts.passed - data.statusCounts.inCommittee);
  const passedPercent = data.billsInAction ? (data.statusCounts.passed / data.billsInAction) * 100 : 0;
  const committeePercent = data.billsInAction ? (data.statusCounts.inCommittee / data.billsInAction) * 100 : 0;
  const recentVoteDots = buildRecentVoteDots({
    no: recentVoteTotals?.no ?? 0,
    notVoting: recentVoteTotals?.notVoting ?? 0,
    yes: recentVoteTotals?.yes ?? 0
  });

  useEffect(() => {
    let active = true;

    function refreshFromBrowser() {
      setUnreadAlertCount(countUnreadAlertIds(defaultUnreadAlertIds, readDashboardAlertIds()));
    }

    async function refreshFromAccount() {
      const readIds = await hydrateDashboardReadAlertIds();
      if (active) setUnreadAlertCount(countUnreadAlertIds(defaultUnreadAlertIds, readIds));
    }

    void refreshFromAccount();
    window.addEventListener(readAlertsChangedEvent, refreshFromBrowser);
    window.addEventListener("storage", refreshFromBrowser);
    window.addEventListener("focus", refreshFromBrowser);
    window.addEventListener("pageshow", refreshFromBrowser);

    return () => {
      active = false;
      window.removeEventListener(readAlertsChangedEvent, refreshFromBrowser);
      window.removeEventListener("storage", refreshFromBrowser);
      window.removeEventListener("focus", refreshFromBrowser);
      window.removeEventListener("pageshow", refreshFromBrowser);
    };
  }, [defaultUnreadAlertIds]);

  return (
    <MobileShell
      minHeight="min-h-[844px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
            <header className="mt-11 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/capitol-ledger-logo.png" alt="" className="h-12 w-12 rounded-full object-cover" />
                <div className="whitespace-nowrap text-[19px] font-semibold uppercase tracking-[0.24em] text-white">
                  Capitol <span className="text-brass">Ledger</span>
                </div>
              </div>
              <Link href="/alerts" className={`relative ${mobileIconButtonClass}`} aria-label="Open alerts">
                <Bell className="h-7 w-7" strokeWidth={1.9} aria-hidden="true" />
                {unreadAlertCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#ffb12b] px-1 text-[11px] font-semibold leading-none text-[#061126]">
                    {Math.min(unreadAlertCount, 9)}
                  </span>
                ) : null}
              </Link>
            </header>

            <div className="mt-12 flex items-end justify-between">
              <div>
                <div className="text-[18px] uppercase tracking-wide text-white/54">Dashboard</div>
                <h1 className="mt-1 text-[26px] font-medium leading-none text-white">Overview</h1>
              </div>
              <Link href="/search" className={mobileViewAllClass}>
                View All
              </Link>
            </div>

            <MobileCard variant="dashboard" className="mt-8 px-5 py-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
                <div className="min-w-0">
                  <h2 className="max-w-[19rem] text-[23px] font-medium leading-tight">Today in Congress</h2>
                  <p className="mt-2 text-[18px] text-white/52">{data.billsInAction} Bills in Action</p>
                </div>
                <Link
                  href="/alerts"
                  className="flex shrink-0 items-center gap-1 rounded-full bg-white/8 px-3 py-2 text-[16px] font-medium leading-none text-white/60 transition hover:bg-white/12"
                  aria-label={`Open ${data.updateCount} congressional updates`}
                >
                  <span>{data.updateCount}</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-6 grid grid-cols-[110px_1fr] items-center gap-6">
                <div
                  className="relative h-[104px] w-[104px] rounded-full shadow-[0_0_26px_rgba(43,141,255,0.16)]"
                  style={{
                    background: `conic-gradient(#28c98a 0 ${passedPercent}%, #ffc047 ${passedPercent}% ${passedPercent + committeePercent}%, #2f9fff ${passedPercent + committeePercent}% 100%)`
                  }}
                >
                  <div className="absolute inset-[22px] rounded-full bg-[#04152b]" />
                </div>
                <div className="space-y-4 text-[18px] leading-none">
                  <Legend color="#28c98a" label={`${data.statusCounts.passed} Passed`} />
                  <Legend color="#ffc047" label={`${data.statusCounts.inCommittee} In Committee`} />
                  <Legend color="#2f9fff" label={`${inProgressCount} In Progress`} />
                </div>
              </div>
            </MobileCard>

            <div className="mt-5">
              <PlanFeatureGate feature="aiPolicyLens">
                <MobileCard variant="dashboard" className="px-5 py-5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium uppercase tracking-wide text-white/50">Pro Intelligence</div>
                      <h2 className="mt-2 text-[23px] font-medium leading-tight">Today’s policy lens</h2>
                      <p className="mt-3 text-[15px] leading-snug text-white/58">
                        {data.billsInAction} active bills, {data.updateCount} new updates, and priority movement around transparency, childcare, and infrastructure.
                      </p>
                    </div>
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ffb12b]/12 text-[#ffb12b]">
                      <Sparkles className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <MiniIntelligenceMetric value="3" label="Priority bills" />
                    <MiniIntelligenceMetric value="2" label="Vote risks" />
                    <MiniIntelligenceMetric value="1" label="New hearing" />
                  </div>
                </MobileCard>
              </PlanFeatureGate>
            </div>

            <MobileCard variant="dashboard" className="mt-5 px-5 py-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-wide text-white/50">
                    <CalendarClock className="h-4 w-4 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
                    Weekly Brief
                  </div>
                  <h2 className="mt-2 text-[21px] font-medium leading-tight">Monday civic summary</h2>
                  <p className="mt-2 text-[14px] leading-snug text-white/54">Delivery status, recent history, and your district watchlist.</p>
                </div>
                <Link href="/brief" className={mobileViewAllClass}>
                  Open
                </Link>
              </div>
            </MobileCard>

            <div className="mt-9 flex items-center justify-between">
              <h2 className="text-[25px] font-medium leading-none">Recent Votes</h2>
              <Link href="/search?type=votes" className={mobileViewAllClass}>
                View All
              </Link>
            </div>

            <MobileCard variant="dashboard" className="mt-5 px-5 py-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
                <div className="min-w-0">
                  <h3 className="max-w-[19rem] text-[23px] font-medium leading-tight">{recentVoteBill?.shortTitle ?? recentVote?.question ?? "No recent vote"}</h3>
                  <p className="mt-2 text-[18px] text-white/52">{recentVoteBill?.displayNumber ?? recentVote?.rollCall ?? "Roll call"}</p>
                </div>
                <div className="shrink-0 rounded-full bg-[#2be68d]/10 px-3 py-2 text-right text-[16px] font-medium leading-none text-[#2be68d]">{recentVote?.result ?? "Updated"}</div>
              </div>
              <div className="relative mt-6 h-[138px]">
                <div className="pointer-events-none absolute left-[36px] right-[36px] top-0 h-[104px]" aria-hidden="true">
                  <div className="relative h-full w-full">
                  {recentVoteDots.map((dot, index) => (
                    <span
                      key={index}
                      className="absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ left: `${dot.x}%`, top: `${dot.y}%`, backgroundColor: dot.color }}
                    />
                  ))}
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 z-10">
                  <div className="text-[27px] font-medium text-[#2ee596]">{recentVoteTotals?.yes ?? 0}</div>
                  <div className="mt-1 flex items-center gap-2 text-[18px] uppercase text-white/54">
                    Yea <span className="grid h-4 w-4 place-items-center rounded-full border border-[#2ee596]/55 text-[10px] text-[#2ee596]">✓</span>
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 z-10 text-right">
                  <div className="text-[27px] font-medium text-[#ff5747]">{recentVoteTotals?.no ?? 0}</div>
                  <div className="mt-1 flex items-center gap-2 text-[18px] uppercase text-white/54">
                    Nay <span className="grid h-4 w-4 place-items-center rounded-full border border-white/28 text-[10px] text-white/54">×</span>
                  </div>
                </div>
              </div>
            </MobileCard>

            <div className="mt-9 flex items-center justify-between">
              <h2 className="text-[25px] font-medium leading-none">Bill Tracker</h2>
              <Link href="/search?type=bills" className={mobileViewAllClass}>
                View All
              </Link>
            </div>

            <MobileCard variant="dashboard" className="mt-5 px-5 py-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
                <div className="min-w-0">
                  <h3 className="max-w-[19rem] text-[23px] font-medium leading-tight">{trackedBill?.shortTitle ?? "Tracked Bill"}</h3>
                  <p className="mt-2 text-[18px] text-white/52">{trackedBill?.displayNumber ?? "Bill"}</p>
                </div>
                <div className="shrink-0 rounded-full bg-[#ffb62e]/10 px-3 py-2 text-right text-[16px] font-medium leading-none text-[#ffb62e]">In Committee</div>
              </div>
              <div className="mt-8 px-3">
                <div className="relative h-10">
                  <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 bg-white/13" />
                  <div className="absolute left-0 top-1/2 h-[3px] w-[34%] -translate-y-1/2 bg-[#ffbd39]" />
                  {[0, 34, 68, 100].map((left, index) => (
                    <span
                      key={left}
                      className={`absolute top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full ${index < 2 ? "bg-[#ffbd39]" : "border-[3px] border-white/13 bg-[#07172d]"}`}
                      style={{ left: `${left}%` }}
                    >
                      {index < 2 ? <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#06152b]" /> : null}
                    </span>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-4 text-center text-[13px] leading-tight">
                  <span className="text-white/82">Introduced</span>
                  <span className="text-white/82">In Committee</span>
                  <span className="text-white/40">On Floor</span>
                  <span className="text-white/40">Passed</span>
                </div>
              </div>
            </MobileCard>

            <MobileBottomNav
              className="sticky bottom-0 -mx-8 mt-auto border-t border-white/8 bg-[#031126]/96 px-8 pb-3 pt-4 backdrop-blur-xl"
              indicatorClassName="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white"
              items={[
                { active: true, href: "/dashboard", icon: <Home />, label: "Home" },
                { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
                { href: "/search?type=members", icon: <UsersRound />, label: "Representatives" },
                { href: "/alerts", icon: <Bell />, label: "Alerts" },
                { href: "/account", icon: <UserRound />, label: "Profile" }
              ]}
            />
    </MobileShell>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

function MiniIntelligenceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center">
      <div className="text-[22px] font-medium leading-none text-[#ffb12b]">{value}</div>
      <div className="mt-2 text-[11px] leading-tight text-white/48">{label}</div>
    </div>
  );
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function readDashboardAlertIds() {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage?.getItem(readAlertKey);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeDashboardAlertIds(ids: string[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage?.setItem(readAlertKey, JSON.stringify(uniqueStrings(ids)));
    window.dispatchEvent(new Event(readAlertsChangedEvent));
  } catch {
    // The badge can still render safely when browser persistence is restricted.
  }
}

async function hydrateDashboardReadAlertIds() {
  const local = readDashboardAlertIds();
  const response = await fetch(accountLedgerEndpoint, { cache: "no-store" }).catch(() => null);

  if (!response?.ok) return local;

  const data = (await response.json().catch(() => null)) as { ledger?: AccountLedgerSnapshot } | null;
  const merged = uniqueStrings([...local, ...(data?.ledger?.readAlerts ?? [])]);
  const changed = merged.length !== local.length || merged.some((id, index) => id !== local[index]);

  if (changed) writeDashboardAlertIds(merged);
  return merged;
}

function countUnreadAlertIds(defaultUnreadAlertIds: string[], readIds: string[]) {
  const read = new Set(readIds);
  return uniqueStrings(defaultUnreadAlertIds).filter((id) => !read.has(id)).length;
}
