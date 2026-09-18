import type { Bill, BillAction } from "@/types/capitol";

export type BillStatus = "Enacted" | "Passed" | "In Committee" | "On Floor" | "In Progress";

export function isBillLawActionText(actionText?: string) {
  const action = actionText?.toLowerCase() ?? "";

  return (
    action.includes("public law") ||
    action.includes("private law") ||
    action.includes("became law") ||
    action.includes("signed by president") ||
    action.includes("signed by the president") ||
    action.includes("enacted")
  );
}

export function getBillStatus(bill: Pick<Bill, "latestActionText">): BillStatus {
  const action = bill.latestActionText.toLowerCase();

  if (isBillLawActionText(action)) return "Enacted";
  if (action.includes("passed")) return "Passed";
  if (action.includes("committee") || action.includes("hearing") || action.includes("reported")) return "In Committee";
  if (action.includes("calendar") || action.includes("floor")) return "On Floor";
  return "In Progress";
}

type StatusAction = Pick<BillAction, "action" | "date" | "kind" | "occurredAt">;

function statusFromAction(action: StatusAction): BillStatus | null {
  if (action.kind === "Enacted" || isBillLawActionText(action.action)) return "Enacted";
  if (/\b(?:passed\/agreed to in (?:the )?(?:house|senate)|on passage[^.]*passed|passed (?:the )?(?:house|senate))\b/i.test(action.action)) {
    return "Passed";
  }

  const textStatus = getBillStatus({ latestActionText: action.action });
  if (textStatus === "In Committee" || textStatus === "On Floor") return textStatus;
  if (action.kind === "Committee") return "In Committee";
  if (action.kind === "Floor" || action.kind === "Vote" || action.kind === "Chamber Transfer") return "On Floor";
  return null;
}

export function getBillStatusFromActions(
  bill: Pick<Bill, "latestActionText" | "latestActionDate">,
  actions: StatusAction[]
): BillStatus {
  const storedStatus = getBillStatus(bill);
  if (storedStatus === "Enacted") return storedStatus;

  const storedDate = bill.latestActionDate.slice(0, 10);
  const currentActions = actions
    .filter((action) => action.date >= storedDate)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

  for (const action of currentActions) {
    const actionStatus = statusFromAction(action);
    if (!actionStatus) continue;
    if (storedStatus === "Passed" && action.date === storedDate && actionStatus !== "Enacted") return storedStatus;
    return actionStatus;
  }

  return storedStatus;
}
