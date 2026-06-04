import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession, requireAuthMessage } from "@/lib/auth";
import {
  readPetitionSignaturesForUser,
  recordPetitionSignatureForUser
} from "@/lib/account-petition-signatures";
import { guardMutationRequest } from "@/lib/request-security";

const signPetitionSchema = z.object({
  petitionId: z.string().trim().min(1)
});

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const petitions = await readPetitionSignaturesForUser(session.user.id).catch(() => []);

  return NextResponse.json({
    petitions,
    user: session.user
  });
}

export async function POST(request: NextRequest) {
  const guard = guardMutationRequest(request, "account-petitions");
  if (guard) return guard;

  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(requireAuthMessage(), { status: 401 });
  }

  const parsed = signPetitionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Petition id is required." }, { status: 400 });
  }

  const petition = await recordPetitionSignatureForUser(session.user.id, parsed.data.petitionId).catch(() => null);
  if (!petition) {
    return NextResponse.json({ error: "Petition not found." }, { status: 404 });
  }

  return NextResponse.json({ petition });
}
