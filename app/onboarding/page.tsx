import { MobileShell } from "@/components/mobile-shell";
import { NotificationPreferencesEditor, OnboardingDistrictSetup, OnboardingMatchedOfficials } from "@/components/account-profile-controls";
import { GamificationEventLink } from "@/components/gamification-actions";
import { MobileCard } from "@/components/mobile-ui";
import Link from "next/link";
import {
  Bell,
  Check,
  Landmark,
  LocateFixed,
  MapPin,
  ShieldCheck,
  UserRound,
  Vote
} from "lucide-react";
import { getAllMembers } from "@/lib/data";

const setupSteps = [
  { label: "District", detail: "TX-10 located", icon: <MapPin />, complete: true },
  { label: "Officials", detail: "3 matched", icon: <UserRound />, complete: true },
  { label: "Issues", detail: "Choose signals", icon: <Vote />, complete: false },
  { label: "Alerts", detail: "Set reminders", icon: <Bell />, complete: false }
];

const issueSignals = ["Healthcare", "Education", "Infrastructure", "Veterans", "Environment", "Public Safety"];

export default function OnboardingPage() {
  const allMembers = getAllMembers();

  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      backgroundClassName="bg-[radial-gradient(circle_at_18%_9%,rgba(34,141,255,0.24),transparent_31%),radial-gradient(circle_at_82%_18%,rgba(246,216,75,0.13),transparent_28%),linear-gradient(155deg,#061a33_0%,#020916_55%,#06182d_100%)]"
      statusBarClassName="flex items-center justify-between px-3 text-[17px] font-semibold"
    >
            <header className="mt-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/capitol-ledger-logo.png" alt="" className="h-11 w-11 rounded-full object-cover" />
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
                <div className="flex items-center justify-between">
                  <h2 className="text-[21px] font-medium leading-none">Setup Flow</h2>
                  <span className="text-[13px] font-semibold text-[#ffb12b]">State matched</span>
                </div>
                <div className="mt-5 grid gap-3">
                  {setupSteps.map((step, index) => (
                    <div key={step.label} className="grid grid-cols-[42px_1fr_auto] items-center gap-3 rounded-2xl border border-white/8 bg-white/4 p-4">
                      <span className={`grid h-10 w-10 place-items-center rounded-full ${step.complete ? "bg-[#43ed74]/14 text-[#43ed74]" : "bg-[#ffb12b]/12 text-[#ffb12b]"}`}>
                        {step.complete ? <Check className="h-5 w-5" strokeWidth={2.1} aria-hidden="true" /> : <span className="[&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[1.8]">{step.icon}</span>}
                      </span>
                      <div>
                        <div className="text-[16px] font-semibold text-white">{step.label}</div>
                        <div className="mt-1 text-[13px] text-white/50">{step.detail}</div>
                      </div>
                      <span className="text-[13px] font-semibold text-white/36">0{index + 1}</span>
                    </div>
                  ))}
                </div>
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
                <div className="mt-5 flex flex-wrap gap-2">
                  {issueSignals.map((issue, index) => (
                    <span
                      key={issue}
                      className={`rounded-full border px-3 py-2 text-[13px] font-semibold ${
                        index < 4 ? "border-[#ffb12b]/38 bg-[#ffb12b]/12 text-[#ffb12b]" : "border-white/12 bg-white/5 text-white/58"
                      }`}
                    >
                      {issue}
                    </span>
                  ))}
                </div>
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
