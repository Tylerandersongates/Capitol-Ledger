import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Bell, CheckCircle2, FileText, Home, LockKeyhole, Mail, Settings, ShieldCheck, UsersRound } from "lucide-react";
import { TeamInviteAcceptanceControls } from "@/components/team-invite-acceptance-controls";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass } from "@/components/mobile-ui";
import { getCurrentSession } from "@/lib/auth";
import { readTeamWorkspaceInviteAcceptance, TeamWorkspaceError, type TeamWorkspaceAcceptancePreview } from "@/lib/team-workspace";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const premiumEyebrowClass = "text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48";
const premiumPanelClass =
  "rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.22)_0%,rgba(7,23,50,0.68)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(2,10,28,0.22)]";
const premiumIconTileClass =
  "grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.16)]";

type TeamAcceptSearchParams = {
  token?: string;
};

export default async function TeamInviteAcceptPage({ searchParams }: { searchParams?: TeamAcceptSearchParams }) {
  const token = searchParams?.token ?? "";
  const session = await getCurrentSession();
  const preview = await readPreview(token);

  return (
    <TeamAcceptShell>
      <header className="mt-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/team" className={mobileIconButtonClass} aria-label="Back to team">
            <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
          </Link>
          <div>
            <div className={premiumEyebrowClass}>Team Invite</div>
            <h1 className="mt-2 text-[30px] font-medium leading-none text-white">Accept Seat</h1>
          </div>
        </div>
        <span className={premiumIconTileClass}>
          <UsersRound className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </header>

      <main className="mt-7 space-y-5 pb-8">
        {preview.ok ? (
          <InviteCard preview={preview.value} sessionEmail={session?.user.email} token={token} />
        ) : (
          <InviteErrorCard error={preview.error} />
        )}
      </main>
    </TeamAcceptShell>
  );
}

async function readPreview(token: string): Promise<{ ok: true; value: TeamWorkspaceAcceptancePreview } | { error: string; ok: false }> {
  try {
    return {
      ok: true,
      value: await readTeamWorkspaceInviteAcceptance({ token })
    };
  } catch (error) {
    if (error instanceof TeamWorkspaceError) return { error: error.message, ok: false };
    throw error;
  }
}

function InviteCard({
  preview,
  sessionEmail,
  token
}: {
  preview: TeamWorkspaceAcceptancePreview;
  sessionEmail?: string;
  token: string;
}) {
  const returnTo = `/team/accept?token=${encodeURIComponent(token)}`;
  const emailParam = encodeURIComponent(preview.invite.email);
  const signInHref = `/sign-in?email=${emailParam}&returnTo=${encodeURIComponent(returnTo)}`;
  const createHref = `/sign-in?mode=create&email=${emailParam}&returnTo=${encodeURIComponent(returnTo)}`;
  const emailMatches = Boolean(sessionEmail && sessionEmail.trim().toLowerCase() === preview.invite.email);
  const roleLabel = preview.invite.role === "admin" ? "Admin" : preview.invite.role === "viewer" ? "Viewer" : "Analyst";

  return (
    <>
      <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <div className={premiumEyebrowClass}>Workspace Access</div>
            <h2 className="mt-2 text-[26px] font-medium leading-tight text-white">{preview.workspace.name}</h2>
            <p className="mt-3 text-[15px] leading-snug text-white/60">
              {preview.owner.name || preview.owner.email || "The workspace owner"} invited {preview.invite.email} to join this Team workspace.
            </p>
          </div>
          <span className={premiumIconTileClass}>
            <Mail className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <InviteMetric label="Role" value={roleLabel} />
          <InviteMetric label="Expires" value={formatDate(preview.invite.expiresAt)} />
        </div>

        {sessionEmail ? (
          <>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-[#43ed74]" strokeWidth={2} aria-hidden="true" />
                Signed in as {sessionEmail}
              </div>
              <div className="mt-1 text-[12px] leading-snug text-white/48">
                This seat is reserved for {preview.invite.email}.
              </div>
            </div>
            {!emailMatches ? (
              <InviteAuthActions
                createHref={createHref}
                email={preview.invite.email}
                signInHref={signInHref}
                title="Switch to the invited account"
                description={`Create or sign in with ${preview.invite.email} to claim this paid Team seat.`}
              />
            ) : null}
          </>
        ) : (
          <InviteAuthActions
            createHref={createHref}
            email={preview.invite.email}
            signInHref={signInHref}
            title="Create or sign in to accept"
            description={`Create a new account or sign in with ${preview.invite.email} to claim this paid Team seat.`}
          />
        )}

        {sessionEmail && emailMatches ? <TeamInviteAcceptanceControls emailMatches={emailMatches} token={token} /> : null}
      </MobileCard>

      <MobileCard variant="rust" className="px-5 py-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <div className={premiumEyebrowClass}>Seat Rules</div>
            <h2 className="mt-2 text-[22px] font-medium leading-tight text-white">Paid capacity applies</h2>
            <p className="mt-2 text-[13px] leading-snug text-white/54">
              Acceptance checks current Team billing for the workspace owner before assigning this seat.
            </p>
          </div>
          <span className={premiumIconTileClass}>
            <CheckCircle2 className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
          </span>
        </div>
      </MobileCard>
    </>
  );
}

function InviteAuthActions({
  createHref,
  description,
  email,
  signInHref,
  title
}: {
  createHref: string;
  description: string;
  email: string;
  signInHref: string;
  title: string;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-4 py-4">
      <div className="flex items-center gap-2 text-[14px] font-semibold text-[#ffb12b]">
        <LockKeyhole className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
        {title}
      </div>
      <p className="mt-2 text-[13px] leading-snug text-white/58">
        {description}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link href={createHref} className="flex h-11 items-center justify-center rounded-xl bg-[#ffb12b] text-[14px] font-semibold text-[#061126]">
          Create Account
        </Link>
        <Link href={signInHref} className="flex h-11 items-center justify-center rounded-xl border border-white/12 bg-white/5 text-[14px] font-semibold text-white/72">
          Sign In
        </Link>
      </div>
      <div className="mt-3 text-[12px] leading-snug text-white/48">
        Invite reserved for {email}.
      </div>
    </div>
  );
}

function InviteErrorCard({ error }: { error: string }) {
  return (
    <MobileCard variant="rust" className="px-5 py-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <div className={premiumEyebrowClass}>Invite Unavailable</div>
          <h2 className="mt-2 text-[26px] font-medium leading-tight text-white">This link cannot be used</h2>
          <p className="mt-3 text-[15px] leading-snug text-white/60">{error}</p>
        </div>
        <span className={premiumIconTileClass}>
          <LockKeyhole className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <Link
        href="/team"
        className="mt-5 flex h-11 items-center justify-center rounded-xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[14px] font-semibold text-[#ffb12b]"
      >
        Back to Team
      </Link>
    </MobileCard>
  );
}

function InviteMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${premiumPanelClass} px-3 py-3 text-center`}>
      <div className="truncate text-[17px] font-semibold leading-none text-[#ffb12b]">{value}</div>
      <div className="mt-2 truncate text-[10px] leading-tight text-white/46">{label}</div>
    </div>
  );
}

function TeamAcceptShell({ children }: { children: ReactNode }) {
  return (
    <MobileShell
      ambientClassName="bg-[radial-gradient(circle_at_18%_8%,rgba(43,122,203,0.16),transparent_32%),radial-gradient(circle_at_82%_10%,rgba(255,177,43,0.12),transparent_28%),linear-gradient(180deg,rgba(2,10,24,0.16)_0%,rgba(2,9,23,0.58)_54%,rgba(1,6,18,0.82)_100%)]"
      backgroundClassName="bg-[linear-gradient(180deg,#071a34_0%,#041229_30%,#020b1d_68%,#010817_100%)]"
      minHeight="min-h-[980px]"
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between px-3 text-[17px] font-semibold"
    >
      {children}
      <MobileBottomNav
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { href: "/team", icon: <UsersRound />, label: "Team", highlighted: true },
          { href: "/alerts", icon: <Bell />, label: "Alerts" },
          { href: "/settings", icon: <Settings />, label: "Settings" }
        ]}
      />
    </MobileShell>
  );
}
