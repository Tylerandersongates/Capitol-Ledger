import { sendEmailWithResend } from "@/lib/resend-email";

type TeamInviteEmailPayload = {
  actionUrl: string;
  appName: string;
  from?: string;
  invitedBy: {
    email: string;
    name?: string;
  };
  role: string;
  subject: string;
  text: string;
  to: string;
  workspaceName: string;
};

type TeamInviteDelivery =
  | { delivered: false; mode: "disabled" | "manual_demo"; actionUrl?: string }
  | { delivered: true; mode: "resend" | "webhook"; actionUrl?: string };

function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function appName() {
  return process.env.NEXT_PUBLIC_APP_NAME || "Capitol Ledger";
}

function deliveryMode() {
  return process.env.TEAM_INVITE_EMAIL_DELIVERY || process.env.AUTH_EMAIL_DELIVERY || "disabled";
}

function sender() {
  return process.env.TEAM_INVITE_EMAIL_FROM || process.env.AUTH_EMAIL_FROM;
}

function shouldExposeManualLinks() {
  return deliveryMode() === "manual_demo" || process.env.NODE_ENV !== "production";
}

function shouldExposeQaInviteLink(email: string) {
  return email.trim().toLowerCase().endsWith(".test");
}

export function buildTeamInviteUrl(token: string) {
  const url = new URL("/team/accept", appBaseUrl());
  url.searchParams.set("token", token);
  return url.toString();
}

function roleLabel(role: string) {
  if (role === "admin") return "Admin";
  return role === "viewer" ? "Viewer" : "Analyst";
}

function buildTeamInvitePayload({
  invitedBy,
  role,
  token,
  to,
  workspaceName
}: {
  invitedBy: { email: string; name?: string };
  role: string;
  token: string;
  to: string;
  workspaceName: string;
}): TeamInviteEmailPayload {
  const product = appName();
  const actionUrl = buildTeamInviteUrl(token);
  const ownerName = invitedBy.name || invitedBy.email;
  const displayRole = roleLabel(role);

  return {
    actionUrl,
    appName: product,
    from: sender(),
    invitedBy,
    role: displayRole,
    subject: `${ownerName} invited you to ${workspaceName}`,
    text: `Hi,\n\n${ownerName} invited you to join ${workspaceName} in ${product} as a ${displayRole}.\n\nAccept the Team invite:\n${actionUrl}\n\nThis link expires soon. Sign in or create an account with ${to} to claim the seat.`,
    to,
    workspaceName
  };
}

export async function deliverTeamInviteEmail({
  invitedBy,
  role,
  token,
  to,
  workspaceName
}: {
  invitedBy: { email: string; name?: string };
  role: string;
  token: string;
  to: string;
  workspaceName: string;
}): Promise<TeamInviteDelivery> {
  const payload = buildTeamInvitePayload({
    invitedBy,
    role,
    token,
    to,
    workspaceName
  });
  const mode = deliveryMode();

  if (mode === "resend") {
    if (!payload.from) throw new Error("TEAM_INVITE_EMAIL_FROM or AUTH_EMAIL_FROM is required when invite delivery uses Resend.");

    await sendEmailWithResend({
      from: payload.from,
      subject: payload.subject,
      text: payload.text,
      to: payload.to
    });

    return {
      actionUrl: shouldExposeQaInviteLink(payload.to) ? payload.actionUrl : undefined,
      delivered: true,
      mode: "resend"
    };
  }

  if (mode === "webhook") {
    const webhookUrl = process.env.TEAM_INVITE_EMAIL_WEBHOOK_URL || process.env.AUTH_EMAIL_WEBHOOK_URL;
    const webhookSecret = process.env.TEAM_INVITE_EMAIL_WEBHOOK_SECRET || process.env.AUTH_EMAIL_WEBHOOK_SECRET;
    if (!webhookUrl) throw new Error("TEAM_INVITE_EMAIL_WEBHOOK_URL or AUTH_EMAIL_WEBHOOK_URL is required when invite delivery uses a webhook.");

    const response = await fetch(webhookUrl, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        ...(webhookSecret ? { "X-Capitol-Ledger-Secret": webhookSecret } : {})
      },
      method: "POST"
    });

    if (!response.ok) {
      throw new Error(`Team invite webhook failed with status ${response.status}.`);
    }

    return {
      actionUrl: shouldExposeQaInviteLink(payload.to) ? payload.actionUrl : undefined,
      delivered: true,
      mode: "webhook"
    };
  }

  if (mode === "manual_demo") {
    return {
      actionUrl: shouldExposeManualLinks() ? payload.actionUrl : undefined,
      delivered: false,
      mode: "manual_demo"
    };
  }

  return {
    actionUrl: shouldExposeManualLinks() ? payload.actionUrl : undefined,
    delivered: false,
    mode: "disabled"
  };
}
