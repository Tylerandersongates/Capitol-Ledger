import { getAccountProfile } from "@/lib/account-profile";
import {
  getAccountPersistenceUserId,
  readPreviousWeeklyBriefEditionFromDatabase,
  readProfileFromDatabase,
  readWeeklyBriefEditionFromDatabase,
  writeWeeklyBriefEditionToDatabase
} from "@/lib/account-database";
import { getDailyBriefEditorialOverride } from "@/lib/daily-brief-editorial";
import {
  getDailyBriefEditionDate,
  getPreviousWeeklyBriefEdition,
  getWeeklyBriefEdition,
  normalizeDailyBriefTimeZone,
  normalizeWeeklyBriefEditionRecord,
  setWeeklyBriefEdition,
  type WeeklyBriefEditionRecord
} from "@/lib/weekly-brief-edition";
import { getWeeklyBriefForUser } from "@/lib/weekly-brief";
import type { AuthUser } from "@/lib/auth-database";
import type { WeeklyBriefSnapshot } from "@/lib/weekly-brief";

export type GetDailyBriefEditionOptions = {
  forceRefresh?: boolean;
  now?: Date;
  persist?: boolean;
};

async function readCurrentEdition(userId: string, editionDate: string) {
  return (await readWeeklyBriefEditionFromDatabase(userId, editionDate).catch(() => null)) ??
    getWeeklyBriefEdition(userId, editionDate);
}

async function readPreviousEdition(userId: string, editionDate: string) {
  return (await readPreviousWeeklyBriefEditionFromDatabase(userId, editionDate).catch(() => null)) ??
    getPreviousWeeklyBriefEdition(userId, editionDate);
}

export async function getOrCreateDailyBriefEditionForUser(
  user: AuthUser,
  { forceRefresh = false, now = new Date(), persist = true }: GetDailyBriefEditionOptions = {}
): Promise<WeeklyBriefEditionRecord> {
  const accountUserId = await getAccountPersistenceUserId(user).catch(() => user.id);
  const profile = (await readProfileFromDatabase(accountUserId).catch(() => null)) ?? getAccountProfile(accountUserId);
  const editionDate = getDailyBriefEditionDate(now, normalizeDailyBriefTimeZone(profile.timeZone));

  if (!forceRefresh) {
    const current = await readCurrentEdition(accountUserId, editionDate);
    if (current) return current;
  }

  const previous = await readPreviousEdition(accountUserId, editionDate);
  let snapshot: WeeklyBriefSnapshot;

  try {
    snapshot = await getWeeklyBriefForUser(user, {
      editorialOverride: getDailyBriefEditorialOverride(editionDate),
      generatedAt: now.toISOString(),
      previousBrief: previous?.snapshot
    });
  } catch (error) {
    if (previous) return previous;
    throw error;
  }
  const recordInput = {
    editionDate,
    generatedAt: snapshot.generatedAt,
    snapshot
  };

  if (!persist) return normalizeWeeklyBriefEditionRecord(accountUserId, recordInput);

  const record = setWeeklyBriefEdition(accountUserId, recordInput);
  const databaseRecord = await writeWeeklyBriefEditionToDatabase(accountUserId, record).catch(() => null);

  return databaseRecord ? setWeeklyBriefEdition(accountUserId, databaseRecord) : record;
}
