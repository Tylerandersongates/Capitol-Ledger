import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import {
  readWeeklyBriefDeliveryHistoryFromDatabase,
  writeWeeklyBriefDeliveryToDatabase
} from "@/lib/account-database";
import { getWeeklyBriefForUser } from "@/lib/weekly-brief";
import {
  addWeeklyBriefDeliveryRecord,
  buildWeeklyBriefDeliveryInput,
  getWeeklyBriefDeliveryHistory
} from "@/lib/weekly-brief-history";
import { guardMutationRequest } from "@/lib/request-security";

async function readWeeklyBrief() {
  const session = await getCurrentSession();
  if (!session) return null;

  return {
    brief: await getWeeklyBriefForUser(session.user),
    user: session.user
  };
}

export async function GET() {
  const result = await readWeeklyBrief();

  if (!result) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

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

  if (!result) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

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
      ? "Weekly Brief demo delivery prepared."
      : "Weekly Brief is paused. Enable it in Alert Preferences to schedule delivery."
  });
}
