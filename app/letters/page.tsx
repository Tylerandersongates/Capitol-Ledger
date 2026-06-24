import { GamificationSync } from "@/components/gamification-sync";
import { LettersSentClient } from "@/components/letters-sent-client";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass } from "@/components/mobile-ui";
import Link from "next/link";
import { ArrowLeft, Bell, CheckCircle2, FileText, Home, Mail, Settings } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LettersPage() {
  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between px-3 text-[17px] font-semibold"
    >
      <GamificationSync />
      <header className="relative mt-12 flex items-center">
        <Link href="/dashboard" className={mobileIconButtonClass} aria-label="Back to dashboard">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <div className="ml-7 min-w-0">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46">Civic Engagement</div>
          <h1 className="mt-2 text-[28px] font-medium leading-none text-white">Action Ledger</h1>
        </div>
      </header>

      <main className="mt-7 space-y-5 pb-8">
        <MobileCard variant="dashboard" className="overflow-hidden px-4 py-4">
          <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b]">
              <Mail className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[21px] font-medium leading-tight text-white">Civic action history</h2>
              <p className="mt-2 text-[13px] leading-snug text-white/54">
                Keep a record of prepared letters, confirmed sends, civic actions, recipients, and issues.
              </p>
            </div>
          </div>
        </MobileCard>

        <LettersSentClient />
      </main>

      <MobileBottomNav
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { active: true, href: "/letters", icon: <CheckCircle2 />, label: "Letters" },
          { href: "/alerts", icon: <Bell />, label: "Alerts" },
          { href: "/settings", icon: <Settings />, label: "Settings" }
        ]}
      />
    </MobileShell>
  );
}
