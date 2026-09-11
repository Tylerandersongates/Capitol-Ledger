"use client";

import { useEffect } from "react";
import { clearLocalAccountDataAfterDeletion } from "@/lib/browser-account-profile";
import {
  acceptRemoteBrowserAccountDeletionFenceClear,
  accountDeletionFenceStorageKey,
  clearBrowserAccountDeletionReceipt,
  isBrowserAccountDeletionFenced,
  setBrowserSessionAuthenticated
} from "@/lib/browser-auth-state";

export function AccountDeletionBrowserGuard() {
  useEffect(() => {
    function applyDeletionFence(clearReceipt: boolean, hardNavigate: boolean) {
      if (clearReceipt) clearBrowserAccountDeletionReceipt();
      clearLocalAccountDataAfterDeletion();
      setBrowserSessionAuthenticated(false);
      if (hardNavigate) window.location.replace("/account-deleted");
    }

    function handleStorage(event: StorageEvent) {
      if (
        event.key?.startsWith("capitol-ledger:") &&
        event.newValue !== null &&
        isBrowserAccountDeletionFenced()
      ) {
        window.localStorage.removeItem(event.key);
        return;
      }
      if (event.key !== accountDeletionFenceStorageKey) return;
      if (event.newValue !== "active") {
        acceptRemoteBrowserAccountDeletionFenceClear();
        return;
      }

      applyDeletionFence(true, true);
    }

    if (isBrowserAccountDeletionFenced()) applyDeletionFence(false, false);
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return null;
}
