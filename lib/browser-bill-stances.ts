export type BillStance = "support" | "oppose" | "watching";

export const billStanceKey = "capitol-ledger:bill-stances";
export const billStanceChangedEvent = "capitol-ledger:bill-stances-changed";
export const anonymousBillStanceKey = `${billStanceKey}:anonymous`;

type AuthSessionResponse = {
  authenticated?: boolean;
  mode?: string;
  user?: {
    email?: string;
    id?: string;
  } | null;
};

export function isBillStance(value: unknown): value is BillStance {
  return value === "support" || value === "oppose" || value === "watching";
}

export function isRiskWatchBillStance(value: unknown): value is Extract<BillStance, "oppose" | "watching"> {
  return value === "oppose" || value === "watching";
}

function storageScopeFromSession(data: AuthSessionResponse | null) {
  if (!data?.authenticated || !data.user) return anonymousBillStanceKey;

  const userKey = data.user.id || data.user.email;
  if (!userKey) return anonymousBillStanceKey;

  const mode = data.mode === "demo" ? "demo" : "account";
  return `${billStanceKey}:${mode}:${encodeURIComponent(userKey.toLowerCase())}`;
}

export async function resolveBillStanceStorageKey() {
  const response = await fetch("/api/auth/session", { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return anonymousBillStanceKey;

  const data = (await response.json().catch(() => null)) as AuthSessionResponse | null;
  return storageScopeFromSession(data);
}

export function readBillStances(storageKey: string) {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as Record<string, BillStance>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readBillStance(billId: string, storageKey: string) {
  const stance = readBillStances(storageKey)[billId];
  return isBillStance(stance) ? stance : null;
}

export function writeBillStance(billId: string, stance: BillStance, storageKey: string) {
  window.localStorage.setItem(
    storageKey,
    JSON.stringify({
      ...readBillStances(storageKey),
      [billId]: stance
    })
  );
  window.dispatchEvent(new Event(billStanceChangedEvent));
}
