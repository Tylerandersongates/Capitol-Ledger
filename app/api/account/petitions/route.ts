import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import {
  readPetitionSignaturesForUser,
  recordPetitionSignatureForUser
} from "@/lib/account-petition-signatures";
import { guardMutationRequest } from "@/lib/request-security";
import { withAccountPersistenceRoute } from "@/lib/account-persistence-safety";

const signPetitionSchema = z.object({
  petitionId: z.string().trim().min(1)
});

async function getPetitions() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const petitions = await readPetitionSignaturesForUser(session.user.id);

  return NextResponse.json({
    petitions,
    user: session.user
  });
}

async function signPetition(request: NextRequest) {
  const guard = await guardMutationRequest(request, "account-petitions");
  if (guard) return guard;

  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const parsed = signPetitionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Petition id is required." }, { status: 400 });
  }

  const petition = await recordPetitionSignatureForUser(session.user.id, parsed.data.petitionId);
  if (!petition) {
    return NextResponse.json({ error: "Petition not found." }, { status: 404 });
  }

  return NextResponse.json({ petition });
}

export const GET = withAccountPersistenceRoute(getPetitions);
export const POST = withAccountPersistenceRoute(signPetition);
