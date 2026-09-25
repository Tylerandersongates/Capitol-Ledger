import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { logAccountPersistenceFailure } from "../lib/account-persistence-safety";
import { deliverAuthEmail } from "../lib/auth-email";

const environmentKeys = [
  "AUTH_EMAIL_DELIVERY",
  "AUTH_EMAIL_FROM",
  "AUTH_EMAIL_WEBHOOK_SECRET",
  "AUTH_EMAIL_WEBHOOK_URL",
  "NEXT_PUBLIC_APP_URL",
  "NODE_ENV",
  "RESEND_API_KEY"
] as const;
const originalEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
const originalConsoleInfo = console.info;
const mutableEnvironment = process.env as Record<string, string | undefined>;

function restoreEnvironment() {
  for (const [key, value] of originalEnvironment) {
    if (value === undefined) delete mutableEnvironment[key];
    else mutableEnvironment[key] = value;
  }
}

async function main() {
  const passwordResetRoute = await readFile(new URL("../app/api/auth/password-reset/route.ts", import.meta.url), "utf8");
  const resendRoute = await readFile(new URL("../app/api/auth/verification-email/route.ts", import.meta.url), "utf8");
  const authDatabase = await readFile(new URL("../lib/auth-database.ts", import.meta.url), "utf8");
  const resendEmail = await readFile(new URL("../lib/resend-email.ts", import.meta.url), "utf8");
  const authClient = await readFile(new URL("../components/auth-flow-client.tsx", import.meta.url), "utf8");
  const registerRoute = await readFile(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8");

  assert.doesNotMatch(passwordResetRoute, /deliveryMode\s*:/, "Password-reset responses must not disclose whether an account exists.");
  assert.doesNotMatch(authDatabase, /deliveryMode/, "The password-reset data contract must not carry an account-existence mode.");
  assert.match(passwordResetRoute, /If an account exists, password reset instructions are on the way\./);
  assert.match(passwordResetRoute, /private, no-store, max-age=0/);
  assert.match(passwordResetRoute, /after\(async \(\) =>/, "Provider latency must stay outside the password-reset response path.");
  assert.match(resendRoute, /includeUnverified: true/, "Verification resend must require the existing unverified account session.");
  assert.match(resendRoute, /limit: 3[\s\S]*60 \* 60 \* 1000/, "Verification resend needs a bounded hourly limit.");
  assert.match(authClient, /Resend verification email/, "The verification screen must expose the authenticated recovery path.");
  assert.match(resendEmail, /AbortSignal\.timeout\(RESEND_TIMEOUT_MS\)/, "Resend delivery needs a bounded provider timeout.");
  assert.match(resendEmail, /redirect: "error"/, "Resend delivery must not forward auth-email payloads across redirects.");
  assert.match(registerRoute, /logAccountPersistenceFailure\("auth-register", error\)/);

  const atomicClaims = authDatabase.match(/RETURNING "userId"/g) ?? [];
  assert.equal(atomicClaims.length, 2, "Verification and reset tokens must each be claimed atomically.");
  const issuanceLocks = authDatabase.match(/pg_advisory_xact_lock\(hashtextextended/g) ?? [];
  assert.equal(issuanceLocks.length, 2, "Concurrent verification and reset issuance must serialize per account.");
  assert.match(
    authDatabase,
    /UPDATE "PasswordResetToken"[\s\S]*WHERE "userId" = \$\{user\.id\}[\s\S]*AND "usedAt" IS NULL[\s\S]*INSERT INTO "PasswordResetToken"/,
    "Issuing a reset token must invalidate the account's older unused reset tokens."
  );
  assert.match(
    authDatabase,
    /UPDATE "EmailVerificationToken"[\s\S]*WHERE "userId" = \$\{userId\}[\s\S]*AND "usedAt" IS NULL[\s\S]*INSERT INTO "EmailVerificationToken"/,
    "Issuing a verification token must invalidate the account's older unused verification tokens."
  );

  mutableEnvironment.NODE_ENV = "production";
  process.env.AUTH_EMAIL_DELIVERY = "webhook";
  process.env.AUTH_EMAIL_FROM = "CapitolWonk <accounts@capitolwonk.test>";
  process.env.AUTH_EMAIL_WEBHOOK_URL = "https://provider.example/auth-email";
  process.env.AUTH_EMAIL_WEBHOOK_SECRET = "fixture-webhook-secret-at-least-24-characters";
  process.env.NEXT_PUBLIC_APP_URL = "https://preview.capitolwonk.test";

  const calls: Array<{ init?: RequestInit; input: RequestInfo | URL }> = [];
  const logs: unknown[][] = [];
  console.info = (...args: unknown[]) => logs.push(args);
  console.error = (...args: unknown[]) => logs.push(args);
  const persistenceError = Object.assign(new Error("private-person@example.com"), { code: "P2021" });
  logAccountPersistenceFailure("auth-register", persistenceError);
  assert.match(JSON.stringify(logs), /auth-register/);
  assert.match(JSON.stringify(logs), /P2021/);
  assert.doesNotMatch(JSON.stringify(logs), /private-person|example\.com/i);
  logs.length = 0;
  const initializationError = Object.assign(new Error("database details must stay private"), {
    errorCode: "P1000",
    name: "PrismaClientInitializationError"
  });
  logAccountPersistenceFailure("auth-register", initializationError);
  assert.match(JSON.stringify(logs), /PrismaClientInitializationError/);
  assert.match(JSON.stringify(logs), /P1000/);
  assert.doesNotMatch(JSON.stringify(logs), /database details/i);
  logs.length = 0;
  const unclassifiedInitializationError = Object.assign(
    new Error("Authentication failed against database server at private-host.example.com"),
    { name: "PrismaClientInitializationError" }
  );
  logAccountPersistenceFailure("auth-register", unclassifiedInitializationError);
  assert.match(JSON.stringify(logs), /authentication_failed/);
  assert.doesNotMatch(JSON.stringify(logs), /private-host|example\.com/i);
  logs.length = 0;
  const invalidUrlError = Object.assign(new Error("The provided database string is invalid: private details"), {
    name: "PrismaClientInitializationError"
  });
  logAccountPersistenceFailure("auth-register", invalidUrlError);
  assert.match(JSON.stringify(logs), /invalid_database_url/);
  assert.doesNotMatch(JSON.stringify(logs), /private details/i);
  logs.length = 0;
  const connectionTimeoutError = Object.assign(new Error("Operations timed out after private details"), {
    name: "PrismaClientInitializationError"
  });
  logAccountPersistenceFailure("auth-register", connectionTimeoutError);
  assert.match(JSON.stringify(logs), /connection_timeout/);
  assert.doesNotMatch(JSON.stringify(logs), /private details/i);
  logs.length = 0;
  const signalOnlyError = Object.assign(
    new Error("Unknown datasource failure for private-person@example.com at private-host.example.com"),
    { name: "PrismaClientInitializationError" }
  );
  logAccountPersistenceFailure("auth-register", signalOnlyError);
  assert.match(JSON.stringify(logs), /database/);
  assert.match(JSON.stringify(logs), /unsupported/);
  assert.doesNotMatch(JSON.stringify(logs), /private-person|private-host|example\.com|datasource failure/i);
  logs.length = 0;
  const unsafeNameError = Object.assign(new Error("provider failure"), { name: "private-person@example.com" });
  logAccountPersistenceFailure("auth-register", unsafeNameError);
  assert.match(JSON.stringify(logs), /UnknownError/);
  assert.doesNotMatch(JSON.stringify(logs), /private-person|example\.com|provider failure/i);
  logs.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ init, input });
    return new Response(JSON.stringify({ accepted: true }), { status: 200 });
  }) as typeof fetch;

  const sensitiveToken = "sensitive-token-never-log";
  const sensitiveEmail = "private-person@example.com";
  const delivered = await deliverAuthEmail({
    kind: "password_reset",
    requestBaseUrl: "https://attacker.example",
    token: sensitiveToken,
    user: { email: sensitiveEmail, name: "Private Person" }
  });
  assert.deepEqual(delivered, { delivered: true, mode: "webhook" });
  assert.equal(calls.length, 1);
  assert.equal(String(calls[0]?.input), process.env.AUTH_EMAIL_WEBHOOK_URL);
  assert.equal(calls[0]?.init?.cache, "no-store");
  assert.equal(calls[0]?.init?.redirect, "error");
  assert.ok(calls[0]?.init?.signal, "Webhook delivery needs a timeout signal.");
  assert.equal((calls[0]?.init?.headers as Record<string, string>)["X-Capitol-Ledger-Secret"], process.env.AUTH_EMAIL_WEBHOOK_SECRET);

  const payload = JSON.parse(String(calls[0]?.init?.body)) as { actionUrl: string; text: string; to: string };
  assert.equal(payload.to, sensitiveEmail, "Only the provider payload may contain the intended recipient.");
  assert.equal(
    payload.actionUrl,
    `https://preview.capitolwonk.test/sign-in?resetToken=${sensitiveToken}`,
    "Production action links must use the configured app URL instead of the request Host."
  );
  assert.match(payload.text, /expires in 60 minutes and can be used once/i);

  const serializedLogs = JSON.stringify(logs);
  assert.doesNotMatch(serializedLogs, /private-person|example\.com|sensitive-token|attacker/i, "Operational delivery logs must omit PII, tokens, and request hosts.");
  assert.match(serializedLogs, /password_reset/);
  assert.match(serializedLogs, /webhook/);
  assert.match(serializedLogs, /delivered/);

  calls.length = 0;
  logs.length = 0;
  process.env.AUTH_EMAIL_DELIVERY = "resend";
  process.env.RESEND_API_KEY = "fixture-resend-key-at-least-24-characters";
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ init, input });
    return new Response(JSON.stringify({ id: "fixture-message" }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  }) as typeof fetch;
  assert.deepEqual(
    await deliverAuthEmail({
      kind: "verify_email",
      requestBaseUrl: "https://attacker.example",
      token: sensitiveToken,
      user: { email: sensitiveEmail, name: "Private Person" }
    }),
    { delivered: true, mode: "resend" }
  );
  assert.equal(String(calls[0]?.input), "https://api.resend.com/emails");
  assert.equal(calls[0]?.init?.cache, "no-store");
  assert.equal(calls[0]?.init?.redirect, "error");
  assert.ok(calls[0]?.init?.signal);
  const resendPayload = JSON.parse(String(calls[0]?.init?.body)) as { text: string; to: string[] };
  assert.deepEqual(resendPayload.to, [sensitiveEmail]);
  assert.match(resendPayload.text, /preview\.capitolwonk\.test\/sign-in\?verifyToken=/);
  assert.match(resendPayload.text, /expires in 24 hours and can be used once/i);
  assert.doesNotMatch(JSON.stringify(logs), /private-person|example\.com|sensitive-token|attacker/i);

  logs.length = 0;
  process.env.AUTH_EMAIL_DELIVERY = "webhook";
  globalThis.fetch = (async () => new Response("provider failure", { status: 502 })) as typeof fetch;
  await assert.rejects(
    () =>
      deliverAuthEmail({
        kind: "verify_email",
        token: sensitiveToken,
        user: { email: sensitiveEmail, name: "Private Person" }
      }),
    /status 502/
  );
  const serializedFailureLogs = JSON.stringify(logs);
  assert.doesNotMatch(serializedFailureLogs, /private-person|example\.com|sensitive-token/i);
  assert.match(serializedFailureLogs, /failed/);
  assert.match(serializedFailureLogs, /http_5xx/);

  delete process.env.NEXT_PUBLIC_APP_URL;
  logs.length = 0;
  await assert.rejects(
    () =>
      deliverAuthEmail({
        kind: "verify_email",
        requestBaseUrl: "https://attacker.example",
        token: sensitiveToken,
        user: { email: sensitiveEmail }
      }),
    /NEXT_PUBLIC_APP_URL is required/
  );
  assert.doesNotMatch(JSON.stringify(logs), /private-person|example\.com|sensitive-token|attacker/i);

  process.env.AUTH_EMAIL_DELIVERY = "manual_demo";
  await assert.rejects(
    () =>
      deliverAuthEmail({
        kind: "verify_email",
        requestBaseUrl: "https://preview.capitolwonk.test",
        token: sensitiveToken,
        user: { email: sensitiveEmail }
      }),
    /delivery is not configured/
  );
}

main()
  .then(() => console.log("Auth email trust checks passed."))
  .catch((error) => {
    originalConsoleError(error);
    process.exitCode = 1;
  })
  .finally(() => {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
    console.info = originalConsoleInfo;
    restoreEnvironment();
  });
