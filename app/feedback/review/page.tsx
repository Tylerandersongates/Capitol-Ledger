import Link from "next/link";
import { ArrowLeft, Bell, FileText, Home, Search, UserRound } from "lucide-react";
import { BetaFeedbackReviewQueue } from "@/components/beta-feedback-review-queue";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";
import { getBetaFeedbackRecords } from "@/lib/beta-feedback";
import { requireAccountSession } from "@/lib/route-guards";

export const dynamic = "force-dynamic";

export default async function FeedbackReviewPage() {
  const session = await requireAccountSession("/feedback/review");
  const feedback = await getBetaFeedbackRecords(session.user);

  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
      <header className="mt-10 flex items-center justify-between">
        <Link href="/feedback" className={mobileIconButtonClass} aria-label="Back to feedback form">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <Link href="/feedback" className={mobileViewAllClass}>
          New report
        </Link>
      </header>

      <section className="mt-10">
        <div className="text-[18px] uppercase tracking-wide text-white/54">Beta Testing</div>
        <h1 className="mt-1 text-[28px] font-medium leading-none text-white">Review Queue</h1>
        <p className="mt-4 max-w-[25rem] text-[16px] leading-6 text-white/58">
          Track tester reports by severity and type before each beta fix pass.
        </p>
      </section>

      <main className="mt-7 space-y-4 pb-8">
        <BetaFeedbackReviewQueue initialMode={feedback.mode} initialRecords={feedback.records} />
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
