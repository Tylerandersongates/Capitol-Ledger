import type { Member } from "@/types/capitol";

export type BetaDistrictPreset = {
  code: string;
  input: string[];
  label: string;
  state: string;
  stateCode: string;
  zipCodes: string[];
};

export const betaDistrictPresets: BetaDistrictPreset[] = [
  {
    code: "CA-34",
    input: ["california", "ca", "los angeles", "la,", "ca-34"],
    label: "Los Angeles, California - CA-34",
    state: "California",
    stateCode: "CA",
    zipCodes: ["90012", "90020"]
  },
  {
    code: "CA-30",
    input: ["montrose", "la crescenta", "glendale", "ca-30", "california 30"],
    label: "Montrose, California - CA-30",
    state: "California",
    stateCode: "CA",
    zipCodes: ["91020"]
  },
  {
    code: "MA-05",
    input: ["medford", "ma-5", "ma-05", "massachusetts 5"],
    label: "Medford, Massachusetts - MA-05",
    state: "Massachusetts",
    stateCode: "MA",
    zipCodes: ["02155"]
  },
  {
    code: "MA-07",
    input: ["massachusetts", "ma", "boston", "cambridge", "ma-7", "ma-07"],
    label: "Boston, Massachusetts - MA-07",
    state: "Massachusetts",
    stateCode: "MA",
    zipCodes: ["02108", "02139"]
  },
  {
    code: "NY-14",
    input: ["new york", "ny", "bronx", "queens", "ny-14"],
    label: "New York, New York - NY-14",
    state: "New York",
    stateCode: "NY",
    zipCodes: ["10451", "11368"]
  },
  {
    code: "TX-10",
    input: ["texas", "tx", "austin", "travis", "tx-10"],
    label: "Austin, Texas - TX-10",
    state: "Texas",
    stateCode: "TX",
    zipCodes: ["78701", "78702"]
  },
  {
    code: "TX-18",
    input: ["houston", "tx-18"],
    label: "Houston, Texas - TX-18",
    state: "Texas",
    stateCode: "TX",
    zipCodes: ["77002"]
  },
  {
    code: "TX-32",
    input: ["dallas", "tx-32"],
    label: "Dallas, Texas - TX-32",
    state: "Texas",
    stateCode: "TX",
    zipCodes: ["75201", "75204", "75206"]
  }
];

export const betaDistrictZipExamples = betaDistrictPresets.flatMap((district) => district.zipCodes);

export function findBetaDistrictPresetForZip(zip: string) {
  return betaDistrictPresets.find((district) => district.zipCodes.includes(zip));
}

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
