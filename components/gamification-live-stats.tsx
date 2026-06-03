"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  gamificationChangedEvent,
  hydrateGamificationFromAccount
} from "@/lib/browser-gamification";
import { civicLevelTiers, getImpactActions } from "@/lib/gamification";
import { getDefaultAccountGamification, type AccountGamificationSnapshot } from "@/lib/account-gamification";

export function useGamificationSnapshot() {
  const [snapshot, setSnapshot] = useState<AccountGamificationSnapshot>(() => getDefaultAccountGamification());

  useEffect(() => {
    let active = true;

    async function refreshSnapshot() {
      const next = await hydrateGamificationFromAccount();
      if (active) setSnapshot(next);
    }

    void refreshSnapshot();
    window.addEventListener("storage", refreshSnapshot);
    window.addEventListener(gamificationChangedEvent, refreshSnapshot);

    return () => {
      active = false;
      window.removeEventListener("storage", refreshSnapshot);
      window.removeEventListener(gamificationChangedEvent, refreshSnapshot);
    };
  }, []);

  return snapshot;
}

export function AccountGamificationStats({ className = "mt-5 grid grid-cols-3 gap-3" }: { className?: string }) {
  const snapshot = useGamificationSnapshot();

  return (
    <div className={className}>
      <MiniStat href="/impact" value={snapshot.civicScore.toLocaleString()} label="Civic Score" />
      <MiniStat href="/impact" value={String(snapshot.dayStreak)} label="Day Streak" />
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
  return <span className={className}>↑ {snapshot.monthlyGain} this month</span>;
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
        <span className="text-white/60"> / {snapshot.nextLevelScore.toLocaleString()} XP</span>
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
  return <span className={className}>{Math.min(100, snapshot.xpProgress)}% to next level</span>;
}

export function DayStreakValue({ className }: { className?: string }) {
  const snapshot = useGamificationSnapshot();
  return <span className={className}>{snapshot.dayStreak} Days</span>;
}

export function TotalActionsValue() {
  const snapshot = useGamificationSnapshot();
  return <span>{snapshot.totalActions}</span>;
}

export function ImpactActionsList() {
  const snapshot = useGamificationSnapshot();
  const actions = getImpactActions(snapshot.eventCounts);

  return (
    <div className="space-y-4">
      {actions.map((row) => (
        <div key={row.id} className="grid grid-cols-[20px_1fr_28px] items-center gap-3 text-[17px]">
          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: row.color }} />
          <span className="text-white/64">{row.label}</span>
          <span className="text-right font-semibold text-white">{row.value}</span>
        </div>
      ))}
    </div>
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
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46">Level Path</div>
          <h2 className="mt-2 text-[22px] font-medium leading-tight text-white">Civic title ladder</h2>
          <p className="mt-2 text-[13px] leading-snug text-white/54">
            Titles unlock when your Civic Score reaches each XP threshold.
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
        <span className="text-[#ffb12b]">{score.toLocaleString()} XP</span>
        <span> total · </span>
        <span>{pointsIntoLevel.toLocaleString()} XP earned inside this level</span>
        {nextLevel ? <span> · {pointsToNext.toLocaleString()} XP to Level {nextLevel}</span> : null}
      </div>

      <div className="mt-4 max-h-[126px] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#071a38]/62 p-2 pb-3">
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
                  <span className="mt-1 block text-[11px] text-white/42">{tier.minScore.toLocaleString()} XP</span>
                </span>
                <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] ${active ? "border-[#ffb12b]/35 bg-[#ffb12b]/10 text-[#ffb12b]" : upcoming ? "border-white/12 bg-white/[0.04] text-white/52" : "border-transparent text-white/28"}`}>
                  {active ? "Current" : upcoming ? "Next" : completed ? "Done" : "Locked"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
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
