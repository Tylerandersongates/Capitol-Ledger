import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Home,
  MessageSquarePlus,
  Search,
  ShieldCheck,
  Settings
} from "lucide-react";
import type { ReactNode } from "react";
import { MobileShell } from "@/components/mobile-shell";
import { MobileGlassScrollFrame } from "@/components/mobile-glass-scroll-frame";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";

const testerTasks = [
  {
    body: "Start from the main dashboard and say whether the top cards make sense.",
    href: "/dashboard",
    label: "Dashboard",
    reportHref: "/feedback?source=dashboard",
    title: "Read the home view"
  },
  {
    body: "Search for bills, officials, and votes. Try the filters and note what feels confusing.",
    href: "/search",
    label: "Search",
    reportHref: "/feedback?source=search",
    title: "Use discovery"
  },
  {
    body: "Open a bill and review summary, pros/cons, key details, sources, votes, and video links.",
    href: "/bills/demo-hr-4021?tab=details",
    label: "Bill",
    reportHref: "/feedback?source=bills",
    title: "Review a bill"
  },
  {
    body: "Open an official profile and look for anything that feels missing for accountability.",
    href: "/members/C001098",
    label: "Official",
    reportHref: "/feedback?source=members",
    title: "Review an official"
  },
  {
    body: "Read alerts, open an alert detail, and check that unread state behaves naturally.",
    href: "/alerts",
    label: "Alerts",
    reportHref: "/feedback?source=alerts",
    title: "Test notifications"
  },
  {
    body: "Open badges, impact, and account stats. Decide whether the progress system feels motivating.",
    href: "/badges",
    label: "Progress",
    reportHref: "/feedback?source=badges",
    title: "Check gamification"
  },
  {
    body: "Open Upgrade, compare Free, Pro, and Team, switch billing cycle, preview plan actions, and report unclear pricing or locked feature language.",
    href: "/upgrade",
    label: "Plans",
    reportHref: "/feedback?source=upgrade",
    title: "Test subscriptions"
  },
  {
    body: "Open the Team workspace preview. Check whether shared watchlists, alerts, roles, and invite language make sense for organizations.",
    href: "/team",
    label: "Team",
    reportHref: "/feedback?source=team",
    title: "Review team workspace"
  }
];

const premiumEyebrowClass = "text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46";
const premiumCardTitleClass = "text-[22px] font-medium leading-tight text-white";
const premiumCardDescriptionClass = "mt-2 text-[13px] leading-snug text-white/54";
const premiumPanelClass = "rounded-2xl border border-white/10 bg-[#071a38]/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]";
const premiumHeaderIconClass =
  "grid h-12 w-12 place-items-center rounded-2xl border border-white/14 bg-white/8 text-[#ffb12b] shadow-[0_12px_28px_rgba(1,8,24,0.3)] [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[1.8]";
const premiumHeaderGreenIconClass =
  "grid h-12 w-12 place-items-center rounded-2xl border border-white/14 bg-[#43ed74]/12 text-[#43ed74] shadow-[0_12px_28px_rgba(1,8,24,0.3)] [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[1.8]";

export default function BetaTesterPage() {
  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
      <header className="mt-10 flex items-center justify-between">
        <Link href="/dashboard" className={mobileIconButtonClass} aria-label="Back to dashboard">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <Link href="/feedback?source=beta" className={mobileViewAllClass}>
          Report
        </Link>
      </header>

      <section className="mt-10">
        <div className={premiumEyebrowClass}>Beta Testing</div>
        <h1 className="mt-2 text-[30px] font-medium leading-none text-white">Test Run</h1>
        <p className="mt-3 max-w-[25rem] text-[14px] leading-snug text-white/54">
          Use this checklist to find bugs, confusing flows, missing content, and polish issues before Capitol Ledger moves toward store testing.
        </p>
      </section>

      <main className="mt-7 space-y-4 pb-8">
        <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
          <PremiumBetaHeader
            description="Move through each flow like a normal citizen. Report anything that breaks, slows you down, or feels unclear."
            eyebrow="Testing Brief"
            icon={<ClipboardCheck />}
            title="How to test"
          />
          <div className="mt-5 grid grid-cols-3 gap-3">
            <MiniMetric label="Tasks" value="8" />
            <MiniMetric label="Actions" value="2" />
            <MiniMetric label="Round" value="Beta" />
          </div>
        </MobileCard>

        <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
          <PremiumBetaHeader
            aside={<span className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[12px] font-semibold text-white/50">8 flows</span>}
            description="Open each flow, then report from the same row if something feels off."
            eyebrow="Tester Queue"
            title="Checklist"
          />

          <MobileGlassScrollFrame heightClassName="max-h-[430px]" className="divide-y divide-white/8">
            {testerTasks.map((task, index) => (
              <div key={task.title} className="py-4 first:pt-2 last:pb-1">
                <div className="grid grid-cols-[34px_1fr_auto] items-start gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-[#ffb12b]/24 bg-[#ffb12b]/12 text-[13px] font-semibold text-[#ffb12b]">{index + 1}</span>
                  <div className="min-w-0">
                    <div className="text-[16px] font-semibold leading-tight text-white">{task.title}</div>
                    <p className="mt-1 text-[13px] leading-snug text-white/50">{task.body}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/46">{task.label}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 pl-[46px]">
                  <Link href={task.href} className="flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[13px] font-semibold text-[#071225]">
                    Open
                  </Link>
                  <Link href={task.reportHref} className="flex h-10 items-center justify-center rounded-xl border border-white/12 bg-white/[0.045] text-[13px] font-semibold text-white/68">
                    Report
                  </Link>
                </div>
              </div>
            ))}
          </MobileGlassScrollFrame>
        </MobileCard>

        <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
          <PremiumBetaHeader
            description="Best reports include what you expected, what happened, where it happened, and whether it blocked you."
            eyebrow="After Testing"
            icon={<MessageSquarePlus />}
            title="Send focused feedback"
          />
          <div className={`mt-5 grid gap-2 ${premiumPanelClass} p-3`}>
            {["Expected result", "Actual result", "Page or flow", "Blocked or polish"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-[13px] font-medium text-white/60">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#43ed74]" strokeWidth={1.9} aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link href="/feedback?source=beta" className="flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[14px] font-semibold text-[#071225]">
              Report Issue
            </Link>
            <Link href="/feedback/review" className="flex h-11 items-center justify-center rounded-xl border border-white/12 bg-white/5 text-[14px] font-semibold text-white/72">
              Review Queue
            </Link>
          </div>
        </MobileCard>

        <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
          <PremiumBetaHeader
            description="Treat confusing moments as valuable feedback. A small friction point now can become a better launch flow later."
            eyebrow="Beta Rule"
            icon={<ShieldCheck />}
            iconTone="green"
            title="Friction is evidence"
          />
        </MobileCard>
      </main>

      <MobileBottomNav
        indicatorClassName="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white"
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { href: "/search", icon: <Search />, label: "Search" },
          { href: "/alerts", icon: <Bell />, label: "Alerts" },
          { active: true, href: "/settings", icon: <Settings />, label: "Settings" }
        ]}
      />
    </MobileShell>
  );
}

function PremiumBetaHeader({
  aside,
  description,
  eyebrow,
  icon,
  iconTone = "gold",
  title
}: {
  aside?: ReactNode;
  description?: ReactNode;
  eyebrow: string;
  icon?: ReactNode;
  iconTone?: "gold" | "green";
  title: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
      <div className="min-w-0">
        <div className={premiumEyebrowClass}>{eyebrow}</div>
        <h2 className={`${premiumCardTitleClass} mt-2`}>{title}</h2>
        {description ? <p className={premiumCardDescriptionClass}>{description}</p> : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : icon ? <span className={iconTone === "green" ? premiumHeaderGreenIconClass : premiumHeaderIconClass}>{icon}</span> : null}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${premiumPanelClass} px-2 py-3 text-center`}>
      <div className="text-[20px] font-semibold leading-none text-[#ffb12b]">{value}</div>
      <div className="mt-2 text-[11px] leading-tight text-white/46">{label}</div>
    </div>
  );
}
