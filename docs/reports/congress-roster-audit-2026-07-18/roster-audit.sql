-- Read-only database side of the July 18, 2026 Congress roster audit.
-- Congress.gov parity and app behavior are verified by
-- scripts/audit-congress-roster-data-quality.ts and saved in audit-results.json.

WITH current_members AS (
  SELECT
    "bioguideId",
    "chamber"::text AS chamber,
    "photoUrl",
    "officialUrl"
  FROM "Member"
  WHERE active = TRUE
),
current_source_links AS (
  SELECT DISTINCT "targetId" AS "bioguideId"
  FROM "OfficialSourceLink"
  WHERE "targetType" = 'member'
    AND source = 'Congress.gov'
)
SELECT
  chamber,
  COUNT(*)::integer AS member_count,
  COUNT(*) FILTER (WHERE "bioguideId" IN (
    SELECT "bioguideId" FROM current_source_links
  ))::integer AS source_link_count,
  COUNT(*) FILTER (WHERE "photoUrl" IS NULL)::integer AS missing_photo_count,
  COUNT(*) FILTER (WHERE "officialUrl" IS NULL)::integer AS missing_official_url_count
FROM current_members
GROUP BY chamber
ORDER BY chamber;

-- Portable report rows for the three audited, non-blocking presentation gaps.
-- The election-date count is supplied by the saved audit because those dates
-- are intentionally not persisted as verified Member fields.
SELECT *
FROM (
  VALUES
    ('Verified election dates', 522, 522.0 / 537.0),
    ('Direct official-site URL', 516, 516.0 / 537.0),
    ('Member portrait', 2, 2.0 / 537.0)
) AS quality_gap(field, impacted_members, share_of_roster)
ORDER BY impacted_members DESC;
