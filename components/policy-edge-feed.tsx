"use client";

import Link from "next/link";
import { ArrowLeft, Bell, CalendarClock, FileText, Home, Search, Settings, ShieldAlert, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass } from "@/components/mobile-ui";
import {
  followsChangedEvent,
  hydrateAccountLedgerFromAccount,
  interestsKey,
  persistenceEvent,
  readSavedFollowRecords,
  readStringList
} from "@/lib/browser-account-ledger";
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
import type { Bill, SavedFollowRecord } from "@/types/capitol";

type PolicyEdgeFeedProps = {
  bills: Bill[];
  generatedAt: string;
  locked?: boolean;
  mode: PolicyEdgeFeedMode;
  personalPriorityOnly?: boolean;
  personalRiskOnly?: boolean;
  sponsorNamesByBillId?: Record<string, string>;
};

type PriorityFeedSignals = {
  issueInterests: string[];
  savedFollows: SavedFollowRecord[];
};

const panelClass =
  "rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.22)_0%,rgba(7,23,50,0.68)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(2,10,28,0.22)]";
const metricClass =
  "rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(25,73,130,0.28)_0%,rgba(6,22,49,0.72)_100%)] px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_10px_24px_rgba(1,8,24,0.3)]";

const feedConfig = {
  priority: {
    actionLabel: "Open Bill",
    badge: "Priority",
    deck: "Supported, aligned, and saved-official bills with meaningful movement.",
    empty: "No supported or aligned bills need priority attention right now.",
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

export function PolicyEdgeFeed({
  bills,
  generatedAt,
  locked = false,
  mode,
  personalPriorityOnly = false,
  personalRiskOnly = false,
  sponsorNamesByBillId = {}
}: PolicyEdgeFeedProps) {
  const config = feedConfig[mode];
  const Icon = config.icon;
  const needsPersonalSignals = personalPriorityOnly || personalRiskOnly;
  const [billStances, setBillStances] = useState<Record<string, BillStance> | null>(needsPersonalSignals ? null : {});
  const [prioritySignals, setPrioritySignals] = useState<PriorityFeedSignals | null>(personalPriorityOnly ? null : emptyPriorityFeedSignals);
  const rankedBills = useMemo(() => rankPolicyEdgeBills(bills, mode), [bills, mode]);
  const supportedBillKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!personalPriorityOnly || !billStances) return keys;

    bills.forEach((bill) => {
      if (billStances[bill.id] === "support") {
        keys.add(getPolicyEdgeBillKey(bill));
      }
    });

    return keys;
  }, [billStances, bills, personalPriorityOnly]);
  const riskBillKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!needsPersonalSignals || !billStances) return keys;

    bills.forEach((bill) => {
      if (isRiskWatchBillStance(billStances[bill.id])) {
        keys.add(getPolicyEdgeBillKey(bill));
      }
    });

    return keys;
  }, [billStances, bills, needsPersonalSignals]);
  const savedBillKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!personalPriorityOnly || !prioritySignals) return keys;

    const savedBillIds = getSavedFollowIds(prioritySignals.savedFollows, "bill");
    bills.forEach((bill) => {
      if (savedBillIds.has(bill.id)) {
        keys.add(getPolicyEdgeBillKey(bill));
      }
    });

    return keys;
  }, [bills, personalPriorityOnly, prioritySignals]);
  const visibleBills = useMemo(() => {
    if (personalPriorityOnly) {
      if (!billStances || !prioritySignals) return [];

      const savedBillIds = getSavedFollowIds(prioritySignals.savedFollows, "bill");
      const savedMemberIds = getSavedFollowIds(prioritySignals.savedFollows, "member");

      return rankedBills.filter((bill) =>
        isPriorityFeedBill(bill, {
          billStance: billStances[bill.id],
          issueInterests: prioritySignals.issueInterests,
          riskBillKeys,
          savedBillIds,
          savedBillKeys,
          savedMemberIds,
          supportedBillKeys
        })
      );
    }

    if (!personalRiskOnly) return rankedBills;
    if (!billStances) return [];

    return rankedBills.filter((bill) => isRiskWatchBillStance(billStances[bill.id]) || riskBillKeys.has(getPolicyEdgeBillKey(bill)));
  }, [billStances, personalPriorityOnly, personalRiskOnly, prioritySignals, rankedBills, riskBillKeys, savedBillKeys, supportedBillKeys]);
  const isLoadingPersonalRisk = personalRiskOnly && billStances === null;
  const isLoadingPersonalPriority = personalPriorityOnly && (billStances === null || prioritySignals === null);
  const isLoadingPersonalFeed = isLoadingPersonalPriority || isLoadingPersonalRisk;
  const recentCount = visibleBills.filter((bill) => isRecentBillAction(bill.latestActionDate)).length;
  const topAreaCount = new Set(visibleBills.map((bill) => bill.policyArea).filter(Boolean)).size;

  useEffect(() => {
    if (!needsPersonalSignals || locked) return;
    let active = true;
    let activeStorageKey = "";

    function refreshPersonalSignals() {
      if (!active) return;
      if (activeStorageKey) setBillStances(readBillStances(activeStorageKey));
      if (personalPriorityOnly) setPrioritySignals(readPriorityFeedSignals());
    }

    resolveBillStanceStorageKey().then((storageKey) => {
      if (!active) return;
      activeStorageKey = storageKey;
      refreshPersonalSignals();
    });

    if (personalPriorityOnly) {
      refreshPersonalSignals();
      hydrateAccountLedgerFromAccount().then(() => refreshPersonalSignals());
    }

    window.addEventListener("storage", refreshPersonalSignals);
    window.addEventListener("focus", refreshPersonalSignals);
    window.addEventListener("pageshow", refreshPersonalSignals);
    window.addEventListener(billStanceChangedEvent, refreshPersonalSignals);
    window.addEventListener(followsChangedEvent, refreshPersonalSignals);
    window.addEventListener(persistenceEvent, refreshPersonalSignals);

    return () => {
      active = false;
      window.removeEventListener("storage", refreshPersonalSignals);
      window.removeEventListener("focus", refreshPersonalSignals);
      window.removeEventListener("pageshow", refreshPersonalSignals);
      window.removeEventListener(billStanceChangedEvent, refreshPersonalSignals);
      window.removeEventListener(followsChangedEvent, refreshPersonalSignals);
      window.removeEventListener(persistenceEvent, refreshPersonalSignals);
    };
  }, [locked, needsPersonalSignals, personalPriorityOnly]);

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

        {!locked && isLoadingPersonalFeed ? (
          <div className={`${panelClass} p-5 text-[14px] leading-snug text-white/56`}>
            {personalPriorityOnly ? "Checking your supported bills and civic interests..." : "Checking your saved bill stances..."}
          </div>
        ) : null}

        {!locked && !isLoadingPersonalFeed && visibleBills.length ? (
          <div
            aria-label={`${config.title} bills`}
            className="h-[340px] overflow-y-auto overscroll-contain rounded-[1.35rem] border border-white/10 bg-[#03152f]/55 p-1 pr-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_0_28px_rgba(43,141,255,0.08),0_16px_34px_rgba(1,8,24,0.26)] [scrollbar-color:rgba(255,177,43,0.68)_rgba(255,255,255,0.06)] [scrollbar-width:thin] sm:h-[420px]"
            role="region"
          >
            <div className="space-y-3 pb-1">
              {visibleBills.slice(0, 12).map((bill, index) => (
                <PolicyEdgeBillRow key={bill.id} actionLabel={config.actionLabel} bill={bill} index={index} mode={mode} sponsorName={sponsorNamesByBillId[bill.id]} />
              ))}
            </div>
          </div>
        ) : null}

        {!locked && !isLoadingPersonalFeed && !visibleBills.length ? <div className={`${panelClass} p-5 text-[14px] leading-snug text-white/56`}>{config.empty}</div> : null}
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

const emptyPriorityFeedSignals: PriorityFeedSignals = {
  issueInterests: [],
  savedFollows: []
};

type PriorityFeedBillInput = {
  billStance?: BillStance;
  issueInterests: string[];
  riskBillKeys: Set<string>;
  savedBillIds: Set<string>;
  savedBillKeys: Set<string>;
  savedMemberIds: Set<string>;
  supportedBillKeys: Set<string>;
};

function readPriorityFeedSignals(): PriorityFeedSignals {
  return {
    issueInterests: readStringList(interestsKey),
    savedFollows: readSavedFollowRecords()
  };
}

function isPriorityFeedBill(bill: Bill, input: PriorityFeedBillInput) {
  const billKey = getPolicyEdgeBillKey(bill);

  if (isRiskWatchBillStance(input.billStance)) return false;
  if (input.billStance === "support" || input.supportedBillKeys.has(billKey)) return true;
  if (input.riskBillKeys.has(billKey)) return false;

  if (isPriorityMovementBill(bill) && (input.savedBillIds.has(bill.id) || input.savedBillKeys.has(billKey))) return true;
  if (isPriorityMovementBill(bill) && bill.sponsorBioguideId && input.savedMemberIds.has(bill.sponsorBioguideId)) return true;
  if (isPriorityMovementBill(bill) && matchesIssueInterests(bill, input.issueInterests)) return true;

  return false;
}

function isPriorityMovementBill(bill: Bill) {
  const action = bill.latestActionText.toLowerCase();

  return (
    isRecentBillAction(bill.latestActionDate) ||
    action.includes("reported") ||
    action.includes("ordered to be reported") ||
    action.includes("hearing") ||
    action.includes("markup") ||
    action.includes("committee") ||
    action.includes("subcommittee") ||
    action.includes("calendar") ||
    action.includes("floor") ||
    action.includes("passed") ||
    action.includes("received in")
  );
}

function getSavedFollowIds(follows: SavedFollowRecord[], type: SavedFollowRecord["type"]) {
  return new Set(follows.filter((follow) => follow.type === type).map((follow) => follow.id));
}

function matchesIssueInterests(bill: Bill, issueInterests: string[]) {
  if (!issueInterests.length) return false;

  const billText = normalizePriorityText([bill.policyArea, bill.shortTitle, bill.title, bill.summary, bill.latestActionText].join(" "));

  return issueInterests.some((interest) => {
    const normalizedInterest = normalizePriorityText(interest);
    if (!normalizedInterest) return false;
    if (billText.includes(normalizedInterest)) return true;

    const tokens = normalizedInterest.split(" ").filter((token) => token.length >= 4);
    return tokens.length > 0 && tokens.some((token) => billText.includes(token));
  });
}

function normalizePriorityText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
