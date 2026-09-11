export const accountDeletionActivationEnvironmentVariable = "ACCOUNT_DELETION_ENABLED";

type AccountDeletionActivationEnvironment = {
  ACCOUNT_DELETION_ENABLED?: string;
};

/**
 * Account deletion is a destructive production operation. Keep it unavailable
 * unless the deployment explicitly opts in with the exact value `true`.
 */
export function isAccountDeletionEnabled(
  environment: AccountDeletionActivationEnvironment = {
    ACCOUNT_DELETION_ENABLED: process.env.ACCOUNT_DELETION_ENABLED
  }
) {
  return environment[accountDeletionActivationEnvironmentVariable] === "true";
}
