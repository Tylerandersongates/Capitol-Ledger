"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearLocalAccountDataAfterDeletion } from "@/lib/browser-account-profile";
import {
  clearBrowserAccountDeletionReceipt,
  markBrowserAccountDeletionConfirmed,
  setBrowserSessionAuthenticated
} from "@/lib/browser-auth-state";
import { openAppleSubscriptionManagement } from "@/lib/team-invite-billing";

type AccountDeletionRequest = {
  completedAt?: string;
  completionBy: string;
  id: string;
  requestedAt: string;
  status: "new" | "reviewing" | "planned" | "resolved";
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function statusLabel(status: AccountDeletionRequest["status"]) {
  if (status === "reviewing") return "Being reviewed";
  if (status === "planned") return "Deletion scheduled";
  if (status === "resolved") return "Previous request closed";
  return "Request received";
}

function finishDeletedAccountNavigation(confirmed: boolean) {
  clearBrowserAccountDeletionReceipt();
  clearLocalAccountDataAfterDeletion();
  setBrowserSessionAuthenticated(false);
  if (confirmed) markBrowserAccountDeletionConfirmed();
  window.location.replace("/account-deleted");
}

export function AccountDeletionControl({
  authenticated,
  enabled = false
}: {
  authenticated: boolean;
  enabled?: boolean;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(authenticated);
  const [pending, setPending] = useState(false);
  const [request, setRequest] = useState<AccountDeletionRequest | null>(null);

  useEffect(() => {
    if (!authenticated || !enabled) return;

    let active = true;
    fetch("/api/account/deletion-request", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { request?: AccountDeletionRequest | null };
        if (active && response.ok) {
          setRequest(data.request ?? null);
          setAcknowledged(false);
          setConfirmation("");
        }
      })
      .catch(() => null)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authenticated, enabled]);

  async function submitRequest() {
    if (pending || confirmation !== "DELETE" || !acknowledged) return;

    setError("");
    setPending(true);
    const response = await fetch("/api/account/deletion-request", {
      body: JSON.stringify({
        confirmation,
        subscriptionAcknowledged: acknowledged
      }),
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      method: "POST"
    }).catch(() => null);
    const data = response
      ? ((await response.json().catch(() => ({}))) as {
          completedAt?: string;
          error?: string;
          request?: AccountDeletionRequest | null;
          status?: "already-deleted" | "completed";
        })
      : {};

    if (response?.ok && data.completedAt && (data.status === "completed" || data.status === "already-deleted")) {
      finishDeletedAccountNavigation(true);
      return;
    }

    const explicitlyRejected = Boolean(
      response &&
      !response.ok &&
      typeof data.error === "string" &&
      data.error.trim() &&
      !data.completedAt &&
      data.status === undefined
    );
    if (!explicitlyRejected) {
      finishDeletedAccountNavigation(false);
      return;
    }

    setError(data.error ?? "Account deletion could not be completed. Your account is unchanged; try again.");
    setAcknowledged(false);
    setConfirmation("");
    setPending(false);
  }

  if (!enabled) return null;

  return (
    <div id="delete-account" className="mt-5 scroll-mt-8 rounded-2xl border border-[#ff6b5f]/24 bg-[#ff6b5f]/[0.07] px-4 py-4">
      <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#ff8a7f]">Account deletion</div>
      <h3 className="mt-2 text-[18px] font-semibold text-white">Permanently delete your account</h3>
      {request ? (
        <div role="status" aria-live="polite" className="mt-3 rounded-xl border border-[#ffb12b]/24 bg-[#ffb12b]/[0.08] px-3 py-3 text-[13px] leading-5 text-white/62">
          <div className="font-semibold text-[#ffcf54]">{statusLabel(request.status)}</div>
          <p className="mt-1">
            A previous deletion attempt from {formatDate(request.requestedAt)} has not completed. Your account still exists. Retry the permanent deletion now.
          </p>
        </div>
      ) : null}
      {loading ? (
        <p role="status" aria-live="polite" className="mt-3 text-[13px] text-white/52">Checking deletion-request status…</p>
      ) : !authenticated ? (
        <div className="mt-3 text-[13px] leading-5 text-white/58">
          <p>Sign in to start deletion of a saved CapitolWonk account.</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/sign-in?returnTo=%2Fsettings" className="inline-flex font-semibold text-[#ffb12b]">
              Sign in
            </Link>
            <button type="button" onClick={openAppleSubscriptionManagement} className="inline-flex font-semibold text-[#ffb12b]">
              Manage Apple subscription
            </button>
          </div>
        </div>
      ) : (
        <div aria-busy={pending} className="mt-3 text-[13px] leading-5 text-white/58">
          <div id="account-deletion-warning">
            <p>
              This immediately and permanently deletes your account, profile, saved items, preferences, civic-action history, local subscription entitlement, credentials, and sessions. You will be signed out when it finishes.
            </p>
            <p className="mt-2">
              If you own a Team workspace, its member and invitation records are also deleted. Your memberships and invitations in other Team workspaces are removed.
            </p>
            <p className="mt-2">
              Deleting CapitolWonk does not cancel an Apple subscription. An active referenced legacy web plan is queued to stop renewal and detach CapitolWonk account metadata where the provider permits; an already-ended or missing plan requires no renewal action and may no longer permit metadata changes. A limited provider-cleanup record remains only while cleanup is pending or retrying and is erased after it succeeds; the completion audit remains deidentified.
            </p>
            <p className="mt-2">
              If you later create a new CapitolWonk account, Apple access is not restored automatically. You must choose Restore Purchases so CapitolWonk can verify and relink a current eligible purchase.
            </p>
          </div>
          <button type="button" onClick={openAppleSubscriptionManagement} className="mt-3 inline-flex font-semibold text-[#ffb12b]">
            Manage Apple subscription
          </button>
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              aria-describedby="account-deletion-warning"
              className="mt-1 h-4 w-4 accent-[#ff6b5f]"
            />
            <span>I understand deletion is permanent, can remove a Team workspace I own, and does not cancel Apple billing.</span>
          </label>
          <label className="mt-3 block font-semibold text-white/66">
            Type DELETE to confirm
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value.toUpperCase())}
              autoComplete="off"
              aria-describedby="account-deletion-warning"
              className="mt-2 h-11 w-full rounded-xl border border-white/12 bg-[#06172f] px-3 text-[14px] font-semibold text-white outline-none placeholder:text-white/28 focus:border-[#ff6b5f]/55"
              placeholder="DELETE"
            />
          </label>
          <button
            type="button"
            onClick={submitRequest}
            disabled={pending || confirmation !== "DELETE" || !acknowledged}
            className="mt-3 flex h-11 w-full items-center justify-center rounded-xl border border-[#ff6b5f]/35 bg-[#ff6b5f]/15 text-[14px] font-semibold text-[#ff9b92] transition hover:bg-[#ff6b5f]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Deleting…" : request ? "Retry permanent deletion" : "Permanently delete account"}
          </button>
          {error ? <p role="alert" aria-live="assertive" className="mt-3 font-semibold text-[#ff8a7f]">{error}</p> : null}
        </div>
      )}
    </div>
  );
}
