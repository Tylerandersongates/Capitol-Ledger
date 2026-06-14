"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Cloud, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { MobileCard } from "@/components/mobile-ui";
import {
  accountProfileChangedEvent,
  fetchAccountProfile,
  readLocalAccountProfile,
  readLocalNotificationPreferences,
  writeLocalAccountProfile
} from "@/lib/browser-account-profile";
import {
  fetchAccountLedger,
  followsChangedEvent,
  hasPendingIssueSync,
  interestsKey,
  persistenceEvent,
  readAlertsChangedEvent,
  readSavedFollowRecords,
  readStringList,
  savedAlertsKey,
  writeLocalAccountLedger
} from "@/lib/browser-account-ledger";
import { hasActiveBrowserSession } from "@/lib/browser-auth-state";
const setupSignalTotal = 5;

type AccountSyncSnapshot = {
  checking: boolean;
  districtLabel: string;
  enabledAlertCount: number;
  issueCount: number;
  memberCount: number;
  pendingSync: boolean;
  savedCount: number;
  setupCount: number;
  signedIn: boolean;
  userEmail?: string;
};

export function SettingsAccountSyncStatus({ authenticated, userEmail }: { authenticated: boolean; userEmail?: string }) {
  const [snapshot, setSnapshot] = useState<AccountSyncSnapshot>(() => buildSyncSnapshot(authenticated, userEmail, true));

  useEffect(() => {
    let active = true;
    let currentSignedIn = authenticated;

    function refreshFromBrowser(checking = false) {
      if (!active) return;
      setSnapshot(buildSyncSnapshot(currentSignedIn, userEmail, checking));
    }

    async function refreshSession() {
      refreshFromBrowser(true);
      currentSignedIn = await hasActiveBrowserSession();
      if (!active) return;

      if (currentSignedIn) {
        const [profile, ledger] = await Promise.all([
          fetchAccountProfile(),
          fetchAccountLedger()
        ]);
        if (profile) writeLocalAccountProfile(profile);
        if (ledger) writeLocalAccountLedger(ledger);
      }

      refreshFromBrowser(false);
    }

    const refreshHandler = () => refreshFromBrowser(false);
    const refetchHandler = () => void refreshSession();
    const visibilityHandler = () => {
      if (document.visibilityState === "visible") void refreshSession();
    };

    void refreshSession();
    window.addEventListener("storage", refreshHandler);
    window.addEventListener(accountProfileChangedEvent, refreshHandler);
    window.addEventListener(persistenceEvent, refreshHandler);
    window.addEventListener(followsChangedEvent, refreshHandler);
    window.addEventListener(readAlertsChangedEvent, refreshHandler);
    window.addEventListener("focus", refetchHandler);
    window.addEventListener("pageshow", refetchHandler);
    document.addEventListener("visibilitychange", visibilityHandler);

    return () => {
      active = false;
      window.removeEventListener("storage", refreshHandler);
      window.removeEventListener(accountProfileChangedEvent, refreshHandler);
      window.removeEventListener(persistenceEvent, refreshHandler);
      window.removeEventListener(followsChangedEvent, refreshHandler);
      window.removeEventListener(readAlertsChangedEvent, refreshHandler);
      window.removeEventListener("focus", refetchHandler);
      window.removeEventListener("pageshow", refetchHandler);
      document.removeEventListener("visibilitychange", visibilityHandler);
    };
  }, [authenticated, userEmail]);

  const setupReady = snapshot.setupCount >= setupSignalTotal;
  const syncReady = snapshot.signedIn && !snapshot.pendingSync;

  return (
    <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/46">Sync Status</div>
          <h2 className="mt-2 text-[22px] font-medium leading-tight text-white">{snapshot.signedIn ? "Account connected" : "Local profile ready"}</h2>
          <p className="mt-2 text-[13px] leading-snug text-white/54">
            {snapshot.signedIn
              ? `${snapshot.userEmail ?? "Signed-in account"} is linked to your setup and saved ledger.`
              : "Sign in to keep setup choices and saved records connected across sessions."}
          </p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/14 bg-[#43ed74]/12 text-[#43ed74] shadow-[0_12px_28px_rgba(1,8,24,0.3)]">
          {snapshot.checking ? <RefreshCw className="h-6 w-6 animate-spin" strokeWidth={1.8} aria-hidden="true" /> : <ShieldCheck className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <SyncMetric
          detail={snapshot.signedIn ? "Signed in" : "Sign in"}
          icon={<UserRound />}
          label="Account"
          tone={snapshot.signedIn ? "green" : "gold"}
          value={snapshot.signedIn ? "On" : "Local"}
        />
        <SyncMetric
          detail={`${snapshot.setupCount}/${setupSignalTotal} signals`}
          icon={<CheckCircle2 />}
          label="Setup"
          tone={setupReady ? "green" : "gold"}
          value={setupReady ? "Ready" : "Partial"}
        />
        <SyncMetric
          detail={`${snapshot.savedCount} saved`}
          icon={<Cloud />}
          label="Sync"
          tone={syncReady ? "green" : snapshot.pendingSync ? "gold" : "muted"}
          value={syncReady ? "Synced" : snapshot.pendingSync ? "Syncing" : "Local"}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] leading-tight text-white/48">
        <span className="rounded-xl border border-white/8 bg-white/[0.035] px-2 py-2">{snapshot.districtLabel}</span>
        <span className="rounded-xl border border-white/8 bg-white/[0.035] px-2 py-2">{snapshot.issueCount} interests</span>
        <span className="rounded-xl border border-white/8 bg-white/[0.035] px-2 py-2">{snapshot.enabledAlertCount} alerts</span>
      </div>

      {!snapshot.signedIn ? (
        <Link href="/sign-in?returnTo=%2Fsettings" className="mt-4 flex h-11 items-center justify-center rounded-xl border border-white/12 bg-white/5 text-[14px] font-semibold text-white/72">
          Sign in
        </Link>
      ) : null}
    </MobileCard>
  );
}

function SyncMetric({
  detail,
  icon,
  label,
  tone,
  value
}: {
  detail: string;
  icon: ReactNode;
  label: string;
  tone: "gold" | "green" | "muted";
  value: string;
}) {
  const toneClass =
    tone === "green"
      ? "border-[#43ed74]/24 bg-[#43ed74]/10 text-[#74f49a]"
      : tone === "gold"
        ? "border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffcf54]"
        : "border-white/10 bg-white/[0.035] text-white/50";

  return (
    <div className={`min-h-[92px] rounded-2xl border px-2 py-3 text-center ${toneClass}`}>
      <span className="mx-auto grid h-7 w-7 place-items-center [&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-[1.8]">{icon}</span>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] opacity-70">{label}</div>
      <div className="mt-1 text-[13px] font-semibold leading-tight">{value}</div>
      <div className="mt-1 text-[10px] leading-tight opacity-70">{detail}</div>
    </div>
  );
}

function buildSyncSnapshot(signedIn: boolean, userEmail?: string, checking = false): AccountSyncSnapshot {
  const profile = readLocalAccountProfile();
  const preferences = readLocalNotificationPreferences();
  const follows = readSavedFollowRecords();
  const interests = readStringList(interestsKey);
  const savedAlerts = readStringList(savedAlertsKey);
  const memberCount = follows.filter((record) => record.type === "member").length;
  const enabledAlertCount = [preferences.districtAlerts, preferences.voteReminders, preferences.weeklyBrief].filter(Boolean).length;
  const setupCount = [
    Boolean(profile.districtCode),
    memberCount > 0,
    Boolean(profile.partyAffiliation),
    interests.length > 0,
    enabledAlertCount > 0
  ].filter(Boolean).length;
  const districtLabel = profile.districtCode ? profile.districtCode : "District";

  return {
    checking,
    districtLabel,
    enabledAlertCount,
    issueCount: interests.length,
    memberCount,
    pendingSync: hasPendingIssueSync(),
    savedCount: follows.length + savedAlerts.length + interests.length,
    setupCount,
    signedIn,
    userEmail
  };
}
