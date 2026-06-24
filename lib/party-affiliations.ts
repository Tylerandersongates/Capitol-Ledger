export const partyOptions = [
  { value: "", label: "Not selected", display: "Not selected" },
  { value: "prefer-not", label: "Prefer not to say", display: "Prefer not to say" },
  { value: "democrat", label: "Democrat", display: "Democrat" },
  { value: "republican", label: "Republican", display: "Republican" },
  { value: "independent", label: "Independent", display: "Independent" },
  { value: "libertarian", label: "Libertarian", display: "Libertarian" },
  { value: "green", label: "Green", display: "Green" },
  { value: "other", label: "Other", display: "Other" }
] as const;

const searchablePartyValues = new Set(["democrat", "republican", "independent", "libertarian", "green", "other"]);

export const searchPartyOptions = partyOptions
  .filter((option) => searchablePartyValues.has(option.value))
  .map((option) => ({
    label: option.label,
    value: option.display
  }));

export const officialSearchPartyValues = ["Democrat", "Independent", "Republican"] as const;

export type OfficialSearchParty = (typeof officialSearchPartyValues)[number];

export function getPartyLabel(value: string) {
  return partyOptions.find((option) => option.value === value)?.display ?? partyOptions[0].display;
}

export function normalizeSearchPartyFilter(value?: string) {
  const normalizedValue = value?.trim();
  if (!normalizedValue) return undefined;

  const lowerValue = normalizedValue.toLowerCase();
  const directOption = searchPartyOptions.find(
    (option) => option.value.toLowerCase() === lowerValue || option.label.toLowerCase() === lowerValue
  );
  if (directOption) return directOption.value;

  const affiliationOption = partyOptions.find(
    (option) => option.value === lowerValue && searchablePartyValues.has(option.value)
  );
  return affiliationOption?.display;
}

export function isOfficialSearchParty(value?: string): value is OfficialSearchParty {
  return officialSearchPartyValues.includes(value as OfficialSearchParty);
}
