import assert from "node:assert/strict";
import { deriveGovInfoTextUrl, isReviewedHr7008TextVersion, plainTextFromOfficialHtml, selectLatestBillTextVersion, textVersionIsNewer } from "../lib/congress/bill-text";

const bill = { congress: 119, billType: "hr", billNumber: "7008" };
const versions = [
  { date: "2026-07-17T04:00:00Z", type: "Introduced in House", formats: [{ type: "Formatted Text", url: "https://www.congress.gov/119/bills/hr7008/BILLS-119hr7008ih.htm" }] },
  { date: "2026-07-22T04:00:00Z", type: "Engrossed in House", formats: [{ type: "Formatted Text", url: "https://www.congress.gov/119/bills/hr7008/BILLS-119hr7008eh.htm" }] }
];

const latest = selectLatestBillTextVersion(versions, bill);
assert.equal(latest?.date, "2026-07-22");
assert.equal(latest?.govInfoUrl, "https://www.govinfo.gov/content/pkg/BILLS-119hr7008eh/html/BILLS-119hr7008eh.htm");
assert.equal(textVersionIsNewer(latest!.date, "2026-07-17"), true);
assert.equal(isReviewedHr7008TextVersion(latest!, bill), true);

const senateCalendar = selectLatestBillTextVersion([
  ...versions,
  { date: "2026-08-06T04:00:00Z", type: "Placed on Calendar Senate", formats: [{ type: "Formatted Text", url: "https://www.congress.gov/119/bills/hr7008/BILLS-119hr7008pcs.htm" }] }
], bill);
assert.equal(senateCalendar?.date, "2026-08-06");
assert.equal(isReviewedHr7008TextVersion(senateCalendar!, bill), true, "the verified unchanged Senate-calendar printing keeps the current overview");

const later = selectLatestBillTextVersion([
  ...versions,
  { date: "2026-09-01T04:00:00Z", type: "Engrossed in Senate", formats: [{ type: "Formatted Text", url: "https://www.congress.gov/119/bills/hr7008/BILLS-119hr7008es.htm" }] }
], bill);
assert.equal(later?.date, "2026-09-01");
assert.equal(isReviewedHr7008TextVersion(later!, bill), false, "a later version must replace the reviewed overview");
assert.equal(textVersionIsNewer("2026-08-01", "2026-08-01"), false, "same-version CRS may lead");
assert.equal(deriveGovInfoTextUrl("https://www.congress.gov/119/bills/hr70080/BILLS-119hr70080eh.htm", bill), undefined);
assert.equal(deriveGovInfoTextUrl("https://example.com/BILLS-119hr7008eh.htm", bill), undefined);

const html = "<html><head><style>ignore</style></head><body><pre>SECTION 1. TEST.\nA &amp; B &lt; C.\nSECTION 2. PHOTO IDENTIFICATION.</pre></body></html>";
assert.equal(plainTextFromOfficialHtml(html), "SECTION 1. TEST.\nA & B < C.\nSECTION 2. PHOTO IDENTIFICATION.");

console.log("Bill text freshness checks passed.");
