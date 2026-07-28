import { MobileShell } from "@/components/mobile-shell";
import { MobileGlassScrollFrame } from "@/components/mobile-glass-scroll-frame";
import { MobileBottomNav, MobileCard, mobileIconButtonClass } from "@/components/mobile-ui";
import { PlanFeatureGate } from "@/components/subscription-controls";
import { DiscoverySearchForm } from "@/components/discovery-search-form";
import { SearchSetupChips } from "@/components/search-setup-chips";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Home,
  ArrowLeft,
  Search,
  Sparkles,
  Settings,
  Vote
} from "lucide-react";
import { getBillSponsor, searchRecordsWithLiveData } from "@/lib/data";
import { getCurrentEffectiveAccountSubscription } from "@/lib/effective-account-subscription";
import { memberResultMeta } from "@/lib/member-display";
import { searchPartyOptions } from "@/lib/party-affiliations";
import { formatDate } from "@/lib/utils";

type SearchParamValue = string | string[] | undefined;

type SearchPageProps = {
  searchParams: {
    q?: SearchParamValue;
    status?: SearchParamValue;
    type?: SearchParamValue;
    chamber?: SearchParamValue;
    focus?: SearchParamValue;
    party?: SearchParamValue;
    state?: SearchParamValue;
  };
};

type SmartFilterKey = "chamber" | "party" | "state";
type SearchResultsData = Awaited<ReturnType<typeof searchRecordsWithLiveData>>["results"];

const searchTabs = [
  { label: "All", value: "all" },
  { label: "Bills", value: "bills" },
  { label: "Officials", value: "members" },
  { label: "Votes", value: "votes" }
];

const premiumEyebrowClass = "text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48";
const premiumIconTileClass =
  "grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.16)]";
const premiumPanelClass =
  "rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.22)_0%,rgba(7,23,50,0.68)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(2,10,28,0.22)]";
const premiumPillClass =
  "rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[12px] font-semibold leading-none text-white/56";

function firstSearchParamValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeStateParamValues(value: SearchParamValue) {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return Array.from(
    new Set(
      values
        .flatMap((item) => item.split(","))
        .map((item) => item.trim().toUpperCase())
        .filter((item) => /^[A-Z]{2}$/.test(item))
    )
  );
}

const smartFilterGroups: Array<{
  key: SmartFilterKey;
  label: string;
  options: Array<{ label: string; value?: string }>;
}> = [
  {
    key: "chamber",
    label: "Chamber",
    options: [
      { label: "All" },
      { label: "Senate", value: "Senate" },
      { label: "House", value: "House" }
    ]
  },
  {
    key: "party",
    label: "Party",
    options: [{ label: "All" }, ...searchPartyOptions]
  },
  {
    key: "state",
    label: "State",
    options: [
      { label: "All" },
      { label: "AK", value: "AK" },
      { label: "AL", value: "AL" },
      { label: "AR", value: "AR" },
      { label: "AS", value: "AS" },
      { label: "AZ", value: "AZ" },
      { label: "CA", value: "CA" },
      { label: "CO", value: "CO" },
      { label: "CT", value: "CT" },
      { label: "DC", value: "DC" },
      { label: "DE", value: "DE" },
      { label: "FL", value: "FL" },
      { label: "GA", value: "GA" },
      { label: "GU", value: "GU" },
      { label: "HI", value: "HI" },
      { label: "IA", value: "IA" },
      { label: "ID", value: "ID" },
      { label: "IL", value: "IL" },
      { label: "IN", value: "IN" },
      { label: "KS", value: "KS" },
      { label: "KY", value: "KY" },
      { label: "LA", value: "LA" },
      { label: "MA", value: "MA" },
      { label: "MD", value: "MD" },
      { label: "ME", value: "ME" },
      { label: "MI", value: "MI" },
      { label: "MN", value: "MN" },
      { label: "MO", value: "MO" },
      { label: "MP", value: "MP" },
      { label: "MS", value: "MS" },
      { label: "MT", value: "MT" },
      { label: "NC", value: "NC" },
      { label: "ND", value: "ND" },
      { label: "NE", value: "NE" },
      { label: "NH", value: "NH" },
      { label: "NJ", value: "NJ" },
      { label: "NM", value: "NM" },
      { label: "NV", value: "NV" },
      { label: "NY", value: "NY" },
      { label: "OH", value: "OH" },
      { label: "OK", value: "OK" },
      { label: "OR", value: "OR" },
      { label: "PA", value: "PA" },
      { label: "PR", value: "PR" },
      { label: "RI", value: "RI" },
      { label: "SC", value: "SC" },
      { label: "SD", value: "SD" },
      { label: "TN", value: "TN" },
      { label: "TX", value: "TX" },
      { label: "UT", value: "UT" },
      { label: "VA", value: "VA" },
      { label: "VI", value: "VI" },
      { label: "VT", value: "VT" },
      { label: "WA", value: "WA" },
      { label: "WI", value: "WI" },
      { label: "WV", value: "WV" },
      { label: "WY", value: "WY" }
    ]
  }
];

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const activeType = firstSearchParamValue(searchParams.type) ?? "all";
  const query = firstSearchParamValue(searchParams.q) ?? "";
  const chamber = firstSearchParamValue(searchParams.chamber);
  const focus = firstSearchParamValue(searchParams.focus);
  const party = firstSearchParamValue(searchParams.party);
  const status = firstSearchParamValue(searchParams.status);
  const stateValues = normalizeStateParamValues(searchParams.state);
  const [{ results }, initialSubscription] = await Promise.all([
    searchRecordsWithLiveData({
      chamber,
      party,
      q: query || undefined,
      state: stateValues.length ? stateValues : undefined,
      status,
      type: activeType
    }),
    getCurrentEffectiveAccountSubscription()
  ]);
  const resultCount = results.members.length + results.bills.length + results.votes.length;
  const hasSmartFilters = Boolean(chamber || party || stateValues.length);
  const prioritizeResults = focus === "results";

  return (
    <MobileShell
      ambientClassName="bg-[radial-gradient(circle_at_18%_8%,rgba(43,122,203,0.13),transparent_32%),radial-gradient(circle_at_84%_8%,rgba(255,177,43,0.08),transparent_28%),linear-gradient(180deg,rgba(2,10,24,0.16)_0%,rgba(2,9,23,0.58)_54%,rgba(1,6,18,0.82)_100%)]"
      backgroundClassName="bg-[linear-gradient(180deg,#071a34_0%,#041229_30%,#020b1d_68%,#010817_100%)]"
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between px-3 text-[17px] font-semibold"
    >
            <header className="mt-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className={mobileIconButtonClass} aria-label="Back to dashboard">
                  <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
                </Link>
                <div>
                  <div className={premiumEyebrowClass}>Find</div>
                  <h1 className="mt-2 text-[30px] font-medium leading-none text-white">Search</h1>
                </div>
              </div>
              <span className={premiumIconTileClass}>
                <Search className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
              </span>
            </header>

            <main className="mt-7 space-y-5 pb-8">
              {prioritizeResults ? (
                <SearchResultBlocks activeType={activeType} results={results} />
              ) : null}

              <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
                {prioritizeResults ? (
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[17px] font-medium leading-none text-white/84">Filters</h2>
                    <span className={premiumPillClass}>Filters</span>
                  </div>
                ) : null}
                <DiscoverySearchForm
                  activeType={activeType}
                  chamber={chamber}
                  focus={focus}
                  party={party}
                  query={query}
                  status={status}
                  state={stateValues}
                />

                <nav className="mt-5 grid grid-cols-4 rounded-[1.15rem] border border-white/12 bg-[linear-gradient(180deg,rgba(26,73,127,0.22)_0%,rgba(6,25,55,0.72)_100%)] p-1 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  {searchTabs.map((tab) => (
                    <Link
                      key={tab.value}
                      href={searchHref(searchParams, {
                        type: tab.value,
                        status: tab.value === "bills" || tab.value === "all" ? status : undefined
                      })}
                      className={`h-10 rounded-xl pt-3 text-[13px] font-semibold leading-none transition ${
                        activeType === tab.value || (!firstSearchParamValue(searchParams.type) && tab.value === "all")
                          ? "bg-[linear-gradient(180deg,#ffe06a_0%,#ffb12b_100%)] text-[#061126] shadow-[0_8px_20px_rgba(255,177,43,0.18)]"
                          : "text-white/56 hover:bg-white/[0.035] hover:text-white/78"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  ))}
                </nav>

                <SearchSetupChips focus={focus} />

                <PlanFeatureGate
                  feature="advancedSearch"
                  initialSubscription={initialSubscription}
                  fallback={
                    <div className={`mt-4 flex items-center justify-between gap-3 px-4 py-3 ${premiumPanelClass}`}>
                      <span className="flex items-center gap-2 text-[13px] font-medium text-white/56">
                        <Filter className="h-4 w-4 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
                        More filters
                      </span>
                      <Link href="/upgrade" className="rounded-full border border-[#ffb12b]/28 bg-[#ffb12b]/10 px-2.5 py-1 text-[11px] font-semibold text-[#ffb12b]">
                        Pro
                      </Link>
                    </div>
                  }
                >
                  <details
                    className={`mt-4 px-4 py-3 ${premiumPanelClass}`}
                    open={(activeType === "members" || hasSmartFilters) && !prioritizeResults}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-medium text-white/64 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
                        More filters
                      </span>
                      <span className="rounded-full border border-[#ffb12b]/28 bg-[#ffb12b]/10 px-2.5 py-1 text-[11px] font-semibold text-[#ffb12b]">
                        {hasSmartFilters ? "Active" : "Optional"}
                      </span>
                    </summary>
                    <div className="mt-4 space-y-4 border-t border-white/8 pt-4">
                      {smartFilterGroups.map((group) => (
                        <SmartFilterRow key={group.key} group={group} searchParams={searchParams} />
                      ))}
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#071a38]/65 px-4 py-3 text-[12px] font-medium text-white/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                        <span>{results.members.length} officials match</span>
                        {hasSmartFilters ? (
                          <Link href={searchHref(searchParams, { type: "members", chamber: undefined, party: undefined, state: undefined })} className="text-[#ffb12b]">
                            Clear filters
                          </Link>
                        ) : (
                          <span>Pro filters</span>
                        )}
                      </div>
                    </div>
                  </details>
                </PlanFeatureGate>
              </MobileCard>

              <div className="grid grid-cols-3 gap-3">
                <MiniMetric value={String(resultCount)} label="Results" />
                <MiniMetric value={String(results.members.length)} label="Officials" />
                <MiniMetric value={String(results.bills.length)} label="Bills" />
              </div>

              <PlanFeatureGate feature="exportReports" initialSubscription={initialSubscription}>
                <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48">
                        <Sparkles className="h-4 w-4 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
                        Pro export
                      </div>
                      <h2 className="mt-2 text-[19px] font-medium leading-tight">Export these results</h2>
                      <p className="mt-3 text-[14px] leading-snug text-white/56">
                        Save matched bills, officials, votes, and source links as a shareable summary.
                      </p>
                    </div>
                    <Link href="/brief" className={premiumIconTileClass} aria-label="Open report export">
                      <Download className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                    </Link>
                  </div>
                </MobileCard>
              </PlanFeatureGate>

              {!prioritizeResults ? (
                <SearchResultBlocks activeType={activeType} results={results} />
              ) : null}
            </main>

            <MobileBottomNav
              items={[
                { href: "/dashboard", icon: <Home />, label: "Home" },
                { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
                { active: true, href: "/search", icon: <Search />, label: "Search" },
                { href: "/alerts", icon: <Bell />, label: "Alerts" },
                { href: "/settings", icon: <Settings />, label: "Settings" }
              ]}
            />
    </MobileShell>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${premiumPanelClass} px-3 py-4 text-center`}>
      <div className="text-[22px] font-semibold leading-none text-[#ffb12b]">{value}</div>
      <div className="mt-2 text-[12px] font-medium text-white/52">{label}</div>
    </div>
  );
}

function SearchResultBlocks({
  activeType,
  results
}: {
  activeType: string;
  results: SearchResultsData;
}) {
  const sectionOrder: Array<"members" | "bills" | "votes"> =
    activeType === "members" || activeType === "bills" || activeType === "votes"
      ? [activeType, ...(["members", "bills", "votes"] as const).filter((kind) => kind !== activeType)]
      : ["members", "bills", "votes"];

  return (
    <>
      {sectionOrder.map((sectionType) => {
        if (sectionType === "members") {
          return (
            <ResultSection
              key="members"
              title="Officials"
              count={results.members.length}
            >
              {results.members.length ? (
                results.members.map((member) => (
                  <Link key={member.bioguideId} href={`/members/${member.bioguideId}`} className={`flex items-center gap-4 p-4 transition hover:brightness-110 ${premiumPanelClass}`}>
                    {member.photoUrl ? (
                      <Image src={member.photoUrl} alt="" width={56} height={56} className="h-14 w-14 rounded-2xl border border-white/14 object-cover shadow-[0_10px_18px_rgba(0,0,0,0.24)]" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[16px] font-medium text-white">{member.fullName.replace(/^Sen\.\s+|^Rep\.\s+/, "")}</div>
                      <div className="mt-1 text-[13px] text-white/55">
                        {memberResultMeta(member)}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/45" strokeWidth={1.8} aria-hidden="true" />
                  </Link>
                ))
              ) : (
                <EmptyState label="No officials match this search. Try fewer filters or a different state." />
              )}
            </ResultSection>
          );
        }

        if (sectionType === "bills") {
          return (
            <ResultSection
              key="bills"
              title="Bills"
              count={results.bills.length}
            >
              {results.bills.length ? (
                results.bills.map((bill) => {
                  const sponsor = getBillSponsor(bill);
                  return (
                    <Link key={bill.id} href={`/bills/${bill.id}`} className={`block p-4 transition hover:brightness-110 ${premiumPanelClass}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#ffb12b]">{bill.displayNumber}</div>
                          <div className="mt-1 line-clamp-2 text-[16px] font-medium leading-snug text-white">{bill.shortTitle}</div>
                          <div className="mt-2 text-[13px] text-white/52">
                            {sponsor?.fullName ?? "Congress"} · {bill.policyArea}
                          </div>
                        </div>
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b]">
                          <FileText className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-[13px] text-white/52">
                        <CalendarDays className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                        {formatDate(bill.latestActionDate)}
                      </div>
                    </Link>
                  );
                })
              ) : (
                <EmptyState label="No bills match this search. Try a broader keyword or clear one filter." />
              )}
            </ResultSection>
          );
        }

        return (
          <ResultSection
            key="votes"
            title="Votes"
            count={results.votes.length}
          >
            {results.votes.length ? (
              results.votes.map((vote) => (
                <Link key={vote.id} href={`/votes/${vote.id}`} className={`flex items-start gap-4 p-4 transition hover:brightness-110 ${premiumPanelClass}`}>
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b]">
                    <Vote className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-medium text-white">{vote.question}</div>
                    <div className="mt-2 text-[13px] text-white/52">
                      {vote.chamber} roll call {vote.rollCall} · {formatDate(vote.voteDate)}
                    </div>
                    <div className="mt-2 text-[13px] font-semibold text-[#43ed74]">{vote.result}</div>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState label="No votes match this search. Try a broader keyword or clear one filter." />
            )}
          </ResultSection>
        );
      })}
    </>
  );
}

function searchHref(searchParams: SearchPageProps["searchParams"], updates: Partial<SearchPageProps["searchParams"]>) {
  const nextParams = { ...searchParams, ...updates };
  const params = new URLSearchParams();

  (["q", "type", "status", "chamber", "party", "state", "focus"] as const).forEach((key) => {
    const value = nextParams[key];
    if (Array.isArray(value)) {
      value.filter(Boolean).forEach((item) => params.append(key, item));
      return;
    }
    if (value) params.set(key, value);
  });

  const queryString = params.toString();
  return queryString ? `/search?${queryString}` : "/search";
}

function smartFilterHref(searchParams: SearchPageProps["searchParams"], key: SmartFilterKey, value?: string) {
  if (key === "state") {
    const activeStates = normalizeStateParamValues(searchParams.state);
    const nextStates = value
      ? activeStates.includes(value)
        ? activeStates.filter((state) => state !== value)
        : [...activeStates, value]
      : undefined;

    return searchHref(searchParams, {
      type: "members",
      state: nextStates?.length ? nextStates : undefined
    });
  }

  return searchHref(searchParams, {
    type: "members",
    [key]: value
  });
}

function SmartFilterRow({
  group,
  searchParams
}: {
  group: (typeof smartFilterGroups)[number];
  searchParams: SearchPageProps["searchParams"];
}) {
  const currentValue = firstSearchParamValue(searchParams[group.key]);
  const currentStates = group.key === "state" ? normalizeStateParamValues(searchParams.state) : [];
  const currentLabel =
    group.key === "state"
      ? currentStates.length > 1
        ? `${currentStates.length} states`
        : currentStates[0] ?? "All"
      : group.options.find((option) => option.value === currentValue)?.label ?? "All";
  const hasActiveValue = group.key === "state" ? currentStates.length > 0 : Boolean(currentValue);

  return (
    <details className="group rounded-xl border border-white/10 bg-[#071a38]/50 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" open={hasActiveValue}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="text-[11px] font-medium uppercase tracking-wide text-white/42">{group.label}</span>
        <span className="flex items-center gap-2">
          <span className="rounded-full border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-2.5 py-1 text-[11px] font-semibold leading-none text-[#ffb12b]">
            {currentLabel}
          </span>
          <ChevronRight className="h-4 w-4 text-white/38 transition group-open:rotate-90" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </summary>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-white/8 pt-3">
        {group.options.map((option) => (
          <FilterChip
            key={option.value ?? "all"}
            href={smartFilterHref(searchParams, group.key, option.value)}
            label={option.label}
            active={option.value ? (group.key === "state" ? currentStates.includes(option.value) : currentValue === option.value) : !hasActiveValue}
          />
        ))}
      </div>
    </details>
  );
}

function FilterChip({ active, href, label }: { active?: boolean; href: string; label: string }) {
  return (
    <Link
      href={href}
      className={`flex h-9 items-center justify-center rounded-full border px-3 text-[12px] font-semibold ${
        active ? "border-[#ffb12b]/55 bg-[#ffb12b]/14 text-[#ffb12b]" : "border-white/10 bg-white/[0.035] text-white/58 hover:text-white/78"
      }`}
    >
      {label}
    </Link>
  );
}

function ResultSection({
  children,
  count,
  title
}: {
  children: ReactNode;
  count: number;
  title: string;
}) {
  const shouldScroll = count > 2;

  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className={premiumEyebrowClass}>Results</div>
          <h2 className="mt-2 text-[22px] font-medium leading-none">{title}</h2>
          <div className="mt-2 text-[13px] text-white/46">{count} results</div>
        </div>
        {shouldScroll ? <span className={premiumPillClass}>Scroll</span> : null}
      </div>
      {shouldScroll ? (
        <MobileGlassScrollFrame heightClassName="h-[15.75rem]" className="space-y-3" ariaLabel={`${title} search results`}>
          {children}
        </MobileGlassScrollFrame>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
      {shouldScroll ? (
        <div className="mt-4 flex items-center justify-between text-[12px] font-medium text-white/42">
          <span>Scroll results</span>
          <span>{count} total</span>
        </div>
      ) : null}
    </MobileCard>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-[1.15rem] border border-dashed border-white/12 bg-white/[0.035] p-5 text-[14px] text-white/52">{label}</div>;
}
