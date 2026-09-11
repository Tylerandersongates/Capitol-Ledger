const accountCreatedKey = "capitol-ledger:account-created";
export const accountDeletionFenceStorageKey = "capitolwonk:account-deletion-fence";
export const accountDeletionReceiptStorageKey = "capitolwonk:account-deletion-confirmed";
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
let accountDeletionFenced = false;
let freshAuthenticationMayClearDeletionFence = false;

export function isBrowserAccountDeletionFenced() {
  if (typeof window === "undefined") return accountDeletionFenced;

  try {
    if (window.localStorage.getItem(accountDeletionFenceStorageKey) === "active") {
      accountDeletionFenced = true;
    }
  } catch {
    // Preserve the in-memory fence when browser storage is restricted.
  }

  return accountDeletionFenced;
}

export function activateBrowserAccountDeletionFence() {
  accountDeletionFenced = true;
  freshAuthenticationMayClearDeletionFence = false;
  activeSession = false;
  activeSessionPromise = Promise.resolve(false);

  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(accountDeletionFenceStorageKey, "active");
  } catch {
    // The in-memory fence still blocks this document until hard navigation.
  }
}

export function hasBrowserAccountDeletionReceipt() {
  if (typeof window === "undefined") return false;

  try {
    return window.sessionStorage.getItem(accountDeletionReceiptStorageKey) === "confirmed";
  } catch {
    return false;
  }
}

export function markBrowserAccountDeletionConfirmed() {
  if (typeof window === "undefined") return false;

  try {
    window.sessionStorage.setItem(accountDeletionReceiptStorageKey, "confirmed");
    return true;
  } catch {
    return false;
  }
}

export function clearBrowserAccountDeletionReceipt() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(accountDeletionReceiptStorageKey);
  } catch {
    // A missing receipt safely falls back to the unconfirmed result state.
  }
}

function clearBrowserAccountDeletionFence() {
  accountDeletionFenced = false;
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(accountDeletionFenceStorageKey);
  } catch {
    // A successful authenticated session can proceed even when storage is restricted.
  }
}

export function acceptRemoteBrowserAccountDeletionFenceClear() {
  clearBrowserAccountDeletionFence();
  freshAuthenticationMayClearDeletionFence = false;
  activeSession = null;
  activeSessionPromise = null;
  clearBrowserAccountDeletionReceipt();
}

export function beginFreshBrowserAuthentication() {
  freshAuthenticationMayClearDeletionFence = isBrowserAccountDeletionFenced();
  activeSession = null;
  activeSessionPromise = null;
}

export function completeFreshBrowserAuthentication(authenticated: boolean) {
  const mayClearDeletionFence = freshAuthenticationMayClearDeletionFence;
  freshAuthenticationMayClearDeletionFence = false;

  if (isBrowserAccountDeletionFenced() && !mayClearDeletionFence) {
    activeSession = false;
    activeSessionPromise = Promise.resolve(false);
    return false;
  }

  if (mayClearDeletionFence) clearBrowserAccountDeletionFence();
  clearBrowserAccountDeletionReceipt();
  activeSession = authenticated ? true : null;
  activeSessionPromise = authenticated ? Promise.resolve(true) : null;
  return true;
}

export function hasBrowserAccountCreated() {
  if (typeof window === "undefined" || isBrowserAccountDeletionFenced()) return false;

  try {
    return window.localStorage.getItem(accountCreatedKey) === "true" || returningAccountSignals.some((key) => Boolean(window.localStorage.getItem(key)));
  } catch {
    return false;
  }
}

export function markBrowserAccountCreated() {
  if (typeof window === "undefined" || isBrowserAccountDeletionFenced()) return;

  try {
    window.localStorage.setItem(accountCreatedKey, "true");
  } catch {
    // Sign-in remains usable even if browser storage is unavailable.
  }
}

export function setBrowserSessionAuthenticated(authenticated: boolean) {
  freshAuthenticationMayClearDeletionFence = false;
  if (authenticated) {
    if (isBrowserAccountDeletionFenced()) {
      activeSession = false;
      activeSessionPromise = Promise.resolve(false);
      return false;
    }
    clearBrowserAccountDeletionReceipt();
    activeSession = true;
    activeSessionPromise = Promise.resolve(true);
    return true;
  }

  const fenced = isBrowserAccountDeletionFenced();
  activeSession = fenced ? false : null;
  activeSessionPromise = fenced ? Promise.resolve(false) : null;
  return true;
}

export async function hasActiveBrowserSession() {
  if (typeof window === "undefined") return false;
  if (isBrowserAccountDeletionFenced()) return false;
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
      if (isBrowserAccountDeletionFenced()) {
        activeSession = false;
        return false;
      }
      activeSession = authenticated ? true : null;
      return authenticated;
    });

  return activeSessionPromise;
}
