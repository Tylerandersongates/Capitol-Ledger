-- Source-only privacy operator function boundary.
--
-- This artifact is intentionally outside prisma/migrations. It creates no
-- principal, credential, schema, grant, or binding and is not approved for
-- production execution. The companion checker executes it only in ephemeral
-- PGlite after creating the two reviewed tables.

DO $validation_guard$
BEGIN
  IF pg_catalog.current_setting(
    'capitolwonk.operator_function_boundary_validation',
    TRUE
  ) IS DISTINCT FROM 'ephemeral-only' THEN
    RAISE EXCEPTION 'Privacy operator function boundary is validation-only.';
  END IF;
END
$validation_guard$;

CREATE OR REPLACE FUNCTION public.capitolwonk_privacy_operator_queue_summary()
RETURNS TABLE (
  "newCount" INTEGER,
  "newOldestAgeSeconds" INTEGER,
  "reviewingCount" INTEGER,
  "reviewingOldestAgeSeconds" INTEGER,
  "fulfilledCount" INTEGER,
  "partiallyFulfilledCount" INTEGER,
  "deniedCount" INTEGER,
  "redirectedToAccountDeletionCount" INTEGER,
  "withdrawnCount" INTEGER,
  "duplicateCount" INTEGER,
  "noActionNeededCount" INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
  SELECT
    COUNT(*) FILTER (WHERE request."status" = 'new')::INTEGER,
    FLOOR(EXTRACT(EPOCH FROM (pg_catalog.statement_timestamp() - MIN(request."requestedAt") FILTER (WHERE request."status" = 'new'))))::INTEGER,
    COUNT(*) FILTER (WHERE request."status" = 'reviewing')::INTEGER,
    FLOOR(EXTRACT(EPOCH FROM (pg_catalog.statement_timestamp() - MIN(request."requestedAt") FILTER (WHERE request."status" = 'reviewing'))))::INTEGER,
    COUNT(*) FILTER (WHERE request."status" = 'resolved' AND request."resolution" = 'fulfilled')::INTEGER,
    COUNT(*) FILTER (WHERE request."status" = 'resolved' AND request."resolution" = 'partially_fulfilled')::INTEGER,
    COUNT(*) FILTER (WHERE request."status" = 'resolved' AND request."resolution" = 'denied')::INTEGER,
    COUNT(*) FILTER (WHERE request."status" = 'resolved' AND request."resolution" = 'redirected_to_account_deletion')::INTEGER,
    COUNT(*) FILTER (WHERE request."status" = 'resolved' AND request."resolution" = 'withdrawn')::INTEGER,
    COUNT(*) FILTER (WHERE request."status" = 'resolved' AND request."resolution" = 'duplicate')::INTEGER,
    COUNT(*) FILTER (WHERE request."status" = 'resolved' AND request."resolution" = 'no_action_needed')::INTEGER
  FROM public."PrivacyRequest" AS request
$function$;

CREATE OR REPLACE FUNCTION public.capitolwonk_privacy_operator_open_first_party(
  p_case_reference TEXT
)
RETURNS TABLE (
  "caseReference" TEXT,
  "lane" TEXT,
  "requestType" TEXT,
  "receivedAt" TIMESTAMPTZ,
  "machineReceiptAt" TIMESTAMPTZ,
  "humanAcknowledgementAt" TIMESTAMPTZ,
  "operator" TEXT,
  "identityState" TEXT,
  "workflowStatus" TEXT,
  "sourceBoundaryCategories" TEXT[],
  "exceptionCategory" TEXT,
  "resolution" TEXT,
  "resolvedAt" TIMESTAMPTZ,
  "deleteAt" TIMESTAMPTZ
)
LANGUAGE SQL
VOLATILE
STRICT
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
  WITH inserted AS (
    INSERT INTO public."PrivacyRequestOperation" (
      "caseReference", "lane", "requestType", "receivedAt",
      "machineReceiptAt", "identityState", "workflowStatus",
      "sourceBoundaryCategories", "exceptionCategory"
    )
    SELECT
      request."id", 'first_party', request."requestType",
      request."requestedAt", request."acknowledgedAt", 'intake_identity',
      'new', ARRAY[]::TEXT[], 'none'
    FROM public."PrivacyRequest" AS request
    WHERE request."id" = p_case_reference
    ON CONFLICT ("caseReference") DO NOTHING
    RETURNING
      "caseReference", "lane", "requestType", "receivedAt",
      "machineReceiptAt", "humanAcknowledgementAt", "operator",
      "identityState", "workflowStatus", "sourceBoundaryCategories",
      "exceptionCategory", "resolution", "resolvedAt", "deleteAt"
  )
  SELECT
    inserted."caseReference", inserted."lane", inserted."requestType",
    inserted."receivedAt", inserted."machineReceiptAt",
    inserted."humanAcknowledgementAt", inserted."operator",
    inserted."identityState", inserted."workflowStatus",
    inserted."sourceBoundaryCategories", inserted."exceptionCategory",
    inserted."resolution", inserted."resolvedAt", inserted."deleteAt"
  FROM inserted
  UNION ALL
  SELECT
    existing."caseReference", existing."lane", existing."requestType",
    existing."receivedAt", existing."machineReceiptAt",
    existing."humanAcknowledgementAt", existing."operator",
    existing."identityState", existing."workflowStatus",
    existing."sourceBoundaryCategories", existing."exceptionCategory",
    existing."resolution", existing."resolvedAt", existing."deleteAt"
  FROM public."PrivacyRequestOperation" AS existing
  WHERE existing."caseReference" = p_case_reference
    AND existing."lane" = 'first_party'
    AND NOT EXISTS (SELECT 1 FROM inserted)
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.capitolwonk_privacy_operator_open_mailbox(
  p_case_reference TEXT,
  p_request_type TEXT,
  p_received_at TIMESTAMPTZ,
  p_machine_receipt_at TIMESTAMPTZ,
  p_identity_state TEXT
)
RETURNS TABLE (
  "caseReference" TEXT,
  "lane" TEXT,
  "requestType" TEXT,
  "receivedAt" TIMESTAMPTZ,
  "machineReceiptAt" TIMESTAMPTZ,
  "humanAcknowledgementAt" TIMESTAMPTZ,
  "operator" TEXT,
  "identityState" TEXT,
  "workflowStatus" TEXT,
  "sourceBoundaryCategories" TEXT[],
  "exceptionCategory" TEXT,
  "resolution" TEXT,
  "resolvedAt" TIMESTAMPTZ,
  "deleteAt" TIMESTAMPTZ
)
LANGUAGE SQL
VOLATILE
STRICT
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
  INSERT INTO public."PrivacyRequestOperation" (
    "caseReference", "lane", "requestType", "receivedAt",
    "machineReceiptAt", "identityState", "workflowStatus",
    "sourceBoundaryCategories", "exceptionCategory"
  )
  SELECT
    p_case_reference,
    'mailbox',
    p_request_type,
    p_received_at,
    p_machine_receipt_at,
    p_identity_state,
    'new',
    ARRAY[]::TEXT[],
    CASE WHEN p_identity_state = 'escalation_required' THEN 'identity_ambiguity' ELSE 'none' END
  WHERE p_identity_state IN ('email_control', 'escalation_required')
  RETURNING
    "caseReference", "lane", "requestType", "receivedAt",
    "machineReceiptAt", "humanAcknowledgementAt", "operator",
    "identityState", "workflowStatus", "sourceBoundaryCategories",
    "exceptionCategory", "resolution", "resolvedAt", "deleteAt"
$function$;

CREATE OR REPLACE FUNCTION public.capitolwonk_privacy_operator_acknowledge(
  p_case_reference TEXT
)
RETURNS TABLE (
  "caseReference" TEXT,
  "lane" TEXT,
  "requestType" TEXT,
  "receivedAt" TIMESTAMPTZ,
  "machineReceiptAt" TIMESTAMPTZ,
  "humanAcknowledgementAt" TIMESTAMPTZ,
  "operator" TEXT,
  "identityState" TEXT,
  "workflowStatus" TEXT,
  "sourceBoundaryCategories" TEXT[],
  "exceptionCategory" TEXT,
  "resolution" TEXT,
  "resolvedAt" TIMESTAMPTZ,
  "deleteAt" TIMESTAMPTZ
)
LANGUAGE SQL
VOLATILE
STRICT
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
  UPDATE public."PrivacyRequestOperation" AS operation
  SET
    "humanAcknowledgementAt" = pg_catalog.statement_timestamp(),
    "operator" = 'privacy_owner',
    "workflowStatus" = 'reviewing'
  WHERE operation."caseReference" = p_case_reference
    AND operation."workflowStatus" = 'new'
    AND operation."humanAcknowledgementAt" IS NULL
  RETURNING
    operation."caseReference", operation."lane", operation."requestType",
    operation."receivedAt", operation."machineReceiptAt",
    operation."humanAcknowledgementAt", operation."operator",
    operation."identityState", operation."workflowStatus",
    operation."sourceBoundaryCategories", operation."exceptionCategory",
    operation."resolution", operation."resolvedAt", operation."deleteAt"
$function$;

CREATE OR REPLACE FUNCTION public.capitolwonk_privacy_operator_review(
  p_case_reference TEXT,
  p_identity_state TEXT,
  p_source_boundary_categories TEXT[],
  p_exception_category TEXT,
  p_reauthenticated_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  "caseReference" TEXT,
  "lane" TEXT,
  "requestType" TEXT,
  "receivedAt" TIMESTAMPTZ,
  "machineReceiptAt" TIMESTAMPTZ,
  "humanAcknowledgementAt" TIMESTAMPTZ,
  "operator" TEXT,
  "identityState" TEXT,
  "workflowStatus" TEXT,
  "sourceBoundaryCategories" TEXT[],
  "exceptionCategory" TEXT,
  "resolution" TEXT,
  "resolvedAt" TIMESTAMPTZ,
  "deleteAt" TIMESTAMPTZ
)
LANGUAGE SQL
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
  UPDATE public."PrivacyRequestOperation" AS operation
  SET
    "identityState" = p_identity_state,
    "sourceBoundaryCategories" = ARRAY(
      SELECT DISTINCT category
      FROM unnest(p_source_boundary_categories) AS category
      ORDER BY category
    ),
    "exceptionCategory" = p_exception_category,
    "operator" = 'privacy_owner'
  WHERE operation."caseReference" = p_case_reference
    AND operation."workflowStatus" = 'reviewing'
    AND operation."humanAcknowledgementAt" IS NOT NULL
    AND (
      p_identity_state <> 'escalation_required'
      OR p_exception_category = 'identity_ambiguity'
    )
    AND (
      p_identity_state <> 'reauthenticated'
      OR (
        p_reauthenticated_at IS NOT NULL
        AND p_reauthenticated_at <= pg_catalog.statement_timestamp()
        AND p_reauthenticated_at >= pg_catalog.statement_timestamp() - INTERVAL '15 minutes'
      )
    )
  RETURNING
    operation."caseReference", operation."lane", operation."requestType",
    operation."receivedAt", operation."machineReceiptAt",
    operation."humanAcknowledgementAt", operation."operator",
    operation."identityState", operation."workflowStatus",
    operation."sourceBoundaryCategories", operation."exceptionCategory",
    operation."resolution", operation."resolvedAt", operation."deleteAt"
$function$;

CREATE OR REPLACE FUNCTION public.capitolwonk_privacy_operator_resolve(
  p_case_reference TEXT,
  p_resolution TEXT,
  p_exception_category TEXT,
  p_reauthenticated_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  "caseReference" TEXT,
  "lane" TEXT,
  "requestType" TEXT,
  "receivedAt" TIMESTAMPTZ,
  "machineReceiptAt" TIMESTAMPTZ,
  "humanAcknowledgementAt" TIMESTAMPTZ,
  "operator" TEXT,
  "identityState" TEXT,
  "workflowStatus" TEXT,
  "sourceBoundaryCategories" TEXT[],
  "exceptionCategory" TEXT,
  "resolution" TEXT,
  "resolvedAt" TIMESTAMPTZ,
  "deleteAt" TIMESTAMPTZ
)
LANGUAGE SQL
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
  UPDATE public."PrivacyRequestOperation" AS operation
  SET
    "workflowStatus" = 'resolved',
    "resolution" = p_resolution,
    "resolvedAt" = pg_catalog.statement_timestamp(),
    "deleteAt" = pg_catalog.statement_timestamp() + INTERVAL '24 months',
    "exceptionCategory" = p_exception_category,
    "operator" = 'privacy_owner'
  WHERE operation."caseReference" = p_case_reference
    AND operation."workflowStatus" = 'reviewing'
    AND operation."humanAcknowledgementAt" IS NOT NULL
    AND (
      operation."requestType" NOT IN ('data_export', 'correction', 'account_deletion', 'consent_withdrawal')
      OR p_resolution NOT IN ('fulfilled', 'partially_fulfilled')
      OR (
        operation."identityState" = 'reauthenticated'
        AND p_reauthenticated_at IS NOT NULL
        AND p_reauthenticated_at <= pg_catalog.statement_timestamp()
        AND p_reauthenticated_at >= pg_catalog.statement_timestamp() - INTERVAL '15 minutes'
      )
    )
    AND (
      p_resolution NOT IN ('partially_fulfilled', 'denied')
      OR p_exception_category <> 'none'
    )
    AND (
      p_resolution NOT IN ('fulfilled', 'partially_fulfilled', 'denied')
      OR cardinality(operation."sourceBoundaryCategories") > 0
    )
  RETURNING
    operation."caseReference", operation."lane", operation."requestType",
    operation."receivedAt", operation."machineReceiptAt",
    operation."humanAcknowledgementAt", operation."operator",
    operation."identityState", operation."workflowStatus",
    operation."sourceBoundaryCategories", operation."exceptionCategory",
    operation."resolution", operation."resolvedAt", operation."deleteAt"
$function$;

CREATE OR REPLACE FUNCTION public.capitolwonk_privacy_operator_retention_apply()
RETURNS TABLE (
  "optionalDetailsMinimized" INTEGER,
  "closedOperationRecordsDeleted" INTEGER
)
LANGUAGE SQL
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
  WITH minimized AS (
    UPDATE public."PrivacyRequest" AS request
    SET "detail" = NULL, "updatedAt" = pg_catalog.statement_timestamp()
    WHERE request."status" = 'resolved'
      AND request."detail" IS NOT NULL
      AND request."resolvedAt" <= pg_catalog.statement_timestamp() - INTERVAL '30 days'
    RETURNING 1
  ),
  deleted AS (
    DELETE FROM public."PrivacyRequestOperation" AS operation
    WHERE operation."workflowStatus" = 'resolved'
      AND operation."deleteAt" IS NOT NULL
      AND operation."deleteAt" <= pg_catalog.statement_timestamp()
    RETURNING 1
  )
  SELECT
    (SELECT COUNT(*)::INTEGER FROM minimized),
    (SELECT COUNT(*)::INTEGER FROM deleted)
$function$;
