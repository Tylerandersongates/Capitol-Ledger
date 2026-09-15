-- Source-only privacy operator ambient-privilege preflight candidate.
--
-- This artifact is intentionally outside prisma/migrations and is not approved
-- for production execution. It is read-only: it creates or alters no role,
-- privilege, schema, table, function, credential, connection, or setting outside
-- the current transaction. The companion checker executes it only in ephemeral
-- PGlite.

BEGIN TRANSACTION READ ONLY;

DO $validation_guard$
BEGIN
  IF pg_catalog.current_setting(
    'capitolwonk.operator_ambient_privilege_preflight',
    TRUE
  ) IS DISTINCT FROM 'approved-read-only' THEN
    RAISE EXCEPTION 'Privacy operator ambient-privilege preflight is not approved.';
  END IF;

  IF pg_catalog.current_setting('transaction_read_only') IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Privacy operator ambient-privilege preflight must be read-only.';
  END IF;

  IF NULLIF(
    pg_catalog.current_setting('capitolwonk.operator_expected_database', TRUE),
    ''
  ) IS NULL THEN
    RAISE EXCEPTION 'Privacy operator expected database is required.';
  END IF;
END
$validation_guard$;

WITH target_database AS (
  SELECT database_record.datacl, database_record.datdba
  FROM pg_catalog.pg_database AS database_record
  WHERE database_record.datname = pg_catalog.current_database()
),
public_database_acl AS (
  SELECT acl.privilege_type
  FROM target_database
  CROSS JOIN LATERAL pg_catalog.aclexplode(
    COALESCE(
      target_database.datacl,
      pg_catalog.acldefault('d', target_database.datdba)
    )
  ) AS acl
  WHERE acl.grantee = 0::OID
),
target_schema AS (
  SELECT namespace_record.nspacl, namespace_record.nspowner
  FROM pg_catalog.pg_namespace AS namespace_record
  WHERE namespace_record.nspname = 'public'
),
public_schema_acl AS (
  SELECT acl.privilege_type
  FROM target_schema
  CROSS JOIN LATERAL pg_catalog.aclexplode(
    COALESCE(
      target_schema.nspacl,
      pg_catalog.acldefault('n', target_schema.nspowner)
    )
  ) AS acl
  WHERE acl.grantee = 0::OID
),
target_relations AS (
  SELECT
    relation_record.relacl,
    relation_record.relkind,
    relation_record.relname,
    relation_record.relowner
  FROM pg_catalog.pg_class AS relation_record
  INNER JOIN pg_catalog.pg_namespace AS namespace_record
    ON namespace_record.oid = relation_record.relnamespace
  WHERE namespace_record.nspname = 'public'
    AND relation_record.relname IN (
      'PrivacyRequest',
      'PrivacyRequestOperation'
    )
),
application_relations AS (
  SELECT
    relation_record.relacl,
    relation_record.relkind,
    relation_record.relowner
  FROM pg_catalog.pg_class AS relation_record
  INNER JOIN pg_catalog.pg_namespace AS namespace_record
    ON namespace_record.oid = relation_record.relnamespace
  WHERE namespace_record.nspname = 'public'
    AND relation_record.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
),
public_target_relation_acl AS (
  SELECT acl.privilege_type
  FROM target_relations
  CROSS JOIN LATERAL pg_catalog.aclexplode(
    COALESCE(
      target_relations.relacl,
      pg_catalog.acldefault('r', target_relations.relowner)
    )
  ) AS acl
  WHERE acl.grantee = 0::OID
),
public_application_relation_acl AS (
  SELECT target.relkind, acl.privilege_type
  FROM application_relations AS target
  CROSS JOIN LATERAL pg_catalog.aclexplode(
    COALESCE(
      target.relacl,
      pg_catalog.acldefault(
        (CASE WHEN target.relkind = 'S' THEN 'S' ELSE 'r' END)::"char",
        target.relowner
      )
    )
  ) AS acl
  WHERE acl.grantee = 0::OID
),
application_routines AS (
  SELECT routine_record.proacl, routine_record.proowner
  FROM pg_catalog.pg_proc AS routine_record
  INNER JOIN pg_catalog.pg_namespace AS namespace_record
    ON namespace_record.oid = routine_record.pronamespace
  WHERE namespace_record.nspname = 'public'
),
public_application_routine_acl AS (
  SELECT acl.privilege_type
  FROM application_routines
  CROSS JOIN LATERAL pg_catalog.aclexplode(
    COALESCE(
      application_routines.proacl,
      pg_catalog.acldefault('f', application_routines.proowner)
    )
  ) AS acl
  WHERE acl.grantee = 0::OID
),
facts AS (
  SELECT
    pg_catalog.current_database() = pg_catalog.current_setting(
      'capitolwonk.operator_expected_database',
      TRUE
    ) AS "databaseMatchesExpected",
    (SELECT pg_catalog.count(*)::INTEGER FROM target_relations) AS "privacyTableCount",
    COALESCE(
      (SELECT pg_catalog.bool_and(relkind IN ('r', 'p')) FROM target_relations),
      FALSE
    ) AS "privacyTablesAreBaseOrPartitioned",
    NOT EXISTS (
      SELECT 1 FROM public_database_acl WHERE privilege_type = 'CONNECT'
    ) AS "publicDatabaseConnectAbsent",
    NOT EXISTS (
      SELECT 1 FROM public_database_acl WHERE privilege_type = 'TEMPORARY'
    ) AS "publicDatabaseTemporaryAbsent",
    NOT EXISTS (
      SELECT 1 FROM public_schema_acl WHERE privilege_type = 'CREATE'
    ) AS "publicSchemaCreateAbsent",
    EXISTS (
      SELECT 1 FROM public_schema_acl WHERE privilege_type = 'USAGE'
    ) AS "publicSchemaUsageObserved",
    NOT EXISTS (
      SELECT 1
      FROM public_target_relation_acl
      WHERE privilege_type IN (
        'SELECT',
        'INSERT',
        'UPDATE',
        'DELETE',
        'TRUNCATE',
        'REFERENCES',
        'TRIGGER'
      )
    ) AS "publicPrivacyTableAccessAbsent",
    NOT EXISTS (
      SELECT 1
      FROM public_application_relation_acl
      WHERE relkind <> 'S'
        AND privilege_type IN (
          'SELECT',
          'INSERT',
          'UPDATE',
          'DELETE',
          'TRUNCATE',
          'REFERENCES',
          'TRIGGER'
        )
    ) AS "publicApplicationRelationAccessAbsent",
    NOT EXISTS (
      SELECT 1
      FROM public_application_relation_acl
      WHERE relkind = 'S'
        AND privilege_type IN ('USAGE', 'SELECT', 'UPDATE')
    ) AS "publicApplicationSequenceAccessAbsent",
    NOT EXISTS (
      SELECT 1
      FROM public_application_routine_acl
      WHERE privilege_type = 'EXECUTE'
    ) AS "publicApplicationRoutineExecuteAbsent",
    NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_roles
      WHERE rolname IN (
        'capitolwonk_privacy_function_owner',
        'capitolwonk_privacy_operator'
      )
    ) AS "reviewedRoleNamesAvailable"
)
SELECT
  facts.*,
  (
    facts."databaseMatchesExpected"
    AND facts."privacyTableCount" = 2
    AND facts."privacyTablesAreBaseOrPartitioned"
    AND facts."publicDatabaseConnectAbsent"
    AND facts."publicDatabaseTemporaryAbsent"
    AND facts."publicSchemaCreateAbsent"
    AND facts."publicPrivacyTableAccessAbsent"
    AND facts."publicApplicationRelationAccessAbsent"
    AND facts."publicApplicationSequenceAccessAbsent"
    AND facts."publicApplicationRoutineExecuteAbsent"
    AND facts."reviewedRoleNamesAvailable"
  ) AS "preflightPass"
FROM facts;

COMMIT;
