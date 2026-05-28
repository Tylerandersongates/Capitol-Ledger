"use client";

import { useEffect } from "react";
import { markAlertIdRead } from "@/components/alerts-inbox-client";

export function MarkAlertRead({ alertId }: { alertId: string }) {
  useEffect(() => {
    markAlertIdRead(alertId);
  }, [alertId]);

  return null;
}
