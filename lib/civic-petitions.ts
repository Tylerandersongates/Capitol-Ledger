export type CivicPetition = {
  body: string;
  id: string;
  progressLabel: string;
  targetLabel: string;
  title: string;
};

export const civicPetitions: CivicPetition[] = [
  {
    id: "petition-public-records-2026",
    title: "Protect Public Records Access",
    body: "Support stronger publication standards for federal vote and committee records.",
    progressLabel: "Public records",
    targetLabel: "Counts once"
  },
  {
    id: "petition-vote-transparency-2026",
    title: "Require Vote Explanation Notes",
    body: "Support short plain-language notes for each major vote to improve civic understanding.",
    progressLabel: "Vote transparency",
    targetLabel: "Counts once"
  },
  {
    id: "petition-ethics-audit-2026",
    title: "Expand Ethics Audit Reporting",
    body: "Support quarterly public accountability summaries for committee and floor actions.",
    progressLabel: "Ethics reporting",
    targetLabel: "Counts once"
  }
];

export function getCivicPetitionById(id: string) {
  return civicPetitions.find((petition) => petition.id === id);
}
