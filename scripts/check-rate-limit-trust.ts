import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { NextRequest } from "next/server";
import {
  clearRateLimitSubjects,
  rateLimitRequest,
  trustedClientAddress
} from "../lib/request-security";

const environmentKeys = [
  "AUTH_SECRET",
  "RATE_LIMIT_DISTRIBUTED_REQUIRED",
  "RATE_LIMIT_HASH_SECRET",
  "RATE_LIMIT_TRUSTED_IP_HEADER",
  "UPSTASH_REDIS_REST_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_KV_REST_API_TOKEN",
  "UPSTASH_REDIS_KV_REST_API_URL",
  "VERCEL",
  "VERCEL_ENV"
] as const;
const originalEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;

function restoreEnvironment() {
  for (const [key, value] of originalEnvironment) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function request(headers: Record<string, string> = {}) {
  return new NextRequest("https://capitolwonk.test/api/auth/sign-in", {
    headers: {
      origin: "https://capitolwonk.test",
      ...headers
    },
    method: "POST"
  });
}

async function withoutExpectedErrorLog<T>(action: () => Promise<T>) {
  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    return await action();
  } finally {
    console.error = originalConsoleError;
  }
}

async function main() {
  const routeDirectory = new URL("../app/api/", import.meta.url);
  const routeFiles = (await readdir(routeDirectory, { recursive: true })).filter((file) => file.endsWith("route.ts"));
  for (const routeFile of routeFiles) {
    const source = await readFile(new URL(routeFile, routeDirectory), "utf8");
    for (const line of source.split("\n").filter((candidate) => candidate.includes("guardMutationRequest("))) {
      assert.match(line, /await guardMutationRequest\(/, `${routeFile} must await its asynchronous mutation guard.`);
    }
  }

  process.env.AUTH_SECRET = "fixture-auth-secret-with-at-least-24-characters";
  delete process.env.RATE_LIMIT_HASH_SECRET;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_KV_REST_API_TOKEN;
  delete process.env.UPSTASH_REDIS_KV_REST_API_URL;
  delete process.env.VERCEL_ENV;

  process.env.VERCEL = "1";
  assert.equal(
    trustedClientAddress(
      request({
        "x-forwarded-for": "203.0.113.99",
        "x-real-ip": "203.0.113.98",
        "x-vercel-forwarded-for": "198.51.100.24"
      })
    ),
    "198.51.100.24",
    "Vercel deployments must prefer the platform-controlled client address."
  );

  delete process.env.VERCEL;
  assert.equal(
    trustedClientAddress(request({ "x-forwarded-for": "203.0.113.99", "x-real-ip": "203.0.113.98" })),
    "unknown-direct-client",
    "Self-hosted requests must not trust forwarding headers by default."
  );
  process.env.RATE_LIMIT_TRUSTED_IP_HEADER = "x-real-ip";
  assert.equal(
    trustedClientAddress(request({ "x-real-ip": "198.51.100.25" })),
    "198.51.100.25",
    "A self-hosted trusted proxy may opt into one supported address header."
  );
  delete process.env.RATE_LIMIT_TRUSTED_IP_HEADER;

  const localScope = `rate-limit-local-${Date.now()}`;
  const localOptions = { key: "Person@Example.com", limit: 1, windowMs: 60_000 };
  assert.equal(await rateLimitRequest(localScope, request(), localOptions), null);
  assert.equal((await rateLimitRequest(localScope, request(), localOptions))?.status, 429);
  assert.equal(await clearRateLimitSubjects("person@example.com"), 1, "Subject cleanup must clear local counters.");
  assert.equal(await rateLimitRequest(localScope, request(), localOptions), null, "A cleared local subject may try again.");

  process.env.RATE_LIMIT_DISTRIBUTED_REQUIRED = "true";
  assert.equal(
    (
      await withoutExpectedErrorLog(() =>
        rateLimitRequest("missing-provider", request(), { limit: 1, windowMs: 60_000 })
      )
    )?.status,
    503,
    "A required but missing distributed limiter must fail closed."
  );
  delete process.env.RATE_LIMIT_DISTRIBUTED_REQUIRED;

  process.env.UPSTASH_REDIS_KV_REST_API_URL = "https://fixture-rate-limit.upstash.io";
  process.env.UPSTASH_REDIS_KV_REST_API_TOKEN = "fixture-token-never-log";
  process.env.VERCEL = "1";

  delete process.env.AUTH_SECRET;
  assert.equal(
    (
      await withoutExpectedErrorLog(() =>
        rateLimitRequest("missing-hmac-secret", request(), { limit: 1, windowMs: 60_000 })
      )
    )?.status,
    503,
    "Distributed identifiers must not be stored without a long HMAC secret."
  );
  process.env.AUTH_SECRET = "fixture-auth-secret-with-at-least-24-characters";

  const commands: unknown[][] = [];
  let distributedCount = 0;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const command = JSON.parse(String(init?.body)) as unknown[];
    commands.push(command);
    const script = String(command[1]);
    const result = script.includes("SMEMBERS") ? 2 : [++distributedCount, 60_000];
    return new Response(JSON.stringify({ result }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  }) as typeof fetch;

  const distributedRequest = request({
    "x-forwarded-for": "203.0.113.101",
    "x-vercel-forwarded-for": "198.51.100.26"
  });
  const distributedOptions = { key: "Subject@Example.com", limit: 1, windowMs: 60_000 };
  assert.equal(await rateLimitRequest("distributed-fixture", distributedRequest, distributedOptions), null);
  assert.equal((await rateLimitRequest("distributed-fixture", distributedRequest, distributedOptions))?.status, 429);

  const incrementCommand = commands[0];
  assert.equal(incrementCommand[0], "EVAL");
  assert.equal(incrementCommand[2], 2, "Subject-scoped counters must also maintain a cleanup index.");
  const serializedCommand = JSON.stringify(incrementCommand);
  assert.doesNotMatch(serializedCommand, /198\.51\.100\.26|203\.0\.113\.101|Subject@Example\.com/i);
  assert.match(serializedCommand, /capitol-wonk:rate-limit:v1:counter:distributed-fixture:/);

  assert.equal(await clearRateLimitSubjects("subject@example.com"), 2);
  assert.equal(
    commands.some((command) => String(command[1]).includes("SMEMBERS")),
    true,
    "Distributed subject cleanup must remove every indexed counter."
  );

  globalThis.fetch = (async () => {
    throw new Error("fixture provider outage");
  }) as typeof fetch;
  assert.equal(
    (
      await withoutExpectedErrorLog(() =>
        rateLimitRequest("provider-outage", distributedRequest, { limit: 1, windowMs: 60_000 })
      )
    )?.status,
    503,
    "A distributed limiter outage must fail closed."
  );
}

main()
  .then(() => console.log("Rate-limit trust checks passed."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    globalThis.fetch = originalFetch;
    restoreEnvironment();
  });
