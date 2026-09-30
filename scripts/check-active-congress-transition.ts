import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { activeCongressFallback, getConfiguredCongress, getCongressFromTerm, getCongressLabel } from "@/lib/congress/active-congress";
import type { CongressBillListItem } from "@/lib/congress/client";
import { normalizeCongressBill, normalizeCongressBillSponsor, normalizeCongressMember } from "@/lib/congress/normalizers";

assert.equal(getConfiguredCongress(undefined), activeCongressFallback);
assert.equal(getConfiguredCongress(""), activeCongressFallback);
assert.equal(getConfiguredCongress("invalid"), activeCongressFallback);
assert.equal(getConfiguredCongress("0"), activeCongressFallback);
assert.equal(getConfiguredCongress("1000"), activeCongressFallback);
assert.equal(getConfiguredCongress("119"), 119);
assert.equal(getConfiguredCongress(" 120 "), 120);

assert.equal(getCongressFromTerm("119th Congress", 120), 119);
assert.equal(getCongressFromTerm("120th Congress", 119), 120);
assert.equal(getCongressFromTerm("Congress term unavailable", 120), 120);
assert.equal(getCongressFromTerm("Served from 2025 to 2027", 120), 120);
assert.equal(getCongressLabel(119), "119th Congress");
assert.equal(getCongressLabel(120), "120th Congress");
assert.equal(getCongressLabel(121), "121st Congress");

const bill120: CongressBillListItem = {
  congress: 120,
  latestAction: {
    actionDate: "2027-01-03",
    text: "Introduced in House."
  },
  number: "1",
  sponsors: [{
    bioguideId: "T000120",
    district: 1,
    firstName: "Transition",
    lastName: "Member",
    party: "Independent",
    state: "CA"
  }],
  title: "Transition fixture",
  type: "HR",
  updateDate: "2027-01-03"
};
const normalizedBill120 = normalizeCongressBill(bill120);

assert.ok(normalizedBill120);
assert.equal(normalizedBill120.congress, 120);
assert.equal(normalizedBill120.id, "live-120-hr-1");
assert.match(normalizedBill120.sourceUrl ?? "", /\/120th-congress\/house-bill\/1$/);
assert.notEqual(normalizedBill120.id, "live-119-hr-1", "A 120th-Congress bill must not reuse its 119th-Congress follow target ID.");

const member120 = normalizeCongressMember({
  bioguideId: "T000120",
  district: 1,
  name: "Transition Member",
  partyName: "Independent",
  state: "CA"
}, 120);
assert.equal(member120?.term, "120th Congress");
assert.equal(normalizeCongressBillSponsor(bill120)?.term, "120th Congress");

const member119 = normalizeCongressMember({
  bioguideId: "T000120",
  district: 1,
  name: "Transition Member",
  partyName: "Independent",
  state: "CA"
}, 119);
assert.equal(member119?.bioguideId, member120?.bioguideId, "A continuing member must retain the same follow target across Congresses.");
assert.equal(member119?.term, "119th Congress");
assert.notEqual(member119?.term, member120?.term, "The stable member identity must not preserve a stale Congress label.");

const dataSource = readFileSync("lib/data.ts", "utf8");
assert.match(
  dataSource,
  /normalizeCongressMemberDetail\(response\.member, bill\.congress\)/,
  "A live sponsor-detail fallback must keep the Congress of the bill being viewed."
);

console.log("Active Congress transition fixtures passed.");
