"use client";

import { useEffect } from "react";
import { hydrateGamificationFromAccount } from "@/lib/browser-gamification";

export function GamificationSync() {
  useEffect(() => {
    void hydrateGamificationFromAccount().catch(() => {
      // Anonymous demo sessions skip account-backed gamification until sign-in.
    });
  }, []);

  return null;
}
