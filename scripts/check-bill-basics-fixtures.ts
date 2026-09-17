import assert from "node:assert/strict";
import type { CongressBillListItem } from "@/lib/congress/client";
import { mergeOfficialBillBasics, normalizeCongressBillSponsor } from "@/lib/congress/normalizers";
import type { Bill } from "@/types/capitol";

const catalogBill: Bill = {
  billNumber: "9956",
  billType: "HR",
  congress: 119,
  displayNumber: "H.R. 9956",
  id: "live-119-hr-9956",
  latestActionDate: "2026-07-27",
  latestActionText: "Referred to the House Committee on Education and Workforce.",
  policyArea: "Legislation",
  shortTitle: "Seizure Safe Schools Act of 2026",
  sourceUrl: "https://www.congress.gov/bill/119th-congress/house-bill/9956",
  summary: "Catalog summary",
  title: "Seizure Safe Schools Act of 2026"
};

const officialDetail: CongressBillListItem = {
  congress: 119,
  committees: { count: 1 },
  introducedDate: "2026-07-27",
  latestAction: {
    actionDate: "2026-07-27",
    text: "Referred to the House Committee on Education and Workforce."
  },
  number: "9956",
  sponsors: [{
    bioguideId: "F000477",
    firstName: "Valerie",
    fullName: "Rep. Foushee, Valerie P. [D-NC-4]",
    lastName: "Foushee",
    party: "D",
    state: "NC"
  }],
  title: "Seizure Safe Schools Act of 2026",
  type: "HR"
};

const hydrated = mergeOfficialBillBasics(catalogBill, officialDetail);
assert.equal(hydrated.id, catalogBill.id, "Official metadata must preserve the database bill identity.");
assert.equal(hydrated.summary, catalogBill.summary, "Official metadata must not overwrite stored editorial content.");
assert.equal(hydrated.sponsorBioguideId, "F000477");
assert.equal(hydrated.introducedDate, "2026-07-27");
assert.equal(hydrated.committeeName, "Committee on Education and Workforce");
assert.equal(normalizeCongressBillSponsor(officialDetail)?.fullName, "Rep. Valerie P. Foushee");

const actionHydrated = mergeOfficialBillBasics(
  { ...catalogBill, latestActionText: "Latest action pending from Congress.gov." },
  null,
  ["Referred to the Senate Committee on Health, Education, Labor, and Pensions."]
);
assert.equal(actionHydrated.committeeName, "Committee on Health, Education, Labor, and Pensions");
assert.equal(actionHydrated.introducedDate, undefined, "A timeline action cannot establish the introduction date.");

console.log("Bill Basics fixtures passed.");
