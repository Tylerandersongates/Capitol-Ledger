import { getAccountLedger } from "@/lib/account-ledger";
import { getAccountProfile } from "@/lib/account-profile";
import { getAccountSubscription } from "@/lib/account-subscription";
import { getAccountPersistenceUserId, readLedgerFromDatabase, readProfileFromDatabase, readSubscriptionFromDatabase } from "@/lib/account-database";
import { publicBrandName } from "@/lib/brand";
import {
  getAllMembers,
  getBill,
  getBillStatus,
  getDashboardData,
  getMember,
  getMemberVotes,
  getRecentUpdates
} from "@/lib/data";
import { getEffectiveSubscriptionForAccountUser } from "@/lib/effective-account-subscription";
import { fetchGdeltDailyBriefItems, type GdeltDailyBriefArticle } from "@/lib/gdelt/client";
import { subscriptionPlans } from "@/lib/subscription-plans";
import { formatDate } from "@/lib/utils";
import type { AuthUser } from "@/lib/auth-database";
import type { AccountLedgerSnapshot, AccountProfileSnapshot, AccountSubscriptionSnapshot, Bill, Member } from "@/types/capitol";

export type WeeklyBriefUpdate = {
  body: string;
  href: string;
  id: string;
  label: string;
  sourceUrl?: string;
  title: string;
  unread: boolean;
};

export type DailyBriefSourceItem = {
  body: string;
  href: string;
  id: string;
  issueMatches: string[];
  label: "Official update" | "Story signal";
  sourceKind: "gdelt-media" | "official" | "watch-lane";
  sourceName: string;
  sourceUrl?: string;
  title: string;
};

export type DailyBriefRecommendation = {
  href: string;
  id: string;
  kind: "vote" | "bill" | "official";
  label: "Vote" | "Bill" | "Official";
  next: string;
  sourceUrl: string;
  title: string;
  whatHappened: string;
  whySelected: string;
};

export type DailyBriefEditorialOverride = {
  billId?: string;
  billRationale?: string;
  officialId?: string;
  officialRationale?: string;
  voteId?: string;
  voteRationale?: string;
};

export type DailyBriefMovement = {
  body: string;
  href: string;
  id: string;
  label: "Bill" | "Official";
  occurredAt: string;
  sourceUrl?: string;
  title: string;
};

export type WeeklyBriefSnapshot = {
  actionItems: Array<{
    body: string;
    href: string;
    label: string;
  }>;
  cadence: string;
  delivery: {
    channel: string;
    enabled: boolean;
    nextDelivery: string;
    note: string;
    status: "ready" | "paused";
  };
  district: {
    code: string;
    label: string;
    state: string;
  };
  generatedAt: string;
  lens: {
    body: string;
    bullets: string[];
    headline: string;
  };
  metrics: {
    activeBills: number;
    majorStoryMatches: number;
    policyInterests: number;
    savedRecords: number;
    unreadAlerts: number;
  };
  plan: {
    id: AccountSubscriptionSnapshot["plan"];
    label: string;
  };
  priorityUpdates: WeeklyBriefUpdate[];
  sourceDigest: {
    items: DailyBriefSourceItem[];
    summary: string;
    title: string;
  };
  title: string;
  watchlist: {
    bills: Array<{
      href: string;
      id: string;
      latestActionDate: string;
      latestActionText: string;
      sourceUrl: string;
      status: string;
      title: string;
    }>;
    interests: string[];
    officials: Array<{
      href: string;
      id: string;
      latestActivityDate?: string;
      latestActivityText?: string;
      sourceUrl: string;
      title: string;
    }>;
  };
  watchlistMovement: {
    items: DailyBriefMovement[];
    summary: string;
  };
  watchToday: DailyBriefRecommendation[];
  worthCheckingNext: Array<{
    body: string;
    href: string;
    label: string;
  }>;
  writtenSummary: {
    headline: string;
    nextStep: string;
    paragraphs: string[];
    sourceNote: string;
  };
  yesterdayInPolitics: DailyBriefSourceItem[];
};

const defaultCadence = "Daily at 8:00 AM";

function normalizeInterest(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function interestMatchesBill(interest: string, bill: Bill) {
  const normalizedInterest = normalizeInterest(interest);
  const searchable = normalizeInterest([bill.policyArea, bill.title, bill.shortTitle, bill.summary].join(" "));

  if (!normalizedInterest) return false;
  if (searchable.includes(normalizedInterest)) return true;
  if (normalizedInterest.includes("healthcare") && searchable.includes("health")) return true;
  if (normalizedInterest.includes("education") && searchable.includes("childcare")) return true;
  if (normalizedInterest.includes("infrastructure") && searchable.includes("infrastructure")) return true;
  if (normalizedInterest.includes("veterans") && searchable.includes("veterans")) return true;
  if (normalizedInterest.includes("public safety") && searchable.includes("homeland")) return true;

  return false;
}

function uniqueBills(values: Bill[]) {
  const seen = new Set<string>();
  return values.filter((bill) => {
    if (seen.has(bill.id)) return false;
    seen.add(bill.id);
    return true;
  });
}

function uniqueMembers(values: Member[]) {
  const seen = new Set<string>();
  return values.filter((member) => {
    if (seen.has(member.bioguideId)) return false;
    seen.add(member.bioguideId);
    return true;
  });
}

function resolveWatchlistBills(ledger: AccountLedgerSnapshot) {
  const savedBills = ledger.follows
    .filter((record) => record.type === "bill")
    .map((record) => getBill(record.id))
    .filter((bill): bill is Bill => Boolean(bill));
  const dashboard = getDashboardData();
  const fallbackBills = [dashboard.trackedBill, dashboard.recentVote?.bill].filter((bill): bill is Bill => Boolean(bill));

  return uniqueBills([...savedBills, ...fallbackBills]).slice(0, 3);
}

function resolveWatchlistOfficials(ledger: AccountLedgerSnapshot) {
  const savedOfficials = ledger.follows
    .filter((record) => record.type === "member")
    .map((record) => getMember(record.id))
    .filter((member): member is Member => Boolean(member));

  return uniqueMembers(savedOfficials).slice(0, 3);
}

function resolveInterestBills(ledger: AccountLedgerSnapshot, watchlistBills: Bill[]) {
  const interestMatches = ledger.issueInterests.flatMap((interest) =>
    watchlistBills.filter((bill) => interestMatchesBill(interest, bill))
  );

  return uniqueBills([...interestMatches, ...watchlistBills]).slice(0, 3);
}

function matchingInterests(ledger: AccountLedgerSnapshot, bill?: Bill) {
  if (!bill) return [];
  return ledger.issueInterests.filter((interest) => interestMatchesBill(interest, bill));
}

function profileDistrict(profile: AccountProfileSnapshot) {
  const match = profile.districtCode?.trim().toUpperCase().match(/^([A-Z]{2})-(\d{1,2}|AL)$/);
  if (!match) return null;
  return { district: match[2], state: match[1] };
}

function selectOfficial(
  ledger: AccountLedgerSnapshot,
  profile: AccountProfileSnapshot,
  watchlistBills: Bill[],
  override?: DailyBriefEditorialOverride
): { member: Member; relatedBill?: Bill; whySelected: string } | undefined {
  const editorialMember = override?.officialId ? getMember(override.officialId) : undefined;
  if (editorialMember) {
    return {
      member: editorialMember,
      whySelected: override?.officialRationale?.trim() || "CapitolWonk editors selected this official for today's watch."
    };
  }

  const followed = resolveWatchlistOfficials(ledger);
  if (followed[0]) {
    return {
      member: followed[0],
      whySelected: "You follow this official."
    };
  }

  const district = profileDistrict(profile);
  if (district) {
    const activeMembers = getAllMembers().filter((member) => member.active && member.state === district.state);
    const districtMember = activeMembers.find((member) => member.chamber === "House" && member.district === district.district);
    if (districtMember) {
      return {
        member: districtMember,
        whySelected: `This official represents ${district.state}-${district.district}, your saved district.`
      };
    }

    const senator = activeMembers.find((member) => member.chamber === "Senate");
    if (senator) {
      return {
        member: senator,
        whySelected: `This official represents ${senator.state} in the Senate, matching your saved state.`
      };
    }
  }

  const selectedBill = resolveInterestBills(ledger, watchlistBills)[0];
  const sponsor = selectedBill?.sponsorBioguideId ? getMember(selectedBill.sponsorBioguideId) : undefined;
  if (sponsor && selectedBill) {
    return {
      member: sponsor,
      relatedBill: selectedBill,
      whySelected: `This official is the sponsor listed on today's selected bill, ${selectedBill.displayNumber}.`
    };
  }

  const selectedVote = selectVote(ledger, override?.voteId);
  const voteMember = selectedVote?.memberBioguideIds.map((id) => getMember(id)).find((member): member is Member => Boolean(member));
  if (!voteMember || !selectedVote) return undefined;

  return {
    member: voteMember,
    whySelected: "This official appears in today's selected roll-call record."
  };
}

function scoreVote(
  entry: ReturnType<typeof getDashboardData>["voteFeed"][number],
  ledger: AccountLedgerSnapshot
) {
  const followedBillIds = new Set(ledger.follows.filter((record) => record.type === "bill").map((record) => record.id));
  const followedMemberIds = new Set(ledger.follows.filter((record) => record.type === "member").map((record) => record.id));
  const followedMemberMatch = entry.memberBioguideIds.some((id) => followedMemberIds.has(id));

  return (entry.bill && followedBillIds.has(entry.bill.id) ? 6 : 0) + matchingInterests(ledger, entry.bill).length * 3 + (followedMemberMatch ? 2 : 0);
}

function selectVote(ledger: AccountLedgerSnapshot, overrideVoteId?: string) {
  const voteFeed = getDashboardData().voteFeed;
  const editorialVote = overrideVoteId ? voteFeed.find((entry) => entry.vote.id === overrideVoteId) : undefined;
  if (editorialVote) return editorialVote;

  return [...voteFeed].sort((left, right) => {
    const scoreDelta = scoreVote(right, ledger) - scoreVote(left, ledger);
    if (scoreDelta) return scoreDelta;
    return Date.parse(right.vote.voteDate) - Date.parse(left.vote.voteDate);
  })[0];
}

function billNextSignal(bill: Bill) {
  const status = getBillStatus(bill);

  if (status === "In Committee") return "A hearing, markup, report, or other committee action may be the next formal signal.";
  if (status === "On Floor") return "Scheduling or a chamber vote may be the next formal signal.";
  if (status === "Passed") return "Action in the other chamber or at the executive stage may be the next formal signal.";
  if (status === "Enacted") return "Agency implementation and oversight may provide the next official updates.";
  return "A committee referral, sponsorship change, or other action may be the next formal signal.";
}

function buildVoteRecommendation(
  ledger: AccountLedgerSnapshot,
  override?: DailyBriefEditorialOverride
): DailyBriefRecommendation | null {
  const selected = selectVote(ledger, override?.voteId);
  if (!selected) return null;

  const { bill, totals, vote } = selected;
  const followedBill = bill && ledger.follows.some((record) => record.type === "bill" && record.id === bill.id);
  const issueMatches = matchingInterests(ledger, bill);
  const followedMemberIds = new Set(ledger.follows.filter((record) => record.type === "member").map((record) => record.id));
  const followedOfficialMatch = selected.memberBioguideIds.some((id) => followedMemberIds.has(id));
  const tally = totals.yes + totals.no + totals.present + totals.notVoting + totals.other
    ? ` The recorded tally was ${totals.yes} yes, ${totals.no} no, ${totals.present} present, and ${totals.notVoting} not voting.`
    : "";
  const whySelected = selected.vote.id === override?.voteId
    ? override.voteRationale?.trim() || "CapitolWonk editors selected this roll call for today's watch."
    : followedBill
    ? `You saved ${bill.displayNumber}, which is linked to this roll call.`
    : issueMatches.length
      ? `The linked bill matches ${issueMatches.slice(0, 2).join(" and ")} in your followed issues.`
      : followedOfficialMatch
        ? "At least one official you follow appears in this roll-call record."
        : "This is the most recent roll call available in the current official-record feed.";

  return {
    href: `/votes/${vote.id}`,
    id: `watch-vote-${vote.id}`,
    kind: "vote",
    label: "Vote",
    next: bill
      ? `Watch ${bill.displayNumber}'s official action history for what follows this vote.`
      : "Watch the official roll-call record for corrections or linked legislative action.",
    sourceUrl: vote.sourceUrl,
    title: bill?.shortTitle ?? `${vote.chamber} Roll Call ${vote.rollCall}`,
    whatHappened: `${vote.chamber} Roll Call ${vote.rollCall} was recorded as ${vote.result.toLowerCase()} on ${formatDate(vote.voteDate)}.${tally}`,
    whySelected
  };
}

function buildBillRecommendation(
  ledger: AccountLedgerSnapshot,
  watchlistBills: Bill[],
  override?: DailyBriefEditorialOverride
): DailyBriefRecommendation | null {
  const editorialBill = override?.billId ? getBill(override.billId) : undefined;
  const bill = editorialBill ?? resolveInterestBills(ledger, watchlistBills)[0];
  if (!bill) return null;

  const followed = ledger.follows.some((record) => record.type === "bill" && record.id === bill.id);
  const issueMatches = matchingInterests(ledger, bill);
  const whySelected = bill.id === override?.billId
    ? override.billRationale?.trim() || "CapitolWonk editors selected this bill for today's watch."
    : followed
    ? "You saved this bill to your watchlist."
    : issueMatches.length
      ? `It matches ${issueMatches.slice(0, 2).join(" and ")} in your followed issues.`
      : "It has one of the newest official actions in the current bill feed.";

  return {
    href: `/bills/${bill.id}`,
    id: `watch-bill-${bill.id}`,
    kind: "bill",
    label: "Bill",
    next: billNextSignal(bill),
    sourceUrl: bill.sourceUrl,
    title: `${bill.displayNumber} · ${bill.shortTitle}`,
    whatHappened: `${bill.latestActionText} The official record is dated ${formatDate(bill.latestActionDate)}.`,
    whySelected
  };
}

function buildOfficialRecommendation(
  ledger: AccountLedgerSnapshot,
  profile: AccountProfileSnapshot,
  watchlistBills: Bill[],
  override?: DailyBriefEditorialOverride
): DailyBriefRecommendation | null {
  const selection = selectOfficial(ledger, profile, watchlistBills, override);
  if (!selection) return null;

  const { member, relatedBill, whySelected } = selection;
  const voteRecord = [...getMemberVotes(member.bioguideId)].sort((left, right) =>
    Date.parse(right.vote?.voteDate ?? "0") - Date.parse(left.vote?.voteDate ?? "0")
  )[0];
  const whatHappened = relatedBill
    ? `The official bill record lists this member as sponsor of ${relatedBill.displayNumber}; its latest action is dated ${formatDate(relatedBill.latestActionDate)}.`
    : voteRecord?.vote
      ? `On ${formatDate(voteRecord.vote.voteDate)}, the official record lists a ${voteRecord.position.toLowerCase()} position on ${voteRecord.vote.question.toLowerCase()}.`
      : "No new action by this official was confirmed in the current brief; their public profile and record remain available to review.";

  return {
    href: `/members/${member.bioguideId}`,
    id: `watch-official-${member.bioguideId}`,
    kind: "official",
    label: "Official",
    next: "A roll call, sponsorship update, committee action, or official statement may be the next relevant signal.",
    sourceUrl: member.sourceUrl,
    title: member.fullName,
    whatHappened,
    whySelected
  };
}

function buildWatchToday(
  ledger: AccountLedgerSnapshot,
  profile: AccountProfileSnapshot,
  watchlistBills: Bill[],
  override?: DailyBriefEditorialOverride
) {
  return [
    buildVoteRecommendation(ledger, override),
    buildBillRecommendation(ledger, watchlistBills, override),
    buildOfficialRecommendation(ledger, profile, watchlistBills, override)
  ].filter((item): item is DailyBriefRecommendation => Boolean(item));
}

function issueMatchScore(issueMatches: string[], interests: string[]) {
  const normalizedInterests = interests.map(normalizeInterest);
  return issueMatches.filter((issue) => normalizedInterests.includes(normalizeInterest(issue))).length;
}

function formatSeenAt(value?: string) {
  if (!value) return "indexed in the previous 24-hour window";

  const formatted = formatDate(value);
  return formatted ? `seen ${formatted}` : "indexed in the previous 24-hour window";
}

function buildYesterdayInPolitics(
  ledger: AccountLedgerSnapshot,
  articles: GdeltDailyBriefArticle[]
): DailyBriefSourceItem[] {
  const seenTitles = new Set<string>();

  return [...articles]
    .sort((left, right) => {
      const matchDelta = issueMatchScore(right.issueMatches, ledger.issueInterests) - issueMatchScore(left.issueMatches, ledger.issueInterests);
      if (matchDelta) return matchDelta;
      return Date.parse(right.seenAt ?? "0") - Date.parse(left.seenAt ?? "0");
    })
    .filter((article) => {
      const key = normalizeInterest(article.title);
      if (!key || seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    })
    .slice(0, 3)
    .map((article) => ({
      body: `${article.domain} coverage was ${formatSeenAt(article.seenAt)}. This is media context, not a verified official finding.`,
      href: article.url,
      id: article.id,
      issueMatches: article.issueMatches,
      label: "Story signal" as const,
      sourceKind: "gdelt-media" as const,
      sourceName: article.domain,
      sourceUrl: article.url,
      title: article.title
    }));
}

function buildPriorityUpdates(ledger: AccountLedgerSnapshot): WeeklyBriefUpdate[] {
  const dashboard = getDashboardData();
  const readAlerts = new Set(ledger.readAlerts);
  const recentVote = dashboard.recentVote?.vote;
  const voteUpdate: WeeklyBriefUpdate | null = recentVote
    ? {
        body: `${recentVote.chamber} Roll Call ${recentVote.rollCall} was recorded as ${recentVote.result.toLowerCase()}.`,
        href: `/votes/${recentVote.id}`,
        id: "system-vote-reminder",
        label: "Vote",
        sourceUrl: recentVote.sourceUrl,
        title: recentVote.question,
        unread: !readAlerts.has("system-vote-reminder")
      }
    : null;

  const eventUpdates = getRecentUpdates().map((event) => {
    const bill = event.targetType === "bill" ? getBill(event.targetId) : undefined;
    const member = event.targetType === "member" ? getMember(event.targetId) : undefined;

    return {
      body: event.body,
      href: bill ? `/bills/${bill.id}` : member ? `/members/${member.bioguideId}` : "/search",
      id: event.id,
      label: event.targetType === "bill" ? "Bill" : "Official",
      sourceUrl: event.sourceUrl,
      title: event.title,
      unread: !readAlerts.has(event.id)
    };
  });

  return [voteUpdate, ...eventUpdates].filter((update): update is WeeklyBriefUpdate => Boolean(update)).slice(0, 4);
}

function buildWatchlistSnapshot(watchlistBills: Bill[], watchlistOfficials: Member[]): WeeklyBriefSnapshot["watchlist"] {
  return {
    bills: watchlistBills.map((bill) => ({
      href: `/bills/${bill.id}`,
      id: bill.id,
      latestActionDate: bill.latestActionDate,
      latestActionText: bill.latestActionText,
      sourceUrl: bill.sourceUrl,
      status: getBillStatus(bill),
      title: `${bill.displayNumber} ${bill.shortTitle}`
    })),
    interests: [],
    officials: watchlistOfficials.map((member) => {
      const latestVote = [...getMemberVotes(member.bioguideId)].sort((left, right) =>
        Date.parse(right.vote?.voteDate ?? "0") - Date.parse(left.vote?.voteDate ?? "0")
      )[0];

      return {
        href: `/members/${member.bioguideId}`,
        id: member.bioguideId,
        latestActivityDate: latestVote?.vote?.voteDate,
        latestActivityText: latestVote?.vote
          ? `${latestVote.position} on ${latestVote.vote.question}`
          : undefined,
        sourceUrl: member.sourceUrl,
        title: member.fullName
      };
    })
  };
}

function buildWatchlistMovement({
  currentWatchlist,
  generatedAt,
  previousBrief
}: {
  currentWatchlist: WeeklyBriefSnapshot["watchlist"];
  generatedAt: string;
  previousBrief?: WeeklyBriefSnapshot;
}): WeeklyBriefSnapshot["watchlistMovement"] {
  if (!previousBrief) {
    return {
      items: [],
      summary: "This is the first comparable brief, so there is no prior snapshot to measure against yet."
    };
  }

  const previousBills = new Map(previousBrief.watchlist.bills.map((bill) => [bill.id, bill]));
  const previousOfficials = new Map(previousBrief.watchlist.officials.map((official) => [official.id, official]));
  const billMovements: DailyBriefMovement[] = currentWatchlist.bills.flatMap((bill) => {
    const previous = previousBills.get(bill.id);
    if (!previous) {
      return [{
        body: "This bill entered your brief's watchlist since the prior edition.",
        href: bill.href,
        id: `movement-bill-added-${bill.id}`,
        label: "Bill" as const,
        occurredAt: bill.latestActionDate || generatedAt,
        sourceUrl: bill.sourceUrl,
        title: bill.title
      }];
    }
    if (
      previous.latestActionDate === bill.latestActionDate &&
      previous.latestActionText === bill.latestActionText &&
      previous.status === bill.status
    ) return [];

    return [{
      body: `${bill.latestActionText} Current status: ${bill.status}.`,
      href: bill.href,
      id: `movement-bill-${bill.id}-${bill.latestActionDate}`,
      label: "Bill" as const,
      occurredAt: bill.latestActionDate || generatedAt,
      sourceUrl: bill.sourceUrl,
      title: bill.title
    }];
  });
  const officialMovements: DailyBriefMovement[] = currentWatchlist.officials.flatMap((official) => {
    const previous = previousOfficials.get(official.id);
    if (!previous) {
      return [{
        body: "This official entered your brief's watchlist since the prior edition.",
        href: official.href,
        id: `movement-official-added-${official.id}`,
        label: "Official" as const,
        occurredAt: official.latestActivityDate || generatedAt,
        sourceUrl: official.sourceUrl,
        title: official.title
      }];
    }
    if (
      previous.latestActivityDate === official.latestActivityDate &&
      previous.latestActivityText === official.latestActivityText
    ) return [];

    return [{
      body: official.latestActivityText || "The latest recorded activity for this official changed.",
      href: official.href,
      id: `movement-official-${official.id}-${official.latestActivityDate ?? generatedAt}`,
      label: "Official" as const,
      occurredAt: official.latestActivityDate || generatedAt,
      sourceUrl: official.sourceUrl,
      title: official.title
    }];
  });
  const items = [...billMovements, ...officialMovements]
    .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))
    .slice(0, 3);

  return {
    items,
    summary: items.length
      ? `${items.length} meaningful watchlist change${items.length === 1 ? "" : "s"} appeared since the prior brief.`
      : "Nothing meaningful changed in your followed bills, officials, issues, or district since the prior brief."
  };
}

function buildWorthCheckingNext({
  ledger,
  profile,
  unreadAlerts,
  watchToday
}: {
  ledger: AccountLedgerSnapshot;
  profile: AccountProfileSnapshot;
  unreadAlerts: number;
  watchToday: DailyBriefRecommendation[];
}) {
  const actions: WeeklyBriefSnapshot["worthCheckingNext"] = [];

  if (unreadAlerts) {
    actions.push({
      body: `${unreadAlerts} unread official-record update${unreadAlerts === 1 ? " is" : "s are"} ready for review.`,
      href: "/alerts?filter=unread",
      label: "Review unread updates"
    });
  } else if (watchToday[0]) {
    actions.push({
      body: `Open the source-linked ${watchToday[0].label.toLowerCase()} record behind today's first watch item.`,
      href: watchToday[0].href,
      label: `Review the ${watchToday[0].label.toLowerCase()}`
    });
  }

  if (!profileDistrict(profile)) {
    actions.push({
      body: "Add your congressional district to improve official and local relevance.",
      href: "/onboarding",
      label: "Add your district"
    });
  } else if (!ledger.follows.length && !ledger.issueInterests.length) {
    actions.push({
      body: "Follow a bill, official, or issue to make tomorrow's selections more personal.",
      href: "/search",
      label: "Build your watchlist"
    });
  } else {
    const secondWatch = watchToday[1] ?? watchToday[0];
    if (secondWatch) {
      actions.push({
        body: `Check the official source and latest status for ${secondWatch.title}.`,
        href: secondWatch.href,
        label: "Check the next record"
      });
    }
  }

  return actions.slice(0, 2);
}

function buildLens(watchToday: DailyBriefRecommendation[]) {
  const first = watchToday[0];
  return {
    headline: first?.title ?? "Your civic watch is ready",
    body: first?.whatHappened ?? `Add a bill, official, issue, or district so ${publicBrandName} can assemble a more personal brief.`,
    bullets: watchToday.map((item) => `${item.label}: ${item.whySelected}`)
  };
}

function buildWrittenSummary({
  district,
  watchToday,
  watchlistMovement,
  worthCheckingNext,
  yesterdayInPolitics
}: {
  district: string;
  watchToday: DailyBriefRecommendation[];
  watchlistMovement: WeeklyBriefSnapshot["watchlistMovement"];
  worthCheckingNext: WeeklyBriefSnapshot["worthCheckingNext"];
  yesterdayInPolitics: DailyBriefSourceItem[];
}): WeeklyBriefSnapshot["writtenSummary"] {
  return {
    headline: `Today's read for ${district}`,
    nextStep: worthCheckingNext[0]?.body ?? "Review the official records linked from today's watch items.",
    paragraphs: [
      watchToday.length
        ? `${watchToday.length} item${watchToday.length === 1 ? "" : "s"} stand out to watch today: ${watchToday.map((item) => item.label.toLowerCase()).join(", ")}.`
        : "No personalized watch items are available yet.",
      yesterdayInPolitics.length
        ? `${yesterdayInPolitics.length} media-reported topic${yesterdayInPolitics.length === 1 ? "" : "s"} add context; official records remain the source of truth. ${watchlistMovement.summary}`
        : `No media topics cleared the latest 24-hour selection. ${watchlistMovement.summary}`
    ],
    sourceNote: "Built from your district, saved watchlist, followed issues, official bill and vote records, and a clearly labeled 24-hour media scan."
  };
}

export function buildWeeklyBrief({
  editorialOverride,
  gdeltArticles = [],
  generatedAt = new Date().toISOString(),
  ledger,
  previousBrief,
  profile,
  subscription
}: {
  editorialOverride?: DailyBriefEditorialOverride;
  gdeltArticles?: GdeltDailyBriefArticle[];
  generatedAt?: string;
  ledger: AccountLedgerSnapshot;
  previousBrief?: WeeklyBriefSnapshot;
  profile: AccountProfileSnapshot;
  subscription: AccountSubscriptionSnapshot;
}): WeeklyBriefSnapshot {
  const dashboard = getDashboardData();
  const watchlistBills = resolveWatchlistBills(ledger);
  const watchlistOfficials = resolveWatchlistOfficials(ledger);
  const priorityUpdates = buildPriorityUpdates(ledger);
  const unreadAlerts = priorityUpdates.filter((update) => update.unread).length;
  const watchToday = buildWatchToday(ledger, profile, watchlistBills, editorialOverride);
  const yesterdayInPolitics = buildYesterdayInPolitics(ledger, gdeltArticles);
  const watchlist = buildWatchlistSnapshot(watchlistBills, watchlistOfficials);
  watchlist.interests = ledger.issueInterests.slice(0, 6);
  const watchlistMovement = buildWatchlistMovement({ currentWatchlist: watchlist, generatedAt, previousBrief });
  const worthCheckingNext = buildWorthCheckingNext({ ledger, profile, unreadAlerts, watchToday });
  const districtCode = profile.districtCode || "Your district";
  const sourceDigest = {
    items: yesterdayInPolitics,
    summary: yesterdayInPolitics.length
      ? `${yesterdayInPolitics.length} media-reported federal politics topic${yesterdayInPolitics.length === 1 ? "" : "s"} from the previous 24-hour scan.`
      : "No media topics cleared the previous 24-hour selection.",
    title: "Yesterday in politics"
  };

  return {
    actionItems: worthCheckingNext,
    cadence: defaultCadence,
    delivery: {
      channel: "In app",
      enabled: profile.notificationPreferences.weeklyBrief,
      nextDelivery: "Tomorrow in app",
      note: profile.notificationPreferences.weeklyBrief
        ? `This brief stays inside ${publicBrandName} and refreshes daily.`
        : "Your brief stays available here. Turn on brief alerts if you want a daily reminder.",
      status: profile.notificationPreferences.weeklyBrief ? "ready" : "paused"
    },
    district: {
      code: districtCode,
      label: profile.districtLabel || districtCode,
      state: profile.districtState || profileDistrict(profile)?.state || ""
    },
    generatedAt,
    lens: buildLens(watchToday),
    metrics: {
      activeBills: dashboard.billsInAction,
      majorStoryMatches: yesterdayInPolitics.length,
      policyInterests: ledger.issueInterests.length,
      savedRecords: ledger.follows.length + ledger.savedAlerts.length,
      unreadAlerts
    },
    plan: {
      id: subscription.plan,
      label: subscriptionPlans[subscription.plan].name
    },
    priorityUpdates,
    sourceDigest,
    title: "Daily Brief",
    watchlist,
    watchlistMovement,
    watchToday,
    worthCheckingNext,
    writtenSummary: buildWrittenSummary({
      district: districtCode,
      watchToday,
      watchlistMovement,
      worthCheckingNext,
      yesterdayInPolitics
    }),
    yesterdayInPolitics
  };
}

export async function getWeeklyBriefForUser(
  user: AuthUser,
  {
    editorialOverride,
    generatedAt,
    previousBrief
  }: {
    editorialOverride?: DailyBriefEditorialOverride;
    generatedAt?: string;
    previousBrief?: WeeklyBriefSnapshot;
  } = {}
) {
  const accountUserId = await getAccountPersistenceUserId(user).catch(() => user.id);

  const [databaseLedger, databaseProfile, databaseSubscription] = await Promise.all([
    readLedgerFromDatabase(accountUserId).catch(() => null),
    readProfileFromDatabase(accountUserId).catch(() => null),
    readSubscriptionFromDatabase(accountUserId).catch(() => null)
  ]);

  const ledger = databaseLedger ?? getAccountLedger(accountUserId);
  const profile = databaseProfile ?? getAccountProfile(accountUserId);
  const personalSubscription = databaseSubscription ?? getAccountSubscription(accountUserId);
  const [subscription, gdeltArticles] = await Promise.all([
    getEffectiveSubscriptionForAccountUser(user, personalSubscription).catch(() => personalSubscription),
    fetchGdeltDailyBriefItems({ interests: ledger.issueInterests }).catch(() => [])
  ]);

  return buildWeeklyBrief({
    editorialOverride,
    gdeltArticles,
    generatedAt,
    ledger,
    previousBrief,
    profile,
    subscription
  });
}

export function formatBriefGeneratedAt(value: string) {
  return formatDate(value);
}
