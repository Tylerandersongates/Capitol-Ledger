import { EarnedBadgeTile, LockedBadgeTile } from "@/components/gamification-ui";
import { GamificationSync } from "@/components/gamification-sync";
import { BadgeProgressMetrics } from "@/components/gamification-live-stats";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";
import {
  getEarnedBadges,
  getFeaturedEarnedBadges,
  getLockedBadges
} from "@/lib/gamification";
import Link from "next/link";
import { ArrowLeft, Bell, CheckCircle2, FileText, Home, Trophy, UserRound } from "lucide-react";

type BadgeFilter = "all" | "earned" | "locked";

const badgeFilters: Array<{ label: string; value: BadgeFilter }> = [
  { label: "All", value: "all" },
  { label: "Earned", value: "earned" },
  { label: "Locked", value: "locked" }
];

function normalizeBadgeFilter(filter?: string): BadgeFilter {
  return filter === "earned" || filter === "locked" ? filter : "all";
}

function badgeFilterHref(filter: BadgeFilter) {
  return filter === "all" ? "/badges" : `/badges?filter=${filter}`;
}

export default function BadgesPage({ searchParams }: { searchParams?: { filter?: string } }) {
  const activeFilter = normalizeBadgeFilter(searchParams?.filter);
  const earnedBadges = activeFilter === "earned" ? getEarnedBadges() : getFeaturedEarnedBadges();
  const lockedBadges = activeFilter === "locked" ? getLockedBadges() : getLockedBadges().slice(0, 3);

  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      backgroundClassName="bg-[radial-gradient(circle_at_18%_9%,rgba(34,141,255,0.24),transparent_31%),radial-gradient(circle_at_78%_18%,rgba(246,216,75,0.12),transparent_28%),linear-gradient(155deg,#061a33_0%,#020916_55%,#06182d_100%)]"
      statusBarClassName="flex items-center justify-between px-3 text-[17px] font-semibold"
    >
      <GamificationSync />
      <header className="relative mt-12 flex items-center justify-center">
        <Link href="/impact" className={`absolute left-0 ${mobileIconButtonClass}`} aria-label="Back to impact">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <h1 className="text-[28px] font-medium leading-none text-white">Badges</h1>
      </header>

      <nav className="mt-8 rounded-full border border-white/10 bg-white/6 p-1 shadow-[inset_0_0_18px_rgba(255,255,255,0.04),0_10px_28px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="grid grid-cols-3 gap-1 text-center text-[14px] font-medium">
          {badgeFilters.map((filter) => (
            <Link
              key={filter.value}
              href={badgeFilterHref(filter.value)}
              className={`rounded-full px-2 py-2.5 transition ${
                activeFilter === filter.value ? "bg-white/10 text-[#ffb12b] shadow-[inset_0_0_16px_rgba(255,255,255,0.04)]" : "text-white/54"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="mt-6 pb-8">
        <MobileCard variant="dashboard" className="grid grid-cols-[1fr_168px] items-center px-5 py-5">
          <div>
            <div className="text-[18px] text-white/64">Progress</div>
            <BadgeProgressMetrics />
          </div>
          <div className="orbital-mark relative grid min-h-[178px] place-items-center">
            <div className="absolute h-44 w-44 rounded-full border border-rust/20" />
            <div className="absolute h-36 w-36 rounded-full border border-rust/20" />
            <div className="grid h-32 w-32 place-items-center rounded-full bg-[conic-gradient(#ffdf63_0_50%,rgba(255,255,255,0.07)_50%_100%)] shadow-[0_0_42px_rgba(255,177,43,0.32)]">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-[#06152b] text-[#ffd867]">
                <Trophy className="h-14 w-14" strokeWidth={1.6} aria-hidden="true" />
              </div>
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
