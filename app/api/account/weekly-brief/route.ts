import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import {
  readWeeklyBriefDeliveryHistoryFromDatabase,
  writeWeeklyBriefDeliveryToDatabase
} from "@/lib/account-database";
import { getOrCreateDailyBriefEditionForUser } from "@/lib/weekly-brief-editions";
import {
  addWeeklyBriefDeliveryRecord,
  buildWeeklyBriefDeliveryInput,
  getWeeklyBriefDeliveryHistory
} from "@/lib/weekly-brief-history";
import { guardMutationRequest } from "@/lib/request-security";
import { getEffectiveSubscriptionForAccountUser } from "@/lib/effective-account-subscription";
import { isPlanFeatureEnabled } from "@/lib/subscription-plans";

async function readWeeklyBrief() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json(requireAuthMessage(), { status: 401 });

  const subscription = await getEffectiveSubscriptionForAccountUser(session.user);
  if (!isPlanFeatureEnabled(subscription.plan, "personalizedBrief")) {
    return NextResponse.json({ message: "Personalized briefs require Pro. The Daily Brief video is free at /brief." }, { status: 403 });
  }

  return {
    brief: (await getOrCreateDailyBriefEditionForUser(session.user)).snapshot,
    user: session.user
  };
}

export async function GET() {
  const result = await readWeeklyBrief();

  if (result instanceof NextResponse) return result;

  return NextResponse.json({
    brief: result.brief,
    delivery: result.brief.delivery,
    history:
      (await readWeeklyBriefDeliveryHistoryFromDatabase(result.user.id).catch(() => null)) ??
      getWeeklyBriefDeliveryHistory(result.user.id),
    user: result.user
  });
}

export async function POST(request: NextRequest) {
  const guard = guardMutationRequest(request, "account-weekly-brief", { limit: 8, windowMs: 15 * 60 * 1000 });
  if (guard) return guard;

  const result = await readWeeklyBrief();

  if (result instanceof NextResponse) return result;

  const deliveryInput = buildWeeklyBriefDeliveryInput({
    brief: result.brief,
    recipient: result.user.email,
    status: result.brief.delivery.enabled ? "queued_demo" : "paused"
  });
  const databaseRecord = await writeWeeklyBriefDeliveryToDatabase(result.user.id, deliveryInput).catch(() => null);
  const deliveryRecord = databaseRecord ?? addWeeklyBriefDeliveryRecord(result.user.id, deliveryInput);
  const history = databaseRecord
    ? (await readWeeklyBriefDeliveryHistoryFromDatabase(result.user.id).catch(() => null)) ??
      getWeeklyBriefDeliveryHistory(result.user.id)
    : getWeeklyBriefDeliveryHistory(result.user.id);

  return NextResponse.json({
    brief: result.brief,
    delivery: {
      ...result.brief.delivery,
      preparedAt: deliveryRecord.preparedAt,
      status: deliveryRecord.status
    },
    history,
    message: result.brief.delivery.enabled
      ? "Daily Brief demo delivery prepared."
      : "Daily Brief is paused. Enable it in Alert Preferences to schedule delivery."
  });
}
