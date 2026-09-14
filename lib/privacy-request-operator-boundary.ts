import type { PrivacyRequestOperatorRole } from "@/lib/privacy-request-operations-contract";

export const privacyRequestOperatorRunnerEnvironmentVariable =
  "PRIVACY_REQUEST_OPERATOR_RUNNER_ENABLED";

export const privacyRequestOperatorActions = [
  "queue_summary",
  "open_first_party_case",
  "open_mailbox_case",
  "acknowledge",
  "review",
  "resolve",
  "retention_apply"
] as const;

export type PrivacyRequestOperatorAction =
  (typeof privacyRequestOperatorActions)[number];

export type PrivacyRequestOperatorBoundaryDecision =
  | "allowed"
  | "monitor_disabled"
  | "operations_disabled"
  | "retention_disabled"
  | "runner_disabled"
  | "wrong_role";

type PrivacyRequestOperatorBoundaryEnvironment = Record<
  string,
  string | undefined
> & {
  CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED?: string;
  PRIVACY_REQUEST_MONITOR_ENABLED?: string;
  PRIVACY_REQUEST_OPERATIONS_ENABLED?: string;
  PRIVACY_REQUEST_OPERATOR_RUNNER_ENABLED?: string;
};

export function isPrivacyRequestOperatorAction(
  value: unknown
): value is PrivacyRequestOperatorAction {
  return (
    typeof value === "string" &&
    privacyRequestOperatorActions.includes(value as PrivacyRequestOperatorAction)
  );
}

export function isPrivacyRequestOperatorRunnerEnabled(
  environment: PrivacyRequestOperatorBoundaryEnvironment = process.env
) {
  return (
    environment[privacyRequestOperatorRunnerEnvironmentVariable] === "true"
  );
}

/**
 * Pure authorization guard for a future local, server-only operator command.
 * This module has no database, route, provider, credential, or logging binding.
 */
export function privacyRequestOperatorBoundaryDecision(input: {
  action: PrivacyRequestOperatorAction;
  environment?: PrivacyRequestOperatorBoundaryEnvironment;
  operator: PrivacyRequestOperatorRole | null;
}): PrivacyRequestOperatorBoundaryDecision {
  const environment = input.environment ?? process.env;

  if (!isPrivacyRequestOperatorRunnerEnabled(environment)) {
    return "runner_disabled";
  }
  if (environment.PRIVACY_REQUEST_OPERATIONS_ENABLED !== "true") {
    return "operations_disabled";
  }
  if (input.operator !== "privacy_owner") {
    return "wrong_role";
  }
  if (
    input.action === "queue_summary" &&
    environment.PRIVACY_REQUEST_MONITOR_ENABLED !== "true"
  ) {
    return "monitor_disabled";
  }
  if (
    input.action === "retention_apply" &&
    environment.CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED !== "true"
  ) {
    return "retention_disabled";
  }

  return "allowed";
}
