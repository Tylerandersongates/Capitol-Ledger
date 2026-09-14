import { getAccountProfile } from "@/lib/account-profile";
import {
  canUseDatabasePersistence,
  getAccountPersistenceUserId,
  readPreviousWeeklyBriefEditionFromDatabase,
  readProfileFromDatabase,
  readWeeklyBriefEditionFromDatabase,
  writeWeeklyBriefEditionToDatabase
} from "@/lib/account-database";
import { getDailyBriefEditorialOverride } from "@/lib/daily-brief-editorial";
import { isAccountPersistenceUnavailableError } from "@/lib/account-persistence-safety";
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
  if (canUseDatabasePersistence()) return readWeeklyBriefEditionFromDatabase(userId, editionDate);
  return getWeeklyBriefEdition(userId, editionDate);
}

async function readPreviousEdition(userId: string, editionDate: string) {
  if (canUseDatabasePersistence()) return readPreviousWeeklyBriefEditionFromDatabase(userId, editionDate);
  return getPreviousWeeklyBriefEdition(userId, editionDate);
}

export async function getOrCreateDailyBriefEditionForUser(
  user: AuthUser,
  { forceRefresh = false, now = new Date(), persist = true }: GetDailyBriefEditionOptions = {}
): Promise<WeeklyBriefEditionRecord> {
  const accountUserId = await getAccountPersistenceUserId(user);
  const databaseProfile = await readProfileFromDatabase(accountUserId);
  const profile = databaseProfile ?? (canUseDatabasePersistence() ? undefined : getAccountProfile(accountUserId));
  const timeZone = profile?.timeZone;
  const editionDate = getDailyBriefEditionDate(now, normalizeDailyBriefTimeZone(timeZone));

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
    if (isAccountPersistenceUnavailableError(error)) throw error;
    if (previous) return previous;
    throw error;
  }
  const recordInput = {
    editionDate,
    generatedAt: snapshot.generatedAt,
    snapshot
  };

  if (!persist) return normalizeWeeklyBriefEditionRecord(accountUserId, recordInput);

  const record = normalizeWeeklyBriefEditionRecord(accountUserId, recordInput);
  if (canUseDatabasePersistence()) {
    return (await writeWeeklyBriefEditionToDatabase(accountUserId, record)) ?? record;
  }

  return setWeeklyBriefEdition(accountUserId, record);
}
