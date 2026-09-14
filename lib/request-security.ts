import { createHash } from "crypto";
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

declare global {
  // eslint-disable-next-line no-var
  var __capitolLedgerRateLimitStore: Map<string, RateLimitRecord> | undefined;
}

const rateLimitStore = globalThis.__capitolLedgerRateLimitStore ?? new Map<string, RateLimitRecord>();
globalThis.__capitolLedgerRateLimitStore = rateLimitStore;

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

function clientKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown-client";
}

function normalizeKey(value?: string) {
  const normalized = value?.trim().toLowerCase() || "anonymous";
  return createHash("sha256").update(normalized).digest("base64url");
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

export function rejectCrossOriginRequest(request: NextRequest) {
  const origin = requestOrigin(request);

  if (!origin && process.env.NODE_ENV !== "production") return null;
  if (origin && isLocalPreviewOrigin(request, origin)) return null;
  if (origin && allowedOrigins(request).has(origin)) return null;

  return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
}

export function rateLimitRequest(scope: string, request: NextRequest, options: RateLimitOptions) {
  const now = Date.now();
  pruneExpiredRateLimits(now);
  const key = `${scope}:${normalizeKey(clientKey(request))}:${normalizeKey(options.key)}`;
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + options.windowMs
    });
    return null;
  }

  if (existing.count >= options.limit) {
    return NextResponse.json(
      {
        error: "Too many attempts. Please wait and try again.",
        retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000)
      },
      {
        headers: {
          "Retry-After": String(Math.ceil((existing.resetAt - now) / 1000))
        },
        status: 429
      }
    );
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);
  return null;
}

export function clearRateLimitSubjects(...values: Array<string | undefined>) {
  const subjectKeys = new Set(values.filter((value): value is string => Boolean(value)).map(normalizeKey));
  if (!subjectKeys.size) return 0;

  let cleared = 0;
  for (const key of rateLimitStore.keys()) {
    const subjectKey = key.slice(key.lastIndexOf(":") + 1);
    if (!subjectKeys.has(subjectKey)) continue;
    rateLimitStore.delete(key);
    cleared += 1;
  }
  return cleared;
}

export function guardMutationRequest(request: NextRequest, scope: string, options?: RateLimitOptions) {
  const originError = rejectCrossOriginRequest(request);
  if (originError) return originError;

  if (!options) return null;

  return rateLimitRequest(scope, request, options);
}
