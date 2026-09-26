import { NextRequest, NextResponse } from "next/server";

const pendingEmailVerificationCookie = "capitol-ledger-email-verification-pending";

const privateApiPrefixes = [
  "/api/account",
  "/api/alerts/summary",
  "/api/auth",
  "/api/billing",
  "/api/follows",
  "/api/privacy/requests",
  "/api/tasks",
  "/api/team"
];

export function isPrivateApiPath(pathname: string) {
  return (
    privateApiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    /^\/api\/members\/[^/]+\/email\/?$/.test(pathname)
  );
}

export function protectPrivateResponse(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Surrogate-Control", "no-store");

  const varyValues = new Set(
    (response.headers.get("Vary") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
  varyValues.add("Cookie");
  varyValues.add("Authorization");
  response.headers.set("Vary", Array.from(varyValues).join(", "));

  return response;
}

function finalizeResponse(pathname: string, response: NextResponse) {
  return isPrivateApiPath(pathname) ? protectPrivateResponse(response) : response;
}

function isVerificationAllowedPath(pathname: string) {
  return (
    pathname === "/sign-in" ||
    pathname === "/settings" ||
    pathname === "/account-deleted" ||
    pathname === "/privacy/request" ||
    pathname === "/brief" ||
    pathname === "/team/accept" ||
    pathname === "/api/account/deletion-request" ||
    pathname === "/api/privacy/requests" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  );
}

export function middleware(request: NextRequest) {
  const verificationPending = request.cookies.get(pendingEmailVerificationCookie)?.value === "active";
  const { pathname, search } = request.nextUrl;

  if (!verificationPending || isVerificationAllowedPath(pathname)) {
    return finalizeResponse(pathname, NextResponse.next());
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/sign-in";
  redirectUrl.search = "";
  redirectUrl.searchParams.set("mode", "verify");
  redirectUrl.searchParams.set("returnTo", `${pathname}${search}`);

  return finalizeResponse(pathname, NextResponse.redirect(redirectUrl));
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"]
};
