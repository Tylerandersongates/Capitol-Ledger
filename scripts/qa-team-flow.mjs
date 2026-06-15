const baseUrl = (process.env.TEAM_QA_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://project-qosv1.vercel.app").replace(/\/$/, "");
const shouldCreateAccounts = process.env.TEAM_QA_CREATE_ACCOUNTS === "true";
const shouldCheckCheckout = process.env.TEAM_QA_CHECKOUT === "true";
const requireActiveTeam = process.env.TEAM_QA_REQUIRE_ACTIVE_TEAM === "true";
const requireInviteAcceptance = process.env.TEAM_QA_ACCEPT_INVITE === "true";
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
        role: process.env.TEAM_QA_INVITE_ROLE === "viewer" ? "viewer" : "analyst"
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
