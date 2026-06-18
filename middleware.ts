import { NextRequest, NextResponse } from "next/server";

const pendingEmailVerificationCookie = "capitol-ledger-email-verification-pending";

function isVerificationAllowedPath(pathname: string) {
  return (
    pathname === "/sign-in" ||
    pathname === "/team/accept" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  );
}

export function middleware(request: NextRequest) {
  const verificationPending = request.cookies.get(pendingEmailVerificationCookie)?.value === "active";
  const { pathname, search } = request.nextUrl;

  if (!verificationPending || isVerificationAllowedPath(pathname)) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/sign-in";
  redirectUrl.search = "";
  redirectUrl.searchParams.set("mode", "verify");
  redirectUrl.searchParams.set("returnTo", `${pathname}${search}`);

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"]
};
