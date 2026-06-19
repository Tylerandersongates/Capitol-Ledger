"use client";

import Link from "next/link";
import { ArrowLeft, Bell, CalendarClock, FileText, Home, Search, Settings, ShieldAlert, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass } from "@/components/mobile-ui";
import {
  billStanceChangedEvent,
  isRiskWatchBillStance,
  readBillStances,
  resolveBillStanceStorageKey,
  type BillStance
} from "@/lib/browser-bill-stances";
import {
  getPolicyEdgeBillKey,
  getPolicyEdgeScore,
  isRecentBillAction,
  rankPolicyEdgeBills,
  type PolicyEdgeFeedMode
} from "@/lib/policy-edge-ranking";
import { formatDate } from "@/lib/utils";
import type { Bill } from "@/types/capitol";

type PolicyEdgeFeedProps = {
  bills: Bill[];
  generatedAt: string;
  locked?: boolean;
  mode: PolicyEdgeFeedMode;
  personalRiskOnly?: boolean;
  sponsorNamesByBillId?: Record<string, string>;
};

const panelClass =
  "rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.22)_0%,rgba(7,23,50,0.68)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(2,10,28,0.22)]";
const metricClass =
  "rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(25,73,130,0.28)_0%,rgba(6,22,49,0.72)_100%)] px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_10px_24px_rgba(1,8,24,0.3)]";

const feedConfig = {
  priority: {
    actionLabel: "Open Bill",
    badge: "Priority",
    deck: "Bills with committee activity, recent movement, and near-term accountability signals.",
    empty: "No committee-priority bills are active right now.",
    icon: Sparkles,
    metricLabel: "Priority",
    title: "Priority Feed",
    tone: "text-[#ffb12b]"
  },
  risk: {
    actionLabel: "Review Risk",
    badge: "Watch",
    deck: "Bills you oppose or are watching, ranked so you can decide whether action is needed.",
    empty: "No opposed or watching bills are in your Risk Watch yet.",
    icon: ShieldAlert,
    metricLabel: "Risk",
    title: "Risk Watch",
    tone: "text-[#ff6f61]"
  }
} as const;

export function PolicyEdgeFeed({ bills, generatedAt, locked = false, mode, personalRiskOnly = false, sponsorNamesByBillId = {} }: PolicyEdgeFeedProps) {
  const config = feedConfig[mode];
  const Icon = config.icon;
  const [riskStances, setRiskStances] = useState<Record<string, BillStance> | null>(personalRiskOnly ? null : {});
  const rankedBills = useMemo(() => rankPolicyEdgeBills(bills, mode), [bills, mode]);
  const riskBillKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!personalRiskOnly || !riskStances) return keys;

    bills.forEach((bill) => {
      if (isRiskWatchBillStance(riskStances[bill.id])) {
        keys.add(getPolicyEdgeBillKey(bill));
      }
    });

    return keys;
  }, [bills, personalRiskOnly, riskStances]);
  const visibleBills = useMemo(() => {
    if (!personalRiskOnly) return rankedBills;
    if (!riskStances) return [];

    return rankedBills.filter((bill) => isRiskWatchBillStance(riskStances[bill.id]) || riskBillKeys.has(getPolicyEdgeBillKey(bill)));
  }, [personalRiskOnly, rankedBills, riskBillKeys, riskStances]);
  const isLoadingPersonalRisk = personalRiskOnly && riskStances === null;
  const recentCount = visibleBills.filter((bill) => isRecentBillAction(bill.latestActionDate)).length;
  const topAreaCount = new Set(visibleBills.map((bill) => bill.policyArea).filter(Boolean)).size;

  useEffect(() => {
    if (!personalRiskOnly || locked) return;
    let active = true;
    let activeStorageKey = "";

    function refreshStances() {
      if (!activeStorageKey || !active) return;
      setRiskStances(readBillStances(activeStorageKey));
    }

    resolveBillStanceStorageKey().then((storageKey) => {
      if (!active) return;
      activeStorageKey = storageKey;
      refreshStances();
    });

    window.addEventListener("storage", refreshStances);
    window.addEventListener("focus", refreshStances);
    window.addEventListener("pageshow", refreshStances);
    window.addEventListener(billStanceChangedEvent, refreshStances);

    return () => {
      active = false;
      window.removeEventListener("storage", refreshStances);
      window.removeEventListener("focus", refreshStances);
      window.removeEventListener("pageshow", refreshStances);
      window.removeEventListener(billStanceChangedEvent, refreshStances);
    };
  }, [locked, personalRiskOnly]);

  return (
    <MobileShell
      ambientClassName="bg-[radial-gradient(circle_at_18%_8%,rgba(43,122,203,0.13),transparent_32%),radial-gradient(circle_at_84%_8%,rgba(255,177,43,0.08),transparent_28%),linear-gradient(180deg,rgba(2,10,24,0.16)_0%,rgba(2,9,23,0.58)_54%,rgba(1,6,18,0.82)_100%)]"
      backgroundClassName="bg-[linear-gradient(180deg,#071a34_0%,#041229_30%,#020b1d_68%,#010817_100%)]"
      contentClassName="px-8 pb-5 pt-8"
      minHeight="min-h-[1080px]"
      statusBarClassName="flex items-center justify-between px-3 text-[17px] font-semibold"
    >
      <header className="mt-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className={mobileIconButtonClass} aria-label="Back to dashboard">
            <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
          </Link>
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">Policy Edge</div>
            <h1 className="mt-2 text-[30px] font-medium leading-none text-white">{config.title}</h1>
          </div>
        </div>
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 ${config.tone} shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.16)]`}>
          <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </header>

      <main className="mt-7 space-y-5 pb-8">
        <MobileCard variant="dashboard" className="relative overflow-hidden px-5 py-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(56,146,255,0.18),transparent_34%),radial-gradient(circle_at_86%_8%,rgba(255,177,43,0.1),transparent_30%)]" />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={`text-[13px] font-semibold uppercase tracking-[0.12em] ${config.tone}`}>{config.badge}</div>
                <h2 className="mt-2 text-[24px] font-semibold leading-tight text-white">{config.deck}</h2>
              </div>
              <span className="rounded-full border border-[#2be68d]/30 bg-[#2be68d]/10 px-2.5 py-1 text-[11px] font-medium text-[#2be68d]">Live</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <FeedMetric label={config.metricLabel} value={visibleBills.length} />
              <FeedMetric label="Recent" value={recentCount} />
              <FeedMetric label="Areas" value={topAreaCount} />
            </div>
            <div className="mt-4 flex items-center gap-2 text-[12px] font-medium text-white/44">
              <CalendarClock className="h-4 w-4 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
              Updated {formatDate(generatedAt)}
            </div>
          </div>
        </MobileCard>

        {locked ? <LockedPolicyEdgeCard title={config.title} /> : null}

        {!locked && isLoadingPersonalRisk ? (
          <div className={`${panelClass} p-5 text-[14px] leading-snug text-white/56`}>Checking your saved bill stances...</div>
        ) : null}

        {!locked && !isLoadingPersonalRisk && visibleBills.length ? (
          <div className="space-y-3">
            {visibleBills.slice(0, 12).map((bill, index) => (
              <PolicyEdgeBillRow key={bill.id} actionLabel={config.actionLabel} bill={bill} index={index} mode={mode} sponsorName={sponsorNamesByBillId[bill.id]} />
            ))}
          </div>
        ) : null}

        {!locked && !isLoadingPersonalRisk && !visibleBills.length ? <div className={`${panelClass} p-5 text-[14px] leading-snug text-white/56`}>{config.empty}</div> : null}
      </main>

      <MobileBottomNav
        items={[
          { active: true, href: "/dashboard", icon: <Home />, label: "Home" },
          { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { href: "/search", icon: <Search />, label: "Search" },
          { href: "/alerts", icon: <Bell />, label: "Alerts" },
          { href: "/settings", icon: <Settings />, label: "Settings" }
        ]}
      />
    </MobileShell>
  );
}

function FeedMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className={metricClass}>
      <div className="text-[22px] font-semibold leading-none text-[#ffb12b]">{value}</div>
      <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-white/48">{label}</div>
    </div>
  );
}

function LockedPolicyEdgeCard({ title }: { title: string }) {
  return (
    <MobileCard variant="dashboard" className="px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">Pro Intelligence</div>
          <h2 className="mt-2 text-[22px] font-semibold leading-tight text-white">{title} locked</h2>
          <p className="mt-2 text-[14px] leading-snug text-white/56">Upgrade to Pro or Team to open ranked policy intelligence.</p>
        </div>
        <Link href="/upgrade" className="rounded-full border border-[#ffb12b]/28 bg-[#ffb12b]/10 px-3 py-1.5 text-[12px] font-semibold text-[#ffb12b]">
          Upgrade
        </Link>
      </div>
    </MobileCard>
  );
}

function PolicyEdgeBillRow({ actionLabel, bill, index, mode, sponsorName }: { actionLabel: string; bill: Bill; index: number; mode: PolicyEdgeFeedMode; sponsorName?: string }) {
  const status = getPolicyEdgeBillStatus(bill);
  const score = getPolicyEdgeScore(bill, mode);
  const toneClass = mode === "priority" ? "text-[#ffb12b]" : "text-[#ff6f61]";

  return (
    <Link href={`/bills/${bill.id}`} className={`block p-4 transition hover:brightness-110 ${panelClass}`}>
      <div className="grid grid-cols-[42px_minmax(0,1fr)_auto] gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-[13px] font-semibold text-white/68">
          {index + 1}
        </div>
        <div className="min-w-0">
          <div className={`text-[12px] font-semibold uppercase tracking-[0.08em] ${toneClass}`}>{bill.displayNumber}</div>
          <div className="mt-1 line-clamp-2 text-[16px] font-medium leading-snug text-white">{bill.shortTitle}</div>
          <div className="mt-2 text-[13px] leading-snug text-white/52">
            {sponsorName ?? "Congress"} - {bill.policyArea}
          </div>
        </div>
        <span className={`h-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold ${mode === "priority" ? "border-[#ffb12b]/28 bg-[#ffb12b]/10 text-[#ffb12b]" : "border-[#ff6f61]/28 bg-[#ff6f61]/10 text-[#ff8a7e]"}`}>
          {score}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
        <div className="min-w-0 rounded-xl border border-white/8 bg-[#071a38]/55 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/42">{status}</div>
          <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-white/58">{bill.latestActionText}</p>
        </div>
        <span className="flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] px-3 text-[12px] font-semibold text-white/72">
          {actionLabel}
        </span>
      </div>
    </Link>
  );
}

function getPolicyEdgeBillStatus(bill: Bill) {
  const action = bill.latestActionText.toLowerCase();

  if (action.includes("enacted")) return "Enacted";
  if (action.includes("passed")) return "Passed";
  if (action.includes("committee") || action.includes("hearing") || action.includes("reported")) return "In Committee";
  if (action.includes("calendar") || action.includes("floor")) return "On Floor";
  return "In Progress";
}
