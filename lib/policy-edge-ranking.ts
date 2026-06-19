import type { Bill, SavedFollowRecord } from "../types/capitol";

export type PolicyEdgeFeedMode = "priority" | "risk";
export type PolicyEdgeBillStance = "support" | "oppose" | "watching";

export type PriorityFeedRuleInput = {
  issueInterests: string[];
  savedFollows: SavedFollowRecord[];
  stances: Record<string, PolicyEdgeBillStance | undefined>;
};

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

export function filterPriorityFeedBills<T extends Bill>(bills: T[], input: PriorityFeedRuleInput) {
  const riskBillKeys = getBillKeysForStances(bills, input.stances, "risk");
  const savedBillIds = getSavedFollowIds(input.savedFollows, "bill");
  const savedBillKeys = new Set(bills.filter((bill) => savedBillIds.has(bill.id)).map(getPolicyEdgeBillKey));
  const savedMemberIds = getSavedFollowIds(input.savedFollows, "member");
  const supportedBillKeys = getBillKeysForStances(bills, input.stances, "support");

  return bills.filter((bill) =>
    isPriorityFeedBill(bill, {
      billStance: input.stances[bill.id],
      issueInterests: input.issueInterests,
      riskBillKeys,
      savedBillIds,
      savedBillKeys,
      savedMemberIds,
      supportedBillKeys
    })
  );
}

export function countPriorityFeedBills<T extends Bill>(bills: T[], input: PriorityFeedRuleInput) {
  return filterPriorityFeedBills(bills, input).length;
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

export function getPolicyEdgeBillKey(bill: Pick<Bill, "billNumber" | "billType" | "congress" | "displayNumber" | "id" | "shortTitle" | "title">) {
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

type PriorityFeedBillInput = {
  billStance?: PolicyEdgeBillStance;
  issueInterests: string[];
  riskBillKeys: Set<string>;
  savedBillIds: Set<string>;
  savedBillKeys: Set<string>;
  savedMemberIds: Set<string>;
  supportedBillKeys: Set<string>;
};

function getBillKeysForStances<T extends Bill>(bills: T[], stances: PriorityFeedRuleInput["stances"], mode: "risk" | "support") {
  const keys = new Set<string>();

  bills.forEach((bill) => {
    const stance = stances[bill.id];
    if ((mode === "risk" && isRiskWatchPolicyEdgeStance(stance)) || (mode === "support" && stance === "support")) {
      keys.add(getPolicyEdgeBillKey(bill));
    }
  });

  return keys;
}

function isPriorityFeedBill(bill: Bill, input: PriorityFeedBillInput) {
  const billKey = getPolicyEdgeBillKey(bill);

  if (isRiskWatchPolicyEdgeStance(input.billStance)) return false;
  if (input.billStance === "support" || input.supportedBillKeys.has(billKey)) return true;
  if (input.riskBillKeys.has(billKey)) return false;

  if (isPriorityMovementBill(bill) && (input.savedBillIds.has(bill.id) || input.savedBillKeys.has(billKey))) return true;
  if (isPriorityMovementBill(bill) && bill.sponsorBioguideId && input.savedMemberIds.has(bill.sponsorBioguideId)) return true;
  if (isPriorityMovementBill(bill) && matchesIssueInterests(bill, input.issueInterests)) return true;

  return false;
}

function isRiskWatchPolicyEdgeStance(value: unknown): value is Extract<PolicyEdgeBillStance, "oppose" | "watching"> {
  return value === "oppose" || value === "watching";
}

function isPriorityMovementBill(bill: Bill) {
  const action = bill.latestActionText.toLowerCase();

  return (
    isRecentBillAction(bill.latestActionDate) ||
    action.includes("reported") ||
    action.includes("ordered to be reported") ||
    action.includes("hearing") ||
    action.includes("markup") ||
    action.includes("committee") ||
    action.includes("subcommittee") ||
    action.includes("calendar") ||
    action.includes("floor") ||
    action.includes("passed") ||
    action.includes("received in")
  );
}

function getSavedFollowIds(follows: SavedFollowRecord[], type: SavedFollowRecord["type"]) {
  return new Set(follows.filter((follow) => follow.type === type).map((follow) => follow.id));
}

function matchesIssueInterests(bill: Bill, issueInterests: string[]) {
  if (!issueInterests.length) return false;

  const billText = normalizePriorityText([bill.policyArea, bill.shortTitle, bill.title, bill.summary, bill.latestActionText].join(" "));

  return issueInterests.some((interest) => {
    const normalizedInterest = normalizePriorityText(interest);
    if (!normalizedInterest) return false;
    if (billText.includes(normalizedInterest)) return true;

    const tokens = normalizedInterest.split(" ").filter((token) => token.length >= 4);
    return tokens.length > 0 && tokens.some((token) => billText.includes(token));
  });
}

function normalizePriorityText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
