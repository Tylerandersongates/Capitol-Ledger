"use client";

import { useEffect } from "react";
import { hydrateGamificationFromAccount, recordCompletedDistrictSetupIfReady } from "@/lib/browser-gamification";

export function GamificationSync() {
  useEffect(() => {
    void (async () => {
      try {
        await hydrateGamificationFromAccount();
      } catch {
        // Anonymous demo sessions skip account-backed gamification until sign-in.
      }

      recordCompletedDistrictSetupIfReady();
    })();
  }, []);

  return null;
}
