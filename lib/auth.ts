import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { deleteProductionSession, readProductionSession, type AuthUser } from "@/lib/auth-database";

export const authSessionCookie = "capitol-ledger-auth-session";
export const demoSessionCookie = "capitol-ledger-demo-session";

export type DemoSession = {
  mode?: "demo" | "production";
  user: AuthUser;
};

export const demoUser = {
  id: "demo-citizen",
  email: "demo@capitolledger.local",
  name: "Demo Citizen"
};

function shouldUseSecureCookies() {
  return process.env.AUTH_COOKIE_SECURE === "true" || process.env.VERCEL_ENV === "production";
}

export async function getDemoSession(): Promise<DemoSession | null> {
  const session = cookies().get(demoSessionCookie)?.value;
  if (session !== "active") return null;

  return {
    mode: "demo",
    user: demoUser
  };
}

export async function getProductionSession(): Promise<DemoSession | null> {
  const sessionToken = cookies().get(authSessionCookie)?.value;
  if (!sessionToken) return null;

  const session = await readProductionSession(sessionToken).catch(() => null);
  if (!session) return null;

  return {
    mode: "production",
    user: session.user
  };
}

export async function getCurrentSession(): Promise<DemoSession | null> {
  return (await getProductionSession()) ?? (await getDemoSession());
}

export function setAuthSessionCookie(response: NextResponse, sessionToken: string) {
  response.cookies.set(authSessionCookie, sessionToken, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: shouldUseSecureCookies()
  });
}

export function setDemoSessionCookie(response: NextResponse) {
  response.cookies.set(demoSessionCookie, "active", {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: shouldUseSecureCookies()
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(authSessionCookie, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: shouldUseSecureCookies()
  });
  response.cookies.set(demoSessionCookie, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: shouldUseSecureCookies()
  });
}

export async function clearCurrentAuthSession(response: NextResponse) {
  const sessionToken = cookies().get(authSessionCookie)?.value;
  if (sessionToken) {
    await deleteProductionSession(sessionToken).catch(() => undefined);
  }

  clearAuthCookies(response);
}

export function requireAuthMessage() {
  return {
    error: "Sign in is required to use account-backed storage.",
    nextStep: "Start a Capitol Ledger demo account session, then sync saved records."
  };
}
