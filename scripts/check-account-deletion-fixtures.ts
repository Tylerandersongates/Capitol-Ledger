#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  runAccountDeletionTransaction,
  type AccountDeletionDatabaseClient,
  type AccountDeletionTransactionClient
} from "@/lib/account-deletion";
import {
  clearLocalAccountDataAfterDeletion,
  writeLocalAccountProfile
} from "@/lib/browser-account-profile";
import { writeLocalAccountLedger } from "@/lib/browser-account-ledger";
import {
  acceptRemoteBrowserAccountDeletionFenceClear,
  accountDeletionReceiptStorageKey,
  accountDeletionFenceStorageKey,
  beginFreshBrowserAuthentication,
  completeFreshBrowserAuthentication,
  hasActiveBrowserSession,
  hasBrowserAccountDeletionReceipt,
  isBrowserAccountDeletionFenced,
  markBrowserAccountDeletionConfirmed,
  setBrowserSessionAuthenticated
} from "@/lib/browser-auth-state";

type DeletionRequest = {
  completedAt: Date | null;
  completionBy: Date;
  id: string;
  requestedAt: Date;
  status: "new" | "reviewing" | "planned" | "resolved";
  userId: string | null;
};

type OptionalRow = {
  contactEmail?: string | null;
  email?: string;
  invitedByUserId?: string | null;
  senderEmail?: string;
  senderKey?: string;
  previousSubscription?: Record<string, unknown>;
  userId?: string | null;
  workspaceId?: string;
};

type CleanupJob = {
  dedupeKey: string;
  deletionRequestId: string;
  id: string;
  kind: string;
  payload: unknown;
};

type SubscriptionRow = {
  provider: string;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  userId: string;
};

type FakeState = {
  children: Array<{ table: string; userId: string }>;
  cleanupJobs: CleanupJob[];
  optionalRows: Record<string, OptionalRow[]>;
  requests: DeletionRequest[];
  subscriptions: SubscriptionRow[];
  users: Array<{ email: string; id: string }>;
  workspaces: Array<{ id: string; ownerUserId: string }>;
};

const optionalTableKeys = {
  BetaFeedback: "betaFeedback",
  OfficialContactMessage: "officialContactMessage",
  PetitionSignature: "petitionSignature",
  TeamInvite: "teamInvite",
  TeamMember: "teamMember",
  TeamSubscriptionPause: "teamSubscriptionPause",
  TeamWorkspace: "teamWorkspace"
} as const;

const requiredChildAliases = {
  AccountGamification: "accountGamification",
  AccountSubscription: "accountSubscriptions",
  AuthSession: "authSessions",
  EmailVerificationToken: "emailVerificationTokens",
  Follow: "follows",
  IssueInterest: "issueInterests",
  PasswordResetToken: "passwordResetTokens",
  ReadAlert: "readAlerts",
  SavedAlert: "savedAlerts",
  UpdateEvent: "updateEvents",
  WeeklyBriefDelivery: "weeklyBriefDeliveries",
  WeeklyBriefEdition: "weeklyBriefEditions"
} as const;

function cloneState(state: FakeState): FakeState {
  return structuredClone(state);
}

function normalized(query: string) {
  return query.replace(/\s+/g, " ").trim();
}

function matchesEmail(value: string | null | undefined, email: string) {
  return value?.trim().toLowerCase() === email;
}

function matchesOptionalQuery(table: string, row: OptionalRow, query: string, values: unknown[]) {
  if (table === "TeamSubscriptionPause" && query.includes('WHERE "workspaceId" = $1')) {
    return row.workspaceId === values[0];
  }

  if (table === "TeamInvite") {
    return matchesEmail(row.email, values[0] as string);
  }

  const userId = values[0] as string;
  const email = (values[1] as string | undefined) ?? "";
  if (table === "OfficialContactMessage") {
    const senderKeys = new Set(values.slice(2, 4).filter((value): value is string => typeof value === "string"));
    return (
      row.userId === userId ||
      matchesEmail(row.senderEmail, email) ||
      Boolean(row.senderKey && senderKeys.has(row.senderKey.toLowerCase()))
    );
  }
  if (table === "BetaFeedback") {
    return row.userId === userId || matchesEmail(row.contactEmail, email);
  }
  if (table === "TeamMember" || table === "TeamSubscriptionPause") {
    return row.userId === userId || matchesEmail(row.email, email);
  }
  if (table === "PetitionSignature") {
    return row.userId === userId;
  }

  return false;
}

class FakeDeletionDatabase implements AccountDeletionDatabaseClient {
  calls: string[] = [];
  failOn = "";
  ignoreDeleteFor = "";
  isolationLevels: string[] = [];
  transactionCount = 0;

  constructor(
    public state: FakeState,
    private readonly presentTables = new Set(["AccountDeletionCleanupJob", ...Object.keys(optionalTableKeys)])
  ) {}

  async $transaction<T>(
    operation: (transaction: AccountDeletionTransactionClient) => Promise<T>,
    options?: { isolationLevel: "Serializable" }
  ) {
    this.transactionCount += 1;
    if (options?.isolationLevel) this.isolationLevels.push(options.isolationLevel);
    const pending = cloneState(this.state);
    const transaction: AccountDeletionTransactionClient = {
      $executeRawUnsafe: async (query, ...values) => this.execute(pending, query, values),
      $queryRawUnsafe: async <R>(query: string, ...values: unknown[]) => this.query<R>(pending, query, values)
    };

    const result = await operation(transaction);
    this.state = pending;
    return result;
  }

  private maybeFail(query: string) {
    if (this.failOn && query.includes(this.failOn)) throw new Error("forced fixture failure");
  }

  private async query<T>(state: FakeState, rawQuery: string, values: unknown[]) {
    const query = normalized(rawQuery);
    this.calls.push(query);
    this.maybeFail(query);

    if (query.startsWith('SELECT "id", "email" FROM "User"')) {
      return state.users.filter((user) => user.id === values[0]) as T;
    }

    if (query.includes('FROM "AccountDeletionRequest"') && query.includes('"status" <> \'resolved\'')) {
      return state.requests
        .filter((request) => request.userId === values[0] && request.status !== "resolved")
        .sort((left, right) => right.requestedAt.getTime() - left.requestedAt.getTime())
        .slice(0, 1) as T;
    }

    if (query.startsWith('INSERT INTO "AccountDeletionRequest"')) {
      const request: DeletionRequest = {
        completedAt: null,
        completionBy: values[3] as Date,
        id: values[0] as string,
        requestedAt: values[2] as Date,
        status: "new",
        userId: values[1] as string
      };
      state.requests.push(request);
      return [request] as T;
    }

    if (query.includes("to_regclass('public.\"BetaFeedback\"')")) {
      const registration = Object.fromEntries(
        Object.entries(optionalTableKeys).map(([table, key]) => [key, this.presentTables.has(table) ? table : null])
      );
      registration.accountDeletionCleanupJob = this.presentTables.has("AccountDeletionCleanupJob")
        ? "AccountDeletionCleanupJob"
        : null;
      return [registration] as T;
    }

    if (query.startsWith('SELECT "id" FROM "TeamWorkspace"')) {
      return state.workspaces.filter((workspace) => workspace.ownerUserId === values[0]).map(({ id }) => ({ id })) as T;
    }

    if (query.startsWith('SELECT "provider", "providerCustomerId", "providerSubscriptionId"')) {
      return state.subscriptions.filter((subscription) => subscription.userId === values[0]).slice(0, 1) as T;
    }

    if (query.startsWith('SELECT "userId", "previousSubscription" FROM "TeamSubscriptionPause"')) {
      if (query.includes('WHERE "userId" = $1')) {
        return (state.optionalRows.TeamSubscriptionPause ?? [])
          .filter((row) => row.userId === values[0] && row.previousSubscription)
          .map((row) => ({ previousSubscription: row.previousSubscription, userId: row.userId })) as T;
      }
      return (state.optionalRows.TeamSubscriptionPause ?? [])
        .filter((row) => row.workspaceId === values[0] && row.userId !== values[1] && row.previousSubscription)
        .map((row) => ({ previousSubscription: row.previousSubscription, userId: row.userId })) as T;
    }

    if (query.startsWith('SELECT COUNT(*)::int AS "count" FROM "AccountDeletionCleanupJob"')) {
      return [{
        count: state.cleanupJobs.filter((job) => job.dedupeKey === values[0] && job.deletionRequestId === values[1]).length
      }] as T;
    }

    if (query.includes('(SELECT COUNT(*)::int FROM "User"')) {
      const userId = values[0] as string;
      const counts: Record<string, number> = {
        accountDeletionRequests: state.requests.filter((request) => request.userId === userId).length,
        teamWorkspaces: state.workspaces.filter((workspace) => workspace.ownerUserId === userId).length,
        users: state.users.filter((user) => user.id === userId).length
      };
      Object.entries(requiredChildAliases).forEach(([table, alias]) => {
        counts[alias] = state.children.filter((record) => record.table === table && record.userId === userId).length;
      });
      return [counts] as T;
    }

    if (query.startsWith('SELECT COUNT(*)::int AS "count" FROM')) {
      const table = Object.keys(optionalTableKeys).find((name) => query.includes(`FROM "${name}"`));
      assert.ok(table, `Unexpected optional count query: ${query}`);
      const rows = state.optionalRows[table] ?? [];
      const count = rows.filter((row) => matchesOptionalQuery(table, row, query, values)).length;
      return [{ count }] as T;
    }

    if (query.includes('FROM "AccountDeletionRequest"') && query.includes('"completedAt" IS NOT NULL')) {
      return state.requests.filter(
        (request) => request.id === values[0] && request.userId === null && request.status === "resolved" && request.completedAt
      ) as T;
    }

    throw new Error(`Unexpected fixture query: ${query}`);
  }

  private async execute(state: FakeState, rawQuery: string, values: unknown[]) {
    const query = normalized(rawQuery);
    this.calls.push(query);
    this.maybeFail(query);
    const userId = values[0] as string;

    if (query.startsWith('INSERT INTO "AccountDeletionCleanupJob"')) {
      const dedupeKey = values[2] as string;
      if (state.cleanupJobs.some((job) => job.dedupeKey === dedupeKey)) return 0;
      state.cleanupJobs.push({
        dedupeKey,
        deletionRequestId: values[1] as string,
        id: values[0] as string,
        kind: values[3] as string,
        payload: JSON.parse(values[4] as string) as unknown
      });
      return 1;
    }

    const optionalTable = Object.keys(optionalTableKeys).find((name) => query.startsWith(`DELETE FROM "${name}"`));
    if (optionalTable) {
      if (this.ignoreDeleteFor === optionalTable) return 0;
      const before = state.optionalRows[optionalTable]?.length ?? 0;
      state.optionalRows[optionalTable] = (state.optionalRows[optionalTable] ?? []).filter(
        (row) => !matchesOptionalQuery(optionalTable, row, query, values)
      );
      return before - state.optionalRows[optionalTable].length;
    }

    if (query.startsWith('DELETE FROM "AuthSession"')) {
      const before = state.children.length;
      state.children = state.children.filter((record) => record.table !== "AuthSession" || record.userId !== userId);
      return before - state.children.length;
    }

    if (query.startsWith('DELETE FROM "User"')) {
      const exists = state.users.some((user) => user.id === userId);
      if (!exists) return 0;
      const ownedWorkspaceIds = new Set(state.workspaces.filter((workspace) => workspace.ownerUserId === userId).map((workspace) => workspace.id));
      state.users = state.users.filter((user) => user.id !== userId);
      state.children = state.children.filter((record) => record.userId !== userId);
      state.subscriptions = state.subscriptions.filter((subscription) => subscription.userId !== userId);
      state.workspaces = state.workspaces.filter((workspace) => workspace.ownerUserId !== userId);
      state.requests.forEach((request) => {
        if (request.userId === userId) request.userId = null;
      });
      for (const table of ["TeamMember", "TeamInvite"]) {
        state.optionalRows[table] = (state.optionalRows[table] ?? []).filter((row) => !row.workspaceId || !ownedWorkspaceIds.has(row.workspaceId));
      }
      state.optionalRows.TeamInvite.forEach((invite) => {
        if (invite.invitedByUserId === userId) invite.invitedByUserId = null;
      });
      return 1;
    }

    if (query.startsWith('UPDATE "AccountDeletionRequest"')) {
      const request = state.requests.find((record) => record.id === values[0]);
      if (!request) return 0;
      request.completedAt = values[1] as Date;
      request.status = "resolved";
      request.userId = null;
      return 1;
    }

    throw new Error(`Unexpected fixture execute: ${query}`);
  }
}

function fixtureState(): FakeState {
  return {
    children: [
      { table: "AuthSession", userId: "target-user" },
      { table: "AccountSubscription", userId: "target-user" },
      { table: "UpdateEvent", userId: "target-user" },
      { table: "AuthSession", userId: "other-user" }
    ],
    cleanupJobs: [],
    optionalRows: {
      BetaFeedback: [
        { userId: "target-user" },
        { contactEmail: "TARGET@EXAMPLE.COM" },
        { userId: "other-user" }
      ],
      OfficialContactMessage: [
        { senderEmail: "Target@Example.com" },
        { senderKey: "user:target-user" },
        { senderKey: "email:target@example.com" },
        { userId: "other-user" }
      ],
      PetitionSignature: [{ userId: "target-user" }, { userId: "other-user" }],
      TeamInvite: [
        { email: "TARGET@example.com", workspaceId: "other-workspace" },
        { email: "member@example.com", invitedByUserId: "target-user", workspaceId: "other-workspace" },
        { email: "member@example.com", workspaceId: "target-workspace" },
        { email: "other@example.com", workspaceId: "other-workspace" }
      ],
      TeamMember: [
        { email: "target@example.com", userId: null, workspaceId: "other-workspace" },
        { email: "member@example.com", userId: "member-user", workspaceId: "target-workspace" },
        { email: "other@example.com", userId: "other-user", workspaceId: "other-workspace" }
      ],
      TeamSubscriptionPause: [
        {
          email: "target@example.com",
          previousSubscription: {
            cycle: "annual",
            plan: "pro",
            provider: "stripe",
            providerSubscriptionId: "sub_target_personal",
            status: "canceled"
          },
          userId: "target-user",
          workspaceId: "other-workspace"
        },
        {
          email: "member@example.com",
          previousSubscription: {
            cycle: "monthly",
            plan: "pro",
            provider: "stripe",
            providerSubscriptionId: "sub_member",
            status: "active"
          },
          userId: "member-user",
          workspaceId: "target-workspace"
        },
        { email: "other@example.com", userId: "other-user", workspaceId: "other-workspace" }
      ]
    },
    requests: [],
    subscriptions: [
      {
        provider: "stripe",
        providerCustomerId: "cus_target",
        providerSubscriptionId: "sub_target",
        userId: "target-user"
      }
    ],
    users: [
      { email: "Target@Example.com", id: "target-user" },
      { email: "other@example.com", id: "other-user" },
      { email: "member@example.com", id: "member-user" }
    ],
    workspaces: [
      { id: "target-workspace", ownerUserId: "target-user" },
      { id: "other-workspace", ownerUserId: "other-user" }
    ]
  };
}

async function main() {
const now = new Date("2026-09-10T18:00:00.000Z");

{
  const database = new FakeDeletionDatabase(fixtureState());
  const result = await runAccountDeletionTransaction(database, { email: "stale@example.com", id: "target-user" }, now);
  assert.equal(result.mode, "completed");
  assert.equal(database.transactionCount, 1);
  assert.deepEqual(database.isolationLevels, ["Serializable"]);
  assert.equal(database.state.users.some((user) => user.id === "target-user"), false);
  assert.equal(database.state.users.some((user) => user.id === "other-user"), true);
  assert.equal(database.state.children.some((record) => record.userId === "target-user"), false);
  assert.equal(database.state.children.some((record) => record.userId === "other-user"), true);
  assert.equal(database.state.workspaces.some((workspace) => workspace.ownerUserId === "target-user"), false);
  const retainedInvite = database.state.optionalRows.TeamInvite.find(
    (invite) => invite.email === "member@example.com" && invite.workspaceId === "other-workspace"
  );
  assert.ok(retainedInvite, "an invitation in another owner's workspace should survive inviter account deletion");
  assert.equal(retainedInvite.invitedByUserId, null, "the inviter reference should be deidentified by the User FK");
  Object.values(database.state.optionalRows).forEach((rows) => {
    assert.equal(rows.some((row) => row.userId === "target-user" || matchesEmail(row.email, "target@example.com")), false);
  });
  assert.ok(database.state.requests[0]?.completedAt);
  assert.equal(database.state.requests[0]?.userId, null);
  assert.equal(database.state.requests[0]?.status, "resolved");
  assert.equal(database.state.cleanupJobs.length, 3);
  assert.deepEqual(
    database.state.cleanupJobs.map((job) => job.kind).sort(),
    [
      "cancel_deleted_account_stripe_subscription",
      "cancel_deleted_account_stripe_subscription",
      "restore_team_member_subscription"
    ]
  );
  assert.ok(database.calls.findIndex((call) => call.startsWith('DELETE FROM "User"')) > database.calls.findIndex((call) => call.startsWith('DELETE FROM "OfficialContactMessage"')));
  assert.ok(database.calls.findIndex((call) => call.startsWith('UPDATE "AccountDeletionRequest"')) > database.calls.findIndex((call) => call.startsWith('DELETE FROM "User"')));
}

{
  const database = new FakeDeletionDatabase(fixtureState(), new Set(["AccountDeletionCleanupJob"]));
  const result = await runAccountDeletionTransaction(database, { email: "target@example.com", id: "target-user" }, now);
  assert.equal(result.mode, "completed");
  assert.equal(database.calls.some((call) => call.startsWith('DELETE FROM "OfficialContactMessage"')), false);
}

{
  const database = new FakeDeletionDatabase(fixtureState(), new Set(Object.keys(optionalTableKeys)));
  await assert.rejects(runAccountDeletionTransaction(database, { email: "target@example.com", id: "target-user" }, now));
  assert.equal(database.state.users.some((user) => user.id === "target-user"), true);
  assert.equal(database.state.cleanupJobs.length, 0);
}

{
  const database = new FakeDeletionDatabase(fixtureState());
  database.failOn = 'DELETE FROM "PetitionSignature"';
  await assert.rejects(runAccountDeletionTransaction(database, { email: "target@example.com", id: "target-user" }, now), /forced fixture failure/);
  assert.equal(database.state.users.some((user) => user.id === "target-user"), true);
  assert.equal(database.state.requests.length, 0);
  assert.equal(database.state.cleanupJobs.length, 0);
  assert.equal(database.state.optionalRows.OfficialContactMessage.length, 4);
}

{
  const database = new FakeDeletionDatabase(fixtureState());
  database.ignoreDeleteFor = "OfficialContactMessage";
  await assert.rejects(runAccountDeletionTransaction(database, { email: "target@example.com", id: "target-user" }, now));
  assert.equal(database.state.users.some((user) => user.id === "target-user"), true);
  assert.equal(database.state.requests.length, 0);
}

{
  const state = fixtureState();
  state.requests.push({
    completedAt: null,
    completionBy: new Date("2026-09-17T18:00:00.000Z"),
    id: "existing-request",
    requestedAt: new Date("2026-09-09T18:00:00.000Z"),
    status: "new",
    userId: "target-user"
  });
  const database = new FakeDeletionDatabase(state);
  const result = await runAccountDeletionTransaction(database, { email: "target@example.com", id: "target-user" }, now);
  assert.equal(result.request?.id, "existing-request");
  assert.equal(database.calls.some((call) => call.startsWith('INSERT INTO "AccountDeletionRequest"')), false);
}

{
  const state = fixtureState();
  state.users = state.users.filter((user) => user.id !== "target-user");
  const database = new FakeDeletionDatabase(state);
  const result = await runAccountDeletionTransaction(database, { email: "target@example.com", id: "target-user" }, now);
  assert.equal(result.mode, "already-deleted");
  assert.equal(database.state.requests.length, 0);
  assert.equal(database.calls.some((call) => call.startsWith('DELETE FROM "User"')), false);
}

class MemoryStorage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return this.keys()[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  keys() {
    return [...this.values.keys()];
  }
}

{
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  localStorage.setItem("capitol-ledger:account-created", "true");
  localStorage.setItem("capitol-ledger:sent-letters", "sensitive");
  localStorage.setItem("unrelated-app", "preserve");
  sessionStorage.setItem("capitol-ledger:pending", "sensitive");
  sessionStorage.setItem("unrelated-session", "preserve");

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      dispatchEvent: () => true,
      localStorage,
      sessionStorage
    }
  });

  const originalFetch = globalThis.fetch;
  let resolveSessionFetch: ((response: Response) => void) | undefined;
  globalThis.fetch = (() => new Promise<Response>((resolve) => {
    resolveSessionFetch = resolve;
  })) as typeof globalThis.fetch;
  setBrowserSessionAuthenticated(false);
  const staleSessionHydration = hasActiveBrowserSession();

  clearLocalAccountDataAfterDeletion();
  resolveSessionFetch?.({
    json: async () => ({ authenticated: true }),
    ok: true
  } as Response);
  assert.equal(isBrowserAccountDeletionFenced(), true);
  assert.equal(await staleSessionHydration, false);
  assert.equal(await hasActiveBrowserSession(), false);
  assert.equal(localStorage.getItem(accountDeletionFenceStorageKey), "active");
  assert.deepEqual(new Set(localStorage.keys()), new Set(["unrelated-app", accountDeletionFenceStorageKey]));
  assert.deepEqual(sessionStorage.keys(), ["unrelated-session"]);

  writeLocalAccountProfile({ partyAffiliation: "Independent" });
  writeLocalAccountLedger({
    follows: [{ id: "blocked-follow", type: "bill" }],
    issueInterests: ["Blocked topic"],
    readAlerts: ["blocked-read"],
    savedAlerts: ["blocked-alert"],
    updatedAt: new Date().toISOString()
  });
  assert.equal(localStorage.keys().some((key) => key.startsWith("capitol-ledger:")), false);

  assert.equal(markBrowserAccountDeletionConfirmed(), true);
  assert.equal(hasBrowserAccountDeletionReceipt(), true);
  assert.equal(sessionStorage.getItem(accountDeletionReceiptStorageKey), "confirmed");

  setBrowserSessionAuthenticated(true);
  assert.equal(isBrowserAccountDeletionFenced(), true);
  assert.equal(await hasActiveBrowserSession(), false);

  localStorage.removeItem(accountDeletionFenceStorageKey);
  globalThis.fetch = (async () => ({
    json: async () => ({ authenticated: true }),
    ok: true
  } as Response)) as typeof globalThis.fetch;
  acceptRemoteBrowserAccountDeletionFenceClear();
  assert.equal(isBrowserAccountDeletionFenced(), false);
  assert.equal(hasBrowserAccountDeletionReceipt(), false);
  assert.equal(await hasActiveBrowserSession(), true);
  writeLocalAccountProfile({ partyAffiliation: "Remote fresh account" });
  assert.equal(localStorage.getItem("capitol-ledger:party-affiliation"), "Remote fresh account");

  clearLocalAccountDataAfterDeletion();
  beginFreshBrowserAuthentication();
  assert.equal(completeFreshBrowserAuthentication(true), true);
  assert.equal(isBrowserAccountDeletionFenced(), false);
  assert.equal(localStorage.getItem(accountDeletionFenceStorageKey), null);
  assert.equal(hasBrowserAccountDeletionReceipt(), false);
  assert.equal(sessionStorage.getItem(accountDeletionReceiptStorageKey), null);
  writeLocalAccountProfile({ partyAffiliation: "Independent" });
  assert.equal(localStorage.getItem("capitol-ledger:party-affiliation"), "Independent");
  setBrowserSessionAuthenticated(false);
  globalThis.fetch = originalFetch;
  Reflect.deleteProperty(globalThis, "window");
}

console.log("Account deletion transaction fixtures passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
