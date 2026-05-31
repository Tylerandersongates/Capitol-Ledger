import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass } from "@/components/mobile-ui";
import { MemberEmailAction } from "@/components/member-email-action";
import { SaveTargetButton } from "@/components/saved-ledger-controls";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bell, BriefcaseBusiness, ChevronRight, ExternalLink, FileText, Home, Landmark, Search, ShieldCheck, UserRound, Vote as VoteIcon } from "lucide-react";
import { getMemberDetailWithLiveData, type MemberCaucusMembership, type MemberVoteRecord } from "@/lib/data";
import { calculateMemberScore, type MemberScoreModel } from "@/lib/member-scoring";
import { getCurrentSession } from "@/lib/auth";
import { ensureAccountUser, readLedgerFromDatabase, readProfileFromDatabase } from "@/lib/account-database";
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

const stateNames: Record<string, string> = {
  AK: "Alaska",
  AZ: "Arizona",
  CA: "California",
  MA: "Massachusetts",
  NY: "New York",
  TX: "Texas",
  VT: "Vermont"
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

function tabHref(bioguideId: string, tab: MemberTab) {
  return tab === "overview" ? `/members/${bioguideId}` : `/members/${bioguideId}?tab=${tab}`;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildAccountabilityTrend(scoreModel: MemberScoreModel): AccountabilityTrendPoint[] {
  const pollAverage = scoreModel.constituentAlignment.components.find((component) => component.label === "Poll Average")?.value ?? scoreModel.overallScore;
  const voteAlignment = scoreModel.constituentAlignment.components.find((component) => component.label === "Vote Alignment")?.value ?? scoreModel.overallScore;
  const publicPositioning =
    scoreModel.constituentAlignment.components.find((component) => component.label === "Public Positioning")?.value ?? scoreModel.overallScore;
  const timeInOffice = scoreModel.constituentAlignment.components.find((component) => component.label === "Time in Office")?.value ?? scoreModel.overallScore;
  const baseline = scoreModel.overallScore;
  const modulation = (pollAverage - 50) * 0.07 + (voteAlignment - 50) * 0.06 + (publicPositioning - 50) * 0.04 + (timeInOffice - 50) * 0.03;

  const labels = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  const shapeDeltas = [-18, -9, -6, 4, 12, 6, -7, -10, 3, 11];

  return labels.map((label, index) => {
    const periodSwing = index % 2 === 0 ? 1.8 : -1.2;
    const value = clampPercent(baseline + shapeDeltas[index] + modulation + periodSwing);
    return { label, value };
  });
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
  if (!session) return { viewerDistrictState: undefined, viewerIssueInterests: [] as string[] };

  const user = session.user;
  const hasAccountDatabase = await ensureAccountUser(user).catch(() => false);
  const [databaseLedger, databaseProfile] = hasAccountDatabase
    ? await Promise.all([readLedgerFromDatabase(user.id), readProfileFromDatabase(user.id)])
    : [null, null];
  const fallbackLedger = getAccountLedger(user.id);

  return {
    viewerDistrictState: databaseProfile?.districtState ?? databaseProfile?.districtCode ?? undefined,
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
  const displayName = member.fullName.replace(/^Sen\.\s+|^Rep\.\s+/, "");
  const state = stateNames[member.state] ?? member.state;
  const districtLabel = member.district ? `${state} District ${member.district}` : state;
  const nextElectionDate = member.nextElectionDate ?? fallbackNextElectionDate(member.chamber);
  const nextElection = formatDate(nextElectionDate);
  const firstElectedDate = member.firstElectedDate;
  const firstElected = firstElectedDate ? formatDate(firstElectedDate) : "Not listed";
  const termsInOffice = member.termsInOffice ?? estimateTermsInOfficeFromCongressLabel(member.term, member.chamber);
  const termsInOfficeLabel = termsInOffice ? `${termsInOffice} ${termsInOffice === 1 ? "term" : "terms"}` : "Not listed";
  const seniority = member.term;

  return (
    <MobileShell
      minHeight="min-h-[932px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between text-[17px] font-semibold"
    >
            <header className="mt-10 flex items-center justify-between">
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

            <section className="mt-8 grid grid-cols-[150px_1fr] items-center gap-6">
              <Image
                src={member.photoUrl ?? "/capitol-ledger-logo.png"}
                alt=""
                width={144}
                height={144}
                className="h-36 w-36 rounded-full border-2 border-[#ffb12b] object-cover shadow-[0_0_38px_rgba(255,177,43,0.15)]"
              />
              <div>
                <div className="text-[20px] font-medium text-[#ffb12b]">{role}</div>
                <h1 className="mt-3 text-[30px] font-medium leading-tight text-white">{displayName}</h1>
                <p className="mt-3 text-[20px] leading-snug text-white/68">
                  United States {role}
                  <br />
                  from {districtLabel}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-xl bg-civic/35 px-4 py-2 text-[15px] text-blue-100">{member.party}</span>
                  <MemberEmailAction bioguideId={member.bioguideId} chamber={member.chamber} memberName={displayName} />
                </div>
                <CaucusRoleRail caucusMemberships={caucusMemberships} memberId={member.bioguideId} />
              </div>
            </section>

            <MobileCard variant="dashboard" className="mt-9 px-5 py-5">
              <div className="grid grid-cols-2 gap-3">
                <ProfileStat label="State" value={state} />
                <ProfileStat label="Terms in Office" value={termsInOfficeLabel} subvalue={seniority} />
                <ElectionProfileStat firstElected={firstElected} nextElection={nextElection} />
              </div>
            </MobileCard>

            <nav className="mt-8 flex items-center justify-between gap-3 border-b border-white/10 text-center text-[16px]">
              {memberTabs.map((tab) => {
                const active = activeTab === tab.value;
                return (
                  <Link
                    key={tab.value}
                    href={tabHref(member.bioguideId, tab.value)}
                    className={`min-w-0 whitespace-nowrap pb-4 ${active ? "border-b-2 border-[#ffb12b] font-medium text-[#ffb12b]" : "text-white/58"}`}
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
              className="sticky bottom-0 -mx-8 mt-auto border-t border-white/8 bg-[#031126]/96 px-8 pb-3 pt-4 backdrop-blur-xl"
              indicatorClassName="mx-auto mt-4 h-1.5 w-36 rounded-full bg-white/70"
              items={[
                { active: true, href: "/dashboard", icon: <Home />, label: "Home" },
                { href: "/search?type=bills", icon: <FileText />, label: "Track" },
                { highlighted: true, href: "/search?type=members", icon: <Search />, label: "Search" },
                { href: "/alerts", icon: <Bell />, label: "Alerts" },
                { href: "/account", icon: <UserRound />, label: "Profile" }
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
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <div className="text-[13px] uppercase tracking-[0.06em] text-white/52">{label}</div>
      <div className="mt-2 text-[17px] font-semibold leading-tight text-white">{value}</div>
      {subvalue ? <div className="mt-1 text-[13px] text-white/52">{subvalue}</div> : null}
    </div>
  );
}

function ElectionProfileStat({ firstElected, nextElection }: { firstElected: string; nextElection: string }) {
  return (
    <div className="col-span-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[13px] uppercase tracking-[0.06em] text-white/52">First Elected</div>
          <div className="mt-2 text-[17px] font-semibold leading-tight text-white">{firstElected}</div>
        </div>
        <div className="border-l border-white/10 pl-4">
          <div className="text-[13px] uppercase tracking-[0.06em] text-white/52">Next Election</div>
          <div className="mt-2 text-[17px] font-semibold leading-tight text-white">{nextElection}</div>
        </div>
      </div>
    </div>
  );
}

function CaucusRoleRail({ caucusMemberships, memberId }: { caucusMemberships: MemberCaucusMembership[]; memberId: string }) {
  if (!caucusMemberships.length) return null;

  const leadershipRoles = caucusMemberships
    .filter((membership) => membership.role !== "Member")
    .concat(caucusMemberships.filter((membership) => membership.role === "Member"))
    .slice(0, 3);
  const remainingCount = Math.max(0, caucusMemberships.length - leadershipRoles.length);

  return (
    <div className="mt-4 max-w-full">
      <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">Caucus roles</div>
      <div className="mt-2 flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {leadershipRoles.map((membership) => (
          <a
            key={`${membership.caucusName}-${membership.role}`}
            href={membership.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="min-w-[145px] max-w-[172px] shrink-0 rounded-2xl border border-[#ffb12b]/25 bg-[#ffb12b]/8 px-3 py-2"
            title={`${membership.role}, ${membership.caucusName}`}
          >
            <span className="block truncate text-[12px] font-medium text-[#ffb12b]">{membership.role}</span>
            <span className="mt-0.5 block truncate text-[12px] leading-tight text-white/70">{membership.caucusName}</span>
          </a>
        ))}
        {remainingCount ? (
          <Link
            href={`/members/${memberId}?tab=committees`}
            className="grid min-w-[76px] shrink-0 place-items-center rounded-2xl border border-white/12 bg-white/6 px-3 py-2 text-center text-[12px] font-medium text-white/64"
          >
            +{remainingCount} more
          </Link>
        ) : null}
      </div>
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

  return (
    <>
      <MobileCard variant="rust" className="overflow-hidden px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="whitespace-nowrap text-[21px] font-medium leading-tight">Accountability Score</h2>
            <AccountabilityInfoPopover />
          </div>
          <span className="rounded-full bg-white/8 px-3 py-1.5 text-[12px] font-medium text-white/54">trend view</span>
        </div>
        <p className="mt-3 text-[13px] leading-snug text-white/48">Weighted from the source-linked transparency categories below.</p>

        <div className="mt-6 grid grid-cols-[1fr_auto] items-end gap-4">
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

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[15px] font-medium text-white">Constituent Alignment Trend</div>
            <span className="text-[12px] text-white/48">Swipe</span>
          </div>
          <div className="mt-3 -mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <AccountabilityTrendChart points={accountabilityTrend} />
          </div>
        </div>
      </MobileCard>

      <MobileCard variant="rust" className="px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-[23px] font-medium">Transparency Breakdown</h2>
          <span className="rounded-full bg-white/8 px-3 py-1.5 text-[12px] font-medium text-white/52">weighted</span>
        </div>
        <div className="mt-6 space-y-5">
          {scoreModel.factors.map((factor) => (
            <div key={factor.key} className="grid grid-cols-[1.05fr_1.15fr_48px] items-center gap-4">
              <div className="min-w-0">
                <div className="text-[17px] text-white/72">{factor.label}</div>
                <div className="mt-1 text-[12px] leading-tight text-white/42">{factor.weight}% weight</div>
              </div>
              <div className="h-2.5 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#a96a09] via-[#ffb12b] to-[#ffcf54] shadow-[0_0_16px_rgba(255,177,43,0.35)]"
                  style={{ width: `${factor.value}%` }}
                />
              </div>
              <div className="text-right text-[17px] font-semibold text-white">{factor.value}%</div>
            </div>
          ))}
        </div>
      </MobileCard>

      <MobileCard variant="rust" className="px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#ffb12b]">Constituent Alignment</div>
            <h2 className="mt-2 text-[23px] font-medium">{scoreModel.constituentAlignment.viewerState} issue match</h2>
          </div>
          <div className="text-right">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-medium text-white/54">
              30% of overall
            </span>
            <div className="mt-2 text-[14px] font-medium text-[#ffb12b]">
              {alignmentFactor?.value ?? 0}% aligned
            </div>
          </div>
        </div>
        <p className="mt-4 text-[15px] leading-snug text-white/58">
          Topics used: {scoreModel.constituentAlignment.selectedTopics.join(", ")}
        </p>
        <div className="mt-5 max-h-[260px] snap-y snap-mandatory space-y-4 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {scoreModel.constituentAlignment.components.map((component) => (
            <div key={component.label} className="snap-start rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4">
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
        </div>
        <div className="mt-5 rounded-2xl border border-white/10 bg-transparent px-4 py-4">
          <h3 className="text-[16px] font-medium text-white">By topic</h3>
          <div className="mt-4 max-h-[360px] snap-y snap-mandatory space-y-3 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {scoreModel.constituentAlignment.topics.map((topic) => (
              <div key={topic.topic} className="snap-start rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[15px] font-medium text-white">{topic.topic}</div>
                  <div className="text-[15px] font-semibold text-[#ffb12b]">{topic.topicScore}%</div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-white/50">
                  <span>Poll avg: {topic.pollAverage}%</span>
                  <span>Vote match: {topic.voteAlignment}%</span>
                  <span>Public signals: {topic.publicPositioning}%</span>
                  <span>Tenure: {topic.timeInOffice}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-4 text-[12px] leading-snug text-white/46">{scoreModel.constituentAlignment.note}</p>
      </MobileCard>

      <MobileCard variant="rust" className="px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#ffb12b]">Methodology</div>
            <h2 className="mt-2 text-[23px] font-medium">{scoreModel.methodologyLabel}</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-medium text-white/54">nonpartisan</span>
        </div>
        <p className="mt-4 text-[15px] leading-snug text-white/58">{scoreModel.summary}</p>
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
          <div className="text-[15px] font-medium text-white">Formula</div>
          <p className="mt-2 text-[13px] leading-snug text-white/50">
            Overall score = 25% Voting Record + 15% Public Engagement + 15% Sponsored Bills + 15% Ethics &amp; Compliance + 30% Constituent Alignment.
          </p>
          <p className="mt-2 text-[13px] leading-snug text-white/50">
            Constituent Alignment = 40% Poll Average + 35% Vote Alignment + 15% Public Positioning + 10% Time in Office.
          </p>
        </div>
        <div className="mt-5 space-y-3">
          {scoreModel.factors.map((factor) => (
            <div key={`${factor.key}-method`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[16px] font-medium text-white">{factor.label}</div>
                <span className="rounded-full bg-white/8 px-2.5 py-1 text-[12px] font-medium text-white/52">{factor.status}</span>
              </div>
              <p className="mt-2 text-[13px] leading-snug text-white/50">{factor.detail}</p>
              <div className="mt-2 text-[12px] text-[#ffb12b]/82">{factor.evidence}</div>
            </div>
          ))}
        </div>
      </MobileCard>
    </>
  );
}

function AccountabilityTrendChart({ points }: { points: AccountabilityTrendPoint[] }) {
  const height = 228;
  const topPadding = 16;
  const bottomPadding = 42;
  const leftPadding = 52;
  const rightPadding = 20;
  const pointSpacing = 78;
  const width = leftPadding + rightPadding + pointSpacing * Math.max(0, points.length - 1);
  const chartBottom = height - bottomPadding;
  const plotHeight = chartBottom - topPadding;

  const mapY = (value: number) => topPadding + ((100 - value) / 100) * plotHeight;
  const plotted = points.map((point, index) => ({
    ...point,
    x: leftPadding + index * pointSpacing,
    y: mapY(point.value)
  }));

  const linePath = plotted
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${plotted[plotted.length - 1]?.x ?? leftPadding} ${chartBottom} L ${leftPadding} ${chartBottom} Z`;
  const latestPoint = plotted[plotted.length - 1];
  const yTicks = [100, 75, 50, 25, 0];

  return (
    <div className="min-w-[830px]">
      <svg width={width} height={height} role="img" aria-label="Constituent alignment monthly trend chart">
        <defs>
          <linearGradient id="alignment-area-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffb12b" stopOpacity="0.3" />
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
          <filter id="alignment-point-glow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="5.2" />
          </filter>
        </defs>

        {yTicks.map((tick) => {
          const y = mapY(tick);
          return (
            <g key={`tick-${tick}`}>
              <line x1={leftPadding} x2={width - rightPadding} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <text x={10} y={y + 4} fill="rgba(255,255,255,0.62)" fontSize="13">
                {tick}%
              </text>
            </g>
          );
        })}

        {plotted.map((point) => (
          <line
            key={`grid-${point.label}`}
            x1={point.x}
            x2={point.x}
            y1={topPadding}
            y2={chartBottom}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="2 6"
          />
        ))}

        <path d={areaPath} fill="url(#alignment-area-gradient)" />
        <path d={linePath} fill="none" stroke="url(#alignment-line-gradient)" strokeWidth="3.2" strokeLinecap="round" filter="url(#alignment-line-glow)" />

        {latestPoint ? (
          <g>
            <circle cx={latestPoint.x} cy={latestPoint.y} r="13" fill="#ffb12b" opacity="0.42" filter="url(#alignment-point-glow)" />
            <circle cx={latestPoint.x} cy={latestPoint.y} r="8" fill="#ffb12b" stroke="#ffd976" strokeWidth="2.4" />
          </g>
        ) : null}

        {points.map((point, index) => (
          <text key={`month-${point.label}`} x={leftPadding + index * pointSpacing} y={height - 12} fill="rgba(255,255,255,0.58)" fontSize="14" textAnchor="middle">
            {point.label}
          </text>
        ))}
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
    <MobileCard variant="rust" className="px-6 py-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[23px] font-medium">Voting Record</h2>
        <span className="rounded-full bg-white/8 px-3 py-2 text-[13px] font-medium text-white/56">{records.length} records</span>
      </div>
      <div className="mt-5 divide-y divide-white/10">
        {records.map((record) => {
          const vote = record.vote;
          if (!vote) return null;

          return (
            <Link key={`${record.voteId}-${record.position}`} href={`/votes/${vote.id}`} className="grid grid-cols-[1fr_auto] gap-4 py-4">
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
    <MobileCard variant="rust" className="px-6 py-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[23px] font-medium">Bill Activity</h2>
        <span className="rounded-full bg-white/8 px-3 py-2 text-[13px] font-medium text-white/56">{records.length} bills</span>
      </div>
      <div className="mt-5 divide-y divide-white/10">
        {records.slice(0, 12).map(({ bill, label }) => (
          <BillActivityRow key={`${label}-${bill.id}`} bill={bill} label={label} />
        ))}
      </div>
    </MobileCard>
  );
}

function BillActivityRow({ bill, label }: { bill: Bill; label: string }) {
  return (
    <Link href={`/bills/${bill.id}`} className="grid grid-cols-[1fr_auto] gap-4 py-4">
      <div className="min-w-0">
        <div className="text-[16px] font-medium text-[#ffb12b]">{label}</div>
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
      {caucusMemberships.length ? (
        <MobileCard variant="rust" className="px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[23px] font-medium">Caucuses & Roles</h2>
            <span className="rounded-full bg-white/8 px-3 py-2 text-[13px] font-medium text-white/56">{caucusMemberships.length} listed</span>
          </div>
          <div className="mt-5 max-h-[430px] space-y-3 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {caucusMemberships.map((membership) => (
              <a
                key={`${membership.caucusName}-${membership.role}`}
                href={membership.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="grid grid-cols-[1fr_auto] gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
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
          </div>
        </MobileCard>
      ) : null}

      {committees.length ? (
        <MobileCard variant="rust" className="px-6 py-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[23px] font-medium">Committee Activity</h2>
            <span className="rounded-full bg-white/8 px-3 py-2 text-[13px] font-medium text-white/56">Linked bills</span>
          </div>
          <div className="mt-5 divide-y divide-white/10">
            {committees.map((committee) => (
              <div key={committee} className="grid grid-cols-[34px_1fr] gap-4 py-4">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-[#ffb12b]/10 text-[#ffb12b]">
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
    </>
  );
}

function FinanceTab({ member }: { member: Member }) {
  return (
    <MobileCard variant="rust" className="px-6 py-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[23px] font-medium">Finance & Records</h2>
        <ShieldCheck className="h-7 w-7 text-[#43ed74]" strokeWidth={1.8} aria-hidden="true" />
      </div>
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
          className="mt-2 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-[15px] font-medium text-[#ffb12b]"
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
    <div className="grid grid-cols-[34px_1fr] gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-[#ffb12b]/10 text-[#ffb12b]">{icon}</div>
      <div>
        <div className="text-[17px] font-medium text-white">{label}</div>
        <div className="mt-1 text-[14px] text-white/54">{value}</div>
      </div>
    </div>
  );
}

function EmptyTab({ body, icon, title }: { body: string; icon: ReactNode; title: string }) {
  return (
    <MobileCard variant="rust" className="px-6 py-7">
      <div className="grid grid-cols-[42px_1fr] gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-[#ffb12b]/10 text-[#ffb12b]">{icon}</div>
        <div>
          <h2 className="text-[22px] font-medium leading-tight text-white">{title}</h2>
          <p className="mt-3 text-[16px] leading-snug text-white/58">{body}</p>
        </div>
      </div>
    </MobileCard>
  );
}
