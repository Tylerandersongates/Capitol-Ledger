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

export type ImpactActionId = "bills-tracked" | "letters-sent" | "petitions-signed" | "votes-cast";
export type GamificationEventRule = {
  badgeProgress: Array<{
    badgeId: string;
    threshold: number;
  }>;
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

const impactActionDisplay: Record<ImpactActionId, Omit<ImpactAction, "id" | "value">> = {
  "letters-sent": { label: "Letters Sent", color: "#49c878" },
  "bills-tracked": { label: "Bills Tracked", color: "#ffad1e" },
  "votes-cast": { label: "Votes Cast", color: "#5e83df" },
  "petitions-signed": { label: "Petitions Signed", color: "#9563d5" }
};

const impactActionOrder: ImpactActionId[] = ["letters-sent", "bills-tracked", "votes-cast", "petitions-signed"];

export const gamificationEventRules: GamificationEventRule[] = [
  {
    event: "complete-onboarding",
    label: "Complete district setup",
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
    points: 75,
    streakCredit: true,
    dedupe: "once",
    badgeProgress: [{ badgeId: "register-to-vote", threshold: 1 }]
  },
  {
    event: "track-bill",
    label: "Track a bill",
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
    points: 15,
    streakCredit: true,
    dedupe: "once-per-target",
    badgeProgress: [{ badgeId: "representative-watch", threshold: 3 }]
  },
  {
    event: "read-alert",
    label: "Read an alert",
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
    points: 10,
    streakCredit: true,
    dedupe: "once-per-target",
    badgeProgress: [
      { badgeId: "source-checker", threshold: 20 },
      { badgeId: "data-sentinel", threshold: 40 }
    ]
  },
  {
    event: "review-vote",
    label: "Review a vote record",
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
    label: "Log election participation",
    points: 60,
    streakCredit: true,
    dedupe: "once-per-target",
    impactActionId: "votes-cast",
    badgeProgress: [
      { badgeId: "voter", threshold: 4 },
      { badgeId: "ballot-veteran", threshold: 5 },
      { badgeId: "super-voter", threshold: 6 }
    ]
  },
  {
    event: "watch-speech-video",
    label: "Watch speech or floor video",
    points: 15,
    streakCredit: true,
    dedupe: "once-per-target",
    badgeProgress: [{ badgeId: "floor-watch", threshold: 10 }]
  },
  {
    event: "contact-representative",
    label: "Contact a representative",
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
    label: "Sign a civic petition",
    points: 25,
    streakCredit: true,
    dedupe: "once-per-target",
    impactActionId: "petitions-signed",
    badgeProgress: [
      { badgeId: "campaign-ally", threshold: 15 },
      { badgeId: "change-maker", threshold: 50 }
    ]
  }
];

export const demoGamificationEventCounts: GamificationEventCount[] = [
  { event: "complete-onboarding", count: 1 },
  { event: "complete-voter-registration", count: 1 },
  { event: "track-bill", count: 8 },
  { event: "review-vote", count: 5 },
  { event: "contact-representative", count: 12 },
  { event: "sign-petition", count: 3 },
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
    description: "Log 4 election participations",
    icon: "vote",
    status: "earned",
    tone: "blue",
    featured: true
  },
  {
    id: "advocate",
    label: "Advocate",
    description: "Contact 20 reps",
    icon: "megaphone",
    status: "earned",
    tone: "gold",
    featured: true
  },
  {
    id: "democracy-defender",
    label: "Democracy Defender",
    description: "Review 30 voting records",
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
    description: "Open 20 official source links",
    icon: "search",
    status: "earned",
    tone: "green"
  },
  {
    id: "committee-watcher",
    label: "Committee Watcher",
    description: "Track 10 committee actions",
    icon: "scale",
    status: "earned",
    tone: "gold"
  },
  {
    id: "civic-streak",
    label: "Civic Streak",
    description: "Keep a 14 day streak",
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
    description: "Review 20 bill records",
    icon: "file",
    status: "earned",
    tone: "green"
  },
  {
    id: "register-to-vote",
    label: "Register to Vote",
    description: "Complete a Voter Registration Form",
    icon: "vote",
    status: "locked",
    tone: "blue"
  },
  {
    id: "super-voter",
    label: "Super Voter",
    description: "Log 6 election participations",
    icon: "trophy",
    status: "locked",
    tone: "gold"
  },
  {
    id: "constitution-champion",
    label: "Constitution Champion",
    description: "Complete 10 civic learning actions",
    icon: "landmark",
    status: "locked",
    tone: "blue"
  },
  {
    id: "ballot-veteran",
    label: "Ballot Veteran",
    description: "Participate in 5 elections (primary, general, runoff, or special)",
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
    label: "Campaign Ally",
    description: "Sign 15 civic petitions",
    icon: "building",
    status: "locked",
    tone: "gold"
  },
  {
    id: "change-maker",
    label: "Change Maker",
    description: "Complete 50 civic actions",
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
    description: "Watch 10 floor activity updates",
    icon: "vote",
    status: "locked",
    tone: "gold"
  },
  {
    id: "local-builder",
    label: "Local Builder",
    description: "Follow state and local activity",
    icon: "building",
    status: "locked",
    tone: "blue"
  },
  {
    id: "transparency-ally",
    label: "Transparency Ally",
    description: "Share 10 source-linked records",
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
    description: "Respond to 10 action alerts",
    icon: "bell",
    status: "locked",
    tone: "gold"
  },
  {
    id: "coalition-builder",
    label: "Coalition Builder",
    description: "Invite a civic team",
    icon: "user",
    status: "locked",
    tone: "blue"
  },
  {
    id: "data-sentinel",
    label: "Data Sentinel",
    description: "Verify 40 official records",
    icon: "search",
    status: "locked",
    tone: "green"
  },
  {
    id: "civic-luminary",
    label: "Civic Luminary",
    description: "Reach level 10",
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
  return eventCounts.find((record) => record.event === event)?.count ?? 0;
}

export function calculateGamificationScore(eventCounts = demoGamificationEventCounts) {
  return eventCounts.reduce((score, record) => {
    const rule = getGamificationRule(record.event);
    return score + (rule?.points ?? 0) * record.count;
  }, 0);
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
      "petitions-signed": 0
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

export function getEarnedBadges() {
  return badgeCatalog.filter((badge) => badge.status === "earned");
}

export function getBadgeCollections(earnedBadgeIds?: string[]) {
  const earnedIds = new Set((earnedBadgeIds ?? getEarnedBadges().map((badge) => badge.id)).filter(Boolean));
  const earnedBadges = badgeCatalog
    .filter((badge) => earnedIds.has(badge.id))
    .map((badge) => ({ ...badge, status: "earned" as const }));
  const lockedBadges = badgeCatalog
    .filter((badge) => !earnedIds.has(badge.id))
    .map((badge) => ({ ...badge, status: "locked" as const }));
  const featuredEarnedBadges = earnedBadges.filter((badge) => badge.featured);

  return {
    earnedBadges,
    featuredEarnedBadges,
    lockedBadges,
    progressPercent: Math.round((earnedBadges.length / Math.max(1, badgeCatalog.length)) * 100),
    totalBadges: badgeCatalog.length
  };
}

export function getFeaturedEarnedBadges() {
  return getEarnedBadges().filter((badge) => badge.featured);
}

export function getLockedBadges() {
  return badgeCatalog.filter((badge) => badge.status === "locked");
}

export function getRecentAchievements() {
  return recentAchievementIds
    .map((id) => badgeCatalog.find((badge) => badge.id === id))
    .filter((badge): badge is GamificationBadge => Boolean(badge));
}

export function getCivicLevelProgress(civicScore: number) {
  const safeScore = Math.max(0, Math.floor(civicScore));
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
  const xpProgress = nextTier ? Math.round((safeScore / Math.max(1, nextLevelScore)) * 100) : 100;

  return {
    level: activeTier.level,
    levelTitle: activeTier.title,
    nextLevelScore,
    xpProgress: Math.max(0, Math.min(100, xpProgress))
  };
}

export function getGamificationSummary(eventCounts = demoGamificationEventCounts, earnedBadgeIds?: string[]) {
  const earnedBadges = earnedBadgeIds?.length ?? getEarnedBadges().length;
  const totalBadges = badgeCatalog.length;
  const civicScore = calculateGamificationScore(eventCounts);
  const impactActions = getImpactActions(eventCounts);
  const levelProgress = getCivicLevelProgress(civicScore);

  return {
    civicScore,
    dayStreak: 16,
    earnedBadges,
    level: levelProgress.level,
    levelTitle: levelProgress.levelTitle,
    monthlyGain: 75,
    nextLevelScore: levelProgress.nextLevelScore,
    totalActions: impactActions.reduce((total, action) => total + action.value, 0),
    totalBadges,
    xpProgress: levelProgress.xpProgress
  };
}
