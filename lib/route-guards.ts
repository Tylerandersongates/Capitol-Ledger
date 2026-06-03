import { redirect } from "next/navigation";
import { getCurrentSession, type DemoSession } from "@/lib/auth";

export function safeReturnPath(value?: string, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export async function requireAccountSession(returnTo = "/account") {
  const session = await getCurrentSession();
  if (session) return session;

  if (returnTo === "/feedback/review" && process.env.NODE_ENV !== "production") {
    const localFeedbackReviewSession: DemoSession = {
      mode: "demo",
      user: {
        email: "local-feedback-review@capitol-ledger.local",
        id: "local-feedback-review",
        name: "Local Feedback Review"
      }
    };

    return localFeedbackReviewSession;
  }

  redirect(`/sign-in?returnTo=${encodeURIComponent(safeReturnPath(returnTo, "/account"))}`);
}
