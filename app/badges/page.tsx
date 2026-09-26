"use client";

import { EarnedBadgeTile, LockedBadgeTile } from "@/components/gamification-ui";
import { GamificationSync } from "@/components/gamification-sync";
import { useGamificationSnapshot } from "@/components/gamification-live-stats";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";
import {
  getBadgeCollections,
  getGamificationEventRules,
  type GamificationBadge,
  type GamificationEventType
} from "@/lib/gamification";
import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Bell, CheckCircle2, FileText, Home, Trophy, Settings } from "lucide-react";

type BadgeFilter = "all" | "earned" | "locked";

const badgeFilters: Array<{ label: string; value: BadgeFilter }> = [
  { label: "All", value: "all" },
  { label: "Earned", value: "earned" },
  { label: "Locked", value: "locked" }
];

const activitySignalDisplay: Record<GamificationEventType, { href: string; tone: string }> = {
  "complete-onboarding": { href: "/onboarding", tone: "#ffd45c" },
  "complete-public-comment": { href: "/petitions", tone: "#c08dff" },
  "complete-voter-registration": { href: "/impact#voter-registration", tone: "#9fc4ff" },
  "contact-representative": { href: "/letters#letters", tone: "#d18bff" },
  "open-official-source": { href: "/search?focus=results", tone: "#74dbff" },
  "participate-election": { href: "/impact#election-participation", tone: "#ffd45c" },
  "read-alert": { href: "/alerts", tone: "#4fdb89" },
  "review-vote": { href: "/search?type=votes&focus=results", tone: "#79a8ff" },
  "save-official": { href: "/search?type=members&focus=results", tone: "#77d6bc" },
  "sign-petition": { href: "/petitions", tone: "#d6a4ff" },
  "track-bill": { href: "/search?type=bills&focus=results", tone: "#ffbd39" },
  "watch-speech-video": { href: "/brief", tone: "#ff8e78" }
};

const activitySignals = getGamificationEventRules().map((rule) => ({
  event: rule.event,
  label: rule.countLabel,
  ...activitySignalDisplay[rule.event]
}));

function normalizeBadgeFilter(filter?: string): BadgeFilter {
  return filter === "earned" || filter === "locked" ? filter : "all";
}

function badgeFilterHref(filter: BadgeFilter) {
  return filter === "all" ? "/badges" : `/badges?filter=${filter}`;
}

function getLockedBadgeProgressLabel({
  badge,
  eventCountMap
}: {
  badge: GamificationBadge;
  eventCountMap: Map<GamificationEventType, number>;
}) {
  const ruleProgress = getGamificationEventRules()
    .flatMap((rule) =>
      rule.badgeProgress
        .filter((progress) => progress.badgeId === badge.id)
        .map((progress) => ({
          current: Math.min(eventCountMap.get(rule.event) ?? 0, progress.threshold),
          target: progress.threshold
        }))
    )
    .sort((left, right) => right.current / right.target - left.current / left.target);

  const progress = ruleProgress[0];
  if (progress) return `${progress.current}/${progress.target}`;
  return undefined;
}

export default function BadgesPage() {
  return (
    <Suspense fallback={null}>
      <BadgesContent />
    </Suspense>
  );
}

function BadgesContent() {
  const searchParams = useSearchParams();
  const snapshot = useGamificationSnapshot();
  const activeFilter = normalizeBadgeFilter(searchParams.get("filter") ?? undefined);
  const badgeCollections = useMemo(() => getBadgeCollections(snapshot.earnedBadgeIds), [snapshot.earnedBadgeIds]);
  const earnedBadges = badgeCollections.earnedBadges;
  const lockedBadges = badgeCollections.lockedBadges;
  const eventCountMap = useMemo(() => new Map(snapshot.eventCounts.map((record) => [record.event, record.count])), [snapshot.eventCounts]);

  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between px-3 text-[17px] font-semibold"
    >
      <GamificationSync />
      <header className="relative mt-12 flex items-center justify-center">
        <Link href="/dashboard" className={`absolute left-0 ${mobileIconButtonClass}`} aria-label="Back to dashboard">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <h1 className="text-[28px] font-medium leading-none text-white">Badges</h1>
      </header>

      <nav className="mt-8 rounded-full border border-white/10 bg-white/[0.07] p-1 shadow-[inset_0_0_18px_rgba(255,255,255,0.05),0_10px_28px_rgba(0,0,0,0.2)] backdrop-blur-xl">
        <div className="grid grid-cols-3 gap-1 text-center text-[14px] font-medium">
          {badgeFilters.map((filter) => (
            <Link
              key={filter.value}
              href={badgeFilterHref(filter.value)}
              className={`rounded-full px-2 py-2.5 transition ${
                activeFilter === filter.value ? "bg-white/11 text-[#ffb12b] shadow-[inset_0_0_16px_rgba(255,255,255,0.05)]" : "text-white/54"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="mt-6 pb-8">
        <MobileCard variant="dashboard" className="px-3 py-3">
          <div className="grid grid-cols-[1fr_162px] items-start gap-4">
            <div>
              <div className="text-[18px] text-white/64">Progress</div>
              <div className="mt-5 flex items-end gap-3">
                <span className="text-[48px] font-medium leading-none text-[#ffb12b]">{badgeCollections.earnedBadges.length}</span>
                <span className="pb-1 text-[26px] text-white/72">/ {badgeCollections.totalBadges}</span>
              </div>
              <div className="mt-3 text-[18px] text-white/58">Badges earned</div>
              <div className="mt-5 h-2.5 rounded-full bg-white/13">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#c57b0b] via-[#ffb12b] to-[#ffd45c] shadow-[0_0_18px_rgba(255,177,43,0.32)]"
                  style={{ width: `${badgeCollections.progressPercent}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.06em] text-white/52">{badgeCollections.progressPercent}% complete</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.22)_0%,rgba(7,23,50,0.68)_100%)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(2,10,28,0.34)]">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-white/12 bg-[#06152b]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_18px_rgba(0,0,0,0.38)]">
                <Trophy className="h-10 w-10 text-[#ffd867]" strokeWidth={1.7} aria-hidden="true" />
              </div>
              <div className="mt-3 text-[10px] font-medium uppercase tracking-[0.08em] text-white/46">Current title</div>
              <div className="mt-1.5 text-[19px] font-medium leading-none text-[#ffbd39]">Level {snapshot.level}</div>
              <div className="mt-1 text-[11px] text-white/58">{snapshot.levelTitle}</div>
              <div className="mt-2 text-[10px] font-medium uppercase tracking-[0.06em] text-white/52">{snapshot.xpProgress}% toward next level</div>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.2)_0%,rgba(7,23,50,0.64)_100%)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_8px_20px_rgba(2,10,28,0.3)]">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-medium leading-none text-white">Activity by type</h2>
              <Link href="/impact" className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#ffbd39]">
                Open impact
              </Link>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {activitySignals.map((signal) => (
                <Link
                  key={signal.event}
                  href={signal.href}
                  className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.035] px-2 py-1.5 text-[11px] transition hover:bg-white/[0.06]"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: signal.tone }} />
                    <span className="truncate text-white/68">{signal.label}</span>
                  </span>
                  <span className="font-medium text-white/82">{eventCountMap.get(signal.event) ?? 0}</span>
                </Link>
              ))}
            </div>
          </div>
        </MobileCard>

        {activeFilter !== "locked" ? (
          <>
            <div className="mt-8 flex items-center justify-between">
              <h2 className="text-[23px] font-medium leading-none">Earned badges</h2>
              <span className={mobileViewAllClass}>{earnedBadges.length}/{badgeCollections.totalBadges}</span>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-x-8 gap-y-10">
              {earnedBadges.map((badge) => (
                <EarnedBadgeTile key={badge.id} badge={badge} showDescription />
              ))}
            </div>
          </>
        ) : null}

        {activeFilter !== "earned" ? (
          <div className="mt-8 border-t border-white/10 pt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-[23px] font-medium leading-none">Locked badges</h2>
              <span className={mobileViewAllClass}>{lockedBadges.length}/{badgeCollections.totalBadges}</span>
            </div>
            <div className="mt-7 grid grid-cols-3 gap-x-7 gap-y-10">
              {lockedBadges.map((badge) => (
                <LockedBadgeTile
                  key={badge.id}
                  badge={badge}
                  progressLabel={getLockedBadgeProgressLabel({ badge, eventCountMap })}
                  showDescription
                />
              ))}
            </div>
          </div>
        ) : null}
      </main>

      <MobileBottomNav
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { active: true, href: "/impact", icon: <CheckCircle2 />, label: "Impact" },
          { href: "/alerts", icon: <Bell />, label: "Alerts" },
          { href: "/settings", icon: <Settings />, label: "Settings" }
        ]}
      />
    </MobileShell>
  );
}
