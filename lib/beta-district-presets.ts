import type { Member } from "@/types/capitol";

export type BetaDistrictPreset = {
  code: string;
  input: string[];
  label: string;
  state: string;
  stateCode: string;
};

export const betaDistrictPresets: BetaDistrictPreset[] = [
  {
    code: "CA-34",
    input: ["california", "los angeles", "la,", "ca-34"],
    label: "Los Angeles, California - CA-34",
    state: "California",
    stateCode: "CA"
  },
  {
    code: "MA-07",
    input: ["massachusetts", "boston", "cambridge", "ma-7", "ma-07"],
    label: "Boston, Massachusetts - MA-07",
    state: "Massachusetts",
    stateCode: "MA"
  },
  {
    code: "NY-14",
    input: ["new york", "bronx", "queens", "ny-14"],
    label: "New York, New York - NY-14",
    state: "New York",
    stateCode: "NY"
  },
  {
    code: "TX-10",
    input: ["texas", "austin", "travis", "tx-10"],
    label: "Austin, Texas - TX-10",
    state: "Texas",
    stateCode: "TX"
  },
  {
    code: "TX-18",
    input: ["houston", "tx-18"],
    label: "Houston, Texas - TX-18",
    state: "Texas",
    stateCode: "TX"
  },
  {
    code: "TX-32",
    input: ["dallas", "tx-32"],
    label: "Dallas, Texas - TX-32",
    state: "Texas",
    stateCode: "TX"
  }
];

export const betaTesterStateOptions = betaDistrictPresets.slice(0, 4);

export function stateCodeFromDistrictCode(code?: string) {
  return code?.match(/^([A-Z]{2})-/i)?.[1]?.toUpperCase();
}

export function districtNumberFromCode(code?: string) {
  return code?.match(/^[A-Z]{2}-0?(\d{1,2})$/i)?.[1];
}

export function getMatchedOfficials(members: Member[], districtCode?: string) {
  const stateCode = stateCodeFromDistrictCode(districtCode) ?? "TX";
  const districtNumber = districtNumberFromCode(districtCode);
  const stateMembers = members.filter((member) => member.state === stateCode);
  const exactRepresentative = districtNumber
    ? stateMembers.find((member) => member.chamber === "House" && member.district === districtNumber)
    : undefined;

  return [
    ...(exactRepresentative ? [exactRepresentative] : []),
    ...stateMembers
      .filter((member) => member.chamber === "Senate")
      .sort((a, b) => a.lastName.localeCompare(b.lastName)),
    ...stateMembers
      .filter((member) => member.chamber === "House" && member.bioguideId !== exactRepresentative?.bioguideId)
      .sort((a, b) => a.lastName.localeCompare(b.lastName))
  ];
}
