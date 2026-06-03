"use client";

import { EarnedBadgeTile, LockedBadgeTile } from "@/components/gamification-ui";
import { GamificationSync } from "@/components/gamification-sync";
import { useGamificationSnapshot } from "@/components/gamification-live-stats";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";
import { getBadgeCollections, type GamificationEventType } from "@/lib/gamification";
import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Bell, CheckCircle2, FileText, Home, Trophy, UserRound } from "lucide-react";

type BadgeFilter = "all" | "earned" | "locked";

const badgeFilters: Array<{ label: string; value: BadgeFilter }> = [
  { label: "All", value: "all" },
  { label: "Earned", value: "earned" },
  { label: "Locked", value: "locked" }
];

const activitySignals: Array<{ event: GamificationEventType; href: string; label: string; tone: string }> = [
  { event: "track-bill", href: "/search?type=bills&focus=results", label: "Bills Tracked", tone: "#ffbd39" },
  { event: "review-vote", href: "/search?type=votes&focus=results", label: "Votes Reviewed", tone: "#79a8ff" },
  { event: "participate-election", href: "/impact#election-participation", label: "Elections Logged", tone: "#ffd45c" },
  { event: "read-alert", href: "/alerts", label: "Alerts Read", tone: "#4fdb89" },
  { event: "contact-representative", href: "/search?type=members&focus=results", label: "Rep Contacts", tone: "#d18bff" },
  { event: "sign-petition", href: "/petitions", label: "Petitions Signed", tone: "#c08dff" },
  { event: "open-official-source", href: "/search?focus=results", label: "Source Checks", tone: "#74dbff" }
];

function normalizeBadgeFilter(filter?: string): BadgeFilter {
  return filter === "earned" || filter === "locked" ? filter : "all";
}

function badgeFilterHref(filter: BadgeFilter) {
  return filter === "all" ? "/badges" : `/badges?filter=${filter}`;
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
  const earnedBadges = activeFilter === "earned" ? badgeCollections.earnedBadges : badgeCollections.featuredEarnedBadges;
  const lockedBadges = activeFilter === "locked" ? badgeCollections.lockedBadges : badgeCollections.lockedBadges.slice(0, 3);
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
              <div className="mt-3 text-[18px] text-white/58">Badges Earned</div>
              <div className="mt-5 h-2.5 rounded-full bg-white/13">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#c57b0b] via-[#ffb12b] to-[#ffd45c] shadow-[0_0_18px_rgba(255,177,43,0.32)]"
                  style={{ width: `${badgeCollections.progressPercent}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.06em] text-white/52">{badgeCollections.progressPercent}% completion</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.22)_0%,rgba(7,23,50,0.68)_100%)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(2,10,28,0.34)]">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-white/12 bg-[#06152b]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_18px_rgba(0,0,0,0.38)]">
                <Trophy className="h-10 w-10 text-[#ffd867]" strokeWidth={1.7} aria-hidden="true" />
              </div>
              <div className="mt-3 text-[10px] font-medium uppercase tracking-[0.08em] text-white/46">Level State</div>
              <div className="mt-1.5 text-[19px] font-medium leading-none text-[#ffbd39]">Level {snapshot.level}</div>
              <div className="mt-1 text-[11px] text-white/58">{snapshot.levelTitle}</div>
              <div className="mt-2 text-[10px] font-medium uppercase tracking-[0.06em] text-white/52">{snapshot.xpProgress}% to next level</div>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.2)_0%,rgba(7,23,50,0.64)_100%)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_8px_20px_rgba(2,10,28,0.3)]">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-medium leading-none text-white">Action Signals</h2>
              <Link href="/impact" className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#ffbd39]">
                Open Impact
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
              <h2 className="text-[23px] font-medium leading-none">Earned Badges</h2>
              {activeFilter === "all" ? (
                <Link href="/badges?filter=earned" className={mobileViewAllClass}>
                  View All
                </Link>
              ) : null}
            </div>

            <div className={`mt-8 grid grid-cols-3 gap-x-8 ${activeFilter === "earned" ? "gap-y-10" : "gap-y-8"}`}>
              {earnedBadges.map((badge) => (
                <EarnedBadgeTile key={badge.id} badge={badge} showDescription={activeFilter === "earned"} />
              ))}
            </div>
          </>
        ) : null}

        {activeFilter !== "earned" ? (
          <div className="mt-8 border-t border-white/10 pt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-[23px] font-medium leading-none">Locked Badges</h2>
              {activeFilter === "all" ? (
                <Link href="/badges?filter=locked" className={mobileViewAllClass}>
                  View All
                </Link>
              ) : null}
            </div>
            <div className={`mt-7 grid grid-cols-3 gap-x-7 ${activeFilter === "locked" ? "gap-y-10" : "gap-y-9"}`}>
              {lockedBadges.map((badge) => (
                <LockedBadgeTile key={badge.id} badge={badge} showDescription={activeFilter === "locked"} />
              ))}
            </div>
          </div>
        ) : null}
      </main>

      <MobileBottomNav
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { href: "/search", icon: <CheckCircle2 />, label: "Track" },
          { active: true, href: "/alerts", icon: <Bell />, label: "Alerts" },
          { href: "/account", icon: <UserRound />, label: "Profile" }
        ]}
      />
    </MobileShell>
  );
}
