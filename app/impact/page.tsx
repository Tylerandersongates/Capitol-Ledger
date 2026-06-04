import { GamificationSync } from "@/components/gamification-sync";
import {
  CivicScoreValue,
  CivicLevelPathCard,
  DayStreakValue,
  LevelProgressBar,
  LevelStatusValue,
  MonthlyGainValue,
  PremiumImpactBreakdown,
  RecentAchievementsList,
  StreakWeekIndicator,
  XpProgressValue
} from "@/components/gamification-live-stats";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";
import { ElectionParticipationCard } from "@/components/election-participation-card";
import { VoterRegistrationCard } from "@/components/voter-registration-card";
import Image from "next/image";
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
  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between px-3 text-[17px] font-semibold"
    >
      <GamificationSync />
      <header className="relative mt-12 flex items-center">
        <Link href="/dashboard" className={mobileIconButtonClass} aria-label="Back to dashboard">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <h1 className="ml-7 text-[28px] font-medium leading-none text-white">Your Impact</h1>
      </header>

      <main className="mt-7 space-y-5 pb-8">
        <MobileCard variant="dashboard" className="px-3 py-3">
          <div className="grid grid-cols-[1fr_162px] items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[21px] font-medium leading-none">Civic Score</h2>
                <Info className="h-5 w-5 text-white/48" strokeWidth={1.8} aria-hidden="true" />
              </div>
              <CivicScoreValue className="mt-6 block text-[48px] font-medium leading-none text-[#ffb12b]" />
              <MonthlyGainValue className="mt-4 block text-[19px] font-medium text-[#43ed74]" />
            </div>
            <div className="rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.22)_0%,rgba(7,23,50,0.68)_100%)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(2,10,28,0.34)]">
              <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-[#d59a31]/80 bg-[radial-gradient(circle,rgba(255,177,43,0.18)_0%,rgba(28,102,180,0.22)_40%,rgba(4,17,39,0.94)_72%)] shadow-[inset_0_1px_0_rgba(255,210,120,0.22),0_0_22px_rgba(255,177,43,0.22),0_0_28px_rgba(35,132,255,0.12)]">
                <span className="absolute inset-[-5px] rounded-full border border-[#ffb12b]/42" />
                <Image src="/capitol-ledger-logo.png" alt="" width={72} height={72} className="h-[72px] w-[72px] rounded-full object-cover" />
              </div>
              <div className="mt-3 text-[10px] font-medium uppercase tracking-[0.08em] text-white/46">XP Progress</div>
              <div className="mt-1.5 h-2 rounded-full bg-white/13">
                <LevelProgressBar />
              </div>
              <XpProgressValue className="mt-2 block text-[10px] font-medium uppercase tracking-[0.06em] text-white/60" />
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

        <MobileCard variant="dashboard" className="overflow-hidden px-5 py-5">
          <CivicLevelPathCard />
        </MobileCard>

        <MobileCard variant="dashboard" className="px-5 py-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[21px] font-medium leading-none">Recent Achievements</h2>
            <Link href="/badges" className={mobileViewAllClass}>
              View All
            </Link>
          </div>
          <RecentAchievementsList />
        </MobileCard>

        <VoterRegistrationCard />

        <ElectionParticipationCard />

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
              <StreakWeekIndicator />
            </div>
          </div>
        </MobileCard>

        <MobileCard variant="dashboard" className="overflow-hidden px-5 py-5">
          <PremiumImpactBreakdown />
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
