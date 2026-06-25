import { getAccountLedger } from "@/lib/account-ledger";
import { getAccountProfile } from "@/lib/account-profile";
import { getAccountSubscription } from "@/lib/account-subscription";
import { getAccountPersistenceUserId, readLedgerFromDatabase, readProfileFromDatabase, readSubscriptionFromDatabase } from "@/lib/account-database";
import { getBill, getBillStatus, getDashboardData, getMember, getRecentUpdates } from "@/lib/data";
import { getEffectiveSubscriptionForAccountUser } from "@/lib/effective-account-subscription";
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
    policyInterests: number;
    savedRecords: number;
    unreadAlerts: number;
  };
  plan: {
    id: AccountSubscriptionSnapshot["plan"];
    label: string;
  };
  priorityUpdates: WeeklyBriefUpdate[];
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
  };
};

const defaultCadence = "Mondays at 8:00 AM";

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

function buildPriorityUpdates(ledger: AccountLedgerSnapshot): WeeklyBriefUpdate[] {
  const dashboard = getDashboardData();
  const voteBill = dashboard.recentVote?.bill ?? dashboard.trackedBill;
  const readAlerts = new Set(ledger.readAlerts);
  const systemUpdate: WeeklyBriefUpdate | null = voteBill
    ? {
        body: `${voteBill.displayNumber} has tracked movement ready for review.`,
        href: "/alerts/detail",
        id: "system-vote-reminder",
        label: "Vote Reminder",
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
      label: event.targetType === "bill" ? "Bill Update" : "Representative",
      sourceUrl: event.sourceUrl,
      title: event.title,
      unread: !readAlerts.has(event.id)
    };
  });

  return [systemUpdate, ...eventUpdates].filter((update): update is WeeklyBriefUpdate => Boolean(update)).slice(0, 4);
}

function buildLens(
  ledger: AccountLedgerSnapshot,
  profile: AccountProfileSnapshot,
  subscription: AccountSubscriptionSnapshot,
  watchlistBills: Bill[],
  unreadAlerts: number
) {
  const interestBills = resolveInterestBills(ledger, watchlistBills);
  const topBill = interestBills[0] ?? watchlistBills[0];
  const plan = subscriptionPlans[subscription.plan];
  const interests = ledger.issueInterests.length ? ledger.issueInterests.slice(0, 3).join(", ") : "your saved civic priorities";
  const district = profile.districtCode || "your district";

  return {
    headline: topBill ? `${topBill.displayNumber}: ${topBill.shortTitle}` : "Your civic ledger is ready",
    body: topBill
      ? `${district} brief focus: ${topBill.shortTitle} is the highest-priority item connected to ${interests}.`
      : `This week, Capitol Ledger CE will watch ${interests} and surface votes, bill movement, and district-specific updates.`,
    bullets: [
      `${watchlistBills.length} tracked bill${watchlistBills.length === 1 ? "" : "s"} in this week's watchlist`,
      `${unreadAlerts} unread alert${unreadAlerts === 1 ? "" : "s"} ready for review`,
      `${plan.name} mode shapes the depth of analysis and source packaging`
    ]
  };
}

function buildWrittenSummary({
  ledger,
  priorityUpdates,
  profile,
  subscription,
  unreadAlerts,
  watchlistBills
}: {
  ledger: AccountLedgerSnapshot;
  priorityUpdates: WeeklyBriefUpdate[];
  profile: AccountProfileSnapshot;
  subscription: AccountSubscriptionSnapshot;
  unreadAlerts: number;
  watchlistBills: Bill[];
}): WeeklyBriefSnapshot["writtenSummary"] {
  const topBill = resolveInterestBills(ledger, watchlistBills)[0] ?? watchlistBills[0];
  const district = profile.districtCode || profile.districtLabel || "your district";
  const interests = ledger.issueInterests.length ? ledger.issueInterests.slice(0, 3).join(", ") : "your saved civic priorities";
  const plan = subscriptionPlans[subscription.plan].name;
  const topUpdate = priorityUpdates[0];
  const billStatus = topBill ? getBillStatus(topBill).toLowerCase() : null;
  const summarySubject = topBill ? `${topBill.displayNumber}, ${topBill.shortTitle}` : "your civic ledger";
  const updateSentence = topUpdate
    ? `The strongest update signal is ${topUpdate.title.toLowerCase()}: ${topUpdate.body}`
    : "There are no urgent priority updates in the brief right now, so this is a good time to review your saved ledger and keep your tracked interests current.";
  const nextStep = unreadAlerts
    ? `Start by clearing ${unreadAlerts} unread alert${unreadAlerts === 1 ? "" : "s"}, then review the top watched bill.`
    : topBill
      ? `Start with ${topBill.displayNumber}, then scan the priority updates for any new vote or committee movement.`
      : "Start by adding one bill or official to your saved ledger so next week's summary has stronger signals.";

  return {
    headline: `This week's read for ${district}`,
    nextStep,
    paragraphs: [
      `This week's brief centers on ${summarySubject}${billStatus ? `, currently ${billStatus}` : ""}. It is tied to ${interests} and is shaped by ${watchlistBills.length} tracked bill${watchlistBills.length === 1 ? "" : "s"}, ${priorityUpdates.length} priority update${priorityUpdates.length === 1 ? "" : "s"}, and ${ledger.follows.length + ledger.savedAlerts.length} saved ledger item${ledger.follows.length + ledger.savedAlerts.length === 1 ? "" : "s"}.`,
      updateSentence,
      `${plan} mode packages this into a voter-facing read: what moved, why it matters locally, and which action is most useful before the next check-in.`
    ]
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
      body: "Upgrade to include AI policy lens, source maps, and priority alerts in the weekly brief.",
      href: "/upgrade",
      label: "Preview Pro brief"
    });
  } else {
    actions.push({
      body: "Use Pro intelligence to package source-linked bill summaries and voting context.",
      href: "/search?type=bills",
      label: "Open intelligence search"
    });
  }

  return actions;
}

export function buildWeeklyBrief({
  ledger,
  profile,
  subscription
}: {
  ledger: AccountLedgerSnapshot;
  profile: AccountProfileSnapshot;
  subscription: AccountSubscriptionSnapshot;
}): WeeklyBriefSnapshot {
  const watchlistBills = resolveWatchlistBills(ledger);
  const watchlistOfficials = resolveWatchlistOfficials(ledger);
  const priorityUpdates = buildPriorityUpdates(ledger);
  const unreadAlerts = priorityUpdates.filter((update) => update.unread).length;
  const enabled = profile.notificationPreferences.weeklyBrief;

  return {
    actionItems: buildActionItems(profile, subscription, unreadAlerts),
    cadence: defaultCadence,
    delivery: {
      channel: "In app",
      enabled,
      nextDelivery: "Next Monday in app",
      note: enabled
        ? "This brief stays inside Capitol Ledger CE and refreshes from your saved ledger, alerts, district profile, and issue interests."
        : "This brief stays available in app. Turn on Weekly Brief alerts from Alert Preferences when you want the reminder preference active.",
      status: enabled ? "ready" : "paused"
    },
    district: {
      code: profile.districtCode || "TX-10",
      label: profile.districtLabel || "Austin, Texas - TX-10",
      state: profile.districtState || "Texas"
    },
    generatedAt: new Date().toISOString(),
    lens: buildLens(ledger, profile, subscription, watchlistBills, unreadAlerts),
    metrics: {
      activeBills: getDashboardData().billsInAction,
      policyInterests: ledger.issueInterests.length,
      savedRecords: ledger.follows.length + ledger.savedAlerts.length,
      unreadAlerts
    },
    plan: {
      id: subscription.plan,
      label: subscriptionPlans[subscription.plan].name
    },
    priorityUpdates,
    title: "Weekly Civic Brief",
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
      priorityUpdates,
      profile,
      subscription,
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

  const personalSubscription = databaseSubscription ?? getAccountSubscription(accountUserId);
  const subscription = await getEffectiveSubscriptionForAccountUser(user, personalSubscription).catch(() => personalSubscription);

  return buildWeeklyBrief({
    ledger: databaseLedger ?? getAccountLedger(accountUserId),
    profile: databaseProfile ?? getAccountProfile(accountUserId),
    subscription
  });
}

export function formatBriefGeneratedAt(value: string) {
  return formatDate(value);
}
