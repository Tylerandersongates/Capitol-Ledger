import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  CalendarClock,
  ChevronDown,
  FileText,
  Home,
  Landmark,
  ListChecks,
  Newspaper,
  Search,
  Settings
} from "lucide-react";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass } from "@/components/mobile-ui";
import { readWeeklyBriefDeliveryHistoryFromDatabase } from "@/lib/account-database";
import { publicBrandName } from "@/lib/brand";
import { getCurrentSession } from "@/lib/auth";
import { getEffectiveSubscriptionForAccountUser } from "@/lib/effective-account-subscription";
import { DailyBriefVideo } from "@/components/daily-brief-video";
import { DailyBriefProOffer } from "@/components/daily-brief-pro-offer";
import { getDailyBriefVideoPageData } from "@/lib/daily-brief-video";
import { getDailyBriefProLayoutFixture, isDailyBriefProLayoutPreview } from "@/lib/daily-brief-layout-preview";
import { isPlanFeatureEnabled } from "@/lib/subscription-plans";
import {
  formatBriefGeneratedAt,
  type DailyBriefRecommendation,
  type WeeklyBriefSnapshot
} from "@/lib/weekly-brief";
import { getOrCreateDailyBriefEditionForUser } from "@/lib/weekly-brief-editions";
import {
  getWeeklyBriefDeliveryHistory,
  getWeeklyBriefStatusLabel,
  type WeeklyBriefDeliveryRecord
} from "@/lib/weekly-brief-history";

export default async function WeeklyBriefPage({ searchParams }: { searchParams?: Promise<{ preview?: string }> }) {
  const video = getDailyBriefVideoPageData();
  const preview = isDailyBriefProLayoutPreview((await searchParams)?.preview);

  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-6 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
      <header className="mt-8 flex items-center justify-between">
        <Link href="/dashboard" className={mobileIconButtonClass} aria-label="Back to dashboard">
          <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <div className="text-right">
          <div className="text-[14px] uppercase tracking-wide text-[#ffb12b]">Free for everyone</div>
          <h1 className="mt-1 text-[28px] font-medium leading-none text-white">Daily Brief</h1>
        </div>
      </header>

      <div className="mt-6 space-y-4 pb-8">
        {preview ? (
          <aside id="pro-preview-notes" className="scroll-mt-6 rounded-2xl border border-[#ffb12b]/25 bg-[#ffb12b]/10 px-4 py-3 text-[14px] leading-relaxed text-white/70">
            <p className="font-semibold text-[#ffb12b]">Pro layout preview · Sample content</p>
            <p className="mt-1">Illustrative examples, not live reporting or your saved data. Your subscription is unchanged.</p>
            <Link href="/brief" className="mt-2 inline-flex min-h-11 items-center text-[#ffb12b] underline underline-offset-4">Return to the regular Daily Brief</Link>
          </aside>
        ) : null}
        <DailyBriefVideo data={video} />
        {preview ? (
          <PersonalizedBriefContent brief={getDailyBriefProLayoutFixture()} records={[]} preview />
        ) : (
          <Suspense fallback={null}>
            <PersonalizedBrief />
          </Suspense>
        )}
      </div>

      <MobileBottomNav
        indicatorClassName="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white"
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { href: "/search", icon: <Search />, label: "Search" },
          { href: "/alerts", icon: <Bell />, label: "Alerts" },
          { href: "/settings", icon: <Settings />, label: "Settings" }
        ]}
      />
    </MobileShell>
  );
}

async function PersonalizedBrief() {
  const session = await getCurrentSession();
  if (!session) return <DailyBriefProOffer />;
  const subscription = await getEffectiveSubscriptionForAccountUser(session.user).catch(() => null);
  if (!subscription) return null;
  if (!isPlanFeatureEnabled(subscription.plan, "personalizedBrief")) return <DailyBriefProOffer initialSubscription={subscription} />;

  const edition = await getOrCreateDailyBriefEditionForUser(session.user);
  const databaseHistory = await readWeeklyBriefDeliveryHistoryFromDatabase(edition.userId).catch(() => null);
  const history = databaseHistory ?? getWeeklyBriefDeliveryHistory(edition.userId);
  return <PersonalizedBriefContent brief={edition.snapshot} records={history} />;
}

function PersonalizedBriefContent({ brief, records, preview = false }: { brief: WeeklyBriefSnapshot; records: WeeklyBriefDeliveryRecord[]; preview?: boolean }) {
  return (
    <details id="personalized-brief" open={preview} className="scroll-mt-6 rounded-[1.35rem] border border-white/15 bg-white/[0.025] p-4 text-white">
      <summary className="cursor-pointer text-[16px] font-medium">Your personalized brief</summary>
      <p className="mt-3 text-[14px] leading-relaxed text-white/60">
        {preview ? "Sample interests: Infrastructure and Education" : `Your saved interests and watchlist · ${formatBriefGeneratedAt(brief.generatedAt)}`}
      </p>
      <div className="mt-4 space-y-4">
        <YourWatchTodayCard recommendations={brief.watchToday} />
        <YesterdayInPoliticsCard brief={brief} />
        <WatchlistMovementCard brief={brief} />
        <WorthCheckingNextCard actions={brief.worthCheckingNext} />
        <BriefDetails brief={brief} records={records} />
      </div>
    </details>
  );
}

function YourWatchTodayCard({ recommendations }: { recommendations: DailyBriefRecommendation[] }) {
  const whatToWatch = recommendations.filter((recommendation) => recommendation.kind !== "official");
  const whoToWatch = recommendations.filter((recommendation) => recommendation.kind === "official");

  return (
    <MobileCard variant="dashboard" className="px-5 py-5">
      <h2 className="text-[21px] font-medium leading-snug text-white">{publicBrandName} recommends</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-white/50">Recommended to watch—not an endorsement.</p>
      {recommendations.length ? (
        <div className="mt-5 space-y-5">
          {whatToWatch.length ? (
            <WatchRecommendationGroup
              label="What to watch"
              recommendations={whatToWatch}
            />
          ) : null}
          {whoToWatch.length ? (
            <WatchRecommendationGroup
              label="Who to watch"
              recommendations={whoToWatch}
            />
          ) : null}
        </div>
      ) : (
        <BriefEmptyState>
          Add a district, followed issue, bill, or official to give tomorrow&apos;s brief enough context for transparent recommendations.
        </BriefEmptyState>
      )}
    </MobileCard>
  );
}

function WatchRecommendationGroup({ label, recommendations }: { label: string; recommendations: DailyBriefRecommendation[] }) {
  return (
    <section>
      <h3 className="text-[14px] font-medium text-[#ffb12b]">
        {label}
      </h3>
      <div className="mt-3 divide-y divide-white/10">
        {recommendations.map((recommendation) => (
          <WatchRecommendation
            key={recommendation.id}
            recommendation={recommendation}
          />
        ))}
      </div>
    </section>
  );
}

function WatchRecommendation({ recommendation }: { recommendation: DailyBriefRecommendation }) {
  return (
    <article className="py-5 first:pt-0 last:pb-0">
      <h4 className="text-[18px] font-medium leading-snug text-white">
        <Link href={recommendation.href}>{recommendation.title}</Link>
      </h4>
      <details className="group mt-2" data-brief-recommendation>
        <summary className="cursor-pointer list-none rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffb12b] [&::-webkit-details-marker]:hidden">
          <span className="sr-only">Why this is worth watching: </span>
          <span className="line-clamp-2 text-[16px] leading-relaxed text-white/60 group-open:line-clamp-none">{recommendation.whySelected}</span>
          <span className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-medium text-[#ffb12b]">
            <span className="group-open:hidden">Details</span>
            <span className="hidden group-open:inline">Less detail</span>
            <span className="sr-only"> for {recommendation.title}</span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </span>
        </summary>
        <div className="space-y-4 border-t border-white/10 pt-4">
          <EditorialReason label="What happened" body={recommendation.whatHappened} />
          <EditorialReason label="What may happen next" body={recommendation.next} />
          <a
            href={recommendation.sourceUrl}
            target={recommendation.sourceUrl.startsWith("#") ? undefined : "_blank"}
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-medium text-[#ffb12b]"
          >
            {recommendation.sourceUrl === "#pro-preview-notes" ? "About this sample" : "Official source"}
            <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </a>
        </div>
      </details>
    </article>
  );
}

function EditorialReason({ body, label }: { body: string; label: string }) {
  return (
    <div>
      <p className="text-[14px] font-medium text-white/80">{label}</p>
      <p className="mt-1 text-[16px] leading-relaxed text-white/60">{body}</p>
    </div>
  );
}

function YesterdayInPoliticsCard({ brief }: { brief: WeeklyBriefSnapshot }) {
  return (
    <MobileCard variant="dashboard" className="px-5 py-5">
      <SectionHeading
        icon={<Newspaper />}
        title="Yesterday in politics"
        description="Up to three federal topics from the previous 24-hour media scan. Coverage is context; linked official records remain the source of truth."
      />

      {brief.yesterdayInPolitics.length ? (
        <div className="mt-5 divide-y divide-white/10">
          {brief.yesterdayInPolitics.map((item) => (
            <article key={item.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[11px] font-semibold text-white/52">
                  Media context
                </span>
                <span className="truncate text-[12px] text-white/42">{item.sourceName}</span>
              </div>
              <BriefSourceItemLink item={item} />
              {item.issueMatches.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.issueMatches.slice(0, 3).map((issue) => (
                    <span key={`${item.id}-${issue}`} className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[11px] text-white/46">
                      {issue}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <BriefEmptyState>
          No media topics cleared the latest 24-hour selection. The official vote and bill records above remain available.
        </BriefEmptyState>
      )}
    </MobileCard>
  );
}

function BriefSourceItemLink({ item }: { item: WeeklyBriefSnapshot["yesterdayInPolitics"][number] }) {
  return (
    <a href={item.href} target="_blank" rel="noreferrer" className="mt-3 block">
      <span className="block text-[17px] font-medium leading-snug text-white">{item.title}</span>
      <span className="mt-1 block text-[13px] leading-snug text-white/54">{item.body}</span>
      <span className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#ffb12b]">
        {item.href === "#pro-preview-notes" ? "About this sample" : "Read coverage"}
        <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
      </span>
    </a>
  );
}

function WatchlistMovementCard({ brief }: { brief: WeeklyBriefSnapshot }) {
  return (
    <MobileCard variant="dashboard" className="px-5 py-5">
      <SectionHeading
        icon={<Landmark />}
        title="Your watchlist moved"
        description="Only meaningful official changes since your prior brief appear here."
      />

      <p className="mt-4 rounded-2xl border border-white/8 bg-white/[0.035] p-4 text-[14px] leading-snug text-white/62">
        {brief.watchlistMovement.summary}
      </p>

      {brief.watchlistMovement.items.length ? (
        <div className="mt-4 divide-y divide-white/10">
          {brief.watchlistMovement.items.map((item) => (
            <article key={item.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                <span>{item.label}</span>
                <span>{formatBriefGeneratedAt(item.occurredAt)}</span>
              </div>
              <Link href={item.href} className="mt-2 block text-[16px] font-medium leading-snug text-white">
                {item.title}
              </Link>
              <p className="mt-1 text-[13px] leading-snug text-white/54">{item.body}</p>
              {item.sourceUrl ? (
                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#ffb12b]">
                  Official source
                  <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                </a>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </MobileCard>
  );
}

function WorthCheckingNextCard({ actions }: { actions: WeeklyBriefSnapshot["worthCheckingNext"] }) {
  return (
    <MobileCard variant="dashboard" className="px-5 py-5">
      <SectionHeading
        icon={<ListChecks />}
        title="Worth checking next"
        description="One or two useful follow-ups, based on what is ready now."
      />
      <div className="mt-5 space-y-3">
        {actions.map((action, index) => (
          <Link
            key={`${action.label}-${index}`}
            href={action.href}
            className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-4"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#ffb12b]/12 text-[12px] font-semibold text-[#ffb12b]">
              {index + 1}
            </span>
            <span>
              <span className="block text-[15px] font-medium text-white">{action.label}</span>
              <span className="mt-1 block text-[13px] leading-snug text-white/52">{action.body}</span>
            </span>
            <ArrowUpRight className="mt-1 h-4 w-4 text-white/34" strokeWidth={1.8} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </MobileCard>
  );
}

function BriefDetails({ brief, records }: { brief: WeeklyBriefSnapshot; records: WeeklyBriefDeliveryRecord[] }) {
  const visibleRecords = records.slice(0, 2);

  return (
    <details className="group rounded-[1.35rem] border border-white/10 bg-white/[0.025] px-5 py-4 text-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-medium text-white/62">
        <span className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
          About this brief
        </span>
        <span className="text-[12px] font-normal text-white/38 group-open:hidden">Sources &amp; history</span>
        <span className="hidden text-[12px] font-normal text-white/38 group-open:inline">Close</span>
      </summary>
      <div className="mt-4 space-y-4 border-t border-white/8 pt-4">
        <p className="text-[13px] leading-snug text-white/52">{brief.writtenSummary.sourceNote}</p>
        <dl className="grid grid-cols-2 gap-3">
          <BriefMeta label="District" value={brief.district.code} />
          <BriefMeta label="Updated" value={formatBriefGeneratedAt(brief.generatedAt)} />
          <BriefMeta label="Saved records" value={String(brief.metrics.savedRecords)} />
          <BriefMeta label="Followed issues" value={String(brief.metrics.policyInterests)} />
        </dl>
        {visibleRecords.length ? (
          <div className="border-t border-white/8 pt-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-white/38">Recent briefs</div>
            <div className="mt-3 space-y-3">
              {visibleRecords.map((record) => (
                <div key={record.id} className="flex items-start justify-between gap-3 text-[12px] text-white/48">
                  <span>{formatBriefGeneratedAt(record.createdAt)}</span>
                  <span>{getWeeklyBriefStatusLabel(record.status)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function BriefMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
      <dt className="text-[10px] uppercase tracking-wide text-white/34">{label}</dt>
      <dd className="mt-1 truncate text-[13px] font-medium text-white/66">{value}</dd>
    </div>
  );
}

function SectionHeading({
  description,
  icon,
  title
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[#ffb12b] [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[1.8]">
        {icon}
        <h2 className="text-[21px] font-medium leading-none text-white">{title}</h2>
      </div>
      <p className="mt-3 text-[13px] leading-snug text-white/48">{description}</p>
    </div>
  );
}

function BriefEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-white/[0.025] p-4 text-[14px] leading-snug text-white/52">
      {children}
    </div>
  );
}
