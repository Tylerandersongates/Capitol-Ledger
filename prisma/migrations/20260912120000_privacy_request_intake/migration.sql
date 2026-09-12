-- Privacy-rights requests belong in a minimized first-party queue, not Sentry.
CREATE TABLE "PrivacyRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "requestType" TEXT NOT NULL,
  "detail" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolution" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PrivacyRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PrivacyRequest_requestType_check"
    CHECK ("requestType" IN ('access_summary', 'data_export', 'correction', 'account_deletion', 'consent_withdrawal', 'other')),
  CONSTRAINT "PrivacyRequest_detail_length_check"
    CHECK ("detail" IS NULL OR char_length("detail") <= 1000),
  CONSTRAINT "PrivacyRequest_status_check"
    CHECK ("status" IN ('new', 'reviewing', 'resolved')),
  CONSTRAINT "PrivacyRequest_resolution_check"
    CHECK (
      "resolution" IS NULL
      OR "resolution" IN ('fulfilled', 'partially_fulfilled', 'denied', 'redirected_to_account_deletion', 'withdrawn', 'duplicate', 'no_action_needed')
    ),
  CONSTRAINT "PrivacyRequest_resolution_state_check"
    CHECK (
      ("status" = 'resolved' AND "resolvedAt" IS NOT NULL AND "resolution" IS NOT NULL)
      OR ("status" <> 'resolved' AND "resolvedAt" IS NULL AND "resolution" IS NULL)
    )
);

CREATE INDEX "PrivacyRequest_userId_requestedAt_idx"
  ON "PrivacyRequest"("userId", "requestedAt");
CREATE INDEX "PrivacyRequest_status_requestedAt_idx"
  ON "PrivacyRequest"("status", "requestedAt");
CREATE UNIQUE INDEX "PrivacyRequest_one_active_type_per_user_idx"
  ON "PrivacyRequest"("userId", "requestType")
  WHERE "status" IN ('new', 'reviewing');
