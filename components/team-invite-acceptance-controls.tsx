"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink, Loader2, TriangleAlert } from "lucide-react";
import {
  openAppleSubscriptionManagement,
  requiresAppleTeamBillingAcknowledgement
} from "@/lib/team-invite-billing";
import type { AccountSubscriptionSnapshot, TeamWorkspaceMember, TeamWorkspaceSnapshot } from "@/types/capitol";

type AcceptResponse = {
  code?: string;
  error?: string;
  membership?: TeamWorkspaceMember;
  workspace?: TeamWorkspaceSnapshot;
};

type SubscriptionResponse = {
  appleTeamBillingAcknowledgementRequired?: boolean;
  subscription?: AccountSubscriptionSnapshot;
};

type BillingCheckState = "checking" | "active-apple-pro" | "no-active-apple-pro" | "unavailable";

export function TeamInviteAcceptanceControls({
  emailMatches,
  token
}: {
  emailMatches: boolean;
  token: string;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [billingCheck, setBillingCheck] = useState<BillingCheckState>("checking");
  const [appleBillingAcknowledged, setAppleBillingAcknowledged] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkPersonalSubscription() {
      try {
        const response = await fetch("/api/account/subscription", { cache: "no-store" });
        const data = response.ok
          ? ((await response.json().catch(() => null)) as SubscriptionResponse | null)
          : null;

        if (cancelled) return;
        if (!data?.subscription) {
          setBillingCheck("unavailable");
          return;
        }

        setBillingCheck(
          data.appleTeamBillingAcknowledgementRequired === true ||
            (data.appleTeamBillingAcknowledgementRequired === undefined &&
              requiresAppleTeamBillingAcknowledgement(data.subscription))
            ? "active-apple-pro"
            : "no-active-apple-pro"
        );
      } catch {
        if (!cancelled) setBillingCheck("unavailable");
      }
    }

    if (emailMatches) {
      void checkPersonalSubscription();
    } else {
      setBillingCheck("no-active-apple-pro");
    }

    return () => {
      cancelled = true;
    };
  }, [emailMatches]);

  const needsAppleBillingAcknowledgement =
    billingCheck === "active-apple-pro" || billingCheck === "unavailable";
  const acceptanceBlocked =
    !emailMatches ||
    pending ||
    billingCheck === "checking" ||
    (needsAppleBillingAcknowledgement && !appleBillingAcknowledged);

  async function acceptInvite() {
    if (acceptanceBlocked) return;

    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/team/invites/accept", {
        body: JSON.stringify({
          appleBillingAcknowledged: needsAppleBillingAcknowledgement && appleBillingAcknowledged,
          token
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const data = (await response.json().catch(() => null)) as AcceptResponse | null;

      if (!response.ok || !data?.workspace || !data.membership) {
        if (data?.code === "APPLE_BILLING_ACKNOWLEDGEMENT_REQUIRED") {
          setBillingCheck("active-apple-pro");
          setAppleBillingAcknowledged(false);
        }
        setError(data?.error ?? "This Team invite could not be accepted.");
        return;
      }

      setWorkspaceName(data.workspace.name);
    } catch {
      setError("Team invite service could not be reached.");
    } finally {
      setPending(false);
    }
  }

  if (workspaceName) {
    return (
      <div className="mt-5 rounded-2xl border border-[#43ed74]/24 bg-[#43ed74]/10 px-4 py-4 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-[#43ed74]" strokeWidth={1.9} aria-hidden="true" />
        <div className="mt-3 text-[18px] font-semibold text-white">Seat accepted</div>
        <p className="mt-2 text-[13px] leading-snug text-white/58">{workspaceName} is ready for your account.</p>
        {billingCheck === "active-apple-pro" ? (
          <div className="mt-3 rounded-xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-3 py-3 text-left text-[12px] leading-snug text-white/62">
            Your personal Apple subscription was not paused or canceled when you joined this Team.
            <button
              type="button"
              onClick={openAppleSubscriptionManagement}
              className="mt-2 inline-flex items-center gap-1.5 font-semibold text-[#ffcf54]"
            >
              Manage Apple subscription
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
            </button>
          </div>
        ) : null}
        <Link
          href="/team"
          className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border border-[#43ed74]/24 bg-[#43ed74]/10 text-[14px] font-semibold text-[#74f49a]"
        >
          Open workspace
          <ArrowRight className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-5">
      {billingCheck === "active-apple-pro" || billingCheck === "unavailable" ? (
        <div
          id="apple-team-billing-warning"
          className="mb-3 rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-4 py-4"
        >
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#ffcf54]">
            <TriangleAlert className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
            {billingCheck === "active-apple-pro" ? "Personal Apple Pro billing" : "Confirm Apple billing"}
          </div>
          <p id="apple-team-billing-description" className="mt-2 text-[12px] leading-snug text-white/62">
            {billingCheck === "active-apple-pro"
              ? "Joining this Team does not pause or cancel your personal Apple subscription. Apple may continue billing until you manage or cancel the subscription with Apple."
              : "CapitolWonk could not confirm your personal billing status. If you have an Apple subscription, joining this Team does not pause or cancel it."}
          </p>
          <button
            type="button"
            onClick={openAppleSubscriptionManagement}
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#ffcf54]"
          >
            Manage Apple subscription
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
          </button>
          <label className="mt-3 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3 text-[12px] leading-snug text-white/68">
            <input
              type="checkbox"
              checked={appleBillingAcknowledged}
              onChange={(event) => setAppleBillingAcknowledged(event.target.checked)}
              aria-describedby="apple-team-billing-description"
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#ffb12b]"
            />
            <span>I understand joining this Team does not pause or cancel my Apple subscription.</span>
          </label>
        </div>
      ) : null}

      <button
        type="button"
        onClick={acceptInvite}
        disabled={acceptanceBlocked}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-4 text-[14px] font-semibold text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:brightness-110 disabled:opacity-45"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.9} aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />}
        {pending ? "Accepting seat..." : billingCheck === "checking" ? "Checking Apple billing..." : "Accept seat"}
      </button>

      {!emailMatches ? (
        <div className="mt-3 rounded-xl border border-[#ff6b6b]/20 bg-[#ff6b6b]/10 px-3 py-2 text-[12px] font-semibold text-[#ffb1b1]">
          This invite must be accepted from the invited email account.
        </div>
      ) : null}
      {error ? <div className="mt-3 rounded-xl border border-[#ff6b6b]/20 bg-[#ff6b6b]/10 px-3 py-2 text-[12px] font-semibold text-[#ffb1b1]">{error}</div> : null}
    </div>
  );
}
