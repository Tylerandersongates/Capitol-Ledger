import assert from "node:assert/strict";
import { getBillStatusFromActions } from "@/lib/bill-status";
import type { BillAction } from "@/types/capitol";

type StatusAction = Pick<BillAction, "action" | "date" | "kind" | "occurredAt">;

const stored = {
  latestActionDate: "2026-01-12",
  latestActionText: "Introduced in House"
};

const passage: StatusAction = {
  action: "Passed/agreed to in House: On passage Passed by the Yeas and Nays: 232 - 198.",
  date: "2026-07-22",
  kind: "Vote",
  occurredAt: "2026-07-22T16:52:00Z"
};

const laterFloorAction: StatusAction = {
  action: "Motion to reconsider laid on the table Agreed to without objection.",
  date: "2026-07-22",
  kind: "Floor",
  occurredAt: "2026-07-22T16:53:00Z"
};

const senateCalendar: StatusAction = {
  action: "Read the second time. Placed on Senate Legislative Calendar under General Orders.",
  date: "2026-08-06",
  kind: "Source Update",
  occurredAt: "2026-08-06T00:00:00Z"
};

assert.equal(getBillStatusFromActions({
  latestActionDate: "2026-07-23",
  latestActionText: "Received in the Senate."
}, [passage, senateCalendar]), "On Floor", "New Senate calendar action must update a stale stored status.");
assert.equal(getBillStatusFromActions(stored, [passage, laterFloorAction]), "On Floor");
assert.equal(getBillStatusFromActions(stored, [passage]), "Passed");
assert.equal(getBillStatusFromActions(stored, [{
  ...laterFloorAction,
  action: "Referred to the Senate Committee on Rules and Administration.",
  date: "2026-07-23",
  kind: "Committee",
  occurredAt: "2026-07-23T12:00:00Z"
}, passage]), "In Committee");
assert.equal(getBillStatusFromActions({
  latestActionDate: "2026-07-24",
  latestActionText: "Signed by the President and became Public Law"
}, [passage]), "Enacted");
assert.equal(getBillStatusFromActions({
  latestActionDate: "2026-07-24",
  latestActionText: "Placed on the Senate calendar"
}, [passage]), "On Floor", "Older actions must not replace newer stored status.");

console.log("Bill action status fixtures passed.");
