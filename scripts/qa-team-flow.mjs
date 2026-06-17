const baseUrl = (process.env.TEAM_QA_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://project-qosv1.vercel.app").replace(/\/$/, "");
const shouldCreateAccounts = process.env.TEAM_QA_CREATE_ACCOUNTS === "true";
const shouldCheckCheckout = process.env.TEAM_QA_CHECKOUT === "true";
const requireActiveTeam = process.env.TEAM_QA_REQUIRE_ACTIVE_TEAM === "true";
const requireInviteAcceptance = process.env.TEAM_QA_ACCEPT_INVITE === "true";
const shouldRunSeatReplacementScenario = process.env.TEAM_QA_SEAT_REPLACEMENT_SCENARIO === "true";
const shouldPrintLinks = process.env.TEAM_QA_PRINT_LINKS === "true";
const timestamp = Date.now();

const results = [];

class CookieJar {
  cookies = new Map();

  header() {
    return Array.from(this.cookies.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
  }

  remember(response) {
    const header = response.headers.get("set-cookie");
    if (!header) return;

    header.split(/,\s*(?=[^;]+?=)/).forEach((cookie) => {
      const [pair] = cookie.split(";");
      const [key, value] = pair.split("=");
      if (!key) return;
      if (!value) {
        this.cookies.delete(key.trim());
        return;
      }
      this.cookies.set(key.trim(), value.trim());
    });
  }
}

function origin() {
  return new URL(baseUrl).origin;
}

function record(kind, name, detail = "") {
  results.push({ kind, name });
  const marker = kind === "fail" ? "FAIL" : kind === "warn" ? "WARN" : "PASS";
  console.log(`${marker} ${name}${detail ? ` - ${detail}` : ""}`);
}

function pass(name, detail = "") {
  record("pass", name, detail);
}

function fail(name, detail = "") {
  record("fail", name, detail);
}

function warn(name, detail = "") {
  record("warn", name, detail);
}

function skip(name, detail = "") {
  pass(name, `skipped${detail ? `; ${detail}` : ""}`);
}

function info(name, detail = "") {
  console.log(`INFO ${name}${detail ? ` - ${detail}` : ""}`);
}

function formatStatus(response, data) {
  return `status ${response.status}${data?.error ? `, ${data.error}` : ""}`;
}

async function request(path, options = {}) {
  const jar = options.jar;
  const headers = {
    ...(options.sameOrigin !== false ? { Origin: origin() } : {}),
    ...(jar?.cookies.size ? { Cookie: jar.header() } : {}),
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers ?? {})
  };
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers
  });
  jar?.remember(response);

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json().catch(() => ({})) : null;
  const text = data ? "" : await response.text().catch(() => "");

  return { data, response, text };
}

async function assertStatus(name, path, options, allowedStatuses) {
  const result = await request(path, options);
  const ok = allowedStatuses.includes(result.response.status);
  record(ok ? "pass" : "fail", name, formatStatus(result.response, result.data));
  return { ...result, ok };
}

function configuredEmail(kind) {
  const key = kind === "owner" ? "TEAM_QA_OWNER_EMAIL" : "TEAM_QA_INVITEE_EMAIL";
  return process.env[key] || (shouldCreateAccounts ? `qa-team-${kind}-${timestamp}@capitolledger.test` : "");
}

function configuredPassword(kind) {
  const key = kind === "owner" ? "TEAM_QA_OWNER_PASSWORD" : "TEAM_QA_INVITEE_PASSWORD";
  return process.env[key] || (shouldCreateAccounts ? "CapitolLedgerTeamQA123!" : "");
}

function configuredName(kind) {
  const label = kind === "owner" ? "Owner" : "Invitee";
  return {
    firstName: process.env[`TEAM_QA_${kind.toUpperCase()}_FIRST_NAME`] || `Team${label}`,
    lastName: process.env[`TEAM_QA_${kind.toUpperCase()}_LAST_NAME`] || "QA"
  };
}

function configuredInviteRole() {
  const role = process.env.TEAM_QA_INVITE_ROLE;
  if (role === "admin" || role === "viewer") return role;
  return "analyst";
}

async function createAccount(kind, jar, email, password) {
  const name = configuredName(kind);
  return assertStatus(
    `Create ${kind} QA account`,
    "/api/auth/register",
    {
      body: {
        email,
        firstName: name.firstName,
        lastName: name.lastName,
        name: `${name.firstName} ${name.lastName}`,
        password
      },
      jar,
      method: "POST"
    },
    [200]
  );
}

async function signIn(kind, jar, email, password) {
  return assertStatus(
    `Sign in ${kind} QA account`,
    "/api/auth/sign-in",
    {
      body: { email, password },
      jar,
      method: "POST"
    },
    [200]
  );
}

async function ensureAccount(kind) {
  const email = configuredEmail(kind);
  const password = configuredPassword(kind);
  const jar = new CookieJar();

  if (!email || !password) {
    skip(`Prepare ${kind} QA account`, `set TEAM_QA_${kind.toUpperCase()}_EMAIL and TEAM_QA_${kind.toUpperCase()}_PASSWORD, or TEAM_QA_CREATE_ACCOUNTS=true`);
    return null;
  }

  if (shouldCreateAccounts) info(`${kind} QA email`, email);

  if (shouldCreateAccounts) {
    const created = await createAccount(kind, jar, email, password);
    if (created.ok) return { email, jar, password };
  }

  const signedIn = await signIn(kind, jar, email, password);
  if (!signedIn.ok) return null;

  return { email, jar, password };
}

async function runSafeChecks() {
  const acceptPage = await request("/team/accept?teamQa=missing", { method: "GET", sameOrigin: false });
  const acceptOk = acceptPage.response.status === 200 && acceptPage.text.includes("Team invite token is missing");
  record(acceptOk ? "pass" : "fail", "Team accept route renders missing-token state", `status ${acceptPage.response.status}`);

  const teamPage = await request("/team", {
    method: "GET",
    redirect: "manual",
    sameOrigin: false
  });
  const location = teamPage.response.headers.get("location") ?? "";
  const teamRedirectOk = [302, 303, 307, 308].includes(teamPage.response.status) && location.startsWith("/sign-in");
  record(teamRedirectOk ? "pass" : "fail", "Unauthenticated /team redirects to sign-in", `status ${teamPage.response.status}${location ? `, ${location}` : ""}`);

  await assertStatus("Unauthenticated invite workspace API requires auth", "/api/team/invites", { method: "GET", sameOrigin: false }, [401]);

  await assertStatus(
    "Unauthenticated invite creation requires auth",
    "/api/team/invites",
    {
      body: { email: "blocked@example.com", role: "analyst" },
      method: "POST"
    },
    [401]
  );

  await assertStatus(
    "Cross-origin invite creation is rejected",
    "/api/team/invites",
    {
      body: { email: "blocked@example.com", role: "analyst" },
      headers: { Origin: "https://example.invalid" },
      method: "POST",
      sameOrigin: false
    },
    [403]
  );

  await assertStatus(
    "Unauthenticated seat release requires auth",
    "/api/team/seats",
    {
      body: { seatId: "blocked", seatType: "member" },
      method: "DELETE"
    },
    [401]
  );

  await assertStatus(
    "Cross-origin seat release is rejected",
    "/api/team/seats",
    {
      body: { seatId: "blocked", seatType: "member" },
      headers: { Origin: "https://example.invalid" },
      method: "DELETE",
      sameOrigin: false
    },
    [403]
  );
}

async function runCheckoutCheck(owner) {
  if (!shouldCheckCheckout) {
    skip("Team checkout session", "set TEAM_QA_CHECKOUT=true to create a Stripe Checkout session");
    return null;
  }

  const seatCount = Number.parseInt(process.env.TEAM_QA_SEAT_COUNT || "3", 10);
  const result = await assertStatus(
    "Team checkout session can be created",
    "/api/account/subscription/checkout",
    {
      body: {
        cycle: process.env.TEAM_QA_CYCLE === "annual" ? "annual" : "monthly",
        plan: "team",
        seatCount: Number.isFinite(seatCount) ? seatCount : 3
      },
      jar: owner.jar,
      method: "POST"
    },
    [200]
  );

  if (!result.ok) return null;

  if (result.data?.checkoutMode === "stripe" && result.data.checkoutUrl) {
    pass("Team checkout uses Stripe", "checkout URL returned");
    if (shouldPrintLinks) info("Team checkout URL", result.data.checkoutUrl);
    return result.data.checkoutUrl;
  }

  if (result.data?.checkoutMode === "demo") {
    warn("Team checkout uses demo fallback", "Stripe checkout did not run for this environment");
    return null;
  }

  fail("Team checkout response is usable", "missing checkoutMode or checkoutUrl");
  return null;
}

async function runInviteCheck(owner, invitee) {
  const workspace = await assertStatus("Team workspace invite API reflects owner access", "/api/team/invites", { jar: owner.jar, method: "GET" }, [200, 403]);

  if (workspace.response.status === 403) {
    const detail = "owner account does not have active Team subscription yet";
    if (requireActiveTeam) fail("Active Team workspace is available", detail);
    else skip("Team invite creation", detail);
    return null;
  }

  if (!invitee) {
    skip("Team invite creation", "invitee account is not configured");
    return null;
  }

  const invite = await assertStatus(
    "Create Team invite",
    "/api/team/invites",
    {
      body: {
        email: invitee.email,
        role: configuredInviteRole()
      },
      jar: owner.jar,
      method: "POST"
    },
    [200]
  );

  if (!invite.ok) return null;

  const delivery = invite.data?.inviteDelivery;
  if (delivery?.sent) {
    pass("Team invite delivery is configured", delivery.mode ?? "sent");
  } else if (delivery?.inviteLink) {
    pass("Team invite manual link is available", delivery.mode ?? "manual");
    if (shouldPrintLinks) info("Team invite link", delivery.inviteLink);
  } else {
    const detail = delivery?.error || "no manual link returned";
    if (requireInviteAcceptance) fail("Team invite link is available for acceptance QA", detail);
    else warn("Team invite link is not exposed", detail);
  }

  return delivery?.inviteLink ?? null;
}

async function runInviteAcceptance(invitee, inviteLink) {
  if (!requireInviteAcceptance) {
    skip("Team invite acceptance", "set TEAM_QA_ACCEPT_INVITE=true with manual invite link delivery to accept the invite");
    return;
  }

  if (!invitee || !inviteLink) {
    fail("Team invite acceptance can run", "invitee account or invite link is missing");
    return;
  }

  const token = new URL(inviteLink).searchParams.get("token");
  if (!token) {
    fail("Team invite token is present", "invite link has no token parameter");
    return;
  }

  await assertStatus(
    "Accept Team invite",
    "/api/team/invites/accept",
    {
      body: { token },
      jar: invitee.jar,
      method: "POST"
    },
    [200]
  );

  const memberTeamPage = await request("/team", {
    jar: invitee.jar,
    method: "GET",
    redirect: "manual",
    sameOrigin: false
  });
  const ok = memberTeamPage.response.status === 200 && memberTeamPage.text.includes("Team seat active");
  record(ok ? "pass" : "fail", "Accepted member can open /team", `status ${memberTeamPage.response.status}`);
}

function scenarioAccountEmail(index) {
  return `qa-team-seat-${timestamp}-${index}@capitolledger.test`;
}

async function createScenarioAccount(index) {
  const email = scenarioAccountEmail(index);
  const password = process.env.TEAM_QA_SCENARIO_PASSWORD || "CapitolLedgerTeamQA123!";
  const jar = new CookieJar();
  const created = await assertStatus(
    `Create seat scenario account ${index}`,
    "/api/auth/register",
    {
      body: {
        email,
        firstName: `Seat${index}`,
        lastName: "QA",
        name: `Seat${index} QA`,
        password
      },
      jar,
      method: "POST"
    },
    [200, 409]
  );

  if (created.response.status === 409) {
    const signedIn = await signIn(`seat scenario ${index}`, jar, email, password);
    if (!signedIn.ok) return null;
  }

  return { email, jar, password };
}

function inviteTokenFromResponse(data) {
  const inviteLink = data?.inviteDelivery?.inviteLink;
  if (!inviteLink) return null;

  try {
    return new URL(inviteLink).searchParams.get("token");
  } catch {
    return null;
  }
}

async function createAndAcceptScenarioSeat(owner, account, index) {
  const invite = await assertStatus(
    `Create 6-seat scenario invite ${index}`,
    "/api/team/invites",
    {
      body: {
        email: account.email,
        role: index % 2 === 0 ? "viewer" : "analyst"
      },
      jar: owner.jar,
      method: "POST"
    },
    [200]
  );
  if (!invite.ok) return null;

  const token = inviteTokenFromResponse(invite.data);
  if (!token) {
    fail(`6-seat scenario invite ${index} exposes acceptance token`, "manual invite link missing");
    return null;
  }

  const accepted = await assertStatus(
    `Accept 6-seat scenario invite ${index}`,
    "/api/team/invites/accept",
    {
      body: { token },
      jar: account.jar,
      method: "POST"
    },
    [200]
  );

  return accepted.ok ? accepted.data?.workspace ?? null : null;
}

async function readOwnerWorkspace(owner, name) {
  const result = await assertStatus(name, "/api/team/invites", { jar: owner.jar, method: "GET" }, [200, 403]);
  return result.ok && result.response.status === 200 ? result.data?.workspace ?? null : null;
}

async function runSeatReplacementScenario(owner) {
  if (!shouldRunSeatReplacementScenario) {
    skip("6-seat Team replacement scenario", "set TEAM_QA_SEAT_REPLACEMENT_SCENARIO=true to create extra QA accounts and release seats");
    return;
  }

  const initialWorkspace = await readOwnerWorkspace(owner, "6-seat scenario owner workspace is available");
  if (!initialWorkspace) return;

  if (initialWorkspace.seatCount !== 6) {
    fail("6-seat scenario has exactly 6 paid participant seats", `${initialWorkspace.seatCount} seats found`);
    return;
  }

  if (initialWorkspace.occupiedSeats > 6) {
    fail("6-seat scenario starts within paid capacity", `${initialWorkspace.occupiedSeats}/6 occupied`);
    return;
  }

  const scenarioAccounts = [];
  const seatsToCreate = Math.max(0, 6 - initialWorkspace.occupiedSeats);
  for (let index = 1; index <= seatsToCreate; index += 1) {
    const account = await createScenarioAccount(index);
    if (!account) return;
    scenarioAccounts.push(account);
    await createAndAcceptScenarioSeat(owner, account, index);
  }

  const fullWorkspace = await readOwnerWorkspace(owner, "6-seat scenario reaches full capacity");
  if (!fullWorkspace) return;
  const fullOk = fullWorkspace.seatCount === 6 && fullWorkspace.occupiedSeats === 6 && fullWorkspace.openSeats === 0;
  record(fullOk ? "pass" : "fail", "6-seat scenario has 6 occupied and 0 open", `${fullWorkspace.occupiedSeats}/6 occupied, ${fullWorkspace.openSeats} open`);
  if (!fullOk) return;

  const generatedEmails = new Set(scenarioAccounts.map((account) => account.email));
  const removableMembers = (fullWorkspace.members ?? []).filter((member) => member.role !== "owner" && generatedEmails.has(member.email));
  if (removableMembers.length < 2) {
    fail("6-seat scenario has two generated members to remove", `${removableMembers.length} generated removable members found`);
    return;
  }

  const removedAccounts = [];
  for (const member of removableMembers.slice(0, 2)) {
    const removed = await assertStatus(
      `Remove fired employee seat ${member.email}`,
      "/api/team/seats",
      {
        body: { seatId: member.id, seatType: "member" },
        jar: owner.jar,
        method: "DELETE"
      },
      [200]
    );
    const account = scenarioAccounts.find((candidate) => candidate.email === member.email);
    if (account) removedAccounts.push(account);
    if (removed.ok && removed.data?.release?.accountConvertedToFree) {
      pass(`Removed employee account converted to Free ${member.email}`);
    }
  }

  const afterRemoval = await readOwnerWorkspace(owner, "6-seat scenario workspace after removals");
  if (!afterRemoval) return;
  const removalOk = afterRemoval.occupiedSeats === 4 && afterRemoval.openSeats === 2;
  record(removalOk ? "pass" : "fail", "Removing two employees opens two seats", `${afterRemoval.occupiedSeats}/6 occupied, ${afterRemoval.openSeats} open`);

  for (const account of removedAccounts) {
    const subscription = await assertStatus(
      `Removed employee subscription is Free ${account.email}`,
      "/api/account/subscription",
      { jar: account.jar, method: "GET" },
      [200]
    );
    const freeOk = subscription.data?.subscription?.plan === "free" && subscription.data?.subscription?.provider === "demo";
    record(freeOk ? "pass" : "fail", `Removed employee is on Free ${account.email}`, subscription.data?.subscription?.plan ?? "missing subscription");

    const memberTeamPage = await request("/team", {
      jar: account.jar,
      method: "GET",
      redirect: "manual",
      sameOrigin: false
    });
    const relocked = memberTeamPage.response.status === 200 && memberTeamPage.text.includes("Upgrade to open your workspace") && !memberTeamPage.text.includes("Team seat active");
    record(relocked ? "pass" : "fail", `Removed employee loses Team access ${account.email}`, `status ${memberTeamPage.response.status}`);
  }

  const replacement = await createScenarioAccount("replacement");
  if (!replacement) return;
  await createAndAcceptScenarioSeat(owner, replacement, "replacement");

  const afterReplacement = await readOwnerWorkspace(owner, "6-seat scenario workspace after replacement");
  if (!afterReplacement) return;
  const replacementOk = afterReplacement.occupiedSeats === 5 && afterReplacement.openSeats === 1;
  record(replacementOk ? "pass" : "fail", "Adding one replacement leaves one open seat", `${afterReplacement.occupiedSeats}/6 occupied, ${afterReplacement.openSeats} open`);
}

async function main() {
  console.log(`Running Capitol Ledger Team QA against ${baseUrl}`);
  await runSafeChecks();

  const owner = await ensureAccount("owner");
  if (!owner) {
    skip("Authenticated Team QA", "owner account is not available");
  } else {
    await runCheckoutCheck(owner);
    const invitee = await ensureAccount("invitee");
    const inviteLink = await runInviteCheck(owner, invitee);
    await runInviteAcceptance(invitee, inviteLink);
    await runSeatReplacementScenario(owner);
  }

  const failures = results.filter((result) => result.kind === "fail");
  if (failures.length) {
    console.error(`Team QA failed ${failures.length} check(s).`);
    process.exit(1);
  }

  console.log("Team QA checks completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
