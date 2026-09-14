-- Minimized, server-only privacy operations record. It intentionally has no
-- account relation, contact field, free-form requester text, or provider data.
CREATE TABLE "PrivacyRequestOperation" (
  "caseReference" TEXT NOT NULL,
  "lane" TEXT NOT NULL,
  "requestType" TEXT NOT NULL,
  "receivedAt" TIMESTAMPTZ(3) NOT NULL,
  "machineReceiptAt" TIMESTAMPTZ(3) NOT NULL,
  "humanAcknowledgementAt" TIMESTAMPTZ(3),
  "operator" TEXT,
  "identityState" TEXT NOT NULL,
  "workflowStatus" TEXT NOT NULL DEFAULT 'new',
  "sourceBoundaryCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "exceptionCategory" TEXT NOT NULL DEFAULT 'none',
  "resolution" TEXT,
  "resolvedAt" TIMESTAMPTZ(3),
  "deleteAt" TIMESTAMPTZ(3),

  CONSTRAINT "PrivacyRequestOperation_pkey" PRIMARY KEY ("caseReference"),
  CONSTRAINT "PrivacyRequestOperation_caseReference_check"
    CHECK (
      char_length("caseReference") BETWEEN 12 AND 128
      AND "caseReference" ~ '^[A-Za-z0-9_-]+$'
    ),
  CONSTRAINT "PrivacyRequestOperation_lane_check"
    CHECK ("lane" IN ('first_party', 'mailbox')),
  CONSTRAINT "PrivacyRequestOperation_requestType_check"
    CHECK ("requestType" IN ('access_summary', 'data_export', 'correction', 'account_deletion', 'consent_withdrawal', 'other')),
  CONSTRAINT "PrivacyRequestOperation_receipt_order_check"
    CHECK ("machineReceiptAt" >= "receivedAt"),
  CONSTRAINT "PrivacyRequestOperation_operator_check"
    CHECK ("operator" IS NULL OR "operator" = 'privacy_owner'),
  CONSTRAINT "PrivacyRequestOperation_identityState_check"
    CHECK ("identityState" IN ('intake_identity', 'reauthenticated', 'email_control', 'escalation_required', 'not_applicable')),
  CONSTRAINT "PrivacyRequestOperation_workflowStatus_check"
    CHECK ("workflowStatus" IN ('new', 'reviewing', 'resolved')),
  CONSTRAINT "PrivacyRequestOperation_sourceBoundaryCategories_check"
    CHECK (
      "sourceBoundaryCategories" <@ ARRAY[
        'account_profile',
        'sessions_tokens',
        'saved_activity',
        'team',
        'subscription',
        'messaging',
        'brief',
        'deletion_audit_cleanup',
        'legacy_feedback',
        'provider',
        'device_local'
      ]::TEXT[]
    ),
  CONSTRAINT "PrivacyRequestOperation_exceptionCategory_check"
    CHECK ("exceptionCategory" IN ('none', 'identity_ambiguity', 'legal_requirement', 'security_safety', 'provider_boundary', 'scope_limitation', 'coverage_gap')),
  CONSTRAINT "PrivacyRequestOperation_resolution_check"
    CHECK (
      "resolution" IS NULL
      OR "resolution" IN ('fulfilled', 'partially_fulfilled', 'denied', 'redirected_to_account_deletion', 'withdrawn', 'duplicate', 'no_action_needed')
    ),
  CONSTRAINT "PrivacyRequestOperation_human_acknowledgement_check"
    CHECK (
      ("humanAcknowledgementAt" IS NULL AND "operator" IS NULL AND "workflowStatus" = 'new')
      OR (
        "humanAcknowledgementAt" IS NOT NULL
        AND "operator" = 'privacy_owner'
        AND "humanAcknowledgementAt" >= "receivedAt"
        AND "workflowStatus" IN ('reviewing', 'resolved')
      )
    ),
  CONSTRAINT "PrivacyRequestOperation_resolution_state_check"
    CHECK (
      (
        "workflowStatus" = 'resolved'
        AND "resolution" IS NOT NULL
        AND "resolvedAt" IS NOT NULL
        AND "deleteAt" IS NOT NULL
        AND "humanAcknowledgementAt" IS NOT NULL
        AND "resolvedAt" >= "humanAcknowledgementAt"
        AND "deleteAt" = "resolvedAt" + INTERVAL '24 months'
      )
      OR (
        "workflowStatus" <> 'resolved'
        AND "resolution" IS NULL
        AND "resolvedAt" IS NULL
        AND "deleteAt" IS NULL
      )
    ),
  CONSTRAINT "PrivacyRequestOperation_resolution_basis_check"
    CHECK (
      "resolution" IS NULL
      OR "resolution" NOT IN ('partially_fulfilled', 'denied')
      OR "exceptionCategory" <> 'none'
    ),
  CONSTRAINT "PrivacyRequestOperation_source_inventory_check"
    CHECK (
      "resolution" IS NULL
      OR "resolution" NOT IN ('fulfilled', 'partially_fulfilled', 'denied')
      OR cardinality("sourceBoundaryCategories") > 0
    ),
  CONSTRAINT "PrivacyRequestOperation_identity_escalation_check"
    CHECK (
      "identityState" <> 'escalation_required'
      OR (
        "exceptionCategory" = 'identity_ambiguity'
        AND ("resolution" IS NULL OR "resolution" NOT IN ('fulfilled', 'partially_fulfilled'))
      )
    ),
  CONSTRAINT "PrivacyRequestOperation_high_risk_identity_check"
    CHECK (
      "resolution" IS NULL
      OR "resolution" NOT IN ('fulfilled', 'partially_fulfilled')
      OR "requestType" NOT IN ('data_export', 'correction', 'account_deletion', 'consent_withdrawal')
      OR "identityState" = 'reauthenticated'
    )
);

CREATE INDEX "PrivacyRequestOperation_workflowStatus_receivedAt_idx"
  ON "PrivacyRequestOperation"("workflowStatus", "receivedAt");
CREATE INDEX "PrivacyRequestOperation_deleteAt_idx"
  ON "PrivacyRequestOperation"("deleteAt");
