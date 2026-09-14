import type {
  PrivacyRequestResolution,
  PrivacyRequestType
} from "@/lib/privacy-request-contract";

export const privacyRequestOperationLanes = ["first_party", "mailbox"] as const;
export type PrivacyRequestOperationLane = (typeof privacyRequestOperationLanes)[number];

export const privacyRequestOperationIdentityStates = [
  "intake_identity",
  "reauthenticated",
  "email_control",
  "escalation_required",
  "not_applicable"
] as const;
export type PrivacyRequestOperationIdentityState =
  (typeof privacyRequestOperationIdentityStates)[number];

export const privacyRequestOperationWorkflowStatuses = [
  "new",
  "reviewing",
  "resolved"
] as const;
export type PrivacyRequestOperationWorkflowStatus =
  (typeof privacyRequestOperationWorkflowStatuses)[number];

export const privacyRequestOperationSourceBoundaryCategories = [
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
] as const;
export type PrivacyRequestOperationSourceBoundaryCategory =
  (typeof privacyRequestOperationSourceBoundaryCategories)[number];

export const privacyRequestOperationExceptionCategories = [
  "none",
  "identity_ambiguity",
  "legal_requirement",
  "security_safety",
  "provider_boundary",
  "scope_limitation",
  "coverage_gap"
] as const;
export type PrivacyRequestOperationExceptionCategory =
  (typeof privacyRequestOperationExceptionCategories)[number];

export const privacyRequestOperatorRoles = ["privacy_owner"] as const;
export type PrivacyRequestOperatorRole = (typeof privacyRequestOperatorRoles)[number];

export const privacyRequestHighRiskTypes: readonly PrivacyRequestType[] = [
  "data_export",
  "correction",
  "account_deletion",
  "consent_withdrawal"
];

export const privacyRequestHighRiskFulfillmentResolutions: readonly PrivacyRequestResolution[] = [
  "fulfilled",
  "partially_fulfilled"
];

export const privacyRequestReauthenticationWindowMs = 15 * 60 * 1000;
export const privacyRequestClosedCaseRetentionMonths = 24;
export const privacyRequestOptionalDetailRetentionDays = 30;

export type PrivacyRequestOperationRecord = {
  caseReference: string;
  deleteAt: string | null;
  exceptionCategory: PrivacyRequestOperationExceptionCategory;
  humanAcknowledgementAt: string | null;
  identityState: PrivacyRequestOperationIdentityState;
  lane: PrivacyRequestOperationLane;
  machineReceiptAt: string;
  operator: PrivacyRequestOperatorRole | null;
  receivedAt: string;
  requestType: PrivacyRequestType;
  resolution: PrivacyRequestResolution | null;
  resolvedAt: string | null;
  sourceBoundaryCategories: PrivacyRequestOperationSourceBoundaryCategory[];
  workflowStatus: PrivacyRequestOperationWorkflowStatus;
};

export type PrivacyRequestCoverageAction =
  | "continue_operating"
  | "leave_disabled"
  | "pause_required";

export function privacyRequestCoverageAction(input: {
  consecutiveMissedReviewWindows: number;
  expectedMissedReviewWindows: number;
  intakeActive: boolean;
}): PrivacyRequestCoverageAction {
  if (!input.intakeActive) return "leave_disabled";
  if (
    Math.max(
      Math.max(0, Math.floor(input.consecutiveMissedReviewWindows)),
      Math.max(0, Math.floor(input.expectedMissedReviewWindows))
    ) >= 2
  ) {
    return "pause_required";
  }
  return "continue_operating";
}

export function isFreshPrivacyRequestReauthentication(
  reauthenticatedAt: Date | null | undefined,
  actionAt: Date
) {
  if (!reauthenticatedAt) return false;
  const ageMs = actionAt.getTime() - reauthenticatedAt.getTime();
  return ageMs >= 0 && ageMs <= privacyRequestReauthenticationWindowMs;
}
