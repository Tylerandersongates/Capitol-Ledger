import Link from "next/link";
import {
  Award,
  Bell,
  CheckCircle2,
  Crown,
  FileText,
  Flame,
  Globe2,
  Layers3,
  Map,
  Shield,
  Sparkles,
  TrendingUp,
  Vote
} from "lucide-react";

export const mockupAssets = [
  {
    title: "Landing hero",
    href: "/mockups/landing-hero.png",
    body: "Investor-grade positioning, Capitol dome anchor, and mobile dashboard preview."
  },
  {
    title: "Representative profiles",
    href: "/mockups/representative-profiles.png",
    body: "Senator and representative pages with voting records, bills, and accountability scores."
  },
  {
    title: "Bill tracking",
    href: "/mockups/bill-tracking.png",
    body: "Progress timelines, vote breakdowns, fiscal impact, sponsors, and mobile bill views."
  },
  {
    title: "Alerts and badges",
    href: "/mockups/notifications-gamification.png",
    body: "Vote reminders, civic streaks, progress loops, badges, and engagement incentives."
  },
  {
    title: "Federal to local map",
    href: "/mockups/state-local-map.png",
    body: "Multi-level government heat maps, district lookup, policy activity, and geographic filters."
  }
];

const timelineSteps = ["Introduced", "Committee", "Floor", "Vote", "Enacted"];

const badgeItems = [
  ["Civic Starter", "Track 5 bills", "earned"],
  ["Bill Tracker", "Follow 10 actions", "earned"],
  ["Voter", "Log vote reminders", "earned"],
  ["Advocate", "Contact 3 offices", "earned"],
  ["Policy Expert", "Track 5 issues", "locked"],
  ["Constitution Champion", "Complete 30 days", "locked"]
];

const alertItems = [
  ["Vote tomorrow", "H.R. 6821 infrastructure vote", "Reminder"],
  ["New bill tracked", "Affordable Childcare Act introduced", "Tracked"],
  ["Committee update", "Clean Energy Investment Act hearing", "Update"],
  ["Representative statement", "New source-linked public statement", "Source"]
];

export function MockupReferenceGrid() {
  return (
    <section className="border-y border-brass/10 bg-vault/80">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brass">Uploaded design assets</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Direct visual references inside the product system</h2>
          </div>
          <Link href="/onboarding" className="text-sm font-semibold text-aurora hover:underline">
            View onboarding flow
          </Link>
        </div>
        <div className="mt-7 grid gap-4 lg:grid-cols-5">
          {mockupAssets.map((asset) => (
            <article key={asset.href} className="glass-card overflow-hidden rounded-lg">
              <img src={asset.href} alt="" className="aspect-video w-full object-cover" />
              <div className="p-4">
                <h3 className="font-semibold text-white">{asset.title}</h3>
                <p className="mt-2 text-sm leading-6 text-blue-100/70">{asset.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BillTimeline({ activeStep = 1 }: { activeStep?: number }) {
  return (
    <div className="rounded-lg border border-brass/15 bg-white/6 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-white">Bill progress timeline</div>
        <span className="rounded-md bg-brass/15 px-2 py-1 text-xs font-semibold text-brass">Demo mode</span>
      </div>
      <div className="mt-5 grid grid-cols-5 gap-2">
        {timelineSteps.map((step, index) => {
          const active = index <= activeStep;
          return (
            <div key={step} className="relative">
              <div className={`mx-auto grid h-11 w-11 place-items-center rounded-full border ${active ? "border-brass bg-brass/20 text-brass shadow-glow" : "border-white/15 bg-white/5 text-blue-100/45"}`}>
                {active ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <FileText className="h-5 w-5" aria-hidden="true" />}
              </div>
              <div className="mt-2 text-center text-[0.68rem] font-medium text-blue-100/70">{step}</div>
              {index < timelineSteps.length - 1 ? <div className={`absolute left-[calc(50%+1.6rem)] top-5 h-px w-[calc(100%-3.2rem)] ${active ? "bg-brass" : "bg-white/15"}`} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VoteArc() {
  return (
    <div className="data-panel rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Vote breakdown</div>
        <Vote className="h-5 w-5 text-brass" aria-hidden="true" />
      </div>
      <div className="mt-4 grid grid-cols-10 gap-1.5">
        {Array.from({ length: 70 }).map((_, index) => (
          <span
            key={index}
            className={`h-2.5 w-2.5 rounded-full ${index < 34 ? "bg-emerald-400" : index < 52 ? "bg-rust" : index < 62 ? "bg-brass" : "bg-white/25"}`}
          />
        ))}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <MiniStat label="For" value="64" tone="text-emerald-300" />
        <MiniStat label="Against" value="28" tone="text-rust" />
        <MiniStat label="Not voting" value="8" tone="text-blue-100/70" />
      </div>
    </div>
  );
}

export function PoliticalMapPanel() {
  return (
    <div className="data-panel rounded-lg p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brass">Federal + state + local</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Policy activity heat map</h2>
        </div>
        <Map className="h-5 w-5 text-brass" aria-hidden="true" />
      </div>
      <div className="mt-5 grid grid-cols-9 gap-2">
        {Array.from({ length: 54 }).map((_, index) => (
          <div
            key={index}
            className={`h-9 rounded-md border border-white/10 ${index % 8 === 0 ? "bg-rust/80 shadow-glow" : index % 5 === 0 ? "bg-brass/70" : index % 3 === 0 ? "bg-civic/65" : "bg-white/6"}`}
          />
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniStat label="Active bills" value="1,247" />
        <MiniStat label="Upcoming votes" value="368" />
        <MiniStat label="Policy updates" value="82" />
      </div>
    </div>
  );
}

export function CivicBadgeGrid() {
  return (
    <div className="glass-card rounded-lg p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brass">Gamification</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Civic badge system</h2>
        </div>
        <Award className="h-5 w-5 text-brass" aria-hidden="true" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {badgeItems.map(([title, body, state]) => (
          <div key={title} className={`rounded-lg border p-3 text-center ${state === "earned" ? "border-brass/35 bg-brass/10" : "border-white/10 bg-white/5 opacity-60"}`}>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-brass/30 bg-vault text-brass">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="mt-2 text-sm font-semibold text-white">{title}</div>
            <div className="mt-1 text-xs text-blue-100/58">{body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NotificationFeed() {
  return (
    <div className="data-panel rounded-lg p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brass">Civic alerts</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Notifications and reminders</h2>
        </div>
        <Bell className="h-5 w-5 text-brass" aria-hidden="true" />
      </div>
      <div className="mt-5 space-y-3">
        {alertItems.map(([title, body, status]) => (
          <div key={title} className="rounded-lg border border-brass/15 bg-white/7 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold text-white">{title}</div>
              <span className="rounded-md bg-brass/15 px-2 py-1 text-xs font-semibold text-brass">{status}</span>
            </div>
            <div className="mt-1 text-sm text-blue-100/68">{body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CivicScorePanel() {
  return (
    <div className="glass-card rounded-lg p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brass">Your impact</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Civic score progress</h2>
        </div>
        <div className="orbital-mark grid h-20 w-20 place-items-center rounded-full bg-brass/10 text-brass">
          <Flame className="h-8 w-8" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-4 text-4xl font-semibold text-brass">1,250</div>
      <p className="mt-1 text-sm text-emerald-300">Up 75 this month</p>
      <div className="mt-4 h-2 rounded-full bg-white/10">
        <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-brass to-rust shadow-glow" />
      </div>
      <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs text-blue-100/70">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <div key={`${day}-${index}`} className={`rounded-md border py-2 ${index < 5 ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-brass/20 bg-brass/10 text-brass"}`}>
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}

export function UpgradeTiers() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {[
        ["Free", "$0", "Follow officials, bills, and basic alerts."],
        ["Pro", "$3.99", "Advanced intelligence panels, issue tracking, and exportable reports."],
        ["Civic Team", "$5.99", "Shared dashboards for advocacy teams, campaigns, and civic organizations."]
      ].map(([title, price, body], index) => (
        <div key={title} className={`glass-card rounded-lg p-5 ${index === 1 ? "border-brass/50 shadow-glow" : ""}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            {index === 1 ? <Crown className="h-5 w-5 text-brass" aria-hidden="true" /> : <Sparkles className="h-5 w-5 text-aurora" aria-hidden="true" />}
          </div>
          <div className="mt-4 text-4xl font-semibold text-brass">{price}</div>
          <p className="mt-3 text-sm leading-6 text-blue-100/72">{body}</p>
          <div className="gold-line my-5" />
          <div className="space-y-2 text-sm text-blue-100/78">
            {["Source-linked records", "Voting dashboards", "Civic alerts"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brass" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
          <Link href={index === 0 ? "/sign-in" : "/upgrade"} className="focus-ring mt-5 flex h-11 w-full items-center justify-center rounded-md bg-gradient-to-r from-brass to-rust text-sm font-semibold text-ink">
            {index === 0 ? "Start free" : "Upgrade"}
          </Link>
        </div>
      ))}
    </div>
  );
}

export function PolicyTrendPanel() {
  return (
    <div className="data-panel rounded-lg p-5">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-brass" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-white">Policy tracking visualizations</h2>
      </div>
      <div className="mt-5 space-y-4">
        {["Healthcare", "Education", "Infrastructure", "Environment", "Public safety"].map((label, index) => (
          <div key={label}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-100/78">{label}</span>
              <span className="font-semibold text-brass">{92 - index * 6}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-civic via-brass to-rust" style={{ width: `${92 - index * 6}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GovernmentLevelCards() {
  const governmentLevels = [
    {
      title: "Federal",
      body: "Congressional bills, roll-call votes, committees, and national policy movement.",
      icon: Globe2
    },
    {
      title: "State",
      body: "State legislation, budgets, agency actions, and policy changes.",
      icon: Layers3
    },
    {
      title: "Local",
      body: "Council actions, ordinances, local elections, and district-specific alerts.",
      icon: Map
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {governmentLevels.map(({ title, body, icon: Icon }) => (
        <div key={title} className="glass-card rounded-lg p-5">
          <Icon className="h-6 w-6 text-brass" aria-hidden="true" />
          <h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-blue-100/72">{body}</p>
        </div>
      ))}
    </div>
  );
}

function MiniStat({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/6 p-3">
      <div className="text-xs text-blue-100/58">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</div>
    </div>
  );
}
