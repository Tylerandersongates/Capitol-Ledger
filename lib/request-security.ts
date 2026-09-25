import { createHash, createHmac } from "crypto";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";

type RateLimitOptions = {
  key?: string;
  limit: number;
  windowMs: number;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type UpstashResult = {
  error?: string;
  result?: unknown;
};

type RateLimitBackend =
  | { kind: "memory" }
  | { kind: "unavailable"; reason: string }
  | { kind: "upstash"; token: string; url: string };

declare global {
  // eslint-disable-next-line no-var
  var __capitolLedgerRateLimitStore: Map<string, RateLimitRecord> | undefined;
}

const rateLimitStore = globalThis.__capitolLedgerRateLimitStore ?? new Map<string, RateLimitRecord>();
globalThis.__capitolLedgerRateLimitStore = rateLimitStore;

const RATE_LIMIT_PREFIX = "capitol-wonk:rate-limit:v1";
const DISTRIBUTED_RATE_LIMIT_TIMEOUT_MS = 1_500;

const incrementScript = `
local count = redis.call("INCR", KEYS[1])
local ttl = redis.call("PTTL", KEYS[1])
if count == 1 or ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
if #KEYS > 1 then
  redis.call("SADD", KEYS[2], KEYS[1])
  local index_ttl = redis.call("PTTL", KEYS[2])
  if index_ttl < ttl then redis.call("PEXPIRE", KEYS[2], ttl) end
end
return {count, ttl}
`.trim();

const clearSubjectScript = `
local keys = redis.call("SMEMBERS", KEYS[1])
for _, key in ipairs(keys) do redis.call("DEL", key) end
redis.call("DEL", KEYS[1])
return #keys
`.trim();

function allowedOrigins(request: NextRequest) {
  const origins = new Set([request.nextUrl.origin]);
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL;
  const vercelUrl = process.env.VERCEL_URL;

  if (publicUrl) {
    try {
      origins.add(new URL(publicUrl).origin);
    } catch {
      // Ignore malformed optional environment values.
    }
  }

  if (vercelUrl) origins.add(`https://${vercelUrl}`);

  return origins;
}

function requestOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const referer = request.headers.get("referer");
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function firstValidIp(value: string | null) {
  if (!value) return null;
  for (const candidate of value.split(",")) {
    const normalized = candidate.trim();
    if (isIP(normalized)) return normalized;
  }
  return null;
}

export function trustedClientAddress(request: NextRequest) {
  if (process.env.VERCEL === "1") {
    return firstValidIp(request.headers.get("x-vercel-forwarded-for")) ?? "unknown-vercel-client";
  }

  const trustedHeader = process.env.RATE_LIMIT_TRUSTED_IP_HEADER?.trim().toLowerCase();
  if (trustedHeader === "x-forwarded-for" || trustedHeader === "x-real-ip") {
    return firstValidIp(request.headers.get(trustedHeader)) ?? "unknown-trusted-proxy-client";
  }

  return "unknown-direct-client";
}

function rateLimitHashSecret() {
  const secret = process.env.RATE_LIMIT_HASH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  return secret && secret !== "replace_me" && secret.length >= 24 ? secret : undefined;
}

function normalizeKey(value?: string) {
  const normalized = value?.trim().toLowerCase() || "anonymous";
  const secret = rateLimitHashSecret();
  return secret
    ? createHmac("sha256", secret).update(normalized).digest("base64url")
    : createHash("sha256").update(normalized).digest("base64url");
}

function pruneExpiredRateLimits(now: number) {
  for (const [key, record] of rateLimitStore) {
    if (record.resetAt <= now) rateLimitStore.delete(key);
  }
}

function isLocalPreviewHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isLocalPreviewOrigin(request: NextRequest, origin: string) {
  try {
    const originUrl = new URL(origin);
    return isLocalPreviewHostname(originUrl.hostname) && isLocalPreviewHostname(request.nextUrl.hostname);
  } catch {
    return false;
  }
}

function distributedRateLimitRequired() {
  return process.env.VERCEL_ENV === "production" || process.env.RATE_LIMIT_DISTRIBUTED_REQUIRED === "true";
}

function rateLimitBackend(): RateLimitBackend {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (url && token) {
    if (!rateLimitHashSecret()) {
      return { kind: "unavailable", reason: "A long rate-limit HMAC secret is required." };
    }
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "https:") {
        return { kind: "unavailable", reason: "UPSTASH_REDIS_REST_URL must use HTTPS." };
      }
      return { kind: "upstash", token, url: parsedUrl.toString().replace(/\/$/, "") };
    } catch {
      return { kind: "unavailable", reason: "UPSTASH_REDIS_REST_URL is invalid." };
    }
  }

  if (url || token) {
    return { kind: "unavailable", reason: "Both Upstash REST variables are required." };
  }

  if (distributedRateLimitRequired()) {
    return { kind: "unavailable", reason: "Distributed rate limiting is required but not configured." };
  }

  return { kind: "memory" };
}

function rateLimitUnavailableResponse() {
  return NextResponse.json(
    { error: "Request protection is temporarily unavailable. Please try again shortly." },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Retry-After": "30"
      },
      status: 503
    }
  );
}

function rateLimitedResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error: "Too many attempts. Please wait and try again.",
      retryAfterSeconds
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Retry-After": String(retryAfterSeconds)
      },
      status: 429
    }
  );
}

function localRateLimit(scope: string, clientHash: string, subjectHash: string, options: RateLimitOptions) {
  const now = Date.now();
  pruneExpiredRateLimits(now);
  const key = `${scope}:${clientHash}:${subjectHash}`;
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + options.windowMs
    });
    return null;
  }

  if (existing.count >= options.limit) {
    return rateLimitedResponse(Math.max(1, Math.ceil((existing.resetAt - now) / 1000)));
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);
  return null;
}

async function runUpstashCommand(backend: Extract<RateLimitBackend, { kind: "upstash" }>, command: unknown[]) {
  const response = await fetch(backend.url, {
    body: JSON.stringify(command),
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${backend.token}`,
      "Content-Type": "application/json"
    },
    method: "POST",
    signal: AbortSignal.timeout(DISTRIBUTED_RATE_LIMIT_TIMEOUT_MS)
  });

  if (!response.ok) throw new Error(`Rate limit provider returned ${response.status}.`);
  const body = (await response.json()) as UpstashResult;
  if (body.error) throw new Error("Rate limit provider rejected the command.");
  return body.result;
}

async function distributedRateLimit(
  backend: Extract<RateLimitBackend, { kind: "upstash" }>,
  scope: string,
  clientHash: string,
  subjectHash: string,
  hasSubject: boolean,
  options: RateLimitOptions
) {
  const counterKey = `${RATE_LIMIT_PREFIX}:counter:${scope}:${clientHash}:${subjectHash}`;
  const subjectIndexKey = `${RATE_LIMIT_PREFIX}:subject:${subjectHash}`;
  const keys = hasSubject ? [counterKey, subjectIndexKey] : [counterKey];
  const result = await runUpstashCommand(backend, ["EVAL", incrementScript, keys.length, ...keys, options.windowMs]);

  if (!Array.isArray(result) || result.length < 2) throw new Error("Rate limit provider returned an invalid result.");
  const count = Number(result[0]);
  const ttlMs = Number(result[1]);
  if (!Number.isFinite(count) || !Number.isFinite(ttlMs)) throw new Error("Rate limit provider returned invalid counters.");

  if (count > options.limit) {
    return rateLimitedResponse(Math.max(1, Math.ceil(ttlMs / 1000)));
  }

  return null;
}

export function rejectCrossOriginRequest(request: NextRequest) {
  const origin = requestOrigin(request);

  if (!origin && process.env.NODE_ENV !== "production") return null;
  if (origin && isLocalPreviewOrigin(request, origin)) return null;
  if (origin && allowedOrigins(request).has(origin)) return null;

  return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
}

export async function rateLimitRequest(scope: string, request: NextRequest, options: RateLimitOptions) {
  const backend = rateLimitBackend();
  if (backend.kind === "unavailable") {
    console.error("[rate-limit] protection unavailable", { reason: backend.reason, scope });
    return rateLimitUnavailableResponse();
  }

  const clientHash = normalizeKey(trustedClientAddress(request));
  const subjectHash = normalizeKey(options.key);
  if (backend.kind === "memory") return localRateLimit(scope, clientHash, subjectHash, options);

  try {
    return await distributedRateLimit(backend, scope, clientHash, subjectHash, Boolean(options.key?.trim()), options);
  } catch (error) {
    console.error("[rate-limit] distributed check failed", {
      name: error instanceof Error ? error.name : "unknown",
      scope
    });
    return rateLimitUnavailableResponse();
  }
}

export async function clearRateLimitSubjects(...values: Array<string | undefined>) {
  const subjectKeys = new Set(values.filter((value): value is string => Boolean(value)).map(normalizeKey));
  if (!subjectKeys.size) return 0;

  let cleared = 0;
  for (const key of rateLimitStore.keys()) {
    const subjectKey = key.slice(key.lastIndexOf(":") + 1);
    if (!subjectKeys.has(subjectKey)) continue;
    rateLimitStore.delete(key);
    cleared += 1;
  }

  const backend = rateLimitBackend();
  if (backend.kind !== "upstash") return cleared;

  const providerResults = await Promise.all(
    [...subjectKeys].map((subjectKey) =>
      runUpstashCommand(backend, ["EVAL", clearSubjectScript, 1, `${RATE_LIMIT_PREFIX}:subject:${subjectKey}`])
    )
  );
  for (const result of providerResults) {
    const providerCleared = Number(result);
    if (Number.isFinite(providerCleared)) cleared += providerCleared;
  }

  return cleared;
}

export async function guardMutationRequest(request: NextRequest, scope: string, options?: RateLimitOptions) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;

  if (!options) return null;

  return rateLimitRequest(scope, request, options);
}
