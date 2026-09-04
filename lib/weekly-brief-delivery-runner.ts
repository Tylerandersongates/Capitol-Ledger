import { getPrisma, hasDatabaseUrl } from "@/lib/prisma";
import { getOrCreateDailyBriefEditionForUser } from "@/lib/weekly-brief-editions";
import { buildWeeklyBriefDeliveryInput } from "@/lib/weekly-brief-history";
import { writeWeeklyBriefDeliveryToDatabase } from "@/lib/account-database";
import { publicBrandName } from "@/lib/brand";
import { sendEmailWithResend } from "@/lib/resend-email";
import type { AuthUser } from "@/lib/auth-database";
import type { WeeklyBriefSnapshot } from "@/lib/weekly-brief";
import type { WeeklyBriefDeliveryStatus } from "@/lib/weekly-brief-history";

type EligibleWeeklyBriefUser = {
  email: string;
  emailVerifiedAt: Date | null;
  id: string;
  name: string | null;
};

type WeeklyBriefWebhookPayload = {
  appName: string;
  brief: WeeklyBriefSnapshot;
  from?: string;
  kind: "weekly_brief";
  subject: string;
  text: string;
  to: string;
  user: {
    email: string;
    name?: string;
  };
};

type DeliveryProviderResult =
  | { delivered: false; mode: "disabled" | "manual_demo" }
  | { delivered: true; mode: "resend" | "webhook" };

export type WeeklyBriefDeliveryRunResult = {
  configured: boolean;
  delivered: number;
  dryRun: boolean;
  eligibleUsers: number;
  failed: number;
  generatedEditions: number;
  message: string;
  prepared: number;
  records: Array<{
    deliveryMode?: string;
    email: string;
    error?: string;
    status: "dry_run" | WeeklyBriefDeliveryStatus;
    summary?: string;
  }>;
};

function appName() {
  return publicBrandName;
}

function sender() {
  return process.env.WEEKLY_BRIEF_FROM || process.env.AUTH_EMAIL_FROM;
}

function toAuthUser(user: EligibleWeeklyBriefUser): AuthUser {
  return {
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString(),
    id: user.id,
    name: user.name ?? undefined
  };
}

function buildWeeklyBriefText(brief: WeeklyBriefSnapshot) {
  const watchItems = brief.watchToday
    .map((item) => `- ${item.label}: ${item.title}\n  What happened: ${item.whatHappened}\n  Why selected: ${item.whySelected}\n  What may happen next: ${item.next}`)
    .join("\n");
  const politics = brief.yesterdayInPolitics
    .map((item) => `- ${item.title} (${item.sourceName}): ${item.body}`)
    .join("\n");
  const movement = brief.watchlistMovement.items
    .map((item) => `- ${item.title}: ${item.body}`)
    .join("\n");
  const actions = brief.worthCheckingNext.map((item) => `- ${item.label}: ${item.body}`).join("\n");

  return [
    `${brief.title}`,
    "",
    "Your watch today:",
    watchItems || "- No personalized watch items are available yet.",
    "",
    "Yesterday in politics:",
    politics || "- No media topics cleared the latest 24-hour selection.",
    "",
    "Your watchlist moved:",
    movement || `- ${brief.watchlistMovement.summary}`,
    "",
    "Worth checking next:",
    actions || `- Review your ${publicBrandName} dashboard.`
  ].join("\n");
}

function buildWebhookPayload({ brief, user }: { brief: WeeklyBriefSnapshot; user: AuthUser }): WeeklyBriefWebhookPayload {
  return {
    appName: appName(),
    brief,
    from: sender(),
    kind: "weekly_brief",
    subject: `${appName()} Daily Brief`,
    text: buildWeeklyBriefText(brief),
    to: user.email,
    user: {
      email: user.email,
      name: user.name
    }
  };
}

async function deliverWeeklyBrief({ brief, user }: { brief: WeeklyBriefSnapshot; user: AuthUser }): Promise<DeliveryProviderResult> {
  const deliveryMode = process.env.WEEKLY_BRIEF_DELIVERY;

  if (deliveryMode === "resend") {
    const from = sender();
    if (!from) throw new Error("WEEKLY_BRIEF_FROM or AUTH_EMAIL_FROM is required when WEEKLY_BRIEF_DELIVERY=resend.");

    await sendEmailWithResend({
      from,
      subject: `${appName()} Daily Brief`,
      text: buildWeeklyBriefText(brief),
      to: user.email
    });

    return { delivered: true, mode: "resend" };
  }

  if (deliveryMode !== "webhook") {
    return {
      delivered: false,
      mode: deliveryMode === "manual_demo" ? "manual_demo" : "disabled"
    };
  }

  const webhookUrl = process.env.WEEKLY_BRIEF_WEBHOOK_URL;
  if (!webhookUrl) throw new Error("WEEKLY_BRIEF_WEBHOOK_URL is required when WEEKLY_BRIEF_DELIVERY=webhook.");

  const response = await fetch(webhookUrl, {
    body: JSON.stringify(buildWebhookPayload({ brief, user })),
    headers: {
      "Content-Type": "application/json",
      ...(process.env.WEEKLY_BRIEF_WEBHOOK_SECRET ? { "X-Capitol-Ledger-Secret": process.env.WEEKLY_BRIEF_WEBHOOK_SECRET } : {})
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Daily Brief webhook failed with status ${response.status}.`);
  }

  return { delivered: true, mode: "webhook" };
}

async function readEligibleWeeklyBriefUsers(limit: number) {
  const prisma = getPrisma();

  return prisma.$queryRaw<EligibleWeeklyBriefUser[]>`
    SELECT "User"."id", "User"."email", "User"."name", "User"."emailVerifiedAt"
    FROM "User"
    INNER JOIN "AccountSubscription" ON "AccountSubscription"."userId" = "User"."id"
    WHERE
      COALESCE(("User"."notificationPreferences"->>'weeklyBrief')::boolean, false) = true
      AND "AccountSubscription"."plan" IN ('pro', 'team')
      AND "AccountSubscription"."status" IN ('active', 'trialing')
    ORDER BY "User"."updatedAt" DESC
    LIMIT ${limit}
  `;
}

export async function runWeeklyBriefDelivery({
  dryRun = false,
  limit = 50
}: {
  dryRun?: boolean;
  limit?: number;
} = {}): Promise<WeeklyBriefDeliveryRunResult> {
  if (!hasDatabaseUrl()) {
    return {
      configured: false,
      delivered: 0,
      dryRun,
      eligibleUsers: 0,
      failed: 0,
      generatedEditions: 0,
      message: "Daily Brief delivery runner needs DATABASE_URL before scheduled delivery can run.",
      prepared: 0,
      records: []
    };
  }

  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 250);
  const users = await readEligibleWeeklyBriefUsers(safeLimit);
  const records: WeeklyBriefDeliveryRunResult["records"] = [];
  let delivered = 0;
  let failed = 0;
  let generatedEditions = 0;
  let prepared = 0;

  for (const userRecord of users) {
    const user = toAuthUser(userRecord);

    try {
      const edition = await getOrCreateDailyBriefEditionForUser(user, {
        forceRefresh: dryRun,
        persist: !dryRun
      });
      const brief = edition.snapshot;
      generatedEditions += 1;

      if (dryRun) {
        records.push({
          email: user.email,
          status: "dry_run",
          summary: brief.lens.headline
        });
        continue;
      }

      let providerResult: DeliveryProviderResult;
      const now = new Date().toISOString();

      try {
        providerResult = await deliverWeeklyBrief({ brief, user });
      } catch (error) {
        await writeWeeklyBriefDeliveryToDatabase(user.id, {
          ...buildWeeklyBriefDeliveryInput({
            brief,
            recipient: user.email,
            status: "failed"
          }),
          failedAt: now
        });
        failed += 1;
        records.push({
          deliveryMode: "webhook",
          email: user.email,
          error: error instanceof Error ? error.message : "Daily Brief delivery failed.",
          status: "failed",
          summary: brief.lens.headline
        });
        continue;
      }

      const status: WeeklyBriefDeliveryStatus = providerResult.delivered ? "sent" : "queued_demo";

      await writeWeeklyBriefDeliveryToDatabase(user.id, {
        ...buildWeeklyBriefDeliveryInput({
          brief,
          recipient: user.email,
          status
        }),
        sentAt: providerResult.delivered ? now : undefined
      });

      if (providerResult.delivered) {
        delivered += 1;
      } else {
        prepared += 1;
      }

      records.push({
        deliveryMode: providerResult.mode,
        email: user.email,
        status,
        summary: brief.lens.headline
      });
    } catch (error) {
      failed += 1;
      records.push({
        email: user.email,
        error: error instanceof Error ? error.message : "Daily Brief delivery failed.",
        status: "failed"
      });
    }
  }

  return {
    configured: true,
    delivered,
    dryRun,
    eligibleUsers: users.length,
    failed,
    generatedEditions,
    message: dryRun ? "Daily Brief delivery dry run completed." : "Daily Brief delivery run completed.",
    prepared,
    records
  };
}
