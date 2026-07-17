import Link from "next/link";
import { ArrowLeft, Bell, FileText, Home, LifeBuoy, Search, Settings, ShieldCheck } from "lucide-react";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";
import { publicBrand } from "@/lib/brand";

export const metadata = {
  title: publicBrand.supportTitle,
  description: `Get ${publicBrand.name} help, report an issue, or request account and privacy support.`
};

const supportOptions = [
  {
    title: "Report an issue",
    body: "Send a live app report for broken flows, confusing wording, missing data, or visual issues.",
    href: "/feedback?source=support",
    cta: "Open report"
  },
  {
    title: "Purchases",
    body: "Review the 7-day Pro trial, restore purchases, or manage renewal from the plan screen.",
    href: "/upgrade",
    cta: "Open plans"
  },
  {
    title: "Privacy requests",
    body: "For account deletion, data correction, or saved-data questions, submit a report with \"Privacy request\" in the title.",
    href: "/feedback?source=privacy-request",
    cta: "Start request"
  }
];

export default function SupportPage() {
  return (
    <MobileShell
      minHeight="min-h-[980px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
      <header className="mt-10 flex items-center justify-between">
        <Link href="/settings" className={mobileIconButtonClass} aria-label="Back to settings">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <Link href="/privacy" className={mobileViewAllClass}>
          Privacy
        </Link>
      </header>

      <section className="mt-10">
        <div className="text-[18px] uppercase tracking-wide text-white/54">Support</div>
        <h1 className="mt-1 text-[28px] font-medium leading-tight text-white">{publicBrand.supportTitle}</h1>
        <p className="mt-4 max-w-[25rem] text-[16px] leading-6 text-white/58">
          Use these paths for live app testing, App Store review support, account questions, privacy requests, and purchase help.
        </p>
      </section>

      <main className="mt-7 space-y-4 pb-8">
        <MobileCard variant="rust" className="px-5 py-5">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/14 bg-white/8 text-[#ffb12b] [&>svg]:h-6 [&>svg]:w-6">
              <LifeBuoy strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[22px] font-medium leading-tight text-white">{publicBrand.name} support</h2>
              <p className="mt-2 text-[13px] leading-snug text-white/54">
                Reports go into the review queue used for TestFlight and launch triage.
              </p>
            </div>
          </div>
        </MobileCard>

        {supportOptions.map((option) => (
          <MobileCard key={option.title} variant="compact" className="px-5 py-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <div className="min-w-0">
                <h2 className="text-[18px] font-semibold text-white">{option.title}</h2>
                <p className="mt-2 text-[14px] leading-6 text-white/58">{option.body}</p>
              </div>
              <Link href={option.href} className="rounded-full border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-3 py-2 text-[12px] font-semibold leading-none text-[#ffb12b] transition hover:bg-[#ffb12b]/16">
                {option.cta}
              </Link>
            </div>
          </MobileCard>
        ))}

        <MobileCard variant="rust" className="px-5 py-5">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/14 bg-[#43ed74]/12 text-[#43ed74] [&>svg]:h-6 [&>svg]:w-6">
              <ShieldCheck strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[20px] font-medium leading-tight text-white">For App Store review</h2>
              <p className="mt-2 text-[14px] leading-6 text-white/58">
                Monthly Pro starts with 7 days free, then renews at $4.99/month. Cancel anytime. Team starts at three seats for $17.99/month or $179.99/year. Monthly supports 3-20 seats; annual supports 3-16, with larger annual workspaces and teams above 20 routed to a custom plan.
              </p>
            </div>
          </div>
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
