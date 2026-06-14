export const minimumTeamSeatCount = 3;

export function normalizeTeamSeatCount(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return minimumTeamSeatCount;

  return Math.max(minimumTeamSeatCount, Math.floor(parsed));
}

export function normalizeOptionalTeamSeatCount(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;

  return normalizeTeamSeatCount(value);
}
