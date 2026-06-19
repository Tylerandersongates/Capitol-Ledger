import type { Bill } from "../types/capitol";

export type PolicyEdgeFeedMode = "priority" | "risk";

export function rankPolicyEdgeBills(bills: Bill[], mode: PolicyEdgeFeedMode) {
  return dedupePolicyEdgeBills(bills, mode).sort((left, right) => {
    const scoreDelta = getPolicyEdgeScore(right, mode) - getPolicyEdgeScore(left, mode);
    if (scoreDelta) return scoreDelta;
    return Date.parse(right.latestActionDate) - Date.parse(left.latestActionDate);
  });
}

export function getPolicyEdgeScore(bill: Bill, mode: PolicyEdgeFeedMode) {
  const action = bill.latestActionText.toLowerCase();
  let score = mode === "priority" ? 54 : 58;

  if (action.includes("reported") || action.includes("ordered to be reported")) score += mode === "priority" ? 22 : 12;
  if (action.includes("hearing") || action.includes("markup")) score += mode === "priority" ? 18 : 8;
  if (action.includes("committee") || action.includes("subcommittee")) score += mode === "priority" ? 14 : 6;
  if (action.includes("calendar") || action.includes("floor")) score += mode === "risk" ? 22 : 10;
  if (action.includes("passed") || action.includes("received in")) score += mode === "risk" ? 14 : 4;
  if (isRecentBillAction(bill.latestActionDate)) score += 10;

  return Math.min(99, score);
}

export function isRecentBillAction(value?: string) {
  if (!value) return false;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return false;

  return Date.now() - timestamp <= 1000 * 60 * 60 * 24 * 21;
}

function dedupePolicyEdgeBills(bills: Bill[], mode: PolicyEdgeFeedMode) {
  const uniqueBills: Bill[] = [];
  const billIndexesByKey = new Map<string, number>();

  bills.forEach((bill) => {
    const key = getPolicyEdgeBillKey(bill);
    const existingIndex = billIndexesByKey.get(key);

    if (existingIndex === undefined) {
      billIndexesByKey.set(key, uniqueBills.length);
      uniqueBills.push(bill);
      return;
    }

    uniqueBills[existingIndex] = choosePolicyEdgeBill(uniqueBills[existingIndex], bill, mode);
  });

  return uniqueBills;
}

function getPolicyEdgeBillKey(bill: Bill) {
  const congress = String(bill.congress || "").trim();
  const billType = normalizePolicyEdgeKeyPart(bill.billType);
  const billNumber = normalizePolicyEdgeKeyPart(bill.billNumber);

  if (congress && billType && billNumber) return `${congress}:${billType}:${billNumber}`;

  return [normalizePolicyEdgeKeyPart(bill.displayNumber), normalizePolicyEdgeKeyPart(bill.shortTitle || bill.title)].filter(Boolean).join(":") || bill.id;
}

function choosePolicyEdgeBill(current: Bill, candidate: Bill, mode: PolicyEdgeFeedMode) {
  const currentIsDemo = isDemoPolicyEdgeBill(current);
  const candidateIsDemo = isDemoPolicyEdgeBill(candidate);

  if (currentIsDemo !== candidateIsDemo) return candidateIsDemo ? current : candidate;

  const scoreDelta = getPolicyEdgeScore(candidate, mode) - getPolicyEdgeScore(current, mode);
  if (scoreDelta > 0) return candidate;
  if (scoreDelta < 0) return current;

  const actionDelta = Date.parse(candidate.latestActionDate) - Date.parse(current.latestActionDate);
  if (actionDelta > 0) return candidate;
  if (actionDelta < 0) return current;

  const currentIsOfficial = current.sourceUrl.includes("congress.gov");
  const candidateIsOfficial = candidate.sourceUrl.includes("congress.gov");
  if (currentIsOfficial !== candidateIsOfficial) return candidateIsOfficial ? candidate : current;

  return current;
}

function normalizePolicyEdgeKeyPart(value?: string | number) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function isDemoPolicyEdgeBill(bill: Bill) {
  return bill.id.startsWith("demo-") || bill.sourceUrl.includes("/demo");
}
