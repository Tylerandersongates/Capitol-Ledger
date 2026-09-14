#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  privacyRequestArtifactKinds,
  privacyRequestArtifactRetention,
  verifyPrivacyRequestArtifactDeletion,
  verifyPrivacyRestoreFloor,
  type PrivacyRestoreFloorVerificationInput
} from "@/lib/privacy-request-artifact-restore-floor";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

const contract = JSON.parse(
  read("docs/privacy-artifact-deletion-and-restore-floor-2026-09-14.json")
);
const runbook = read(
  "docs/privacy-artifact-deletion-and-restore-floor-verifier-2026-09-14.md"
);
const packageDocument = JSON.parse(read("package.json"));
const verifierSource = read("lib/privacy-request-artifact-restore-floor.ts");

assert.equal(contract.contractVersion, "2026-09-14");
assert.equal(contract.decisionStatus, "pure_verifiers_only_locally_validated");
assert.equal(contract.productionExecutionAuthorized, false);
assert.deepEqual(contract.artifactDeletion.artifactKinds, privacyRequestArtifactKinds);
assert.equal(
  contract.artifactDeletion.retention.mailboxMessageDaysAfterResolution,
  privacyRequestArtifactRetention.mailboxMessageDaysAfterResolution
);
assert.equal(
  contract.artifactDeletion.retention.mailboxAttachmentDaysAfterClassification,
  privacyRequestArtifactRetention.mailboxAttachmentDays
);
assert.equal(
  contract.artifactDeletion.retention.exportArtifactHoursAfterCreation,
  privacyRequestArtifactRetention.exportArtifactHours
);
assert.equal(contract.artifactDeletion.deletionCapabilityImplemented, false);
assert.equal(contract.artifactDeletion.providerBindingImplemented, false);
assert.equal(contract.restoreFloor.eligibleAuthorizesTrafficSwitch, false);
assert.equal(contract.restoreFloor.serviceStateForEveryDecision, "keep_offline");
assert.equal(contract.restoreFloor.restoreCapabilityImplemented, false);
assert.equal(contract.restoreFloor.databaseBindingImplemented, false);
assert.equal(contract.restoreFloor.trafficSwitchCapabilityImplemented, false);

const day = 24 * 60 * 60 * 1000;
const mailboxResolution = new Date("2026-09-14T18:00:00.000Z");
const mailboxDeadline = new Date(mailboxResolution.getTime() + 30 * day);

assert.deepEqual(
  verifyPrivacyRequestArtifactDeletion({
    artifactKind: "mailbox_message_and_duplicate_copies",
    deletedAt: mailboxDeadline,
    deletionConfirmed: true,
    lifecycleAnchorAt: mailboxResolution,
    remainingArtifactCopies: 0
  }),
  {
    artifactKind: "mailbox_message_and_duplicate_copies",
    decision: "verified",
    deletedAt: mailboxDeadline.toISOString(),
    deletionDeadlineAt: mailboxDeadline.toISOString(),
    reasons: []
  }
);

const lateMailboxEvidence = verifyPrivacyRequestArtifactDeletion({
  artifactKind: "mailbox_message_and_duplicate_copies",
  deletedAt: new Date(mailboxDeadline.getTime() + 1),
  deletionConfirmed: true,
  lifecycleAnchorAt: mailboxResolution,
  remainingArtifactCopies: 0
});
assert.equal(lateMailboxEvidence.decision, "not_verified");
assert.deepEqual(lateMailboxEvidence.reasons, ["outside_retention_window"]);

const attachmentClassification = new Date("2026-09-14T19:00:00.000Z");
assert.equal(
  verifyPrivacyRequestArtifactDeletion({
    artifactKind: "mailbox_attachment",
    deletedAt: new Date(attachmentClassification.getTime() + 6 * day),
    deletionConfirmed: true,
    lifecycleAnchorAt: attachmentClassification,
    remainingArtifactCopies: 0
  }).decision,
  "verified"
);

const exportCreatedAt = new Date("2026-09-14T20:00:00.000Z");
const exportRetrievedAt = new Date("2026-09-16T20:00:00.000Z");
const exportEvidence = verifyPrivacyRequestArtifactDeletion({
  artifactKind: "export_artifact_and_access_token",
  deletedAt: exportRetrievedAt,
  deletionConfirmed: true,
  lifecycleAnchorAt: exportCreatedAt,
  remainingAccessTokens: 0,
  remainingArtifactCopies: 0,
  retrievedAt: exportRetrievedAt
});
assert.equal(exportEvidence.decision, "verified");
assert.equal(exportEvidence.deletionDeadlineAt, exportRetrievedAt.toISOString());

const incompleteExportEvidence = verifyPrivacyRequestArtifactDeletion({
  artifactKind: "export_artifact_and_access_token",
  deletedAt: exportRetrievedAt,
  deletionConfirmed: false,
  lifecycleAnchorAt: exportCreatedAt,
  remainingAccessTokens: 1,
  remainingArtifactCopies: 1,
  retrievedAt: exportRetrievedAt
});
assert.equal(incompleteExportEvidence.decision, "not_verified");
assert.deepEqual(incompleteExportEvidence.reasons, [
  "artifact_copies_remain",
  "access_tokens_remain",
  "deletion_not_confirmed"
]);

const invalidRetrievalEvidence = verifyPrivacyRequestArtifactDeletion({
  artifactKind: "export_artifact_and_access_token",
  deletedAt: exportCreatedAt,
  deletionConfirmed: true,
  lifecycleAnchorAt: exportCreatedAt,
  remainingAccessTokens: 0,
  remainingArtifactCopies: -1,
  retrievedAt: new Date(exportCreatedAt.getTime() - 1)
});
assert.equal(invalidRetrievalEvidence.decision, "not_verified");
assert.deepEqual(invalidRetrievalEvidence.reasons, [
  "invalid_timestamp",
  "invalid_aggregate"
]);

const malformedDeletionEvidence = verifyPrivacyRequestArtifactDeletion({
  artifactKind: "mailbox_attachment",
  deletedAt: new Date(Number.NaN),
  deletionConfirmed: true,
  lifecycleAnchorAt: attachmentClassification,
  remainingArtifactCopies: 0
});
assert.equal(malformedDeletionEvidence.decision, "not_verified");
assert.deepEqual(malformedDeletionEvidence.reasons, ["invalid_timestamp"]);

const exercise = contract.restoreFloor.knownSanitizedExercise;
const restoreBase: PrivacyRestoreFloorVerificationInput = {
  applicationTrafficAbsent: true,
  cleanupJobsReconciled: true,
  contradictoryDeletionEvidence: false,
  databaseTargetVerified: true,
  deidentifiedCompletionPresent: true,
  deletedFixtureAbsent: true,
  deletionWatermarkAt: new Date(exercise.deletionWatermark),
  expectedSchemaAndMigrationState: true,
  newestStateTrustworthy: true,
  outboundProviderEffectsAbsent: true,
  projectTargetVerified: true,
  proposedRestorePointAt: new Date(exercise.postDeletionPoint),
  protectedAggregatesUnchanged: true,
  qualifyingCompletedDeletionCount: 1,
  survivorControlPresentUnchanged: true,
  watermarkQueryVerified: true
};

const rejectedPreDeletionPoint = verifyPrivacyRestoreFloor({
  ...restoreBase,
  deidentifiedCompletionPresent: false,
  deletedFixtureAbsent: false,
  proposedRestorePointAt: new Date(exercise.preDeletionPoint)
});
assert.equal(rejectedPreDeletionPoint.decision, exercise.preDeletionDecision);
assert.deepEqual(rejectedPreDeletionPoint.reasons, ["below_deletion_floor"]);
assert.equal(rejectedPreDeletionPoint.serviceState, "keep_offline");
assert.equal(rejectedPreDeletionPoint.trafficSwitchAuthorized, false);

const eligiblePostDeletionPoint = verifyPrivacyRestoreFloor(restoreBase);
assert.equal(eligiblePostDeletionPoint.decision, exercise.postDeletionDecision);
assert.deepEqual(eligiblePostDeletionPoint.reasons, []);
assert.equal(eligiblePostDeletionPoint.serviceState, "keep_offline");
assert.equal(eligiblePostDeletionPoint.trafficSwitchAuthorized, false);

assert.equal(
  verifyPrivacyRestoreFloor({
    ...restoreBase,
    proposedRestorePointAt: new Date(exercise.deletionWatermark)
  }).decision,
  "eligible_for_further_recovery_review"
);

const noWatermark = verifyPrivacyRestoreFloor({
  ...restoreBase,
  deidentifiedCompletionPresent: false,
  deletedFixtureAbsent: false,
  deletionWatermarkAt: null,
  qualifyingCompletedDeletionCount: 0
});
assert.equal(noWatermark.decision, "eligible_for_further_recovery_review");

const inconsistentWatermark = verifyPrivacyRestoreFloor({
  ...restoreBase,
  qualifyingCompletedDeletionCount: 0
});
assert.equal(inconsistentWatermark.decision, "reject");
assert.ok(inconsistentWatermark.reasons.includes("watermark_count_mismatch"));

const contradictoryEvidence = verifyPrivacyRestoreFloor({
  ...restoreBase,
  contradictoryDeletionEvidence: true
});
assert.equal(contradictoryEvidence.decision, "reject");
assert.ok(
  contradictoryEvidence.reasons.includes("contradictory_deletion_evidence")
);

for (const [field, reason] of [
  ["survivorControlPresentUnchanged", "survivor_control_changed_or_missing"],
  ["expectedSchemaAndMigrationState", "schema_or_migration_state_unverified"],
  ["cleanupJobsReconciled", "cleanup_jobs_unreconciled"],
  ["protectedAggregatesUnchanged", "protected_aggregates_changed"],
  ["applicationTrafficAbsent", "application_traffic_present"],
  ["outboundProviderEffectsAbsent", "outbound_provider_effect_present"]
] as const) {
  const result = verifyPrivacyRestoreFloor({ ...restoreBase, [field]: false });
  assert.equal(result.decision, "reject");
  assert.ok(result.reasons.includes(reason));
}

assert.deepEqual(Object.keys(exportEvidence).sort(), [
  "artifactKind",
  "decision",
  "deletedAt",
  "deletionDeadlineAt",
  "reasons"
]);
for (const prohibitedField of [
  "caseReference",
  "userId",
  "email",
  "contactValue",
  "mailboxBody",
  "attachmentName",
  "exportContent",
  "downloadUrl",
  "accessToken",
  "providerIdentifier",
  "credential",
  "rawError"
]) {
  assert.equal(
    Object.prototype.hasOwnProperty.call(exportEvidence, prohibitedField),
    false,
    `artifact evidence must omit ${prohibitedField}`
  );
}

assert.match(runbook, /local pure verification only/i);
assert.match(runbook, /not a deletion implementation/i);
assert.match(runbook, /serviceState = keep_offline/);
assert.match(runbook, /Eligibility does not authorize a restore/i);
assert.match(runbook, /T-pre[\s\S]+T-delete[\s\S]+T-post/);

assert.equal(
  /getPrisma|\$queryRaw|\bfetch\s*\(|node:fs|process\.env|process\.argv|console\./.test(
    verifierSource
  ),
  false,
  "pure verifiers must not acquire database, network, filesystem, environment, argument, or logging bindings"
);

function listSourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(entryPath);
    return /\.(?:js|jsx|mjs|ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

for (const applicationFile of listSourceFiles(path.join(repositoryRoot, "app"))) {
  const source = fs.readFileSync(applicationFile, "utf8");
  assert.equal(
    /privacy-request-artifact-restore-floor|verifyPrivacyRequestArtifactDeletion|verifyPrivacyRestoreFloor/.test(
      source
    ),
    false,
    `${path.relative(repositoryRoot, applicationFile)} must not expose the pure verifiers`
  );
}

assert.match(
  packageDocument.scripts["privacy-request:artifact-restore-floor:check"],
  /check-privacy-request-artifact-restore-floor\.ts/
);
assert.match(
  packageDocument.scripts["privacy-request:check"],
  /check-privacy-request-artifact-restore-floor\.ts/
);

console.log("Privacy artifact-deletion and restore-floor verifier checks passed.");
