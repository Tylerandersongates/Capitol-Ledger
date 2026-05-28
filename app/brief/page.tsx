import Link from "next/link";
import { ArrowLeft, Bell, CalendarClock, CheckCircle2, FileText, Home, MailCheck, Search, UserRound } from "lucide-react";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass } from "@/components/mobile-ui";
import { requireAccountSession } from "@/lib/route-guards";
import { formatBriefGeneratedAt, getWeeklyBriefForUser, type WeeklyBriefSnapshot } from "@/lib/weekly-brief";

export default async function WeeklyBriefPage() {
  const session = await requireAccountSession("/brief");
  const brief = await getWeeklyBriefForUser(session.user);

  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      backgroundClassName="bg-[radial-gradient(circle_at_22%_10%,rgba(34,141,255,0.24),transparent_32%),radial-gradient(circle_at_82%_24%,rgba(246,216,75,0.13),transparent_27%),linear-gradient(155deg,#061a33_0%,#020916_54%,#06182d_100%)]"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
      <header className="mt-12 flex items-center justify-between">
        <Link href="/account" className={mobileIconButtonClass} aria-label="Back to profile">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <div className="text-right">
          <div className="text-[14px] uppercase tracking-wide text-white/48">{brief.cadence}</div>
          <h1 className="mt-1 text-[28px] font-medium leading-none text-white">Weekly Brief</h1>
        </div>
      </header>

      <main className="mt-7 space-y-4 pb-8">
        <MobileCard variant="dashboard" className="px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#ffb12b]">
                <CalendarClock className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                <span className="text-[13px] font-medium uppercase tracking-wide">Delivery</span>
              </div>
              <h2 className="mt-3 text-[23px] font-medium leading-tight text-white">{brief.title}</h2>
              <p className="mt-3 text-[15px] leading-snug text-white/58">{brief.delivery.note}</p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${brief.delivery.enabled ? "bg-[#43ed74]/12 text-[#43ed74]" : "bg-white/8 text-white/52"}`}>
              {brief.delivery.enabled ? "Ready" : "Paused"}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-[13px]">
            <BriefMeta label="District" value={brief.district.code} />
            <BriefMeta label="Plan" value={brief.plan.label} />
            <BriefMeta label="Next" value={brief.delivery.nextDelivery} />
            <BriefMeta label="Updated" value={formatBriefGeneratedAt(brief.generatedAt)} />
          </div>
        </MobileCard>

        <MobileCard variant="dashboard" className="px-5 py-5">
          <div className="text-[13px] font-medium uppercase tracking-wide text-white/50">This Week's Civic Lens</div>
          <h2 className="mt-3 text-[23px] font-medium leading-tight text-white">{brief.lens.headline}</h2>
          <p className="mt-3 text-[16px] leading-snug text-white/62">{brief.lens.body}</p>
          <div className="mt-5 space-y-3">
            {brief.lens.bullets.map((bullet) => (
              <div key={bullet} className="flex items-start gap-3 text-[15px] leading-snug text-white/64">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#43ed74]" strokeWidth={1.8} aria-hidden="true" />
                {bullet}
              </div>
            ))}
          </div>
        </MobileCard>

        <MetricGrid brief={brief} />

        <MobileCard variant="dashboard" className="px-5 py-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[21px] font-medium leading-none text-white">Priority Updates</h2>
            <span className="rounded-full bg-white/8 px-3 py-1.5 text-[13px] text-white/52">{brief.priorityUpdates.length} items</span>
          </div>
          <div className="mt-5 divide-y divide-white/8">
            {brief.priorityUpdates.map((update) => (
              <Link key={update.id} href={update.href} className="grid grid-cols-[34px_1fr_auto] gap-3 py-4">
                <span className="pt-1 text-[#ffb12b]">
                  <Bell className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span>
                  <span className="flex items-center gap-2">
                    <span className="text-[16px] font-medium text-white">{update.title}</span>
                    {update.unread ? <span className="h-2 w-2 rounded-full bg-[#ffb12b]" /> : null}
                  </span>
                  <span className="mt-1 block text-[13px] leading-snug text-white/52">{update.body}</span>
                </span>
                <span className="whitespace-nowrap pt-0.5 text-[12px] text-white/42">{update.label}</span>
              </Link>
            ))}
          </div>
        </MobileCard>

        <MobileCard variant="dashboard" className="px-5 py-5">
          <h2 className="text-[21px] font-medium leading-none text-white">Watchlist Focus</h2>
          <div className="mt-5 space-y-4">
            {brief.watchlist.bills.map((bill) => (
              <Link key={bill.id} href={bill.href} className="block rounded-2xl border border-white/8 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[16px] font-medium leading-snug text-white">{bill.title}</div>
                  <span className="whitespace-nowrap rounded-full bg-[#ffb12b]/12 px-2.5 py-1 text-[12px] text-[#ffb12b]">{bill.status}</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {(brief.watchlist.interests.length ? brief.watchlist.interests : ["Healthcare", "Education", "Infrastructure"]).map((interest) => (
              <span key={interest} className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[13px] font-medium text-white/62">
                {interest}
              </span>
            ))}
          </div>
        </MobileCard>

        <MobileCard variant="dashboard" className="px-5 py-5">
          <div className="flex items-center gap-2">
            <MailCheck className="h-5 w-5 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
            <h2 className="text-[21px] font-medium leading-none text-white">Action Queue</h2>
          </div>
          <div className="mt-5 space-y-3">
            {brief.actionItems.map((action) => (
              <Link key={action.label} href={action.href} className="block rounded-2xl border border-white/8 bg-white/5 p-4">
                <div className="text-[16px] font-medium text-white">{action.label}</div>
                <div className="mt-1 text-[13px] leading-snug text-white/52">{action.body}</div>
              </Link>
            ))}
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

function BriefMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
      <div className="text-[11px] uppercase tracking-wide text-white/38">{label}</div>
      <div className="mt-1 truncate text-[14px] font-medium text-white/74">{value}</div>
    </div>
  );
}

function MetricGrid({ brief }: { brief: WeeklyBriefSnapshot }) {
  const metrics = [
    { label: "Active bills", value: brief.metrics.activeBills },
    { label: "Unread", value: brief.metrics.unreadAlerts },
    { label: "Saved", value: brief.metrics.savedRecords },
    { label: "Interests", value: brief.metrics.policyInterests }
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-2xl border border-white/8 bg-white/5 px-2 py-3 text-center">
          <div className="text-[22px] font-medium leading-none text-[#ffb12b]">{metric.value}</div>
          <div className="mt-2 text-[11px] leading-tight text-white/46">{metric.label}</div>
        </div>
      ))}
    </div>
  );
}
