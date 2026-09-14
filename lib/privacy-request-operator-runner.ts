import { z } from "zod";
import {
  privacyRequestResolutions,
  privacyRequestTypes
} from "@/lib/privacy-request-contract";
import {
  privacyRequestOperationExceptionCategories,
  privacyRequestOperationIdentityStates,
  privacyRequestOperationSourceBoundaryCategories,
  privacyRequestOperationWorkflowStatuses,
  type PrivacyRequestOperationRecord
} from "@/lib/privacy-request-operations-contract";
import {
  privacyRequestOperatorBoundaryDecision,
  type PrivacyRequestOperatorAction,
  type PrivacyRequestOperatorBoundaryDecision
} from "@/lib/privacy-request-operator-boundary";
import {
  privacyRequestAgeBands,
  type PrivacyRequestMonitorSnapshot
} from "@/lib/privacy-request-monitor";

export const privacyRequestOperatorCommandVersion = "2026-09-14" as const;
export const privacyRequestOperatorCommandMaximumBytes = 16 * 1024;

const caseReferenceSchema = z.string().regex(/^[A-Za-z0-9_-]{12,128}$/);
const timestampSchema = z.string().datetime({ offset: true });
const operatorSchema = z.literal("privacy_owner");
const commandBase = {
  commandVersion: z.literal(privacyRequestOperatorCommandVersion),
  operator: operatorSchema
};

const queueSummaryCommandSchema = z
  .object({ ...commandBase, action: z.literal("queue_summary") })
  .strict();

const openFirstPartyCaseCommandSchema = z
  .object({
    ...commandBase,
    action: z.literal("open_first_party_case"),
    caseReference: caseReferenceSchema
  })
  .strict();

const openMailboxCaseCommandSchema = z
  .object({
    ...commandBase,
    action: z.literal("open_mailbox_case"),
    identityState: z.enum(["email_control", "escalation_required"]),
    machineReceiptAt: timestampSchema,
    receivedAt: timestampSchema,
    requestType: z.enum(privacyRequestTypes)
  })
  .strict()
  .refine(
    (command) =>
      new Date(command.machineReceiptAt).getTime() >=
      new Date(command.receivedAt).getTime(),
    { message: "Machine receipt cannot precede receipt." }
  );

const acknowledgeCommandSchema = z
  .object({
    ...commandBase,
    action: z.literal("acknowledge"),
    caseReference: caseReferenceSchema
  })
  .strict();

const reviewCommandSchema = z
  .object({
    ...commandBase,
    action: z.literal("review"),
    caseReference: caseReferenceSchema,
    exceptionCategory: z.enum(privacyRequestOperationExceptionCategories),
    identityState: z.enum(privacyRequestOperationIdentityStates),
    reauthenticatedAt: timestampSchema.nullable().optional(),
    sourceBoundaryCategories: z
      .array(z.enum(privacyRequestOperationSourceBoundaryCategories))
      .max(privacyRequestOperationSourceBoundaryCategories.length)
  })
  .strict()
  .refine(
    (command) =>
      command.identityState !== "escalation_required" ||
      command.exceptionCategory === "identity_ambiguity",
    { message: "Identity escalation requires the identity_ambiguity category." }
  );

const resolveCommandSchema = z
  .object({
    ...commandBase,
    action: z.literal("resolve"),
    caseReference: caseReferenceSchema,
    exceptionCategory: z.enum(privacyRequestOperationExceptionCategories),
    reauthenticatedAt: timestampSchema.nullable().optional(),
    resolution: z.enum(privacyRequestResolutions)
  })
  .strict()
  .refine(
    (command) =>
      !["partially_fulfilled", "denied"].includes(command.resolution) ||
      command.exceptionCategory !== "none",
    { message: "A partial fulfillment or denial requires an exception category." }
  );

const retentionApplyCommandSchema = z
  .object({ ...commandBase, action: z.literal("retention_apply") })
  .strict();

export const privacyRequestOperatorCommandSchema = z.union([
  queueSummaryCommandSchema,
  openFirstPartyCaseCommandSchema,
  openMailboxCaseCommandSchema,
  acknowledgeCommandSchema,
  reviewCommandSchema,
  resolveCommandSchema,
  retentionApplyCommandSchema
]);

export type PrivacyRequestOperatorCommand = z.infer<
  typeof privacyRequestOperatorCommandSchema
>;

const operationRecordSchema = z
  .object({
    caseReference: caseReferenceSchema,
    deleteAt: timestampSchema.nullable(),
    exceptionCategory: z.enum(privacyRequestOperationExceptionCategories),
    humanAcknowledgementAt: timestampSchema.nullable(),
    identityState: z.enum(privacyRequestOperationIdentityStates),
    lane: z.enum(["first_party", "mailbox"]),
    machineReceiptAt: timestampSchema,
    operator: operatorSchema.nullable(),
    receivedAt: timestampSchema,
    requestType: z.enum(privacyRequestTypes),
    resolution: z.enum(privacyRequestResolutions).nullable(),
    resolvedAt: timestampSchema.nullable(),
    sourceBoundaryCategories: z.array(
      z.enum(privacyRequestOperationSourceBoundaryCategories)
    ),
    workflowStatus: z.enum(privacyRequestOperationWorkflowStatuses)
  })
  .strict();

const aggregateQueueSchema = z
  .object({
    generatedAt: timestampSchema,
    queue: z
      .object({
        new: z
          .object({
            count: z.number().int().nonnegative(),
            oldestAgeBand: z.enum(privacyRequestAgeBands)
          })
          .strict(),
        reviewing: z
          .object({
            count: z.number().int().nonnegative(),
            oldestAgeBand: z.enum(privacyRequestAgeBands)
          })
          .strict()
      })
      .strict(),
    resolvedByResolution: z
      .object({
        denied: z.number().int().nonnegative(),
        duplicate: z.number().int().nonnegative(),
        fulfilled: z.number().int().nonnegative(),
        no_action_needed: z.number().int().nonnegative(),
        partially_fulfilled: z.number().int().nonnegative(),
        redirected_to_account_deletion: z.number().int().nonnegative(),
        withdrawn: z.number().int().nonnegative()
      })
      .strict()
  })
  .strict();

const retentionResultSchema = z
  .object({
    closedOperationRecordsDeleted: z.number().int().nonnegative(),
    optionalDetailsMinimized: z.number().int().nonnegative()
  })
  .strict();

export type PrivacyRequestOperatorRunnerAdapter = {
  acknowledge: (input: {
    caseReference: string;
    operator: "privacy_owner";
  }) => Promise<PrivacyRequestOperationRecord>;
  openFirstPartyCase: (input: {
    caseReference: string;
  }) => Promise<PrivacyRequestOperationRecord>;
  openMailboxCase: (input: {
    identityState: "email_control" | "escalation_required";
    machineReceiptAt: Date;
    receivedAt: Date;
    requestType: (typeof privacyRequestTypes)[number];
  }) => Promise<PrivacyRequestOperationRecord>;
  queueSummary: () => Promise<PrivacyRequestMonitorSnapshot>;
  retentionApply: () => Promise<{
    closedOperationRecordsDeleted: number;
    optionalDetailsMinimized: number;
  }>;
  review: (input: {
    caseReference: string;
    exceptionCategory: (typeof privacyRequestOperationExceptionCategories)[number];
    identityState: (typeof privacyRequestOperationIdentityStates)[number];
    operator: "privacy_owner";
    reauthenticatedAt: Date | null;
    sourceBoundaryCategories: Array<
      (typeof privacyRequestOperationSourceBoundaryCategories)[number]
    >;
  }) => Promise<PrivacyRequestOperationRecord>;
  resolve: (input: {
    caseReference: string;
    exceptionCategory: (typeof privacyRequestOperationExceptionCategories)[number];
    operator: "privacy_owner";
    reauthenticatedAt: Date | null;
    resolution: (typeof privacyRequestResolutions)[number];
  }) => Promise<PrivacyRequestOperationRecord>;
};

type PrivacyRequestOperatorEnvironment = Record<string, string | undefined>;

export type PrivacyRequestOperatorExecutionResult =
  | {
      action: null;
      decision: "not_executed";
      reason: "invalid_command";
    }
  | {
      action: PrivacyRequestOperatorAction;
      decision: "not_executed";
      reason: Exclude<PrivacyRequestOperatorBoundaryDecision, "allowed">;
    }
  | {
      action: PrivacyRequestOperatorAction;
      decision: "failed";
      reason: "operator_action_failed";
    }
  | {
      action: PrivacyRequestOperatorAction;
      decision: "completed";
      result: PrivacyRequestMonitorSnapshot | PrivacyRequestOperationRecord | {
        closedOperationRecordsDeleted: number;
        optionalDetailsMinimized: number;
      };
    };

export function parsePrivacyRequestOperatorCommand(
  document: string
): PrivacyRequestOperatorCommand {
  if (
    document.trim() === "" ||
    Buffer.byteLength(document, "utf8") > privacyRequestOperatorCommandMaximumBytes
  ) {
    throw new Error("Privacy operator command is invalid.");
  }

  try {
    return privacyRequestOperatorCommandSchema.parse(JSON.parse(document));
  } catch {
    throw new Error("Privacy operator command is invalid.");
  }
}

function optionalTimestamp(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

async function invokeCommand(
  command: PrivacyRequestOperatorCommand,
  adapter: PrivacyRequestOperatorRunnerAdapter
) {
  switch (command.action) {
    case "queue_summary":
      return aggregateQueueSchema.parse(await adapter.queueSummary());
    case "open_first_party_case":
      return operationRecordSchema.parse(
        await adapter.openFirstPartyCase({ caseReference: command.caseReference })
      );
    case "open_mailbox_case":
      return operationRecordSchema.parse(
        await adapter.openMailboxCase({
          identityState: command.identityState,
          machineReceiptAt: new Date(command.machineReceiptAt),
          receivedAt: new Date(command.receivedAt),
          requestType: command.requestType
        })
      );
    case "acknowledge":
      return operationRecordSchema.parse(
        await adapter.acknowledge({
          caseReference: command.caseReference,
          operator: command.operator
        })
      );
    case "review":
      return operationRecordSchema.parse(
        await adapter.review({
          caseReference: command.caseReference,
          exceptionCategory: command.exceptionCategory,
          identityState: command.identityState,
          operator: command.operator,
          reauthenticatedAt: optionalTimestamp(command.reauthenticatedAt),
          sourceBoundaryCategories: command.sourceBoundaryCategories
        })
      );
    case "resolve":
      return operationRecordSchema.parse(
        await adapter.resolve({
          caseReference: command.caseReference,
          exceptionCategory: command.exceptionCategory,
          operator: command.operator,
          reauthenticatedAt: optionalTimestamp(command.reauthenticatedAt),
          resolution: command.resolution
        })
      );
    case "retention_apply":
      return retentionResultSchema.parse(await adapter.retentionApply());
  }
}

/**
 * Parses one closed JSON command and dispatches only to an injected adapter.
 * This core has no stdin, argv, database, credential, route, provider, network,
 * filesystem, scheduler, logging, or production binding.
 */
export async function executePrivacyRequestOperatorDocument(input: {
  adapter: PrivacyRequestOperatorRunnerAdapter;
  document: string;
  environment?: PrivacyRequestOperatorEnvironment;
}): Promise<PrivacyRequestOperatorExecutionResult> {
  let command: PrivacyRequestOperatorCommand;
  try {
    command = parsePrivacyRequestOperatorCommand(input.document);
  } catch {
    return { action: null, decision: "not_executed", reason: "invalid_command" };
  }

  const boundaryDecision = privacyRequestOperatorBoundaryDecision({
    action: command.action,
    environment: input.environment ?? process.env,
    operator: command.operator
  });
  if (boundaryDecision !== "allowed") {
    return {
      action: command.action,
      decision: "not_executed",
      reason: boundaryDecision
    };
  }

  try {
    return {
      action: command.action,
      decision: "completed",
      result: await invokeCommand(command, input.adapter)
    };
  } catch {
    return {
      action: command.action,
      decision: "failed",
      reason: "operator_action_failed"
    };
  }
}
