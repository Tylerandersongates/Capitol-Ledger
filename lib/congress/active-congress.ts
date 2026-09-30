export const activeCongressFallback = 119;

export function getConfiguredCongress(value = process.env.CONGRESS_SYNC_CONGRESS) {
  const normalized = value?.trim() ?? "";
  if (!/^\d{1,3}$/.test(normalized)) return activeCongressFallback;

  const congress = Number(normalized);
  return Number.isInteger(congress) && congress >= 1 && congress <= 999
    ? congress
    : activeCongressFallback;
}

export function getCongressFromTerm(term?: string, fallback = getConfiguredCongress()) {
  const congress = Number(term?.match(/\b(\d{1,3})(?:st|nd|rd|th)?\s+Congress\b/i)?.[1]);
  return Number.isInteger(congress) && congress >= 1 && congress <= 999
    ? congress
    : fallback;
}

export function getCongressLabel(congress = getConfiguredCongress()) {
  const mod100 = congress % 100;
  const suffix = mod100 >= 11 && mod100 <= 13
    ? "th"
    : congress % 10 === 1
      ? "st"
      : congress % 10 === 2
        ? "nd"
        : congress % 10 === 3
          ? "rd"
          : "th";
  return `${congress}${suffix} Congress`;
}
