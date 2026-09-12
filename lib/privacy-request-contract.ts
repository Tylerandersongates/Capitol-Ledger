import { z } from "zod";

export const privacyRequestTypes = [
  "access_summary",
  "data_export",
  "correction",
  "account_deletion",
  "consent_withdrawal",
  "other"
] as const;

export type PrivacyRequestType = (typeof privacyRequestTypes)[number];

export const privacyRequestTypeOptions: Array<{
  description: string;
  label: string;
  value: PrivacyRequestType;
}> = [
  {
    value: "access_summary",
    label: "Access or summary",
    description: "Understand what account data CapitolWonk keeps and how it is used."
  },
  {
    value: "data_export",
    label: "Data export",
    description: "Request a portable copy of eligible account data after verification."
  },
  {
    value: "correction",
    label: "Correction",
    description: "Correct account data you cannot update in the app."
  },
  {
    value: "account_deletion",
    label: "Account deletion assistance",
    description: "Get help when the protected in-app deletion flow is unavailable."
  },
  {
    value: "consent_withdrawal",
    label: "Consent withdrawal",
    description: "Stop optional processing or disable an optional feature."
  },
  {
    value: "other",
    label: "Other privacy question",
    description: "Ask a privacy question that does not fit the choices above."
  }
];

export const privacyRequestStatuses = ["new", "reviewing", "resolved"] as const;
export type PrivacyRequestStatus = (typeof privacyRequestStatuses)[number];

export const privacyRequestResolutions = [
  "fulfilled",
  "partially_fulfilled",
  "denied",
  "redirected_to_account_deletion",
  "withdrawn",
  "duplicate",
  "no_action_needed"
] as const;
export type PrivacyRequestResolution = (typeof privacyRequestResolutions)[number];

export const privacyRequestDetailMaxLength = 1000;

export const privacyRequestPayloadSchema = z
  .object({
    detail: z.string().max(privacyRequestDetailMaxLength).optional(),
    requestType: z.enum(privacyRequestTypes)
  })
  .strict()
  .transform((payload) => ({
    detail: payload.detail?.trim() || null,
    requestType: payload.requestType
  }));

export type PrivacyRequestPayload = z.output<typeof privacyRequestPayloadSchema>;

export type PrivacyRequestSummary = {
  acknowledgedAt: string;
  id: string;
  requestType: PrivacyRequestType;
  requestedAt: string;
  resolution: PrivacyRequestResolution | null;
  resolvedAt: string | null;
  status: PrivacyRequestStatus;
};

export function isPrivacyRequestStatusTransitionAllowed(
  from: PrivacyRequestStatus,
  to: PrivacyRequestStatus
) {
  if (from === to) return true;
  if (from === "new") return to === "reviewing" || to === "resolved";
  if (from === "reviewing") return to === "resolved";
  return false;
}
