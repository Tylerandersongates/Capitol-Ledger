import { memberStateCode } from "@/lib/member-display";
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
    input: ["california", "ca", "los angeles", "la,", "downtown la", "westlake", "ca-34"],
    label: "Los Angeles, California - CA-34",
    state: "California",
    stateCode: "CA",
    zipCodes: ["90012", "90013", "90017", "90020", "90026"]
  },
  {
    code: "CA-30",
    input: ["montrose", "la crescenta", "glendale", "ca-30", "california 30"],
    label: "Montrose, California - CA-30",
    state: "California",
    stateCode: "CA",
    zipCodes: ["91020", "91201", "91205"]
  },
  {
    code: "CA-11",
    input: ["san francisco", "sf", "ca-11", "california 11"],
    label: "San Francisco, California - CA-11",
    state: "California",
    stateCode: "CA",
    zipCodes: ["94102", "94103", "94110"]
  },
  {
    code: "MA-05",
    input: ["medford", "arlington", "lexington", "ma-5", "ma-05", "massachusetts 5"],
    label: "Medford, Massachusetts - MA-05",
    state: "Massachusetts",
    stateCode: "MA",
    zipCodes: ["02155", "02474", "02476"]
  },
  {
    code: "MA-07",
    input: ["massachusetts", "ma", "boston", "cambridge", "roxbury", "dorchester", "ma-7", "ma-07"],
    label: "Boston, Massachusetts - MA-07",
    state: "Massachusetts",
    stateCode: "MA",
    zipCodes: ["02108", "02119", "02121", "02139"]
  },
  {
    code: "MA-02",
    input: ["worcester", "leominster", "ma-2", "ma-02", "massachusetts 2"],
    label: "Worcester, Massachusetts - MA-02",
    state: "Massachusetts",
    stateCode: "MA",
    zipCodes: ["01608", "01609", "01453"]
  },
  {
    code: "NY-14",
    input: ["new york", "ny", "bronx", "queens", "jackson heights", "ny-14"],
    label: "New York, New York - NY-14",
    state: "New York",
    stateCode: "NY",
    zipCodes: ["10451", "10462", "11368", "11372"]
  },
  {
    code: "NY-08",
    input: ["brooklyn", "east new york", "canarsie", "ny-8", "ny-08", "new york 8"],
    label: "Brooklyn, New York - NY-08",
    state: "New York",
    stateCode: "NY",
    zipCodes: ["11201", "11205", "11207"]
  },
  {
    code: "TX-10",
    input: ["texas", "tx", "austin", "travis", "college station", "tx-10"],
    label: "Austin, Texas - TX-10",
    state: "Texas",
    stateCode: "TX",
    zipCodes: ["77845", "78701", "78702", "78703"]
  },
  {
    code: "TX-18",
    input: ["houston", "downtown houston", "third ward", "tx-18"],
    label: "Houston, Texas - TX-18",
    state: "Texas",
    stateCode: "TX",
    zipCodes: ["77002", "77004", "77007"]
  },
  {
    code: "TX-32",
    input: ["dallas", "lakewood", "north dallas", "tx-32"],
    label: "Dallas, Texas - TX-32",
    state: "Texas",
    stateCode: "TX",
    zipCodes: ["75201", "75204", "75206", "75214", "75231"]
  },
  {
    code: "TX-21",
    input: ["san antonio", "texas hill country", "san marcos", "tx-21", "texas 21"],
    label: "San Antonio, Texas - TX-21",
    state: "Texas",
    stateCode: "TX",
    zipCodes: ["78209", "78230", "78666"]
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
  const stateMembers = members.filter((member) => memberStateCode(member.state) === stateCode);
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
