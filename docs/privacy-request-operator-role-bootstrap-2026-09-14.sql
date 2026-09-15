-- Source-only privacy operator role-bootstrap candidate.
--
-- This artifact is intentionally outside prisma/migrations and is not approved
-- for production execution. It creates no credential, grant, database, schema,
-- table, function, application binding, or network rule. The companion checker
-- executes it only in ephemeral PGlite.

BEGIN;

DO $validation_guard$
BEGIN
  IF pg_catalog.current_setting(
    'capitolwonk.operator_role_bootstrap_validation',
    TRUE
  ) IS DISTINCT FROM 'ephemeral-only' THEN
    RAISE EXCEPTION 'Privacy operator role bootstrap is validation-only.';
  END IF;
END
$validation_guard$;

DO $collision_preflight$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE rolname IN (
      'capitolwonk_privacy_function_owner',
      'capitolwonk_privacy_operator'
    )
  ) THEN
    RAISE EXCEPTION 'A reviewed privacy role name already exists; refusing to adopt or alter it.';
  END IF;
END
$collision_preflight$;

CREATE ROLE capitolwonk_privacy_function_owner WITH
  NOLOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION
  NOBYPASSRLS
  CONNECTION LIMIT 0
  PASSWORD NULL
  VALID UNTIL 'epoch';

CREATE ROLE capitolwonk_privacy_operator WITH
  NOLOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION
  NOBYPASSRLS
  CONNECTION LIMIT 0
  PASSWORD NULL
  VALID UNTIL 'epoch';

DO $role_postflight$
BEGIN
  IF (
    SELECT pg_catalog.count(*)
    FROM pg_catalog.pg_roles
    WHERE rolname IN (
      'capitolwonk_privacy_function_owner',
      'capitolwonk_privacy_operator'
    )
      AND NOT rolcanlogin
      AND NOT rolsuper
      AND NOT rolcreatedb
      AND NOT rolcreaterole
      AND NOT rolinherit
      AND NOT rolreplication
      AND NOT rolbypassrls
      AND rolconnlimit = 0
      AND rolvaliduntil <= CURRENT_TIMESTAMP
  ) IS DISTINCT FROM 2::BIGINT THEN
    RAISE EXCEPTION 'The created privacy roles violate the reviewed attribute floor.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_authid
    WHERE rolname IN (
      'capitolwonk_privacy_function_owner',
      'capitolwonk_privacy_operator'
    )
      AND rolpassword IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'A created privacy role unexpectedly has a password.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_auth_members AS membership
    INNER JOIN pg_catalog.pg_roles AS granted_role
      ON granted_role.oid = membership.roleid
    INNER JOIN pg_catalog.pg_roles AS member_role
      ON member_role.oid = membership.member
    WHERE granted_role.rolname IN (
      'capitolwonk_privacy_function_owner',
      'capitolwonk_privacy_operator'
    )
      OR member_role.rolname IN (
        'capitolwonk_privacy_function_owner',
        'capitolwonk_privacy_operator'
      )
  ) THEN
    RAISE EXCEPTION 'The created privacy roles unexpectedly have a membership edge.';
  END IF;
END
$role_postflight$;

COMMIT;
