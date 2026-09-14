-- Owner-upgrade pause records predate a Team workspace and therefore use NULL.
-- Member-seat pause records must reference a real workspace so a late write
-- cannot recreate an orphan after an owner's account transaction commits.
ALTER TABLE "TeamSubscriptionPause" ALTER COLUMN "workspaceId" DROP NOT NULL;

UPDATE "TeamSubscriptionPause" pause
SET "workspaceId" = NULL
WHERE pause."workspaceId" IN ('', 'team-owner-upgrade');

-- An unexpected orphan may represent a member whose personal subscription
-- still needs restoration. Do not silently relabel it as an owner-upgrade
-- record; stop the migration so it can be investigated and repaired.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "TeamSubscriptionPause" pause
    WHERE pause."workspaceId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "TeamWorkspace" workspace
        WHERE workspace."id" = pause."workspaceId"
      )
  ) THEN
    RAISE EXCEPTION 'Unexpected orphan TeamSubscriptionPause rows require repair before workspace integrity can be enabled';
  END IF;
END
$$;

ALTER TABLE "TeamSubscriptionPause"
  DROP CONSTRAINT IF EXISTS "TeamSubscriptionPause_workspaceId_fkey";
ALTER TABLE "TeamSubscriptionPause"
  ADD CONSTRAINT "TeamSubscriptionPause_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "TeamWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
