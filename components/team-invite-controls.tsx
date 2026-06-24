"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Mail, UserMinus, UserPlus, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import type { TeamWorkspaceInvite, TeamWorkspaceMember, TeamWorkspaceRole, TeamWorkspaceSnapshot } from "@/types/capitol";

type InviteRole = Exclude<TeamWorkspaceRole, "owner">;
type RosterRowRecord = TeamWorkspaceMember | TeamWorkspaceInvite;

const roleOptions: Array<{ label: string; value: InviteRole }> = [
  { label: "Admin", value: "admin" },
  { label: "Analyst", value: "analyst" },
  { label: "Viewer", value: "viewer" }
];

export function TeamInviteControls({ initialWorkspace }: { initialWorkspace: TeamWorkspaceSnapshot }) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("analyst");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [pending, setPending] = useState(false);
  const [releasePendingId, setReleasePendingId] = useState("");
  const rosterRows = useMemo(() => [...workspace.members, ...workspace.invites], [workspace.invites, workspace.members]);
  const inviteDisabled = pending || workspace.openSeats <= 0 || !email.trim();

  function rowKey(row: RosterRowRecord) {
    return `${"expiresAt" in row ? "invite" : "member"}:${row.id}`;
  }

  async function submitInvite() {
    if (inviteDisabled) return;

    setPending(true);
    setMessage("");
    setError("");
    setInviteLink("");

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
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        inviteDelivery?: {
          error?: string;
          inviteLink?: string;
          mode?: string;
          sent?: boolean;
        };
        workspace?: TeamWorkspaceSnapshot;
      } | null;

      if (!response.ok || !data?.workspace) {
        setError(data?.error ?? "Unable to create the invite.");
        return;
      }

      setWorkspace(data.workspace);
      router.refresh();
      setEmail("");
      setInviteLink(data.inviteDelivery?.inviteLink ?? "");
      setMessage(
        data.inviteDelivery?.sent && data.inviteDelivery?.inviteLink
          ? "Invite sent. You can also copy the link below."
          : data.inviteDelivery?.sent
            ? "Invite sent."
          : data.inviteDelivery?.inviteLink
            ? "Invite link ready. Share it with the invited email account."
            : data.inviteDelivery?.error
              ? "Invite saved, but email delivery needs attention."
              : "Invite saved. Email delivery is not configured."
      );
    } catch {
      setError("Unable to reach the invite service.");
    } finally {
      setPending(false);
    }
  }

  async function releaseSeat(row: RosterRowRecord) {
    const pendingInvite = "expiresAt" in row;
    if (!pendingInvite && row.role === "owner") return;

    const key = rowKey(row);
    setReleasePendingId(key);
    setMessage("");
    setError("");
    setInviteLink("");

    try {
      const response = await fetch("/api/team/seats", {
        body: JSON.stringify({
          seatId: row.id,
          seatType: pendingInvite ? "invite" : "member"
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "DELETE"
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        release?: {
          accountConvertedToFree?: boolean;
          personalSubscriptionCheckoutRequired?: boolean;
          personalSubscriptionRestored?: boolean;
          type?: string;
        };
        workspace?: TeamWorkspaceSnapshot;
      } | null;

      if (!response.ok || !data?.workspace) {
        setError(data?.error ?? "Unable to remove this team seat.");
        return;
      }

      setWorkspace(data.workspace);
      router.refresh();
      if (data.release?.type === "invite") {
        setMessage("Invite revoked. A team seat is open.");
      } else if (data.release?.personalSubscriptionRestored) {
        setMessage("Seat removed. Personal Pro billing resumed.");
      } else if (data.release?.personalSubscriptionCheckoutRequired) {
        setMessage("Seat removed. Personal Pro needs checkout to restart.");
      } else if (data.release?.accountConvertedToFree) {
        setMessage("Seat removed. Account returned to Free.");
      } else {
        setMessage("Seat removed. A team seat is open.");
      }
    } catch {
      setError("Unable to reach seat controls.");
    } finally {
      setReleasePendingId("");
    }
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <SeatMetric label="Team seats" value={String(workspace.seatCount)} />
        <SeatMetric label="In use" value={String(workspace.occupiedSeats)} />
        <SeatMetric label="Open" value={String(workspace.openSeats)} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/42">Team roster</div>
            <div className="mt-1 truncate text-[14px] font-semibold text-white">{workspace.name}</div>
          </div>
          <span className="rounded-full border border-[#43ed74]/24 bg-[#43ed74]/10 px-3 py-1.5 text-[11px] font-semibold text-[#74f49a]">
            {workspace.occupiedSeats}/{workspace.seatCount}
          </span>
        </div>

        <div
          data-testid="team-seat-roster-scroll"
          className="mt-3 max-h-[15.5rem] overflow-y-auto overscroll-contain pr-1 [scrollbar-color:rgba(255,177,43,0.55)_rgba(255,255,255,0.08)] [scrollbar-width:thin]"
          aria-label="Seat roster"
        >
          <div className="divide-y divide-white/8">
            {rosterRows.length ? (
              rosterRows.map((row) => <RosterRow key={rowKey(row)} releasePending={releasePendingId === rowKey(row)} row={row} onRelease={releaseSeat} />)
            ) : (
              <div className="py-4 text-[12px] leading-snug text-white/46">No team seats are assigned yet. Invite Admins, Analysts, or Viewers.</div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4">
        <div className="grid grid-cols-[34px_minmax(0,1fr)] items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-[#ffb12b]">
            <UserPlus className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-white">Invite a teammate</div>
            <div className="mt-1 text-[12px] leading-snug text-white/48">
              {workspace.openSeats > 0 ? `${workspace.openSeats} open team seat${workspace.openSeats === 1 ? "" : "s"}.` : "All team seats are assigned or pending."}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 rounded-full border border-white/12 bg-white/[0.07] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.11)]">
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
          {pending ? "Sending..." : "Send invite"}
        </button>

        {message ? <div className="mt-3 rounded-xl border border-[#43ed74]/18 bg-[#43ed74]/8 px-3 py-2 text-[12px] font-semibold text-[#74f49a]">{message}</div> : null}
        {inviteLink ? (
          <a
            href={inviteLink}
            className="mt-3 block truncate rounded-xl border border-[#ffb12b]/20 bg-[#ffb12b]/10 px-3 py-2 text-[12px] font-semibold text-[#ffb12b]"
          >
            {inviteLink}
          </a>
        ) : null}
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

function RosterRow({
  onRelease,
  releasePending,
  row
}: {
  onRelease: (row: RosterRowRecord) => void;
  releasePending: boolean;
  row: RosterRowRecord;
}) {
  const pendingInvite = "expiresAt" in row;
  const roleLabel = row.role === "owner" ? "Owner" : row.role === "admin" ? "Admin" : row.role === "viewer" ? "Viewer" : "Analyst";
  const canRelease = pendingInvite || row.role !== "owner";
  const releaseLabel = pendingInvite ? `Revoke invite for ${row.email}` : `Remove ${row.email} from team`;

  return (
    <div className="grid grid-cols-[38px_minmax(0,1fr)_auto_36px] items-center gap-3 py-3">
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
      {canRelease ? (
        <button
          type="button"
          onClick={() => onRelease(row)}
          disabled={releasePending}
          title={releaseLabel}
          aria-label={releaseLabel}
          className="grid h-9 w-9 place-items-center rounded-xl border border-[#ff6b6b]/20 bg-[#ff6b6b]/10 text-[#ff9b9b] transition hover:brightness-110 disabled:opacity-45"
        >
          {releasePending ? (
            <Clock3 className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
          ) : pendingInvite ? (
            <XCircle className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
          ) : (
            <UserMinus className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
          )}
        </button>
      ) : (
        <span className="h-9 w-9" aria-hidden="true" />
      )}
    </div>
  );
}
