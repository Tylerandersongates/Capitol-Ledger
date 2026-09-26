import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { baselineSecurityHeaders, buildContentSecurityPolicy } from "../lib/security-headers.mjs";
import { isPrivateApiPath, middleware, protectPrivateResponse } from "../middleware.ts";

const requiredHeaderValues = new Map([
  ["Cross-Origin-Opener-Policy", "same-origin"],
  ["Cross-Origin-Resource-Policy", "same-origin"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["X-Content-Type-Options", "nosniff"],
  ["X-Frame-Options", "DENY"]
]);

for (const [key, value] of requiredHeaderValues) {
  assert.equal(baselineSecurityHeaders.find((header) => header.key === key)?.value, value, `${key} must remain hardened.`);
}

const permissionsPolicy = baselineSecurityHeaders.find((header) => header.key === "Permissions-Policy")?.value ?? "";
for (const disabledFeature of ["camera=()", "geolocation=()", "microphone=()", "payment=()", "usb=()"]) {
  assert.match(permissionsPolicy, new RegExp(disabledFeature.replace(/[()]/g, "\\$&")), `${disabledFeature} must remain disabled.`);
}

const basePolicy = buildContentSecurityPolicy();
assert.match(basePolicy, /frame-ancestors 'none'/, "CSP must block all framing.");
assert.match(basePolicy, /frame-src 'none'/, "Non-video routes must not permit third-party frames.");
assert.match(basePolicy, /object-src 'none'/, "CSP must block plugin content.");
assert.doesNotMatch(basePolicy, /default-src \*/, "CSP must not use a wildcard default source.");

const videoPolicy = buildContentSecurityPolicy({ allowVideo: true });
assert.match(videoPolicy, /frame-src https:\/\/www\.youtube-nocookie\.com/, "The Daily Brief must permit only its privacy-enhanced YouTube frame.");

for (const pathname of [
  "/api/account/ledger",
  "/api/alerts/summary",
  "/api/auth/session",
  "/api/billing/app-store/notifications",
  "/api/follows",
  "/api/members/S001213/email",
  "/api/privacy/requests",
  "/api/tasks/weekly-brief",
  "/api/team/seats"
]) {
  assert.equal(isPrivateApiPath(pathname), true, `${pathname} must be private and non-cacheable.`);
}

for (const pathname of ["/api/congress/bills", "/api/search", "/api/search/suggest", "/brief"]) {
  assert.equal(isPrivateApiPath(pathname), false, `${pathname} must not be mislabeled as a personalized API.`);
}

const protectedResponse = protectPrivateResponse(NextResponse.next({ headers: { Vary: "Accept-Encoding" } }));
assert.equal(protectedResponse.headers.get("Cache-Control"), "private, no-store, max-age=0");
assert.equal(protectedResponse.headers.get("Pragma"), "no-cache");
assert.equal(protectedResponse.headers.get("Surrogate-Control"), "no-store");
assert.equal(protectedResponse.headers.get("Vary"), "Accept-Encoding, Cookie, Authorization");

const sessionResponse = middleware(new NextRequest("https://example.test/api/auth/session"));
assert.equal(sessionResponse.headers.get("Cache-Control"), "private, no-store, max-age=0");
assert.equal(sessionResponse.headers.get("Vary"), "Cookie, Authorization");

const publicResponse = middleware(new NextRequest("https://example.test/api/search?q=budget"));
assert.equal(publicResponse.headers.get("Cache-Control"), null, "Public search caching must remain an explicit route decision.");

async function checkSourceContracts() {
  const nextConfigSource = await readFile(new URL("../next.config.mjs", import.meta.url), "utf8");
  assert.match(nextConfigSource, /poweredByHeader:\s*false/, "The framework signature must remain disabled.");

  const authSource = await readFile(new URL("../lib/auth.ts", import.meta.url), "utf8");
  const followsSource = await readFile(new URL("../app/api/follows/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(`${authSource}\n${followsSource}`, /demo account session/i, "Production account guidance must not promise a disabled demo session.");
}

checkSourceContracts()
  .then(() => console.log("Response hardening checks passed."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
