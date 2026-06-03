ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT;

UPDATE "User"
SET
  "firstName" = COALESCE("firstName", NULLIF(split_part(TRIM(COALESCE("name", '')), ' ', 1), '')),
  "lastName" = COALESCE(
    "lastName",
    NULLIF(
      CASE
        WHEN array_length(regexp_split_to_array(TRIM(COALESCE("name", '')), '\s+'), 1) > 1
        THEN regexp_replace(TRIM(COALESCE("name", '')), '^\S+\s*', '')
        ELSE ''
      END,
      ''
    )
  )
WHERE "name" IS NOT NULL;
