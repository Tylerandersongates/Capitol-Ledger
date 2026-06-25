import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth";
import { getMemberDetailWithLiveData } from "@/lib/data";
import { contactSubjectForMember, resolveOfficialContactUrl } from "@/lib/member-contact";
import {
  cooldownKeyFor,
  readMostRecentOfficialContact,
  recordOfficialContact
} from "@/lib/official-contact-messages";
import { guardMutationRequest } from "@/lib/request-security";

const emailRequestSchema = z.object({
  fromEmail: z.string().trim().email().optional(),
  fromName: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10).max(5000),
  subject: z.string().trim().min(5).max(180).optional()
});

const OFFICIAL_MESSAGE_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

function appName() {
  return process.env.NEXT_PUBLIC_APP_NAME || "Capitol Ledger CE";
}

function webhookModeEnabled() {
  return process.env.OFFICIAL_CONTACT_DELIVERY === "webhook";
}

function webhookUrl() {
  return process.env.OFFICIAL_CONTACT_WEBHOOK_URL;
}

function composeContactBody({
  memberLabel,
  message,
  sender
}: {
  memberLabel: string;
  message: string;
  sender: string;
}) {
  return [
    `To: ${memberLabel}`,
    "",
    message,
    "",
    "---",
    `Sent from ${appName()}`,
    `Reply to: ${sender}`
  ].join("\n");
}

export async function POST(
  request: NextRequest,
  context: { params: { bioguideId: string } }
) {
  const rawBody = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const guard = guardMutationRequest(request, "member-contact-email", {
    key: `${context.params.bioguideId}:${typeof rawBody.fromEmail === "string" ? rawBody.fromEmail : "anonymous"}`,
    limit: 10,
    windowMs: 60 * 60 * 1000
  });
  if (guard) return guard;

  const parsed = emailRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email message before sending." }, { status: 400 });
  }

  const detail = await getMemberDetailWithLiveData(context.params.bioguideId);
  if (!detail) {
    return NextResponse.json({ error: "Official profile not found." }, { status: 404 });
  }

  const member = detail.member;
  const session = await getCurrentSession();
  const memberLabel = `${member.fullName} (${member.chamber === "House" ? "House" : "Senate"}, ${member.state}${member.district ? `-${member.district}` : ""})`;
  const senderEmail = parsed.data.fromEmail || session?.user?.email;
  const senderName = parsed.data.fromName || session?.user?.name || "Capitol Ledger CE user";

  if (!senderEmail) {
    return NextResponse.json({ error: "Add your email so the office can reply." }, { status: 400 });
  }

  const senderKey = session?.user?.id ? `user:${session.user.id}` : `email:${senderEmail.toLowerCase()}`;
  const contactCooldownKey = cooldownKeyFor(member.bioguideId, senderKey);
  const mostRecentContactMs = await readMostRecentOfficialContact(member.bioguideId, senderKey, contactCooldownKey);
  if (typeof mostRecentContactMs === "number") {
    const retryAfterMs = OFFICIAL_MESSAGE_COOLDOWN_MS - (Date.now() - mostRecentContactMs);
    if (retryAfterMs > 0) {
      return NextResponse.json(
        {
          error: "You can send one message to this official every 3 days.",
          nextAllowedAt: new Date(Date.now() + retryAfterMs).toISOString(),
          retryAfterSeconds: Math.ceil(retryAfterMs / 1000)
        },
        {
          headers: {
            "Retry-After": String(Math.ceil(retryAfterMs / 1000))
          },
          status: 429
        }
      );
    }
  }

  const subject = parsed.data.subject || contactSubjectForMember(member);
  const contactUrl = resolveOfficialContactUrl(member);

  if (webhookModeEnabled()) {
    const url = webhookUrl();
    if (!url) {
      return NextResponse.json({ error: "OFFICIAL_CONTACT_WEBHOOK_URL is required for webhook delivery mode." }, { status: 503 });
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.OFFICIAL_CONTACT_WEBHOOK_SECRET
          ? { "X-Capitol-Ledger-Secret": process.env.OFFICIAL_CONTACT_WEBHOOK_SECRET }
          : {})
      },
      body: JSON.stringify({
        appName: appName(),
        contactUrl,
        member: {
          bioguideId: member.bioguideId,
          chamber: member.chamber,
          district: member.district,
          fullName: member.fullName,
          officialUrl: member.officialUrl,
          party: member.party,
          state: member.state
        },
        message: parsed.data.message,
        sender: {
          email: senderEmail,
          name: senderName,
          userId: session?.user?.id
        },
        subject
      })
    }).catch(() => null);

    if (!response?.ok) {
      return NextResponse.json({ error: "Email relay is temporarily unavailable. Try again in a minute." }, { status: 502 });
    }

    const letter = await recordOfficialContact({
      contactUrl,
      cooldownKey: contactCooldownKey,
      deliveryMode: "webhook",
      deliveryStatus: "sent",
      memberBioguideId: member.bioguideId,
      memberChamber: member.chamber,
      memberDistrict: member.district,
      memberName: member.fullName,
      memberState: member.state,
      message: parsed.data.message,
      senderEmail,
      senderKey,
      subject,
      userId: session?.user?.id
    });

    return NextResponse.json({
      contactUrl,
      letter,
      message: "Message sent.",
      mode: "webhook",
      status: "sent"
    });
  }

  const mailtoUrl = `mailto:${encodeURIComponent("")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    composeContactBody({
      memberLabel,
      message: parsed.data.message,
      sender: `${senderName} <${senderEmail}>`
    })
  )}`;

  const letter = await recordOfficialContact({
    contactUrl,
    cooldownKey: contactCooldownKey,
    deliveryMode: "manual",
    deliveryStatus: "prepared",
    memberBioguideId: member.bioguideId,
    memberChamber: member.chamber,
    memberDistrict: member.district,
    memberName: member.fullName,
    memberState: member.state,
    message: parsed.data.message,
    senderEmail,
    senderKey,
    subject,
    userId: session?.user?.id
  });

  return NextResponse.json({
    contactUrl,
    letter,
    mailtoUrl,
    message: "Message prepared.",
    mode: "manual",
    status: "prepared"
  });
}
