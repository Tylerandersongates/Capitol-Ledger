import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function main() {
const projectRoot = process.cwd();
const readSource = (relativePath: string) => readFile(path.join(projectRoot, relativePath), "utf8");

const guardedRoutePaths = [
  "app/api/account/gamification/route.ts",
  "app/api/account/ledger/route.ts",
  "app/api/account/letters/route.ts",
  "app/api/account/petitions/route.ts",
  "app/api/account/profile/route.ts",
  "app/api/account/subscription/app-store/account-token/route.ts",
  "app/api/account/subscription/app-store/route.ts",
  "app/api/account/subscription/portal/route.ts",
  "app/api/account/subscription/route.ts",
  "app/api/account/weekly-brief/route.ts",
  "app/api/billing/stripe/webhook/route.ts",
  "app/api/follows/route.ts",
  "app/api/members/[bioguideId]/email/route.ts",
  "app/api/tasks/weekly-brief/route.ts",
  "app/api/team/invites/accept/route.ts",
  "app/api/team/invites/route.ts",
  "app/api/team/seats/route.ts"
];

const memoryGuardPaths = [
  "lib/account-gamification.ts",
  "lib/account-ledger.ts",
  "lib/account-petition-signatures.ts",
  "lib/account-profile.ts",
  "lib/account-subscription.ts",
  "lib/official-contact-messages.ts",
  "lib/team-subscription-transition.ts",
  "lib/team-workspace.ts",
  "lib/weekly-brief-edition.ts",
  "lib/weekly-brief-history.ts"
];

for (const routePath of guardedRoutePaths) {
  const source = await readSource(routePath);
  assert.match(source, /withAccountPersistenceRoute/, `${routePath} must translate persistence outages to HTTP 503.`);
  assert.doesNotMatch(source, /getAccountPersistenceUserId\([^;]+\.catch\(/, `${routePath} must not hide persistence identity failures.`);
}

const retiredCheckoutSource = await readSource("app/api/account/subscription/checkout/route.ts");
assert.match(retiredCheckoutSource, /APP_STORE_ONLY_CHECKOUT_RETIRED/, "Retired web checkout must keep its stable fail-closed marker.");
assert.match(retiredCheckoutSource, /status:\s*410/, "Retired web checkout must return HTTP 410.");
assert.doesNotMatch(
  retiredCheckoutSource,
  /account-database|account-subscription|billing\/stripe|setAccountSubscription|writeSubscriptionToDatabase/,
  "Retired web checkout must not call persistence or grant an entitlement."
);

for (const modulePath of memoryGuardPaths) {
  const source = await readSource(modulePath);
  assert.match(source, /assertAccountMemoryPersistenceAllowed/, `${modulePath} must guard its process-global personal-data store.`);
}

const accountDatabaseSource = await readSource("lib/account-database.ts");
assert.doesNotMatch(accountDatabaseSource, /withDatabaseFallback|logDatabaseFallback/, "Account database operations must fail closed.");
assert.match(accountDatabaseSource, /throwAccountPersistenceUnavailable/, "Account database errors must become availability errors.");
assert.doesNotMatch(
  accountDatabaseSource,
  /INSERT INTO "User"/,
  "Account persistence helpers must never recreate a User from a stale authenticated request."
);
assert.match(
  accountDatabaseSource,
  /WHERE "id" = \$\{user\.id\}/,
  "Account persistence must resolve the exact authenticated User id without email remapping."
);

const officialContactSource = await readSource("lib/official-contact-messages.ts");
assert.match(
  officialContactSource,
  /if \(!usesDatabase\) officialContactMessageStore\.unshift/,
  "Database-backed official-contact records must not be copied into process memory."
);

const teamWorkspaceSource = await readSource("lib/team-workspace.ts");
assert.doesNotMatch(teamWorkspaceSource, /logTeamWorkspaceFallback|isDatabaseConnectionError/, "Team database failures must not enter memory fallback paths.");
assert.doesNotMatch(
  teamWorkspaceSource,
  /if\s*\(\s*!\(await ensureTeamWorkspaceSchema\(\)\)\s*\)\s*return\s+\w*Memory/,
  "Database Team helpers must not route schema failures into memory."
);
assert.doesNotMatch(
  teamWorkspaceSource,
  /syncStripeSubscriptionForAccount\([^\n]+\.catch\(\(\) =>/,
  "Team subscription reconciliation must preserve account-persistence outages."
);

const teamTransitionSource = await readSource("lib/team-subscription-transition.ts");
assert.doesNotMatch(
  teamTransitionSource,
  /isDatabaseConnectionError|readSubscriptionFromDatabase[^\n]+\.catch|writeSubscriptionToDatabase[^\n]+\.catch/,
  "Team subscription transitions must not mask database persistence failures."
);

const weeklyBriefDeliverySource = await readSource("lib/weekly-brief-delivery-runner.ts");
assert.match(
  weeklyBriefDeliverySource,
  /isAccountPersistenceUnavailableError\(error\)\) throw error/,
  "Scheduled Daily Brief delivery must not downgrade persistence outages into per-user delivery failures."
);

const originalDatabaseUrl = process.env.DATABASE_URL;

try {
  process.env.DATABASE_URL = "postgresql://account-persistence-readiness.invalid/test";

  const profileStore = new Map([
    [
      "user-1",
      {
        displayName: "Stored Person",
        districtCode: "CA-30",
        districtLabel: "California 30",
        districtState: "CA",
        notificationPreferences: { districtAlerts: true, voteReminders: true, weeklyBrief: true },
        partyAffiliation: "Independent",
        timeZone: "America/Los_Angeles",
        updatedAt: new Date().toISOString()
      }
    ]
  ]);
  const officialMessages = [{ id: "contact-1", senderEmail: "person@example.com", userId: "user-1" }];
  const petitionSignatures = [{ id: "petition-1", petitionId: "demo", title: "Demo", userId: "user-1" }];
  const teamWorkspaces = new Map([
    [
      "user-1",
      {
        createdAt: new Date().toISOString(),
        id: "workspace-1",
        invites: [],
        members: [],
        name: "Stored team",
        ownerUserId: "user-1",
        updatedAt: new Date().toISOString()
      }
    ]
  ]);
  const teamSubscriptionPauses = new Map([
    [
      "user-1",
      {
        previousSubscription: {
          cycle: "monthly",
          plan: "free",
          provider: "demo",
          providerEntitlementId: "capitol-ledger-free",
          status: "active",
          updatedAt: new Date().toISOString()
        },
        status: "active",
        teamMemberId: "member-1",
        workspaceId: "workspace-1"
      }
    ]
  ]);
  let teamSubscriptionPauseMemoryReads = 0;
  const readTeamSubscriptionPauseMemory = teamSubscriptionPauses.get.bind(teamSubscriptionPauses);
  teamSubscriptionPauses.get = (key) => {
    teamSubscriptionPauseMemoryReads += 1;
    return readTeamSubscriptionPauseMemory(key);
  };

  Object.assign(globalThis, {
    __capitolLedgerOfficialContactCooldownStore: new Map([["A000001|user:user-1", Date.now()]]),
    __capitolLedgerOfficialContactMessageStore: officialMessages,
    __capitolLedgerOfficialContactSchemaReady: undefined,
    __capitolLedgerPetitionSignatureSchemaReady: undefined,
    __capitolLedgerPetitionSignatureStore: petitionSignatures,
    __capitolLedgerProfileStore: profileStore,
    __capitolLedgerTeamSubscriptionPauseStore: teamSubscriptionPauses,
    __capitolLedgerTeamWorkspaceStore: teamWorkspaces
  });

  const unavailableDatabase = async () => {
    throw new Error("simulated database outage");
  };
  (globalThis as Record<string, unknown>).__capitolLedgerPrisma = {
    $executeRaw: unavailableDatabase,
    $executeRawUnsafe: unavailableDatabase,
    $queryRaw: unavailableDatabase,
    $transaction: unavailableDatabase
  };

  const [safety, accountDatabase, profile, officialContact, petition, teamTransition, teamWorkspace, weeklyBriefDelivery] = await Promise.all([
    import("../lib/account-persistence-safety"),
    import("../lib/account-database"),
    import("../lib/account-profile"),
    import("../lib/official-contact-messages"),
    import("../lib/account-petition-signatures"),
    import("../lib/team-subscription-transition"),
    import("../lib/team-workspace"),
    import("../lib/weekly-brief-delivery-runner")
  ]);

  assert.throws(
    () => profile.getAccountProfile("user-1"),
    safety.AccountPersistenceUnavailableError,
    "Configured database mode must not expose a cached memory profile."
  );
  await assert.rejects(
    accountDatabase.readProfileFromDatabase("user-1"),
    safety.AccountPersistenceUnavailableError,
    "Database failures must use the account-persistence availability error."
  );
  await assert.rejects(
    officialContact.readMostRecentOfficialContact("A000001", "user:user-1", "A000001|user:user-1"),
    safety.AccountPersistenceUnavailableError
  );
  await assert.rejects(
    petition.readPetitionSignaturesForUser("user-1"),
    safety.AccountPersistenceUnavailableError
  );
  await assert.rejects(
    teamWorkspace.readOrCreateTeamWorkspaceForOwner({
      email: "person@example.com",
      seatCount: 5,
      userId: "user-1"
    }),
    safety.AccountPersistenceUnavailableError
  );
  await assert.rejects(
    teamTransition.restorePausedPersonalSubscriptionForReleasedTeamSeat({ userId: "user-1" }),
    safety.AccountPersistenceUnavailableError,
    "A Team subscription pause database outage must not read or mutate its memory fallback."
  );
  await assert.rejects(
    weeklyBriefDelivery.runWeeklyBriefDelivery({ dryRun: true, limit: 1 }),
    safety.AccountPersistenceUnavailableError,
    "Scheduled Daily Brief database outages must propagate to the HTTP availability boundary."
  );

  assert.equal(officialMessages.length, 1, "A database outage must not mutate the official-contact memory store.");
  assert.equal(petitionSignatures.length, 1, "A database outage must not mutate the petition memory store.");
  assert.equal(teamSubscriptionPauseMemoryReads, 0, "A database outage must not read the Team subscription pause memory store.");
  assert.equal(teamSubscriptionPauses.size, 1, "A database outage must not mutate the Team subscription pause memory store.");
  assert.equal(teamWorkspaces.size, 1, "A database outage must not mutate the Team workspace memory store.");

  const guarded = safety.withAccountPersistenceRoute(async () => {
    throw new safety.AccountPersistenceUnavailableError("readiness-test");
  });
  const unavailableResponse = await guarded();
  assert.equal(unavailableResponse.status, 503);
  assert.equal(unavailableResponse.headers.get("cache-control"), "no-store");
  assert.equal(unavailableResponse.headers.get("retry-after"), "30");

  const prismaDouble = (globalThis as Record<string, unknown>).__capitolLedgerPrisma as {
    $executeRawUnsafe: (...args: unknown[]) => Promise<unknown>;
    $queryRaw: (...args: unknown[]) => Promise<unknown[]>;
  };
  prismaDouble.$queryRaw = async () => [];
  await assert.rejects(
    accountDatabase.getAccountPersistenceUserId({
      email: "deleted@example.com",
      id: "deleted-user"
    }),
    safety.AccountPersistenceUnavailableError,
    "A stale authenticated request must not recreate or remap a deleted User."
  );
  assert.equal(
    await accountDatabase.accountPersistenceUserExists("deleted-user"),
    false,
    "Missing-user checks must remain read-only."
  );

  const authDatabase = await import("../lib/auth-database");
  await assert.rejects(
    authDatabase.ensureProductionAuthSchema(),
    /simulated database outage/,
    "An initial auth-schema connection failure must surface to the caller."
  );
  const { NextRequest } = await import("next/server");
  const signInRoute = await import("../app/api/auth/sign-in/route");
  const signInResponse = await signInRoute.POST(new NextRequest("http://localhost/api/auth/sign-in", {
    body: JSON.stringify({ email: "person@example.com", password: "synthetic-password" }),
    headers: { "content-type": "application/json", origin: "http://localhost" },
    method: "POST"
  }));
  const signInBody = await signInResponse.json();
  assert.equal(signInResponse.status, 503, "A database outage must be reported as temporary unavailability.");
  assert.equal(signInResponse.headers.get("cache-control"), "no-store");
  assert.equal(signInResponse.headers.get("retry-after"), "30");
  assert.equal(signInBody.error, safety.accountPersistenceUnavailableMessage);
  assert.doesNotMatch(JSON.stringify(signInBody), /simulated database outage/, "Sign-in must not disclose database errors.");

  let retriedAuthSchemaStatements = 0;
  prismaDouble.$executeRawUnsafe = async () => {
    retriedAuthSchemaStatements += 1;
    return 0;
  };
  assert.equal(
    await authDatabase.ensureProductionAuthSchema(),
    true,
    "Auth-schema initialization must retry after a transient connection failure."
  );
  assert.ok(retriedAuthSchemaStatements > 1, "The retry must execute schema checks against the recovered database.");

  delete process.env.DATABASE_URL;
  assert.equal(profile.getAccountProfile("user-1").displayName, "Stored Person", "Local/demo mode must retain memory persistence behavior.");
  assert.equal(
    await officialContact.readMostRecentOfficialContact("A000001", "user:user-1", "A000001|user:user-1"),
    (globalThis as typeof globalThis & { __capitolLedgerOfficialContactCooldownStore: Map<string, number> })
      .__capitolLedgerOfficialContactCooldownStore.get("A000001|user:user-1"),
    "Local/demo official-contact cooldowns must remain available."
  );
} finally {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
}

console.log("Account persistence safety checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
