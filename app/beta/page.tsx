import Link from "next/link";
import { ArrowLeft, Bell, CheckCircle2, ClipboardCheck, FileText, Flag, Home, MapPinned, MessageSquarePlus, Search, ShieldCheck, UserRound } from "lucide-react";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";

const testerTasks = [
  {
    body: "Start from the main dashboard and say whether the top cards make sense.",
    href: "/dashboard",
    label: "Dashboard",
    title: "Read the home view"
  },
  {
    body: "Search for bills, officials, and votes. Try the filters and note what feels confusing.",
    href: "/search",
    label: "Search",
    title: "Use discovery"
  },
  {
    body: "Open a bill and review summary, pros/cons, key details, sources, votes, and video links.",
    href: "/bills/demo-hr-4021?tab=details",
    label: "Bill",
    title: "Review a bill"
  },
  {
    body: "Open an official profile and look for anything that feels missing for accountability.",
    href: "/members/C001098",
    label: "Official",
    title: "Review a representative"
  },
  {
    body: "Read alerts, open an alert detail, and check that unread state behaves naturally.",
    href: "/alerts",
    label: "Alerts",
    title: "Test notifications"
  },
  {
    body: "Open badges, impact, and account stats. Decide whether the progress system feels motivating.",
    href: "/badges",
    label: "Progress",
    title: "Check gamification"
  }
];

export default function BetaTesterPage() {
  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
      <header className="mt-10 flex items-center justify-between">
        <Link href="/account" className={mobileIconButtonClass} aria-label="Back to profile">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <Link href="/feedback" className={mobileViewAllClass}>
          Report
        </Link>
      </header>

      <section className="mt-10">
        <div className="text-[18px] uppercase tracking-wide text-white/54">Beta Testing</div>
        <h1 className="mt-1 text-[28px] font-medium leading-none text-white">Test Run</h1>
        <p className="mt-4 max-w-[25rem] text-[16px] leading-6 text-white/58">
          Use this checklist to find bugs, confusing flows, missing content, and polish issues before Capitol Ledger moves toward store testing.
        </p>
      </section>

      <main className="mt-7 space-y-4 pb-8">
        <MobileCard variant="dashboard" className="px-5 py-5">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ffb12b]/12 text-[#ffb12b]">
              <ClipboardCheck className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[22px] font-medium leading-tight text-white">How to test</h2>
              <p className="mt-2 text-[14px] leading-5 text-white/56">
                Move through each flow like a normal citizen, then submit one report for anything that breaks, slows you down, or feels unclear.
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <MiniMetric label="Tasks" value="6" />
            <MiniMetric label="Reports" value="3+" />
            <MiniMetric label="Round" value="Beta" />
          </div>
        </MobileCard>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[24px] font-medium leading-none text-white">Checklist</h2>
            <span className="text-[13px] font-medium text-white/42">Tap to open</span>
          </div>

          {testerTasks.map((task, index) => (
            <Link key={task.title} href={task.href} className="block">
              <MobileCard variant="dashboard" className="px-5 py-5">
                <div className="grid grid-cols-[34px_1fr_auto] items-start gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ffb12b]/12 text-[14px] font-semibold text-[#ffb12b]">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[18px] font-medium leading-tight text-white">{task.title}</span>
                    <span className="mt-2 block text-[14px] leading-snug text-white/56">{task.body}</span>
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[12px] font-medium text-white/52">
                    {task.label}
                  </span>
                </div>
              </MobileCard>
            </Link>
          ))}
        </section>

        <MobileCard variant="dashboard" className="px-5 py-5">
          <div className="flex items-center gap-2 text-[#ffb12b]">
            <MessageSquarePlus className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            <span className="text-[13px] font-medium uppercase tracking-wide">After Testing</span>
          </div>
          <h2 className="mt-3 text-[22px] font-medium leading-tight text-white">Send focused feedback</h2>
          <p className="mt-3 text-[15px] leading-snug text-white/58">
            Best reports include what you expected, what happened, what page you were on, and whether it blocked you.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link href="/feedback" className="flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[14px] font-semibold text-[#071225]">
              Report Issue
            </Link>
            <Link href="/feedback/review" className="flex h-11 items-center justify-center rounded-xl border border-white/12 bg-white/5 text-[14px] font-semibold text-white/72">
              Review Queue
            </Link>
          </div>
        </MobileCard>

        <MobileCard variant="dashboard" className="px-5 py-5">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#43ed74]/12 text-[#43ed74]">
              <ShieldCheck className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[21px] font-medium leading-none text-white">Beta rule</h2>
              <p className="mt-3 text-[15px] leading-snug text-white/60">
                Treat confusing moments as valuable feedback. A small friction point now can become a better launch flow later.
              </p>
            </div>
          </div>
        </MobileCard>
      </main>

      <MobileBottomNav
        className="sticky bottom-0 -mx-8 mt-auto border-t border-white/8 bg-[#031126]/96 px-8 pb-3 pt-4 backdrop-blur-xl"
        indicatorClassName="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white"
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { href: "/search", icon: <Search />, label: "Search" },
          { href: "/alerts", icon: <Bell />, label: "Alerts" },
          { active: true, href: "/account", icon: <UserRound />, label: "Profile" }
        ]}
      />
    </MobileShell>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-2 py-3 text-center">
      <div className="text-[22px] font-medium leading-none text-[#ffb12b]">{value}</div>
      <div className="mt-2 text-[11px] leading-tight text-white/46">{label}</div>
    </div>
  );
}
