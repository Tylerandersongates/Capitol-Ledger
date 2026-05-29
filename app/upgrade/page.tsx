import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass } from "@/components/mobile-ui";
import { BillingCycleToggle, PlanActionButton, PlanPrice, SubscriptionDemoSwitcher } from "@/components/subscription-controls";
import { isPlanFeatureEnabled, planComparisonRows, subscriptionPlans } from "@/lib/subscription-plans";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Check,
  CheckCircle2,
  Crown,
  FileText,
  Home,
  LockKeyhole,
  Map,
  ShieldCheck,
  Sparkles,
  UserRound
} from "lucide-react";

export default function UpgradePage() {
  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between px-3 text-[17px] font-semibold"
    >
            <header className="relative mt-12 flex items-center justify-center">
              <Link href="/account" className={`absolute left-0 ${mobileIconButtonClass}`} aria-label="Back to account">
                <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
              </Link>
              <h1 className="text-[28px] font-medium leading-none text-white">Upgrade</h1>
              <div className={`absolute right-0 ${mobileIconButtonClass}`}>
                <Crown className="h-7 w-7" strokeWidth={1.9} aria-hidden="true" />
              </div>
            </header>

            <main className="mt-7 space-y-5 pb-8">
              <MobileCard className="overflow-hidden px-6 py-6">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-rust/35 bg-rust/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-[#ffb12b]">
                      <Sparkles className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      Premium intelligence
                    </div>
                    <h2 className="mt-5 text-[28px] font-medium leading-tight text-white">
                      Unlock Capitol Ledger Pro.
                    </h2>
                    <p className="mt-3 text-[17px] leading-snug text-white/64">
                      Advanced tracking, faster alerts, and investor-grade civic intelligence tools.
                    </p>
                  </div>
                  <div className="orbital-mark relative grid h-32 w-32 shrink-0 place-items-center">
                    <div className="absolute h-32 w-32 rounded-full border border-rust/20" />
                    <div className="grid h-24 w-24 place-items-center rounded-full bg-[conic-gradient(#ffca42_0_78%,rgba(255,255,255,0.07)_78%_100%)] shadow-[0_0_42px_rgba(255,177,43,0.28)]">
                      <div className="grid h-20 w-20 place-items-center rounded-full bg-[#06152b] text-[#ffcf54]">
                        <Crown className="h-11 w-11" strokeWidth={1.5} aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                </div>
              </MobileCard>

              <BillingCycleToggle />

              <MobileCard className="px-5 py-5">
                <SubscriptionDemoSwitcher showPreview={false} />
              </MobileCard>

              <MobileCard className="px-6 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[23px] font-medium leading-none">{subscriptionPlans.free.name}</h2>
                    <p className="mt-3 text-[16px] text-white/60">{subscriptionPlans.free.description}.</p>
                  </div>
                  <ShieldCheck className="h-8 w-8 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
                </div>
                <PlanPrice plan="free" />
                <FeatureList items={subscriptionPlans.free.highlights} />
                <PlanActionButton
                  plan="free"
                  inactiveLabel="Switch to Free"
                  className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-white/8 text-[17px] font-semibold text-white"
                />
              </MobileCard>

              <MobileCard className="relative overflow-hidden border-[#ffb12b]/70 px-6 py-6 shadow-[0_0_40px_rgba(255,177,43,0.18)]">
                <div className="absolute right-5 top-5 rounded-full bg-[#ffb12b] px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-[#061126]">Best Value</div>
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-[#ffb12b]/12 text-[#ffb12b]">
                    <Crown className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-[23px] font-medium leading-none">{subscriptionPlans.pro.name}</h2>
                    <p className="mt-2 text-[16px] text-white/60">{subscriptionPlans.pro.description}.</p>
                  </div>
                </div>
                <PlanPrice plan="pro" />
                <FeatureList items={subscriptionPlans.pro.highlights} />
                <PlanActionButton
                  plan="pro"
                  inactiveLabel="Upgrade to Pro"
                  className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[17px] font-semibold text-[#071225] shadow-[0_0_24px_rgba(255,177,43,0.22)]"
                />
              </MobileCard>

              <MobileCard className="px-6 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[23px] font-medium leading-none">{subscriptionPlans.team.name}</h2>
                    <p className="mt-3 text-[16px] text-white/60">{subscriptionPlans.team.description}.</p>
                  </div>
                  <Sparkles className="h-8 w-8 text-[#69d7ff]" strokeWidth={1.8} aria-hidden="true" />
                </div>
                <PlanPrice plan="team" />
                <FeatureList items={subscriptionPlans.team.highlights} />
                <PlanActionButton
                  plan="team"
                  inactiveLabel="Start Team Plan"
                  className="mt-6 flex h-12 w-full items-center justify-center rounded-xl border border-rust/70 text-[17px] font-semibold text-[#ffb12b]"
                />
              </MobileCard>

              <MobileCard className="px-5 py-5">
                <div className="flex items-center gap-2">
                  <LockKeyhole className="h-5 w-5 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
                  <h2 className="text-[21px] font-medium leading-none">Plan Comparison</h2>
                </div>
                <div className="mt-5 divide-y divide-white/8">
                  {planComparisonRows.map(({ featureId, label }) => (
                    <div key={label} className="grid grid-cols-[1fr_44px_44px_44px] items-center gap-2 py-3">
                      <span className="text-[14px] text-white/67">{label}</span>
                      <PlanCheck enabled={isPlanFeatureEnabled("free", featureId)} />
                      <PlanCheck enabled={isPlanFeatureEnabled("pro", featureId)} />
                      <PlanCheck enabled={isPlanFeatureEnabled("team", featureId)} />
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-[1fr_44px_44px_44px] gap-2 text-center text-[11px] uppercase tracking-wide text-white/42">
                  <span />
                  <span>Free</span>
                  <span>Pro</span>
                  <span>Team</span>
                </div>
              </MobileCard>
            </main>

            <MobileBottomNav
              items={[
                { href: "/dashboard", icon: <Home />, label: "Home" },
                { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
                { href: "/map", icon: <Map />, label: "Map" },
                { href: "/alerts", icon: <Bell />, label: "Alerts" },
                { active: true, href: "/account", icon: <UserRound />, label: "Profile" }
              ]}
            />
    </MobileShell>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <div className="mt-6 space-y-3">
      {items.map((item) => (
        <div key={item} className="flex items-center gap-3 text-[16px] text-white/74">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[#ffb12b]/65 text-[#ffb12b]">
            <Check className="h-4 w-4" strokeWidth={2.1} aria-hidden="true" />
          </span>
          {item}
        </div>
      ))}
    </div>
  );
}

function PlanCheck({ enabled }: { enabled: boolean }) {
  return (
    <span className={`mx-auto grid h-6 w-6 place-items-center rounded-full ${enabled ? "border border-[#ffb12b]/65 text-[#ffb12b]" : "bg-white/8 text-white/24"}`}>
      {enabled ? <Check className="h-4 w-4" strokeWidth={2.1} aria-hidden="true" /> : "–"}
    </span>
  );
}
