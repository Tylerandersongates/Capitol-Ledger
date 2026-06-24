export type CivicPetition = {
  body: string;
  id: string;
  progressLabel: string;
  targetLabel: string;
  title: string;
};

export const civicPetitions: CivicPetition[] = [];

export function getCivicPetitionById(id: string) {
  return civicPetitions.find((petition) => petition.id === id);
}
