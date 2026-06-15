"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import type { TeamWorkspaceMember, TeamWorkspaceSnapshot } from "@/types/capitol";

type AcceptResponse = {
  error?: string;
  membership?: TeamWorkspaceMember;
  workspace?: TeamWorkspaceSnapshot;
};

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

  async function acceptInvite() {
    if (!emailMatches || pending) return;

    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/team/invites/accept", {
        body: JSON.stringify({ token }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const data = (await response.json().catch(() => null)) as AcceptResponse | null;

      if (!response.ok || !data?.workspace || !data.membership) {
        setError(data?.error ?? "Unable to accept this Team invite.");
        return;
      }

      setWorkspaceName(data.workspace.name);
    } catch {
      setError("Unable to reach the Team invite service.");
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
        <Link
          href="/team"
          className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border border-[#43ed74]/24 bg-[#43ed74]/10 text-[14px] font-semibold text-[#74f49a]"
        >
          Open Workspace
          <ArrowRight className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={acceptInvite}
        disabled={!emailMatches || pending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-4 text-[14px] font-semibold text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:brightness-110 disabled:opacity-45"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.9} aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />}
        {pending ? "Accepting..." : "Accept Seat"}
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
