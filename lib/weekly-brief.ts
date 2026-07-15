import { getAccountLedger } from "@/lib/account-ledger";
import { getAccountProfile } from "@/lib/account-profile";
import { getAccountSubscription } from "@/lib/account-subscription";
import { getAccountPersistenceUserId, readLedgerFromDatabase, readProfileFromDatabase, readSubscriptionFromDatabase } from "@/lib/account-database";
import { publicBrandName } from "@/lib/brand";
import { getBill, getBillStatus, getDashboardData, getMember, getRecentUpdates } from "@/lib/data";
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
      status: string;
      title: string;
    }>;
    interests: string[];
    officials: Array<{
      href: string;
      id: string;
      title: string;
    }>;
  };
  writtenSummary: {
    headline: string;
    nextStep: string;
    paragraphs: string[];
    sourceNote: string;
  };
};

const defaultCadence = "Daily at 8:00 AM";

const majorStoryCatalog: Array<{
  body: string;
  href: string;
  id: string;
  issueMatches: string[];
  sourceName: string;
  sourceUrl: string;
  title: string;
}> = [
  {
    body: "Track cost-of-living, budget, tax, and price-pressure coverage alongside official fiscal action.",
    href: "/search?type=bills&q=affordability",
    id: "major-story-affordability",
    issueMatches: ["Affordability", "Inflation", "Federal Budget Deficit", "Jobs"],
    sourceName: "Media story watch",
    sourceUrl: "https://www.gdeltproject.org/",
    title: "Cost-of-living politics"
  },
  {
    body: "Watch border, immigration, public safety, and homeland security coverage when those topics intersect with Congress or agency action.",
    href: "/search?type=bills&q=border%20security",
    id: "major-story-border-security",
    issueMatches: ["Border Security", "Public Safety"],
    sourceName: "Media + official action watch",
    sourceUrl: "https://www.gdeltproject.org/",
    title: "Border and public safety agenda"
  },
  {
    body: "Surface health cost, drug policy, coverage, and agency-rule stories when they match followed issues.",
    href: "/search?type=bills&q=healthcare",
    id: "major-story-healthcare",
    issueMatches: ["Healthcare", "Healthcare Affordability", "Drug Addiction"],
    sourceName: "Federal Register + media watch",
    sourceUrl: "https://www.federalregister.gov/developers/documentation/api/v1",
    title: "Healthcare affordability watch"
  },
  {
    body: "Follow school funding, workforce, infrastructure, and climate implementation updates with official links first.",
    href: "/search?type=bills&q=infrastructure",
    id: "major-story-public-investment",
    issueMatches: ["Education", "Infrastructure", "Climate Change", "Veterans Affairs"],
    sourceName: "Official source watch",
    sourceUrl: "https://api.congress.gov/",
    title: "Public investment and services"
  },
  {
    body: "Flag firearm, community safety, and emergency-response stories when coverage volume and official action both rise.",
    href: "/search?type=bills&q=gun%20violence",
    id: "major-story-gun-violence",
    issueMatches: ["Gun Violence", "Public Safety"],
    sourceName: "Media coverage watch",
    sourceUrl: "https://www.gdeltproject.org/",
    title: "Gun violence and safety"
  }
];

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

function issueMatchScore(issueMatches: string[], interests: string[]) {
  const normalizedInterests = interests.map(normalizeInterest);

  return issueMatches.filter((issue) => normalizedInterests.includes(normalizeInterest(issue))).length;
}

function formatSeenAt(value?: string) {
  if (!value) return "seen in the last day";

  const formatted = formatDate(value);
  return formatted ? `seen ${formatted}` : "seen in the last day";
}

function buildGdeltStoryItems(articles: GdeltDailyBriefArticle[]): DailyBriefSourceItem[] {
  return articles.map((article) => ({
    body: `${article.domain} coverage ${formatSeenAt(article.seenAt)} and matched to your followed issues through the U.S. politics filter.`,
    href: article.url,
    id: article.id,
    issueMatches: article.issueMatches,
    label: "Story signal" as const,
    sourceKind: "gdelt-media",
    sourceName: `GDELT: ${article.domain}`,
    sourceUrl: article.url,
    title: article.title
  }));
}

function buildMajorStoryItems(ledger: AccountLedgerSnapshot, gdeltArticles: GdeltDailyBriefArticle[] = []): DailyBriefSourceItem[] {
  const gdeltItems = buildGdeltStoryItems(gdeltArticles);
  const selectedStories = [...majorStoryCatalog]
    .map((story) => ({
      ...story,
      score: issueMatchScore(story.issueMatches, ledger.issueInterests)
    }))
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
  const topStories = selectedStories.filter((story) => story.score > 0).slice(0, 3);
  const fallbackStories = selectedStories.slice(0, 2);

  const fallbackItems = (topStories.length ? topStories : fallbackStories).map((story) => ({
    body: story.body,
    href: story.href,
    id: story.id,
    issueMatches: story.issueMatches.filter((issue) => story.score === 0 || ledger.issueInterests.some((interest) => normalizeInterest(interest) === normalizeInterest(issue))),
    label: "Story signal" as const,
    sourceKind: "watch-lane" as const,
    sourceName: story.sourceName,
    sourceUrl: story.sourceUrl,
    title: story.title
  }));

  return [...gdeltItems, ...fallbackItems].slice(0, 3);
}

function buildPriorityUpdates(ledger: AccountLedgerSnapshot): WeeklyBriefUpdate[] {
  const dashboard = getDashboardData();
  const voteBill = dashboard.recentVote?.bill ?? dashboard.trackedBill;
  const readAlerts = new Set(ledger.readAlerts);
  const systemUpdate: WeeklyBriefUpdate | null = voteBill
    ? {
        body: `${voteBill.displayNumber} has tracked movement ready for review.`,
        href: "/alerts/detail",
        id: "system-vote-reminder",
        label: "Vote reminder",
        title: "Vote reminder",
        unread: !readAlerts.has("system-vote-reminder")
      }
    : null;

  const eventUpdates = getRecentUpdates().map((event) => {
    const bill = event.targetType === "bill" ? getBill(event.targetId) : undefined;
    const member = event.targetType === "member" ? getMember(event.targetId) : undefined;
    const targetLabel = bill?.displayNumber ?? member?.fullName ?? "Record";

    return {
      body: `${targetLabel} - ${event.body}`,
      href: bill ? `/bills/${bill.id}` : member ? `/members/${member.bioguideId}` : "/search",
      id: event.id,
      label: event.targetType === "bill" ? "Bill update" : "Representative",
      sourceUrl: event.sourceUrl,
      title: event.title,
      unread: !readAlerts.has(event.id)
    };
  });

  return [systemUpdate, ...eventUpdates].filter((update): update is WeeklyBriefUpdate => Boolean(update)).slice(0, 4);
}

function buildDailySourceDigest({
  gdeltArticles = [],
  ledger,
  priorityUpdates
}: {
  gdeltArticles?: GdeltDailyBriefArticle[];
  ledger: AccountLedgerSnapshot;
  priorityUpdates: WeeklyBriefUpdate[];
}): WeeklyBriefSnapshot["sourceDigest"] {
  const officialItems: DailyBriefSourceItem[] = priorityUpdates.slice(0, 3).map((update) => ({
    body: update.body,
    href: update.href,
    id: `official-${update.id}`,
    issueMatches: ledger.issueInterests.slice(0, 3),
    label: "Official update",
    sourceKind: "official",
    sourceName: update.sourceUrl ? "Official source" : "Congress.gov watchlist",
    sourceUrl: update.sourceUrl,
    title: update.title
  }));
  const majorStoryItems = buildMajorStoryItems(ledger, gdeltArticles);
  const items = [...officialItems, ...majorStoryItems].slice(0, 6);
  const mediaSignalCount = majorStoryItems.filter((item) => item.sourceKind === "gdelt-media").length;
  const matchedIssueCount = new Set(items.flatMap((item) => item.issueMatches.map(normalizeInterest)).filter(Boolean)).size;
  const matchedIssueLabel = `${matchedIssueCount || ledger.issueInterests.length || 1} followed issue${(matchedIssueCount || ledger.issueInterests.length || 1) === 1 ? "" : "s"}`;
  const mediaSummary = mediaSignalCount
    ? `, plus ${mediaSignalCount} GDELT U.S. politics result${mediaSignalCount === 1 ? "" : "s"}`
    : "";

  return {
    items,
    summary: `${officialItems.length} official update${officialItems.length === 1 ? "" : "s"} and ${majorStoryItems.length} story signal${majorStoryItems.length === 1 ? "" : "s"}${mediaSummary} matched ${matchedIssueLabel}.`,
    title: "Source watch"
  };
}

function buildLens(
  ledger: AccountLedgerSnapshot,
  profile: AccountProfileSnapshot,
  watchlistBills: Bill[],
  unreadAlerts: number
) {
  const interestBills = resolveInterestBills(ledger, watchlistBills);
  const topBill = interestBills[0] ?? watchlistBills[0];
  const interests = ledger.issueInterests.length ? ledger.issueInterests.slice(0, 3).join(", ") : "your saved civic priorities";
  const district = profile.districtCode || "your district";

  return {
    headline: topBill ? `${topBill.displayNumber}: ${topBill.shortTitle}` : "Your civic ledger is ready",
    body: topBill
      ? `${district} brief focus: ${topBill.shortTitle} is the highest-priority item connected to ${interests}.`
      : `Today, ${publicBrandName} will watch ${interests} and surface votes, bill movement, and district-specific updates.`,
    bullets: [
      `${watchlistBills.length} tracked bill${watchlistBills.length === 1 ? "" : "s"} in today's watchlist`,
      `${unreadAlerts} unread alert${unreadAlerts === 1 ? "" : "s"} ready for review`,
      "Official records, saved alerts, and followed topics shape today's brief"
    ]
  };
}

function buildWrittenSummary({
  ledger,
  mediaSignalCount,
  priorityUpdates,
  profile,
  unreadAlerts,
  watchlistBills
}: {
  ledger: AccountLedgerSnapshot;
  mediaSignalCount: number;
  priorityUpdates: WeeklyBriefUpdate[];
  profile: AccountProfileSnapshot;
  unreadAlerts: number;
  watchlistBills: Bill[];
}): WeeklyBriefSnapshot["writtenSummary"] {
  const topBill = resolveInterestBills(ledger, watchlistBills)[0] ?? watchlistBills[0];
  const district = profile.districtCode || profile.districtLabel || "your district";
  const interests = ledger.issueInterests.length ? ledger.issueInterests.slice(0, 3).join(", ") : "your saved civic priorities";
  const topUpdate = priorityUpdates[0];
  const billStatus = topBill ? getBillStatus(topBill).toLowerCase() : null;
  const summarySubject = topBill ? `${topBill.displayNumber}, ${topBill.shortTitle}` : "your civic ledger";
  const updateSentence = topUpdate
    ? `The strongest update signal is ${topUpdate.title.toLowerCase()}: ${topUpdate.body}`
    : "There are no urgent priority updates in the brief right now, so this is a good time to review your saved ledger and keep your tracked interests current.";
  const nextStep = unreadAlerts
    ? `Start by clearing ${unreadAlerts} unread alert${unreadAlerts === 1 ? "" : "s"}, then review the top watched bill.`
    : topBill
      ? `Start with ${topBill.displayNumber}, then check whether any vote or committee movement needs attention.`
      : "Start by adding one bill or official to your saved ledger so tomorrow's summary has stronger signals.";

  return {
    headline: `Today's read for ${district}`,
    nextStep,
    paragraphs: [
      `Today's brief centers on ${summarySubject}${billStatus ? `, currently ${billStatus}` : ""}. It is tied to ${interests} and is shaped by ${watchlistBills.length} tracked bill${watchlistBills.length === 1 ? "" : "s"}, ${priorityUpdates.length} priority update${priorityUpdates.length === 1 ? "" : "s"}, and ${ledger.follows.length + ledger.savedAlerts.length} saved ledger item${ledger.follows.length + ledger.savedAlerts.length === 1 ? "" : "s"}.`,
      updateSentence,
      "The brief translates those signals into a plain read: what moved, why it matters locally, and what is worth checking next."
    ],
    sourceNote: `Based on your district profile, saved ledger, followed issues, priority alerts, official bill and vote records${mediaSignalCount ? `, and ${mediaSignalCount} GDELT U.S. politics result${mediaSignalCount === 1 ? "" : "s"}` : ""}.`
  };
}

function buildActionItems(profile: AccountProfileSnapshot, subscription: AccountSubscriptionSnapshot, unreadAlerts: number) {
  const actions = [
    {
      body: unreadAlerts ? "Clear the unread queue before the next brief is assembled." : "Your alert queue is clear. Review the latest bill movement.",
      href: unreadAlerts ? "/alerts?filter=unread" : "/alerts",
      label: unreadAlerts ? "Review unread alerts" : "Review latest alerts"
    },
    {
      body: profile.districtCode ? `Keep ${profile.districtCode} district tracking current for better local matching.` : "Add district setup to unlock local matching.",
      href: "/onboarding",
      label: profile.districtCode ? "Check district setup" : "Finish district setup"
    }
  ];

  if (subscription.plan === "free") {
    actions.push({
      body: "Upgrade for the policy lens, source context, and priority alerts in the daily brief.",
      href: "/upgrade",
      label: "Preview Pro brief"
    });
  } else {
    actions.push({
      body: "Review source-linked bill summaries and voting context.",
      href: "/search?type=bills",
      label: "Open intelligence search"
    });
  }

  return actions;
}

export function buildWeeklyBrief({
  gdeltArticles = [],
  ledger,
  profile,
  subscription
}: {
  gdeltArticles?: GdeltDailyBriefArticle[];
  ledger: AccountLedgerSnapshot;
  profile: AccountProfileSnapshot;
  subscription: AccountSubscriptionSnapshot;
}): WeeklyBriefSnapshot {
  const watchlistBills = resolveWatchlistBills(ledger);
  const watchlistOfficials = resolveWatchlistOfficials(ledger);
  const priorityUpdates = buildPriorityUpdates(ledger);
  const sourceDigest = buildDailySourceDigest({ gdeltArticles, ledger, priorityUpdates });
  const unreadAlerts = priorityUpdates.filter((update) => update.unread).length;
  const enabled = profile.notificationPreferences.weeklyBrief;
  const mediaSignalCount = sourceDigest.items.filter((item) => item.sourceKind === "gdelt-media").length;

  return {
    actionItems: buildActionItems(profile, subscription, unreadAlerts),
    cadence: defaultCadence,
    delivery: {
      channel: "In app",
      enabled,
      nextDelivery: "Tomorrow in app",
      note: enabled
        ? `This brief stays inside ${publicBrandName} and refreshes daily from your saved ledger, alerts, district profile, followed issues, official records, and U.S. politics coverage.`
        : "Your brief stays available here. Turn on brief alerts when you want a daily reminder.",
      status: enabled ? "ready" : "paused"
    },
    district: {
      code: profile.districtCode || "TX-10",
      label: profile.districtLabel || "Austin, Texas - TX-10",
      state: profile.districtState || "Texas"
    },
    generatedAt: new Date().toISOString(),
    lens: buildLens(ledger, profile, watchlistBills, unreadAlerts),
    metrics: {
      activeBills: getDashboardData().billsInAction,
      majorStoryMatches: sourceDigest.items.filter((item) => item.label === "Story signal").length,
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
    title: "Daily Civic Brief",
    watchlist: {
      bills: watchlistBills.map((bill) => ({
        href: `/bills/${bill.id}`,
        id: bill.id,
        status: getBillStatus(bill),
        title: `${bill.displayNumber} ${bill.shortTitle}`
      })),
      interests: ledger.issueInterests.slice(0, 6),
      officials: watchlistOfficials.map((member) => ({
        href: `/members/${member.bioguideId}`,
        id: member.bioguideId,
        title: member.fullName
      }))
    },
    writtenSummary: buildWrittenSummary({
      ledger,
      mediaSignalCount,
      priorityUpdates,
      profile,
      unreadAlerts,
      watchlistBills
    })
  };
}

export async function getWeeklyBriefForUser(user: AuthUser) {
  const accountUserId = await getAccountPersistenceUserId(user).catch(() => user.id);

  const [databaseLedger, databaseProfile, databaseSubscription] = await Promise.all([
    readLedgerFromDatabase(accountUserId).catch(() => null),
    readProfileFromDatabase(accountUserId).catch(() => null),
    readSubscriptionFromDatabase(accountUserId).catch(() => null)
  ]);

  const ledger = databaseLedger ?? getAccountLedger(accountUserId);
  const profile = databaseProfile ?? getAccountProfile(accountUserId);
  const personalSubscription = databaseSubscription ?? getAccountSubscription(accountUserId);
  const subscription = await getEffectiveSubscriptionForAccountUser(user, personalSubscription).catch(() => personalSubscription);
  const gdeltArticles = await fetchGdeltDailyBriefItems({ interests: ledger.issueInterests }).catch(() => []);

  return buildWeeklyBrief({
    gdeltArticles,
    ledger,
    profile,
    subscription
  });
}

export function formatBriefGeneratedAt(value: string) {
  return formatDate(value);
}
