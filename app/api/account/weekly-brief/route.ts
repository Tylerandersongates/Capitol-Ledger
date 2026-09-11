import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import {
  canUseDatabasePersistence,
  getAccountPersistenceUserId,
  readWeeklyBriefDeliveryHistoryFromDatabase,
  writeWeeklyBriefDeliveryToDatabase
} from "@/lib/account-database";
import { throwAccountPersistenceUnavailable, withAccountPersistenceRoute } from "@/lib/account-persistence-safety";
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

async function getWeeklyBrief() {
  const result = await readWeeklyBrief();

  if (result instanceof NextResponse) return result;
  const accountUserId = await getAccountPersistenceUserId(result.user);
  const history = canUseDatabasePersistence()
    ? await readWeeklyBriefDeliveryHistoryFromDatabase(accountUserId)
    : getWeeklyBriefDeliveryHistory(accountUserId);
  if (!history) throwAccountPersistenceUnavailable("getWeeklyBriefHistory");

  return NextResponse.json({
    brief: result.brief,
    delivery: result.brief.delivery,
    history,
    user: result.user
  });
}

async function prepareWeeklyBrief(request: NextRequest) {
  const guard = guardMutationRequest(request, "account-weekly-brief", { limit: 8, windowMs: 15 * 60 * 1000 });
  if (guard) return guard;

  const result = await readWeeklyBrief();

  if (result instanceof NextResponse) return result;
  const accountUserId = await getAccountPersistenceUserId(result.user);

  const deliveryInput = buildWeeklyBriefDeliveryInput({
    brief: result.brief,
    recipient: result.user.email,
    status: result.brief.delivery.enabled ? "queued_demo" : "paused"
  });
  const usesDatabase = canUseDatabasePersistence();
  const deliveryRecord = usesDatabase
    ? await writeWeeklyBriefDeliveryToDatabase(accountUserId, deliveryInput)
    : addWeeklyBriefDeliveryRecord(accountUserId, deliveryInput);
  if (!deliveryRecord) throwAccountPersistenceUnavailable("prepareWeeklyBrief");
  const history = usesDatabase
    ? await readWeeklyBriefDeliveryHistoryFromDatabase(accountUserId)
    : getWeeklyBriefDeliveryHistory(accountUserId);
  if (!history) throwAccountPersistenceUnavailable("readPreparedWeeklyBriefHistory");

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

export const GET = withAccountPersistenceRoute(getWeeklyBrief);
export const POST = withAccountPersistenceRoute(prepareWeeklyBrief);
