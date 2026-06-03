"use client";

import { useEffect } from "react";
import { hydrateGamificationFromAccount, syncGamificationToAccount } from "@/lib/browser-gamification";

export function GamificationSync() {
  useEffect(() => {
    void hydrateGamificationFromAccount()
      .then((snapshot) => syncGamificationToAccount(snapshot))
      .catch(() => {
        // Anonymous demo sessions skip account-backed gamification until sign-in.
      });
  }, []);

  return null;
}
