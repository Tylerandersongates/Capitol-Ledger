"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AccountDeletionRequest = {
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
  if (status === "resolved") return "Completed";
  return "Request received";
}

export function AccountDeletionControl({ authenticated }: { authenticated: boolean }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(authenticated);
  const [pending, setPending] = useState(false);
  const [request, setRequest] = useState<AccountDeletionRequest | null>(null);

  useEffect(() => {
    if (!authenticated) return;

    let active = true;
    fetch("/api/account/deletion-request", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { request?: AccountDeletionRequest | null };
        if (active && response.ok) setRequest(data.request ?? null);
      })
      .catch(() => null)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authenticated]);

  async function submitRequest() {
    if (pending || confirmation !== "DELETE" || !acknowledged) return;

    setError("");
    setPending(true);
    const response = await fetch("/api/account/deletion-request", {
      body: JSON.stringify({ confirmation, subscriptionAcknowledged: acknowledged }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    }).catch(() => null);
    const data = response
      ? ((await response.json().catch(() => ({}))) as { error?: string; request?: AccountDeletionRequest })
      : {};

    if (!response?.ok || !data.request) {
      setError(data.error ?? "Account deletion request could not be submitted. Try again.");
      setPending(false);
      return;
    }

    setRequest(data.request);
    setPending(false);
  }

  return (
    <div id="delete-account" className="mt-5 scroll-mt-8 rounded-2xl border border-[#ff6b5f]/24 bg-[#ff6b5f]/[0.07] px-4 py-4">
      <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#ff8a7f]">Account deletion</div>
      <h3 className="mt-2 text-[18px] font-semibold text-white">Permanently delete your account</h3>
      {request ? (
        <div className="mt-3 rounded-xl border border-[#43ed74]/22 bg-[#43ed74]/[0.07] px-3 py-3 text-[13px] leading-5 text-white/62">
          <div className="font-semibold text-[#59ee83]">{statusLabel(request.status)}</div>
          <p className="mt-1">
            Submitted {formatDate(request.requestedAt)}. Deletion is scheduled to be completed by {formatDate(request.completionBy)}.
          </p>
        </div>
      ) : loading ? (
        <p className="mt-3 text-[13px] text-white/52">Checking deletion-request status…</p>
      ) : !authenticated ? (
        <div className="mt-3 text-[13px] leading-5 text-white/58">
          <p>Sign in to start deletion of a saved CapitolWonk account.</p>
          <Link href="/sign-in?returnTo=%2Fsettings" className="mt-3 inline-flex font-semibold text-[#ffb12b]">
            Sign in
          </Link>
        </div>
      ) : (
        <div className="mt-3 text-[13px] leading-5 text-white/58">
          <p>
            This starts permanent deletion of your account and associated personal data. We complete requests within 7 days and confirm completion at your account email.
          </p>
          <p className="mt-2">
            Deleting CapitolWonk does not cancel an Apple subscription. Cancel or manage Apple billing separately before submitting if you do not want it to renew.
          </p>
          <Link href="/upgrade" className="mt-3 inline-flex font-semibold text-[#ffb12b]">
            Manage Apple subscription
          </Link>
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-1 h-4 w-4 accent-[#ff6b5f]"
            />
            <span>I understand account deletion is permanent and Apple billing is managed separately.</span>
          </label>
          <label className="mt-3 block font-semibold text-white/66">
            Type DELETE to confirm
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value.toUpperCase())}
              autoComplete="off"
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
            {pending ? "Submitting…" : "Request account deletion"}
          </button>
          {error ? <p className="mt-3 font-semibold text-[#ff8a7f]">{error}</p> : null}
        </div>
      )}
    </div>
  );
}
