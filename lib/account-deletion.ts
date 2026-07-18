import type { AuthUser } from "@/lib/auth-database";
import { getBetaFeedbackRecords, saveBetaFeedback, type BetaFeedbackRecord, type BetaFeedbackStatus } from "@/lib/beta-feedback";

const accountDeletionRequestType = "account-deletion";
const accountDeletionCompletionDays = 7;

export type AccountDeletionRequestSummary = {
  completionBy: string;
  id: string;
  requestedAt: string;
  status: BetaFeedbackStatus;
};

function contextString(record: BetaFeedbackRecord, key: string) {
  const value = record.context?.[key];
  return typeof value === "string" ? value : "";
}

function isAccountDeletionRequest(record: BetaFeedbackRecord, userId: string) {
  return record.userId === userId && contextString(record, "requestType") === accountDeletionRequestType;
}

function completionDateFrom(requestedAt: string) {
  return new Date(new Date(requestedAt).getTime() + accountDeletionCompletionDays * 24 * 60 * 60 * 1000).toISOString();
}

function toSummary(record: BetaFeedbackRecord): AccountDeletionRequestSummary {
  return {
    completionBy: contextString(record, "completionBy") || completionDateFrom(record.createdAt),
    id: record.id,
    requestedAt: record.createdAt,
    status: record.status
  };
}

export async function getActiveAccountDeletionRequest(user: AuthUser) {
  const feedback = await getBetaFeedbackRecords(user, { onlyUser: true });
  const request = feedback.records.find((record) => isAccountDeletionRequest(record, user.id) && record.status !== "resolved");

  return request ? toSummary(request) : null;
}

export async function createAccountDeletionRequest(user: AuthUser) {
  const existingRequest = await getActiveAccountDeletionRequest(user);
  if (existingRequest) {
    return {
      mode: "existing" as const,
      request: existingRequest
    };
  }

  const requestedAt = new Date();
  const completionBy = new Date(requestedAt.getTime() + accountDeletionCompletionDays * 24 * 60 * 60 * 1000).toISOString();
  const result = await saveBetaFeedback(
    {
      category: "other",
      context: {
        appleSubscriptionAcknowledged: true,
        completionBy,
        reportSource: "account",
        requestType: accountDeletionRequestType,
        requestedAt: requestedAt.toISOString()
      },
      message:
        "Delete this CapitolWonk CE account and its associated personal data, except information that must be retained for legal, security, or financial obligations.",
      pageUrl: "/settings#delete-account",
      severity: "high",
      title: "Account deletion request"
    },
    user
  );

  if ("error" in result && result.error) {
    return {
      error: result.error,
      status: result.status
    };
  }
  if (!("record" in result)) {
    return {
      error: "Account deletion request could not be recorded. Please try again shortly.",
      status: 503 as const
    };
  }
  if (result.mode !== "database") {
    return {
      error: "Account deletion requests need durable account storage. Please try again shortly.",
      status: 503 as const
    };
  }

  return {
    mode: result.mode,
    request: toSummary(result.record)
  };
}
