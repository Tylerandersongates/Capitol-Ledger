import assert from "node:assert/strict";
import { getMatchedOfficials } from "../lib/beta-district-presets";
import type { Member } from "../types/capitol";

function makeMember({
  bioguideId,
  chamber,
  district,
  lastName,
  state
}: Pick<Member, "bioguideId" | "chamber" | "district" | "lastName" | "state">): Member {
  return {
    active: true,
    bioguideId,
    chamber,
    description: "Synthetic district-matching fixture.",
    district,
    firstName: "Test",
    fullName: `${chamber === "Senate" ? "Sen." : "Rep."} Test ${lastName}`,
    lastName,
    party: "Independent",
    sourceUrl: "https://www.congress.gov/",
    state,
    term: "119th Congress"
  };
}

const members = [
  makeMember({ bioguideId: "CA33", chamber: "House", district: "33", lastName: "District", state: "CA" }),
  makeMember({ bioguideId: "CA34", chamber: "House", district: "34", lastName: "Neighbor", state: "CA" }),
  makeMember({ bioguideId: "CAS2", chamber: "Senate", lastName: "Zulu", state: "CA" }),
  makeMember({ bioguideId: "CAS1", chamber: "Senate", lastName: "Alpha", state: "California" }),
  makeMember({ bioguideId: "NY14", chamber: "House", district: "14", lastName: "OtherState", state: "NY" })
];

assert.deepEqual(
  getMatchedOfficials(members, "CA-33").map((member) => member.bioguideId),
  ["CA33", "CAS1", "CAS2"],
  "A district match should include only the exact House member and the state's senators"
);
assert.deepEqual(getMatchedOfficials(members), [], "A missing district must not default to another state");

console.log("District official matching check passed.");
