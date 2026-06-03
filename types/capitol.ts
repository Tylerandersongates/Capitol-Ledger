export type Chamber = "House" | "Senate";
export type Party = "Democrat" | "Republican" | "Independent";
export type VotePosition = "Yes" | "No" | "Present" | "Not Voting";
export type FollowTargetType = "member" | "bill";
export type SourceLinkTargetType = "member" | "bill" | "vote" | "committee";
export type BillingCycle = "monthly" | "annual";
export type SubscriptionPlanId = "free" | "pro" | "team";
export type SubscriptionProvider = "demo" | "stripe" | "revenuecat" | "app-store";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

export type SavedFollowRecord = {
  type: FollowTargetType;
  id: string;
};

export type AccountLedgerSnapshot = {
  follows: SavedFollowRecord[];
  readAlerts: string[];
  savedAlerts: string[];
  issueInterests: string[];
  updatedAt: string;
};

export type AccountSubscriptionSnapshot = {
  cycle: BillingCycle;
  plan: SubscriptionPlanId;
  provider: SubscriptionProvider;
  providerCustomerId?: string;
  providerEntitlementId?: string;
  providerSubscriptionId?: string;
  status: SubscriptionStatus;
  updatedAt: string;
};

export type AccountNotificationPreferences = {
  districtAlerts: boolean;
  voteReminders: boolean;
  weeklyBrief: boolean;
};

export type AccountProfileSnapshot = {
  displayName?: string;
  districtCode?: string;
  districtLabel?: string;
  districtState?: string;
  notificationPreferences: AccountNotificationPreferences;
  partyAffiliation: string;
  updatedAt: string;
};

export type Member = {
  bioguideId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  party: Party;
  state: string;
  district?: string;
  chamber: Chamber;
  active: boolean;
  term: string;
  termsInOffice?: number;
  firstElectedDate?: string;
  nextElectionDate?: string;
  photoUrl?: string;
  officialUrl?: string;
  sourceUrl: string;
  description: string;
};

export type Bill = {
  id: string;
  congress: number;
  billType: string;
  billNumber: string;
  displayNumber: string;
  title: string;
  shortTitle: string;
  sponsorBioguideId?: string;
  policyArea: string;
  introducedDate?: string;
  committeeName?: string;
  latestActionText: string;
  latestActionDate: string;
  summary: string;
  sourceUrl: string;
};

export type CommitteeRecord = {
  id: string;
  name: string;
  chamber?: Chamber;
  systemCode?: string;
  sourceUrl?: string;
  updatedAt?: string;
};

export type CapitolSourceLink = {
  id: string;
  targetType: SourceLinkTargetType;
  targetId: string;
  label: string;
  url: string;
  source: string;
  sourceKind: string;
  verifiedAt?: string;
};

export type SourceMatchKind =
  | "Bill Record"
  | "Committee Source"
  | "Floor Video"
  | "Roll Call Vote"
  | "Sponsor Profile"
  | "Congressional Record";

export type BillSourceMatch = CapitolSourceLink & {
  billId: string;
  confidence: "high" | "medium";
  matchKind: SourceMatchKind;
  matchedAt: string;
  reason: string;
};

export type BillVideo = {
  id: string;
  billId: string;
  title: string;
  speaker: string;
  role: string;
  source: string;
  sourceKind?: string;
  verifiedAt?: string;
  publishedAt: string;
  duration: string;
  videoUrl: string;
  type: "Floor Speech" | "Committee Hearing" | "Public Statement";
  summary: string;
};

export type Cosponsor = {
  billId: string;
  memberBioguideId: string;
  joinedAt: string;
};

export type Vote = {
  id: string;
  congress: number;
  chamber: Chamber;
  rollCall: string;
  question: string;
  result: string;
  voteDate: string;
  yesCount?: number;
  noCount?: number;
  presentCount?: number;
  notVotingCount?: number;
  billId?: string;
  memberBioguideIds?: string[];
  explanation: string;
  sourceUrl: string;
};

export type MemberVote = {
  voteId: string;
  memberBioguideId: string;
  position: VotePosition;
};

export type UpdateEvent = {
  id: string;
  targetType: FollowTargetType;
  targetId: string;
  title: string;
  body: string;
  occurredAt: string;
  sourceUrl?: string;
};
