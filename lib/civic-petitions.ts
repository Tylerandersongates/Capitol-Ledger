export type CivicPetition = {
  body: string;
  id: string;
  progressLabel: string;
  progressPercent: number;
  targetLabel: string;
  title: string;
};

export const civicPetitions: CivicPetition[] = [
  {
    id: "petition-public-records-2026",
    title: "Protect Public Records Access",
    body: "Support stronger publication standards for federal vote and committee records.",
    progressLabel: "31,200 supporters",
    progressPercent: 62,
    targetLabel: "Goal 50,000"
  },
  {
    id: "petition-vote-transparency-2026",
    title: "Require Vote Explanation Notes",
    body: "Support short plain-language notes for each major vote to improve civic understanding.",
    progressLabel: "18,940 supporters",
    progressPercent: 63,
    targetLabel: "Goal 30,000"
  },
  {
    id: "petition-ethics-audit-2026",
    title: "Expand Ethics Audit Reporting",
    body: "Support quarterly public accountability summaries for committee and floor actions.",
    progressLabel: "22,510 supporters",
    progressPercent: 56,
    targetLabel: "Goal 40,000"
  }
];

export function getCivicPetitionById(id: string) {
  return civicPetitions.find((petition) => petition.id === id);
}
