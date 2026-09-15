-- Source-only privacy operator function migration ACL segment.
--
-- This artifact is intentionally outside prisma/migrations and is not approved
-- for production execution. It creates no role, credential, database, schema,
-- function, table, or application binding. The companion checker executes it
-- only after installing the reviewed function definitions and synthetic roles
-- inside ephemeral PGlite.

DO $validation_guard$
DECLARE
  function_owner pg_catalog.pg_roles%ROWTYPE;
  operator_principal pg_catalog.pg_roles%ROWTYPE;
BEGIN
  IF pg_catalog.current_setting(
    'capitolwonk.operator_function_migration_acl_validation',
    TRUE
  ) IS DISTINCT FROM 'ephemeral-only' THEN
    RAISE EXCEPTION 'Privacy operator function migration ACL is validation-only.';
  END IF;

  SELECT *
  INTO function_owner
  FROM pg_catalog.pg_roles
  WHERE rolname = 'capitolwonk_privacy_function_owner';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The reviewed no-login function owner is absent.';
  END IF;

  IF function_owner.rolcanlogin
    OR function_owner.rolsuper
    OR function_owner.rolcreatedb
    OR function_owner.rolcreaterole
    OR function_owner.rolreplication
    OR function_owner.rolbypassrls THEN
    RAISE EXCEPTION 'The function owner violates the reviewed role floor.';
  END IF;

  SELECT *
  INTO operator_principal
  FROM pg_catalog.pg_roles
  WHERE rolname = 'capitolwonk_privacy_operator';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The reviewed dedicated operator principal is absent.';
  END IF;

  IF operator_principal.rolsuper
    OR operator_principal.rolcreatedb
    OR operator_principal.rolcreaterole
    OR operator_principal.rolreplication
    OR operator_principal.rolbypassrls THEN
    RAISE EXCEPTION 'The operator principal violates the reviewed role floor.';
  END IF;

  IF function_owner.oid = operator_principal.oid THEN
    RAISE EXCEPTION 'The function owner and operator principal must be distinct.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_auth_members AS membership
    WHERE membership.roleid IN (function_owner.oid, operator_principal.oid)
      OR membership.member IN (function_owner.oid, operator_principal.oid)
  ) THEN
    RAISE EXCEPTION 'The reviewed privacy roles must have no role memberships.';
  END IF;

  IF pg_catalog.has_schema_privilege(
    'capitolwonk_privacy_function_owner',
    'public',
    'CREATE'
  ) OR pg_catalog.has_schema_privilege(
    'capitolwonk_privacy_operator',
    'public',
    'CREATE'
  ) THEN
    RAISE EXCEPTION 'The reviewed privacy roles must not be able to create schema objects.';
  END IF;

  IF pg_catalog.has_table_privilege(
    'capitolwonk_privacy_function_owner',
    'public."PrivacyRequest"',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  ) OR pg_catalog.has_table_privilege(
    'capitolwonk_privacy_function_owner',
    'public."PrivacyRequestOperation"',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  ) OR pg_catalog.has_table_privilege(
    'capitolwonk_privacy_operator',
    'public."PrivacyRequest"',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  ) OR pg_catalog.has_table_privilege(
    'capitolwonk_privacy_operator',
    'public."PrivacyRequestOperation"',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  ) THEN
    RAISE EXCEPTION 'The reviewed privacy roles must begin without table privileges.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.unnest(ARRAY[
      'public.capitolwonk_privacy_operator_queue_summary()',
      'public.capitolwonk_privacy_operator_open_first_party(text)',
      'public.capitolwonk_privacy_operator_open_mailbox(text,text,timestamp with time zone,timestamp with time zone,text)',
      'public.capitolwonk_privacy_operator_acknowledge(text)',
      'public.capitolwonk_privacy_operator_review(text,text,text[],text,timestamp with time zone)',
      'public.capitolwonk_privacy_operator_resolve(text,text,text,timestamp with time zone)',
      'public.capitolwonk_privacy_operator_retention_apply()'
    ]::TEXT[]) AS expected(signature)
    WHERE pg_catalog.to_regprocedure(expected.signature) IS NULL
  ) THEN
    RAISE EXCEPTION 'One or more reviewed privacy functions are absent.';
  END IF;
END
$validation_guard$;

GRANT USAGE ON SCHEMA public TO capitolwonk_privacy_function_owner;

GRANT SELECT (
  "acknowledgedAt", "detail", "id", "requestType", "requestedAt",
  "resolution", "resolvedAt", "status"
) ON TABLE public."PrivacyRequest"
TO capitolwonk_privacy_function_owner;

GRANT UPDATE ("detail", "updatedAt")
ON TABLE public."PrivacyRequest"
TO capitolwonk_privacy_function_owner;

GRANT SELECT (
  "caseReference", "deleteAt", "exceptionCategory",
  "humanAcknowledgementAt", "identityState", "lane", "machineReceiptAt",
  "operator", "receivedAt", "requestType", "resolution", "resolvedAt",
  "sourceBoundaryCategories", "workflowStatus"
) ON TABLE public."PrivacyRequestOperation"
TO capitolwonk_privacy_function_owner;

GRANT INSERT (
  "caseReference", "exceptionCategory", "identityState", "lane",
  "machineReceiptAt", "receivedAt", "requestType",
  "sourceBoundaryCategories", "workflowStatus"
) ON TABLE public."PrivacyRequestOperation"
TO capitolwonk_privacy_function_owner;

GRANT UPDATE (
  "deleteAt", "exceptionCategory", "humanAcknowledgementAt", "identityState",
  "operator", "resolution", "resolvedAt", "sourceBoundaryCategories",
  "workflowStatus"
) ON TABLE public."PrivacyRequestOperation"
TO capitolwonk_privacy_function_owner;

GRANT DELETE ON TABLE public."PrivacyRequestOperation"
TO capitolwonk_privacy_function_owner;

REVOKE ALL PRIVILEGES ON FUNCTION
  public.capitolwonk_privacy_operator_queue_summary()
FROM PUBLIC;
REVOKE ALL PRIVILEGES ON FUNCTION
  public.capitolwonk_privacy_operator_open_first_party(TEXT)
FROM PUBLIC;
REVOKE ALL PRIVILEGES ON FUNCTION
  public.capitolwonk_privacy_operator_open_mailbox(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT)
FROM PUBLIC;
REVOKE ALL PRIVILEGES ON FUNCTION
  public.capitolwonk_privacy_operator_acknowledge(TEXT)
FROM PUBLIC;
REVOKE ALL PRIVILEGES ON FUNCTION
  public.capitolwonk_privacy_operator_review(TEXT, TEXT, TEXT[], TEXT, TIMESTAMPTZ)
FROM PUBLIC;
REVOKE ALL PRIVILEGES ON FUNCTION
  public.capitolwonk_privacy_operator_resolve(TEXT, TEXT, TEXT, TIMESTAMPTZ)
FROM PUBLIC;
REVOKE ALL PRIVILEGES ON FUNCTION
  public.capitolwonk_privacy_operator_retention_apply()
FROM PUBLIC;

GRANT USAGE ON SCHEMA public TO capitolwonk_privacy_operator;

GRANT EXECUTE ON FUNCTION
  public.capitolwonk_privacy_operator_queue_summary()
TO capitolwonk_privacy_operator;
GRANT EXECUTE ON FUNCTION
  public.capitolwonk_privacy_operator_open_first_party(TEXT)
TO capitolwonk_privacy_operator;
GRANT EXECUTE ON FUNCTION
  public.capitolwonk_privacy_operator_open_mailbox(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT)
TO capitolwonk_privacy_operator;
GRANT EXECUTE ON FUNCTION
  public.capitolwonk_privacy_operator_acknowledge(TEXT)
TO capitolwonk_privacy_operator;
GRANT EXECUTE ON FUNCTION
  public.capitolwonk_privacy_operator_review(TEXT, TEXT, TEXT[], TEXT, TIMESTAMPTZ)
TO capitolwonk_privacy_operator;
GRANT EXECUTE ON FUNCTION
  public.capitolwonk_privacy_operator_resolve(TEXT, TEXT, TEXT, TIMESTAMPTZ)
TO capitolwonk_privacy_operator;
GRANT EXECUTE ON FUNCTION
  public.capitolwonk_privacy_operator_retention_apply()
TO capitolwonk_privacy_operator;

ALTER FUNCTION public.capitolwonk_privacy_operator_queue_summary()
OWNER TO capitolwonk_privacy_function_owner;
ALTER FUNCTION public.capitolwonk_privacy_operator_open_first_party(TEXT)
OWNER TO capitolwonk_privacy_function_owner;
ALTER FUNCTION public.capitolwonk_privacy_operator_open_mailbox(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT)
OWNER TO capitolwonk_privacy_function_owner;
ALTER FUNCTION public.capitolwonk_privacy_operator_acknowledge(TEXT)
OWNER TO capitolwonk_privacy_function_owner;
ALTER FUNCTION public.capitolwonk_privacy_operator_review(TEXT, TEXT, TEXT[], TEXT, TIMESTAMPTZ)
OWNER TO capitolwonk_privacy_function_owner;
ALTER FUNCTION public.capitolwonk_privacy_operator_resolve(TEXT, TEXT, TEXT, TIMESTAMPTZ)
OWNER TO capitolwonk_privacy_function_owner;
ALTER FUNCTION public.capitolwonk_privacy_operator_retention_apply()
OWNER TO capitolwonk_privacy_function_owner;
