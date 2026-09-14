#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  executePrivacyRequestOperatorDocument,
  parsePrivacyRequestOperatorCommand,
  privacyRequestOperatorCommandMaximumBytes,
  privacyRequestOperatorCommandVersion,
  type PrivacyRequestOperatorRunnerAdapter
} from "@/lib/privacy-request-operator-runner";
import type { PrivacyRequestOperationRecord } from "@/lib/privacy-request-operations-contract";
import type { PrivacyRequestMonitorSnapshot } from "@/lib/privacy-request-monitor";

async function main() {
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

const contract = JSON.parse(
  read("docs/privacy-request-operator-runner-core-2026-09-14.json")
);
const runbook = read(
  "docs/privacy-request-operator-runner-core-2026-09-14.md"
);
const packageDocument = JSON.parse(read("package.json"));
const runnerSource = read("lib/privacy-request-operator-runner.ts");

assert.equal(contract.contractVersion, privacyRequestOperatorCommandVersion);
assert.equal(contract.decisionStatus, "dispatcher_core_only_locally_validated");
assert.equal(contract.productionExecutionAuthorized, false);
assert.equal(contract.implementation.executableEntrypointImplemented, false);
assert.equal(contract.implementation.stdinReaderImplemented, false);
assert.equal(contract.implementation.databaseAdapterImplemented, false);
assert.equal(contract.implementation.productionCredentialImplemented, false);
assert.equal(contract.implementation.productionMigrationAuthorized, false);
assert.equal(contract.implementation.providerCapabilityImplemented, false);
assert.equal(contract.input.maximumBytes, privacyRequestOperatorCommandMaximumBytes);
assert.equal(contract.input.transport, "future_single_json_document_over_stdin");
assert.equal(contract.input.commandLineArgumentsAllowed, false);
assert.equal(contract.input.unknownFieldsAllowed, false);
assert.deepEqual(contract.output.failureVocabulary, [
  "invalid_command",
  "runner_disabled",
  "operations_disabled",
  "wrong_role",
  "monitor_disabled",
  "retention_disabled",
  "operator_action_failed"
]);

const record: PrivacyRequestOperationRecord = {
  caseReference: "case_reference_123",
  deleteAt: null,
  exceptionCategory: "none",
  humanAcknowledgementAt: null,
  identityState: "intake_identity",
  lane: "first_party",
  machineReceiptAt: "2026-09-14T20:00:00.000Z",
  operator: null,
  receivedAt: "2026-09-14T20:00:00.000Z",
  requestType: "access_summary",
  resolution: null,
  resolvedAt: null,
  sourceBoundaryCategories: [],
  workflowStatus: "new"
};

const snapshot: PrivacyRequestMonitorSnapshot = {
  generatedAt: "2026-09-14T20:00:00.000Z",
  queue: {
    new: { count: 1, oldestAgeBand: "under_24_hours" },
    reviewing: { count: 0, oldestAgeBand: "none" }
  },
  resolvedByResolution: {
    denied: 0,
    duplicate: 0,
    fulfilled: 0,
    no_action_needed: 0,
    partially_fulfilled: 0,
    redirected_to_account_deletion: 0,
    withdrawn: 0
  }
};

let adapterCalls = 0;
const adapter: PrivacyRequestOperatorRunnerAdapter = {
  acknowledge: async () => {
    adapterCalls += 1;
    return { ...record, humanAcknowledgementAt: record.receivedAt, operator: "privacy_owner", workflowStatus: "reviewing" };
  },
  openFirstPartyCase: async () => {
    adapterCalls += 1;
    return record;
  },
  openMailboxCase: async (input) => {
    adapterCalls += 1;
    assert.equal(input.receivedAt.toISOString(), "2026-09-14T20:00:00.000Z");
    assert.equal(input.machineReceiptAt.toISOString(), "2026-09-14T20:01:00.000Z");
    return {
      ...record,
      caseReference: "mailbox_case_123",
      identityState: input.identityState,
      lane: "mailbox",
      machineReceiptAt: input.machineReceiptAt.toISOString(),
      receivedAt: input.receivedAt.toISOString(),
      requestType: input.requestType
    };
  },
  queueSummary: async () => {
    adapterCalls += 1;
    return snapshot;
  },
  retentionApply: async () => {
    adapterCalls += 1;
    return { closedOperationRecordsDeleted: 2, optionalDetailsMinimized: 3 };
  },
  review: async (input) => {
    adapterCalls += 1;
    return {
      ...record,
      exceptionCategory: input.exceptionCategory,
      identityState: input.identityState,
      operator: input.operator,
      sourceBoundaryCategories: input.sourceBoundaryCategories,
      workflowStatus: "reviewing"
    };
  },
  resolve: async (input) => {
    adapterCalls += 1;
    return {
      ...record,
      exceptionCategory: input.exceptionCategory,
      operator: input.operator,
      resolution: input.resolution,
      resolvedAt: "2026-09-14T20:05:00.000Z",
      workflowStatus: "resolved"
    };
  }
};

const baseEnvironment = {
  PRIVACY_REQUEST_OPERATIONS_ENABLED: "true",
  PRIVACY_REQUEST_OPERATOR_RUNNER_ENABLED: "true"
};
const baseCommand = {
  commandVersion: privacyRequestOperatorCommandVersion,
  operator: "privacy_owner" as const
};
const document = (value: unknown) => JSON.stringify(value);

assert.equal(
  parsePrivacyRequestOperatorCommand(
    document({ ...baseCommand, action: "acknowledge", caseReference: record.caseReference })
  ).action,
  "acknowledge"
);
for (const invalidDocument of [
  "",
  "{}{}",
  document({ ...baseCommand, action: "query" }),
  document({ ...baseCommand, action: "queue_summary", email: "requester@example.com" }),
  document({ ...baseCommand, action: "acknowledge", caseReference: "short" }),
  document([{ ...baseCommand, action: "queue_summary" }]),
  `${document({ ...baseCommand, action: "queue_summary" })}${" ".repeat(
    privacyRequestOperatorCommandMaximumBytes
  )}`
]) {
  assert.throws(
    () => parsePrivacyRequestOperatorCommand(invalidDocument),
    /Privacy operator command is invalid\./
  );
}

assert.throws(
  () =>
    parsePrivacyRequestOperatorCommand(
      document({
        ...baseCommand,
        action: "open_mailbox_case",
        identityState: "email_control",
        machineReceiptAt: "2026-09-14T19:59:59.999Z",
        receivedAt: "2026-09-14T20:00:00.000Z",
        requestType: "access_summary"
      })
    ),
  /Privacy operator command is invalid\./
);
assert.throws(
  () =>
    parsePrivacyRequestOperatorCommand(
      document({
        ...baseCommand,
        action: "review",
        caseReference: record.caseReference,
        exceptionCategory: "none",
        identityState: "escalation_required",
        sourceBoundaryCategories: []
      })
    ),
  /Privacy operator command is invalid\./
);
assert.throws(
  () =>
    parsePrivacyRequestOperatorCommand(
      document({
        ...baseCommand,
        action: "resolve",
        caseReference: record.caseReference,
        exceptionCategory: "none",
        resolution: "denied"
      })
    ),
  /Privacy operator command is invalid\./
);

const acknowledgeDocument = document({
  ...baseCommand,
  action: "acknowledge",
  caseReference: record.caseReference
});
assert.deepEqual(
  await executePrivacyRequestOperatorDocument({
    adapter,
    document: acknowledgeDocument,
    environment: {}
  }),
  { action: "acknowledge", decision: "not_executed", reason: "runner_disabled" }
);
assert.equal(adapterCalls, 0, "disabled gates must reject before adapter access");

const commandCases: Array<{
  document: string;
  environment: Record<string, string>;
  expectedAction: string;
}> = [
  {
    document: document({ ...baseCommand, action: "queue_summary" }),
    environment: { ...baseEnvironment, PRIVACY_REQUEST_MONITOR_ENABLED: "true" },
    expectedAction: "queue_summary"
  },
  {
    document: document({
      ...baseCommand,
      action: "open_first_party_case",
      caseReference: record.caseReference
    }),
    environment: baseEnvironment,
    expectedAction: "open_first_party_case"
  },
  {
    document: document({
      ...baseCommand,
      action: "open_mailbox_case",
      identityState: "email_control",
      machineReceiptAt: "2026-09-14T20:01:00.000Z",
      receivedAt: "2026-09-14T20:00:00.000Z",
      requestType: "access_summary"
    }),
    environment: baseEnvironment,
    expectedAction: "open_mailbox_case"
  },
  {
    document: acknowledgeDocument,
    environment: baseEnvironment,
    expectedAction: "acknowledge"
  },
  {
    document: document({
      ...baseCommand,
      action: "review",
      caseReference: record.caseReference,
      exceptionCategory: "none",
      identityState: "reauthenticated",
      reauthenticatedAt: "2026-09-14T20:00:00.000Z",
      sourceBoundaryCategories: ["account_profile"]
    }),
    environment: baseEnvironment,
    expectedAction: "review"
  },
  {
    document: document({
      ...baseCommand,
      action: "resolve",
      caseReference: record.caseReference,
      exceptionCategory: "none",
      reauthenticatedAt: "2026-09-14T20:00:00.000Z",
      resolution: "fulfilled"
    }),
    environment: baseEnvironment,
    expectedAction: "resolve"
  },
  {
    document: document({ ...baseCommand, action: "retention_apply" }),
    environment: {
      ...baseEnvironment,
      CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED: "true"
    },
    expectedAction: "retention_apply"
  }
];

for (const commandCase of commandCases) {
  const result = await executePrivacyRequestOperatorDocument({
    adapter,
    document: commandCase.document,
    environment: commandCase.environment
  });
  assert.equal(result.action, commandCase.expectedAction);
  assert.equal(result.decision, "completed");
}
assert.equal(adapterCalls, commandCases.length);

assert.deepEqual(
  await executePrivacyRequestOperatorDocument({
    adapter,
    document: document({ ...baseCommand, action: "queue_summary" }),
    environment: baseEnvironment
  }),
  { action: "queue_summary", decision: "not_executed", reason: "monitor_disabled" }
);
assert.deepEqual(
  await executePrivacyRequestOperatorDocument({
    adapter,
    document: document({ ...baseCommand, action: "retention_apply" }),
    environment: baseEnvironment
  }),
  { action: "retention_apply", decision: "not_executed", reason: "retention_disabled" }
);

const leakingAdapter: PrivacyRequestOperatorRunnerAdapter = {
  ...adapter,
  acknowledge: async () =>
    ({ ...record, email: "requester@example.com" } as PrivacyRequestOperationRecord)
};
const leakingResult = await executePrivacyRequestOperatorDocument({
  adapter: leakingAdapter,
  document: acknowledgeDocument,
  environment: baseEnvironment
});
assert.deepEqual(leakingResult, {
  action: "acknowledge",
  decision: "failed",
  reason: "operator_action_failed"
});
assert.equal(JSON.stringify(leakingResult).includes("requester@example.com"), false);

const throwingAdapter: PrivacyRequestOperatorRunnerAdapter = {
  ...adapter,
  acknowledge: async () => {
    throw new Error("sensitive raw provider error requester@example.com");
  }
};
const throwingResult = await executePrivacyRequestOperatorDocument({
  adapter: throwingAdapter,
  document: acknowledgeDocument,
  environment: baseEnvironment
});
assert.deepEqual(throwingResult, {
  action: "acknowledge",
  decision: "failed",
  reason: "operator_action_failed"
});
assert.equal(JSON.stringify(throwingResult).includes("requester@example.com"), false);

for (const prohibitedField of [
  "email",
  "contactValue",
  "mailboxBody",
  "attachment",
  "exportPayload",
  "providerIdentifier",
  "credential",
  "rawError"
]) {
  assert.equal(contract.input.prohibitedFields.includes(prohibitedField), true);
  assert.equal(contract.output.prohibitedFields.includes(prohibitedField), true);
}

assert.match(runbook, /dispatcher core only/i);
assert.match(runbook, /no executable entrypoint/i);
assert.match(runbook, /production binding remains absent/i);
assert.match(runbook, /single JSON document/i);
assert.match(runbook, /does not authorize/i);

assert.equal(
  /getPrisma|\$queryRaw|\bfetch\s*\(|node:fs|process\.(?:argv|stdin|stdout|stderr)|console\./.test(
    runnerSource
  ),
  false,
  "the dispatcher core must not acquire database, network, filesystem, argv, stdio, or logging bindings"
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
    /privacy-request-operator-runner|executePrivacyRequestOperatorDocument/.test(source),
    false,
    `${path.relative(repositoryRoot, applicationFile)} must not expose the dispatcher core`
  );
}

assert.equal(
  fs.existsSync(path.join(repositoryRoot, "scripts/run-privacy-request-operator.ts")),
  false,
  "an executable operator entrypoint must remain absent"
);
assert.match(
  packageDocument.scripts["privacy-request:operator-runner-core:check"],
  /check-privacy-request-operator-runner\.ts/
);
assert.match(
  packageDocument.scripts["privacy-request:check"],
  /check-privacy-request-operator-runner\.ts/
);

console.log("Privacy-request operator-runner core checks passed.");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Operator-runner core checks failed."}\n`);
  process.exitCode = 1;
});
