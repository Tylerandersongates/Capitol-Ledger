const accountCreatedKey = "capitol-ledger:account-created";
const returningAccountSignals = [
  "capitol-ledger:district-profile",
  "capitol-ledger:follows",
  "capitol-ledger:gamification",
  "capitol-ledger:gamification:anonymous",
  "capitol-ledger:notification-preferences",
  "capitol-ledger:party-affiliation",
  "capitol-ledger:subscription"
];

let activeSession: boolean | null = null;
let activeSessionPromise: Promise<boolean> | null = null;

export function hasBrowserAccountCreated() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(accountCreatedKey) === "true" || returningAccountSignals.some((key) => Boolean(window.localStorage.getItem(key)));
  } catch {
    return false;
  }
}

export function markBrowserAccountCreated() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(accountCreatedKey, "true");
  } catch {
    // Sign-in remains usable even if browser storage is unavailable.
  }
}

export function setBrowserSessionAuthenticated(authenticated: boolean) {
  activeSession = authenticated ? true : null;
  activeSessionPromise = authenticated ? Promise.resolve(true) : null;
}

export async function hasActiveBrowserSession() {
  if (typeof window === "undefined") return false;
  if (activeSession === true) return true;
  if (activeSessionPromise) return activeSessionPromise;

  activeSessionPromise = fetch("/api/auth/session", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) return false;
      const data = (await response.json().catch(() => null)) as { authenticated?: boolean } | null;
      return Boolean(data?.authenticated);
    })
    .catch(() => false)
    .then((authenticated) => {
      activeSession = authenticated ? true : null;
      return authenticated;
    });

  return activeSessionPromise;
}
