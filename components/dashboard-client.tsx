"use client";

import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";
import { PlanFeatureGate } from "@/components/subscription-controls";
import { VoteSpreadPanel } from "@/components/vote-spread-panel";
import {
  gamificationChangedEvent,
  hydrateGamificationFromAccount,
  readLocalGamificationSnapshot,
  recordCompletedDistrictSetupIfReady
} from "@/lib/browser-gamification";
import { accountProfileChangedEvent, fetchAccountProfile } from "@/lib/browser-account-profile";
import { hasActiveBrowserSession } from "@/lib/browser-auth-state";
import { getImpactActions, type ImpactActionId } from "@/lib/gamification";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  CalendarClock,
  ChevronRight,
  FileText,
  Home,
  LockKeyhole,
  Sparkles,
  Star,
  Settings,
  UserRound,
  UsersRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getDefaultAccountGamification, type AccountGamificationSnapshot } from "@/lib/account-gamification";
import type { getDashboardData } from "@/lib/data";
import type {
  AccountLedgerSnapshot,
  AccountProfileSnapshot,
  FollowTargetType,
  SavedFollowRecord
} from "@/types/capitol";

type DashboardData = ReturnType<typeof getDashboardData>;
type DashboardFavoriteItem = {
  id: string;
  href: string;
  label: string;
  meta: string;
  type: FollowTargetType;
};

const followsKey = "capitol-ledger:follows";
const accountLedgerEndpoint = "/api/account/ledger";
const readAlertsChangedEvent = "capitol-ledger:read-alerts-changed";
const persistenceEvent = "capitol-ledger:persistence-changed";
const followsChangedEvent = "capitol-ledger:follows-changed";
const billTrackerStages = ["Introduced", "In Committee", "On Floor", "Passed"] as const;
const gamificationCategories = [
  { href: "/impact", label: "Civic Score" },
  { href: "/impact", label: "Day Streak" },
  { href: "/badges", label: "Badges" },
  { href: "/impact", label: "Impact Actions" }
] as const;
const impactCategoryHrefs: Record<ImpactActionId, string> = {
  "bills-tracked": "/search?type=bills",
  "letters-sent": "/letters#letters",
  "petitions-signed": "/letters#petitions",
  "votes-cast": "/impact#election-participation"
};
const dashboardCardAccentClass =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(56,146,255,0.18),transparent_34%),radial-gradient(circle_at_86%_8%,rgba(255,177,43,0.1),transparent_30%)]";
const dashboardInnerPanelClass =
  "rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(23,67,121,0.34)_0%,rgba(5,19,43,0.72)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_28px_rgba(1,8,24,0.36)]";
const dashboardMetricPanelClass =
  "rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(25,73,130,0.28)_0%,rgba(6,22,49,0.72)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_10px_24px_rgba(1,8,24,0.3)]";

type BillTrackerStage = (typeof billTrackerStages)[number];

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
  const [, setUnreadAlertCount] = useState(0);
  const [favoriteRecords, setFavoriteRecords] = useState<SavedFollowRecord[]>([]);
  const [gamificationSnapshot, setGamificationSnapshot] = useState<AccountGamificationSnapshot>(() => getDefaultAccountGamification());
  const [accountProfile, setAccountProfile] = useState<AccountProfileSnapshot | null>(null);
  const selectedVoteFeed = useMemo(
    () => resolveDashboardVoteFeed(data.voteFeed, favoriteRecords, data.favoriteTargets, accountProfile),
    [accountProfile, data.favoriteTargets, data.voteFeed, favoriteRecords]
  );
  const recentVoteBill = selectedVoteFeed?.bill;
  const recentVote = selectedVoteFeed?.vote;
  const recentVoteTotals = selectedVoteFeed?.totals;
  const recentVoteSourceLabel = selectedVoteFeed?.sourceLabel ?? "Congress feed";
  const trackedBill = useMemo(() => {
    const savedBill = favoriteRecords.find((record) => record.type === "bill");
    if (!savedBill) return undefined;
    return data.favoriteTargets.bills.find((bill) => bill.id === savedBill.id);
  }, [data.favoriteTargets.bills, favoriteRecords]);
  const hasTrackedBill = Boolean(trackedBill);
  const trackerStage = resolveBillTrackerStage(trackedBill?.latestActionText);
  const trackerStageIndex = Math.max(0, billTrackerStages.indexOf(trackerStage));
  const trackerFillPercent = (trackerStageIndex / (billTrackerStages.length - 1)) * 100;
  const trackerCompletion = Math.round(trackerFillPercent);
  const trackerProgressStep = `${trackerStageIndex + 1}/${billTrackerStages.length}`;
  const trackerStagePill = getBillTrackerStagePill(trackerStage);
  const inProgressCount = data.statusCounts.inProgress || Math.max(0, data.billsInAction - data.statusCounts.passed - data.statusCounts.inCommittee);
  const passedPercent = data.billsInAction ? (data.statusCounts.passed / data.billsInAction) * 100 : 0;
  const committeePercent = data.billsInAction ? (data.statusCounts.inCommittee / data.billsInAction) * 100 : 0;
  const inProgressPercent = data.billsInAction ? (inProgressCount / data.billsInAction) * 100 : 0;
  const impactCategories = useMemo(() => getImpactActions(gamificationSnapshot.eventCounts), [gamificationSnapshot.eventCounts]);
  const resolvedFavoriteItems = useMemo(
    () => resolveDashboardFavorites(favoriteRecords, data.favoriteTargets, accountProfile),
    [accountProfile, data.favoriteTargets, favoriteRecords]
  );
  const favoriteItems = resolvedFavoriteItems.slice(0, 3);
  const suggestedFavorites = useMemo(() => getSuggestedDashboardFavorites(data.favoriteTargets, favoriteRecords, accountProfile).slice(0, 2), [accountProfile, data.favoriteTargets, favoriteRecords]);
  const visibleFavorites = favoriteItems.length ? favoriteItems : suggestedFavorites;
  const showingSavedFavorites = favoriteItems.length > 0;

  useEffect(() => {
    let active = true;

    async function refreshFromAccount() {
      const ledger = await readDashboardAccountLedger();
      if (active) setUnreadAlertCount(countAccountUnreadAlertIds(ledger));
    }

    void refreshFromAccount();
    window.addEventListener(readAlertsChangedEvent, refreshFromAccount);
    window.addEventListener("storage", refreshFromAccount);
    window.addEventListener("focus", refreshFromAccount);
    window.addEventListener("pageshow", refreshFromAccount);

    return () => {
      active = false;
      window.removeEventListener(readAlertsChangedEvent, refreshFromAccount);
      window.removeEventListener("storage", refreshFromAccount);
      window.removeEventListener("focus", refreshFromAccount);
      window.removeEventListener("pageshow", refreshFromAccount);
    };
  }, []);

  useEffect(() => {
    if (!accountProfile?.districtCode) return;

    const next = mergeDistrictDelegationFavoriteRecords(favoriteRecords, data.favoriteTargets, accountProfile);
    if (favoriteRecordsMatch(favoriteRecords, next)) return;

    setFavoriteRecords(writeDashboardFavoriteRecords(next));
  }, [accountProfile, data.favoriteTargets, favoriteRecords]);

  useEffect(() => {
    let active = true;

    async function refreshFromAccount() {
      const records = await hydrateDashboardFavoriteRecords();
      if (active) setFavoriteRecords(records);
    }

    void refreshFromAccount();
    window.addEventListener("storage", refreshFromAccount);
    window.addEventListener(persistenceEvent, refreshFromAccount);
    window.addEventListener(followsChangedEvent, refreshFromAccount);

    return () => {
      active = false;
      window.removeEventListener("storage", refreshFromAccount);
      window.removeEventListener(persistenceEvent, refreshFromAccount);
      window.removeEventListener(followsChangedEvent, refreshFromAccount);
    };
  }, []);

  function toggleFavorite(item: DashboardFavoriteItem) {
    const next = toggleDashboardFavoriteRecord({ id: item.id, type: item.type });
    setFavoriteRecords(next);
  }

  useEffect(() => {
    let active = true;

    async function refreshAccountProfile() {
      const profile = await fetchAccountProfile();
      if (active) setAccountProfile(profile);
    }

    void refreshAccountProfile();

    window.addEventListener(accountProfileChangedEvent, refreshAccountProfile);
    window.addEventListener("focus", refreshAccountProfile);

    return () => {
      active = false;
      window.removeEventListener(accountProfileChangedEvent, refreshAccountProfile);
      window.removeEventListener("focus", refreshAccountProfile);
    };
  }, []);

  useEffect(() => {
    let active = true;

    function refreshLocalGamification() {
      recordCompletedDistrictSetupIfReady();
      if (active) setGamificationSnapshot(readLocalGamificationSnapshot());
    }

    async function refreshAccountGamification() {
      const repairedBeforeHydration = recordCompletedDistrictSetupIfReady();
      if (active) setGamificationSnapshot(readLocalGamificationSnapshot());

      const next = await hydrateGamificationFromAccount();
      const repairedAfterHydration = recordCompletedDistrictSetupIfReady();
      const repairedSnapshot = repairedBeforeHydration || repairedAfterHydration ? readLocalGamificationSnapshot() : next;
      if (active) setGamificationSnapshot(repairedSnapshot);
    }

    void refreshAccountGamification();

    window.addEventListener("storage", refreshLocalGamification);
    window.addEventListener("focus", refreshAccountGamification);
    window.addEventListener("pageshow", refreshAccountGamification);
    window.addEventListener(gamificationChangedEvent, refreshLocalGamification);

    return () => {
      active = false;
      window.removeEventListener("storage", refreshLocalGamification);
      window.removeEventListener("focus", refreshAccountGamification);
      window.removeEventListener("pageshow", refreshAccountGamification);
      window.removeEventListener(gamificationChangedEvent, refreshLocalGamification);
    };
  }, []);

  return (
    <MobileShell
      ambientClassName="bg-[radial-gradient(circle_at_16%_8%,rgba(48,129,214,0.14),transparent_32%),radial-gradient(circle_at_84%_8%,rgba(255,177,43,0.09),transparent_30%),linear-gradient(180deg,rgba(2,10,24,0.12)_0%,rgba(1,8,21,0.62)_56%,rgba(1,6,18,0.9)_100%)]"
      backgroundClassName="bg-[linear-gradient(180deg,#071a34_0%,#041226_36%,#020b1c_72%,#010716_100%)]"
      minHeight="min-h-[1320px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
            <header className="mt-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative grid h-[96px] w-[96px] shrink-0 place-items-center rounded-full border-2 border-[#d59a31]/80 bg-[radial-gradient(circle,rgba(255,177,43,0.18)_0%,rgba(28,102,180,0.22)_40%,rgba(4,17,39,0.94)_72%)] shadow-[inset_0_1px_0_rgba(255,210,120,0.22),0_0_26px_rgba(255,177,43,0.24),0_0_34px_rgba(35,132,255,0.12)]">
                  <span className="absolute inset-[-6px] rounded-full border border-[#ffb12b]/42" />
                  <Image
                    src="/capitol-ledger-logo.png"
                    alt=""
                    width={92}
                    height={92}
                    className="h-[90px] w-[90px] rounded-full object-cover"
                  />
                </div>
                <div className="whitespace-nowrap text-[16px] font-semibold uppercase tracking-[0.2em] text-white/86">
                  Capitol <span className="text-brass">Ledger</span>
                </div>
              </div>
              <Link
                href="/profile"
                className={`relative ${mobileIconButtonClass}`}
                aria-label="Open profile"
              >
                <UserRound className="h-7 w-7" strokeWidth={1.9} aria-hidden="true" />
              </Link>
            </header>

            <div className="mt-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">Command Center</div>
                <h1 className="mt-1 text-[24px] font-semibold leading-tight text-white">Civic Dashboard</h1>
              </div>
              <Link href="/search?focus=results" className={mobileViewAllClass}>
                View All
              </Link>
            </div>

            <MobileCard variant="dashboard" className="relative mt-7 overflow-hidden px-5 py-5">
              <div className={dashboardCardAccentClass} />
              <div className="relative z-10">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#ffb12b]">
                      <FileText className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      Live docket
                    </div>
                    <h2 className="mt-2 max-w-[19rem] text-[26px] font-semibold leading-tight">Today in Congress</h2>
                    <p className="mt-2 text-[17px] text-white/62">{data.billsInAction} bills moving through the ledger</p>
                  </div>
                  <Link
                    href="/search?type=bills&focus=results"
                    className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-[16px] font-medium leading-none text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-white/10"
                    aria-label={`Open ${data.updateCount} live docket bill results`}
                  >
                    <span>{data.updateCount}</span>
                    <ChevronRight className="h-5 w-5 text-white/46" aria-hidden="true" />
                  </Link>
                </div>
                <div className={`${dashboardInnerPanelClass} mt-5 px-3 py-3`}>
                  <div className="flex h-3 overflow-hidden rounded-full bg-[#06152d] shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)]">
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
                  <div className="mt-3 grid grid-cols-3 gap-2">
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
              </div>
            </MobileCard>

            <MobileCard variant="dashboard" className="relative mt-5 overflow-hidden px-4 py-4">
              <div className={dashboardCardAccentClass} />
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-white/50">
                      <span className="grid h-8 w-8 place-items-center rounded-xl border border-[#ffb12b]/22 bg-[#ffb12b]/10 text-[#ffb12b]">
                        <Star className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      Favorites
                    </div>
                    <h2 className="mt-2 text-[22px] font-semibold leading-tight">Saved civic watchlist</h2>
                  </div>
                  <Link href="/search?type=members&focus=results" className={mobileViewAllClass}>
                    Find
                  </Link>
                </div>
                <div className={`${dashboardInnerPanelClass} mt-3 px-2 py-2`}>
                  <div className="flex items-center justify-between px-1 pb-2">
                    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/48">
                      {showingSavedFavorites ? "Pinned" : "Suggested"}
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-white/52">
                      {resolvedFavoriteItems.length} saved
                    </span>
                  </div>
                  {visibleFavorites.length ? (
                    <div className="grid gap-1.5">
                      {visibleFavorites.map((item) => {
                        const saved = favoriteRecords.some((record) => record.type === item.type && record.id === item.id);

                        return (
                          <div key={`${item.type}-${item.id}`} className="grid min-h-[58px] grid-cols-[36px_minmax(0,1fr)_20px] items-center gap-2 rounded-xl border border-white/8 bg-white/[0.035] px-2 py-2">
                            <button
                              type="button"
                              onClick={() => toggleFavorite(item)}
                              className="grid h-9 w-9 place-items-center rounded-xl border border-[#ffb12b]/22 bg-[#ffb12b]/10 text-[#ffb12b] transition hover:bg-[#ffb12b]/16"
                              aria-label={`${saved ? "Remove favorite" : "Favorite"} ${item.label}`}
                              aria-pressed={saved}
                            >
                              <Star className={`h-[18px] w-[18px] ${saved ? "fill-[#ffb12b]" : ""}`} strokeWidth={1.8} aria-hidden="true" />
                            </button>
                            <Link href={item.href} className="min-w-0 py-1">
                              <span className="block truncate text-[15px] font-medium leading-tight text-white">{item.label}</span>
                              <span className="mt-1 block truncate text-[12px] leading-none text-white/50">{item.meta}</span>
                            </Link>
                            <ChevronRight className="h-5 w-5 text-white/36" strokeWidth={1.8} aria-hidden="true" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/8 bg-white/[0.035] px-3 py-3 text-[13px] leading-snug text-white/58">
                      Finish district setup to see local official suggestions.
                    </div>
                  )}
                </div>
              </div>
            </MobileCard>

            <div className="mt-5">
              <PlanFeatureGate
                feature="aiPolicyLens"
                fallback={
                  <MobileCard variant="dashboard" className="relative overflow-hidden px-4 py-4">
                    <div className={dashboardCardAccentClass} />
                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/45">Locked Preview</div>
                          <h2 className="mt-2 text-[22px] font-semibold leading-tight">Pro intelligence desk</h2>
                          <p className="mt-2 text-[14px] leading-snug text-white/58">
                            Upgrade to unlock ranked priorities, risk flags, and district movement alerts that surface what needs attention first.
                          </p>
                          <Link
                            href="/upgrade"
                            className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/8 px-4 text-[13px] font-medium text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-white/12"
                          >
                            Unlock Pro Intelligence
                          </Link>
                        </div>
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[0_0_22px_rgba(255,177,43,0.16)]">
                          <Sparkles className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                        </span>
                      </div>
                      <details className="group mt-4">
                        <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/48 [&::-webkit-details-marker]:hidden">
                          <span>Preview signals</span>
                          <ChevronRight className="h-4 w-4 transition group-open:rotate-90" strokeWidth={1.8} aria-hidden="true" />
                        </summary>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <LockedStatPill label="Priority Queue" value={`${data.statusCounts.inCommittee}`} />
                          <LockedStatPill label="Risk Watch" value={`${inProgressCount}`} />
                          <LockedStatPill label="New Movement" value={`${data.updateCount}`} />
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2">
                          <LockedProRow label="Priority bill queue" subtitle="Track which bills are most likely to move next." />
                          <LockedProRow label="Vote risk monitor" subtitle="Flag split-vote legislation before floor action." />
                          <LockedProRow label="Movement alerts" subtitle="Spot hearings and amendments sooner." />
                        </div>
                      </details>
                    </div>
                  </MobileCard>
                }
              >
                <MobileCard variant="dashboard" className="relative overflow-hidden px-5 py-5">
                  <div className={dashboardCardAccentClass} />
                  <div className="relative z-10">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#ffb12b]">Pro Intelligence Active</div>
                        <h2 className="mt-2 text-[25px] font-semibold leading-tight">Today&apos;s policy edge</h2>
                        <p className="mt-3 text-[15px] leading-snug text-white/62">
                          Priority-ranked bills, early vote-risk warnings, and movement alerts focused on your district and interests.
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[0_0_22px_rgba(255,177,43,0.16)]">
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
                        className="flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-[14px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      >
                        Open Priority Feed
                      </Link>
                      <Link
                        href="/search?type=bills&status=in-progress&focus=results"
                        className="flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-[14px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      >
                        Open Risk Watch
                      </Link>
                    </div>
                  </div>
                </MobileCard>
              </PlanFeatureGate>
            </div>

            <PlanFeatureGate
              feature="weeklyBrief"
              fallback={
                <MobileCard variant="dashboard" className="relative mt-5 overflow-hidden px-4 py-4">
                  <div className={dashboardCardAccentClass} />
                  <div className="relative z-10">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-white/50">
                          <span className="grid h-8 w-8 place-items-center rounded-xl border border-[#ffb12b]/22 bg-[#ffb12b]/10 text-[#ffb12b]">
                            <LockKeyhole className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                          </span>
                          Weekly brief
                        </div>
                        <h2 className="mt-2 text-[22px] font-semibold leading-tight">Weekly brief locked</h2>
                        <p className="mt-2 text-[14px] leading-snug text-white/58">Upgrade to Pro or Team to open district summaries, saved ledger updates, and priority actions.</p>
                      </div>
                      <Link href="/upgrade" className={mobileViewAllClass}>
                        Upgrade
                      </Link>
                    </div>
                    <div className={`${dashboardInnerPanelClass} mt-3 px-3 py-2.5`}>
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/48">Delivery Queue</div>
                        <span className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-white/52">
                          Closed
                        </span>
                      </div>
                      <div className="mt-2 text-[13px] leading-snug text-white/66">Free accounts keep alerts and dashboard access. Weekly delivery unlocks with premium plans.</div>
                    </div>
                  </div>
                </MobileCard>
              }
            >
              <MobileCard variant="dashboard" className="relative mt-5 overflow-hidden px-4 py-4">
                <div className={dashboardCardAccentClass} />
                <div className="relative z-10">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-white/50">
                      <span className="grid h-8 w-8 place-items-center rounded-xl border border-[#ffb12b]/22 bg-[#ffb12b]/10 text-[#ffb12b]">
                        <CalendarClock className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      Weekly brief
                    </div>
                    <h2 className="mt-2 text-[22px] font-semibold leading-tight">Monday civic summary</h2>
                    <p className="mt-2 text-[14px] leading-snug text-white/58">Delivery status, recent history, and your district watchlist.</p>
                  </div>
                  <Link href="/brief" className={mobileViewAllClass}>
                    Open
                  </Link>
                </div>
                <div className={`${dashboardInnerPanelClass} mt-3 px-3 py-2.5`}>
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/48">Delivery Queue</div>
                    <span className="rounded-full border border-[#2be68d]/35 bg-[#2be68d]/12 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#2be68d]">
                      Active
                    </span>
                  </div>
                  <div className="mt-2 text-[13px] leading-snug text-white/66">Next issue bundles vote recap, committee movement, and district-tailored policy signals.</div>
                  <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                    <BriefMetricPill label="Updates" value={data.updateCount} />
                    <BriefMetricPill label="Committee" value={data.statusCounts.inCommittee} />
                    <BriefMetricPill label="In Action" value={data.billsInAction} />
                  </div>
                </div>
                </div>
              </MobileCard>
            </PlanFeatureGate>

            <div className="mt-8 flex items-center justify-between">
              <h2 className="text-[18px] font-medium leading-none">Latest Vote Feed</h2>
              <Link href="/search?type=votes&focus=results" className={mobileViewAllClass}>
                View All
              </Link>
            </div>

            <MobileCard variant="dashboard" className="relative mt-3 overflow-hidden px-3 py-3">
              <div className={dashboardCardAccentClass} />
              <div className="relative z-10">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
                  <div className="min-w-0">
                    <h3 className="max-w-[19rem] text-[23px] font-semibold leading-tight">{recentVoteBill?.shortTitle ?? recentVote?.question ?? "No recent vote"}</h3>
                    <p className="mt-1 text-[15px] text-white/58">{recentVoteBill?.displayNumber ?? recentVote?.rollCall ?? "Roll call"}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.07em] text-white/50">{recentVoteSourceLabel}</div>
                    <div className="rounded-full border border-[#2be68d]/25 bg-[#2be68d]/10 px-2.5 py-1 text-right text-[14px] font-medium leading-none text-[#2be68d]">{recentVote?.result ?? "Updated"}</div>
                  </div>
                </div>
                <VoteSpreadPanel
                  className="mt-2"
                  totals={{
                    no: recentVoteTotals?.no ?? 0,
                    notVoting: recentVoteTotals?.notVoting ?? 0,
                    yes: recentVoteTotals?.yes ?? 0
                  }}
                />
              </div>
            </MobileCard>

            <div className="mt-8 flex items-center justify-between">
              <h2 className="text-[18px] font-medium leading-none">Bill Tracker</h2>
              <Link href="/search?type=bills&focus=results" className={mobileViewAllClass}>
                View All
              </Link>
            </div>

            <MobileCard variant="dashboard" className="relative mt-3 overflow-hidden px-3 py-3">
              <div className={dashboardCardAccentClass} />
              <div className="relative z-10">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
                  <div className="min-w-0">
                    <h3 className="max-w-[19rem] text-[23px] font-semibold leading-tight">{trackedBill?.shortTitle ?? "No tracked bill yet"}</h3>
                    <p className="mt-1 text-[15px] text-white/58">{trackedBill?.displayNumber ?? "Save a bill to start your tracker."}</p>
                  </div>
                  {hasTrackedBill ? (
                    <div className={`shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-right text-[14px] font-medium leading-none ${trackerStagePill.bgClass} ${trackerStagePill.textClass}`}>
                      {trackerStage}
                    </div>
                  ) : (
                    <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-right text-[13px] font-medium leading-none text-white/52">
                      Empty
                    </div>
                  )}
                </div>
                {hasTrackedBill ? (
                  <div className={`${dashboardInnerPanelClass} mt-2 px-3 py-2.5`}>
                  <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.08em] text-white/48">
                    <span>Stage Progress</span>
                    <span>{trackerProgressStep}</span>
                  </div>
                  <div className="mt-2 rounded-lg border border-white/8 bg-[#071a38]/65 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-8px_16px_rgba(2,9,25,0.5)]">
                    <div className="relative h-6">
                      <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-white/12" />
                      <div className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-[#ffbd39]" style={{ width: `${trackerFillPercent}%` }} />
                      {billTrackerStages.map((stage, index) => {
                        const left = (index / (billTrackerStages.length - 1)) * 100;
                        return (
                          <span
                            key={stage}
                            className={`absolute top-1/2 h-[15px] w-[15px] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.35)] ${index <= trackerStageIndex ? "bg-[#ffbd39]" : "border-[1.5px] border-white/22 bg-[#07172d]"}`}
                            style={{ left: `${left}%` }}
                          >
                            {index <= trackerStageIndex ? <span className="absolute left-1/2 top-1/2 h-[4px] w-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#06152b]" /> : null}
                          </span>
                        );
                      })}
                    </div>
                    <div className="mt-0.5 grid grid-cols-4 text-center text-[9px] leading-snug">
                      {billTrackerStages.map((stage, index) => (
                        <span key={stage} className={index <= trackerStageIndex ? "text-white/82" : "text-white/42"}>
                          {stage}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 text-right text-[10px] font-medium uppercase tracking-[0.07em] text-white/46">
                    {trackerCompletion}% to final stage
                  </div>
                  </div>
                ) : (
                  <div className={`${dashboardInnerPanelClass} mt-2 px-3 py-3`}>
                    <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.08em] text-white/48">
                      <span>Saved tracker</span>
                      <span>0 bills</span>
                    </div>
                    <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-3 text-[13px] leading-snug text-white/58">
                      Bills will appear here only after this account saves one from search or bill detail.
                    </div>
                    <Link href="/search?type=bills&focus=results" className="mt-3 flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-[13px] font-medium text-[#ffb12b]">
                      Find Bills
                    </Link>
                  </div>
                )}
              </div>
            </MobileCard>

            <div className="mt-8 flex items-center justify-between">
              <h2 className="text-[18px] font-medium leading-none">Civic Engagement</h2>
              <Link href="/impact" className={mobileViewAllClass}>
                Open Hub
              </Link>
            </div>

            <MobileCard variant="dashboard" className="relative mt-3 overflow-hidden px-3 py-3">
              <div className={dashboardCardAccentClass} />
              <div className="relative z-10">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                  <div className="min-w-0">
                    <h3 className="max-w-[19rem] text-[23px] font-semibold leading-tight">Civic Momentum</h3>
                    <p className="mt-1 text-[14px] leading-snug text-white/58">No direct tab needed. Track score, streaks, badges, and civic action impact from here.</p>
                  </div>
                  <div className="shrink-0 rounded-full border border-[#ffbd39]/35 bg-[#ffbd39]/10 px-2.5 py-1 text-right text-[13px] font-medium leading-none text-[#ffbd39]">
                    Level {gamificationSnapshot.level}
                  </div>
                </div>
                <div className={`${dashboardInnerPanelClass} mt-2 px-3 py-2.5`}>
                  <div className="grid grid-cols-2 gap-2">
                    <GamificationStatPill
                      href={gamificationCategories[0].href}
                      label={gamificationCategories[0].label}
                      value={gamificationSnapshot.civicScore.toLocaleString()}
                      subtitle={`${gamificationSnapshot.levelTitle}`}
                    />
                    <GamificationStatPill
                      href={gamificationCategories[1].href}
                      label={gamificationCategories[1].label}
                      value={`${gamificationSnapshot.dayStreak}d`}
                      subtitle="Consistency loop"
                    />
                    <GamificationStatPill
                      href={gamificationCategories[2].href}
                      label={gamificationCategories[2].label}
                      value={`${gamificationSnapshot.earnedBadgeIds.length}/${gamificationSnapshot.totalBadges}`}
                      subtitle="Earned progress"
                    />
                    <GamificationStatPill
                      href={gamificationCategories[3].href}
                      label={gamificationCategories[3].label}
                      value={`${gamificationSnapshot.totalActions}`}
                      subtitle={`+${gamificationSnapshot.monthlyGain} this month`}
                    />
                  </div>
                  <div className="mt-3 text-[11px] font-medium uppercase tracking-[0.08em] text-white/46">Most Useful Categories</div>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    {impactCategories.map((category) => (
                      <Link
                        key={category.id}
                        href={impactCategoryHrefs[category.id]}
                        className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.04] px-2 py-1.5 text-[11px] transition hover:bg-white/[0.07]"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
                          <span className="truncate text-white/68">{category.label}</span>
                        </span>
                        <span className="font-medium text-white/82">{category.value}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </MobileCard>

            <MobileBottomNav
              indicatorClassName="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white"
              items={[
                { active: true, href: "/dashboard", icon: <Home />, label: "Home" },
                { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
                { href: "/search?type=members", icon: <UsersRound />, label: "Representatives" },
                { href: "/alerts", icon: <Bell />, label: "Alerts" },
                { href: "/settings", icon: <Settings />, label: "Settings" }
              ]}
            />
    </MobileShell>
  );
}

function BriefMetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className={`${dashboardMetricPanelClass} px-2 py-2 text-center`}>
      <div className="text-[18px] font-medium leading-none text-[#ffbd39]">{value}</div>
      <div className="mt-1 truncate text-[10px] font-medium uppercase tracking-[0.05em] text-white/52">{label}</div>
    </div>
  );
}

function GamificationStatPill({ href, label, subtitle, value }: { href: string; label: string; subtitle: string; value: string }) {
  return (
    <Link href={href} className={`${dashboardMetricPanelClass} px-2 py-2 text-left transition hover:brightness-110`}>
      <div className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-white/46">{label}</div>
      <div className="mt-1 text-[19px] font-medium leading-none text-[#ffbd39]">{value}</div>
      <div className="mt-1 truncate text-[11px] text-white/58">{subtitle}</div>
    </Link>
  );
}

function StatusCountLink({ color, href, label, value }: { color: string; href: string; label: string; value: number }) {
  return (
    <Link
      href={href}
      className={`${dashboardMetricPanelClass} px-2 py-2 text-left transition hover:brightness-110`}
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
    <div className={`${dashboardMetricPanelClass} flex items-start justify-between gap-3 px-3 py-3`}>
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
    <div className={`${dashboardMetricPanelClass} px-2 py-2 text-center`}>
      <div className="text-[20px] font-medium leading-none text-[#ffb12b]">{value}</div>
      <div className="mt-1 truncate text-[11px] font-medium text-white/58">{label}</div>
    </div>
  );
}

function LockedStatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${dashboardMetricPanelClass} px-2 py-2 text-center opacity-80`}>
      <div className="text-[18px] font-medium leading-none text-white/82">{value}</div>
      <div className="mt-1 truncate text-[11px] font-medium text-white/50">{label}</div>
    </div>
  );
}

function LockedProRow({ label, subtitle }: { label: string; subtitle: string }) {
  return (
    <div className={`${dashboardMetricPanelClass} px-3 py-3 opacity-80`}>
      <div className="text-[14px] font-medium leading-tight text-white/82">{label}</div>
      <div className="mt-1 text-[12px] leading-snug text-white/50">{subtitle}</div>
    </div>
  );
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

let dashboardLedgerPromise: Promise<AccountLedgerSnapshot | null> | null = null;

function favoriteRecordKey(record: SavedFollowRecord) {
  return `${record.type}:${record.id}`;
}

function uniqueFavoriteRecords(records: SavedFollowRecord[]) {
  const seen = new Set<string>();
  const uniqueRecords: SavedFollowRecord[] = [];

  records.forEach((record) => {
    if ((record.type !== "member" && record.type !== "bill") || !record.id) return;

    const key = favoriteRecordKey(record);
    if (seen.has(key)) return;

    seen.add(key);
    uniqueRecords.push(record);
  });

  return uniqueRecords;
}

function favoriteRecordsMatch(left: SavedFollowRecord[], right: SavedFollowRecord[]) {
  if (left.length !== right.length) return false;
  const rightKeys = new Set(right.map(favoriteRecordKey));
  return left.every((record) => rightKeys.has(favoriteRecordKey(record)));
}

function stateCodeFromDistrictCode(code?: string) {
  return code?.match(/^([A-Z]{2})-/i)?.[1]?.toUpperCase() ?? "";
}

function districtNumberFromCode(code?: string) {
  return code?.match(/^[A-Z]{2}-0?(\d{1,2})$/i)?.[1] ?? "";
}

function getFederalDelegationMemberIds(targets: DashboardData["favoriteTargets"], profile: AccountProfileSnapshot | null) {
  return new Set(getFederalDelegationMembers(targets, profile).map((member) => member.bioguideId));
}

function getFederalDelegationMembers(targets: DashboardData["favoriteTargets"], profile: AccountProfileSnapshot | null) {
  const stateCode = stateCodeFromDistrictCode(profile?.districtCode);
  if (!stateCode) return [];

  const districtNumber = districtNumberFromCode(profile?.districtCode);
  const stateMembers = targets.members.filter((member) => member.state === stateCode);
  const exactRepresentative = districtNumber
    ? stateMembers.find((member) => member.chamber === "House" && member.district === districtNumber)
    : undefined;

  return [
    ...(exactRepresentative ? [exactRepresentative] : []),
    ...stateMembers
      .filter((member) => member.chamber === "Senate")
      .sort((left, right) => left.fullName.localeCompare(right.fullName))
  ];
}

function resolveDashboardVoteFeed(
  candidates: DashboardData["voteFeed"],
  records: SavedFollowRecord[],
  targets: DashboardData["favoriteTargets"],
  profile: AccountProfileSnapshot | null
) {
  const savedBillIds = new Set(uniqueFavoriteRecords(records).filter((record) => record.type === "bill").map((record) => record.id));
  const savedBillVote = candidates.find((candidate) => candidate.vote.billId && savedBillIds.has(candidate.vote.billId));
  if (savedBillVote) return { ...savedBillVote, sourceLabel: "Saved bill" };

  const delegationIds = getFederalDelegationMemberIds(targets, profile);
  const delegationVote = candidates.find((candidate) => candidate.memberBioguideIds.some((memberId) => delegationIds.has(memberId)));
  if (delegationVote) return { ...delegationVote, sourceLabel: "Your officials" };

  const nationalVote = candidates.find((candidate) => Boolean(candidate.bill));
  if (nationalVote) return { ...nationalVote, sourceLabel: "National feed" };

  const latestVote = candidates[0];
  return latestVote ? { ...latestVote, sourceLabel: "Congress feed" } : undefined;
}

function readDashboardFavoriteRecords() {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage?.getItem(followsKey);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? uniqueFavoriteRecords(parsed as SavedFollowRecord[]) : [];
  } catch {
    return [];
  }
}

function dispatchDashboardFavoritesChanged() {
  window.dispatchEvent(new Event(persistenceEvent));
  window.dispatchEvent(new Event(followsChangedEvent));
}

function writeDashboardFavoriteRecords(records: SavedFollowRecord[], syncAccount = true) {
  if (typeof window === "undefined") return records;

  const next = uniqueFavoriteRecords(records);

  try {
    window.localStorage?.setItem(followsKey, JSON.stringify(next));
    dispatchDashboardFavoritesChanged();
    if (syncAccount) void syncDashboardFavoriteRecordsToAccount(next);
  } catch {
    // Favorites remain optional when browser persistence is unavailable.
  }

  return next;
}

function toggleDashboardFavoriteRecord(record: SavedFollowRecord) {
  const current = readDashboardFavoriteRecords();
  const key = favoriteRecordKey(record);
  const exists = current.some((favorite) => favoriteRecordKey(favorite) === key);
  const next = exists ? current.filter((favorite) => favoriteRecordKey(favorite) !== key) : [...current, record];

  return writeDashboardFavoriteRecords(next);
}

function resolveDashboardFavorites(records: SavedFollowRecord[], targets: DashboardData["favoriteTargets"], profile: AccountProfileSnapshot | null) {
  const memberMap = new Map(targets.members.map((member) => [member.bioguideId, member]));
  const billMap = new Map(targets.bills.map((bill) => [bill.id, bill]));
  const delegationItems = getFederalDelegationMembers(targets, profile).map<DashboardFavoriteItem>((member) => ({
    href: `/members/${member.bioguideId}`,
    id: member.bioguideId,
    label: member.fullName,
    meta: `${member.chamber} / ${member.state} / ${member.party}`,
    type: "member"
  }));
  const delegationKeys = new Set(delegationItems.map((item) => favoriteRecordKey({ id: item.id, type: item.type })));

  const savedItems = uniqueFavoriteRecords(records).map<DashboardFavoriteItem>((record) => {
    if (record.type === "member") {
      const member = memberMap.get(record.id);

      return {
        href: `/members/${record.id}`,
        id: record.id,
        label: member?.fullName ?? "Official profile",
        meta: member ? `${member.chamber} / ${member.state} / ${member.party}` : "Official profile",
        type: "member"
      };
    }

    const bill = billMap.get(record.id);

    return {
      href: `/bills/${record.id}`,
      id: record.id,
      label: bill?.shortTitle ?? "Tracked bill",
      meta: bill ? `${bill.displayNumber} / ${bill.policyArea}` : "Bill detail",
      type: "bill"
    };
  });

  return [...delegationItems, ...savedItems.filter((item) => !delegationKeys.has(favoriteRecordKey({ id: item.id, type: item.type })))];
}

function mergeDistrictDelegationFavoriteRecords(
  records: SavedFollowRecord[],
  targets: DashboardData["favoriteTargets"],
  profile: AccountProfileSnapshot | null
) {
  const delegationRecords = getFederalDelegationMembers(targets, profile).map<SavedFollowRecord>((member) => ({
    id: member.bioguideId,
    type: "member"
  }));

  return uniqueFavoriteRecords([...delegationRecords, ...records]);
}

function getSuggestedDashboardFavorites(targets: DashboardData["favoriteTargets"], records: SavedFollowRecord[], profile: AccountProfileSnapshot | null) {
  const savedKeys = new Set(uniqueFavoriteRecords(records).map(favoriteRecordKey));
  const suggestions: DashboardFavoriteItem[] = [];
  const stateCode = stateCodeFromDistrictCode(profile?.districtCode);
  const districtNumber = districtNumberFromCode(profile?.districtCode);

  if (!stateCode) return suggestions;

  const stateMembers = targets.members.filter((member) => member.state === stateCode);
  const exactRepresentative = districtNumber
    ? stateMembers.find((member) => member.chamber === "House" && member.district === districtNumber)
    : undefined;
  const suggestedMembers = [
    ...(exactRepresentative ? [exactRepresentative] : []),
    ...stateMembers
      .filter((member) => member.chamber === "Senate")
      .sort((left, right) => left.fullName.localeCompare(right.fullName)),
    ...stateMembers
      .filter((member) => member.chamber === "House" && member.bioguideId !== exactRepresentative?.bioguideId)
      .sort((left, right) => left.fullName.localeCompare(right.fullName))
  ];

  suggestedMembers.forEach((member) => {
    if (suggestions.length >= 2) return;

    const record: SavedFollowRecord = { id: member.bioguideId, type: "member" };
    if (savedKeys.has(favoriteRecordKey(record))) return;

    suggestions.push({
      href: `/members/${member.bioguideId}`,
      id: member.bioguideId,
      label: member.fullName,
      meta: `${member.chamber} / ${member.state} / ${member.party}`,
      type: "member"
    });
  });

  if (suggestions.length >= 2) return suggestions;

  targets.bills.slice(0, 2).forEach((bill) => {
    const record: SavedFollowRecord = { id: bill.id, type: "bill" };
    if (suggestions.length >= 2 || savedKeys.has(favoriteRecordKey(record))) return;

    suggestions.push({
      href: `/bills/${bill.id}`,
      id: bill.id,
      label: bill.shortTitle,
      meta: `${bill.displayNumber} / ${bill.policyArea}`,
      type: "bill"
    });
  });

  return suggestions;
}

async function readDashboardAccountLedger() {
  if (!(await hasActiveBrowserSession())) return null;

  if (!dashboardLedgerPromise) {
    dashboardLedgerPromise = fetch(accountLedgerEndpoint, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = (await response.json().catch(() => null)) as { ledger?: AccountLedgerSnapshot } | null;
        return data?.ledger ?? null;
      })
      .catch(() => null)
      .finally(() => {
        dashboardLedgerPromise = null;
      });
  }

  return dashboardLedgerPromise;
}

async function syncDashboardFavoriteRecordsToAccount(records: SavedFollowRecord[]) {
  if (!(await hasActiveBrowserSession())) return records;

  const response = await fetch(accountLedgerEndpoint, {
    body: JSON.stringify({ follows: uniqueFavoriteRecords(records) }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  }).catch(() => null);

  if (!response?.ok) return records;

  const data = (await response.json().catch(() => null)) as { ledger?: AccountLedgerSnapshot } | null;
  return data?.ledger?.follows ?? records;
}

async function hydrateDashboardFavoriteRecords() {
  const local = readDashboardFavoriteRecords();
  if (!(await hasActiveBrowserSession())) return local;

  const ledger = await readDashboardAccountLedger();

  if (!ledger) return local;

  const accountFavorites = uniqueFavoriteRecords(ledger.follows);
  const mergedFavorites = uniqueFavoriteRecords([...local, ...accountFavorites]);
  if (!favoriteRecordsMatch(local, mergedFavorites)) writeDashboardFavoriteRecords(mergedFavorites, false);
  if (!favoriteRecordsMatch(accountFavorites, mergedFavorites)) void syncDashboardFavoriteRecordsToAccount(mergedFavorites);
  return mergedFavorites;
}

function countAccountUnreadAlertIds(ledger: AccountLedgerSnapshot | null) {
  if (!ledger) return 0;

  const read = new Set(uniqueStrings(ledger.readAlerts));
  return uniqueStrings(ledger.savedAlerts).filter((id) => !read.has(id)).length;
}
