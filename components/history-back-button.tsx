"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function HistoryBackButton({
  ariaLabel = "Go back",
  children,
  className,
  fallbackHref = "/dashboard"
}: {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  fallbackHref?: string;
}) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button type="button" className={className} aria-label={ariaLabel} onClick={handleBack}>
      {children}
    </button>
  );
}
