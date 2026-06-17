import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";
import { PlanFeatureGate } from "@/components/subscription-controls";
import Image from "next/image";
import Link from "next/link";
import { Bell, Building2, CheckCircle2, ChevronRight, Home, Landmark, Map, Settings, UsersRound } from "lucide-react";
import { getAllBills, getBillStatus, getDemoStats } from "@/lib/data";
import { getCurrentEffectiveAccountSubscription } from "@/lib/effective-account-subscription";

const levelFilters = [
  {
    label: "Federal",
    value: "federal",
    icon: <Landmark />,
    activeClassName: "border-[#69a8ff]/50 bg-[#2b8dff]/18 text-blue-100",
    inactiveClassName: "border-white/12 bg-white/4 text-white/58"
  },
  {
    label: "State",
    value: "state",
    icon: <Map />,
    activeClassName: "border-rust/30 bg-white/5 text-[#ffb12b]",
    inactiveClassName: "border-white/12 bg-white/4 text-white/58"
  },
  {
    label: "Local",
    value: "local",
    icon: <Building2 />,
    activeClassName: "border-[#d989ff]/38 bg-[#d989ff]/10 text-[#e7b8ff]",
    inactiveClassName: "border-white/12 bg-white/4 text-white/58"
  }
] as const;

const layerToggles = [
  ["Active Bills", true],
  ["Upcoming Votes", true],
  ["Policy Impact", true],
  ["Elections", false]
] as const;

export const dynamic = "force-dynamic";

const mapPoints = [
  ["12%", "45%", "#ffb12b"],
  ["22%", "37%", "#69a8ff"],
  ["32%", "57%", "#69a8ff"],
  ["45%", "32%", "#ffb12b"],
  ["54%", "51%", "#ff6f2d"],
  ["66%", "42%", "#ffb12b"],
  ["76%", "34%", "#ff6f2d"],
  ["84%", "48%", "#ffb12b"]
] as const;

export default async function MapPage({ searchParams }: { searchParams?: { level?: string } }) {
  const activeLevel = levelFilters.some((level) => level.value === searchParams?.level) ? searchParams?.level : "federal";
  const initialSubscription = await getCurrentEffectiveAccountSubscription();
  const stats = getDemoStats();
  const trackedBills = getAllBills()
    .slice(0, 3)
    .map((bill) => {
      const status = getBillStatus(bill);
      return {
        id: bill.id,
        displayNumber: bill.displayNumber,
        title: bill.shortTitle,
        meta: bill.committeeName ?? bill.policyArea,
        status,
        tone: status === "In Committee" ? "text-[#ffb12b]" : status === "On Floor" ? "text-[#d989ff]" : "text-[#43ed74]"
      };
    });

  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between px-3 text-[17px] font-semibold"
    >
            <header className="mt-10 flex items-center justify-between">
              <Link href="/dashboard" className="flex items-center gap-3">
                <Image src="/capitol-ledger-logo.png" alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                <div className="whitespace-nowrap text-[17px] font-semibold uppercase tracking-normal text-white">
                  Capitol <span className="text-brass">Ledger</span> <span className="text-brass/85">CE</span>
                </div>
              </Link>
              <Link href="/alerts" className={`relative ${mobileIconButtonClass}`} aria-label="Alerts">
                <Bell className="h-7 w-7" strokeWidth={1.9} aria-hidden="true" />
                <span className="absolute right-2 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#ff8a00] text-[11px] font-semibold text-white">3</span>
              </Link>
            </header>

            <main className="mt-7 space-y-5 pb-8">
              <MobileCard className="px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[12px] font-semibold uppercase tracking-wide text-white/55">Your District</div>
                    <h1 className="mt-2 text-[23px] font-medium leading-none text-white">Austin, Texas</h1>
                    <p className="mt-2 text-[15px] text-white/58">Travis County · TX-10</p>
                  </div>
                  <Link href="/onboarding" className="rounded-xl bg-civic/20 px-4 py-2 text-[14px] font-semibold text-[#9bc5ff]">Change</Link>
                </div>
              </MobileCard>

              <PlanFeatureGate feature="teamDashboard" initialSubscription={initialSubscription}>
                <MobileCard className="px-5 py-5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-white/55">Civic Team Workspace</div>
                      <h2 className="mt-2 text-[23px] font-medium leading-tight">Shared government watchlist</h2>
                      <p className="mt-3 text-[15px] leading-snug text-white/58">
                        Coordinate federal, state, and local monitoring with team-owned watchlists and shared alerts.
                      </p>
                    </div>
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#69d7ff]/12 text-[#69d7ff]">
                      <UsersRound className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <MiniMetric value="4" label="Seats" />
                    <MiniMetric value="12" label="Watchlists" />
                    <MiniMetric value="38" label="Shared alerts" />
                  </div>
                  <Link href="/team" className={`${mobileViewAllClass} mt-5 flex h-11 items-center justify-center`}>
                    Open Workspace
                  </Link>
                </MobileCard>
              </PlanFeatureGate>

              <MobileCard className="overflow-hidden px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[12px] font-semibold uppercase tracking-wide text-white/55">United States Overview</div>
                    <h2 className="mt-2 text-[23px] font-medium leading-tight">Government Map</h2>
                  </div>
                  <ChevronRight className="mt-3 h-6 w-6 text-white/48" strokeWidth={1.8} aria-hidden="true" />
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <MiniMetric value={String(stats.billCount)} label="Active Bills" />
                  <MiniMetric value={String(stats.voteCount)} label="Votes" />
                  <MiniMetric value={String(stats.updateCount)} label="Updates" />
                </div>

                <div className="relative mt-5 h-52 overflow-hidden rounded-2xl border border-white/10 bg-[#041226]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_45%,rgba(105,168,255,0.26),transparent_28%),radial-gradient(circle_at_70%_42%,rgba(255,138,0,0.24),transparent_32%)]" />
                  <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(234,242,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(234,242,255,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />
                  <div className="absolute left-[9%] top-[27%] h-24 w-[37%] rounded-[50%_28%_42%_36%] border border-[#69a8ff]/70 bg-[#2b8dff]/18 shadow-[0_0_32px_rgba(43,141,255,0.22)]" />
                  <div className="absolute right-[8%] top-[25%] h-28 w-[48%] rounded-[38%_48%_44%_35%] border border-[#ffb12b]/65 bg-[#ff8a00]/17 shadow-[0_0_34px_rgba(255,138,0,0.22)]" />
                  <div className="absolute left-[23%] top-[47%] h-14 w-[35%] rotate-6 rounded-[32%_45%_40%_45%] border border-[#69a8ff]/55 bg-[#2b8dff]/12" />
                  <div className="absolute right-[23%] top-[49%] h-16 w-[36%] -rotate-3 rounded-[44%_38%_45%_34%] border border-[#ffb12b]/55 bg-[#ff8a00]/12" />
                  {mapPoints.map(([left, top, color]) => (
                    <span
                      key={`${left}-${top}`}
                      className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/55 shadow-[0_0_18px_currentColor]"
                      style={{ left, top, color, backgroundColor: color }}
                    />
                  ))}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[11px] uppercase tracking-wide text-white/58">
                    <span>Policy activity</span>
                    <span className="h-2 w-28 rounded-full bg-gradient-to-r from-[#2b8dff] via-[#ffb12b] to-[#ff503d]" />
                    <span>High</span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  {levelFilters.map((level) => (
                    <Link
                      key={level.label}
                      href={`/map?level=${level.value}`}
                      className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-[14px] font-semibold ${activeLevel === level.value ? level.activeClassName : level.inactiveClassName}`}
                      aria-current={activeLevel === level.value ? "page" : undefined}
                    >
                      <span className="[&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-[1.8]">{level.icon}</span>
                      {level.label}
                    </Link>
                  ))}
                </div>
              </MobileCard>

              <MobileCard className="px-5 py-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-[22px] font-medium leading-none">Legislation Tracker</h2>
                  <Link href="/search?type=bills" className={mobileViewAllClass}>View All</Link>
                </div>
                <div className="mt-5 divide-y divide-white/8">
                  {trackedBills.map((bill) => (
                    <Link key={bill.id} href={`/bills/${bill.id}`} className="flex items-center justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <div className="text-[16px] font-semibold text-white">{bill.displayNumber}</div>
                        <div className="mt-1 truncate text-[15px] text-white/68">{bill.title}</div>
                        <div className="mt-1 text-[12px] text-white/45">{bill.meta}</div>
                      </div>
                      <span className={`shrink-0 text-right text-[13px] font-semibold ${bill.tone}`}>{bill.status}</span>
                    </Link>
                  ))}
                </div>
              </MobileCard>

              <div className="grid grid-cols-[1fr_0.9fr] gap-5">
                <MobileCard className="px-5 py-5">
                  <h2 className="text-[20px] font-medium leading-none">Map Layers</h2>
                  <div className="mt-5 space-y-4">
                    {layerToggles.map(([label, enabled]) => (
                      <div key={label} className="flex items-center justify-between gap-3">
                        <span className="text-[14px] text-white/70">{label}</span>
                        <span className={`h-6 w-11 rounded-full border p-0.5 ${enabled ? "border-[#69a8ff]/50 bg-[#2b8dff]/35" : "border-white/15 bg-white/8"}`}>
                          <span className={`block h-5 w-5 rounded-full ${enabled ? "translate-x-5 bg-[#69a8ff]" : "bg-white/38"}`} />
                        </span>
                      </div>
                    ))}
                  </div>
                </MobileCard>

                <MobileCard className="px-5 py-5">
                  <h2 className="text-[20px] font-medium leading-none">Civic Score</h2>
                  <div className="mt-5 flex items-center gap-3">
                    <Image src="/capitol-ledger-logo.png" alt="" width={56} height={56} className="h-14 w-14 rounded-full object-cover" />
                    <div>
                      <div className="text-[28px] font-medium leading-none text-[#ffb12b]">1,250</div>
                      <div className="mt-1 text-[13px] text-[#43ed74]">↑ 75 this month</div>
                    </div>
                  </div>
                  <div className="mt-5 h-2 rounded-full bg-white/13">
                    <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-[#c57b0b] via-[#ffb12b] to-[#ffd45c]" />
                  </div>
                </MobileCard>
              </div>
            </main>

            <MobileBottomNav
              items={[
                { href: "/dashboard", icon: <Home />, label: "Home" },
                { active: true, href: "/map", icon: <Map />, label: "Map" },
                { href: "/search", icon: <CheckCircle2 />, label: "Track" },
                { href: "/alerts", icon: <Bell />, label: "Alerts" },
                { href: "/settings", icon: <Settings />, label: "Settings" }
              ]}
            />
    </MobileShell>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center">
      <div className="text-[21px] font-medium leading-none text-white">{value}</div>
      <div className="mt-1 text-[11px] text-white/50">{label}</div>
    </div>
  );
}
