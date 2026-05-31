import {
  Activity,
  Bell,
  BrainCircuit,
  Crown,
  FileSearch,
  Fingerprint,
  Gauge,
  GitCompareArrows,
  Layers3,
  Map,
  MessageSquareWarning,
  Radar,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  Vote
} from "lucide-react";
import Image from "next/image";

const intelligenceCards = [
  {
    title: "Legislative dashboard",
    body: "Live-style panels for watched officials, bill movement, recent votes, and source confidence.",
    icon: Gauge
  },
  {
    title: "Voting record tracker",
    body: "Heat-map voting patterns with clear yes, no, present, and not voting states.",
    icon: Vote
  },
  {
    title: "Bill analysis interface",
    body: "Plain-English summaries, sponsors, actions, votes, and source-linked legislative context.",
    icon: FileSearch
  },
  {
    title: "Congressional map",
    body: "Geographic intelligence layers for chamber, state, district, issue activity, and accountability.",
    icon: Map
  },
  {
    title: "Notification center",
    body: "Followed officials and bills become a focused civic signal stream instead of a news feed.",
    icon: Bell
  },
  {
    title: "Civic accountability tools",
    body: "Compare public claims against searchable voting, sponsorship, and legislative records.",
    icon: GitCompareArrows
  }
];

const screenVariants = [
  "Command Center",
  "Accountability Feed",
  "Mobile Ledger",
  "Investor Snapshot"
];

const notificationRows = [
  ["Cloture vote logged", "S.1188", "High"],
  ["Bill action updated", "H.R.4021", "New"],
  ["Sponsor added", "S.449", "Watch"]
];

export function ProductEcosystem() {
  return (
    <>
      <section className="border-y border-brass/10 bg-vault/72">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brass">Complete civic intelligence ecosystem</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
                Government transparency with a fintech-grade command surface.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-blue-100/80">
                The visual system scales from iPhone onboarding to tablet dashboards and desktop investor demos.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {screenVariants.map((variant, index) => (
                <div key={variant} className="data-panel rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-blue-100/70">Variation 0{index + 1}</span>
                    <Sparkles className="h-4 w-4 text-brass" aria-hidden="true" />
                  </div>
                  <div className="mt-6 text-lg font-semibold text-white">{variant}</div>
                  <div className="mt-3 h-1.5 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-brass via-rust to-civic" style={{ width: `${64 + index * 8}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {intelligenceCards.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="glass-card rounded-lg p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-brass/20 bg-brass/10 text-brass">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-blue-100/72">{item.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-card rounded-lg p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brass">Bloomberg-terminal signal layer</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Legislative intelligence dashboard</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-md border border-civic/25 bg-civic/10 px-3 py-2 text-xs font-semibold text-aurora">
                <Activity className="h-4 w-4" aria-hidden="true" />
                Live demo mode
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_280px]">
              <div className="data-panel rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Voting heat map</span>
                  <Radar className="h-5 w-5 text-brass" aria-hidden="true" />
                </div>
                <div className="mt-4 grid grid-cols-8 gap-2">
                  {Array.from({ length: 32 }).map((_, index) => (
                    <div
                      key={index}
                      className={`heat-cell ${index % 7 === 0 || index % 11 === 0 ? "heat-cell-hot" : index % 5 === 0 ? "heat-cell-cool" : ""}`}
                    />
                  ))}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <MetricTile label="Alignment" value="72%" />
                  <MetricTile label="Missed votes" value="3" />
                  <MetricTile label="Source links" value="100%" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="data-panel rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <BrainCircuit className="h-5 w-5 text-brass" aria-hidden="true" />
                    Policy trend index
                  </div>
                  <div className="mt-5 space-y-3">
                    {["Health", "Infrastructure", "Security", "Government"].map((label, index) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs text-blue-100/70">
                          <span>{label}</span>
                          <span>{68 + index * 7}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-civic to-brass"
                            style={{ width: `${52 + index * 10}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="data-panel rounded-lg p-4">
                  <div className="text-sm font-semibold text-white">Claim-check readiness</div>
                  <div className="mt-4 flex items-end gap-2">
                    {[42, 76, 58, 88, 64, 92, 73].map((height, index) => (
                      <div key={index} className="flex-1 rounded-t-md bg-gradient-to-t from-civic/40 to-brass" style={{ height }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
            <PhoneMockup />
            <SubscriptionPanel />
          </div>
        </div>
      </section>

      <section className="border-t border-brass/10 bg-ink/70">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-3 lg:px-8">
          <MapPanel />
          <AccountabilityPanel />
          <NotificationPanel />
        </div>
      </section>
    </>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/6 p-3">
      <div className="text-xs text-blue-100/60">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="device-shell rounded-[2rem] p-3">
      <div className="rounded-[1.55rem] border border-white/10 bg-vault p-4">
        <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-white/20" />
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase text-brass">Onboarding</div>
            <div className="mt-1 text-xl font-semibold text-white">Choose your ledger</div>
          </div>
          <Smartphone className="h-5 w-5 text-aurora" aria-hidden="true" />
        </div>
        <div className="orbital-mark mx-auto mt-6 grid h-40 w-40 place-items-center rounded-full bg-civic/10">
          <Image src="/capitol-ledger-logo.png" alt="" width={112} height={112} className="h-28 w-28 rounded-full object-cover shadow-glow" />
        </div>
        <div className="mt-6 space-y-3">
          {["State", "Chamber", "Issues"].map((label) => (
            <div key={label} className="flex items-center justify-between rounded-lg border border-brass/15 bg-white/7 px-3 py-3">
              <span className="text-sm text-blue-100">{label}</span>
              <span className="h-2 w-12 rounded-full bg-gradient-to-r from-civic to-brass" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SubscriptionPanel() {
  return (
    <div className="glass-card rounded-lg p-5">
      <div className="flex items-center gap-2 text-brass">
        <Crown className="h-5 w-5" aria-hidden="true" />
        <span className="text-sm font-semibold uppercase tracking-wide">Capitol Ledger Pro</span>
      </div>
      <div className="mt-4 text-3xl font-semibold text-white">$3.99</div>
      <p className="mt-2 text-sm leading-6 text-blue-100/72">Advanced alerts, saved policy dashboards, exportable accountability reports, and claim-check workflows.</p>
      <div className="gold-line my-5" />
      <div className="grid gap-2 text-sm text-blue-100/80">
        {["Real-time alerts", "Priority intelligence panels", "Pitch-deck-ready exports"].map((item) => (
          <div key={item} className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brass" aria-hidden="true" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function MapPanel() {
  return (
    <div className="data-panel rounded-lg p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Congressional map</h3>
        <Map className="h-5 w-5 text-brass" aria-hidden="true" />
      </div>
      <div className="mt-6 grid grid-cols-5 gap-2">
        {Array.from({ length: 25 }).map((_, index) => (
          <div
            key={index}
            className={`h-11 rounded-md border border-white/10 ${index % 6 === 0 ? "bg-brass/70" : index % 4 === 0 ? "bg-civic/60" : "bg-white/6"}`}
          />
        ))}
      </div>
      <p className="mt-4 text-sm leading-6 text-blue-100/70">District and chamber overlays designed for state-by-state legislative signal scanning.</p>
    </div>
  );
}

function AccountabilityPanel() {
  return (
    <div className="data-panel rounded-lg p-5">
      <div className="flex items-center gap-2">
        <MessageSquareWarning className="h-5 w-5 text-rust" aria-hidden="true" />
        <h3 className="font-semibold text-white">Accountability tools</h3>
      </div>
      <div className="mt-5 rounded-lg border border-rust/25 bg-rust/10 p-4">
        <div className="text-xs font-semibold uppercase text-brass">Claim comparison</div>
        <p className="mt-2 text-sm leading-6 text-blue-100/78">Public statement cross-referenced with bill sponsorships, recorded votes, and official sources.</p>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Search className="h-5 w-5 text-aurora" aria-hidden="true" />
        <div className="h-10 flex-1 rounded-lg border border-white/10 bg-white/7" />
        <Fingerprint className="h-5 w-5 text-brass" aria-hidden="true" />
      </div>
    </div>
  );
}

function NotificationPanel() {
  return (
    <div className="data-panel rounded-lg p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Notification center</h3>
        <Layers3 className="h-5 w-5 text-brass" aria-hidden="true" />
      </div>
      <div className="mt-5 space-y-3">
        {notificationRows.map(([title, label, status]) => (
          <div key={title} className="rounded-lg border border-white/10 bg-white/7 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white">{title}</div>
              <span className="rounded-md bg-brass/15 px-2 py-1 text-xs font-semibold text-brass">{status}</span>
            </div>
            <div className="mt-1 text-xs text-blue-100/60">{label}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase text-aurora">
        <TrendingUp className="h-4 w-4" aria-hidden="true" />
        Signal density rising
      </div>
    </div>
  );
}
