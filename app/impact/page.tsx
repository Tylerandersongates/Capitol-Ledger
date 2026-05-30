import { EarnedBadgeTile } from "@/components/gamification-ui";
import { GamificationSync } from "@/components/gamification-sync";
import {
  CivicScoreValue,
  DayStreakValue,
  ImpactActionsList,
  LevelProgressBar,
  LevelStatusValue,
  MonthlyGainValue,
  TotalActionsValue
} from "@/components/gamification-live-stats";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";
import { getRecentAchievements } from "@/lib/gamification";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  FileText,
  Flame,
  Home,
  Info,
  UserRound
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ImpactPage() {
  const recentAchievements = getRecentAchievements();

  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between px-3 text-[17px] font-semibold"
    >
      <GamificationSync />
      <header className="relative mt-12 flex items-center">
        <Link href="/account" className={mobileIconButtonClass} aria-label="Back to account">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <h1 className="ml-7 text-[28px] font-medium leading-none text-white">Your Impact</h1>
      </header>

      <main className="mt-7 space-y-5 pb-8">
        <MobileCard variant="dashboard" className="grid grid-cols-[1fr_168px] items-center px-5 py-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[21px] font-medium leading-none">Civic Score</h2>
              <Info className="h-5 w-5 text-white/48" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <CivicScoreValue className="mt-8 block text-[48px] font-medium leading-none text-[#ffb12b]" />
            <MonthlyGainValue className="mt-5 block text-[19px] font-medium text-[#43ed74]" />
          </div>
          <div className="orbital-mark relative grid min-h-[178px] place-items-center">
            <div className="absolute h-44 w-44 rounded-full border border-rust/20" />
            <div className="absolute h-36 w-36 rounded-full border border-rust/20" />
            <div className="grid h-32 w-32 place-items-center rounded-full bg-[conic-gradient(#ffca42_0_83%,rgba(255,255,255,0.07)_83%_100%)] shadow-[0_0_42px_rgba(255,177,43,0.28)]">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-[#06152b]">
                <img src="/capitol-ledger-logo.png" alt="" className="h-20 w-20 rounded-full object-cover" />
              </div>
            </div>
          </div>
        </MobileCard>

        <MobileCard variant="dashboard" className="grid grid-cols-[70px_1fr] items-center gap-4 px-5 py-5">
          <div className="grid h-16 w-16 place-items-center border border-white/60 text-white/72" style={{ clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)" }}>
            <UserRound className="h-8 w-8" strokeWidth={1.6} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-end justify-between gap-4">
              <LevelStatusValue />
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-white/13">
              <LevelProgressBar />
            </div>
          </div>
        </MobileCard>

        <MobileCard variant="dashboard" className="px-5 py-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[21px] font-medium leading-none">Recent Achievements</h2>
            <Link href="/badges" className={mobileViewAllClass}>
              View All
            </Link>
          </div>
          <div className="mt-7 grid grid-cols-3 gap-x-7">
            {recentAchievements.map((achievement) => (
              <EarnedBadgeTile key={achievement.id} badge={achievement} size="medium" showDescription />
            ))}
          </div>
        </MobileCard>

        <MobileCard variant="dashboard" className="px-5 py-6">
          <div className="flex items-center gap-2">
            <h2 className="text-[21px] font-medium leading-none">Engagement Streak</h2>
            <Info className="h-5 w-5 text-white/48" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div className="mt-6 grid grid-cols-[70px_1fr] items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[#ffb12b]/12 text-[#ffb12b]">
              <Flame className="h-12 w-12 fill-[#ffb12b] stroke-[#ffdf69]" strokeWidth={1.4} aria-hidden="true" />
            </div>
            <div className="grid grid-cols-[0.9fr_1.25fr] items-center gap-4">
              <div>
                <DayStreakValue className="text-[30px] font-medium leading-none text-[#ffb12b]" />
                <div className="mt-3 text-[18px] text-white/70">Keep it going!</div>
              </div>
              <div className="grid grid-cols-6 gap-2 text-center text-[13px]">
                {["M", "T", "W", "T", "F", "S"].map((day, index) => (
                  <div key={`${day}-${index}`}>
                    <div className={index === 5 ? "text-[#ffb12b]" : "text-white/45"}>{day}</div>
                    <div className={`mt-3 grid h-7 w-7 place-items-center rounded-full text-[15px] ${index === 5 ? "bg-[#ffb12b] font-semibold text-[#061126]" : "border border-[#73dd6d] text-[#73dd6d]"}`}>
                      {index === 5 ? "S" : "✓"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </MobileCard>

        <MobileCard variant="dashboard" className="px-5 py-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[21px] font-medium leading-none">Impact Breakdown</h2>
            <div className="text-[16px] text-white/55">
              This Month
            </div>
          </div>
          <div className="mt-7 grid grid-cols-[150px_1fr] items-center gap-5">
            <div className="relative h-36 w-36 rounded-full bg-[conic-gradient(#ff6f2d_0_25%,#5c75b7_25%_38%,#516bab_38%_50%,#49c878_50%_88%,#9ca3af_88%_100%)]">
              <div className="absolute inset-[28px] grid place-items-center rounded-full bg-[#06152b] text-center">
                <div>
                  <div className="text-[28px] font-medium leading-none text-[#ffb12b]"><TotalActionsValue /></div>
                  <div className="mt-2 text-[16px] leading-none text-white/72">Actions</div>
                </div>
              </div>
            </div>
            <ImpactActionsList />
          </div>
        </MobileCard>
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
