import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";

export function safeReturnPath(value?: string, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export async function requireAccountSession(returnTo = "/account") {
  const session = await getCurrentSession();
  if (session) return session;

  redirect(`/sign-in?returnTo=${encodeURIComponent(safeReturnPath(returnTo, "/account"))}`);
}
