import assert from "node:assert/strict";
import houseHistory from "../data/house-first-elected-119.json";
import { nextRegularHouseElectionDate, withMemberServiceFallback } from "../lib/member-service-history";
import type { Member } from "../types/capitol";

function member(bioguideId: string, chamber: Member["chamber"], state: string, active = true): Member {
  return {
    active,
    bioguideId,
    chamber,
    description: "Fixture",
    firstName: "Test",
    fullName: "Test Member",
    lastName: "Member",
    party: "Republican",
    sourceUrl: "https://www.congress.gov",
    state,
    term: "119th Congress"
  };
}

assert.equal(Object.keys(houseHistory.members).length, 433, "The Clerk snapshot should cover all 433 voting Representatives.");
assert.equal(houseHistory.members.B001323.firstElectedDate, "2024-11-05");
assert.equal(houseHistory.members.G000585.firstElectedDate, "2017-06-06", "Special-election dates must survive.");
assert.equal(houseHistory.members.F000454.firstElectedDate, "2008-03-08", "Returning members need their original win.");
assert.equal(houseHistory.members.C001055.firstElectedDate, "2002-11-30");
assert.equal(houseHistory.members.H001077.firstElectedDate, "2016-12-10", "Louisiana runoff is not the November general date.");
assert.equal(houseHistory.members.J000299.firstElectedDate, "2016-12-10");

assert.equal(nextRegularHouseElectionDate(new Date("2026-09-17T12:00:00Z")), "2026-11-03");
assert.equal(nextRegularHouseElectionDate(new Date("2026-11-03T12:00:00Z")), "2026-11-03");
assert.equal(nextRegularHouseElectionDate(new Date("2026-11-04T01:00:00Z")), "2026-11-03");
assert.equal(nextRegularHouseElectionDate(new Date("2026-11-04T12:00:00Z")), "2028-11-07");

const begich = withMemberServiceFallback({
  ...member("B001323", "House", "AK"),
  firstElectedDate: "2024-01-01",
  nextElectionDate: "2024-01-01"
});
assert.equal(begich.firstElectedDate, "2024-11-05", "Clerk history must win over stale raw values.");
assert.equal(begich.nextElectionDate, nextRegularHouseElectionDate());
assert.equal(withMemberServiceFallback(member("B001323", "House", "AK", false)).nextElectionDate, undefined);
assert.equal(withMemberServiceFallback(member("B001323", "House", "DC")).firstElectedDate, undefined);
assert.equal(withMemberServiceFallback(member("D000001", "House", "DC")).nextElectionDate, undefined);
assert.equal(withMemberServiceFallback(member("P000001", "House", "PR")).nextElectionDate, undefined);
assert.equal(withMemberServiceFallback(member("X000001", "House", "AK")).nextElectionDate, nextRegularHouseElectionDate());

const senator = withMemberServiceFallback(member("S001150", "Senate", "NE"));
assert.equal(senator.firstElectedDate, "2024-11-05", "The existing Senate fallback stays intact.");
assert.equal(senator.nextElectionDate, "2030-11-05");

console.log("House election-history fixtures passed.");
