import {
  acknowledgePrivacyRequestOperation,
  openPrivacyRequestOperation,
  resolvePrivacyRequestOperation,
  reviewPrivacyRequestOperation,
  runPrivacyRequestOperationsRetention,
  type PrivacyRequestOperationsDatabaseClient
} from "@/lib/privacy-request-operations";
import {
  readPrivacyRequestMonitor,
  type PrivacyRequestMonitorDatabaseClient
} from "@/lib/privacy-request-monitor";
import type { PrivacyRequestOperatorRunnerAdapter } from "@/lib/privacy-request-operator-runner";

export type PrivacyRequestOperatorServiceDatabaseClient =
  PrivacyRequestOperationsDatabaseClient & PrivacyRequestMonitorDatabaseClient;

export type PrivacyRequestOperatorServiceAdapterOptions = {
  database: PrivacyRequestOperatorServiceDatabaseClient;
  environment: Record<string, string | undefined>;
  now: () => Date;
};

/**
 * Composes the reviewed operations and aggregate-monitor services behind the
 * operator adapter interface. Every dependency is explicit: this factory does
 * not resolve a database, environment, credential, or clock on its own.
 *
 * The stdin shell intentionally does not import or bind this adapter. A future
 * binding remains a separate reviewed and approval-gated source action.
 */
export function createPrivacyRequestOperatorServiceAdapter(
  options: PrivacyRequestOperatorServiceAdapterOptions
): PrivacyRequestOperatorRunnerAdapter {
  const operationOptions = () => ({
    database: options.database,
    environment: options.environment,
    now: options.now()
  });

  return {
    acknowledge: ({ caseReference, operator }) =>
      acknowledgePrivacyRequestOperation(
        caseReference,
        operator,
        operationOptions()
      ),
    openFirstPartyCase: ({ caseReference }) =>
      openPrivacyRequestOperation(
        { caseReference, lane: "first_party" },
        operationOptions()
      ),
    openMailboxCase: (input) =>
      openPrivacyRequestOperation(
        {
          identityState: input.identityState,
          lane: "mailbox",
          machineReceiptAt: input.machineReceiptAt,
          receivedAt: input.receivedAt,
          requestType: input.requestType
        },
        operationOptions()
      ),
    queueSummary: async () => {
      const result = await readPrivacyRequestMonitor({
        database: options.database,
        environment: options.environment,
        hasDatabase: () => true,
        now: options.now()
      });
      if (!result.enabled || !result.snapshot) {
        throw new Error("Privacy request monitor is unavailable.");
      }
      return result.snapshot;
    },
    retentionApply: () =>
      runPrivacyRequestOperationsRetention(operationOptions()),
    review: ({ caseReference, ...input }) =>
      reviewPrivacyRequestOperation(
        caseReference,
        input,
        operationOptions()
      ),
    resolve: ({ caseReference, ...input }) =>
      resolvePrivacyRequestOperation(
        caseReference,
        input,
        operationOptions()
      )
  };
}
