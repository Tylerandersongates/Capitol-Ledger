import { existsSync, readFileSync } from "fs";

loadLocalEnv();

const baseUrl = (process.env.AUTH_QA_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3020").replace(/\/$/, "");
const shouldCreateAccount = process.env.AUTH_QA_CREATE_ACCOUNT === "true";
const shouldTestRateLimit = process.env.AUTH_QA_RATE_LIMIT === "true";

const results = [];
const cookieJar = new Map();

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;

  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function origin() {
  return new URL(baseUrl).origin;
}

function record(name, ok, detail = "") {
  results.push({ detail, name, ok });
  const marker = ok ? "PASS" : "FAIL";
  console.log(`${marker} ${name}${detail ? ` - ${detail}` : ""}`);
}

function cookieHeader() {
  return Array.from(cookieJar.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

function rememberCookies(response) {
  const header = response.headers.get("set-cookie");
  if (!header) return;

  header.split(/,\s*(?=[^;]+?=)/).forEach((cookie) => {
    const [pair] = cookie.split(";");
    const [key, value] = pair.split("=");
    if (!key) return;
    if (!value) {
      cookieJar.delete(key.trim());
      return;
    }
    cookieJar.set(key.trim(), value.trim());
  });
}

async function request(path, options = {}) {
  const headers = {
    ...(options.sameOrigin !== false ? { Origin: origin() } : {}),
    ...(cookieJar.size ? { Cookie: cookieHeader() } : {}),
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers ?? {})
  };
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers
  });
  rememberCookies(response);

  const data = await response.json().catch(() => ({}));
  return { data, response };
}

async function assertStatus(name, path, options, allowedStatuses) {
  const { data, response } = await request(path, options);
  const ok = allowedStatuses.includes(response.status);
  record(name, ok, `status ${response.status}${data.error ? `, ${data.error}` : ""}`);
  return { data, ok, response };
}

async function runSafeChecks() {
  await assertStatus("Session endpoint responds", "/api/auth/session", { method: "GET", sameOrigin: false }, [200]);

  await assertStatus(
    "Protected account endpoint requires auth",
    "/api/account/profile",
    { method: "POST", body: { displayName: "Blocked" } },
    [401, 503]
  );

  await assertStatus(
    "Cross-origin sign-in is rejected",
    "/api/auth/sign-in",
    {
      body: { email: "qa@example.com", password: "wrong-password" },
      headers: { Origin: "https://example.invalid" },
      method: "POST",
      sameOrigin: false
    },
    [403]
  );

  await assertStatus(
    "Sign-in path is production-shaped",
    "/api/auth/sign-in",
    { body: { email: "qa@example.com", password: "wrong-password" }, method: "POST" },
    [401, 503]
  );

  await assertStatus(
    "Password reset request is production-shaped",
    "/api/auth/password-reset",
    { body: { email: "qa@example.com" }, method: "POST" },
    [200, 503]
  );

  await assertStatus(
    "Password reset token confirmation is production-shaped",
    "/api/auth/password-reset/confirm",
    { body: { password: "CapitolLedgerQA123!", token: "invalid-token" }, method: "POST" },
    [400, 503]
  );
}

async function runAccountCreationCheck() {
  const email = process.env.AUTH_QA_EMAIL || `qa-${Date.now()}@capitolledger.test`;
  const password = process.env.AUTH_QA_PASSWORD || "CapitolLedgerQA123!";

  const registration = await assertStatus(
    "Create a production test account",
    "/api/auth/register",
    {
      body: {
        email,
        name: "Production Auth QA",
        password
      },
      method: "POST"
    },
    [200]
  );

  if (!registration.ok) return;

  const verificationLink = registration.data.verificationLink;
  if (verificationLink) {
    const verifyUrl = new URL(verificationLink);
    const token = verifyUrl.searchParams.get("verifyToken");
    await assertStatus("Verify production test account", "/api/auth/verify-email", { body: { token }, method: "POST" }, [200]);
  } else {
    record("Verify production test account", true, "skipped because email delivery does not expose manual links");
  }

  await assertStatus("Sign out production test account", "/api/auth/sign-out", { method: "DELETE" }, [200]);
  await assertStatus("Sign in production test account", "/api/auth/sign-in", { body: { email, password }, method: "POST" }, [200]);
}

async function runRateLimitCheck() {
  let limited = false;
  for (let index = 0; index < 10; index += 1) {
    const { response } = await request("/api/auth/sign-in", {
      body: { email: "rate-limit@example.com", password: "wrong-password" },
      method: "POST"
    });
    if (response.status === 429) {
      limited = true;
      break;
    }
  }
  record("Sign-in rate limit trips after repeated attempts", limited, limited ? "received 429" : "no 429 received");
}

async function main() {
  console.log(`Running Capitol Ledger production-auth QA against ${baseUrl}`);
  await runSafeChecks();

  if (shouldCreateAccount) {
    await runAccountCreationCheck();
  } else {
    record("Create/sign-in live test account", true, "skipped; set AUTH_QA_CREATE_ACCOUNT=true to run");
  }

  if (shouldTestRateLimit) {
    await runRateLimitCheck();
  } else {
    record("Rate-limit stress test", true, "skipped; set AUTH_QA_RATE_LIMIT=true to run");
  }

  const failures = results.filter((result) => !result.ok);
  if (failures.length) {
    console.error(`Production-auth QA failed ${failures.length} check(s).`);
    process.exit(1);
  }

  console.log("Production-auth QA checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
