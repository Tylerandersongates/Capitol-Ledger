"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { readLocalAccountProfile } from "@/lib/browser-account-profile";
import { markBrowserAccountCreated, setBrowserSessionAuthenticated } from "@/lib/browser-auth-state";
import { readLocalGamificationSnapshot } from "@/lib/browser-gamification";
import type { AccountLedgerSnapshot, AccountSubscriptionSnapshot, SavedFollowRecord } from "@/types/capitol";

const followsKey = "capitol-ledger:follows";
const alertsKey = "capitol-ledger:saved-alerts";
const interestsKey = "capitol-ledger:issue-interests";
const readAlertsKey = "capitol-ledger:read-alerts";
const subscriptionKey = "capitol-ledger:subscription";

function readJson<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}

function readLocalLedger(): AccountLedgerSnapshot {
  return {
    follows: readJson<SavedFollowRecord[]>(followsKey, []),
    readAlerts: readJson<string[]>(readAlertsKey, []),
    savedAlerts: readJson<string[]>(alertsKey, []),
    issueInterests: readJson<string[]>(interestsKey, []),
    updatedAt: new Date().toISOString()
  };
}

function readLocalSubscription(): Partial<AccountSubscriptionSnapshot> {
  return readJson<Partial<AccountSubscriptionSnapshot>>(subscriptionKey, {});
}

export function DemoAccountButton({
  children,
  className,
  href = "/dashboard"
}: {
  children: ReactNode;
  className: string;
  href?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function syncLocalAccountData() {
    await Promise.allSettled([
      fetch("/api/account/ledger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(readLocalLedger())
      }),
      fetch("/api/account/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(readLocalSubscription())
      }),
      fetch("/api/account/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(readLocalAccountProfile())
      }),
      fetch("/api/account/gamification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(readLocalGamificationSnapshot())
      })
    ]);
  }

  async function startDemoAccount() {
    setError("");
    setPending(true);

    const response = await fetch("/api/auth/demo", {
      method: "POST"
    }).catch(() => null);

    if (!response?.ok) {
      const payload = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : {};
      setPending(false);
      setError(payload.error ?? "Demo mode could not start. Restart the preview and try again.");
      return;
    }

    markBrowserAccountCreated();
    setBrowserSessionAuthenticated(true);
    void syncLocalAccountData();

    router.push(href);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={startDemoAccount} disabled={pending} className={className}>
        {pending ? "Starting..." : children}
      </button>
      {error ? <p className="mt-2 text-right text-[12px] font-medium text-[#ff6b5f]">{error}</p> : null}
    </>
  );
}

export function DemoSignOutButton({
  children,
  className,
  href = "/sign-in"
}: {
  children: ReactNode;
  className: string;
  href?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    markBrowserAccountCreated();

    await fetch("/api/auth/sign-out", {
      method: "DELETE"
    }).catch(() => null);

    setBrowserSessionAuthenticated(false);
    router.push(href);
    router.refresh();
  }

  return (
    <button type="button" onClick={signOut} disabled={pending} className={className}>
      {children}
    </button>
  );
}
