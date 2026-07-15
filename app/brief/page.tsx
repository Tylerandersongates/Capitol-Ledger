import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  CheckCircle2,
  Crown,
  FileText,
  Home,
  ListChecks,
  LockKeyhole,
  Newspaper,
  Search,
  Settings
} from "lucide-react";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass } from "@/components/mobile-ui";
import { readWeeklyBriefDeliveryHistoryFromDatabase } from "@/lib/account-database";
import { requireAccountSession } from "@/lib/route-guards";
import { isPlanFeatureEnabled } from "@/lib/subscription-plans";
import { formatBriefGeneratedAt, getWeeklyBriefForUser, type WeeklyBriefSnapshot } from "@/lib/weekly-brief";
import {
  getWeeklyBriefDeliveryHistory,
  getWeeklyBriefStatusLabel,
  type WeeklyBriefDeliveryRecord
} from "@/lib/weekly-brief-history";

export default async function WeeklyBriefPage() {
  const session = await requireAccountSession("/brief");
  const [brief, databaseHistory] = await Promise.all([
    getWeeklyBriefForUser(session.user),
    readWeeklyBriefDeliveryHistoryFromDatabase(session.user.id).catch(() => null)
  ]);
  const briefHistory = databaseHistory ?? getWeeklyBriefDeliveryHistory(session.user.id);

  if (!isPlanFeatureEnabled(brief.plan.id, "weeklyBrief")) {
    return <LockedWeeklyBriefPage planLabel={brief.plan.label} />;
  }

  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
      <header className="mt-12 flex items-center justify-between">
        <Link href="/dashboard" className={mobileIconButtonClass} aria-label="Back to dashboard">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <div className="text-right">
          <div className="text-[14px] uppercase tracking-wide text-white/48">{brief.cadence}</div>
          <h1 className="mt-1 text-[28px] font-medium leading-none text-white">Daily Brief</h1>
        </div>
      </header>

      <main className="mt-7 space-y-4 pb-8">
        <MobileCard variant="dashboard" className="px-5 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[#ffb12b]">
              <CalendarClock className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              <span className="text-[13px] font-medium uppercase tracking-wide">In-app brief</span>
            </div>
            <h2 className="mt-3 text-[23px] font-medium leading-tight text-white">{brief.title}</h2>
            <p className="mt-3 text-[15px] leading-snug text-white/58">{brief.delivery.note}</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-[13px]">
            <BriefMeta label="District" value={brief.district.code} />
            <BriefMeta label="Updated" value={formatBriefGeneratedAt(brief.generatedAt)} />
          </div>
        </MobileCard>

        <WrittenSummaryCard brief={brief} />

        <DailySourceDigestCard brief={brief} />

        <MobileCard variant="dashboard" className="px-5 py-5">
          <div className="text-[13px] font-medium uppercase tracking-wide text-white/50">Today&apos;s civic lens</div>
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

        <BriefSignalCard brief={brief} />

        <BriefHistoryCard records={briefHistory} />

        <MobileCard variant="dashboard" className="px-5 py-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[21px] font-medium leading-none text-white">Priority updates</h2>
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
          <h2 className="text-[21px] font-medium leading-none text-white">Watchlist focus</h2>
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
          {brief.watchlist.officials.length ? (
            <div className="mt-5 border-t border-white/8 pt-4">
              <div className="text-[12px] font-medium uppercase tracking-wide text-white/38">Following officials</div>
              <div className="mt-3 space-y-2">
                {brief.watchlist.officials.map((official) => (
                  <Link key={official.id} href={official.href} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2.5">
                    <span className="text-[14px] font-medium text-white/68">{official.title}</span>
                    <span className="text-[12px] text-[#ffb12b]">Open</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </MobileCard>

        <MobileCard variant="dashboard" className="px-5 py-5">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
            <h2 className="text-[21px] font-medium leading-none text-white">Action queue</h2>
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

function LockedWeeklyBriefPage({ planLabel }: { planLabel: string }) {
  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
      <header className="mt-12 flex items-center justify-between">
        <Link href="/dashboard" className={mobileIconButtonClass} aria-label="Back to dashboard">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <div className="text-right">
          <div className="text-[14px] uppercase tracking-wide text-white/48">{planLabel}</div>
          <h1 className="mt-1 text-[28px] font-medium leading-none text-white">Daily Brief</h1>
        </div>
      </header>

      <main className="mt-7 space-y-4 pb-8">
        <MobileCard variant="dashboard" className="px-5 py-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[#ffb12b]">
                <LockKeyhole className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                <span className="text-[13px] font-medium uppercase tracking-wide">Pro Brief</span>
              </div>
              <h2 className="mt-3 text-[25px] font-medium leading-tight text-white">Daily Brief is a Pro feature</h2>
              <p className="mt-3 text-[16px] leading-snug text-white/62">
                Free accounts keep the dashboard, saved ledger, and civic alerts. Upgrade to Pro for daily district context, saved watchlist movement, and focused next steps.
              </p>
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b]">
              <Crown className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
            </span>
          </div>
          <div className="mt-5 grid gap-3">
            <Link href="/upgrade" className="flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#ffdf63] via-[#ffb12b] to-[#ff8a00] text-[17px] font-semibold text-[#071225] shadow-[0_0_24px_rgba(255,177,43,0.22)]">
              View Pro options
            </Link>
            <Link href="/dashboard" className="flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-[14px] font-medium text-white/70">
              Back to dashboard
            </Link>
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

function BriefMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
      <div className="text-[11px] uppercase tracking-wide text-white/38">{label}</div>
      <div className="mt-1 truncate text-[14px] font-medium text-white/74">{value}</div>
    </div>
  );
}

function WrittenSummaryCard({ brief }: { brief: WeeklyBriefSnapshot }) {
  return (
    <MobileCard variant="dashboard" className="px-5 py-5">
      <div className="text-[13px] font-medium uppercase tracking-wide text-white/50">Written summary</div>
      <h2 className="mt-3 text-[23px] font-medium leading-tight text-white">{brief.writtenSummary.headline}</h2>
      <p className="mt-3 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-[12px] leading-snug text-white/48">
        {brief.writtenSummary.sourceNote}
      </p>
      <div className="mt-4 space-y-3">
        {brief.writtenSummary.paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-[15px] leading-snug text-white/62">
            {paragraph}
          </p>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-[#ffb12b]/18 bg-[#ffb12b]/10 p-4">
        <div className="text-[11px] font-medium uppercase tracking-wide text-[#ffb12b]/80">Suggested first read</div>
        <p className="mt-2 text-[14px] leading-snug text-white/70">{brief.writtenSummary.nextStep}</p>
      </div>
    </MobileCard>
  );
}

function DailySourceDigestCard({ brief }: { brief: WeeklyBriefSnapshot }) {
  return (
    <MobileCard variant="dashboard" className="px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[#ffb12b]">
            <Newspaper className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            <span className="text-[13px] font-medium uppercase tracking-wide">{brief.sourceDigest.title}</span>
          </div>
          <h2 className="mt-3 text-[23px] font-medium leading-tight text-white">Official updates and story signals</h2>
          <p className="mt-3 text-[15px] leading-snug text-white/58">{brief.sourceDigest.summary}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#ffb12b]/12 px-3 py-1.5 text-[13px] font-medium text-[#ffb12b]">
          {brief.metrics.majorStoryMatches} story signal{brief.metrics.majorStoryMatches === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-5 divide-y divide-white/8">
        {brief.sourceDigest.items.map((item) => (
          <div key={item.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.label === "Official update" ? "bg-[#43ed74]/12 text-[#43ed74]" : "bg-[#ffb12b]/12 text-[#ffb12b]"}`}>
                {item.label}
              </span>
              <span className="truncate text-[12px] text-white/42">{item.sourceName}</span>
            </div>
            <BriefSourceItemLink item={item} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(item.issueMatches.length ? item.issueMatches : brief.watchlist.interests.slice(0, 2)).map((issue) => (
                <span key={`${item.id}-${issue}`} className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[11px] font-medium text-white/50">
                  {issue}
                </span>
              ))}
              {item.sourceUrl ? (
                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#ffb12b]/20 bg-[#ffb12b]/10 px-2.5 py-1 text-[11px] font-semibold text-[#ffb12b]">
                  Source
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </MobileCard>
  );
}

function BriefSourceItemLink({ item }: { item: WeeklyBriefSnapshot["sourceDigest"]["items"][number] }) {
  const content = (
    <>
      <span className="block text-[16px] font-medium leading-snug text-white">{item.title}</span>
      <span className="mt-1 block text-[13px] leading-snug text-white/54">{item.body}</span>
    </>
  );

  if (item.href.startsWith("http://") || item.href.startsWith("https://")) {
    return (
      <a href={item.href} target="_blank" rel="noreferrer" className="mt-3 block">
        {content}
      </a>
    );
  }

  return (
    <Link href={item.href} className="mt-3 block">
      {content}
    </Link>
  );
}

function BriefSignalCard({ brief }: { brief: WeeklyBriefSnapshot }) {
  const signals = [
    {
      label: "District context",
      value: brief.district.label
    },
    {
      label: "Saved ledger",
      value: `${brief.metrics.savedRecords} saved record${brief.metrics.savedRecords === 1 ? "" : "s"}`
    },
    {
      label: "Followed issues",
      value: `${brief.metrics.policyInterests} issue${brief.metrics.policyInterests === 1 ? "" : "s"}`
    },
    {
      label: "Story signals",
      value: `${brief.metrics.majorStoryMatches} matched item${brief.metrics.majorStoryMatches === 1 ? "" : "s"}`
    },
    {
      label: "Unread alerts",
      value: `${brief.metrics.unreadAlerts} unread update${brief.metrics.unreadAlerts === 1 ? "" : "s"}`
    }
  ];

  return (
    <MobileCard variant="dashboard" className="px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[21px] font-medium leading-none text-white">Brief inputs</h2>
        <span className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${brief.delivery.enabled ? "bg-[#43ed74]/12 text-[#43ed74]" : "bg-white/8 text-white/52"}`}>
          {brief.delivery.enabled ? "Brief alerts on" : "Alerts paused"}
        </span>
      </div>
      <div className="mt-5 divide-y divide-white/8">
        {signals.map((signal) => (
          <div key={signal.label} className="grid grid-cols-[112px_1fr] gap-3 py-3 first:pt-0 last:pb-0">
            <div className="text-[12px] font-medium uppercase tracking-wide text-white/38">{signal.label}</div>
            <div className="min-w-0 text-[14px] leading-snug text-white/68">{signal.value}</div>
          </div>
        ))}
      </div>
    </MobileCard>
  );
}

function BriefHistoryCard({ records }: { records: WeeklyBriefDeliveryRecord[] }) {
  const visibleRecords = records.slice(0, 3);

  return (
    <MobileCard variant="dashboard" className="px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[21px] font-medium leading-none text-white">Recent briefs</h2>
        <span className="rounded-full bg-white/8 px-3 py-1.5 text-[12px] font-medium text-white/52">
          {visibleRecords.length ? `${visibleRecords.length} saved` : "Live only"}
        </span>
      </div>
      {visibleRecords.length ? (
        <div className="mt-5 divide-y divide-white/8">
          {visibleRecords.map((record) => (
            <div key={record.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-[14px] font-medium leading-snug text-white/72">{record.summary}</div>
                <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[11px] text-white/50">
                  {getWeeklyBriefStatusLabel(record.status)}
                </span>
              </div>
              <div className="mt-2 text-[12px] leading-snug text-white/42">
                {formatBriefGeneratedAt(record.createdAt)} - {record.trackedBillCount} bills - {record.issueCount} topics - {record.unreadAlertCount} unread
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-[14px] leading-snug text-white/54">
          No saved brief captures yet. The current in-app brief is generated live from your latest account activity.
        </p>
      )}
    </MobileCard>
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
