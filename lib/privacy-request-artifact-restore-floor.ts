export const privacyRequestArtifactKinds = [
  "mailbox_message_and_duplicate_copies",
  "mailbox_attachment",
  "export_artifact_and_access_token"
] as const;

export type PrivacyRequestArtifactKind =
  (typeof privacyRequestArtifactKinds)[number];

export const privacyRequestArtifactEvidenceReasons = [
  "invalid_timestamp",
  "invalid_aggregate",
  "deletion_not_confirmed",
  "artifact_copies_remain",
  "access_tokens_remain",
  "outside_retention_window"
] as const;

export type PrivacyRequestArtifactEvidenceReason =
  (typeof privacyRequestArtifactEvidenceReasons)[number];

const millisecondsPerDay = 24 * 60 * 60 * 1000;

export const privacyRequestArtifactRetention = {
  exportArtifactHours: 168,
  mailboxAttachmentDays: 7,
  mailboxMessageDaysAfterResolution: 30
} as const;

type CommonArtifactDeletionEvidenceInput = {
  deletedAt: Date | null;
  deletionConfirmed: boolean;
  lifecycleAnchorAt: Date;
  remainingArtifactCopies: number;
};

export type PrivacyRequestArtifactDeletionEvidenceInput =
  | (CommonArtifactDeletionEvidenceInput & {
      artifactKind: "mailbox_message_and_duplicate_copies";
    })
  | (CommonArtifactDeletionEvidenceInput & {
      artifactKind: "mailbox_attachment";
    })
  | (CommonArtifactDeletionEvidenceInput & {
      artifactKind: "export_artifact_and_access_token";
      remainingAccessTokens: number;
      retrievedAt: Date | null;
    });

export type PrivacyRequestArtifactDeletionEvidence = {
  artifactKind: PrivacyRequestArtifactKind;
  decision: "not_verified" | "verified";
  deletedAt: string | null;
  deletionDeadlineAt: string | null;
  reasons: PrivacyRequestArtifactEvidenceReason[];
};

function isValidDate(value: Date | null): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function isValidAggregate(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * millisecondsPerDay);
}

function artifactDeletionDeadline(
  input: PrivacyRequestArtifactDeletionEvidenceInput
): Date | null {
  if (!isValidDate(input.lifecycleAnchorAt)) return null;

  if (input.artifactKind === "mailbox_message_and_duplicate_copies") {
    return addDays(
      input.lifecycleAnchorAt,
      privacyRequestArtifactRetention.mailboxMessageDaysAfterResolution
    );
  }

  if (input.artifactKind === "mailbox_attachment") {
    return addDays(
      input.lifecycleAnchorAt,
      privacyRequestArtifactRetention.mailboxAttachmentDays
    );
  }

  const maximumExpiry = new Date(
    input.lifecycleAnchorAt.getTime() +
      privacyRequestArtifactRetention.exportArtifactHours * 60 * 60 * 1000
  );
  if (input.retrievedAt === null) return maximumExpiry;
  if (
    !isValidDate(input.retrievedAt) ||
    input.retrievedAt.getTime() < input.lifecycleAnchorAt.getTime()
  ) {
    return null;
  }
  return input.retrievedAt.getTime() < maximumExpiry.getTime()
    ? input.retrievedAt
    : maximumExpiry;
}

/**
 * Verifies only sanitized, aggregate deletion evidence. It does not delete an
 * artifact, contact a mailbox/provider, accept a case identifier, or persist
 * evidence. The caller must perform any real deletion under a separately
 * reviewed and approved provider-specific procedure.
 */
export function verifyPrivacyRequestArtifactDeletion(
  input: PrivacyRequestArtifactDeletionEvidenceInput
): PrivacyRequestArtifactDeletionEvidence {
  const reasons: PrivacyRequestArtifactEvidenceReason[] = [];
  const deadline = artifactDeletionDeadline(input);

  if (!deadline || !isValidDate(input.lifecycleAnchorAt)) {
    reasons.push("invalid_timestamp");
  }
  if (!isValidAggregate(input.remainingArtifactCopies)) {
    reasons.push("invalid_aggregate");
  } else if (input.remainingArtifactCopies !== 0) {
    reasons.push("artifact_copies_remain");
  }
  if (input.artifactKind === "export_artifact_and_access_token") {
    if (!isValidAggregate(input.remainingAccessTokens)) {
      reasons.push("invalid_aggregate");
    } else if (input.remainingAccessTokens !== 0) {
      reasons.push("access_tokens_remain");
    }
  }
  if (!input.deletionConfirmed) {
    reasons.push("deletion_not_confirmed");
  }
  if (!isValidDate(input.deletedAt)) {
    reasons.push("invalid_timestamp");
  } else if (
    !deadline ||
    input.deletedAt.getTime() < input.lifecycleAnchorAt.getTime()
  ) {
    reasons.push("invalid_timestamp");
  } else if (input.deletedAt.getTime() > deadline.getTime()) {
    reasons.push("outside_retention_window");
  }

  const uniqueReasons = [...new Set(reasons)];
  return {
    artifactKind: input.artifactKind,
    decision: uniqueReasons.length === 0 ? "verified" : "not_verified",
    deletedAt: isValidDate(input.deletedAt) ? input.deletedAt.toISOString() : null,
    deletionDeadlineAt: deadline?.toISOString() ?? null,
    reasons: uniqueReasons
  };
}

export const privacyRestoreFloorReasons = [
  "invalid_timestamp",
  "invalid_aggregate",
  "newest_state_not_trustworthy",
  "target_not_verified",
  "watermark_query_not_verified",
  "contradictory_deletion_evidence",
  "watermark_missing",
  "watermark_count_mismatch",
  "below_deletion_floor",
  "deleted_fixture_present",
  "deidentified_completion_missing",
  "survivor_control_changed_or_missing",
  "schema_or_migration_state_unverified",
  "cleanup_jobs_unreconciled",
  "protected_aggregates_changed",
  "application_traffic_present",
  "outbound_provider_effect_present"
] as const;

export type PrivacyRestoreFloorReason =
  (typeof privacyRestoreFloorReasons)[number];

export type PrivacyRestoreFloorVerificationInput = {
  applicationTrafficAbsent: boolean;
  cleanupJobsReconciled: boolean;
  contradictoryDeletionEvidence: boolean;
  databaseTargetVerified: boolean;
  deidentifiedCompletionPresent: boolean;
  deletedFixtureAbsent: boolean;
  deletionWatermarkAt: Date | null;
  expectedSchemaAndMigrationState: boolean;
  newestStateTrustworthy: boolean;
  outboundProviderEffectsAbsent: boolean;
  projectTargetVerified: boolean;
  proposedRestorePointAt: Date;
  protectedAggregatesUnchanged: boolean;
  qualifyingCompletedDeletionCount: number;
  survivorControlPresentUnchanged: boolean;
  watermarkQueryVerified: boolean;
};

export type PrivacyRestoreFloorVerification = {
  decision: "eligible_for_further_recovery_review" | "reject";
  deletionWatermarkAt: string | null;
  proposedRestorePointAt: string | null;
  reasons: PrivacyRestoreFloorReason[];
  serviceState: "keep_offline";
  trafficSwitchAuthorized: false;
};

/**
 * Applies the approved constrained restore floor to sanitized timestamps,
 * counts, and booleans only. Even an eligible result keeps service offline and
 * never authorizes a restore, traffic switch, database action, or provider call.
 */
export function verifyPrivacyRestoreFloor(
  input: PrivacyRestoreFloorVerificationInput
): PrivacyRestoreFloorVerification {
  const proposedPointValid = isValidDate(input.proposedRestorePointAt);
  const watermarkValid =
    input.deletionWatermarkAt === null || isValidDate(input.deletionWatermarkAt);
  const countValid = isValidAggregate(input.qualifyingCompletedDeletionCount);
  const reasons: PrivacyRestoreFloorReason[] = [];

  if (!proposedPointValid || !watermarkValid) reasons.push("invalid_timestamp");
  if (!countValid) reasons.push("invalid_aggregate");
  if (!input.newestStateTrustworthy) reasons.push("newest_state_not_trustworthy");
  if (!input.projectTargetVerified || !input.databaseTargetVerified) {
    reasons.push("target_not_verified");
  }
  if (!input.watermarkQueryVerified) reasons.push("watermark_query_not_verified");
  if (input.contradictoryDeletionEvidence) {
    reasons.push("contradictory_deletion_evidence");
  }

  if (countValid) {
    if (
      input.qualifyingCompletedDeletionCount > 0 &&
      input.deletionWatermarkAt === null
    ) {
      reasons.push("watermark_missing");
    }
    if (
      input.qualifyingCompletedDeletionCount === 0 &&
      input.deletionWatermarkAt !== null
    ) {
      reasons.push("watermark_count_mismatch");
    }
  }

  if (reasons.length === 0 && input.deletionWatermarkAt !== null) {
    if (
      input.proposedRestorePointAt.getTime() <
      input.deletionWatermarkAt.getTime()
    ) {
      return {
        decision: "reject",
        deletionWatermarkAt: input.deletionWatermarkAt.toISOString(),
        proposedRestorePointAt: input.proposedRestorePointAt.toISOString(),
        reasons: ["below_deletion_floor"],
        serviceState: "keep_offline",
        trafficSwitchAuthorized: false
      };
    }

    if (!input.deletedFixtureAbsent) reasons.push("deleted_fixture_present");
    if (!input.deidentifiedCompletionPresent) {
      reasons.push("deidentified_completion_missing");
    }
  }

  if (!input.survivorControlPresentUnchanged) {
    reasons.push("survivor_control_changed_or_missing");
  }
  if (!input.expectedSchemaAndMigrationState) {
    reasons.push("schema_or_migration_state_unverified");
  }
  if (!input.cleanupJobsReconciled) reasons.push("cleanup_jobs_unreconciled");
  if (!input.protectedAggregatesUnchanged) {
    reasons.push("protected_aggregates_changed");
  }
  if (!input.applicationTrafficAbsent) reasons.push("application_traffic_present");
  if (!input.outboundProviderEffectsAbsent) {
    reasons.push("outbound_provider_effect_present");
  }

  const uniqueReasons = [...new Set(reasons)];
  return {
    decision:
      uniqueReasons.length === 0
        ? "eligible_for_further_recovery_review"
        : "reject",
    deletionWatermarkAt: isValidDate(input.deletionWatermarkAt)
      ? input.deletionWatermarkAt.toISOString()
      : null,
    proposedRestorePointAt: proposedPointValid
      ? input.proposedRestorePointAt.toISOString()
      : null,
    reasons: uniqueReasons,
    serviceState: "keep_offline",
    trafficSwitchAuthorized: false
  };
}
