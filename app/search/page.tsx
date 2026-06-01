import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileViewAllClass } from "@/components/mobile-ui";
import { PlanFeatureGate } from "@/components/subscription-controls";
import { DiscoverySearchForm } from "@/components/discovery-search-form";
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
  Search,
  Sparkles,
  UserRound,
  Vote
} from "lucide-react";
import { getBillSponsor, searchRecordsWithLiveData } from "@/lib/data";
import { formatDate } from "@/lib/utils";

type SearchPageProps = {
  searchParams: {
    q?: string;
    status?: string;
    type?: string;
    chamber?: string;
    focus?: string;
    party?: string;
    state?: string;
    expand?: string;
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

const discoveryChips = ["Healthcare", "Education", "Infrastructure", "California", "Massachusetts", "New York", "Texas"];

const discoveryStateLinks: Record<string, string> = {
  California: "/search?type=members&state=CA",
  Massachusetts: "/search?type=members&state=MA",
  "New York": "/search?type=members&state=NY",
  Texas: "/search?type=members&state=TX"
};

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
    options: [
      { label: "All" },
      { label: "Democrat", value: "Democrat" },
      { label: "Republican", value: "Republican" },
      { label: "Independent", value: "Independent" }
    ]
  },
  {
    key: "state",
    label: "State",
    options: [
      { label: "All" },
      { label: "CA", value: "CA" },
      { label: "MA", value: "MA" },
      { label: "NY", value: "NY" },
      { label: "TX", value: "TX" },
      { label: "VT", value: "VT" },
      { label: "AK", value: "AK" }
    ]
  }
];

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { results } = await searchRecordsWithLiveData(searchParams);
  const resultCount = results.members.length + results.bills.length + results.votes.length;
  const activeType = searchParams.type ?? "all";
  const requestedExpandedType =
    searchParams.expand === "members" || searchParams.expand === "bills" || searchParams.expand === "votes" ? searchParams.expand : undefined;
  const query = searchParams.q ?? "";
  const hasSmartFilters = Boolean(searchParams.chamber || searchParams.party || searchParams.state);
  const prioritizeResults = searchParams.focus === "results";
  const expandedType = requestedExpandedType;

  return (
    <MobileShell
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between px-3 text-[17px] font-semibold"
    >
            <header className="mt-10 flex items-center justify-between">
              <div>
                <div className="text-[13px] font-semibold uppercase tracking-wide text-white/50">Discovery</div>
                <h1 className="mt-2 text-[26px] font-medium leading-none text-white">Search</h1>
              </div>
            </header>

            <main className="mt-7 space-y-5 pb-8">
              {prioritizeResults ? (
                <SearchResultBlocks activeType={activeType} expandedType={expandedType} results={results} searchParams={searchParams} />
              ) : null}

              <MobileCard className="px-5 py-5">
                {prioritizeResults ? (
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[17px] font-medium leading-none text-white/84">Refine Search</h2>
                    <span className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-white/56">Filters</span>
                  </div>
                ) : null}
                <DiscoverySearchForm
                  activeType={activeType}
                  chamber={searchParams.chamber}
                  focus={searchParams.focus}
                  party={searchParams.party}
                  query={query}
                  status={searchParams.status}
                  state={searchParams.state}
                />

                <nav className="mt-5 grid grid-cols-4 rounded-2xl border border-white/10 bg-white/[0.035] p-1 text-center">
                  {searchTabs.map((tab) => (
                    <Link
                      key={tab.value}
                      href={searchHref(searchParams, {
                        expand: undefined,
                        type: tab.value,
                        status: tab.value === "bills" || tab.value === "all" ? searchParams.status : undefined
                      })}
                      className={`h-10 rounded-xl pt-3 text-[13px] font-medium leading-none ${
                        activeType === tab.value || (!searchParams.type && tab.value === "all") ? "bg-[#ffb12b] text-[#061126]" : "text-white/52"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  ))}
                </nav>

                <div className="mt-4 flex flex-wrap gap-2">
                  {discoveryChips.map((chip) => (
                    <Link
                      key={chip}
                      href={
                        discoveryStateLinks[chip]
                          ? `${discoveryStateLinks[chip]}${prioritizeResults ? "&focus=results" : ""}`
                          : searchHref(searchParams, { q: chip, type: "all", focus: prioritizeResults ? "results" : searchParams.focus })
                      }
                      className="rounded-full border border-rust/25 bg-white/[0.035] px-3 py-2 text-[12px] font-medium text-white/62"
                    >
                      {chip}
                    </Link>
                  ))}
                </div>

                <PlanFeatureGate
                  feature="advancedSearch"
                  fallback={
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3">
                      <span className="flex items-center gap-2 text-[13px] font-medium text-white/56">
                        <Filter className="h-4 w-4 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
                        Refine results
                      </span>
                      <Link href="/upgrade" className="rounded-full border border-rust/25 bg-rust/10 px-2.5 py-1 text-[11px] font-medium text-[#ffb12b]">
                        Pro
                      </Link>
                    </div>
                  }
                >
                  <details className="mt-4 rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3" open={hasSmartFilters && !prioritizeResults}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-medium text-white/64 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
                        Refine results
                      </span>
                      <span className="rounded-full border border-rust/25 bg-rust/10 px-2.5 py-1 text-[11px] font-medium text-[#ffb12b]">
                        {hasSmartFilters ? "Active" : "Optional"}
                      </span>
                    </summary>
                    <div className="mt-4 space-y-4 border-t border-white/8 pt-4">
                      {smartFilterGroups.map((group) => (
                        <SmartFilterRow key={group.key} group={group} searchParams={searchParams} />
                      ))}
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-[12px] font-medium text-white/48">
                        <span>{results.members.length} officials match</span>
                        {hasSmartFilters ? (
                          <Link href={searchHref(searchParams, { type: "members", chamber: undefined, party: undefined, state: undefined })} className="text-[#ffb12b]">
                            Clear filters
                          </Link>
                        ) : (
                          <span>Pro refine</span>
                        )}
                      </div>
                    </div>
                  </details>
                </PlanFeatureGate>
              </MobileCard>

              <div className="grid grid-cols-3 gap-3">
                <MiniMetric value={String(resultCount)} label="Records" />
                <MiniMetric value={String(results.members.length)} label="Officials" />
                <MiniMetric value={String(results.bills.length)} label="Bills" />
              </div>

              <PlanFeatureGate feature="exportReports">
                <MobileCard className="px-5 py-5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-wide text-white/50">
                        <Sparkles className="h-4 w-4 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
                        Pro report builder
                      </div>
                      <h2 className="mt-2 text-[19px] font-medium leading-tight">Export this search as a civic report</h2>
                      <p className="mt-3 text-[14px] leading-snug text-white/56">
                        Package matched bills, officials, votes, and source links into a shareable accountability brief.
                      </p>
                    </div>
                    <Link href="/brief" className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-rust/35 bg-rust/10 text-[#ffb12b]" aria-label="Preview report export">
                      <Download className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                    </Link>
                  </div>
                </MobileCard>
              </PlanFeatureGate>

              {!prioritizeResults ? (
                <SearchResultBlocks activeType={activeType} expandedType={expandedType} results={results} searchParams={searchParams} />
              ) : null}
            </main>

            <MobileBottomNav
              items={[
                { href: "/dashboard", icon: <Home />, label: "Home" },
                { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
                { active: true, href: "/search", icon: <Search />, label: "Search" },
                { href: "/alerts", icon: <Bell />, label: "Alerts" },
                { href: "/account", icon: <UserRound />, label: "Profile" }
              ]}
            />
    </MobileShell>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-center">
      <div className="text-[21px] font-medium leading-none text-[#ffb12b]">{value}</div>
      <div className="mt-2 text-[12px] text-white/50">{label}</div>
    </div>
  );
}

function SearchResultBlocks({
  activeType,
  expandedType,
  results,
  searchParams
}: {
  activeType: string;
  expandedType?: "members" | "bills" | "votes";
  results: SearchResultsData;
  searchParams: SearchPageProps["searchParams"];
}) {
  const viewAllHref = (type: "members" | "bills" | "votes") =>
    searchHref(searchParams, {
      chamber: undefined,
      expand: type,
      focus: "results",
      party: undefined,
      q: undefined,
      state: undefined,
      status: undefined,
      type
    });
  const collapseHref = searchHref(searchParams, { expand: undefined });

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
              title="Representatives"
              href={viewAllHref("members")}
              collapseHref={collapseHref}
              count={results.members.length}
              expanded={expandedType === "members"}
            >
              {results.members.length ? (
                results.members.slice(0, expandedType === "members" ? 30 : 3).map((member) => (
                  <Link key={member.bioguideId} href={`/members/${member.bioguideId}`} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/4 p-4">
                    {member.photoUrl ? (
                      <Image src={member.photoUrl} alt="" width={56} height={56} className="h-14 w-14 rounded-full border border-rust/35 object-cover" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[16px] font-medium text-white">{member.fullName.replace(/^Sen\.\s+|^Rep\.\s+/, "")}</div>
                      <div className="mt-1 text-[13px] text-white/55">
                        {member.chamber} · {member.state}
                        {member.district ? `-${member.district}` : ""} · {member.party}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/45" strokeWidth={1.8} aria-hidden="true" />
                  </Link>
                ))
              ) : (
                <EmptyState label="No officials match this search." />
              )}
            </ResultSection>
          );
        }

        if (sectionType === "bills") {
          return (
            <ResultSection
              key="bills"
              title="Bills"
              href={viewAllHref("bills")}
              collapseHref={collapseHref}
              count={results.bills.length}
              expanded={expandedType === "bills"}
            >
              {results.bills.length ? (
                results.bills.slice(0, expandedType === "bills" ? 30 : 3).map((bill) => {
                  const sponsor = getBillSponsor(bill);
                  return (
                    <Link key={bill.id} href={`/bills/${bill.id}`} className="block rounded-2xl border border-white/8 bg-white/4 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-[16px] font-semibold text-[#ffb12b]">{bill.displayNumber}</div>
                          <div className="mt-1 line-clamp-2 text-[16px] font-medium leading-snug text-white">{bill.shortTitle}</div>
                          <div className="mt-2 text-[13px] text-white/52">
                            {sponsor?.fullName ?? "Congress"} · {bill.policyArea}
                          </div>
                        </div>
                        <FileText className="h-7 w-7 shrink-0 text-[#ffb12b]" strokeWidth={1.8} aria-hidden="true" />
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-[13px] text-white/52">
                        <CalendarDays className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                        {formatDate(bill.latestActionDate)}
                      </div>
                    </Link>
                  );
                })
              ) : (
                <EmptyState label="No bills match this search." />
              )}
            </ResultSection>
          );
        }

        return (
          <ResultSection
            key="votes"
            title="Votes"
            href={viewAllHref("votes")}
            collapseHref={collapseHref}
            count={results.votes.length}
            expanded={expandedType === "votes"}
          >
            {results.votes.length ? (
              results.votes.slice(0, expandedType === "votes" ? 30 : 2).map((vote) => (
                <Link key={vote.id} href={`/votes/${vote.id}`} className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/4 p-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ffb12b]/12 text-[#ffb12b]">
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
              <EmptyState label="No votes match this search." />
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

  (["q", "type", "status", "chamber", "party", "state", "focus", "expand"] as const).forEach((key) => {
    const value = nextParams[key];
    if (value) params.set(key, value);
  });

  const queryString = params.toString();
  return queryString ? `/search?${queryString}` : "/search";
}

function smartFilterHref(searchParams: SearchPageProps["searchParams"], key: SmartFilterKey, value?: string) {
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
  const currentValue = searchParams[group.key];

  return (
    <div>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/42">{group.label}</div>
      <div className="flex flex-wrap gap-2">
        {group.options.map((option) => (
          <FilterChip
            key={option.value ?? "all"}
            href={smartFilterHref(searchParams, group.key, option.value)}
            label={option.label}
            active={option.value ? currentValue === option.value : !currentValue}
          />
        ))}
      </div>
    </div>
  );
}

function FilterChip({ active, href, label }: { active?: boolean; href: string; label: string }) {
  return (
    <Link
      href={href}
      className={`flex h-9 items-center justify-center rounded-full border px-3 text-[12px] font-semibold ${
        active ? "border-[#ffb12b]/55 bg-[#ffb12b]/14 text-[#ffb12b]" : "border-white/10 bg-white/[0.035] text-white/58"
      }`}
    >
      {label}
    </Link>
  );
}

function ResultSection({
  children,
  collapseHref,
  count,
  expanded = false,
  href,
  title
}: {
  children: ReactNode;
  collapseHref: string;
  count: number;
  expanded?: boolean;
  href: string;
  title: string;
}) {
  return (
    <MobileCard className="px-5 py-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-medium leading-none">{title}</h2>
          <div className="mt-2 text-[13px] text-white/46">{count} records</div>
        </div>
        {expanded ? (
          <Link href={collapseHref} className={`${mobileViewAllClass} border-white/16 bg-white/[0.06] text-white/68`}>
            Showing all
          </Link>
        ) : (
          <Link href={href} className={mobileViewAllClass}>
            View All
          </Link>
        )}
      </div>
      <div
        className={`space-y-3 ${
          expanded && count > 2
            ? "max-h-[19rem] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : ""
        }`}
      >
        {children}
      </div>
      {expanded && count > 2 ? (
        <div className="mt-4 flex items-center justify-between text-[12px] font-medium text-white/42">
          <span>Scroll records</span>
          <span>{count} total</span>
        </div>
      ) : null}
    </MobileCard>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-2xl border border-dashed border-white/12 bg-white/4 p-5 text-[14px] text-white/52">{label}</div>;
}
