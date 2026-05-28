import { NextRequest, NextResponse } from "next/server";
import {
  getAccountGamification,
  setAccountGamification,
  type AccountGamificationSnapshot
} from "@/lib/account-gamification";
import { ensureAccountUser, readGamificationFromDatabase, writeGamificationToDatabase } from "@/lib/account-database";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import { guardMutationRequest } from "@/lib/request-security";

async function readSession() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export async function GET() {
  const user = await readSession();

  if (!user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const databaseGamification = await ensureAccountUser(user)
    .then(() => readGamificationFromDatabase(user.id))
    .catch(() => null);

  return NextResponse.json({
    mode: databaseGamification ? "database" : "account",
    user,
    gamification: databaseGamification ?? getAccountGamification(user.id)
  });
}

export async function POST(request: NextRequest) {
  const guard = guardMutationRequest(request, "account-gamification");
  if (guard) return guard;

  const user = await readSession();

  if (!user) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<AccountGamificationSnapshot>;
  const databaseGamification = await ensureAccountUser(user)
    .then(() => writeGamificationToDatabase(user.id, body))
    .catch(() => null);
  const gamification = databaseGamification ?? setAccountGamification(user.id, body);

  return NextResponse.json({
    mode: databaseGamification ? "database" : "account",
    user,
    gamification
  });
}
