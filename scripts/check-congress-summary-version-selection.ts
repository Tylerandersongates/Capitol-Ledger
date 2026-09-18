import assert from "node:assert/strict";
import { selectLatestCongressBillSummary } from "../lib/congress/normalizers";

const olderRepublished = {
  actionDate: "2026-07-17",
  text: "Earlier bill version",
  updateDate: "2026-09-18T10:00:00Z",
  versionCode: "07"
};
const newerVersion = {
  actionDate: "2026-07-22",
  text: "House-passed bill version",
  updateDate: "2026-07-23T10:00:00Z",
  versionCode: "53"
};
const newerRevision = {
  ...newerVersion,
  text: "Revised House-passed summary",
  updateDate: "2026-07-24T10:00:00Z"
};

assert.equal(selectLatestCongressBillSummary([olderRepublished, newerVersion])?.text, newerVersion.text);
assert.equal(selectLatestCongressBillSummary([newerVersion, newerRevision])?.text, newerRevision.text);
assert.equal(selectLatestCongressBillSummary([{ ...newerVersion, text: " " }]), undefined);

console.log("Congress.gov summary version selection passed.");
