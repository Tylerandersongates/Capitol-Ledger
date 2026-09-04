import type { DailyBriefEditorialOverride } from "@/lib/weekly-brief";

// CapitolWonk editors can pin any combination of a vote, bill, and official for
// a dated edition. Invalid or unavailable IDs fall back to the neutral ranking.
const scheduledEditorialOverrides: Record<string, DailyBriefEditorialOverride> = {};

export function getDailyBriefEditorialOverride(editionDate: string) {
  return scheduledEditorialOverrides[editionDate];
}
