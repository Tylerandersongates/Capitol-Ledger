import { MobileShell } from "@/components/mobile-shell";
import {
  NotificationPreferencesEditor,
  OnboardingDistrictSetup,
  OnboardingMatchedOfficials,
  OnboardingSetupFlow
} from "@/components/account-profile-controls";
import { GamificationEventLink } from "@/components/gamification-actions";
import { MobileCard } from "@/components/mobile-ui";
import { IssueInterestChips } from "@/components/saved-ledger-controls";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  Landmark,
  LocateFixed,
  MapPin,
  ShieldCheck,
  Vote
} from "lucide-react";
import { getAllMembers } from "@/lib/data";

const issueSignals = ["Healthcare", "Education", "Infrastructure", "Veterans Affairs", "Environment", "Public Safety"];

export default function OnboardingPage() {
  const allMembers = getAllMembers();

  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between px-3 text-[17px] font-semibold"
    >
            <header className="mt-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image src="/capitol-ledger-logo.png" alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
                <div>
                  <div className="text-[12px] font-semibold uppercase tracking-wide text-white/50">Setup</div>
                  <div className="text-[17px] font-semibold uppercase tracking-[0.2em] text-white">
                    Capitol <span className="text-[#ffb12b]">Ledger</span>
                  </div>
                </div>
              </div>
              <Link href="/dashboard" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[14px] font-semibold text-white/60">
                Skip
              </Link>
            </header>

            <main className="mt-8 space-y-5 pb-8">
              <MobileCard className="px-6 py-6">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-rust/35 bg-rust/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-[#ffb12b]">
                      <MapPin className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      District setup
                    </div>
                    <h1 className="mt-5 text-[28px] font-medium leading-tight text-white">Build your civic profile.</h1>
                    <p className="mt-3 text-[17px] leading-snug text-white/64">
                      Start with your district so Capitol Ledger can personalize officials, bills, votes, and alerts.
                    </p>
                  </div>
                  <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-[conic-gradient(#ffca42_0_50%,rgba(255,255,255,0.08)_50%_100%)] shadow-[0_0_34px_rgba(255,177,43,0.22)]">
                    <div className="grid h-20 w-20 place-items-center rounded-full bg-[#06152b] text-[#ffb12b]">
                      <ShieldCheck className="h-10 w-10" strokeWidth={1.7} aria-hidden="true" />
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex items-center justify-between text-[13px] text-white/52">
                    <span>Step 1 of 4</span>
                    <span>50% ready</span>
                  </div>
                  <div className="mt-3 h-2.5 rounded-full bg-white/12">
                    <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#c57b0b] via-[#ffb12b] to-[#ffd45c] shadow-[0_0_18px_rgba(255,177,43,0.32)]" />
                  </div>
                </div>
              </MobileCard>

              <MobileCard className="px-5 py-5">
                <div className="flex items-center gap-2">
                  <LocateFixed className="h-5 w-5 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
                  <h2 className="text-[21px] font-medium leading-none">Find Your District</h2>
                </div>
                <OnboardingDistrictSetup />
              </MobileCard>

              <MobileCard className="px-5 py-5">
                <OnboardingSetupFlow members={allMembers} />
              </MobileCard>

              <MobileCard className="px-5 py-5">
                <div className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
                  <h2 className="text-[21px] font-medium leading-none">Your Officials</h2>
                </div>
                <OnboardingMatchedOfficials members={allMembers} />
              </MobileCard>

              <MobileCard className="px-5 py-5">
                <div className="flex items-center gap-2">
                  <Vote className="h-5 w-5 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
                  <h2 className="text-[21px] font-medium leading-none">Issue Signals</h2>
                </div>
                <IssueInterestChips interests={issueSignals} />
              </MobileCard>

              <MobileCard className="px-5 py-5">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
                  <h2 className="text-[21px] font-medium leading-none">Civic Alerts</h2>
                </div>
                <NotificationPreferencesEditor compact />
              </MobileCard>
            </main>

            <div className="sticky bottom-0 -mx-8 mt-auto border-t border-white/8 bg-[#031126]/96 px-8 pb-5 pt-4 backdrop-blur-xl">
              <GamificationEventLink href="/dashboard" event="complete-onboarding" targetId="district-setup" className="flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[17px] font-semibold text-[#071225] shadow-[0_0_24px_rgba(255,177,43,0.22)]">
                Complete Setup
              </GamificationEventLink>
              <div className="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white/82" />
            </div>
    </MobileShell>
  );
}
