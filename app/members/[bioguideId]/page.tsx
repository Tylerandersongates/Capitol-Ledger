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
import { calculateMemberScore, type MemberScoreModel } from "@/lib/member-scoring";
import { getCurrentSession } from "@/lib/auth";
import { getAccountPersistenceUserId, readLedgerFromDatabase } from "@/lib/account-database";
import { getAccountLedger } from "@/lib/account-ledger";
import { estimateTermsInOfficeFromCongressLabel, federalElectionDateIso, formatDate, positionTone } from "@/lib/utils";
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

const memberTabs: Array<{ label: string; value: MemberTab }> = [
  { label: "Overview", value: "overview" },
  { label: "Votes", value: "votes" },
  { label: "Bills", value: "bills" },
  { label: "Committees", value: "committees" },
  { label: "Finance", value: "finance" }
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

const alignmentTopicMetricWeights = [
  { key: "pollAverage", label: "Poll", weight: 40 },
  { key: "voteAlignment", label: "Vote", weight: 35 },
  { key: "publicPositioning", label: "Signals", weight: 15 },
  { key: "timeInOffice", label: "Tenure", weight: 10 }
] as const;

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

type AccountabilityTrendPoint = {
  label: string;
  value: number;
};

type AccountabilityTrendModel = {
  baseline: number;
  current: number;
  delta: number;
  driverDelta: number;
  driverLabel: string;
  points: AccountabilityTrendPoint[];
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
  const first = sanitizeNameSegment(member.firstName?.trim() ?? "");
  const last = sanitizeNameSegment(member.lastName?.trim() ?? "");
  const canonical = `${first} ${last}`.replace(/\s+/g, " ").trim();
  if (canonical) return canonical;

  return sanitizeNameSegment(member.fullName);
}

function memberDisplayNameClass(displayName: string) {
  const length = displayName.length;
  if (length >= 34) return "text-[21px] leading-[1.1]";
  if (length >= 26) return "text-[23px] leading-[1.1]";
  if (length >= 20) return "text-[25px] leading-[1.12]";
  return "text-[30px] leading-tight";
}

function isAtLargeDistrict(district?: string) {
  const normalized = district?.trim().toLowerCase();
  return normalized === "0" || normalized === "00" || normalized === "al" || normalized === "at-large" || normalized === "at large" || normalized === "atlarge";
}

function memberDistrictLabel(state: string, district?: string) {
  if (!district) return state;
  return isAtLargeDistrict(district) ? `${state} At-Large` : `${state} District ${district}`;
}

function memberSeatTag(member: Member) {
  const partyCode = member.party.trim().charAt(0).toUpperCase() || "U";
  const districtCode = member.district ? `-${isAtLargeDistrict(member.district) ? "AL" : member.district}` : "";
  return `[${partyCode}-${member.state}${districtCode}]`;
}

function tabHref(bioguideId: string, tab: MemberTab) {
  return tab === "overview" ? `/members/${bioguideId}` : `/members/${bioguideId}?tab=${tab}`;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function alignmentComponentValue(scoreModel: MemberScoreModel, label: MemberScoreModel["constituentAlignment"]["components"][number]["label"]) {
  return scoreModel.constituentAlignment.components.find((component) => component.label === label)?.value ?? scoreModel.overallScore;
}

function buildAccountabilityTrend(scoreModel: MemberScoreModel): AccountabilityTrendModel {
  const pollAverage = scoreModel.constituentAlignment.components.find((component) => component.label === "Poll Average")?.value ?? scoreModel.overallScore;
  const voteAlignment = alignmentComponentValue(scoreModel, "Vote Alignment");
  const publicPositioning = alignmentComponentValue(scoreModel, "Public Positioning");
  const timeInOffice = alignmentComponentValue(scoreModel, "Time in Office");
  const current =
    scoreModel.factors.find((factor) => factor.key === "constituentAlignment")?.value ??
    clampPercent((pollAverage * 40 + voteAlignment * 35 + publicPositioning * 15 + timeInOffice * 10) / 100);
  const voteStep = clampPercent((pollAverage * 40 + voteAlignment * 35) / 75);
  const signalStep = clampPercent((pollAverage * 40 + voteAlignment * 35 + publicPositioning * 15) / 90);
  const drivers = [
    { delta: voteAlignment - pollAverage, label: "Vote record" },
    { delta: publicPositioning - pollAverage, label: "Public signals" },
    { delta: timeInOffice - pollAverage, label: "Tenure" }
  ].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const driver = drivers[0] ?? { delta: 0, label: "Alignment inputs" };

  return {
    baseline: pollAverage,
    current,
    delta: current - pollAverage,
    driverDelta: driver.delta,
    driverLabel: driver.label,
    points: [
      { label: "Poll", value: pollAverage },
      { label: "Votes", value: voteStep },
      { label: "Signals", value: signalStep },
      { label: "Now", value: current }
    ]
  };
}

function fallbackNextElectionDate(chamber: Member["chamber"]) {
  const nowYear = new Date().getUTCFullYear();
  const termLength = chamber === "Senate" ? 6 : 2;
  let electionYear = nowYear % 2 === 0 ? nowYear : nowYear + 1;

  while (electionYear < nowYear - 1) {
    electionYear += termLength;
  }

  return federalElectionDateIso(electionYear);
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
  const detail = await getMemberDetailWithLiveData(params.bioguideId);
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
  const role = member.chamber === "Senate" ? "Senator" : "Representative";
  const displayName = cleanMemberDisplayName(member);
  const displayNameClass = memberDisplayNameClass(displayName);
  const state = stateNames[member.state] ?? member.state;
  const districtLabel = memberDistrictLabel(state, member.district);
  const seatTag = memberSeatTag(member);
  const nextElectionDate = member.nextElectionDate ?? fallbackNextElectionDate(member.chamber);
  const nextElection = formatDate(nextElectionDate);
  const firstElectedDate = member.firstElectedDate;
  const firstElected = firstElectedDate ? formatDate(firstElectedDate) : "Not listed";
  const termsInOffice = member.termsInOffice ?? estimateTermsInOfficeFromCongressLabel(member.term, member.chamber);
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
                  className="relative h-32 w-32 rounded-[1.45rem] border border-white/18 object-cover shadow-[0_16px_32px_rgba(1,8,24,0.34)]"
                />
              </div>
              <div className="min-w-0">
                <div className="text-[17px] font-medium text-[#ffb12b]">U.S. {role}</div>
                <h1 className={`mt-2 max-w-full break-normal font-medium text-white ${displayNameClass}`}>{displayName}</h1>
                <p className="mt-2 text-white/68">
                  <span className="block max-w-full text-[16px] leading-snug">{districtLabel} {seatTag}</span>
                </p>
                <div id="contact" className="mt-3 flex flex-wrap items-center gap-2 scroll-mt-8">
                  <span className="inline-flex rounded-xl border border-blue-300/20 bg-civic/35 px-4 py-2 text-[15px] text-blue-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">{member.party}</span>
                  <MemberEmailAction bioguideId={member.bioguideId} chamber={member.chamber} memberName={displayName} />
                </div>
              </div>
            </section>

            <MobileCard variant="dashboard" className="mt-8 overflow-hidden px-5 py-5">
              <div className="grid grid-cols-2 gap-3">
                <ProfileStat label="State" value={state} />
                <ProfileStat label="Terms in Office" value={termsInOfficeLabel} subvalue={seniority} />
                <ElectionProfileStat firstElected={firstElected} nextElection={nextElection} />
              </div>
            </MobileCard>

            <nav className="mt-7 grid grid-cols-5 rounded-[1.25rem] border border-white/12 bg-[linear-gradient(180deg,rgba(26,73,127,0.22)_0%,rgba(6,25,55,0.74)_100%)] p-1 text-center text-[14px] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_28px_rgba(1,8,24,0.32)]">
              {memberTabs.map((tab) => {
                const active = activeTab === tab.value;
                return (
                  <Link
                    key={tab.value}
                    href={tabHref(member.bioguideId, tab.value)}
                    className={`min-w-0 rounded-[1rem] px-2 py-3 transition ${active ? "bg-white/8 font-semibold text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-white/58 hover:bg-white/[0.035] hover:text-white/78"}`}
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

              {activeTab === "votes" ? <VotesTab memberVotes={memberVotes} /> : null}
              {activeTab === "bills" ? <BillsTab cosponsoredBills={cosponsoredBills} sponsoredBills={sponsoredBills} /> : null}
              {activeTab === "committees" ? <CommitteesTab member={member} bills={[...sponsoredBills, ...cosponsoredBills]} caucusMemberships={caucusMemberships} /> : null}
              {activeTab === "finance" ? <FinanceTab member={member} /> : null}
            </main>

            <MobileBottomNav
              indicatorClassName="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white/70"
              items={[
                { active: true, href: "/dashboard", icon: <Home />, label: "Home" },
                { href: "/search?type=bills", icon: <FileText />, label: "Track" },
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
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46">First Elected</div>
          <div className="mt-2 text-[17px] font-semibold leading-tight text-white">{firstElected}</div>
        </div>
        <div className="border-l border-white/10 pl-4">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46">Next Election</div>
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
  const alignmentFactor = scoreModel.factors.find((factor) => factor.key === "constituentAlignment");
  const accountabilityTrend = buildAccountabilityTrend(scoreModel);
  const topScoreFactors = [...scoreModel.factors].sort((a, b) => b.value - a.value).slice(0, 3);

  return (
    <>
      <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
        <PremiumCardHeader
          description="Weighted from source-linked transparency categories and local constituent context."
          eyebrow="Official Accountability"
          icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />}
          iconTone="green"
          title="Accountability Score"
          titleAccessory={<AccountabilityInfoPopover />}
        />

        <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-4">
          <div>
            <div className="text-[48px] font-semibold leading-none text-[#ffb12b]">{scoreModel.overallScore}%</div>
            <div className="mt-3 text-[22px] font-medium text-[#65ec68]">{scoreModel.rating}</div>
          </div>
          <div className="text-right">
            <div className="text-[14px] uppercase tracking-[0.06em] text-white/52">Tracked Rank</div>
            <div className="mt-1 text-[24px] font-medium text-white">
              <span className="text-[#ffb12b]">{chamberRank.rank}</span> / {chamberRank.seatTotal}
            </div>
            <div className="mt-2 max-w-[178px] text-[13px] leading-snug text-white/54">
              {chamberRank.label} · {chamberRank.trackedCount} synced {member.chamber === "Senate" ? "senator profiles" : "house profiles"}
            </div>
          </div>
        </div>

        <div className={`mt-5 ${premiumPanelClass} p-4`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[15px] font-medium text-white">Alignment movement</div>
              <p className="mt-1 text-[12px] leading-snug text-white/46">Shows whether votes and public signals lift or drag against the poll baseline.</p>
            </div>
            <span className={`${premiumPillClass} shrink-0 text-[#ffcf54]`}>
              {accountabilityTrend.delta >= 0 ? "+" : ""}
              {accountabilityTrend.delta} pts
            </span>
          </div>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <div>
              <div className="text-[25px] font-semibold leading-none text-[#ffb12b]">{accountabilityTrend.current}%</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.06em] text-white/42">current alignment</div>
            </div>
            <div className="text-right text-[12px] leading-snug text-white/50">
              <span className="block text-white/68">{accountabilityTrend.driverLabel}</span>
              <span>
                {accountabilityTrend.driverDelta >= 0 ? "+" : ""}
                {accountabilityTrend.driverDelta} vs poll
              </span>
            </div>
          </div>
          <AccountabilityTrendChart trend={accountabilityTrend} />
        </div>
      </MobileCard>

      <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
        <PremiumCardHeader
          description="Top inputs feeding the accountability score."
          eyebrow="Scoring Inputs"
          icon={<FileText className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />}
          title="Transparency Mix"
        />
        <div className="mt-4 grid grid-cols-3 gap-2">
          {topScoreFactors.map((factor) => (
            <div key={factor.key} className="rounded-xl border border-white/10 bg-[#071a38]/62 px-3 py-3">
              <div className="truncate text-[11px] font-semibold uppercase tracking-[0.04em] text-white/44">{compactFactorLabel(factor.label)}</div>
              <div className="mt-2 text-[18px] font-semibold leading-none text-white">{factor.value}%</div>
              <div className="mt-1 text-[11px] leading-none text-white/36">{factor.weight}% weight</div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-[#071a38]/62 px-3 py-3">
          <div className="flex items-center justify-between gap-3 text-[12px] font-medium text-white/50">
            <span>Weighted mix</span>
            <span>{scoreModel.overallScore}% total</span>
          </div>
          <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-white/10">
            {scoreModel.factors.map((factor) => (
              <div
                key={`${factor.key}-segment`}
                className="h-full bg-gradient-to-r from-[#a96a09] via-[#ffb12b] to-[#ffcf54] opacity-90"
                style={{ width: `${factor.weight}%` }}
                title={`${factor.label}: ${factor.weight}% weight`}
              />
            ))}
          </div>
        </div>
      </MobileCard>

      <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
        <PremiumCardHeader
          aside={
            <div className="text-right">
              <span className={premiumPillClass}>30% overall</span>
              <div className="mt-2 text-[14px] font-semibold text-[#ffb12b]">
                {alignmentFactor?.value ?? 0}% aligned
              </div>
            </div>
          }
          description={<>Scoring categories used: {scoreModel.constituentAlignment.selectedTopics.join(", ")}</>}
          eyebrow="Constituent Alignment"
          title={`${scoreModel.constituentAlignment.viewerState} issue match`}
        />
        <div className={`mb-5 ${premiumPanelClass} px-4 py-4`}>
          <div className="text-[15px] font-medium text-white">Beta model coverage</div>
          <p className="mt-2 text-[13px] leading-snug text-white/50">
            Capitol Ledger lets you choose 14 issue signals, then rolls related signals into 8 broader scoring categories for this beta accountability model.
            Individual issue-level scoring is planned as the model expands.
          </p>
        </div>
        <MobileGlassScrollFrame heightClassName="max-h-[260px]" className="snap-y snap-mandatory space-y-4">
          {scoreModel.constituentAlignment.components.map((component) => (
            <div key={component.label} className={`snap-start ${premiumPanelClass} px-4 py-4`}>
              <div className="flex items-center justify-between gap-3">
                <div className="text-[16px] font-medium text-white">{component.label}</div>
                <div className="text-right">
                  <div className="text-[16px] font-semibold text-white">{component.value}%</div>
                  <div className="text-[12px] text-white/46">{component.weight}% in alignment</div>
                </div>
              </div>
              <p className="mt-2 text-[13px] leading-snug text-white/50">{component.detail}</p>
            </div>
          ))}
        </MobileGlassScrollFrame>
        <div className={`mt-5 ${premiumPanelClass} px-4 py-4`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[16px] font-medium text-white">By scoring category</h3>
            <span className={premiumPillClass}>{scoreModel.constituentAlignment.topics.length} categories</span>
          </div>
          <MobileGlassScrollFrame frameClassName="mt-4" heightClassName="max-h-[410px]" className="snap-y snap-mandatory space-y-3">
            {scoreModel.constituentAlignment.topics.map((topic) => (
              <TopicMathCard key={topic.topic} topic={topic} />
            ))}
          </MobileGlassScrollFrame>
        </div>
        <p className="mt-4 text-[12px] leading-snug text-white/46">{scoreModel.constituentAlignment.note}</p>
      </MobileCard>

      <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
        <PremiumCardHeader
          description={scoreModel.summary}
          eyebrow="Methodology"
          icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />}
          iconTone="green"
          title={scoreModel.methodologyLabel}
        />
        <div className={`mt-5 ${premiumPanelClass} px-4 py-4`}>
          <div className="text-[15px] font-medium text-white">Formula</div>
          <p className="mt-2 text-[13px] leading-snug text-white/50">
            Overall score = 25% Voting Record + 15% Public Engagement + 15% Sponsored Bills + 15% Ethics &amp; Compliance + 30% Constituent Alignment.
          </p>
          <p className="mt-2 text-[13px] leading-snug text-white/50">
            Constituent Alignment = 40% Poll Average + 35% Vote Alignment + 15% Public Positioning + 10% Time in Office.
          </p>
        </div>
        <div className={`mt-5 ${premiumPanelClass} px-4 py-4`}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-[15px] font-medium text-white">Evidence details</div>
            <span className={premiumPillClass}>{scoreModel.factors.length} inputs</span>
          </div>
          <MobileGlassScrollFrame frameClassName="mt-3" heightClassName="max-h-[330px]" className="snap-y snap-mandatory space-y-3">
            {scoreModel.factors.map((factor) => (
              <div key={`${factor.key}-method`} className="snap-start rounded-xl border border-white/10 bg-[#071a38]/65 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[16px] font-medium text-white">{factor.label}</div>
                  <span className={premiumPillClass}>{factor.status}</span>
                </div>
                <p className="mt-2 text-[13px] leading-snug text-white/50">{factor.detail}</p>
                <div className="mt-2 text-[12px] text-[#ffb12b]/82">{factor.evidence}</div>
              </div>
            ))}
          </MobileGlassScrollFrame>
        </div>
      </MobileCard>
    </>
  );
}

type AlignmentTopic = MemberScoreModel["constituentAlignment"]["topics"][number];

function formatContribution(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
}

function compactFactorLabel(label: string) {
  if (label === "Ethics & Compliance") return "Ethics";
  if (label === "Public Engagement") return "Engagement";
  if (label === "Constituent Alignment") return "Alignment";
  return label;
}

function TopicMathCard({ topic }: { topic: AlignmentTopic }) {
  const weightedTotal = alignmentTopicMetricWeights.reduce((total, metric) => total + (topic[metric.key] * metric.weight) / 100, 0);

  return (
    <div className="snap-start rounded-xl border border-white/10 bg-[#071a38]/65 px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-medium text-white">{topic.topic}</div>
          <div className="mt-1 text-[11px] leading-none text-white/42">{topic.signalCount} matched signal{topic.signalCount === 1 ? "" : "s"}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[17px] font-semibold text-[#ffb12b]">{topic.topicScore}%</div>
          <div className="mt-1 text-[11px] leading-none text-white/42">topic score</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {alignmentTopicMetricWeights.map((metric) => {
          const value = topic[metric.key];
          return (
            <div key={metric.key} className="rounded-lg border border-white/8 bg-white/[0.035] px-2.5 py-2">
              <div className="flex items-center justify-between gap-2 text-[12px] leading-none">
                <span className="text-white/50">{metric.label}</span>
                <span className="font-semibold text-white">{value}%</span>
              </div>
              <div className="mt-1.5 text-[10px] leading-none text-white/35">
                {metric.weight}% weight / {formatContribution((value * metric.weight) / 100)} pts
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 rounded-lg border border-[#ffb12b]/12 bg-[#ffb12b]/6 px-3 py-2 text-[11px] font-medium leading-none text-[#ffcf54]/86">
        {formatContribution(weightedTotal)} weighted pts rounds to {topic.topicScore}%
      </div>
    </div>
  );
}

function AccountabilityTrendChart({ trend }: { trend: AccountabilityTrendModel }) {
  const points = trend.points;
  const width = 360;
  const height = 108;
  const topPadding = 14;
  const bottomPadding = 24;
  const sidePadding = 12;
  const chartBottom = height - bottomPadding;
  const plotHeight = chartBottom - topPadding;
  const values = points.map((point) => point.value);
  const valueMin = Math.max(0, Math.min(...values) - 8);
  const valueMax = Math.min(100, Math.max(...values) + 8);
  const valueRange = Math.max(12, valueMax - valueMin);

  const mapX = (index: number) => sidePadding + ((width - sidePadding * 2) / Math.max(1, points.length - 1)) * index;
  const mapY = (value: number) => topPadding + ((valueMax - value) / valueRange) * plotHeight;
  const plotted = points.map((point, index) => ({
    ...point,
    x: mapX(index),
    y: mapY(point.value)
  }));

  const linePath = plotted.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L ${plotted[plotted.length - 1]?.x ?? sidePadding} ${chartBottom} L ${sidePadding} ${chartBottom} Z`;
  const latestPoint = plotted[plotted.length - 1];

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-[#071a38]/58 px-1.5 py-2">
      <svg className="h-[108px] w-full" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Constituent alignment signal movement chart">
        <defs>
          <linearGradient id="alignment-area-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffb12b" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#ffb12b" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="alignment-line-gradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#ffb12b" />
            <stop offset="70%" stopColor="#ffb12b" />
            <stop offset="100%" stopColor="#ffd163" />
          </linearGradient>
          <filter id="alignment-line-glow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="blurred" />
            <feMerge>
              <feMergeNode in="blurred" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {[valueMax, valueMin].map((tick) => (
          <g key={`tick-${tick}`}>
            <line x1={sidePadding} x2={width - sidePadding} y1={mapY(tick)} y2={mapY(tick)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <text x={width - sidePadding - 10} y={mapY(tick) - 4} fill="rgba(255,255,255,0.42)" fontSize="10" textAnchor="end">
              {tick}%
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#alignment-area-gradient)" />
        <path d={linePath} fill="none" stroke="url(#alignment-line-gradient)" strokeWidth="3" strokeLinecap="round" filter="url(#alignment-line-glow)" />

        {plotted.map((point) => (
          <g key={`point-${point.label}`}>
            <circle cx={point.x} cy={point.y} r={point === latestPoint ? 6.5 : 4.5} fill={point === latestPoint ? "#ffb12b" : "#183c70"} stroke="#ffd976" strokeWidth="2" />
            <text x={point.x} y={height - 6} fill="rgba(255,255,255,0.58)" fontSize="10.5" textAnchor="middle">
              {point.label}
            </text>
          </g>
        ))}

        {latestPoint ? (
          <text x={Math.max(sidePadding + 28, latestPoint.x - 8)} y={latestPoint.y - 10} fill="#ffcf54" fontSize="11" fontWeight="600" textAnchor="end">
            {latestPoint.value}%
          </text>
        ) : null}
      </svg>
    </div>
  );
}

function AccountabilityInfoPopover() {
  return (
    <details className="group relative">
      <summary
        className="grid h-5 w-5 cursor-pointer list-none place-items-center rounded-full border border-white/55 text-xs text-white/70 transition hover:border-[#ffb12b]/75 hover:text-[#ffcf54] [&::-webkit-details-marker]:hidden"
        aria-label="How accountability score is calculated"
      >
        i
      </summary>
      <div className="pointer-events-none absolute left-0 top-7 z-30 w-[270px] rounded-2xl border border-white/12 bg-[#071c38]/96 p-3 text-[12px] leading-snug text-white/72 opacity-0 shadow-[0_18px_36px_rgba(0,0,0,0.35)] transition group-open:pointer-events-auto group-open:opacity-100">
        <div className="font-medium text-[#ffb12b]">Score formula</div>
        <p className="mt-1">
          25% Voting Record + 15% Public Engagement + 15% Sponsored Bills + 15% Ethics &amp; Compliance + 30% Constituent Alignment.
        </p>
      </div>
    </details>
  );
}

function VotesTab({ memberVotes }: { memberVotes: MemberVoteRecord[] }) {
  const records = memberVotes.filter((record) => record.vote).slice(0, 12);

  if (!records.length) {
    return <EmptyTab icon={<VoteIcon className="h-6 w-6" strokeWidth={1.8} />} title="No recorded votes yet" body="Vote records will appear here after Capitol Ledger links this official to synced roll-call data." />;
  }

  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <PremiumCardHeader
        aside={<span className={premiumPillClass}>{records.length} records</span>}
        eyebrow="Roll-call activity"
        title="Voting Record"
      />
      <div className="mt-5 space-y-3">
        {records.map((record) => {
          const vote = record.vote;
          if (!vote) return null;

          return (
            <Link key={`${record.voteId}-${record.position}`} href={`/votes/${vote.id}`} className={`grid grid-cols-[1fr_auto] gap-4 px-4 py-4 transition hover:brightness-110 ${premiumPanelClass}`}>
              <div className="min-w-0">
                <div className="text-[18px] font-medium leading-tight text-white">{vote.question}</div>
                <div className="mt-2 text-[14px] text-white/50">
                  {vote.chamber} roll call {vote.rollCall} - {formatDate(vote.voteDate)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${positionTone(record.position)}`}>{record.position}</span>
                <ChevronRight className="h-5 w-5 text-white/38" strokeWidth={1.8} aria-hidden="true" />
              </div>
            </Link>
          );
        })}
      </div>
    </MobileCard>
  );
}

function BillsTab({ cosponsoredBills, sponsoredBills }: { cosponsoredBills: Bill[]; sponsoredBills: Bill[] }) {
  const records = [
    ...sponsoredBills.map((bill) => ({ bill, label: "Sponsored" })),
    ...cosponsoredBills.map((bill) => ({ bill, label: "Cosponsored" }))
  ];

  if (!records.length) {
    return <EmptyTab icon={<FileText className="h-6 w-6" strokeWidth={1.8} />} title="No linked bills yet" body="Sponsored and cosponsored bills will appear here after this official's legislative records are synced." />;
  }

  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <PremiumCardHeader
        aside={<span className={premiumPillClass}>{records.length} bills</span>}
        eyebrow="Legislative activity"
        title="Bill Activity"
      />
      <div className="mt-5 space-y-3">
        {records.slice(0, 12).map(({ bill, label }) => (
          <BillActivityRow key={`${label}-${bill.id}`} bill={bill} label={label} />
        ))}
      </div>
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
      </div>
      <ChevronRight className="mt-7 h-5 w-5 text-white/38" strokeWidth={1.8} aria-hidden="true" />
    </Link>
  );
}

function CommitteesTab({
  bills,
  caucusMemberships,
  member
}: {
  bills: Bill[];
  caucusMemberships: MemberCaucusMembership[];
  member: Member;
}) {
  const committees = Array.from(new Set(bills.map((bill) => bill.committeeName).filter((name): name is string => Boolean(name)))).slice(0, 8);

  if (!committees.length && !caucusMemberships.length) {
    return (
      <EmptyTab
        icon={<Landmark className="h-6 w-6" strokeWidth={1.8} />}
        title="Committee records pending"
        body={`Committee assignments for this ${member.chamber.toLowerCase()} official will appear here when official committee data is connected.`}
      />
    );
  }

  return (
    <>
      {committees.length ? (
        <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
          <PremiumCardHeader
            aside={<span className={premiumPillClass}>Linked bills</span>}
            eyebrow="Committee signals"
            title="Committee Activity"
          />
          <div className="mt-5 space-y-3">
            {committees.map((committee) => (
              <div key={committee} className={`grid grid-cols-[44px_1fr] gap-4 px-4 py-4 ${premiumPanelClass}`}>
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b]">
                  <Landmark className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div>
                  <div className="text-[18px] font-medium leading-tight text-white">{committee}</div>
                  <div className="mt-2 text-[14px] leading-snug text-white/54">Connected through sponsored or cosponsored bill activity.</div>
                </div>
              </div>
            ))}
          </div>
        </MobileCard>
      ) : null}

      {caucusMemberships.length ? (
        <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
          <PremiumCardHeader
            aside={<span className={premiumPillClass}>{caucusMemberships.length} listed</span>}
            eyebrow="Affiliations"
            title="Caucuses & Roles"
          />
          <MobileGlassScrollFrame heightClassName="max-h-[430px]" className="space-y-3">
            {caucusMemberships.map((membership) => (
              <a
                key={`${membership.caucusName}-${membership.role}`}
                href={membership.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className={`grid grid-cols-[1fr_auto] gap-4 px-4 py-4 transition hover:brightness-110 ${premiumPanelClass}`}
              >
                <div className="min-w-0">
                  <div className="text-[17px] font-medium leading-tight text-white">{membership.caucusName}</div>
                  <div className="mt-1 text-[14px] text-white/50">{membership.sourceLabel}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-[#ffb12b]/25 bg-[#ffb12b]/10 px-3 py-1.5 text-[13px] font-medium text-[#ffb12b]">
                    {membership.role}
                  </span>
                  <ExternalLink className="h-4 w-4 text-white/34" strokeWidth={1.8} aria-hidden="true" />
                </div>
              </a>
            ))}
          </MobileGlassScrollFrame>
        </MobileCard>
      ) : null}
    </>
  );
}

function FinanceTab({ member }: { member: Member }) {
  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <PremiumCardHeader
        eyebrow="Source readiness"
        icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />}
        iconTone="green"
        title="Finance & Records"
      />
      <div className="mt-5 space-y-4">
        <FinanceRow
          icon={<BriefcaseBusiness className="h-5 w-5" strokeWidth={1.8} />}
          label="Financial disclosure"
          value="Public-record feed planned"
        />
        <FinanceRow
          icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.8} />}
          label="Ethics & compliance"
          value="Source-linked review ready"
        />
        <a
          href={member.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className={`mt-2 flex items-center justify-between px-4 py-4 text-[15px] font-semibold text-[#ffb12b] transition hover:brightness-110 ${premiumPanelClass}`}
        >
          Open official profile source
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

function EmptyTab({ body, icon, title }: { body: string; icon: ReactNode; title: string }) {
  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-6">
      <div className="grid grid-cols-[48px_1fr] gap-4">
        <div className={premiumIconTileClass}>{icon}</div>
        <div>
          <h2 className="text-[22px] font-medium leading-tight text-white">{title}</h2>
          <p className="mt-3 text-[16px] leading-snug text-white/58">{body}</p>
        </div>
      </div>
    </MobileCard>
  );
}
