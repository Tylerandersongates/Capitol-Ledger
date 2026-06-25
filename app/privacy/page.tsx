import Link from "next/link";
import { ArrowLeft, Bell, FileText, Home, LockKeyhole, Search, Settings, ShieldCheck } from "lucide-react";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";

export const metadata = {
  title: "Capitol Ledger CE Privacy Policy",
  description: "How Capitol Ledger CE handles account, personalization, report, and subscription data."
};

const policySections = [
  {
    title: "What We Collect",
    body:
      "Capitol Ledger CE uses account details, district setup, policy interests, saved items, alert preferences, and app activity needed for badges, alerts, and saved legislative tracking."
  },
  {
    title: "Purchases",
    body:
      "Paid Pro upgrades are handled through Apple in-app purchase. Capitol Ledger CE receives subscription status, product identifiers, and transaction references needed to unlock Pro and sync access to the signed-in account."
  },
  {
    title: "Reports And Support",
    body:
      "Issue reports may include the selected app area, message, severity, page context, and optional contact email so reports can be reviewed and resolved."
  },
  {
    title: "How Data Is Used",
    body:
      "Data is used to run the account, personalize civic alerts and briefs, sync saved items, verify purchases, prevent misuse, troubleshoot reports, and improve app quality."
  },
  {
    title: "What We Do Not Do",
    body:
      "Capitol Ledger CE does not sell personal data and does not use third-party advertising trackers. Official civic data is used for public legislative context, not ad targeting."
  },
  {
    title: "Choices",
    body:
      "Users can change district, interest, notification, and plan settings in the app. For privacy, export, correction, or account deletion requests, use the support page."
  }
];

export default function PrivacyPage() {
  return (
    <MobileShell
      minHeight="min-h-[1120px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
      <header className="mt-10 flex items-center justify-between">
        <Link href="/settings" className={mobileIconButtonClass} aria-label="Back to settings">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <Link href="/support" className={mobileViewAllClass}>
          Support
        </Link>
      </header>

      <section className="mt-10">
        <div className="text-[18px] uppercase tracking-wide text-white/54">Privacy</div>
        <h1 className="mt-1 text-[28px] font-medium leading-tight text-white">Capitol Ledger CE Privacy Policy</h1>
        <p className="mt-4 max-w-[25rem] text-[16px] leading-6 text-white/58">
          Last updated June 25, 2026. This page summarizes how Capitol Ledger CE handles data for accounts, civic tracking, live reports, and Apple purchases.
        </p>
      </section>

      <main className="mt-7 space-y-4 pb-8">
        <MobileCard variant="rust" className="px-5 py-5">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/14 bg-[#43ed74]/12 text-[#43ed74] [&>svg]:h-6 [&>svg]:w-6">
              <ShieldCheck strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[22px] font-medium leading-tight text-white">Plain-language policy</h2>
              <p className="mt-2 text-[13px] leading-snug text-white/54">
                This is the launch privacy copy for App Store/TestFlight prep. Final submission copy should be reviewed against the production services turned on at launch.
              </p>
            </div>
          </div>
        </MobileCard>

        {policySections.map((section) => (
          <MobileCard key={section.title} variant="compact" className="px-5 py-4">
            <h2 className="text-[18px] font-semibold text-white">{section.title}</h2>
            <p className="mt-2 text-[14px] leading-6 text-white/58">{section.body}</p>
          </MobileCard>
        ))}

        <MobileCard variant="rust" className="px-5 py-5">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/14 bg-white/8 text-[#ffb12b] [&>svg]:h-6 [&>svg]:w-6">
              <LockKeyhole strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[20px] font-medium leading-tight text-white">Privacy requests</h2>
              <p className="mt-2 text-[14px] leading-6 text-white/58">
                Use support to request account deletion, data correction, or help with saved account data.
              </p>
              <Link href="/support" className={`${mobileViewAllClass} mt-4 inline-flex`}>
                Open support
              </Link>
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
