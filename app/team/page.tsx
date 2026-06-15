import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  FileText,
  Home,
  ListChecks,
  LockKeyhole,
  Map,
  Settings,
  ShieldCheck,
  UserPlus,
  UserRound,
  UsersRound
} from "lucide-react";
import { TeamCheckoutReturnSync } from "@/components/team-checkout-return-sync";
import { TeamInviteControls } from "@/components/team-invite-controls";
import { MobileShell } from "@/components/mobile-shell";
import { MobileBottomNav, MobileCard, mobileIconButtonClass, mobileViewAllClass } from "@/components/mobile-ui";
import { getAccountLedger } from "@/lib/account-ledger";
import { getAccountPersistenceUserId, readLedgerFromDatabase, readSubscriptionFromDatabase } from "@/lib/account-database";
import { getAccountSubscription } from "@/lib/account-subscription";
import { getBill, getBillStatus, getMember, getRecentUpdates } from "@/lib/data";
import { requireAccountSession } from "@/lib/route-guards";
import { normalizeTeamSeatCount } from "@/lib/subscription-seat-count";
import { readOrCreateTeamWorkspaceForOwner, readTeamWorkspaceForMember } from "@/lib/team-workspace";
import { formatDate } from "@/lib/utils";
import type { AccountLedgerSnapshot, AccountSubscriptionSnapshot, SavedFollowRecord, TeamWorkspaceInvite, TeamWorkspaceMember, TeamWorkspaceRole } from "@/types/capitol";

export const dynamic = "force-dynamic";

const premiumEyebrowClass = "text-[12px] font-semibold uppercase tracking-[0.1em] text-white/48";
const premiumPanelClass =
  "rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(29,83,145,0.22)_0%,rgba(7,23,50,0.68)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_24px_rgba(2,10,28,0.22)]";
const premiumIconTileClass =
  "grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_rgba(255,177,43,0.16)]";

type Metric = {
  label: string;
  value: string;
};

type RoleMetric = {
  description: string;
  label: string;
  value: string;
};

type WatchlistBillRow = {
  href: string;
  id: string;
  meta: string;
  status: string;
  title: string;
  value: string;
};

type AlertQueueRow = {
  body: string;
  date: string;
  href: string;
  id: string;
  label: string;
  title: string;
};

type TeamPageSearchParams = Record<string, string | string[] | undefined>;

export default async function TeamWorkspacePage({ searchParams }: { searchParams?: TeamPageSearchParams }) {
  const session = await requireAccountSession("/team");
  const accountUserId = await getAccountPersistenceUserId(session.user).catch(() => session.user.id);
  const [databaseSubscription, databaseLedger] = await Promise.all([
    readSubscriptionFromDatabase(accountUserId).catch(() => null),
    readLedgerFromDatabase(accountUserId).catch(() => null)
  ]);
  const subscription = databaseSubscription ?? getAccountSubscription(accountUserId);
  const accountLedger = databaseLedger ?? getAccountLedger(accountUserId);
  const teamCheckoutReturn = readSearchParam(searchParams, "checkout") === "success" && readSearchParam(searchParams, "plan") === "team";
  const ownerAccess = hasActiveTeamAccess(subscription);
  const memberWorkspaceResult = ownerAccess
    ? null
    : await readTeamWorkspaceForMember({
        email: session.user.email,
        userId: accountUserId
      }).catch(() => null);

  if (!ownerAccess && !memberWorkspaceResult) {
    return <TeamAccessGate checkoutReturn={teamCheckoutReturn} subscription={subscription} />;
  }

  const seatCount = normalizeTeamSeatCount(subscription.seatCount);
  const ownerName = session.user.name?.trim() || session.user.email;
  const workspaceName = ownerName ? `${ownerName}'s team` : "Team workspace";
  const teamWorkspaceResult = ownerAccess
    ? await readOrCreateTeamWorkspaceForOwner({
        email: session.user.email,
        name: session.user.name,
        seatCount,
        userId: accountUserId,
        workspaceName
      })
    : memberWorkspaceResult;
  if (!teamWorkspaceResult) return <TeamAccessGate checkoutReturn={teamCheckoutReturn} subscription={subscription} />;
  const teamWorkspace = teamWorkspaceResult.workspace;
  const canManageInvites = ownerAccess && teamWorkspace.ownerUserId === accountUserId;
  const viewerMembership: TeamWorkspaceMember | undefined = canManageInvites ? undefined : memberWorkspaceResult?.membership;
  const openSeats = teamWorkspace.openSeats;
  const watchlistBills = buildWatchlistBills(accountLedger.follows);
  const alertQueue = buildAlertQueue(accountLedger);
  const teamRoles = buildRoleMetrics(teamWorkspace.members, teamWorkspace.invites);
  const teamMetrics: Metric[] = [
    { label: "Paid seats", value: String(teamWorkspace.seatCount) },
    { label: "Assigned", value: String(teamWorkspace.occupiedSeats) },
    { label: "Open seats", value: String(openSeats) }
  ];
  const setupSteps = [
    {
      description: canManageInvites
        ? `${formatProviderLabel(subscription.provider)} ${subscription.cycle} billing is connected to this workspace.`
        : "The workspace owner has active Team billing for this paid seat.",
      label: "Billing active",
      value: canManageInvites ? formatStatusLabel(subscription.status) : "Active"
    },
    {
      description: canManageInvites
        ? `${ownerName || "The signed-in account"} owns billing, workspace setup, and invite rollout.`
        : `${session.user.email} is assigned as ${formatRoleLabel(viewerMembership?.role)}.`,
      label: canManageInvites ? "Owner seat assigned" : "Member seat assigned",
      value: canManageInvites ? "Ready" : "Accepted"
    },
    {
      description: canManageInvites
        ? `${openSeats} open paid seat${openSeats === 1 ? "" : "s"} can be reserved with pending invite records.`
        : `${teamWorkspace.occupiedSeats} of ${teamWorkspace.seatCount} paid seats are assigned or pending in this workspace.`,
      label: canManageInvites ? "Invite capacity" : "Workspace capacity",
      value: `${teamWorkspace.seatCount} seats`
    }
  ];

  return (
    <TeamShell>
      <header className="mt-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/upgrade" className={mobileIconButtonClass} aria-label="Back to upgrade">
            <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
          </Link>
          <div>
            <div className={premiumEyebrowClass}>Team Workspace</div>
            <h1 className="mt-2 text-[30px] font-medium leading-none text-white">Workspace</h1>
          </div>
        </div>
        <span className={premiumIconTileClass}>
          <UsersRound className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </header>

      <main className="mt-7 space-y-5 pb-8">
        <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
          <div className="flex items-start gap-4">
            <Image src="/capitol-ledger-logo.png" alt="" width={58} height={58} className="h-[58px] w-[58px] rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <div className={premiumEyebrowClass}>Civic Team Workspace</div>
              <h2 className="mt-2 text-[26px] font-medium leading-tight text-white">{teamWorkspace.name}</h2>
              <p className="mt-3 text-[15px] leading-snug text-white/60">
                {canManageInvites
                  ? "Your paid Team workspace is active. Seat quantity comes from checkout, and pending invites now reserve open seats in the workspace."
                  : "Your Team seat is active. Shared workspace records, roles, and alert candidates are available through the owner-paid plan."}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {teamMetrics.map((metric) => (
              <MetricTile key={metric.label} {...metric} />
            ))}
          </div>

          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[#43ed74]/24 bg-[#43ed74]/8 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#74f49a]">
                <CheckCircle2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                {canManageInvites ? "Team subscription active" : "Team seat active"}
              </div>
              <div className="mt-1 text-[12px] leading-snug text-white/52">
                {canManageInvites
                  ? `${formatProviderLabel(subscription.provider)} record, ${formatStatusLabel(subscription.status).toLowerCase()} status, ${teamWorkspace.seatCount} paid seats.`
                  : `${formatRoleLabel(viewerMembership?.role)} access, ${teamWorkspace.occupiedSeats}/${teamWorkspace.seatCount} seats assigned.`}
              </div>
            </div>
            {canManageInvites ? (
              <Link href="/upgrade" className="shrink-0 rounded-full border border-[#43ed74]/24 bg-[#43ed74]/10 px-3 py-2 text-[12px] font-semibold text-[#74f49a]">
                Manage
              </Link>
            ) : null}
          </div>
        </MobileCard>

        <MobileCard variant="rust" className="px-5 py-5">
          <SectionHeader
            icon={<ShieldCheck />}
            eyebrow="Workspace Setup"
            title="Team foundation is active"
            description="Billing, owner access, and pending invite storage are live for this workspace."
          />
          <div className="mt-5 grid gap-3">
            {setupSteps.map((step) => (
              <SetupStep key={step.label} {...step} />
            ))}
          </div>
        </MobileCard>

        <MobileCard variant="rust" className="px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <SectionHeader
              compact
              icon={<ListChecks />}
              eyebrow="Workspace Seed"
              title="Saved bills"
              description="Your account watchlist is the starting point for the shared Team watchlist."
            />
            <Link href="/search?type=bills" className={mobileViewAllClass}>Bills</Link>
          </div>
          {watchlistBills.length ? (
            <div className="mt-5 divide-y divide-white/8">
              {watchlistBills.map((bill) => (
                <Link key={bill.id} href={bill.href} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4">
                  <span className="min-w-0">
                    <span className="block text-[16px] font-semibold text-white">{bill.value}</span>
                    <span className="mt-1 block truncate text-[14px] text-white/66">{bill.title}</span>
                    <span className="mt-1 block text-[12px] text-white/42">{bill.meta}</span>
                  </span>
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[12px] font-semibold text-[#ffb12b]">
                    {bill.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyPanel
              actionHref="/search?type=bills"
              actionLabel="Add bills"
              description="Save bills to your account to seed the first shared Team watchlist."
              title="No saved bills yet"
            />
          )}
        </MobileCard>

        <MobileCard variant="rust" className="px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <SectionHeader
              compact
              icon={<Bell />}
              eyebrow="Signal Queue"
              title="Workspace alert candidates"
              description="Recent updates tied to saved Team seed records appear here before shared alert routing is added."
            />
            <Link href="/alerts" className={mobileViewAllClass}>Alerts</Link>
          </div>
          {alertQueue.length ? (
            <div className="mt-5 space-y-3">
              {alertQueue.map((alert) => (
                <Link key={alert.id} href={alert.href} className={`${premiumPanelClass} block px-4 py-3`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 text-[14px] font-semibold text-white">{alert.title}</span>
                    <span className="shrink-0 text-[11px] font-semibold text-white/42">{alert.date}</span>
                  </div>
                  <div className="mt-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#ffb12b]">{alert.label}</div>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-white/54">{alert.body}</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyPanel
              actionHref="/alerts"
              actionLabel="Open alerts"
              description="Save bills or officials first, then related updates can feed this Team queue."
              title="No workspace alert candidates"
            />
          )}
        </MobileCard>

        <MobileCard variant="rust" className="px-5 py-5">
          <SectionHeader
            icon={<UsersRound />}
            eyebrow="Workspace Roles"
            title="Seat model"
            description="Active members and pending invites count against paid workspace capacity."
          />
          <div className="mt-5 grid gap-3">
            {teamRoles.map((role) => (
              <div key={role.label} className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-[#ffb12b]">
                  <UserRound className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-white">{role.label}</span>
                  <span className="mt-1 block text-[12px] leading-snug text-white/48">{role.description}</span>
                </span>
                <span className="text-[18px] font-semibold text-[#ffb12b]">{role.value}</span>
              </div>
            ))}
          </div>
        </MobileCard>

        {canManageInvites ? (
          <MobileCard variant="rust" className="px-5 py-5">
            <SectionHeader
              icon={<UserPlus />}
              eyebrow="Invite Teammates"
              title="Reserve paid seats"
              description={`Pending invites reserve open seats from the ${teamWorkspace.seatCount}-seat Team plan.`}
            />
            <TeamInviteControls initialWorkspace={teamWorkspace} />
          </MobileCard>
        ) : (
          <MobileCard variant="rust" className="px-5 py-5">
            <SectionHeader
              icon={<CheckCircle2 />}
              eyebrow="Member Access"
              title="Your seat is assigned"
              description="The workspace owner manages billing and invites. Your accepted seat counts against paid Team capacity."
            />
            <div className="mt-5 rounded-2xl border border-[#43ed74]/24 bg-[#43ed74]/8 px-4 py-3">
              <div className="text-[14px] font-semibold text-white">{session.user.email}</div>
              <div className="mt-1 text-[12px] leading-snug text-white/48">{formatRoleLabel(viewerMembership?.role)} access in {teamWorkspace.name}.</div>
            </div>
          </MobileCard>
        )}
      </main>
    </TeamShell>
  );
}

function readSearchParam(searchParams: TeamPageSearchParams | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function TeamAccessGate({ checkoutReturn = false, subscription }: { checkoutReturn?: boolean; subscription: AccountSubscriptionSnapshot }) {
  const currentPlan = subscription.plan === "team" ? "Team" : subscription.plan === "pro" ? "Pro" : "Free";
  const teamPlanSelected = subscription.plan === "team";
  const metrics: Metric[] = [
    { label: "Current plan", value: currentPlan },
    { label: "Team seats", value: teamPlanSelected ? String(normalizeTeamSeatCount(subscription.seatCount)) : "3+" },
    { label: "Status", value: checkoutReturn ? "Syncing" : teamPlanSelected ? formatStatusLabel(subscription.status) : "Upgrade" }
  ];

  return (
    <TeamShell minHeight="min-h-[980px]">
      <header className="mt-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/upgrade" className={mobileIconButtonClass} aria-label="Back to upgrade">
            <ArrowLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden="true" />
          </Link>
          <div>
            <div className={premiumEyebrowClass}>Team Workspace</div>
            <h1 className="mt-2 text-[30px] font-medium leading-none text-white">Workspace</h1>
          </div>
        </div>
        <span className={premiumIconTileClass}>
          <LockKeyhole className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </header>

      <main className="mt-7 space-y-5 pb-8">
        <MobileCard variant="rust" className="overflow-hidden px-5 py-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
            <div className="min-w-0">
              <div className={premiumEyebrowClass}>{checkoutReturn ? "Checkout Return" : "Team Access"}</div>
              <h2 className="mt-2 text-[26px] font-medium leading-tight text-white">
                {checkoutReturn ? "Finishing Team setup" : "Upgrade to open your workspace"}
              </h2>
              <p className="mt-3 text-[15px] leading-snug text-white/60">
                {checkoutReturn
                  ? "Stripe checkout is complete. Capitol Ledger is waiting for the subscription event before opening the workspace."
                  : "Team workspace setup now requires an active Team subscription. Checkout sets the paid seat count, then this page opens the workspace foundation for invites, roles, and shared tracking."}
              </p>
            </div>
            <span className={premiumIconTileClass}>
              <UsersRound className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
            </span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {metrics.map((metric) => (
              <MetricTile key={metric.label} {...metric} />
            ))}
          </div>

          {checkoutReturn ? (
            <TeamCheckoutReturnSync />
          ) : (
            <Link href="/upgrade#plans" className="mt-5 flex h-11 items-center justify-center rounded-xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 text-[14px] font-semibold text-[#ffb12b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:brightness-110">
              Choose Team Plan
            </Link>
          )}
        </MobileCard>

        <MobileCard variant="rust" className="px-5 py-5">
          <SectionHeader
            icon={<ShieldCheck />}
            eyebrow="What Unlocks"
            title="Seat-managed collaboration"
            description="Team checkout unlocks the workspace setup state, paid seat capacity, owner controls, and the path to shared watchlists."
          />
          <div className="mt-5 grid gap-3">
            <SetupStep
              description="The Team plan starts at 3 seats and uses checkout quantity for billing."
              label="Paid seat count"
              value="Required"
            />
            <SetupStep
              description="The signed-in buyer becomes the workspace owner for setup and invite rollout."
              label="Owner workspace"
              value="Included"
            />
            <SetupStep
              description="Saved account records become the seed list for the shared Team workspace."
              label="Workspace seed"
              value="Included"
            />
          </div>
        </MobileCard>
      </main>
    </TeamShell>
  );
}

function TeamShell({ children, minHeight = "min-h-[1180px]" }: { children: ReactNode; minHeight?: string }) {
  return (
    <MobileShell
      ambientClassName="bg-[radial-gradient(circle_at_18%_8%,rgba(43,122,203,0.16),transparent_32%),radial-gradient(circle_at_82%_10%,rgba(255,177,43,0.12),transparent_28%),linear-gradient(180deg,rgba(2,10,24,0.16)_0%,rgba(2,9,23,0.58)_54%,rgba(1,6,18,0.82)_100%)]"
      backgroundClassName="bg-[linear-gradient(180deg,#071a34_0%,#041229_30%,#020b1d_68%,#010817_100%)]"
      minHeight={minHeight}
      contentClassName="px-8 pb-5 pt-8"
      statusBarClassName="flex items-center justify-between px-3 text-[17px] font-semibold"
    >
      {children}
      <MobileBottomNav
        items={[
          { href: "/dashboard", icon: <Home />, label: "Home" },
          { href: "/search?type=bills", icon: <FileText />, label: "Bills" },
          { href: "/map", icon: <Map />, label: "Map" },
          { href: "/alerts", icon: <Bell />, label: "Alerts" },
          { href: "/settings", icon: <Settings />, label: "Settings" }
        ]}
      />
    </MobileShell>
  );
}

function SectionHeader({
  compact = false,
  description,
  eyebrow,
  icon,
  title
}: {
  compact?: boolean;
  description: string;
  eyebrow: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className={`grid ${compact ? "grid-cols-[minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)_auto]"} items-start gap-4`}>
      <div className="min-w-0">
        <div className={premiumEyebrowClass}>{eyebrow}</div>
        <h2 className={`${compact ? "text-[20px]" : "text-[22px]"} mt-2 font-medium leading-tight text-white`}>{title}</h2>
        <p className="mt-2 text-[13px] leading-snug text-white/54">{description}</p>
      </div>
      {compact ? null : <span className={premiumIconTileClass}>{icon}</span>}
    </div>
  );
}

function MetricTile({ label, value }: Metric) {
  return (
    <div className={`${premiumPanelClass} px-3 py-3 text-center`}>
      <div className="truncate text-[21px] font-semibold leading-none text-[#ffb12b]">{value}</div>
      <div className="mt-2 truncate text-[10px] leading-tight text-white/46">{label}</div>
    </div>
  );
}

function SetupStep({ description, label, value }: { description: string; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-[#43ed74]">
        <CheckCircle2 className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold text-white">{label}</span>
        <span className="mt-1 block text-[12px] leading-snug text-white/48">{description}</span>
      </span>
      <span className="text-[12px] font-semibold text-[#ffb12b]">{value}</span>
    </div>
  );
}

function EmptyPanel({
  actionHref,
  actionLabel,
  description,
  title
}: {
  actionHref: string;
  actionLabel: string;
  description: string;
  title: string;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4">
      <div className="text-[14px] font-semibold text-white">{title}</div>
      <p className="mt-2 text-[13px] leading-snug text-white/52">{description}</p>
      <Link href={actionHref} className="mt-4 inline-flex h-9 items-center rounded-xl border border-[#ffb12b]/24 bg-[#ffb12b]/10 px-4 text-[13px] font-semibold text-[#ffb12b]">
        {actionLabel}
      </Link>
    </div>
  );
}

function hasActiveTeamAccess(subscription: AccountSubscriptionSnapshot) {
  return subscription.plan === "team" && (subscription.status === "active" || subscription.status === "trialing");
}

function formatStatusLabel(status: AccountSubscriptionSnapshot["status"]) {
  if (status === "past_due") return "Past due";
  if (status === "trialing") return "Trialing";
  if (status === "canceled") return "Canceled";
  return "Active";
}

function formatProviderLabel(provider: AccountSubscriptionSnapshot["provider"]) {
  if (provider === "stripe") return "Stripe";
  if (provider === "revenuecat") return "RevenueCat";
  if (provider === "app-store") return "App Store";
  return "Demo";
}

function formatRoleLabel(role?: TeamWorkspaceRole) {
  if (role === "owner") return "Owner";
  if (role === "viewer") return "Viewer";
  return "Analyst";
}

function buildRoleMetrics(members: TeamWorkspaceMember[], invites: TeamWorkspaceInvite[]): RoleMetric[] {
  const roleCounts: Record<TeamWorkspaceRole, { active: number; pending: number }> = {
    owner: { active: 0, pending: 0 },
    analyst: { active: 0, pending: 0 },
    viewer: { active: 0, pending: 0 }
  };

  members.forEach((member) => {
    roleCounts[member.role].active += 1;
  });
  invites.forEach((invite) => {
    roleCounts[invite.role].pending += 1;
  });

  return [
    {
      description: "Controls billing, setup, and member access.",
      label: "Owner",
      value: String(roleCounts.owner.active)
    },
    {
      description: roleSummary("analyst", roleCounts.analyst),
      label: "Analyst",
      value: String(roleCounts.analyst.active + roleCounts.analyst.pending)
    },
    {
      description: roleSummary("viewer", roleCounts.viewer),
      label: "Viewer",
      value: String(roleCounts.viewer.active + roleCounts.viewer.pending)
    }
  ];
}

function roleSummary(role: Exclude<TeamWorkspaceRole, "owner">, counts: { active: number; pending: number }) {
  const label = role === "analyst" ? "Analyst" : "Viewer";
  const active = `${counts.active} active`;
  const pending = `${counts.pending} pending`;

  return `${label} seats: ${active}, ${pending}.`;
}

function buildWatchlistBills(follows: SavedFollowRecord[]): WatchlistBillRow[] {
  return follows
    .filter((record) => record.type === "bill")
    .slice(0, 3)
    .flatMap((record) => {
      const bill = getBill(record.id);
      if (!bill) return [];

      return [
        {
          href: `/bills/${bill.id}`,
          id: bill.id,
          meta: bill.committeeName ?? bill.policyArea,
          status: getBillStatus(bill),
          title: bill.shortTitle,
          value: bill.displayNumber
        }
      ];
    });
}

function buildAlertQueue(ledger: AccountLedgerSnapshot): AlertQueueRow[] {
  const followKeys = new Set(ledger.follows.map((record) => `${record.type}:${record.id}`));
  const savedAlerts = new Set(ledger.savedAlerts);

  return getRecentUpdates()
    .filter((event) => savedAlerts.has(event.id) || followKeys.has(`${event.targetType}:${event.targetId}`))
    .slice(0, 4)
    .map((event) => {
      const bill = event.targetType === "bill" ? getBill(event.targetId) : undefined;
      const member = event.targetType === "member" ? getMember(event.targetId) : undefined;
      const href = bill ? `/bills/${bill.id}` : member ? `/members/${member.bioguideId}` : "/search";

      return {
        body: event.body,
        date: formatDate(event.occurredAt),
        href,
        id: event.id,
        label: bill?.displayNumber ?? member?.fullName ?? "Civic record",
        title: event.title
      };
    });
}
