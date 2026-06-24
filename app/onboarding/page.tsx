import { MobileShell } from "@/components/mobile-shell";
import {
  NotificationPreferencesEditor,
  OnboardingCompleteButton,
  OnboardingDistrictSetup,
  OnboardingMatchedOfficials,
  OnboardingProgressMeter,
  OnboardingSetupMetricsProvider,
  OnboardingSetupFlow
} from "@/components/account-profile-controls";
import { MobileCard, mobileViewAllClass } from "@/components/mobile-ui";
import { OnboardingPartyAffiliationSelector } from "@/components/party-affiliation-control";
import { IssueInterestChips } from "@/components/saved-ledger-controls";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  Flag,
  Landmark,
  LocateFixed,
  MapPin,
  Vote
} from "lucide-react";
import { getAllMembers } from "@/lib/data";
import { issueSignals } from "@/lib/issue-signals";
import type { ReactNode } from "react";

const onboardingAmbientClass =
  "bg-[radial-gradient(circle_at_16%_8%,rgba(48,129,214,0.14),transparent_32%),radial-gradient(circle_at_84%_8%,rgba(255,177,43,0.09),transparent_30%),linear-gradient(180deg,rgba(2,10,24,0.12)_0%,rgba(1,8,21,0.62)_56%,rgba(1,6,18,0.9)_100%)]";
const onboardingBackgroundClass = "bg-[linear-gradient(180deg,#071a34_0%,#041226_36%,#020b1c_72%,#010716_100%)]";
const onboardingCardAccentClass =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(56,146,255,0.18),transparent_34%),radial-gradient(circle_at_86%_8%,rgba(255,177,43,0.1),transparent_30%)]";
const onboardingSectionIconClass =
  "grid h-10 w-10 place-items-center rounded-2xl border border-white/12 bg-white/[0.055] text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(1,8,24,0.32)] [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[1.8]";

export default function OnboardingPage() {
  const allMembers = getAllMembers();

  return (
    <MobileShell
      ambientClassName={onboardingAmbientClass}
      backgroundClassName={onboardingBackgroundClass}
      minHeight="min-h-[1500px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
            <header className="mt-10 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="relative grid h-[96px] w-[96px] shrink-0 place-items-center rounded-full border-2 border-[#d59a31]/80 bg-[radial-gradient(circle,rgba(255,177,43,0.18)_0%,rgba(28,102,180,0.22)_40%,rgba(4,17,39,0.94)_72%)] shadow-[inset_0_1px_0_rgba(255,210,120,0.22),0_0_26px_rgba(255,177,43,0.24),0_0_34px_rgba(35,132,255,0.12)]">
                  <span className="absolute inset-[-6px] rounded-full border border-[#ffb12b]/42" />
                  <Image src="/capitol-ledger-logo.png" alt="" width={92} height={92} className="h-[90px] w-[90px] rounded-full object-cover" />
                </div>
                <div className="min-w-0 whitespace-nowrap text-[16px] font-semibold uppercase tracking-normal text-white/86">
                  Capitol <span className="text-brass">Ledger</span> <span className="text-brass/85">CE</span>
                </div>
              </div>
              <Link href="/dashboard" className={`${mobileViewAllClass} shrink-0 px-4 py-2 text-[14px] text-white/72`}>
                Skip
              </Link>
            </header>

            <OnboardingSetupMetricsProvider members={allMembers}>
              <main className="mt-7 space-y-5 pb-8">
                <OnboardingCard className="px-6 py-6">
                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 rounded-full border border-rust/35 bg-rust/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-[#ffb12b]">
                      <MapPin className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      Get started
                    </div>
                    <h1 className="mt-5 max-w-[22rem] text-[28px] font-medium leading-tight text-white">Set up your civic profile.</h1>
                    <p className="mt-3 max-w-[24rem] text-[17px] leading-snug text-white/64">
                      Add your district so Capitol Ledger can show the officials, bills, votes, and alerts that matter to you.
                    </p>
                  </div>
                  <OnboardingProgressMeter />
                </OnboardingCard>

                <OnboardingCard>
                  <OnboardingSectionHeader icon={<LocateFixed />} title="Find your district" />
                  <OnboardingDistrictSetup members={allMembers} />
                </OnboardingCard>

                <OnboardingCard>
                  <OnboardingSetupFlow />
                </OnboardingCard>

                <OnboardingCard>
                  <OnboardingSectionHeader icon={<Flag />} title="Party affiliation" />
                  <OnboardingPartyAffiliationSelector />
                </OnboardingCard>

                <OnboardingCard>
                  <OnboardingSectionHeader icon={<Landmark />} title="Your officials" />
                  <OnboardingMatchedOfficials members={allMembers} />
                </OnboardingCard>

                <OnboardingCard>
                  <OnboardingSectionHeader icon={<Vote />} title="Topics to follow" />
                  <IssueInterestChips interests={[...issueSignals]} />
                </OnboardingCard>

                <OnboardingCard>
                  <OnboardingSectionHeader icon={<Bell />} title="Alerts" />
                  <NotificationPreferencesEditor compact />
                </OnboardingCard>
              </main>

              <div className="sticky bottom-0 -mx-8 mt-auto border-t border-white/12 bg-[linear-gradient(180deg,rgba(6,24,52,0.78)_0%,rgba(3,14,32,0.96)_100%)] px-8 pb-5 pt-4 backdrop-blur-xl shadow-[0_-16px_34px_rgba(1,8,24,0.46),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <OnboardingCompleteButton />
                <div className="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white/82" />
              </div>
            </OnboardingSetupMetricsProvider>
    </MobileShell>
  );
}

function OnboardingCard({ children, className = "px-5 py-5" }: { children: ReactNode; className?: string }) {
  return (
    <MobileCard variant="dashboard" className={`relative overflow-hidden ${className}`}>
      <div className={onboardingCardAccentClass} />
      <div className="relative z-10">{children}</div>
    </MobileCard>
  );
}

function OnboardingSectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={onboardingSectionIconClass}>{icon}</span>
      <h2 className="text-[21px] font-semibold leading-none text-white">{title}</h2>
    </div>
  );
}
