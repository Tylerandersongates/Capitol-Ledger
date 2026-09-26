import {
  emailVerificationTokenHours,
  passwordResetTokenMinutes,
  type AuthUser
} from "@/lib/auth-database";
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

type AuthEmailProviderMode = "resend" | "webhook";

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

const authEmailProviderTimeoutMs = 10_000;

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
  const deliveryMode = process.env.AUTH_EMAIL_DELIVERY;
  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (process.env.NODE_ENV === "production" && (deliveryMode === "resend" || deliveryMode === "webhook")) {
    if (!configuredBaseUrl) throw new Error("NEXT_PUBLIC_APP_URL is required for production auth email delivery.");

    const configuredUrl = new URL(configuredBaseUrl);
    if (configuredUrl.protocol !== "https:" || configuredUrl.username || configuredUrl.password) {
      throw new Error("NEXT_PUBLIC_APP_URL must be a credential-free HTTPS URL for production auth email delivery.");
    }
    return configuredUrl.toString().replace(/\/$/, "");
  }

  const localRequestBaseUrl = isLocalPreviewBaseUrl(requestBaseUrl) ? requestBaseUrl : undefined;
  return (localRequestBaseUrl || configuredBaseUrl || requestBaseUrl || "http://localhost:3000").replace(/\/$/, "");
}

function appName() {
  return publicBrandName;
}

function sender() {
  const value = process.env.AUTH_EMAIL_FROM?.trim();
  if (value && /[\r\n]/.test(value)) throw new Error("AUTH_EMAIL_FROM must be a single-line sender identity.");
  return value || undefined;
}

function shouldExposeManualLinks() {
  return process.env.NODE_ENV !== "production";
}

function providerErrorCode(error: unknown) {
  if (!(error instanceof Error)) return "unknown";
  if (error.name === "AbortError" || error.name === "TimeoutError") return "timeout";
  const status = error.message.match(/status (\d{3})/i)?.[1];
  if (status) return `http_${status[0]}xx`;
  if (error instanceof TypeError) return "network";
  return error.name || "error";
}

function logDelivery(kind: AuthEmailKind, mode: AuthEmailProviderMode, outcome: "delivered" | "failed", error?: unknown) {
  const detail = {
    kind,
    mode,
    outcome,
    ...(error ? { errorCode: providerErrorCode(error) } : {})
  };

  if (outcome === "failed") {
    console.error("[auth-email] delivery failed", detail);
  } else {
    console.info("[auth-email] delivery completed", detail);
  }
}

function webhookEndpoint() {
  const value = process.env.AUTH_EMAIL_WEBHOOK_URL?.trim();
  if (!value) throw new Error("AUTH_EMAIL_WEBHOOK_URL is required when AUTH_EMAIL_DELIVERY=webhook.");

  const url = new URL(value);
  if (url.username || url.password) throw new Error("AUTH_EMAIL_WEBHOOK_URL must not contain credentials.");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("AUTH_EMAIL_WEBHOOK_URL must use HTTPS in production.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("AUTH_EMAIL_WEBHOOK_URL must use HTTP or HTTPS.");
  }

  return url.toString();
}

function webhookSecret() {
  const secret = process.env.AUTH_EMAIL_WEBHOOK_SECRET?.trim();
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 24 || secret === "replace_me")) {
    throw new Error("AUTH_EMAIL_WEBHOOK_SECRET must be a long secret in production.");
  }
  return secret;
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
      text: `Hi ${name},\n\nUse this secure link to reset your ${product} password:\n${actionUrl}\n\nThis link expires in ${passwordResetTokenMinutes} minutes and can be used once. If you did not request this, you can ignore this email.`,
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
    text: `Hi ${name},\n\nUse this secure link to verify your ${product} account:\n${actionUrl}\n\nThis link expires in ${emailVerificationTokenHours} hours and can be used once.`,
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

  const deliveryMode = process.env.AUTH_EMAIL_DELIVERY;
  let payload: AuthEmailPayload;
  try {
    payload = buildEmailPayload({ kind, requestBaseUrl, returnTo, token, user });
  } catch (error) {
    if (deliveryMode === "resend" || deliveryMode === "webhook") {
      logDelivery(kind, deliveryMode, "failed", error);
    }
    throw error;
  }

  if (deliveryMode === "resend") {
    try {
      if (!payload.from) throw new Error("AUTH_EMAIL_FROM is required when AUTH_EMAIL_DELIVERY=resend.");

      await sendEmailWithResend({
        from: payload.from,
        subject: payload.subject,
        text: payload.text,
        to: payload.to
      });
      logDelivery(kind, deliveryMode, "delivered");
      return { delivered: true, mode: "resend" };
    } catch (error) {
      logDelivery(kind, deliveryMode, "failed", error);
      throw error;
    }
  }

  if (deliveryMode === "webhook") {
    try {
      const secret = webhookSecret();
      const response = await fetch(webhookEndpoint(), {
        body: JSON.stringify(payload),
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { "X-Capitol-Ledger-Secret": secret } : {})
        },
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(authEmailProviderTimeoutMs)
      });

      if (!response.ok) {
        throw new Error(`Auth email webhook failed with status ${response.status}.`);
      }
      logDelivery(kind, deliveryMode, "delivered");
      return { delivered: true, mode: "webhook" };
    } catch (error) {
      logDelivery(kind, deliveryMode, "failed", error);
      throw error;
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Auth email delivery is not configured.");
  }

  return {
    actionUrl: shouldExposeManualLinks() ? payload.actionUrl : undefined,
    delivered: false,
    mode: "manual_demo"
  };
}
