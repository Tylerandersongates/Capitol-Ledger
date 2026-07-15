import type { AuthUser } from "@/lib/auth-database";
import { publicBrandName } from "@/lib/brand";
import { sendEmailWithResend } from "@/lib/resend-email";

type AuthEmailKind = "password_reset" | "verify_email";

type AuthEmailPayload = {
  actionUrl: string;
  appName: string;
  from?: string;
  kind: AuthEmailKind;
  subject: string;
  text: string;
  to: string;
  user: {
    email: string;
    name?: string;
  };
};

type AuthEmailUser = Pick<AuthUser, "email" | "name">;

type AuthEmailDelivery =
  | { delivered: false; mode: "manual_demo" | "silent"; actionUrl?: string }
  | { delivered: true; mode: "resend" | "webhook" };

type AuthEmailOriginRequest = {
  headers: {
    get(name: string): string | null;
  };
  nextUrl: {
    origin: string;
    protocol: string;
  };
};

function isLocalPreviewBaseUrl(value?: string) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  } catch {
    return false;
  }
}

function appBaseUrl(requestBaseUrl?: string) {
  const localRequestBaseUrl = isLocalPreviewBaseUrl(requestBaseUrl) ? requestBaseUrl : undefined;
  return (localRequestBaseUrl || process.env.NEXT_PUBLIC_APP_URL || requestBaseUrl || "http://localhost:3000").replace(/\/$/, "");
}

function appName() {
  return publicBrandName;
}

function sender() {
  return process.env.AUTH_EMAIL_FROM;
}

function shouldExposeManualLinks() {
  return process.env.AUTH_EMAIL_DELIVERY === "manual_demo" || process.env.NODE_ENV !== "production";
}

export function authEmailRequestBaseUrl(request: AuthEmailOriginRequest) {
  const host = request.headers.get("host")?.trim();
  if (!host) return request.nextUrl.origin;

  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || request.nextUrl.protocol.replace(/:$/, "") || "http";
  return `${protocol}://${host}`;
}

export function buildAuthActionUrl(kind: AuthEmailKind, token: string, returnTo?: string, requestBaseUrl?: string) {
  const parameter = kind === "password_reset" ? "resetToken" : "verifyToken";
  const url = new URL("/sign-in", appBaseUrl(requestBaseUrl));
  url.searchParams.set(parameter, token);
  if (returnTo) url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

function buildEmailPayload({
  kind,
  requestBaseUrl,
  returnTo,
  token,
  user
}: {
  kind: AuthEmailKind;
  requestBaseUrl?: string;
  returnTo?: string;
  token: string;
  user: AuthEmailUser;
}): AuthEmailPayload {
  const actionUrl = buildAuthActionUrl(kind, token, returnTo, requestBaseUrl);
  const name = user.name || user.email;
  const product = appName();

  if (kind === "password_reset") {
    return {
      actionUrl,
      appName: product,
      from: sender(),
      kind,
      subject: `${product} password reset`,
      text: `Hi ${name},\n\nUse this secure link to reset your ${product} password:\n${actionUrl}\n\nThis link expires soon. If you did not request this, you can ignore this email.`,
      to: user.email,
      user: {
        email: user.email,
        name: user.name
      }
    };
  }

  return {
    actionUrl,
    appName: product,
    from: sender(),
    kind,
    subject: `Verify your ${product} account`,
    text: `Hi ${name},\n\nUse this secure link to verify your ${product} account:\n${actionUrl}\n\nThis link expires soon.`,
    to: user.email,
    user: {
      email: user.email,
      name: user.name
    }
  };
}

export async function deliverAuthEmail({
  kind,
  requestBaseUrl,
  returnTo,
  token,
  user
}: {
  kind: AuthEmailKind;
  requestBaseUrl?: string;
  returnTo?: string;
  token?: string | null;
  user: AuthEmailUser;
}): Promise<AuthEmailDelivery> {
  if (!token) return { delivered: false, mode: "silent" };

  const payload = buildEmailPayload({ kind, requestBaseUrl, returnTo, token, user });
  const deliveryMode = process.env.AUTH_EMAIL_DELIVERY;

  if (deliveryMode === "resend") {
    if (!payload.from) throw new Error("AUTH_EMAIL_FROM is required when AUTH_EMAIL_DELIVERY=resend.");

    await sendEmailWithResend({
      from: payload.from,
      subject: payload.subject,
      text: payload.text,
      to: payload.to
    });

    return { delivered: true, mode: "resend" };
  }

  if (deliveryMode === "webhook") {
    const webhookUrl = process.env.AUTH_EMAIL_WEBHOOK_URL;
    if (!webhookUrl) throw new Error("AUTH_EMAIL_WEBHOOK_URL is required when AUTH_EMAIL_DELIVERY=webhook.");

    const response = await fetch(webhookUrl, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        ...(process.env.AUTH_EMAIL_WEBHOOK_SECRET ? { "X-Capitol-Ledger-Secret": process.env.AUTH_EMAIL_WEBHOOK_SECRET } : {})
      },
      method: "POST"
    });

    if (!response.ok) {
      throw new Error(`Auth email webhook failed with status ${response.status}.`);
    }

    return { delivered: true, mode: "webhook" };
  }

  return {
    actionUrl: shouldExposeManualLinks() ? payload.actionUrl : undefined,
    delivered: false,
    mode: "manual_demo"
  };
}
