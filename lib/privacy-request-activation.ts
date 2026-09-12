export const privacyRequestActivationEnvironmentVariable = "PRIVACY_REQUEST_INTAKE_ENABLED";
export const privacyRequestEmailEnvironmentVariable = "PRIVACY_REQUEST_EMAIL";

type PrivacyRequestEnvironment = {
  PRIVACY_REQUEST_EMAIL?: string;
  PRIVACY_REQUEST_INTAKE_ENABLED?: string;
};

export function isPrivacyRequestIntakeEnabled(
  environment: PrivacyRequestEnvironment = {
    PRIVACY_REQUEST_EMAIL: process.env.PRIVACY_REQUEST_EMAIL,
    PRIVACY_REQUEST_INTAKE_ENABLED: process.env.PRIVACY_REQUEST_INTAKE_ENABLED
  }
) {
  return environment[privacyRequestActivationEnvironmentVariable] === "true";
}

export function getPrivacyRequestFallbackEmail(
  environment: PrivacyRequestEnvironment = {
    PRIVACY_REQUEST_EMAIL: process.env.PRIVACY_REQUEST_EMAIL,
    PRIVACY_REQUEST_INTAKE_ENABLED: process.env.PRIVACY_REQUEST_INTAKE_ENABLED
  }
) {
  const candidate = environment[privacyRequestEmailEnvironmentVariable]?.trim() ?? "";
  if (!candidate || candidate.length > 254) return null;
  if (!/^[A-Z0-9.!#$'*+/=_{}|~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(candidate)) {
    return null;
  }
  return candidate;
}
