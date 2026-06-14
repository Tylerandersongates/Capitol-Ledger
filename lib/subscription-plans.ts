import type { SubscriptionPlanId } from "@/types/capitol";

export type SubscriptionFeatureId =
  | "accountabilityScore"
  | "advancedSearch"
  | "aiBillSummaries"
  | "aiPolicyLens"
  | "basicAlerts"
  | "civicDashboard"
  | "exportReports"
  | "issueTracking"
  | "priorityAlerts"
  | "savedLedger"
  | "sharedWatchlists"
  | "sourceMap"
  | "sourceRecords"
  | "speechVideo"
  | "teamDashboard"
  | "teamSeats"
  | "weeklyBrief"
  | "voteDashboards";

export type SubscriptionPlanDetails = {
  description: string;
  demoUseCase: string;
  highlights: string[];
  limits: string[];
  name: string;
  pricing: {
    annual: string;
    monthly: string;
    unit: string;
  };
};

export type SubscriptionFeature = {
  description: string;
  id: SubscriptionFeatureId;
  label: string;
  minimumPlan: SubscriptionPlanId;
};

export const subscriptionPlanOrder: SubscriptionPlanId[] = ["free", "pro", "team"];

export const subscriptionPlans: Record<SubscriptionPlanId, SubscriptionPlanDetails> = {
  free: {
    name: "Free",
    description: "Basic civic tracking",
    demoUseCase: "Show the public transparency baseline with light tracking and upgrade prompts.",
    pricing: {
      monthly: "$0",
      annual: "$0",
      unit: ""
    },
    highlights: ["Source-linked records", "Voting dashboards", "Civic alerts"],
    limits: ["Limited saved records", "Basic alert history", "Premium intelligence previews locked"]
  },
  pro: {
    name: "Pro Intelligence",
    description: "Advanced civic tracking",
    demoUseCase: "Show the premium individual experience with AI analysis, deeper filters, and report exports.",
    pricing: {
      monthly: "$2.99",
      annual: "$29.99",
      unit: "/ month"
    },
    highlights: ["Advanced intelligence panels", "Issue and politician tracking", "Exportable civic reports", "Priority vote reminders"],
    limits: ["Single-user workspace", "No team member seats"]
  },
  team: {
    name: "Civic Team",
    description: "Shared civic workspace",
    demoUseCase: "Coordinate organization mode for campaigns, nonprofits, advocacy teams, local offices, and civic groups.",
    pricing: {
      monthly: "$5.99",
      annual: "$59.99",
      unit: "/ seat"
    },
    highlights: ["Seat-managed workspace", "Team alert coordination", "Exportable reports", "Shared watchlist setup"],
    limits: ["Invites, role assignment, and shared workspace storage are in rollout"]
  }
};

export const subscriptionFeatureCatalog: SubscriptionFeature[] = [
  {
    id: "civicDashboard",
    label: "Personal legislative dashboard",
    description: "Dashboard overview, tracked bills, and upcoming activity.",
    minimumPlan: "free"
  },
  {
    id: "sourceRecords",
    label: "Source-linked records",
    description: "Official bill, vote, member, and committee references.",
    minimumPlan: "free"
  },
  {
    id: "voteDashboards",
    label: "Voting dashboards",
    description: "Vote totals, roll-call visuals, and official vote context.",
    minimumPlan: "free"
  },
  {
    id: "basicAlerts",
    label: "Civic alerts",
    description: "Basic bill, vote, and representative notifications.",
    minimumPlan: "free"
  },
  {
    id: "savedLedger",
    label: "Saved civic ledger",
    description: "Saved bills, officials, alerts, and policy interests.",
    minimumPlan: "free"
  },
  {
    id: "aiBillSummaries",
    label: "AI bill summaries",
    description: "Plain-language summaries layered above official source material.",
    minimumPlan: "pro"
  },
  {
    id: "aiPolicyLens",
    label: "AI Policy Lens",
    description: "Neutral pros, cons, and likely policy impacts.",
    minimumPlan: "pro"
  },
  {
    id: "sourceMap",
    label: "Official Source Map",
    description: "Matched evidence trail across bills, votes, hearings, video, and sponsor records.",
    minimumPlan: "pro"
  },
  {
    id: "speechVideo",
    label: "Speeches and video",
    description: "Linked floor speeches, hearings, and official video sources.",
    minimumPlan: "pro"
  },
  {
    id: "advancedSearch",
    label: "Advanced search filters",
    description: "Deeper search and discovery controls for bills, officials, committees, and issues.",
    minimumPlan: "pro"
  },
  {
    id: "issueTracking",
    label: "Issue tracking",
    description: "Personalized issue watchlists and policy trend panels.",
    minimumPlan: "pro"
  },
  {
    id: "priorityAlerts",
    label: "Priority vote reminders",
    description: "Faster reminders for votes, hearings, and district-specific changes.",
    minimumPlan: "pro"
  },
  {
    id: "weeklyBrief",
    label: "Weekly Brief delivery",
    description: "Personal civic intelligence delivered from district, saved ledger, alerts, and issue interests.",
    minimumPlan: "pro"
  },
  {
    id: "exportReports",
    label: "Exportable reports",
    description: "Shareable civic intelligence reports for saved bills, votes, and officials.",
    minimumPlan: "pro"
  },
  {
    id: "teamDashboard",
    label: "Team dashboards",
    description: "Shared overview for civic teams, campaigns, nonprofits, and organizations.",
    minimumPlan: "team"
  },
  {
    id: "sharedWatchlists",
    label: "Shared watchlists",
    description: "Team-managed bills, representatives, issues, and alerts.",
    minimumPlan: "team"
  },
  {
    id: "teamSeats",
    label: "Multi-seat workspace",
    description: "Invite teammates and coordinate civic tracking in one workspace.",
    minimumPlan: "team"
  },
  {
    id: "accountabilityScore",
    label: "Team accountability scoring",
    description: "Organization-level accountability scorecards and comparison views.",
    minimumPlan: "team"
  }
];

export const planComparisonRows: Array<{
  featureId: SubscriptionFeatureId;
  label: string;
}> = [
  { featureId: "sourceRecords", label: "Source-linked records" },
  { featureId: "voteDashboards", label: "Voting dashboards" },
  { featureId: "basicAlerts", label: "Civic alerts" },
  { featureId: "aiBillSummaries", label: "AI bill summaries" },
  { featureId: "sourceMap", label: "Official source map" },
  { featureId: "exportReports", label: "Exportable reports" },
  { featureId: "teamDashboard", label: "Team workspaces" },
  { featureId: "sharedWatchlists", label: "Shared watchlists" },
  { featureId: "teamSeats", label: "Multi-seat workspace" },
  { featureId: "accountabilityScore", label: "Team accountability score" }
];

export function getPlanRank(plan: SubscriptionPlanId) {
  return subscriptionPlanOrder.indexOf(plan);
}

export function isPlanAtLeast(plan: SubscriptionPlanId, minimumPlan: SubscriptionPlanId) {
  return getPlanRank(plan) >= getPlanRank(minimumPlan);
}

export function isPlanFeatureEnabled(plan: SubscriptionPlanId, featureId: SubscriptionFeatureId) {
  const feature = subscriptionFeatureCatalog.find((item) => item.id === featureId);
  if (!feature) return false;

  return isPlanAtLeast(plan, feature.minimumPlan);
}

export function getSubscriptionFeature(featureId: SubscriptionFeatureId) {
  return subscriptionFeatureCatalog.find((item) => item.id === featureId);
}

export function getPlanEntitlements(plan: SubscriptionPlanId) {
  return {
    included: subscriptionFeatureCatalog.filter((feature) => isPlanFeatureEnabled(plan, feature.id)),
    locked: subscriptionFeatureCatalog.filter((feature) => !isPlanFeatureEnabled(plan, feature.id))
  };
}
