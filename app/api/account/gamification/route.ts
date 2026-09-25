import { NextRequest, NextResponse } from "next/server";
import {
  getAccountGamification,
  getDefaultAccountGamification,
  recordAccountGamificationEvent
} from "@/lib/account-gamification";
import {
  canUseDatabasePersistence,
  getAccountPersistenceUserId,
  readGamificationFromDatabase,
  recordGamificationEventToDatabase
} from "@/lib/account-database";
import { throwAccountPersistenceUnavailable, withAccountPersistenceRoute } from "@/lib/account-persistence-safety";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { getGamificationEventRule, type GamificationEventType } from "@/lib/gamification";
import { guardMutationRequest } from "@/lib/request-security";

async function readSession() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

async function getGamification() {
  const user = await readSession();

  if (!user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const accountUserId = await getAccountPersistenceUserId(user);
  const databaseGamification = await readGamificationFromDatabase(accountUserId);
  const usesDatabase = canUseDatabasePersistence();

  return NextResponse.json({
    authenticated: true,
    mode: usesDatabase ? "database" : "account",
    user,
    gamification: databaseGamification ?? (usesDatabase ? getDefaultAccountGamification() : getAccountGamification(accountUserId))
  });
}

async function updateGamification(request: NextRequest) {
  const guard = guardMutationRequest(request, "account-gamification");
  if (guard) return guard;

  const user = await readSession();

  if (!user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    event?: unknown;
    idempotencyKey?: unknown;
    operation?: unknown;
    targetId?: unknown;
  };
  if (body.operation !== "record-event" || typeof body.event !== "string") {
    return NextResponse.json({ error: "Gamification writes require one server-credited event." }, { status: 400 });
  }

  const event = body.event as GamificationEventType;
  const rule = getGamificationEventRule(event);
  if (!rule) {
    return NextResponse.json({ error: "Unknown gamification event." }, { status: 400 });
  }

  const targetId = typeof body.targetId === "string" ? body.targetId.trim() : "";
  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
  if (targetId.length > 200 || idempotencyKey.length > 200) {
    return NextResponse.json({ error: "Gamification event identity is too long." }, { status: 400 });
  }
  if (rule.dedupe === "once-per-target" && !targetId) {
    return NextResponse.json({ error: "This gamification event requires a durable target." }, { status: 400 });
  }
  if (rule.dedupe === "repeatable" && !idempotencyKey) {
    return NextResponse.json({ error: "This gamification event requires an idempotency key." }, { status: 400 });
  }

  const activityDate = new Date().toISOString().slice(0, 10);
  const creditKey = JSON.stringify([
    event,
    rule.dedupe === "once" ? "once" :
      rule.dedupe === "daily" ? `${activityDate}:${targetId || "daily"}` :
      rule.dedupe === "repeatable" ? idempotencyKey : targetId
  ]);
  const accountUserId = await getAccountPersistenceUserId(user);
  const usesDatabase = canUseDatabasePersistence();
  const result = usesDatabase
    ? await recordGamificationEventToDatabase({ activityDate, creditKey, event, userId: accountUserId })
    : recordAccountGamificationEvent(accountUserId, event, creditKey, activityDate);
  if (!result) throwAccountPersistenceUnavailable("updateGamification");

  return NextResponse.json({
    authenticated: true,
    credited: result.credited,
    mode: usesDatabase ? "database" : "account",
    user,
    gamification: result.gamification
  });
}

export const GET = withAccountPersistenceRoute(getGamification);
export const POST = withAccountPersistenceRoute(updateGamification);
