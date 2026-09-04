import type { WeeklyBriefSnapshot } from "@/lib/weekly-brief";

type PreviewEnvironment = Readonly<Record<string, string | undefined>>;

export function isDailyBriefProLayoutPreview(requested?: string, environment: PreviewEnvironment = process.env) {
  return requested === "pro" && environment.DAILY_BRIEF_LAYOUT_PREVIEW === "true" &&
    !environment.DATABASE_URL && !environment.VERCEL && !environment.VERCEL_ENV;
}

// Presentation-only fixtures: no account reads, network calls, or persistence.
export function getDailyBriefProLayoutFixture(): WeeklyBriefSnapshot {
  const generatedAt = "2026-09-03T12:00:00.000Z";
  const sampleLink = "#pro-preview-notes";
  return {
    generatedAt,
    title: "Sample personalized brief",
    cadence: "Daily",
    delivery: { channel: "In app", enabled: false, nextDelivery: "Not scheduled", note: "Layout sample only", status: "paused" },
    district: { code: "Sample", label: "Sample district", state: "" },
    lens: { headline: "Your priorities", body: "Infrastructure and education", bullets: [] },
    metrics: { activeBills: 2, majorStoryMatches: 1, policyInterests: 2, savedRecords: 3, unreadAlerts: 0 },
    plan: { id: "pro", label: "Pro Intelligence" },
    priorityUpdates: [],
    actionItems: [],
    sourceDigest: { title: "Sample sources", summary: "Illustrative content, not current reporting.", items: [] },
    watchlist: { bills: [], officials: [], interests: ["Infrastructure", "Education"] },
    watchToday: [
      {
        id: "sample-bill", kind: "bill", label: "Bill", title: "Sample bill: community infrastructure",
        href: sampleLink, sourceUrl: sampleLink,
        whatHappened: "In this example, a saved infrastructure bill has moved to committee review.",
        whySelected: "You follow infrastructure and saved this bill to your watchlist.",
        next: "Watch for a hearing date, amendments, or a committee vote."
      },
      {
        id: "sample-official", kind: "official", label: "Official", title: "Sample official: the committee lead",
        href: sampleLink, sourceUrl: sampleLink,
        whatHappened: "In this example, a followed official is leading review of an education proposal.",
        whySelected: "The official's role connects to your saved education interests.",
        next: "Watch for the committee agenda and the official's recorded votes."
      }
    ],
    yesterdayInPolitics: [{
      id: "sample-coverage", label: "Story signal", title: "Sample coverage: federal funding discussions",
      body: "This illustrates where a short summary of the previous day's coverage would appear. It is not a current news report.",
      href: sampleLink, issueMatches: ["Infrastructure"], sourceKind: "watch-lane", sourceName: "Illustrative sample"
    }],
    watchlistMovement: {
      summary: "Sample: one saved bill has a new committee action since the previous brief.",
      items: [{
        id: "sample-movement", label: "Bill", title: "Sample infrastructure bill",
        body: "Committee review added. The real brief would link to the official action and its date.",
        href: sampleLink, occurredAt: generatedAt
      }]
    },
    worthCheckingNext: [
      { label: "Review the committee action", body: "See what changed with the bill you follow.", href: sampleLink },
      { label: "Check the official's voting record", body: "Compare recorded votes with the issues you track.", href: sampleLink }
    ],
    writtenSummary: {
      headline: "Sample personalized brief", nextStep: "Review your watchlist", paragraphs: [],
      sourceNote: "All items in this layout preview are illustrative. No live stories, official findings, account data, or subscription entitlements are represented."
    }
  };
}
