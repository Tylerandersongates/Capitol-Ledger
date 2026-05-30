export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function ordinal(value: number) {
  const mod100 = value % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? "th" : value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th";
  return `${value}${suffix}`;
}

export function currentCongressLabel(date = new Date()) {
  return `${ordinal(currentCongressNumber(date))} Congress`;
}

export function currentCongressNumber(date = new Date()) {
  const year = date.getUTCFullYear();
  const isBeforeCongressSwearingIn = date.getUTCMonth() === 0 && date.getUTCDate() < 3;
  const congressYear = isBeforeCongressSwearingIn ? year - 1 : year;
  return Math.floor((congressYear - 1789) / 2) + 1;
}

export function congressNumberFromLabel(value?: string) {
  if (!value) return undefined;
  const match = value.match(/(\d+)(st|nd|rd|th)\s+Congress/i);
  if (!match) return undefined;

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function estimateTermsInOfficeFromCongressLabel(termLabel: string | undefined, chamber: "House" | "Senate") {
  const startCongress = congressNumberFromLabel(termLabel);
  if (!startCongress) return undefined;

  const sessionsServed = Math.max(1, currentCongressNumber() - startCongress + 1);
  if (chamber === "House") return sessionsServed;

  const yearsServed = sessionsServed * 2;
  return Math.max(1, Math.ceil(yearsServed / 6));
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function federalElectionDateIso(year: number) {
  const novFirst = new Date(Date.UTC(year, 10, 1));
  const dayOfWeek = novFirst.getUTCDay(); // 0 Sunday, 1 Monday ... 6 Saturday
  const firstMondayOffset = (8 - dayOfWeek) % 7;
  const firstMondayDay = 1 + firstMondayOffset;
  const firstTuesdayDay = firstMondayDay + 1;
  return `${year}-11-${pad2(firstTuesdayDay)}`;
}

export function partyInitial(party: string) {
  if (party === "Democrat") return "D";
  if (party === "Republican") return "R";
  if (party === "Independent") return "I";
  return "?";
}

export function positionTone(position: string) {
  if (position === "Yes") return "bg-civic/15 text-aurora";
  if (position === "No") return "bg-rust/15 text-rust";
  if (position === "Present") return "bg-brass/15 text-brass";
  return "bg-white/10 text-blue-100";
}
