-- Source-only candidate for one separately authorized production catalog read.
-- Do not run without exact action-time approval and a client that first sets
-- capitolwonk.operator_principal_acl_inventory=approved-read-only in its session.
-- The client must validate the protected production branch, direct endpoint,
-- literal Capitol%20Ledger database, TLS, and credential handling separately.
-- This SQL reads no application row or credential and changes no persistent state.

BEGIN TRANSACTION READ ONLY;

DO $inventory_guard$
BEGIN
  IF pg_catalog.current_setting(
    'capitolwonk.operator_principal_acl_inventory', TRUE
  ) IS DISTINCT FROM 'approved-read-only' THEN
    RAISE EXCEPTION 'Privacy operator principal ACL inventory is not approved.';
  END IF;

  IF pg_catalog.current_setting('transaction_read_only') IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Privacy operator principal ACL inventory must be read-only.';
  END IF;

  IF pg_catalog.current_database() IS DISTINCT FROM 'Capitol%20Ledger' THEN
    RAISE EXCEPTION 'Privacy operator principal ACL inventory target mismatch.';
  END IF;
END
$inventory_guard$;

WITH target_database AS (
  SELECT d.oid, d.datacl, d.datdba
  FROM pg_catalog.pg_database AS d
  WHERE d.datname = pg_catalog.current_database()
),
database_acl AS (
  SELECT acl.grantee, acl.privilege_type
  FROM target_database AS d
  CROSS JOIN LATERAL pg_catalog.aclexplode(
    COALESCE(d.datacl, pg_catalog.acldefault('d', d.datdba))
  ) AS acl
),
login_roles AS (
  SELECT r.oid, r.rolname, r.rolsuper
  FROM pg_catalog.pg_roles AS r
  WHERE r.rolcanlogin
),
role_paths AS (
  SELECT
    r.rolname::TEXT AS role_name,
    r.rolsuper AS superuser,
    r.oid = d.datdba AS database_owner,
    r.oid = CURRENT_USER::pg_catalog.regrole::OID AS current_executor,
    pg_catalog.has_database_privilege(r.oid, d.oid, 'CONNECT') AS effective_connect,
    pg_catalog.has_database_privilege(r.oid, d.oid, 'TEMPORARY') AS effective_temporary,
    EXISTS (
      SELECT 1 FROM database_acl AS a
      WHERE a.grantee = r.oid AND a.privilege_type = 'CONNECT'
    ) AS direct_connect,
    EXISTS (
      SELECT 1 FROM database_acl AS a
      WHERE a.grantee = r.oid AND a.privilege_type = 'TEMPORARY'
    ) AS direct_temporary,
    EXISTS (
      SELECT 1 FROM database_acl AS a
      WHERE a.grantee <> 0::OID
        AND a.grantee <> r.oid
        AND a.privilege_type = 'CONNECT'
        AND pg_catalog.pg_has_role(r.oid, a.grantee, 'USAGE')
    ) AS inherited_connect,
    EXISTS (
      SELECT 1 FROM database_acl AS a
      WHERE a.grantee <> 0::OID
        AND a.grantee <> r.oid
        AND a.privilege_type = 'TEMPORARY'
        AND pg_catalog.pg_has_role(r.oid, a.grantee, 'USAGE')
    ) AS inherited_temporary
  FROM login_roles AS r
  CROSS JOIN target_database AS d
),
bounded_inventory AS (
  SELECT
    pg_catalog.count(*)::INTEGER AS login_role_count,
    pg_catalog.count(*) <= 32 AS role_detail_within_bound
  FROM role_paths
)
SELECT
  EXISTS (
    SELECT 1 FROM database_acl AS a
    WHERE a.grantee = 0::OID AND a.privilege_type = 'CONNECT'
  ) AS "publicConnectPresent",
  EXISTS (
    SELECT 1 FROM database_acl AS a
    WHERE a.grantee = 0::OID AND a.privilege_type = 'TEMPORARY'
  ) AS "publicTemporaryPresent",
  b.login_role_count AS "loginRoleCount",
  b.role_detail_within_bound AS "roleDetailWithinBound",
  CASE WHEN b.role_detail_within_bound THEN (
    SELECT pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'roleName', p.role_name,
        'superuser', p.superuser,
        'databaseOwner', p.database_owner,
        'currentExecutor', p.current_executor,
        'effectiveConnect', p.effective_connect,
        'effectiveTemporary', p.effective_temporary,
        'directConnect', p.direct_connect,
        'directTemporary', p.direct_temporary,
        'inheritedConnect', p.inherited_connect,
        'inheritedTemporary', p.inherited_temporary,
        'connectDependsOnPublic', NOT (
          p.superuser OR p.database_owner OR p.direct_connect OR p.inherited_connect
        ),
        'temporaryDependsOnPublic', NOT (
          p.superuser OR p.database_owner OR p.direct_temporary OR p.inherited_temporary
        )
      ) ORDER BY p.role_name
    ) FROM role_paths AS p
  ) ELSE NULL END AS "loginRoles"
FROM bounded_inventory AS b;

COMMIT;
