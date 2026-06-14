"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Mail, UserPlus } from "lucide-react";
import type { TeamWorkspaceInvite, TeamWorkspaceMember, TeamWorkspaceRole, TeamWorkspaceSnapshot } from "@/types/capitol";

type InviteRole = Exclude<TeamWorkspaceRole, "owner">;

const roleOptions: Array<{ label: string; value: InviteRole }> = [
  { label: "Analyst", value: "analyst" },
  { label: "Viewer", value: "viewer" }
];

export function TeamInviteControls({ initialWorkspace }: { initialWorkspace: TeamWorkspaceSnapshot }) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("analyst");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const rosterRows = useMemo(() => [...workspace.members, ...workspace.invites], [workspace.invites, workspace.members]);
  const inviteDisabled = pending || workspace.openSeats <= 0 || !email.trim();

  async function submitInvite() {
    if (inviteDisabled) return;

    setPending(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/team/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          role
        })
      });
      const data = (await response.json().catch(() => null)) as { error?: string; workspace?: TeamWorkspaceSnapshot } | null;

      if (!response.ok || !data?.workspace) {
        setError(data?.error ?? "Unable to create the invite.");
        return;
      }

      setWorkspace(data.workspace);
      setEmail("");
      setMessage("Pending invite saved.");
    } catch {
      setError("Unable to reach the invite service.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <SeatMetric label="Seats" value={String(workspace.seatCount)} />
        <SeatMetric label="Filled" value={String(workspace.occupiedSeats)} />
        <SeatMetric label="Open" value={String(workspace.openSeats)} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/42">Seat Roster</div>
            <div className="mt-1 truncate text-[14px] font-semibold text-white">{workspace.name}</div>
          </div>
          <span className="rounded-full border border-[#43ed74]/24 bg-[#43ed74]/10 px-3 py-1.5 text-[11px] font-semibold text-[#74f49a]">
            {workspace.occupiedSeats}/{workspace.seatCount}
          </span>
        </div>

        <div className="mt-3 divide-y divide-white/8">
          {rosterRows.map((row) => (
            <RosterRow key={`${"expiresAt" in row ? "invite" : "member"}-${row.id}`} row={row} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4">
        <div className="grid grid-cols-[34px_minmax(0,1fr)] items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-[#ffb12b]">
            <UserPlus className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-white">Reserve a teammate seat</div>
            <div className="mt-1 text-[12px] leading-snug text-white/48">
              {workspace.openSeats > 0 ? `${workspace.openSeats} open paid seat${workspace.openSeats === 1 ? "" : "s"}.` : "All paid seats are assigned or pending."}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 rounded-full border border-white/12 bg-white/[0.07] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.11)]">
          {roleOptions.map((option) => {
            const active = role === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setRole(option.value)}
                className={`h-10 rounded-full px-2 text-[13px] font-semibold transition ${
                  active ? "bg-[#ffb12b] text-[#061126] shadow-[0_0_18px_rgba(255,177,43,0.2)]" : "text-white/58"
                }`}
                aria-pressed={active}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <label className="mt-4 block">
          <span className="sr-only">Teammate email</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teammate@example.com"
            disabled={workspace.openSeats <= 0}
            className="h-11 w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-[14px] font-semibold text-white outline-none transition placeholder:text-white/28 focus:border-[#ffb12b]/60 disabled:opacity-45"
          />
        </label>

        <button
          type="button"
          onClick={submitInvite}
          disabled={inviteDisabled}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-4 text-[14px] font-semibold text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:brightness-110 disabled:opacity-45"
        >
          <Mail className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
          {pending ? "Saving..." : "Reserve Seat"}
        </button>

        {message ? <div className="mt-3 rounded-xl border border-[#43ed74]/18 bg-[#43ed74]/8 px-3 py-2 text-[12px] font-semibold text-[#74f49a]">{message}</div> : null}
        {error ? <div className="mt-3 rounded-xl border border-[#ff6b6b]/20 bg-[#ff6b6b]/10 px-3 py-2 text-[12px] font-semibold text-[#ff9b9b]">{error}</div> : null}
      </div>
    </div>
  );
}

function SeatMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="truncate text-[21px] font-semibold leading-none text-[#ffb12b]">{value}</div>
      <div className="mt-2 truncate text-[10px] leading-tight text-white/46">{label}</div>
    </div>
  );
}

function RosterRow({ row }: { row: TeamWorkspaceMember | TeamWorkspaceInvite }) {
  const pendingInvite = "expiresAt" in row;
  const roleLabel = row.role === "owner" ? "Owner" : row.role === "viewer" ? "Viewer" : "Analyst";

  return (
    <div className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 py-3">
      <span className={`grid h-9 w-9 place-items-center rounded-xl border ${pendingInvite ? "border-[#ffb12b]/22 bg-[#ffb12b]/10 text-[#ffb12b]" : "border-[#43ed74]/18 bg-[#43ed74]/8 text-[#74f49a]"}`}>
        {pendingInvite ? <Clock3 className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" /> : <CheckCircle2 className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold text-white">{pendingInvite ? row.email : row.displayName || row.email}</span>
        <span className="mt-1 block truncate text-[12px] text-white/44">{pendingInvite ? "Pending invite" : row.email}</span>
      </span>
      <span className="text-right">
        <span className="block text-[12px] font-semibold text-[#ffb12b]">{roleLabel}</span>
        <span className="mt-1 flex items-center justify-end gap-1 text-[11px] text-white/38">
          {pendingInvite ? <Clock3 className="h-3 w-3" strokeWidth={1.8} aria-hidden="true" /> : <span className="h-3 w-3" aria-hidden="true" />}
          {pendingInvite ? "Pending" : "Active"}
        </span>
      </span>
    </div>
  );
}
