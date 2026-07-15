import { currentCongressLabel } from "@/lib/utils";
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
  key: "voting" | "publicEngagement" | "legislativeActivity" | "ethics" | "constituentAlignment";
  label: string;
  status: "source-linked" | "partial" | "planned";
  value: number;
  weight: number;
};

export type AlignmentComponent = {
  detail: string;
  label: "Poll Average" | "Vote Alignment" | "Public Positioning" | "Time in Office";
  value: number;
  weight: number;
};

export type AlignmentTopicBreakdown = {
  pollAverage: number;
  publicPositioning: number;
  signalCount: number;
  timeInOffice: number;
  topic: IssueTopic;
  topicScore: number;
  voteAlignment: number;
};

export type ConstituentAlignmentModel = {
  components: AlignmentComponent[];
  note: string;
  selectedTopics: IssueTopic[];
  topics: AlignmentTopicBreakdown[];
  viewerState: string;
};

export type MemberScoreModel = {
  constituentAlignment: ConstituentAlignmentModel;
  factors: MemberScoreFactor[];
  methodologyLabel: string;
  overallScore: number;
  rating: string;
  summary: string;
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

const defaultAlignmentTopics: IssueTopic[] = ["Economy", "Healthcare", "Education", "Infrastructure", "Veterans Affairs", "Environment", "Public Safety", "Immigration"];

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

const statePollAverages: Record<string, Partial<Record<IssueTopic, number>>> = {
  AZ: {
    Economy: 67,
    Education: 61,
    Healthcare: 64,
    Immigration: 71,
    Infrastructure: 60,
    "Public Safety": 66
  },
  CA: {
    Economy: 63,
    Education: 66,
    Environment: 69,
    Healthcare: 67,
    Infrastructure: 64,
    "Public Safety": 61
  },
  MA: {
    Economy: 62,
    Education: 68,
    Environment: 70,
    Healthcare: 69,
    Infrastructure: 63,
    "Public Safety": 60
  },
  NY: {
    Economy: 64,
    Education: 67,
    Environment: 68,
    Healthcare: 68,
    Infrastructure: 65,
    "Public Safety": 62
  },
  TX: {
    Economy: 68,
    Education: 59,
    Healthcare: 61,
    Immigration: 73,
    Infrastructure: 58,
    "Public Safety": 69
  }
};

const nationalPollBaseline: Record<IssueTopic, number> = {
  Economy: 65,
  Education: 63,
  Environment: 61,
  Healthcare: 66,
  Immigration: 60,
  Infrastructure: 62,
  "Public Safety": 64,
  "Veterans Affairs": 71
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function weightedAverage(values: Array<{ value: number; weight: number }>) {
  const totalWeight = values.reduce((total, item) => total + item.weight, 0);
  if (!totalWeight) return 0;
  return clampScore(values.reduce((total, item) => total + item.value * item.weight, 0) / totalWeight);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function ratingForScore(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Very Good";
  if (score >= 55) return "Good";
  return "Needs More Data";
}

function normalizeStateCode(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^[A-Z]{2}$/.test(trimmed.toUpperCase())) return trimmed.toUpperCase();

  const upper = trimmed.toLowerCase();
  if (upper.includes("arizona")) return "AZ";
  if (upper.includes("california")) return "CA";
  if (upper.includes("massachusetts")) return "MA";
  if (upper.includes("new york")) return "NY";
  if (upper.includes("texas")) return "TX";
  if (upper.includes("vermont")) return "VT";

  const district = upper.match(/\b([a-z]{2})-\d{1,2}\b/i)?.[1];
  return district?.toUpperCase();
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

  if (resolved.length) return Array.from(new Set(resolved));
  return defaultAlignmentTopics;
}

function pollAverageForTopic(state: string, topic: IssueTopic) {
  const stateValue = statePollAverages[state]?.[topic];
  return stateValue ?? nationalPollBaseline[topic];
}

function containsTopicText(text: string, topic: IssueTopic) {
  const normalized = text.toLowerCase();
  return topicKeywords[topic].some((keyword) => normalized.includes(keyword));
}

function positionAlignmentScore(position: MemberVoteRecord["position"], pollAverage: number) {
  const majoritySupportsAction = pollAverage >= 50;

  if (majoritySupportsAction) {
    if (position === "Yes") return 92;
    if (position === "No") return 28;
    if (position === "Present") return 52;
    return 37;
  }

  if (position === "No") return 90;
  if (position === "Yes") return 32;
  if (position === "Present") return 55;
  return 41;
}

function currentCongressNumber() {
  const parsed = Number.parseInt(currentCongressLabel().replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 119;
}

function termStartCongress(term: string) {
  const parsed = Number.parseInt(term.replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function tenureScore(member: Member, linkedVoteCount: number, sponsoredCount: number) {
  const currentCongress = currentCongressNumber();
  const startCongress = termStartCongress(member.term);
  const estimatedYears = startCongress ? Math.max(2, (currentCongress - startCongress + 1) * 2) : member.chamber === "Senate" ? 6 : 4;
  const chamberBase = member.chamber === "Senate" ? 63 : 60;
  const experienceBoost = Math.min(20, estimatedYears * 1.8);
  const recordBoost = Math.min(11, linkedVoteCount * 1.2) + Math.min(7, sponsoredCount * 1.1);
  return clampScore(chamberBase + experienceBoost + recordBoost);
}

function buildConstituentAlignment({
  caucusMemberships,
  cosponsoredBills,
  member,
  memberVotes,
  sponsoredBills,
  viewerIssueInterests = []
}: Required<Omit<MemberScoreInput, "context">> &
  MemberScoreContext) {
  const viewerState = normalizeStateCode(member.state) ?? member.state;
  const selectedTopics = normalizeViewerTopics(viewerIssueInterests);
  const linkedVoteCount = memberVotes.filter((record) => record.vote).length;
  const tenure = tenureScore(member, linkedVoteCount, sponsoredBills.length);
  const leadershipCount = caucusMemberships.filter((membership) => membership.role !== "Member").length;

  const topicBreakdown: AlignmentTopicBreakdown[] = selectedTopics.map((topic) => {
    const pollAverage = pollAverageForTopic(viewerState, topic);

    const voteScores = memberVotes
      .filter((record) => {
        const vote = record.vote;
        if (!vote) return false;
        const voteText = `${vote.question} ${vote.explanation}`;
        return containsTopicText(voteText, topic);
      })
      .map((record) => positionAlignmentScore(record.position, pollAverage));

    const sponsoredHits = sponsoredBills.filter((bill) => containsTopicText(`${bill.title} ${bill.shortTitle} ${bill.policyArea}`, topic)).length;
    const cosponsoredHits = cosponsoredBills.filter((bill) => containsTopicText(`${bill.title} ${bill.shortTitle} ${bill.policyArea}`, topic)).length;
    const caucusHits = caucusMemberships.filter((membership) => containsTopicText(`${membership.caucusName} ${membership.role}`, topic)).length;
    const statementHits = memberVotes.filter((record) => {
      const vote = record.vote;
      if (!vote) return false;
      const explanation = vote.explanation?.trim() ?? "";
      if (explanation.length < 18) return false;
      return containsTopicText(explanation, topic);
    }).length;
    const publicPositioning = clampScore(
      46 +
        (member.officialUrl ? 8 : 0) +
        Math.min(18, sponsoredHits * 7) +
        Math.min(14, cosponsoredHits * 4) +
        Math.min(11, caucusHits * 4) +
        Math.min(10, statementHits * 3) +
        Math.min(8, leadershipCount * 2)
    );
    const voteAlignment = voteScores.length ? clampScore(average(voteScores)) : clampScore(50 + Math.min(14, linkedVoteCount * 1.5));
    const topicScore = weightedAverage([
      { value: pollAverage, weight: 40 },
      { value: voteAlignment, weight: 35 },
      { value: publicPositioning, weight: 15 },
      { value: tenure, weight: 10 }
    ]);

    return {
      pollAverage,
      publicPositioning,
      signalCount: voteScores.length + sponsoredHits + cosponsoredHits + caucusHits + statementHits,
      timeInOffice: tenure,
      topic,
      topicScore,
      voteAlignment
    };
  });

  const components: AlignmentComponent[] = [
    {
      detail: `Averaged issue support in ${viewerState} from poll snapshots by topic.`,
      label: "Poll Average",
      value: clampScore(average(topicBreakdown.map((topic) => topic.pollAverage))),
      weight: 40
    },
    {
      detail: "Compares roll-call vote positions on matched-topic legislation.",
      label: "Vote Alignment",
      value: clampScore(average(topicBreakdown.map((topic) => topic.voteAlignment))),
      weight: 35
    },
    {
      detail: "Looks at sponsorships, cosponsorships, caucus roles, public statements, and official profile signals.",
      label: "Public Positioning",
      value: clampScore(average(topicBreakdown.map((topic) => topic.publicPositioning))),
      weight: 15
    },
    {
      detail: "Uses current Congress tenure plus voting/sponsorship activity consistency.",
      label: "Time in Office",
      value: tenure,
      weight: 10
    }
  ];

  return {
    components,
    note:
      "Prototype model: poll inputs are currently curated snapshots for demo use. Replace with live poll ingestion before public launch.",
    selectedTopics,
    topics: topicBreakdown,
    viewerState
  };
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
  const notVotingCount = memberVotes.filter((record) => record.position === "Not Voting").length;
  const sponsoredCount = sponsoredBills.length;
  const cosponsoredCount = cosponsoredBills.length;
  const caucusCount = caucusMemberships.length;
  const leadershipCount = caucusMemberships.filter((membership) => membership.role !== "Member").length;
  const hasOfficialSource = Boolean(member.sourceUrl || member.officialUrl);
  const hasPhoto = Boolean(member.photoUrl);
  const alignment = buildConstituentAlignment({
    caucusMemberships,
    cosponsoredBills,
    member,
    memberVotes,
    sponsoredBills,
    viewerIssueInterests: context?.viewerIssueInterests ?? []
  });
  const constituentAlignmentScore = weightedAverage(alignment.components);

  const votingPenalty = linkedVoteCount ? Math.min(10, (notVotingCount / linkedVoteCount) * 10) : 0;
  const votingRecord = clampScore(66 + Math.min(24, linkedVoteCount * 4) - votingPenalty);
  const publicEngagement = clampScore(
    62 + (hasOfficialSource ? 10 : 0) + (hasPhoto ? 3 : 0) + Math.min(16, caucusCount * 2) + Math.min(7, leadershipCount * 2)
  );
  const legislativeActivity = clampScore(60 + Math.min(20, sponsoredCount * 6) + Math.min(12, cosponsoredCount * 2));
  const ethics = clampScore(80 + (hasOfficialSource ? 5 : 0) + (member.active ? 4 : 0));

  const factors: MemberScoreFactor[] = [
    {
      detail: `${linkedVoteCount} linked roll-call vote${linkedVoteCount === 1 ? "" : "s"}${notVotingCount ? `, ${notVotingCount} not-voting record${notVotingCount === 1 ? "" : "s"}` : ""}.`,
      evidence: "Roll-call vote records",
      key: "voting",
      label: "Voting Record",
      status: linkedVoteCount ? "source-linked" : "partial",
      value: votingRecord,
      weight: 25
    },
    {
      detail: `${caucusCount} caucus role${caucusCount === 1 ? "" : "s"}${leadershipCount ? `, ${leadershipCount} leadership role${leadershipCount === 1 ? "" : "s"}` : ""}.`,
      evidence: "Official profile and caucus records",
      key: "publicEngagement",
      label: "Public Engagement",
      status: caucusCount || hasOfficialSource ? "source-linked" : "partial",
      value: publicEngagement,
      weight: 15
    },
    {
      detail: `${sponsoredCount} sponsored bill${sponsoredCount === 1 ? "" : "s"} and ${cosponsoredCount} cosponsored bill${cosponsoredCount === 1 ? "" : "s"}.`,
      evidence: "Sponsored and cosponsored legislation",
      key: "legislativeActivity",
      label: "Sponsored Bills",
      status: sponsoredCount || cosponsoredCount ? "source-linked" : "partial",
      value: legislativeActivity,
      weight: 15
    },
    {
      detail:
        hasOfficialSource
          ? "Official identity source linked; financial disclosure and ethics feeds are planned."
          : "Official identity source pending; disclosure feeds are planned.",
      evidence: "Official identity and compliance sources",
      key: "ethics",
      label: "Ethics & Compliance",
      status: "planned",
      value: ethics,
      weight: 15
    },
    {
      detail: `${alignment.selectedTopics.length} issue topics from your profile were compared against poll averages (${alignment.viewerState}), vote positions, public signals, and tenure.`,
      evidence: "Issue polling snapshots, member vote records, sponsorship records, caucus roles, public statements",
      key: "constituentAlignment",
      label: "Constituent Alignment",
      status: "partial",
      value: constituentAlignmentScore,
      weight: 30
    }
  ];

  const overallScore = weightedAverage(factors.map((factor) => ({ value: factor.value, weight: factor.weight })));

  return {
    constituentAlignment: alignment,
    factors,
    methodologyLabel: publicBrand.accountabilityLabel,
    overallScore,
    rating: ratingForScore(overallScore),
    summary:
      "A nonpartisan weighted score based on source-linked civic activity plus a constituent alignment signal. It combines records quality with how closely legislative behavior matches issue priorities and poll sentiment."
  };
}
