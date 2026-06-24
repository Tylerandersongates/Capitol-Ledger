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
    description: "Core dashboard and alerts",
    pricing: {
      monthly: "$0",
      annual: "$0",
      unit: ""
    },
    highlights: ["Official source links", "Vote dashboards", "Bill and vote alerts"],
    limits: ["Limited saved items", "Basic alert history", "Pro previews locked"]
  },
  pro: {
    name: "Pro Intelligence",
    description: "More alerts, summaries, and reports",
    pricing: {
      monthly: "$2.99",
      annual: "$29.99",
      unit: "/ month"
    },
    highlights: ["Deeper dashboard panels", "Topic and official tracking", "Exportable reports", "Priority vote reminders"],
    limits: ["One-person plan", "No team seats"]
  },
  team: {
    name: "Civic Team",
    description: "Shared tracking for teams",
    pricing: {
      monthly: "$5.99",
      annual: "$59.99",
      unit: "/ seat"
    },
    highlights: ["Shared workspace", "Team alerts", "Exportable reports", "Shared watchlists"],
    limits: ["Self-serve checkout supports 3-25 seats", "Email invites and shared editing are in rollout"]
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
    label: "Official source links",
    description: "Official bill, vote, member, and committee references.",
    minimumPlan: "free"
  },
  {
    id: "voteDashboards",
    label: "Vote dashboards",
    description: "Vote totals, roll-call visuals, and official vote context.",
    minimumPlan: "free"
  },
  {
    id: "basicAlerts",
    label: "Bill and vote alerts",
    description: "Basic bill, vote, and representative notifications.",
    minimumPlan: "free"
  },
  {
    id: "savedLedger",
    label: "Saved items",
    description: "Saved bills, officials, alerts, and topics.",
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
    label: "Source map",
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
    label: "Topic tracking",
    description: "Personal topic watchlists and trend panels.",
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
    description: "A weekly summary from your district, saved items, alerts, and topics.",
    minimumPlan: "pro"
  },
  {
    id: "exportReports",
    label: "Exportable reports",
    description: "Shareable reports for saved bills, votes, and officials.",
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
    label: "Team seats",
    description: "Invite teammates and coordinate civic tracking in one workspace.",
    minimumPlan: "team"
  },
  {
    id: "accountabilityScore",
    label: "Team scorecards",
    description: "Organization-level scorecards and comparison views.",
    minimumPlan: "team"
  }
];

export const planComparisonRows: Array<{
  featureId: SubscriptionFeatureId;
  label: string;
}> = [
  { featureId: "sourceRecords", label: "Official source links" },
  { featureId: "voteDashboards", label: "Vote dashboards" },
  { featureId: "basicAlerts", label: "Bill and vote alerts" },
  { featureId: "aiBillSummaries", label: "Plain-language bill summaries" },
  { featureId: "sourceMap", label: "Source map" },
  { featureId: "exportReports", label: "Exportable reports" },
  { featureId: "teamDashboard", label: "Team workspace" },
  { featureId: "sharedWatchlists", label: "Shared watchlists" },
  { featureId: "teamSeats", label: "Team seats" },
  { featureId: "accountabilityScore", label: "Team scorecards" }
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
