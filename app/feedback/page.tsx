import { BetaFeedbackForm } from "@/components/beta-feedback-form";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";
import Link from "next/link";
import { ArrowLeft, Bell, FileText, Home, Search, UserRound } from "lucide-react";

export default function FeedbackPage() {
  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      backgroundClassName="bg-[radial-gradient(circle_at_22%_10%,rgba(34,141,255,0.24),transparent_32%),radial-gradient(circle_at_82%_24%,rgba(246,216,75,0.13),transparent_27%),linear-gradient(155deg,#061a33_0%,#020916_54%,#06182d_100%)]"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
      <header className="mt-10 flex items-center justify-between">
        <Link href="/account" className={mobileIconButtonClass} aria-label="Back to profile">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <Link href="/feedback/review" className={mobileViewAllClass}>
          Review
        </Link>
      </header>

      <section className="mt-10">
        <div className="text-[18px] uppercase tracking-wide text-white/54">Beta Testing</div>
        <h1 className="mt-1 text-[28px] font-medium leading-none text-white">Feedback</h1>
        <p className="mt-4 max-w-[25rem] text-[16px] leading-6 text-white/58">
          Help us catch broken flows, missing details, confusing language, and polish issues before Capitol Ledger moves toward store testing.
        </p>
      </section>

      <main className="mt-7 pb-8">
        <BetaFeedbackForm />
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
