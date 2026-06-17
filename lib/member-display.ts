import type { Member } from "@/types/capitol";

export type MemberDisplayRecord = Pick<Member, "chamber" | "district" | "fullName" | "party" | "state">;

const territoryHouseSeatStates = ["AS", "DC", "GU", "MP", "PR", "VI"];
const stateCodeByName: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  "american samoa": "AS",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  "district of columbia": "DC",
  florida: "FL",
  georgia: "GA",
  guam: "GU",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  "northern mariana islands": "MP",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "puerto rico": "PR",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  "united states": "US",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  "virgin islands": "VI",
  "us virgin islands": "VI",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY"
};

export function memberStateCode(state: string) {
  const trimmed = state.trim();
  const upper = trimmed.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return upper;

  const normalizedName = trimmed
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();

  return stateCodeByName[normalizedName] ?? trimmed;
}

export function stripMemberPrefix(fullName: string) {
  return fullName.replace(/^Sen\.\s+|^Rep\.\s+/i, "").trim();
}

export function isAtLargeDistrict(district?: string) {
  const normalized = district?.trim().toLowerCase();
  return normalized === "0" || normalized === "00" || normalized === "al" || normalized === "at-large" || normalized === "at large" || normalized === "atlarge";
}

export function isTerritoryHouseSeat(member: Pick<MemberDisplayRecord, "chamber" | "state">) {
  return member.chamber === "House" && territoryHouseSeatStates.includes(memberStateCode(member.state));
}

export function memberOfficeLabel(member: Pick<MemberDisplayRecord, "chamber" | "state">) {
  if (member.chamber === "Senate") return "Senator";
  if (memberStateCode(member.state) === "PR") return "Resident Commissioner";
  if (isTerritoryHouseSeat(member)) return "Delegate";
  return "Representative";
}

export function memberSeatCode(member: Pick<MemberDisplayRecord, "chamber" | "district" | "state">) {
  const stateCode = memberStateCode(member.state);

  if (member.district) return `${stateCode}-${isAtLargeDistrict(member.district) ? "AL" : member.district}`;
  return isTerritoryHouseSeat(member) ? `${stateCode}-AL` : stateCode;
}

export function memberResultMeta(member: MemberDisplayRecord, separator = " · ") {
  return [memberOfficeLabel(member), memberSeatCode(member), member.party].join(separator);
}

export function memberDisplayLocation(member: Pick<MemberDisplayRecord, "chamber" | "district" | "state">, stateLabel = member.state) {
  if (!member.district) return isTerritoryHouseSeat(member) ? `${stateLabel} At-Large` : stateLabel;
  return isAtLargeDistrict(member.district) ? `${stateLabel} At-Large` : `${stateLabel} District ${member.district}`;
}

export function memberSeatTag(member: Pick<MemberDisplayRecord, "chamber" | "district" | "party" | "state">) {
  const partyCode = member.party.trim().charAt(0).toUpperCase() || "U";
  return `[${partyCode}-${memberSeatCode(member)}]`;
}
