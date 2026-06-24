"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { badgeIcon, badgeTones } from "@/components/gamification-ui";
import { MobileGlassScrollFrame } from "@/components/mobile-glass-scroll-frame";
import {
  gamificationChangedEvent,
  hydrateGamificationFromAccount,
  readLocalGamificationSnapshot
} from "@/lib/browser-gamification";
import { civicLevelTiers, getBadgeCollections, getImpactActions, type GamificationBadge } from "@/lib/gamification";
import { getDefaultAccountGamification, type AccountGamificationSnapshot } from "@/lib/account-gamification";

const hydrationGamificationSnapshot: AccountGamificationSnapshot = {
  ...getDefaultAccountGamification(),
  updatedAt: ""
};
let gamificationSnapshot = hydrationGamificationSnapshot;
let gamificationSnapshotSignature = JSON.stringify(gamificationSnapshot);
let gamificationStoreStarted = false;
let gamificationRefreshPromise: Promise<void> | null = null;

const gamificationListeners = new Set<() => void>();

export function useGamificationSnapshot() {
  return useSyncExternalStore(subscribeToGamificationSnapshot, getGamificationSnapshot, getServerGamificationSnapshot);
}

function getGamificationSnapshot() {
  return gamificationSnapshot;
}

function getServerGamificationSnapshot() {
  return hydrationGamificationSnapshot;
}

function subscribeToGamificationSnapshot(listener: () => void) {
  gamificationListeners.add(listener);
  startGamificationStore();
  refreshLocalGamificationSnapshot();
  void refreshAccountGamificationSnapshot();

  return () => {
    gamificationListeners.delete(listener);
  };
}

function startGamificationStore() {
  if (gamificationStoreStarted || typeof window === "undefined") return;

  gamificationStoreStarted = true;
  window.addEventListener("storage", refreshLocalGamificationSnapshot);
  window.addEventListener(gamificationChangedEvent, refreshLocalGamificationSnapshot);
  window.addEventListener("focus", refreshAccountGamificationSnapshot);
  window.addEventListener("pageshow", refreshAccountGamificationSnapshot);
}

function refreshLocalGamificationSnapshot() {
  publishGamificationSnapshot(readLocalGamificationSnapshot());
}

async function refreshAccountGamificationSnapshot() {
  if (gamificationRefreshPromise) return gamificationRefreshPromise;

  gamificationRefreshPromise = hydrateGamificationFromAccount()
    .then((next) => {
      publishGamificationSnapshot(next);
    })
    .finally(() => {
      gamificationRefreshPromise = null;
    });

  return gamificationRefreshPromise;
}

function publishGamificationSnapshot(snapshot: AccountGamificationSnapshot) {
  const signature = JSON.stringify(snapshot);
  if (signature === gamificationSnapshotSignature) return;

  gamificationSnapshot = snapshot;
  gamificationSnapshotSignature = signature;
  gamificationListeners.forEach((listener) => listener());
}

export function AccountGamificationStats({ className = "mt-5 grid grid-cols-3 gap-3" }: { className?: string }) {
  const snapshot = useGamificationSnapshot();

  return (
    <div className={className}>
      <MiniStat href="/impact" value={snapshot.civicScore.toLocaleString()} label="Civic score" />
      <MiniStat href="/impact" value={String(snapshot.dayStreak)} label="Day streak" />
      <MiniStat href="/badges" value={String(snapshot.earnedBadgeIds.length)} label="Badges" />
    </div>
  );
}

export function CivicScoreValue({ className }: { className?: string }) {
  const snapshot = useGamificationSnapshot();
  return <span className={className}>{snapshot.civicScore.toLocaleString()}</span>;
}

export function MonthlyGainValue({ className }: { className?: string }) {
  const snapshot = useGamificationSnapshot();
  return <span className={className}>{snapshot.monthlyGain} point{snapshot.monthlyGain === 1 ? "" : "s"} this month</span>;
}

export function LevelStatusValue() {
  const snapshot = useGamificationSnapshot();

  return (
    <>
      <div>
        <div className="text-[20px] font-medium leading-tight text-[#ffb12b]">Level {snapshot.level}</div>
        <div className="mt-1 text-[19px] text-white/66">{snapshot.levelTitle}</div>
      </div>
      <div className="pb-1 text-[18px]">
        <span className="text-[#ffb12b]">{snapshot.civicScore.toLocaleString()}</span>
        <span className="text-white/60"> / {snapshot.nextLevelScore.toLocaleString()} points</span>
      </div>
    </>
  );
}

export function LevelProgressBar() {
  const snapshot = useGamificationSnapshot();
  const progressWidth = `${Math.min(100, snapshot.xpProgress)}%`;

  return (
    <div
      className="h-full rounded-full bg-gradient-to-r from-[#c57b0b] via-[#ffb12b] to-[#ffd45c] shadow-[0_0_18px_rgba(255,177,43,0.32)]"
      style={{ width: progressWidth }}
    />
  );
}

export function XpProgressValue({ className }: { className?: string }) {
  const snapshot = useGamificationSnapshot();
  return <span className={className}>{Math.min(100, snapshot.xpProgress)}% toward next level</span>;
}

export function DayStreakValue({ className }: { className?: string }) {
  const snapshot = useGamificationSnapshot();
  return <span className={className}>{snapshot.dayStreak} {snapshot.dayStreak === 1 ? "day" : "days"}</span>;
}

const streakWeekDays = [
  { jsDay: 1, label: "M", name: "Monday" },
  { jsDay: 2, label: "T", name: "Tuesday" },
  { jsDay: 3, label: "W", name: "Wednesday" },
  { jsDay: 4, label: "T", name: "Thursday" },
  { jsDay: 5, label: "F", name: "Friday" },
  { jsDay: 6, label: "S", name: "Saturday" },
  { jsDay: 0, label: "S", name: "Sunday" }
] as const;

export function StreakWeekIndicator() {
  const snapshot = useGamificationSnapshot();
  const [currentDay] = useState(() => new Date().getDay());
  const currentDayIndex = streakWeekDays.findIndex((day) => day.jsDay === currentDay);
  const visibleStreakDays = Math.min(Math.max(0, snapshot.dayStreak), streakWeekDays.length);
  const firstCheckedIndex = Math.max(0, currentDayIndex - visibleStreakDays + 1);

  return (
    <div className="grid grid-cols-7 gap-1 text-center text-[12px]">
      {streakWeekDays.map((day, index) => {
        const checked = currentDayIndex >= 0 && index >= firstCheckedIndex && index <= currentDayIndex;
        const current = checked && index === currentDayIndex;

        return (
          <div key={`${day.name}-${index}`} aria-label={`${day.name}${checked ? " streak day complete" : ""}`}>
            <div className={current ? "font-semibold text-[#ffb12b]" : "text-white/45"}>{day.label}</div>
            <div
              className={`mt-3 grid h-6 w-6 place-items-center rounded-full text-[13px] ${
                current
                  ? "bg-[#ffb12b] font-semibold text-[#061126]"
                  : checked
                    ? "border border-[#73dd6d] text-[#73dd6d]"
                    : "border border-white/12 text-transparent"
              }`}
            >
              {checked ? "✓" : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ImpactActionsList() {
  const snapshot = useGamificationSnapshot();
  const actions = getImpactActions(snapshot.eventCounts);
  const totalActions = actions.reduce((total, row) => total + row.value, 0);

  return (
    <div className="space-y-2.5">
      {actions.map((row) => {
        const percent = totalActions > 0 ? Math.round((row.value / totalActions) * 100) : 0;
        const progressWidth = row.value > 0 ? `${Math.max(8, percent)}%` : "0%";

        return (
          <div key={row.id} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full shadow-[0_0_14px_currentColor]" style={{ backgroundColor: row.color, color: row.color }} />
              <span className="truncate text-[13px] font-medium text-white/72">{row.label}</span>
              <span className="text-[15px] font-semibold text-white">{row.value}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full shadow-[0_0_14px_currentColor] transition-[width]"
                style={{ backgroundColor: row.color, color: row.color, width: progressWidth }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function buildImpactChartGradient(actions: ReturnType<typeof getImpactActions>, totalActions: number) {
  if (totalActions <= 0) {
    return "conic-gradient(rgba(255,255,255,0.11) 0deg 360deg)";
  }

  let cursor = 0;
  return `conic-gradient(${actions.map((row) => {
    const start = cursor;
    const end = cursor + (row.value / totalActions) * 360;
    cursor = end;
    return `${row.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
  }).join(", ")})`;
}

export function PremiumImpactBreakdown() {
  const snapshot = useGamificationSnapshot();
  const actions = getImpactActions(snapshot.eventCounts);
  const totalActions = actions.reduce((total, row) => total + row.value, 0);
  const activeActionCount = actions.filter((row) => row.value > 0).length;
  const chartGradient = buildImpactChartGradient(actions, totalActions);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[21px] font-medium leading-none">Activity summary</h2>
          <div className="mt-2 text-[12px] font-medium uppercase tracking-[0.08em] text-white/42">
            {activeActionCount > 0 ? `${activeActionCount} categor${activeActionCount === 1 ? "y" : "ies"} with activity` : "No activity yet"}
          </div>
        </div>
        <div className="rounded-full border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#ffc44d] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          This month
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[154px_minmax(0,1fr)] items-center gap-4">
        <div className="relative h-[154px] w-[154px]">
          <div className="absolute inset-0 rounded-full border border-white/10 bg-[radial-gradient(circle,rgba(255,255,255,0.11)_0%,rgba(255,255,255,0.03)_58%,rgba(255,255,255,0.08)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_18px_36px_rgba(1,8,24,0.36)]" />
          <div
            className="absolute inset-[9px] rounded-full shadow-[inset_0_0_18px_rgba(0,0,0,0.34),0_0_24px_rgba(73,200,120,0.08)]"
            style={{ background: chartGradient }}
          />
          <div className="absolute inset-[25px] rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(9,34,71,0.96)_0%,rgba(4,17,40,0.98)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.11)]" />
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="text-[36px] font-medium leading-none text-[#ffb12b]">{totalActions}</div>
              <div className="mt-1.5 text-[13px] font-medium uppercase tracking-[0.08em] text-white/54">Total</div>
            </div>
          </div>
        </div>

        <ImpactActionsList />
      </div>
    </>
  );
}

export function RecentAchievementsList() {
  const snapshot = useGamificationSnapshot();
  const badgeCollections = getBadgeCollections(snapshot.earnedBadgeIds);
  const badgeById = new Map(badgeCollections.earnedBadges.map((badge) => [badge.id, badge]));
  const recentBadges = snapshot.earnedBadgeIds
    .map((id) => badgeById.get(id))
    .filter((badge): badge is NonNullable<typeof badge> => Boolean(badge))
    .slice(-3)
    .reverse();

  if (!recentBadges.length) {
    return (
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 text-[13px] leading-snug text-white/56">
        Badges appear here after you complete civic actions.
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/42">Recently earned</div>
      <MobileGlassScrollFrame frameClassName="mt-3" heightClassName="max-h-[172px]" className="space-y-2">
        {recentBadges.map((achievement) => (
          <RecentAchievementRow key={achievement.id} badge={achievement} />
        ))}
      </MobileGlassScrollFrame>
    </div>
  );
}

function RecentAchievementRow({ badge }: { badge: GamificationBadge }) {
  const colors = badgeTones[badge.tone];

  return (
    <Link
      href="/badges"
      className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-[#ffb12b]/36 hover:bg-white/[0.055] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffb12b]"
    >
      <div
        className={`grid h-12 w-12 shrink-0 place-items-center bg-gradient-to-br ${colors.shell} p-[2px] ${colors.glow}`}
        style={{ clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)" }}
      >
        <div
          className={`grid h-full w-full place-items-center bg-gradient-to-br ${colors.core}`}
          style={{ clipPath: "polygon(25% 8%, 75% 8%, 98% 50%, 75% 92%, 25% 92%, 2% 50%)" }}
        >
          <span className={`${colors.text} [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[1.65]`}>{badgeIcon(badge.icon)}</span>
        </div>
      </div>

      <div className="min-w-0">
        <div className="truncate text-[15px] font-semibold leading-tight text-white">{badge.label}</div>
        <div className="mt-1 text-[12px] leading-snug text-white/52">{badge.description}</div>
      </div>

      <span className="rounded-full border border-[#43ed74]/24 bg-[#43ed74]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#74f49a]">
        Earned
      </span>
    </Link>
  );
}

export function CivicLevelPathCard() {
  const snapshot = useGamificationSnapshot();
  const currentIndex = civicLevelTiers.findIndex((tier) => tier.level === snapshot.level);
  const currentTier = civicLevelTiers[currentIndex] ?? civicLevelTiers[0];
  const nextTier = civicLevelTiers[currentIndex + 1];
  const pointsIntoLevel = Math.max(0, snapshot.civicScore - currentTier.minScore);
  const pointsToNext = nextTier ? Math.max(0, nextTier.minScore - snapshot.civicScore) : 0;

  return (
    <MobileLevelPathShell
      currentLevel={snapshot.level}
      currentTitle={snapshot.levelTitle}
      nextLevel={nextTier?.level}
      nextTitle={nextTier?.title}
      pointsIntoLevel={pointsIntoLevel}
      pointsToNext={pointsToNext}
      score={snapshot.civicScore}
    />
  );
}

function MobileLevelPathShell({
  currentLevel,
  currentTitle,
  nextLevel,
  nextTitle,
  pointsIntoLevel,
  pointsToNext,
  score
}: {
  currentLevel: number;
  currentTitle: string;
  nextLevel?: number;
  nextTitle?: string;
  pointsIntoLevel: number;
  pointsToNext: number;
  score: number;
}) {
  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46">Titles</div>
          <h2 className="mt-2 text-[22px] font-medium leading-tight text-white">Your next title</h2>
          <p className="mt-2 text-[13px] leading-snug text-white/54">
            Earn points from civic actions to unlock new titles.
          </p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/14 bg-white/8 text-[#ffb12b] shadow-[0_12px_28px_rgba(1,8,24,0.3)]">
          <span className="text-[18px] font-semibold leading-none">{currentLevel}</span>
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/10 bg-[#071a38]/62 px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40">Current</div>
          <div className="mt-1 text-[15px] font-semibold text-[#ffb12b]">Level {currentLevel}</div>
          <div className="mt-1 truncate text-[12px] text-white/60">{currentTitle}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#071a38]/62 px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40">Next</div>
          <div className="mt-1 text-[15px] font-semibold text-white">{nextLevel ? `Level ${nextLevel}` : "Max level"}</div>
          <div className="mt-1 truncate text-[12px] text-white/60">{nextTitle ?? "Top title reached"}</div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-[#071a38]/62 px-3 py-3 text-[12px] leading-snug text-white/56">
        <span className="text-[#ffb12b]">{score.toLocaleString()} points</span>
        <span> total · </span>
        <span>{pointsIntoLevel.toLocaleString()} points in this level</span>
        {nextLevel ? <span> · {pointsToNext.toLocaleString()} points to Level {nextLevel}</span> : null}
      </div>

      <MobileGlassScrollFrame frameClassName="mt-4" heightClassName="max-h-[126px]">
        <div className="divide-y divide-white/8">
          {civicLevelTiers.map((tier) => {
            const active = tier.level === currentLevel;
            const completed = score >= tier.minScore;
            const upcoming = nextLevel === tier.level;

            return (
              <div key={tier.level} className={`grid grid-cols-[42px_1fr_auto] items-center gap-3 py-3 ${active ? "text-white" : "text-white/60"}`}>
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl border text-[13px] font-semibold ${
                    active
                      ? "border-[#ffb12b]/45 bg-[#ffb12b]/14 text-[#ffb12b]"
                      : completed
                        ? "border-[#43ed74]/28 bg-[#43ed74]/10 text-[#43ed74]"
                        : "border-white/10 bg-white/[0.035] text-white/42"
                  }`}
                >
                  {tier.level}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold">{tier.title}</span>
                  <span className="mt-1 block text-[11px] text-white/42">{tier.minScore.toLocaleString()} points</span>
                </span>
                <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] ${active ? "border-[#ffb12b]/35 bg-[#ffb12b]/10 text-[#ffb12b]" : upcoming ? "border-white/12 bg-white/[0.04] text-white/52" : "border-transparent text-white/28"}`}>
                  {active ? "Current" : upcoming ? "Next" : completed ? "Done" : "Locked"}
                </span>
              </div>
            );
          })}
        </div>
      </MobileGlassScrollFrame>
    </>
  );
}

export function BadgeProgressMetrics() {
  const snapshot = useGamificationSnapshot();
  const progressWidth = `${Math.min(100, Math.round((snapshot.earnedBadgeIds.length / snapshot.totalBadges) * 100))}%`;

  return (
    <>
      <div className="mt-6 flex items-end gap-3">
        <span className="text-[48px] font-medium leading-none text-[#ffb12b]">{snapshot.earnedBadgeIds.length}</span>
        <span className="pb-1 text-[26px] text-white">/ {snapshot.totalBadges}</span>
      </div>
      <div className="mt-4 text-[18px] text-white/58">Badges Earned</div>
      <div className="mt-6 h-2.5 rounded-full bg-white/13">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#c57b0b] via-[#ffb12b] to-[#ffd45c] shadow-[0_0_18px_rgba(255,177,43,0.32)]"
          style={{ width: progressWidth }}
        />
      </div>
    </>
  );
}

function MiniStat({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center transition hover:border-[#ffb12b]/35 hover:bg-white/8">
      <div className="text-[21px] font-medium leading-none text-[#ffb12b]">{value}</div>
      <div className="mt-2 text-[11px] text-white/48">{label}</div>
    </Link>
  );
}
