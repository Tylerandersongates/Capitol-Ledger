"use client";

import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";
import { PlanFeatureGate } from "@/components/subscription-controls";
import Image from "next/image";
import Link from "next/link";
import { Bell, CalendarClock, ChevronRight, FileText, Home, Sparkles, UserRound, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { getDashboardData } from "@/lib/data";
import type { AccountLedgerSnapshot } from "@/types/capitol";

type DashboardData = ReturnType<typeof getDashboardData>;
const readAlertKey = "capitol-ledger:read-alerts";
const accountLedgerEndpoint = "/api/account/ledger";
const readAlertsChangedEvent = "capitol-ledger:read-alerts-changed";
const billTrackerStages = ["Introduced", "In Committee", "On Floor", "Passed"] as const;

type BillTrackerStage = (typeof billTrackerStages)[number];

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
    const arcLift = Math.sin(progress * Math.PI) * 44;

    return {
      x: 7 + col * 3.62,
      y: 42 - arcLift + row * 8.9,
      color: index < yesEnd ? "#35d990" : index < noEnd ? "#ff5747" : "#9ca5b1"
    };
  });
}

function resolveBillTrackerStage(actionText?: string): BillTrackerStage {
  const action = actionText?.toLowerCase() ?? "";

  if (action.includes("enacted") || action.includes("passed")) return "Passed";
  if (action.includes("committee") || action.includes("hearing") || action.includes("reported")) return "In Committee";
  if (action.includes("calendar") || action.includes("floor")) return "On Floor";
  return "Introduced";
}

function getBillTrackerStagePill(stage: BillTrackerStage) {
  if (stage === "Passed") return { bgClass: "bg-[#2be68d]/12", textClass: "text-[#2be68d]" };
  if (stage === "On Floor") return { bgClass: "bg-[#ba8dff]/12", textClass: "text-[#ba8dff]" };
  if (stage === "In Committee") return { bgClass: "bg-[#ffb62e]/10", textClass: "text-[#ffb62e]" };
  return { bgClass: "bg-[#56a8ff]/12", textClass: "text-[#56a8ff]" };
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const defaultUnreadAlertIds = useMemo(() => data.defaultUnreadAlertIds, [data.defaultUnreadAlertIds]);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const recentVoteBill = data.recentVote?.bill;
  const recentVote = data.recentVote?.vote;
  const recentVoteTotals = data.recentVote?.totals;
  const trackedBill = data.trackedBill;
  const trackerStage = resolveBillTrackerStage(trackedBill?.latestActionText);
  const trackerStageIndex = Math.max(0, billTrackerStages.indexOf(trackerStage));
  const trackerFillPercent = (trackerStageIndex / (billTrackerStages.length - 1)) * 100;
  const trackerStagePill = getBillTrackerStagePill(trackerStage);
  const inProgressCount = data.statusCounts.inProgress || Math.max(0, data.billsInAction - data.statusCounts.passed - data.statusCounts.inCommittee);
  const passedPercent = data.billsInAction ? (data.statusCounts.passed / data.billsInAction) * 100 : 0;
  const committeePercent = data.billsInAction ? (data.statusCounts.inCommittee / data.billsInAction) * 100 : 0;
  const inProgressPercent = data.billsInAction ? (inProgressCount / data.billsInAction) * 100 : 0;
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
              <div className="flex items-center gap-4">
                <Image
                  src="/capitol-ledger-logo.png"
                  alt=""
                  width={88}
                  height={88}
                  className="h-[88px] w-[88px] rounded-full border border-white/15 object-cover shadow-[0_0_28px_rgba(38,136,255,0.35)]"
                />
                <div className="whitespace-nowrap text-[16px] font-semibold uppercase tracking-[0.18em] text-white">
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

            <div className="mt-5 flex items-center justify-between">
              <div>
                <h1 className="text-[18px] font-medium leading-tight text-white">Civic Dashboard</h1>
              </div>
              <Link href="/search?focus=results" className={mobileViewAllClass}>
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
              <div className="mt-5 space-y-3">
                <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
                  <Link
                    href="/search?type=bills&status=passed&focus=results"
                    className="block h-full bg-[#28c98a] transition hover:brightness-110"
                    style={{ width: `${passedPercent}%` }}
                    aria-label={`${data.statusCounts.passed} passed bills`}
                  />
                  <Link
                    href="/search?type=bills&status=in-committee&focus=results"
                    className="block h-full bg-[#ffc047] transition hover:brightness-110"
                    style={{ width: `${committeePercent}%` }}
                    aria-label={`${data.statusCounts.inCommittee} bills in committee`}
                  />
                  <Link
                    href="/search?type=bills&status=in-progress&focus=results"
                    className="block h-full bg-[#2f9fff] transition hover:brightness-110"
                    style={{ width: `${inProgressPercent}%` }}
                    aria-label={`${inProgressCount} bills in progress`}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <StatusCountLink color="#28c98a" href="/search?type=bills&status=passed&focus=results" label="Passed" value={data.statusCounts.passed} />
                  <StatusCountLink
                    color="#ffc047"
                    href="/search?type=bills&status=in-committee&focus=results"
                    label="In Committee"
                    value={data.statusCounts.inCommittee}
                  />
                  <StatusCountLink color="#2f9fff" href="/search?type=bills&status=in-progress&focus=results" label="In Progress" value={inProgressCount} />
                </div>
              </div>
            </MobileCard>

            <div className="mt-5">
              <PlanFeatureGate
                feature="aiPolicyLens"
                fallback={
                  <MobileCard variant="dashboard" className="px-5 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[12px] font-medium uppercase tracking-wide text-white/45">Locked Preview</div>
                        <h2 className="mt-2 text-[22px] font-medium leading-tight">Pro intelligence desk</h2>
                        <p className="mt-2 text-[14px] leading-snug text-white/56">
                          Upgrade to unlock ranked priorities, risk flags, and district movement alerts that surface what needs attention first.
                        </p>
                      </div>
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-rust/30 bg-rust/10 text-[#ffb12b]">
                        <Sparkles className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <LockedStatPill label="Priority Queue" value={`${data.statusCounts.inCommittee}`} />
                      <LockedStatPill label="Risk Watch" value={`${inProgressCount}`} />
                      <LockedStatPill label="New Movement" value={`${data.updateCount}`} />
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-2">
                      <LockedProRow label="Priority bill queue" subtitle="Track which bills are most likely to move next." />
                      <LockedProRow label="Vote risk monitor" subtitle="Flag split-vote legislation before floor action." />
                      <LockedProRow label="Movement alerts" subtitle="Spot hearings and amendments sooner." />
                    </div>
                    <Link
                      href="/upgrade"
                      className="mt-4 flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/8 text-[14px] font-medium text-[#ffb12b]"
                    >
                      Unlock Pro Intelligence
                    </Link>
                  </MobileCard>
                }
              >
                <MobileCard variant="dashboard" className="px-5 py-5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium uppercase tracking-wide text-[#ffb12b]">Pro Intelligence Active</div>
                      <h2 className="mt-2 text-[23px] font-medium leading-tight">Today&apos;s policy edge</h2>
                      <p className="mt-3 text-[15px] leading-snug text-white/58">
                        Priority-ranked bills, early vote-risk warnings, and movement alerts focused on your district and interests.
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-[#ffb12b]/12 text-[#ffb12b]">
                        <Sparkles className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <span className="rounded-full border border-[#2be68d]/30 bg-[#2be68d]/10 px-2 py-1 text-[11px] font-medium text-[#2be68d]">Live</span>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <ProStatPill label="Priority Queue" value={data.statusCounts.inCommittee} />
                    <ProStatPill label="Risk Watch" value={inProgressCount} />
                    <ProStatPill label="New Movement" value={data.updateCount} />
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-2">
                    <ProInsightRow
                      value={data.statusCounts.inCommittee}
                      label="Priority bill queue"
                      subtitle="Bills with near-term committee movement"
                    />
                    <ProInsightRow value={inProgressCount} label="Vote risk monitor" subtitle="Tracked bills with uncertain floor path" />
                    <ProInsightRow value={data.updateCount} label="Movement alerts" subtitle="New hearings, referrals, and policy shifts" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link
                      href="/search?type=bills&status=in-committee&focus=results"
                      className="flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[14px] font-medium text-white"
                    >
                      Open Priority Feed
                    </Link>
                    <Link
                      href="/search?type=bills&status=in-progress&focus=results"
                      className="flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[14px] font-medium text-white"
                    >
                      Open Risk Watch
                    </Link>
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

            <div className="mt-8 flex items-center justify-between">
              <h2 className="text-[18px] font-medium leading-none">Recent Votes</h2>
              <Link href="/search?type=votes&focus=results" className={mobileViewAllClass}>
                View All
              </Link>
            </div>

            <MobileCard variant="dashboard" className="mt-3 px-3 py-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
                <div className="min-w-0">
                  <h3 className="max-w-[19rem] text-[23px] font-medium leading-tight">{recentVoteBill?.shortTitle ?? recentVote?.question ?? "No recent vote"}</h3>
                  <p className="mt-1 text-[15px] text-white/52">{recentVoteBill?.displayNumber ?? recentVote?.rollCall ?? "Roll call"}</p>
                </div>
                <div className="shrink-0 rounded-full bg-[#2be68d]/10 px-2.5 py-1 text-right text-[14px] font-medium leading-none text-[#2be68d]">{recentVote?.result ?? "Updated"}</div>
              </div>
              <div className="relative mt-1 h-[80px]">
                <div className="pointer-events-none absolute left-[18px] right-[18px] top-0 h-[52px]" aria-hidden="true">
                  <div className="relative h-full w-full">
                  {recentVoteDots.map((dot, index) => (
                    <span
                      key={index}
                      className="absolute h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ left: `${dot.x}%`, top: `${dot.y}%`, backgroundColor: dot.color }}
                    />
                  ))}
                  </div>
                </div>
                <div className="absolute bottom-[2px] left-0 z-10">
                  <div className="text-[20px] font-medium text-[#2ee596]">{recentVoteTotals?.yes ?? 0}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[13px] uppercase text-white/54">
                    Yea <span className="grid h-3.5 w-3.5 place-items-center rounded-full border border-[#2ee596]/55 text-[9px] text-[#2ee596]">✓</span>
                  </div>
                </div>
                <div className="absolute bottom-[2px] right-0 z-10 text-right">
                  <div className="text-[20px] font-medium text-[#ff5747]">{recentVoteTotals?.no ?? 0}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[13px] uppercase text-white/54">
                    Nay <span className="grid h-3.5 w-3.5 place-items-center rounded-full border border-white/28 text-[9px] text-white/54">×</span>
                  </div>
                </div>
              </div>
            </MobileCard>

            <div className="mt-8 flex items-center justify-between">
              <h2 className="text-[18px] font-medium leading-none">Bill Tracker</h2>
              <Link href="/search?type=bills&focus=results" className={mobileViewAllClass}>
                View All
              </Link>
            </div>

            <MobileCard variant="dashboard" className="mt-3 px-3 py-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
                <div className="min-w-0">
                  <h3 className="max-w-[19rem] text-[23px] font-medium leading-tight">{trackedBill?.shortTitle ?? "Tracked Bill"}</h3>
                  <p className="mt-1 text-[15px] text-white/52">{trackedBill?.displayNumber ?? "Bill"}</p>
                </div>
                <div className={`shrink-0 rounded-full px-2.5 py-1 text-right text-[14px] font-medium leading-none ${trackerStagePill.bgClass} ${trackerStagePill.textClass}`}>
                  {trackerStage}
                </div>
              </div>
              <div className="mt-1.5 rounded-lg border border-white/8 bg-white/[0.03] px-2 py-1">
                <div className="relative h-5">
                  <div className="absolute left-0 right-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-white/13" />
                  <div className="absolute left-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-[#ffbd39]" style={{ width: `${trackerFillPercent}%` }} />
                  {[0, 33.33, 66.66, 100].map((left, index) => (
                    <span
                      key={left}
                      className={`absolute top-1/2 h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full ${index <= trackerStageIndex ? "bg-[#ffbd39]" : "border-[1.5px] border-white/13 bg-[#07172d]"}`}
                      style={{ left: `${left}%` }}
                    >
                      {index <= trackerStageIndex ? <span className="absolute left-1/2 top-1/2 h-[4px] w-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#06152b]" /> : null}
                    </span>
                  ))}
                </div>
                <div className="mt-0.5 grid grid-cols-4 text-center text-[9px] leading-snug">
                  {billTrackerStages.map((stage, index) => (
                    <span key={stage} className={index <= trackerStageIndex ? "text-white/82" : "text-white/42"}>
                      {stage}
                    </span>
                  ))}
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

function StatusCountLink({ color, href, label, value }: { color: string; href: string; label: string; value: number }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-white/8 bg-white/[0.035] px-2 py-2 text-left transition hover:bg-white/[0.06]"
      aria-label={`View ${label.toLowerCase()} bills`}
    >
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[16px] font-medium leading-none text-white">{value}</span>
      </div>
      <div className="mt-1 truncate text-[11px] font-medium text-white/58">{label}</div>
    </Link>
  );
}

function ProInsightRow({ label, subtitle, value }: { label: string; subtitle: string; value: number }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-3">
      <div className="min-w-0">
        <div className="text-[14px] font-medium leading-tight text-white">{label}</div>
        <div className="mt-1 text-[12px] leading-snug text-white/50">{subtitle}</div>
      </div>
      <div className="shrink-0 text-[23px] font-medium leading-none text-[#ffb12b]">{value}</div>
    </div>
  );
}

function ProStatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.04] px-2 py-2 text-center">
      <div className="text-[20px] font-medium leading-none text-[#ffb12b]">{value}</div>
      <div className="mt-1 truncate text-[11px] font-medium text-white/58">{label}</div>
    </div>
  );
}

function LockedStatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-2 py-2 text-center">
      <div className="text-[18px] font-medium leading-none text-white/82">{value}</div>
      <div className="mt-1 truncate text-[11px] font-medium text-white/50">{label}</div>
    </div>
  );
}

function LockedProRow({ label, subtitle }: { label: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
      <div className="text-[14px] font-medium leading-tight text-white/82">{label}</div>
      <div className="mt-1 text-[12px] leading-snug text-white/50">{subtitle}</div>
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
