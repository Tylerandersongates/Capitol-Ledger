import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass } from "@/components/mobile-ui";
import { MobileGlassScrollFrame } from "@/components/mobile-glass-scroll-frame";
import { MemberEmailAction } from "@/components/member-email-action";
import { SaveTargetButton } from "@/components/saved-ledger-controls";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  ChevronRight,
  ExternalLink,
  FileText,
  Home,
  Landmark,
  Search,
  ShieldCheck,
  Settings,
  Vote as VoteIcon
} from "lucide-react";
import { getMemberDetailWithLiveData, type MemberCaucusMembership, type MemberVoteRecord } from "@/lib/data";
import { calculateMemberScore, type MemberScoreFactor, type MemberScoreModel } from "@/lib/member-scoring";
import { getCurrentSession } from "@/lib/auth";
import { getAccountPersistenceUserId, readLedgerFromDatabase } from "@/lib/account-database";
import { getAccountLedger } from "@/lib/account-ledger";
import { memberDisplayLocation, memberOfficeLabel, memberSeatTag } from "@/lib/member-display";
import { estimateTermsInOfficeFromCongressLabel, formatDate, positionTone } from "@/lib/utils";
import type { Bill, Member } from "@/types/capitol";
import type { ReactNode } from "react";

type MemberPageProps = {
  params: {
    bioguideId: string;
  };
  searchParams?: {
    tab?: string;
  };
};

type MemberTab = "overview" | "votes" | "bills" | "committees" | "finance";

const memberTabs: Array<{ ariaLabel?: string; label: string; value: MemberTab }> = [
  { label: "Overview", value: "overview" },
  { label: "Votes", value: "votes" },
  { label: "Bills", value: "bills" },
  { ariaLabel: "Committees and roles", label: "Roles", value: "committees" },
  { ariaLabel: "Sources and disclosures", label: "Sources", value: "finance" }
];

const premiumEyebrowClass = "text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48";
const premiumIconTileClass =
  "grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.16)]";
const premiumPanelClass =
  "rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.22)_0%,rgba(7,23,50,0.68)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(2,10,28,0.22)]";
const premiumPillClass =
  "rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[12px] font-semibold leading-none text-white/56";
const premiumCardTitleClass = "text-[22px] font-medium leading-tight text-white";
const premiumCardDescriptionClass = "mt-2 text-[13px] leading-snug text-white/50";
const premiumHeaderIconClass =
  "grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/18 bg-[#ffb12b]/8 text-[#ffb12b]";
const premiumHeaderGreenIconClass =
  "grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[#43ed74]/22 bg-[#43ed74]/10 text-[#43ed74]";

const stateNames: Record<string, string> = {
  AK: "Alaska",
  AL: "Alabama",
  AR: "Arkansas",
  AS: "American Samoa",
  AZ: "Arizona",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DC: "District of Columbia",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  GU: "Guam",
  HI: "Hawaii",
  IA: "Iowa",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  MA: "Massachusetts",
  MD: "Maryland",
  ME: "Maine",
  MI: "Michigan",
  MN: "Minnesota",
  MO: "Missouri",
  MP: "Northern Mariana Islands",
  MS: "Mississippi",
  MT: "Montana",
  NC: "North Carolina",
  ND: "North Dakota",
  NE: "Nebraska",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NV: "Nevada",
  NY: "New York",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  PR: "Puerto Rico",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  US: "United States",
  UT: "Utah",
  VA: "Virginia",
  VI: "U.S. Virgin Islands",
  VT: "Vermont",
  WA: "Washington",
  WI: "Wisconsin",
  WV: "West Virginia",
  WY: "Wyoming"
};

const chamberSeatTotals: Record<Member["chamber"], number> = {
  House: 435,
  Senate: 100
};

const defaultMajorityPartyByChamber: Record<Member["chamber"], "Democrat" | "Republican"> = {
  House: "Republican",
  Senate: "Republican"
};

type LeadershipCandidate = {
  firstName: string;
  lastName: string;
  party: "Democrat" | "Republican";
  state: string;
};

type PartyLeadershipCandidates = {
  Democrat: LeadershipCandidate[];
  Republican: LeadershipCandidate[];
};

type PartyLeadershipRoleDefinition = {
  candidates: PartyLeadershipCandidates;
  majorityLabel: string;
  majorityPriority: number;
  minorityLabel: string;
  minorityPriority: number;
};

type ChamberLeadershipRoleDefinition = {
  candidates: PartyLeadershipCandidates;
  label: string;
  priority: number;
};

type ResolvedLeadershipRole = {
  label: string;
  priority: number;
};

type ChamberRankSummary = {
  label: string;
  rank: number;
  seatTotal: number;
  trackedCount: number;
};

const partyLeadershipRolesByChamber: Record<Member["chamber"], PartyLeadershipRoleDefinition[]> = {
  House: [
    {
      candidates: {
        Democrat: [{ firstName: "Hakeem", lastName: "Jeffries", party: "Democrat", state: "NY" }],
        Republican: [{ firstName: "Steve", lastName: "Scalise", party: "Republican", state: "LA" }]
      },
      majorityLabel: "Majority Leader",
      majorityPriority: 2,
      minorityLabel: "Minority Leader",
      minorityPriority: 3
    },
    {
      candidates: {
        Democrat: [{ firstName: "Katherine", lastName: "Clark", party: "Democrat", state: "MA" }],
        Republican: [{ firstName: "Tom", lastName: "Emmer", party: "Republican", state: "MN" }]
      },
      majorityLabel: "Majority Whip",
      majorityPriority: 4,
      minorityLabel: "Minority Whip",
      minorityPriority: 5
    }
  ],
  Senate: [
    {
      candidates: {
        Democrat: [{ firstName: "Charles", lastName: "Schumer", party: "Democrat", state: "NY" }],
        Republican: [{ firstName: "John", lastName: "Thune", party: "Republican", state: "SD" }]
      },
      majorityLabel: "Majority Leader",
      majorityPriority: 1,
      minorityLabel: "Minority Leader",
      minorityPriority: 2
    },
    {
      candidates: {
        Democrat: [{ firstName: "Dick", lastName: "Durbin", party: "Democrat", state: "IL" }],
        Republican: [{ firstName: "John", lastName: "Barrasso", party: "Republican", state: "WY" }]
      },
      majorityLabel: "Majority Whip",
      majorityPriority: 4,
      minorityLabel: "Minority Whip",
      minorityPriority: 5
    }
  ]
};

const chamberLeadershipRolesByChamber: Record<Member["chamber"], ChamberLeadershipRoleDefinition[]> = {
  House: [
    {
      candidates: {
        Democrat: [{ firstName: "Hakeem", lastName: "Jeffries", party: "Democrat", state: "NY" }],
        Republican: [{ firstName: "Mike", lastName: "Johnson", party: "Republican", state: "LA" }]
      },
      label: "Speaker",
      priority: 1
    }
  ],
  Senate: [
    {
      candidates: {
        Democrat: [{ firstName: "Patty", lastName: "Murray", party: "Democrat", state: "WA" }],
        Republican: [{ firstName: "Charles", lastName: "Grassley", party: "Republican", state: "IA" }]
      },
      label: "President pro tempore",
      priority: 3
    }
  ]
};

const fallbackLeadershipRegexByChamber: Record<Member["chamber"], Array<{ label: string; priority: number; pattern: RegExp }>> = {
  House: [
    { label: "Speaker", pattern: /\bspeaker\b/i, priority: 1 },
    { label: "Majority Leader", pattern: /\bmajority leader\b/i, priority: 2 },
    { label: "Minority Leader", pattern: /\bminority leader\b/i, priority: 3 },
    { label: "Majority Whip", pattern: /\bmajority whip\b/i, priority: 4 },
    { label: "Minority Whip", pattern: /\bminority whip\b/i, priority: 5 }
  ],
  Senate: [
    { label: "Majority Leader", pattern: /\bmajority leader\b/i, priority: 1 },
    { label: "Minority Leader", pattern: /\bminority leader\b/i, priority: 2 },
    { label: "President pro tempore", pattern: /\bpresident pro tempore\b/i, priority: 3 },
    { label: "Majority Whip", pattern: /\bmajority whip\b/i, priority: 4 },
    { label: "Minority Whip", pattern: /\bminority whip\b/i, priority: 5 }
  ]
};

export const dynamic = "force-dynamic";

function normalizeNameToken(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function memberMatchesLeadershipCandidate(member: Member, candidate: LeadershipCandidate) {
  if (member.state.toUpperCase() !== candidate.state.toUpperCase()) return false;
  if (member.party !== candidate.party) return false;
  if (normalizeNameToken(member.lastName) !== normalizeNameToken(candidate.lastName)) return false;
  return normalizeNameToken(member.firstName) === normalizeNameToken(candidate.firstName);
}

function resolveMajorityParty(chamber: Member["chamber"], chamberMembers: Member[]) {
  const partyCounts = chamberMembers.reduce(
    (totals, chamberMember) => {
      if (chamberMember.party === "Democrat") totals.Democrat += 1;
      if (chamberMember.party === "Republican") totals.Republican += 1;
      return totals;
    },
    { Democrat: 0, Republican: 0 }
  );

  if (partyCounts.Democrat === partyCounts.Republican) {
    return defaultMajorityPartyByChamber[chamber];
  }

  return partyCounts.Democrat > partyCounts.Republican ? "Democrat" : "Republican";
}

function resolveLeadershipRole(member: Member, chamberMembers: Member[]): ResolvedLeadershipRole | undefined {
  const chamber = member.chamber;
  const majorityParty = resolveMajorityParty(chamber, chamberMembers);
  const minorityParty = majorityParty === "Democrat" ? "Republican" : "Democrat";
  const resolvedRoles: ResolvedLeadershipRole[] = [];

  for (const role of chamberLeadershipRolesByChamber[chamber]) {
    if (role.candidates.Democrat.some((candidate) => memberMatchesLeadershipCandidate(member, candidate))) {
      resolvedRoles.push({ label: role.label, priority: role.priority });
    }
    if (role.candidates.Republican.some((candidate) => memberMatchesLeadershipCandidate(member, candidate))) {
      resolvedRoles.push({ label: role.label, priority: role.priority });
    }
  }

  for (const role of partyLeadershipRolesByChamber[chamber]) {
    if (role.candidates[majorityParty].some((candidate) => memberMatchesLeadershipCandidate(member, candidate))) {
      resolvedRoles.push({ label: role.majorityLabel, priority: role.majorityPriority });
    }
    if (role.candidates[minorityParty].some((candidate) => memberMatchesLeadershipCandidate(member, candidate))) {
      resolvedRoles.push({ label: role.minorityLabel, priority: role.minorityPriority });
    }
  }

  if (!resolvedRoles.length) {
    const searchableText = `${member.fullName} ${member.description}`;
    for (const fallbackRole of fallbackLeadershipRegexByChamber[chamber]) {
      if (fallbackRole.pattern.test(searchableText)) {
        resolvedRoles.push({ label: fallbackRole.label, priority: fallbackRole.priority });
      }
    }
  }

  if (!resolvedRoles.length) return undefined;

  return [...resolvedRoles].sort((a, b) => a.priority - b.priority)[0];
}

function termsInOfficeForRanking(member: Member) {
  return member.termsInOffice ?? estimateTermsInOfficeFromCongressLabel(member.term, member.chamber) ?? 0;
}

function firstElectedSortKey(member: Member) {
  if (!member.firstElectedDate) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(member.firstElectedDate);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function calculateChamberRank(member: Member, chamberMembers: Member[]): ChamberRankSummary {
  const seatTotal = chamberSeatTotals[member.chamber];
  const leadershipByBioguideId = new Map(
    chamberMembers.map((chamberMember) => [chamberMember.bioguideId, resolveLeadershipRole(chamberMember, chamberMembers)])
  );

  const ranked = [...chamberMembers].sort((a, b) => {
    const leadershipA = leadershipByBioguideId.get(a.bioguideId);
    const leadershipB = leadershipByBioguideId.get(b.bioguideId);
    const leadershipPriorityA = leadershipA?.priority ?? Number.POSITIVE_INFINITY;
    const leadershipPriorityB = leadershipB?.priority ?? Number.POSITIVE_INFINITY;

    if (leadershipPriorityA !== leadershipPriorityB) return leadershipPriorityA - leadershipPriorityB;

    const termsA = termsInOfficeForRanking(a);
    const termsB = termsInOfficeForRanking(b);
    if (termsA !== termsB) return termsB - termsA;

    const firstElectedA = firstElectedSortKey(a);
    const firstElectedB = firstElectedSortKey(b);
    if (firstElectedA !== firstElectedB) return firstElectedA - firstElectedB;

    const lastNameSort = a.lastName.localeCompare(b.lastName);
    if (lastNameSort !== 0) return lastNameSort;

    const firstNameSort = a.firstName.localeCompare(b.firstName);
    if (firstNameSort !== 0) return firstNameSort;

    return a.bioguideId.localeCompare(b.bioguideId);
  });

  const rank = Math.max(1, ranked.findIndex((candidate) => candidate.bioguideId === member.bioguideId) + 1);
  const leadershipRole = leadershipByBioguideId.get(member.bioguideId);

  return {
    label: leadershipRole?.label ?? "Tenure Rank",
    rank,
    seatTotal,
    trackedCount: chamberMembers.length
  };
}

function normalizeTab(tab?: string): MemberTab {
  return tab === "votes" || tab === "bills" || tab === "committees" || tab === "finance" ? tab : "overview";
}

function sanitizeNameSegment(value: string) {
  return value
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\b(?:Sen|Rep)\.\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMemberDisplayName(member: Member) {
  const full = sanitizeNameSegment(member.fullName);
  if (full) return full;

  const first = sanitizeNameSegment(member.firstName?.trim() ?? "");
  const last = sanitizeNameSegment(member.lastName?.trim() ?? "");
  const canonical = `${first} ${last}`.replace(/\s+/g, " ").trim();
  if (canonical) return canonical;

  return "Unknown Member";
}

function memberDisplayNameClass(displayName: string) {
  const length = displayName.length;
  if (length >= 34) return "text-[21px] leading-[1.1]";
  if (length >= 26) return "text-[23px] leading-[1.1]";
  if (length >= 20) return "text-[25px] leading-[1.12]";
  return "text-[30px] leading-tight";
}

function tabHref(bioguideId: string, tab: MemberTab) {
  return tab === "overview" ? `/members/${bioguideId}` : `/members/${bioguideId}?tab=${tab}`;
}

async function getViewerScoreContext() {
  const session = await getCurrentSession();
  if (!session) return { viewerIssueInterests: [] as string[] };

  const user = session.user;
  const accountUserId = await getAccountPersistenceUserId(user).catch(() => user.id);
  const databaseLedger = await readLedgerFromDatabase(accountUserId).catch(() => null);
  const fallbackLedger = getAccountLedger(accountUserId);

  return {
    viewerIssueInterests: (databaseLedger ?? fallbackLedger).issueInterests
  };
}

export default async function MemberPage({ params, searchParams }: MemberPageProps) {
  const canonicalBioguideId = params.bioguideId === "FCA030" ? "F000483" : params.bioguideId;
  const detail = await getMemberDetailWithLiveData(canonicalBioguideId);
  if (!detail) notFound();

  const { caucusMemberships, chamberMembers, cosponsoredBills, member, memberVotes, sponsoredBills } = detail;
  const activeTab = normalizeTab(searchParams?.tab);
  const chamberRank = calculateChamberRank(member, chamberMembers);
  const viewerScoreContext = await getViewerScoreContext();
  const scoreModel = calculateMemberScore({
    caucusMemberships,
    context: viewerScoreContext,
    cosponsoredBills,
    member,
    memberVotes,
    sponsoredBills
  });
  const role = memberOfficeLabel(member);
  const displayName = cleanMemberDisplayName(member);
  const displayNameClass = memberDisplayNameClass(displayName);
  const state = stateNames[member.state] ?? member.state;
  const districtLabel = memberDisplayLocation(member, state);
  const seatTag = memberSeatTag(member);
  const nextElectionDate = member.nextElectionDate;
  const nextElection = nextElectionDate ? formatDate(nextElectionDate) : "Not listed";
  const firstElectedDate = member.firstElectedDate;
  const firstElected = firstElectedDate ? formatDate(firstElectedDate) : "Not listed";
  const officialWebsiteUrl = member.officialUrl ?? member.sourceUrl;
  const termsInOffice = member.termsInOffice;
  const termsInOfficeLabel = termsInOffice ? `${termsInOffice} ${termsInOffice === 1 ? "term" : "terms"}` : "Not listed";
  const seniority = member.term;

  return (
    <MobileShell
      ambientClassName="bg-[radial-gradient(circle_at_18%_8%,rgba(43,122,203,0.13),transparent_32%),radial-gradient(circle_at_84%_8%,rgba(255,177,43,0.08),transparent_28%),linear-gradient(180deg,rgba(2,10,24,0.16)_0%,rgba(2,9,23,0.58)_54%,rgba(1,6,18,0.82)_100%)]"
      backgroundClassName="bg-[linear-gradient(180deg,#071a34_0%,#041229_30%,#020b1d_68%,#010817_100%)]"
      minHeight="min-h-[1080px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
            <header className="mt-8 flex items-center justify-between">
              <Link href="/dashboard" className={mobileIconButtonClass} aria-label="Back to dashboard">
                <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
              </Link>
              <div className="flex items-center gap-4">
                <SaveTargetButton
                  targetType="member"
                  targetId={member.bioguideId}
                  label="Save profile"
                  className={mobileIconButtonClass}
                  iconClassName="h-7 w-7"
                />
              </div>
            </header>

            <section className="mt-7 grid grid-cols-[128px_minmax(0,1fr)] items-center gap-5">
              <div className="relative h-32 w-32 self-center">
                <div className="absolute -inset-2 rounded-[1.8rem] border border-[#ffb12b]/24 bg-[#ffb12b]/8 shadow-[0_0_36px_rgba(255,177,43,0.15)]" />
                <Image
                  src={member.photoUrl ?? "/capitol-ledger-logo.png"}
                  alt=""
                  width={128}
                  height={128}
                  priority
                  className="relative h-32 w-32 rounded-[1.45rem] border border-white/18 object-cover shadow-[0_16px_32px_rgba(1,8,24,0.34)]"
                />
              </div>
              <div className="min-w-0">
                <div className="text-[17px] font-medium text-[#ffb12b]">U.S. {role}</div>
                <h1 className={`mt-2 max-w-full break-normal font-medium text-white ${displayNameClass}`}>{displayName}</h1>
                <p className="mt-2 text-white/68">
                  <span className="block max-w-full text-[16px] leading-snug">{districtLabel} {seatTag}</span>
                </p>
                <div id="contact" className="mt-3 grid grid-cols-2 gap-2 scroll-mt-8">
                  <span className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-blue-300/20 bg-civic/35 px-3 py-2 text-center text-[14px] font-semibold text-blue-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    {member.party}
                  </span>
                  <MemberEmailAction bioguideId={member.bioguideId} chamber={member.chamber} className="w-full" memberName={displayName} />
                  <a
                    href={officialWebsiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="col-span-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#ffb12b]/28 bg-[#ffb12b]/10 px-4 py-2 text-[14px] font-semibold text-[#ffcf54] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_22px_rgba(1,8,24,0.2)] transition hover:bg-[#ffb12b]/15"
                  >
                    <span>Website</span>
                    <ExternalLink className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </section>

            <MobileCard variant="dashboard" className="mt-8 overflow-hidden px-5 py-5">
              <div className="grid grid-cols-2 gap-3">
                <ProfileStat label="Represents" value={state} />
                <ProfileStat label="Tenure" value={termsInOfficeLabel} subvalue={seniority} />
                <ElectionProfileStat firstElected={firstElected} nextElection={nextElection} />
              </div>
            </MobileCard>

            <nav className="mt-7 grid grid-cols-5 rounded-[1.25rem] border border-white/12 bg-[linear-gradient(180deg,rgba(26,73,127,0.22)_0%,rgba(6,25,55,0.74)_100%)] p-1 text-center text-[13px] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_28px_rgba(1,8,24,0.32)]">
              {memberTabs.map((tab) => {
                const active = activeTab === tab.value;
                return (
                  <Link
                    key={tab.value}
                    aria-label={tab.ariaLabel}
                    href={tabHref(member.bioguideId, tab.value)}
                    className={`min-w-0 rounded-[1rem] px-1 py-3 transition ${active ? "bg-white/8 font-semibold text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-white/58 hover:bg-white/[0.035] hover:text-white/78"}`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>

            <main className="mt-7 space-y-5 pb-8">
              {activeTab === "overview" ? (
                <OverviewTab
                  chamberRank={chamberRank}
                  member={member}
                  scoreModel={scoreModel}
                />
              ) : null}

              {activeTab === "votes" ? <VotesTab member={member} memberVotes={memberVotes} /> : null}
              {activeTab === "bills" ? <BillsTab cosponsoredBills={cosponsoredBills} sponsoredBills={sponsoredBills} /> : null}
              {activeTab === "committees" ? <CommitteesTab member={member} caucusMemberships={caucusMemberships} /> : null}
              {activeTab === "finance" ? <FinanceTab member={member} /> : null}
            </main>

            <MobileBottomNav
              indicatorClassName="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white/70"
              items={[
                { active: true, href: "/dashboard", icon: <Home />, label: "Home" },
                { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
                { highlighted: true, href: "/search?type=members", icon: <Search />, label: "Search" },
                { href: "/alerts", icon: <Bell />, label: "Alerts" },
                { href: "/settings", icon: <Settings />, label: "Settings" }
              ]}
            />
    </MobileShell>
  );
}

function ProfileStat({
  label,
  value,
  subvalue
}: {
  label: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <div className={`${premiumPanelClass} px-4 py-4`}>
      <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46">{label}</div>
      <div className="mt-2 text-[17px] font-semibold leading-tight text-white">{value}</div>
      {subvalue ? <div className="mt-1 text-[15px] font-medium leading-snug text-white/64">{subvalue}</div> : null}
    </div>
  );
}

function ElectionProfileStat({ firstElected, nextElection }: { firstElected: string; nextElection: string }) {
  return (
    <div className={`col-span-2 ${premiumPanelClass} px-4 py-4`}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46">First elected</div>
          <div className="mt-2 text-[17px] font-semibold leading-tight text-white">{firstElected}</div>
        </div>
        <div className="border-l border-white/10 pl-4">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46">Next election</div>
          <div className="mt-2 text-[17px] font-semibold leading-tight text-white">{nextElection}</div>
        </div>
      </div>
    </div>
  );
}

function PremiumCardHeader({
  aside,
  description,
  eyebrow,
  icon,
  iconTone = "gold",
  title,
  titleAccessory
}: {
  aside?: ReactNode;
  description?: ReactNode;
  eyebrow: string;
  icon?: ReactNode;
  iconTone?: "gold" | "green";
  title: ReactNode;
  titleAccessory?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
      <div className="min-w-0">
        <div className={premiumEyebrowClass}>{eyebrow}</div>
        <div className="mt-2 flex min-w-0 items-center gap-2.5">
          <h2 className={premiumCardTitleClass}>{title}</h2>
          {titleAccessory ? <div className="shrink-0">{titleAccessory}</div> : null}
        </div>
        {description ? <p className={premiumCardDescriptionClass}>{description}</p> : null}
      </div>
      {aside ? (
        <div className="shrink-0">{aside}</div>
      ) : icon ? (
        <span className={iconTone === "green" ? premiumHeaderGreenIconClass : premiumHeaderIconClass}>{icon}</span>
      ) : null}
    </div>
  );
}

function OverviewTab({
  chamberRank,
  member,
  scoreModel
}: {
  chamberRank: ChamberRankSummary;
  member: Member;
  scoreModel: MemberScoreModel;
}) {
  const sortedIssueTopics = [...scoreModel.constituentAlignment.topics].sort((a, b) => b.signalCount - a.signalCount);
  const localOfficialLabel = member.chamber === "Senate" ? "Senator" : "Representative";
  const chamberProfileLabel = member.chamber === "Senate" ? "Senate profiles" : "House profiles";
  const scoreAvailable = scoreModel.overallScore !== null;

  return (
    <>
      <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
        <PremiumCardHeader
          description={`Verified public records about this ${localOfficialLabel}, with missing evidence kept visible.`}
          eyebrow="Public record"
          icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />}
          iconTone="green"
          title="Accountability snapshot"
          titleAccessory={<AccountabilityInfoPopover />}
        />

        <div className={`mt-5 ${premiumPanelClass} px-4 py-4`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/44">Overall accountability score</div>
              {scoreAvailable ? (
                <div className="mt-2 text-[42px] font-semibold leading-none text-[#ffb12b]">{scoreModel.overallScore}%</div>
              ) : (
                <div className="mt-2 text-[25px] font-medium leading-tight text-white">Not scored yet</div>
              )}
            </div>
            <span className="shrink-0 rounded-full border border-[#ffb12b]/28 bg-[#ffb12b]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#ffcf54]">
              {scoreModel.status}
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-white/54">
            {scoreAvailable ? scoreModel.summary : scoreModel.scoreEligibilityDetail}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <OverviewMetricTile
            label="Verified data"
            value={`${scoreModel.coveredFactorCount} / ${scoreModel.totalFactorCount}`}
            detail="categories"
          />
          <OverviewMetricTile
            label="Records"
            value={`${scoreModel.evidenceRecordCount}`}
            detail="linked evidence"
          />
          <OverviewMetricTile
            label="Cohort"
            value={`${chamberRank.trackedCount}`}
            detail={chamberProfileLabel}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] leading-snug text-white/40">
          <span>{scoreModel.methodologyLabel}</span>
          <span>Missing data never receives points</span>
        </div>
      </MobileCard>

      <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
        <PremiumCardHeader
          description={`What verified evidence is currently available for this ${localOfficialLabel}.`}
          eyebrow="Evidence ledger"
          icon={<FileText className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />}
          title="Verified public record"
          titleAccessory={<ScoreDetailsPopover factors={scoreModel.factors} />}
        />
        <div className="mt-5 space-y-3">
          {scoreModel.factors.map((factor) => (
            <OverviewSignalRow key={factor.key} factor={factor} />
          ))}
        </div>

        <div className={`mt-5 ${premiumPanelClass} px-4 py-4`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[16px] font-medium text-white">Your issue evidence</h3>
              <p className="mt-1 text-[12px] leading-snug text-white/46">
                Saved interests surface relevant records without guessing your policy position.
              </p>
            </div>
            <IssueEvidenceInfoPopover />
          </div>
          {sortedIssueTopics.length ? (
            <MobileGlassScrollFrame
              ariaLabel="Issue evidence by saved topic"
              className="grid gap-2"
              frameClassName="mt-3"
              heightClassName="max-h-[176px]"
            >
              {sortedIssueTopics.map((topic) => (
                <OverviewTopicChip key={topic.topic} topic={topic} />
              ))}
            </MobileGlassScrollFrame>
          ) : (
            <div className="mt-3 rounded-xl border border-white/10 bg-[#071a38]/62 px-3.5 py-3 text-[12px] leading-relaxed text-white/52">
              Choose issue interests in <Link href="/settings" className="font-semibold text-[#ffcf54] underline decoration-[#ffb12b]/40 underline-offset-2">Settings</Link> to surface matching public records.
            </div>
          )}
        </div>
      </MobileCard>
    </>
  );
}

type AlignmentTopic = MemberScoreModel["constituentAlignment"]["topics"][number];

function plainStatusLabel(status: MemberScoreFactor["status"]) {
  if (status === "verified") return "Verified records";
  if (status === "limited") return "Limited evidence";
  return "Evidence unavailable";
}

function OverviewMetricTile({
  detail,
  label,
  tone = "gold",
  value
}: {
  detail: string;
  label: string;
  tone?: "gold" | "green";
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-[#071a38]/62 px-3 py-3">
      <div className="truncate text-[10px] font-semibold uppercase tracking-[0.05em] text-white/42">{label}</div>
      <div className={`mt-2 text-[18px] font-semibold leading-none ${tone === "green" ? "text-[#65ec68]" : "text-[#ffb12b]"}`}>{value}</div>
      <div className="mt-1 truncate text-[11px] leading-none text-white/42">{detail}</div>
    </div>
  );
}

function OverviewSignalRow({ factor }: { factor: MemberScoreFactor }) {
  const displayValue = factor.value === null ? "—" : `${factor.value}%`;

  return (
    <div className={`${premiumPanelClass} px-4 py-3.5`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[16px] font-medium text-white">{factor.label}</div>
          <div className="mt-1 text-[12px] leading-none text-white/42">
            {plainStatusLabel(factor.status)} · {factor.evidenceCount} record{factor.evidenceCount === 1 ? "" : "s"}
          </div>
        </div>
        <div className={`shrink-0 text-[18px] font-semibold ${factor.value === null ? "text-white/34" : "text-[#ffb12b]"}`}>{displayValue}</div>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-white/48">{factor.detail}</p>
      {factor.value !== null ? (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,#a96a09_0%,#ffb12b_68%,#ffcf54_100%)]" style={{ width: `${factor.value}%` }} />
        </div>
      ) : null}
    </div>
  );
}

function OverviewTopicChip({ topic }: { topic: AlignmentTopic }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/10 bg-[#071a38]/62 px-3.5 py-3">
      <div className="min-w-0">
        <div className="truncate text-[15px] font-medium text-white">{topic.topic}</div>
        <div className="mt-1 text-[11px] leading-none text-white/42">{topic.signalCount} matched public record{topic.signalCount === 1 ? "" : "s"}</div>
      </div>
      <div className={`text-right text-[12px] font-semibold ${topic.signalCount ? "text-[#ffcf54]" : "text-white/34"}`}>
        {topic.signalCount ? "Evidence found" : "No score"}
      </div>
    </div>
  );
}

function MemberInfoPopover({
  align = "left",
  ariaLabel,
  children,
  title
}: {
  align?: "center" | "left" | "right";
  ariaLabel: string;
  children: ReactNode;
  title: string;
}) {
  const alignClass = align === "center" ? "left-1/2 -translate-x-1/2" : align === "right" ? "right-0" : "left-0";

  return (
    <details className="group relative">
      <summary
        className="grid h-5 w-5 cursor-pointer list-none place-items-center rounded-full border border-white/55 text-xs text-white/70 transition hover:border-[#ffb12b]/75 hover:text-[#ffcf54] [&::-webkit-details-marker]:hidden"
        aria-label={ariaLabel}
      >
        i
      </summary>
      <div className={`pointer-events-none absolute ${alignClass} top-7 z-30 w-[282px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/18 bg-[#071c38] p-3 text-[12px] leading-snug text-white/82 opacity-0 shadow-[0_18px_36px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] transition group-open:pointer-events-auto group-open:opacity-100`}>
        <div className="font-medium text-[#ffb12b]">{title}</div>
        <div className="mt-1 space-y-2">{children}</div>
      </div>
    </details>
  );
}

function AccountabilityInfoPopover() {
  return (
    <MemberInfoPopover align="right" ariaLabel="What the accountability score means" title="What this score means">
      <p>A score appears only when at least three categories have enough verified, scorable evidence.</p>
      <p>Missing or planned records never receive points. Personal issue interests are reported separately.</p>
    </MemberInfoPopover>
  );
}

function ScoreDetailsPopover({ factors }: { factors: MemberScoreFactor[] }) {
  return (
    <MemberInfoPopover align="center" ariaLabel="How evidence coverage is calculated" title="Evidence categories">
      <div className="space-y-1.5">
        {factors.map((factor) => (
          <div key={`${factor.key}-popover`} className="flex items-center justify-between gap-3">
            <span>{factor.label}</span>
            <span className="font-semibold text-[#ffcf54]">{factor.weight}%</span>
          </div>
        ))}
      </div>
      <p>Weights describe the model coverage required for a future score; unavailable categories are excluded and shown explicitly.</p>
    </MemberInfoPopover>
  );
}

function IssueEvidenceInfoPopover() {
  return (
    <MemberInfoPopover align="right" ariaLabel="How issue evidence is selected" title="Issue evidence">
      <p>Saved interests are grouped into broad topics and used to find matching votes, bills, and official roles.</p>
      <p>An interest does not reveal your policy position, so the app does not infer a match percentage.</p>
    </MemberInfoPopover>
  );
}

function VotesTab({ member, memberVotes }: { member: Member; memberVotes: MemberVoteRecord[] }) {
  const linkedRecords = memberVotes.filter((record): record is MemberVoteRecord & { vote: NonNullable<MemberVoteRecord["vote"]> } => Boolean(record.vote));
  const records = linkedRecords.slice(0, 12);
  const countLabel = linkedRecords.length > records.length ? `${records.length} of ${linkedRecords.length}` : `${records.length} shown`;

  if (!records.length) {
    return (
      <EmptyTab
        icon={<VoteIcon className="h-6 w-6" strokeWidth={1.8} />}
        title="No recorded positions yet"
        body={
          member.chamber === "Senate"
            ? "Recent Senate roll-call positions are not available for this profile yet. Bills and roles may still have records to review."
            : "Recent House roll-call positions are not available for this profile yet. Bills and roles may still have records to review."
        }
      />
    );
  }

  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <PremiumCardHeader
        aside={<span className={premiumPillClass}>{countLabel}</span>}
        eyebrow="Recent roll calls"
        title="Vote record"
      />
      <MobileGlassScrollFrame heightClassName="max-h-[430px]" className="space-y-3" ariaLabel="Member vote activity">
        {records.map((record) => {
          const vote = record.vote;
          if (!vote) return null;
          const isExternalVoteRecord = vote.id.startsWith("senate-live-") || vote.id.startsWith("house-live-");
          const rowContent = (
            <>
              <div className="min-w-0">
                <div className="break-words text-[18px] font-medium leading-tight text-white">{vote.question}</div>
                <div className="mt-2 text-[14px] text-white/50">
                  {vote.chamber} roll call {vote.rollCall} · {formatDate(vote.voteDate)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${positionTone(record.position)}`}>{record.position}</span>
                {isExternalVoteRecord ? (
                  <ExternalLink className="h-4 w-4 text-white/38" strokeWidth={1.8} aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-white/38" strokeWidth={1.8} aria-hidden="true" />
                )}
              </div>
            </>
          );

          if (isExternalVoteRecord) {
            return (
              <a
                key={`${record.voteId}-${record.position}`}
                href={vote.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className={`grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-4 py-4 transition hover:brightness-110 ${premiumPanelClass}`}
              >
                {rowContent}
              </a>
            );
          }

          return (
            <Link key={`${record.voteId}-${record.position}`} href={`/votes/${vote.id}`} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-4 py-4 transition hover:brightness-110 ${premiumPanelClass}`}>
              {rowContent}
            </Link>
          );
        })}
      </MobileGlassScrollFrame>
    </MobileCard>
  );
}

function BillsTab({ cosponsoredBills, sponsoredBills }: { cosponsoredBills: Bill[]; sponsoredBills: Bill[] }) {
  const sponsoredRecords = sponsoredBills.map((bill) => ({ bill, label: "Sponsored" }));
  const cosponsoredRecords = cosponsoredBills.map((bill) => ({ bill, label: "Cosponsored" }));
  const records = [...sponsoredRecords, ...cosponsoredRecords];
  const balancedRecords = [...sponsoredRecords.slice(0, 6), ...cosponsoredRecords.slice(0, 6)];
  const balancedKeys = new Set(balancedRecords.map(({ bill, label }) => `${label}-${bill.id}`));
  const visibleRecords = [...balancedRecords, ...records.filter(({ bill, label }) => !balancedKeys.has(`${label}-${bill.id}`))].slice(0, 12);

  if (!records.length) {
    return <EmptyTab icon={<FileText className="h-6 w-6" strokeWidth={1.8} />} title="No bill activity yet" body="Sponsored and cosponsored bills will appear here when legislative records are available for this official." />;
  }

  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <PremiumCardHeader
        aside={<span className={premiumPillClass}>{visibleRecords.length} shown</span>}
        eyebrow="Legislative activity"
        title="Bill activity"
      />
      <MobileGlassScrollFrame heightClassName="max-h-[430px]" className="space-y-3" ariaLabel="Member bill activity">
        {visibleRecords.map(({ bill, label }) => (
          <BillActivityRow key={`${label}-${bill.id}`} bill={bill} label={label} />
        ))}
      </MobileGlassScrollFrame>
    </MobileCard>
  );
}

function BillActivityRow({ bill, label }: { bill: Bill; label: string }) {
  return (
    <Link href={`/bills/${bill.id}`} className={`grid grid-cols-[1fr_auto] gap-4 px-4 py-4 transition hover:brightness-110 ${premiumPanelClass}`}>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#ffb12b]">{label}</div>
        <div className="mt-1 text-[18px] font-medium leading-tight text-white">{bill.displayNumber}</div>
        <div className="mt-1 text-[15px] leading-snug text-white/58">{bill.shortTitle || bill.title}</div>
        {bill.committeeName ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] leading-snug text-white/56">
            <span className="rounded-full border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#ffb12b]">Committee</span>
            <span>{bill.committeeName}</span>
          </div>
        ) : null}
      </div>
      <ChevronRight className="mt-7 h-5 w-5 text-white/38" strokeWidth={1.8} aria-hidden="true" />
    </Link>
  );
}

function CommitteesTab({
  caucusMemberships,
  member
}: {
  caucusMemberships: MemberCaucusMembership[];
  member: Member;
}) {
  if (!caucusMemberships.length) {
    const officialProfileUrl = member.officialUrl ?? member.sourceUrl;

    return (
      <EmptyTab
        icon={<Landmark className="h-6 w-6" strokeWidth={1.8} />}
        title="No source-linked roles yet"
        body={`Committee and caucus assignments are pending source review for this ${member.chamber.toLowerCase()} official.`}
        action={
          <a
            href={officialProfileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#ffb12b]/25 bg-[#ffb12b]/10 px-4 py-2 text-[13px] font-semibold text-[#ffcf54] transition hover:bg-[#ffb12b]/15"
          >
            <span>Official profile</span>
            <ExternalLink className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </a>
        }
      />
    );
  }

  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <PremiumCardHeader
        aside={<span className={premiumPillClass}>{caucusMemberships.length} listed</span>}
        eyebrow="Current roles"
        title="Roles and assignments"
      />
      <MobileGlassScrollFrame heightClassName="max-h-[430px]" className="space-y-3">
        {caucusMemberships.map((membership) => (
          <a
            key={`${membership.caucusName}-${membership.role}`}
            href={membership.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className={`grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-4 py-4 transition hover:brightness-110 ${premiumPanelClass}`}
          >
            <div className="min-w-0">
              <div className="break-words text-[17px] font-medium leading-tight text-white">{membership.caucusName}</div>
              <div className="mt-1 break-words text-[14px] text-white/50">{membership.sourceLabel}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full border border-[#ffb12b]/25 bg-[#ffb12b]/10 px-3 py-1.5 text-[13px] font-medium text-[#ffb12b]">
                {membership.role}
              </span>
              <ExternalLink className="h-4 w-4 text-white/34" strokeWidth={1.8} aria-hidden="true" />
            </div>
          </a>
        ))}
      </MobileGlassScrollFrame>
    </MobileCard>
  );
}

function FinanceTab({ member }: { member: Member }) {
  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <PremiumCardHeader
        description="Official profile links and disclosure sources for deeper checking."
        eyebrow="Official sources"
        icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />}
        iconTone="green"
        title="Sources"
      />
      <div className="mt-5 space-y-4">
        <FinanceRow
          icon={<BriefcaseBusiness className="h-5 w-5" strokeWidth={1.8} />}
          label="Financial disclosure"
          value="Not available yet"
        />
        <FinanceRow
          icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.8} />}
          label="Ethics records"
          value="Not available yet"
        />
        <a
          href={member.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className={`mt-2 flex items-center justify-between px-4 py-4 text-[15px] font-semibold text-[#ffb12b] transition hover:brightness-110 ${premiumPanelClass}`}
        >
          Open official profile
          <ExternalLink className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </a>
      </div>
    </MobileCard>
  );
}

function FinanceRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className={`grid grid-cols-[44px_1fr] gap-4 px-4 py-4 ${premiumPanelClass}`}>
      <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b]">{icon}</div>
      <div>
        <div className="text-[17px] font-medium text-white">{label}</div>
        <div className="mt-1 text-[14px] text-white/54">{value}</div>
      </div>
    </div>
  );
}

function EmptyTab({ action, body, icon, title }: { action?: ReactNode; body: string; icon: ReactNode; title: string }) {
  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-6">
      <div className="grid grid-cols-[48px_1fr] gap-4">
        <div className={premiumIconTileClass}>{icon}</div>
        <div>
          <h2 className="text-[22px] font-medium leading-tight text-white">{title}</h2>
          <p className="mt-3 text-[16px] leading-snug text-white/58">{body}</p>
          {action}
        </div>
      </div>
    </MobileCard>
  );
}
