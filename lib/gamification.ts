export type BadgeIcon =
  | "bell"
  | "building"
  | "file"
  | "flame"
  | "landmark"
  | "map"
  | "megaphone"
  | "scale"
  | "search"
  | "shield"
  | "sparkles"
  | "trophy"
  | "user"
  | "vote";

export type BadgeTone = "blue" | "gold" | "green" | "purple";
export type BadgeStatus = "earned" | "locked";
export type GamificationEventType =
  | "complete-onboarding"
  | "complete-public-comment"
  | "complete-voter-registration"
  | "contact-representative"
  | "open-official-source"
  | "participate-election"
  | "read-alert"
  | "review-vote"
  | "save-official"
  | "sign-petition"
  | "track-bill"
  | "watch-speech-video";

export type ImpactActionId = "bills-tracked" | "comments-completed" | "letters-sent" | "votes-cast";
export type GamificationEventRule = {
  badgeProgress: Array<{
    badgeId: string;
    threshold: number;
  }>;
  countLabel: string;
  dedupe: "daily" | "once" | "once-per-target" | "repeatable";
  event: GamificationEventType;
  impactActionId?: ImpactActionId;
  label: string;
  points: number;
  streakCredit: boolean;
};

export type GamificationEventCount = {
  count: number;
  event: GamificationEventType;
};

export type DatedGamificationEventCount = GamificationEventCount & {
  dateKey: string;
};

export type GamificationBadge = {
  description: string;
  featured?: boolean;
  icon: BadgeIcon;
  id: string;
  label: string;
  status: BadgeStatus;
  tone: BadgeTone;
};

export type ImpactAction = {
  color: string;
  id: ImpactActionId;
  label: string;
  value: number;
};

export type CivicLevelTier = {
  level: number;
  minScore: number;
  title: string;
};

export const civicLevelTiers: CivicLevelTier[] = [
  { level: 1, minScore: 0, title: "Civic Starter" },
  { level: 2, minScore: 150, title: "District Scout" },
  { level: 3, minScore: 400, title: "Issue Tracker" },
  { level: 4, minScore: 750, title: "Public Watcher" },
  { level: 5, minScore: 1250, title: "Policy Advocate" },
  { level: 6, minScore: 1900, title: "Community Organizer" },
  { level: 7, minScore: 2800, title: "Civic Leader" },
  { level: 8, minScore: 4000, title: "Democracy Defender" },
  { level: 9, minScore: 5600, title: "Accountability Champion" },
  { level: 10, minScore: 7500, title: "Civic Luminary" }
];

export const civicActivityMetricContract = {
  allTimeActions: {
    label: "Recorded actions",
    source: "accepted aggregate event counts",
    supportedByAccountSnapshot: true,
    window: "all-time"
  },
  allTimePoints: {
    label: "Activity score",
    source: "accepted aggregate event counts multiplied by event points",
    supportedByAccountSnapshot: true,
    window: "all-time"
  },
  consecutiveDayStreak: {
    label: "Consecutive activity days",
    source: "distinct account-time-zone activity date keys",
    supportedByAccountSnapshot: false,
    window: "current"
  },
  currentMonth: {
    label: "Current-month activity",
    source: "dated account-time-zone event counts",
    supportedByAccountSnapshot: false,
    window: "calendar-month"
  },
  impactBreakdown: {
    label: "Selected action breakdown",
    source: "tracked bills, vote records and legacy election entries, representative contacts, and public comments",
    supportedByAccountSnapshot: true,
    window: "all-time"
  }
} as const;

const impactActionDisplay: Record<ImpactActionId, Omit<ImpactAction, "id" | "value">> = {
  "letters-sent": { label: "Representative contacts", color: "#49c878" },
  "bills-tracked": { label: "Bills tracked", color: "#ffad1e" },
  "votes-cast": { label: "Vote records + election entries", color: "#5e83df" },
  "comments-completed": { label: "Public comments completed", color: "#9563d5" }
};

const impactActionOrder: ImpactActionId[] = ["letters-sent", "bills-tracked", "votes-cast", "comments-completed"];

export const gamificationEventRules: GamificationEventRule[] = [
  {
    event: "complete-onboarding",
    label: "Complete district setup",
    countLabel: "District setups completed",
    points: 100,
    streakCredit: true,
    dedupe: "once",
    badgeProgress: [
      { badgeId: "civic-starter", threshold: 1 },
      { badgeId: "district-finder", threshold: 1 }
    ]
  },
  {
    event: "complete-voter-registration",
    label: "Complete voter registration form",
    countLabel: "Registration forms completed",
    points: 75,
    streakCredit: true,
    dedupe: "once",
    badgeProgress: [{ badgeId: "register-to-vote", threshold: 1 }]
  },
  {
    event: "track-bill",
    label: "Track a bill",
    countLabel: "Bills tracked",
    points: 40,
    streakCredit: true,
    dedupe: "once-per-target",
    impactActionId: "bills-tracked",
    badgeProgress: [
      { badgeId: "bill-tracker", threshold: 50 },
      { badgeId: "public-records", threshold: 20 }
    ]
  },
  {
    event: "save-official",
    label: "Save an official",
    countLabel: "Officials saved",
    points: 15,
    streakCredit: true,
    dedupe: "once-per-target",
    badgeProgress: [{ badgeId: "representative-watch", threshold: 3 }]
  },
  {
    event: "read-alert",
    label: "Open an alert",
    countLabel: "Alerts opened",
    points: 10,
    streakCredit: true,
    dedupe: "once-per-target",
    badgeProgress: [
      { badgeId: "rapid-response", threshold: 10 },
      { badgeId: "civic-streak", threshold: 14 }
    ]
  },
  {
    event: "open-official-source",
    label: "Open an official source",
    countLabel: "Official sources opened",
    points: 10,
    streakCredit: true,
    dedupe: "once-per-target",
    badgeProgress: [
      { badgeId: "source-checker", threshold: 20 },
      { badgeId: "data-sentinel", threshold: 40 }
    ]
  },
  {
    event: "complete-public-comment",
    label: "Complete a public comment",
    countLabel: "Public comments marked complete",
    points: 25,
    streakCredit: true,
    dedupe: "once-per-target",
    impactActionId: "comments-completed",
    badgeProgress: [
      { badgeId: "campaign-ally", threshold: 15 },
      { badgeId: "change-maker", threshold: 50 }
    ]
  },
  {
    event: "review-vote",
    label: "Review a vote record",
    countLabel: "Vote records reviewed",
    points: 35,
    streakCredit: true,
    dedupe: "once-per-target",
    impactActionId: "votes-cast",
    badgeProgress: [
      { badgeId: "democracy-defender", threshold: 30 }
    ]
  },
  {
    event: "participate-election",
    label: "Record a legacy election entry",
    countLabel: "Legacy election entries recorded",
    points: 60,
    streakCredit: true,
    dedupe: "once-per-target",
    impactActionId: "votes-cast",
    badgeProgress: []
  },
  {
    event: "watch-speech-video",
    label: "Open a speech or floor video",
    countLabel: "Speech or floor videos opened",
    points: 15,
    streakCredit: true,
    dedupe: "once-per-target",
    badgeProgress: [{ badgeId: "floor-watch", threshold: 10 }]
  },
  {
    event: "contact-representative",
    label: "Record a representative contact",
    countLabel: "Representative contacts recorded",
    points: 25,
    streakCredit: true,
    dedupe: "once-per-target",
    impactActionId: "letters-sent",
    badgeProgress: [
      { badgeId: "advocate", threshold: 20 },
      { badgeId: "official-canvasser", threshold: 40 },
      { badgeId: "change-maker", threshold: 50 }
    ]
  },
  {
    event: "sign-petition",
    label: "Record legacy civic action",
    countLabel: "Legacy civic actions recorded",
    points: 25,
    streakCredit: true,
    dedupe: "once-per-target",
    badgeProgress: []
  }
];

export const demoGamificationEventCounts: GamificationEventCount[] = [
  { event: "complete-onboarding", count: 1 },
  { event: "complete-voter-registration", count: 1 },
  { event: "track-bill", count: 8 },
  { event: "review-vote", count: 5 },
  { event: "contact-representative", count: 12 },
  { event: "complete-public-comment", count: 3 },
  { event: "read-alert", count: 16 },
  { event: "open-official-source", count: 6 },
  { event: "save-official", count: 3 },
  { event: "watch-speech-video", count: 1 }
];

export const badgeCatalog: GamificationBadge[] = [
  {
    id: "civic-starter",
    label: "Civic Starter",
    description: "Complete district setup",
    icon: "bell",
    status: "earned",
    tone: "gold",
    featured: true
  },
  {
    id: "bill-tracker",
    label: "Bill Tracker",
    description: "Track 50 bills",
    icon: "file",
    status: "earned",
    tone: "green",
    featured: true
  },
  {
    id: "voter",
    label: "Voter",
    description: "Log 4 elections",
    icon: "vote",
    status: "earned",
    tone: "blue",
    featured: true
  },
  {
    id: "advocate",
    label: "Advocate",
    description: "Contact 20 representatives",
    icon: "megaphone",
    status: "earned",
    tone: "gold",
    featured: true
  },
  {
    id: "democracy-defender",
    label: "Democracy Defender",
    description: "Review 30 vote records",
    icon: "shield",
    status: "earned",
    tone: "gold",
    featured: true
  },
  {
    id: "policy-expert",
    label: "Policy Expert",
    description: "Follow 15 policy areas",
    icon: "landmark",
    status: "earned",
    tone: "purple",
    featured: true
  },
  {
    id: "district-finder",
    label: "District Finder",
    description: "Save your district",
    icon: "map",
    status: "earned",
    tone: "blue"
  },
  {
    id: "source-checker",
    label: "Source Checker",
    description: "Open 20 official sources",
    icon: "search",
    status: "earned",
    tone: "green"
  },
  {
    id: "committee-watcher",
    label: "Committee Watcher",
    description: "Track 10 committee updates",
    icon: "scale",
    status: "earned",
    tone: "gold"
  },
  {
    id: "civic-streak",
    label: "Alert Reader",
    description: "Open 14 alerts",
    icon: "flame",
    status: "earned",
    tone: "gold"
  },
  {
    id: "representative-watch",
    label: "Representative Watch",
    description: "Save 3 officials",
    icon: "user",
    status: "earned",
    tone: "blue"
  },
  {
    id: "public-records",
    label: "Public Records",
    description: "Track 20 bills",
    icon: "file",
    status: "earned",
    tone: "green"
  },
  {
    id: "register-to-vote",
    label: "Register to Vote",
    description: "Complete a voter registration form",
    icon: "vote",
    status: "locked",
    tone: "blue"
  },
  {
    id: "super-voter",
    label: "Super Voter",
    description: "Log 6 elections",
    icon: "trophy",
    status: "locked",
    tone: "gold"
  },
  {
    id: "constitution-champion",
    label: "Constitution Champion",
    description: "Complete 10 civic learning activities",
    icon: "landmark",
    status: "locked",
    tone: "blue"
  },
  {
    id: "ballot-veteran",
    label: "Ballot Veteran",
    description: "Log 5 elections (primary, general, runoff, or special)",
    icon: "vote",
    status: "locked",
    tone: "green"
  },
  {
    id: "official-canvasser",
    label: "Official Canvasser",
    description: "Contact 40 representative offices",
    icon: "megaphone",
    status: "locked",
    tone: "purple"
  },
  {
    id: "campaign-ally",
    label: "Public Commenter",
    description: "Complete 15 public comments",
    icon: "megaphone",
    status: "locked",
    tone: "gold"
  },
  {
    id: "change-maker",
    label: "Change Maker",
    description: "Record 50 of one action type: comments or representative contacts",
    icon: "building",
    status: "locked",
    tone: "purple"
  },
  {
    id: "committee-pro",
    label: "Committee Pro",
    description: "Track 20 committee hearings",
    icon: "scale",
    status: "locked",
    tone: "green"
  },
  {
    id: "floor-watch",
    label: "Floor Watch",
    description: "Open 10 speech or floor videos",
    icon: "vote",
    status: "locked",
    tone: "gold"
  },
  {
    id: "local-builder",
    label: "Local Builder",
    description: "Follow state and local updates",
    icon: "building",
    status: "locked",
    tone: "blue"
  },
  {
    id: "transparency-ally",
    label: "Transparency Ally",
    description: "Share 10 records with source links",
    icon: "shield",
    status: "locked",
    tone: "green"
  },
  {
    id: "policy-architect",
    label: "Policy Architect",
    description: "Create 5 policy watchlists",
    icon: "landmark",
    status: "locked",
    tone: "purple"
  },
  {
    id: "rapid-response",
    label: "Rapid Response",
    description: "Open 10 alerts",
    icon: "bell",
    status: "locked",
    tone: "gold"
  },
  {
    id: "coalition-builder",
    label: "Coalition Builder",
    description: "Invite a team member",
    icon: "user",
    status: "locked",
    tone: "blue"
  },
  {
    id: "data-sentinel",
    label: "Data Sentinel",
    description: "Open 40 official sources",
    icon: "search",
    status: "locked",
    tone: "green"
  },
  {
    id: "civic-luminary",
    label: "Civic Luminary",
    description: "Reach Level 10",
    icon: "sparkles",
    status: "locked",
    tone: "purple"
  }
];

export const recentAchievementIds = ["bill-tracker", "voter", "advocate"];

function getGamificationRule(event: GamificationEventType) {
  return gamificationEventRules.find((rule) => rule.event === event);
}

function countGamificationEvents(event: GamificationEventType, eventCounts = demoGamificationEventCounts) {
  return eventCounts.reduce(
    (total, record) => record.event === event ? total + toNonNegativeInteger(record.count) : total,
    0
  );
}

function toNonNegativeInteger(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function calculateGamificationScore(eventCounts = demoGamificationEventCounts) {
  return eventCounts.reduce((score, record) => {
    const rule = getGamificationRule(record.event);
    return score + (rule?.points ?? 0) * toNonNegativeInteger(record.count);
  }, 0);
}

export function calculateAllTimeActionCount(eventCounts = demoGamificationEventCounts) {
  return eventCounts.reduce((total, record) => {
    if (!getGamificationRule(record.event)) return total;
    return total + toNonNegativeInteger(record.count);
  }, 0);
}

function parseDateKey(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  return new Date(timestamp).toISOString().slice(0, 10) === dateKey ? timestamp : null;
}

function previousDateKey(dateKey: string) {
  const timestamp = parseDateKey(dateKey);
  if (timestamp === null) return null;
  return new Date(timestamp - 86_400_000).toISOString().slice(0, 10);
}

export function calculateGamificationMonthMetrics(
  datedEventCounts: DatedGamificationEventCount[],
  monthKey: string
) {
  const validMonth = /^\d{4}-\d{2}$/.test(monthKey) && parseDateKey(`${monthKey}-01`) !== null;
  if (!validMonth) return { actionCount: 0, points: 0 };

  const monthEventCounts = datedEventCounts.filter(
    (record) => parseDateKey(record.dateKey) !== null && record.dateKey.startsWith(`${monthKey}-`)
  );

  return {
    actionCount: calculateAllTimeActionCount(monthEventCounts),
    points: calculateGamificationScore(monthEventCounts)
  };
}

export function calculateConsecutiveActivityStreak(activityDateKeys: string[], asOfDateKey: string) {
  const asOfTimestamp = parseDateKey(asOfDateKey);
  if (asOfTimestamp === null) return 0;

  const eligibleDates = new Set(
    activityDateKeys.filter((dateKey) => {
      const timestamp = parseDateKey(dateKey);
      return timestamp !== null && timestamp <= asOfTimestamp;
    })
  );
  const yesterdayKey = previousDateKey(asOfDateKey);
  let cursor = eligibleDates.has(asOfDateKey)
    ? asOfDateKey
    : yesterdayKey && eligibleDates.has(yesterdayKey)
      ? yesterdayKey
      : null;
  let streak = 0;

  while (cursor && eligibleDates.has(cursor)) {
    streak += 1;
    cursor = previousDateKey(cursor);
  }

  return streak;
}

export function getImpactActions(eventCounts = demoGamificationEventCounts): ImpactAction[] {
  const values = gamificationEventRules.reduce(
    (counts, rule) => {
      if (!rule.impactActionId) return counts;
      counts[rule.impactActionId] += countGamificationEvents(rule.event, eventCounts);
      return counts;
    },
    {
      "letters-sent": 0,
      "bills-tracked": 0,
      "votes-cast": 0,
      "comments-completed": 0
    } satisfies Record<ImpactActionId, number>
  );

  return impactActionOrder.map((id) => ({
    id,
    ...impactActionDisplay[id],
    value: values[id]
  }));
}

export const impactActions = getImpactActions();

export function getGamificationEventRules() {
  return gamificationEventRules;
}

export function getGamificationEventRule(event: GamificationEventType) {
  return getGamificationRule(event);
}

function getBadgeIdsWithEarningPaths() {
  return new Set(gamificationEventRules.flatMap((rule) => rule.badgeProgress.map((progress) => progress.badgeId)));
}

export function getSupportedBadgeCatalog() {
  const supportedBadgeIds = getBadgeIdsWithEarningPaths();
  return badgeCatalog.filter((badge) => supportedBadgeIds.has(badge.id));
}

export function getUnsupportedBadgeCatalog() {
  const supportedBadgeIds = getBadgeIdsWithEarningPaths();
  return badgeCatalog.filter((badge) => !supportedBadgeIds.has(badge.id));
}

export function getEarnedBadges() {
  return getSupportedBadgeCatalog().filter((badge) => badge.status === "earned");
}

export function getBadgeCollections(earnedBadgeIds?: string[]) {
  const supportedBadges = getSupportedBadgeCatalog();
  const earnedIds = new Set((earnedBadgeIds ?? getEarnedBadges().map((badge) => badge.id)).filter(Boolean));
  const earnedBadges = supportedBadges
    .filter((badge) => earnedIds.has(badge.id))
    .map((badge) => ({ ...badge, status: "earned" as const }));
  const lockedBadges = supportedBadges
    .filter((badge) => !earnedIds.has(badge.id))
    .map((badge) => ({ ...badge, status: "locked" as const }));
  const featuredEarnedBadges = earnedBadges.filter((badge) => badge.featured);

  return {
    earnedBadges,
    featuredEarnedBadges,
    lockedBadges,
    progressPercent: Math.round((earnedBadges.length / Math.max(1, supportedBadges.length)) * 100),
    totalBadges: supportedBadges.length
  };
}

export function getFeaturedEarnedBadges() {
  return getEarnedBadges().filter((badge) => badge.featured);
}

export function getLockedBadges() {
  return getSupportedBadgeCatalog().filter((badge) => badge.status === "locked");
}

export function getRecentAchievements() {
  const supportedBadgeIds = getBadgeIdsWithEarningPaths();
  return recentAchievementIds
    .map((id) => badgeCatalog.find((badge) => badge.id === id))
    .filter((badge): badge is GamificationBadge => Boolean(badge && supportedBadgeIds.has(badge.id)));
}

export function getCivicLevelProgress(civicScore: number) {
  const safeScore = Number.isFinite(civicScore) ? Math.max(0, Math.floor(civicScore)) : 0;
  let activeTierIndex = 0;

  for (let index = 0; index < civicLevelTiers.length; index += 1) {
    if (safeScore >= civicLevelTiers[index].minScore) {
      activeTierIndex = index;
      continue;
    }

    break;
  }

  const activeTier = civicLevelTiers[activeTierIndex];
  const nextTier = civicLevelTiers[activeTierIndex + 1];
  const nextLevelScore = nextTier?.minScore ?? Math.max(activeTier.minScore, safeScore);
  const pointsIntoLevel = safeScore - activeTier.minScore;
  const pointsInLevel = nextTier ? nextTier.minScore - activeTier.minScore : 0;
  const xpProgress = nextTier ? Math.floor((pointsIntoLevel / Math.max(1, pointsInLevel)) * 100) : 100;

  return {
    level: activeTier.level,
    levelTitle: activeTier.title,
    nextLevelScore,
    xpProgress: Math.max(0, Math.min(100, xpProgress))
  };
}

export function getGamificationSummary(eventCounts = demoGamificationEventCounts, earnedBadgeIds?: string[]) {
  const badgeCollections = getBadgeCollections(earnedBadgeIds);
  const civicScore = calculateGamificationScore(eventCounts);
  const levelProgress = getCivicLevelProgress(civicScore);

  return {
    civicScore,
    dayStreak: 0,
    earnedBadges: badgeCollections.earnedBadges.length,
    level: levelProgress.level,
    levelTitle: levelProgress.levelTitle,
    monthlyGain: 0,
    nextLevelScore: levelProgress.nextLevelScore,
    totalActions: calculateAllTimeActionCount(eventCounts),
    totalBadges: badgeCollections.totalBadges,
    xpProgress: levelProgress.xpProgress
  };
}
