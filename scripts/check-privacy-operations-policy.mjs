#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const policyPath = new URL("../docs/privacy-operations-policy-2026-09-14.json", import.meta.url);
const policyDocumentPath = new URL("../docs/privacy-operations-policy-2026-09-14.md", import.meta.url);
const environmentPath = new URL("../.env.example", import.meta.url);

const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
const policyDocument = fs.readFileSync(policyDocumentPath, "utf8");
const environment = fs.readFileSync(environmentPath, "utf8");

assert.equal(policy.policyVersion, "2026-09-14");
assert.equal(policy.decisionStatus, "approved_for_implementation_and_isolated_synthetic_validation");
assert.equal(policy.productionActivationAuthorized, false);
assert.equal(policy.owner.primary, "Tyler");
assert.equal(policy.owner.backup, null);
assert.equal(policy.owner.coverageModel, "single_owner_pause");

assert.deepEqual(policy.reviewCadence.reviewWindows, ["10:00", "16:00"]);
assert.equal(policy.reviewCadence.timezone, "America/Los_Angeles");
assert.equal(policy.reviewCadence.internalHumanAcknowledgementTargetBusinessDays, 2);
assert.equal(policy.reviewCadence.internalCasePlanTargetBusinessDays, 5);
assert.equal(policy.reviewCadence.publicUniversalDeadline, null);

assert.equal(
  policy.register.currentState,
  "source_implemented_default_off_synthetic_validation_passed"
);
assert.equal(policy.register.productionMigrationState, "source_only_not_applied");
assert.equal(policy.register.runtimeSurface, "server_only_no_public_route");
assert.equal(policy.register.syntheticBoundary, "ephemeral_isolated_postgresql_with_synthetic_identities_only");
for (const prohibitedField of ["passwords", "government_identity_documents", "raw_mailbox_bodies", "export_payloads"]) {
  assert.ok(policy.register.prohibitedData.includes(prohibitedField));
}
assert.deepEqual(policy.register.vocabulary.lanes, ["first_party", "mailbox"]);
assert.deepEqual(policy.register.vocabulary.operatorRoles, ["privacy_owner"]);
assert.deepEqual(policy.register.vocabulary.requestTypes, [
  "access_summary",
  "data_export",
  "correction",
  "account_deletion",
  "consent_withdrawal",
  "other"
]);
assert.deepEqual(policy.register.vocabulary.identityStates, [
  "intake_identity",
  "reauthenticated",
  "email_control",
  "escalation_required",
  "not_applicable"
]);
assert.deepEqual(policy.register.vocabulary.workflowStatuses, ["new", "reviewing", "resolved"]);
assert.deepEqual(policy.register.vocabulary.sourceBoundaryCategories, [
  "account_profile",
  "sessions_tokens",
  "saved_activity",
  "team",
  "subscription",
  "messaging",
  "brief",
  "deletion_audit_cleanup",
  "legacy_feedback",
  "provider",
  "device_local"
]);
assert.deepEqual(policy.register.vocabulary.exceptionCategories, [
  "none",
  "identity_ambiguity",
  "legal_requirement",
  "security_safety",
  "provider_boundary",
  "scope_limitation",
  "coverage_gap"
]);
assert.deepEqual(policy.register.vocabulary.resolutions, [
  "fulfilled",
  "partially_fulfilled",
  "denied",
  "redirected_to_account_deletion",
  "withdrawn",
  "duplicate",
  "no_action_needed"
]);

assert.equal(policy.identity.highRiskFulfillment, "fresh_reauthentication_within_15_minutes_using_existing_account_channel");
assert.equal(policy.identity.governmentIdAllowed, false);
assert.equal(policy.identity.purchaseReceiptAllowed, false);
assert.equal(policy.identity.providerIdentifierAllowed, false);

assert.equal(policy.retention.minimalClosedCaseRecordMonths, 24);
assert.equal(policy.retention.optionalDetailDaysAfterResolution, 30);
assert.equal(policy.retention.mailboxCopyDaysAfterResolution, 30);
assert.equal(policy.retention.mailboxAttachmentDaysAfterClassification, 7);
assert.equal(policy.retention.exportArtifactHours, 168);
assert.equal(policy.retention.syntheticExerciseDataHours, 24);
assert.equal(policy.retention.exceptionReviewDays, 30);
assert.equal(policy.retention.backupRecoveryWindowDays, 7);
assert.equal(policy.retention.indefiniteRetentionAllowed, false);

assert.ok(policyDocument.includes("cppa.ca.gov/regulations/pdf/ccpa_statute_eff_20260101.pdf"));
assert.ok(policyDocument.includes("eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679"));
assert.ok(policyDocument.includes("fresh reauthentication"));
assert.ok(policyDocument.includes("two consecutive review windows"));
assert.ok(policyDocument.includes("24 months after resolution"));

for (const setting of [
  'PRIVACY_REQUEST_INTAKE_ENABLED="false"',
  'PRIVACY_REQUEST_MONITOR_ENABLED="false"',
  'PRIVACY_REQUEST_OPERATIONS_ENABLED="false"',
  'CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED="false"',
  'ACCOUNT_DELETION_ENABLED="false"',
  'APP_STORE_SERVER_VERIFICATION_ENABLED="false"',
  'APP_STORE_SERVER_NOTIFICATIONS_ENABLED="false"'
]) {
  assert.ok(environment.includes(setting), `${setting} must remain default-off`);
}

console.log("Privacy-operations policy checks passed.");
