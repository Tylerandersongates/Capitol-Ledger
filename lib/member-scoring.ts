import { publicBrand } from "@/lib/brand";
import type { MemberCaucusMembership, MemberVoteRecord } from "@/lib/data";
import type { Bill, Member } from "@/types/capitol";

type IssueTopic =
  | "Economy"
  | "Healthcare"
  | "Education"
  | "Infrastructure"
  | "Veterans Affairs"
  | "Environment"
  | "Public Safety"
  | "Immigration";

export type MemberScoreFactor = {
  detail: string;
  evidence: string;
  evidenceCount: number;
  key: "voting" | "legislativeActivity" | "transparency" | "ethics";
  label: string;
  status: "verified" | "limited" | "unavailable";
  value: number | null;
  weight: number;
};

export type AlignmentTopicBreakdown = {
  caucusCount: number;
  confidence: "none" | "limited" | "developing";
  cosponsoredBillCount: number;
  signalCount: number;
  sponsoredBillCount: number;
  topic: IssueTopic;
  voteCount: number;
};

export type ConstituentAlignmentModel = {
  note: string;
  selectedTopics: IssueTopic[];
  topics: AlignmentTopicBreakdown[];
  viewerState: string;
};

export type MemberScoreModel = {
  constituentAlignment: ConstituentAlignmentModel;
  coveredFactorCount: number;
  evidenceCoverage: number;
  evidenceRecordCount: number;
  factors: MemberScoreFactor[];
  methodologyLabel: string;
  overallScore: number | null;
  scoreEligibilityDetail: string;
  status: "verified" | "preliminary";
  summary: string;
  totalFactorCount: number;
};

type MemberScoreContext = {
  viewerIssueInterests?: string[];
};

type MemberScoreInput = {
  caucusMemberships: MemberCaucusMembership[];
  context?: MemberScoreContext;
  cosponsoredBills: Bill[];
  member: Member;
  memberVotes: MemberVoteRecord[];
  sponsoredBills: Bill[];
};

const minimumScoredCategories = 3;
const minimumScoredWeight = 60;
const minimumVotingRecords = 5;

const topicKeywords: Record<IssueTopic, string[]> = {
  Economy: ["economy", "economic", "jobs", "inflation", "wages", "small business", "tax", "budget", "fiscal"],
  Healthcare: ["health", "medicare", "medicaid", "hospital", "mental health", "childcare", "care act", "drug"],
  Education: ["education", "school", "student", "college", "teacher", "learning", "classroom", "tuition"],
  Infrastructure: ["infrastructure", "transit", "transportation", "bridge", "road", "rail", "broadband", "port"],
  "Veterans Affairs": ["veteran", "va", "military family", "servicemember"],
  Environment: ["climate", "environment", "emissions", "clean energy", "water", "wildfire", "conservation"],
  "Public Safety": ["public safety", "crime", "police", "fire", "emergency", "opioid", "community safety"],
  Immigration: ["immigration", "border", "asylum", "visa", "migrant", "homeland security"]
};

const interestAliases: Record<string, IssueTopic> = {
  affordability: "Economy",
  border: "Immigration",
  "border security": "Immigration",
  childcare: "Healthcare",
  climate: "Environment",
  "climate change": "Environment",
  "cost of living": "Economy",
  economy: "Economy",
  education: "Education",
  environment: "Environment",
  "federal budget deficit": "Economy",
  "gun violence": "Public Safety",
  healthcare: "Healthcare",
  "healthcare affordability": "Healthcare",
  immigration: "Immigration",
  infrastructure: "Infrastructure",
  jobs: "Economy",
  "drug addiction": "Public Safety",
  safety: "Public Safety",
  "public safety": "Public Safety",
  veterans: "Veterans Affairs",
  "veterans affairs": "Veterans Affairs"
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function weightedAverage(values: Array<{ value: number; weight: number }>) {
  const totalWeight = values.reduce((total, item) => total + item.weight, 0);
  if (!totalWeight) return 0;
  return clampScore(values.reduce((total, item) => total + item.value * item.weight, 0) / totalWeight);
}

function normalizeStateCode(value?: string) {
  if (!value) return "US";
  const trimmed = value.trim();
  if (!trimmed) return "US";
  if (/^[A-Z]{2}$/.test(trimmed.toUpperCase())) return trimmed.toUpperCase();

  const district = trimmed.match(/\b([a-z]{2})-\d{1,2}\b/i)?.[1];
  return district?.toUpperCase() ?? trimmed;
}

function normalizeInterestTopic(value: string): IssueTopic | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (interestAliases[normalized]) return interestAliases[normalized];

  const matched = (Object.entries(topicKeywords) as Array<[IssueTopic, string[]]>).find(([, keywords]) =>
    keywords.some((keyword) => normalized.includes(keyword))
  );

  return matched?.[0] ?? null;
}

function normalizeViewerTopics(interests: string[]) {
  const resolved = interests
    .map((interest) => normalizeInterestTopic(interest))
    .filter((topic): topic is IssueTopic => Boolean(topic));

  return Array.from(new Set(resolved));
}

function containsTopicText(text: string, topic: IssueTopic) {
  const normalized = text.toLowerCase();
  return topicKeywords[topic].some((keyword) => normalized.includes(keyword));
}

function confidenceForSignalCount(signalCount: number): AlignmentTopicBreakdown["confidence"] {
  if (signalCount >= 8) return "developing";
  if (signalCount > 0) return "limited";
  return "none";
}

function buildIssueEvidence({
  caucusMemberships,
  cosponsoredBills,
  member,
  memberVotes,
  sponsoredBills,
  viewerIssueInterests = []
}: Required<Omit<MemberScoreInput, "context">> & MemberScoreContext): ConstituentAlignmentModel {
  const selectedTopics = normalizeViewerTopics(viewerIssueInterests);

  const topics = selectedTopics.map((topic) => {
    const voteCount = memberVotes.filter((record) => {
      if (!record.vote) return false;
      return containsTopicText(`${record.vote.question} ${record.vote.explanation}`, topic);
    }).length;
    const sponsoredBillCount = sponsoredBills.filter((bill) =>
      containsTopicText(`${bill.title} ${bill.shortTitle} ${bill.policyArea}`, topic)
    ).length;
    const cosponsoredBillCount = cosponsoredBills.filter((bill) =>
      containsTopicText(`${bill.title} ${bill.shortTitle} ${bill.policyArea}`, topic)
    ).length;
    const caucusCount = caucusMemberships.filter((membership) =>
      containsTopicText(`${membership.caucusName} ${membership.role}`, topic)
    ).length;
    const signalCount = voteCount + sponsoredBillCount + cosponsoredBillCount + caucusCount;

    return {
      caucusCount,
      confidence: confidenceForSignalCount(signalCount),
      cosponsoredBillCount,
      signalCount,
      sponsoredBillCount,
      topic,
      voteCount
    };
  });

  return {
    note:
      "Saved interests identify relevant public records. They do not establish a policy position, so CapitolWonk does not infer an alignment percentage.",
    selectedTopics,
    topics,
    viewerState: normalizeStateCode(member.state)
  };
}

function uniqueOfficialSourceCount(member: Member) {
  return new Set([member.sourceUrl, member.officialUrl].filter((value): value is string => Boolean(value?.trim()))).size;
}

export function calculateMemberScore({
  caucusMemberships,
  context,
  cosponsoredBills,
  member,
  memberVotes,
  sponsoredBills
}: MemberScoreInput): MemberScoreModel {
  const linkedVoteCount = memberVotes.filter((record) => record.vote).length;
  const notVotingCount = memberVotes.filter((record) => record.vote && record.position === "Not Voting").length;
  const legislativeRecordCount = sponsoredBills.length + cosponsoredBills.length;
  const officialSourceCount = uniqueOfficialSourceCount(member);
  const votingParticipation =
    linkedVoteCount >= minimumVotingRecords ? clampScore(((linkedVoteCount - notVotingCount) / linkedVoteCount) * 100) : null;
  const alignment = buildIssueEvidence({
    caucusMemberships,
    cosponsoredBills,
    member,
    memberVotes,
    sponsoredBills,
    viewerIssueInterests: context?.viewerIssueInterests ?? []
  });

  const factors: MemberScoreFactor[] = [
    {
      detail:
        linkedVoteCount >= minimumVotingRecords
          ? `${linkedVoteCount} linked roll-call records, including ${notVotingCount} recorded as not voting.`
          : `${linkedVoteCount} linked roll-call record${linkedVoteCount === 1 ? "" : "s"}; at least ${minimumVotingRecords} are required for a participation measure.`,
      evidence: "Linked roll-call records",
      evidenceCount: linkedVoteCount,
      key: "voting",
      label: "Voting participation",
      status: linkedVoteCount >= minimumVotingRecords ? "verified" : linkedVoteCount ? "limited" : "unavailable",
      value: votingParticipation,
      weight: 35
    },
    {
      detail: `${sponsoredBills.length} sponsored bill${sponsoredBills.length === 1 ? "" : "s"} and ${cosponsoredBills.length} cosponsored bill${cosponsoredBills.length === 1 ? "" : "s"}. Activity is shown as evidence, not graded by raw volume.`,
      evidence: "Congress.gov legislation records",
      evidenceCount: legislativeRecordCount,
      key: "legislativeActivity",
      label: "Legislative record",
      status: legislativeRecordCount ? "verified" : "unavailable",
      value: null,
      weight: 25
    },
    {
      detail: officialSourceCount
        ? `${officialSourceCount} official identity source${officialSourceCount === 1 ? " is" : "s are"} linked. Disclosure coverage is not complete.`
        : "Official identity and disclosure sources are not linked yet.",
      evidence: "Official member and disclosure sources",
      evidenceCount: officialSourceCount,
      key: "transparency",
      label: "Transparency sources",
      status: officialSourceCount ? "limited" : "unavailable",
      value: null,
      weight: 20
    },
    {
      detail: "Verified financial-disclosure and official ethics records are not connected yet. Missing data never receives points.",
      evidence: "Official disclosure and ethics records",
      evidenceCount: 0,
      key: "ethics",
      label: "Ethics & compliance",
      status: "unavailable",
      value: null,
      weight: 20
    }
  ];

  const totalWeight = factors.reduce((total, factor) => total + factor.weight, 0);
  const verifiedEvidenceFactors = factors.filter((factor) => factor.status === "verified" && factor.evidenceCount > 0);
  const evidenceCoverage = clampScore(verifiedEvidenceFactors.reduce((total, factor) => total + factor.weight, 0) / totalWeight * 100);
  const scorableFactors = factors.filter(
    (factor): factor is MemberScoreFactor & { value: number } => factor.status === "verified" && factor.value !== null
  );
  const scorableWeight = scorableFactors.reduce((total, factor) => total + factor.weight, 0);
  const scoreIsEligible = scorableFactors.length >= minimumScoredCategories && scorableWeight >= minimumScoredWeight;
  const overallScore = scoreIsEligible
    ? weightedAverage(scorableFactors.map((factor) => ({ value: factor.value, weight: factor.weight })))
    : null;

  return {
    constituentAlignment: alignment,
    coveredFactorCount: verifiedEvidenceFactors.length,
    evidenceCoverage,
    evidenceRecordCount: factors.reduce((total, factor) => total + factor.evidenceCount, 0),
    factors,
    methodologyLabel: publicBrand.accountabilityLabel,
    overallScore,
    scoreEligibilityDetail:
      `An overall score requires verified, scorable evidence in at least ${minimumScoredCategories} categories covering ${minimumScoredWeight}% of the model.`,
    status: overallScore === null ? "preliminary" : "verified",
    summary:
      "An evidence-first public-record summary. Missing, planned, or unverified inputs never receive points, and personal issue interests are kept separate from the accountability score.",
    totalFactorCount: factors.length
  };
}
