"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  gamificationChangedEvent,
  hydrateGamificationFromAccount,
  readLocalGamificationSnapshot
} from "@/lib/browser-gamification";
import { getImpactActions } from "@/lib/gamification";
import type { AccountGamificationSnapshot } from "@/lib/account-gamification";

function useGamificationSnapshot() {
  const [snapshot, setSnapshot] = useState<AccountGamificationSnapshot>(() => readLocalGamificationSnapshot());

  useEffect(() => {
    function refreshSnapshot() {
      setSnapshot(readLocalGamificationSnapshot());
    }

    refreshSnapshot();
    void hydrateGamificationFromAccount().then((next) => setSnapshot(next));
    window.addEventListener("storage", refreshSnapshot);
    window.addEventListener(gamificationChangedEvent, refreshSnapshot);

    return () => {
      window.removeEventListener("storage", refreshSnapshot);
      window.removeEventListener(gamificationChangedEvent, refreshSnapshot);
    };
  }, []);

  return snapshot;
}

export function AccountGamificationStats() {
  const snapshot = useGamificationSnapshot();

  return (
    <div className="mt-5 grid grid-cols-3 gap-3">
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
