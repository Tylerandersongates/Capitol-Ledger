const accountCreatedKey = "capitol-ledger:account-created";
const returningAccountSignals = [
  "capitol-ledger:district-profile",
  "capitol-ledger:follows",
  "capitol-ledger:gamification",
  "capitol-ledger:notification-preferences",
  "capitol-ledger:party-affiliation",
  "capitol-ledger:subscription"
];

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
