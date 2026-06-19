import type { Bill } from "@/types/capitol";

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
