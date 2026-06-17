"use client";

import { useEffect } from "react";
import { hydrateGamificationFromAccount, recordCompletedDistrictSetupIfReady } from "@/lib/browser-gamification";
import { fetchAccountProfile } from "@/lib/browser-account-profile";

export function GamificationSync() {
  useEffect(() => {
    void (async () => {
      try {
        await hydrateGamificationFromAccount();
        await fetchAccountProfile();
      } catch {
        // Anonymous demo sessions skip account-backed gamification until sign-in.
      }

      recordCompletedDistrictSetupIfReady();
    })();
  }, []);

  return null;
}
