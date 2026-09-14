#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  privacyRequestOperatorCommandMaximumBytes,
  privacyRequestOperatorCommandVersion
} from "@/lib/privacy-request-operator-runner";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const read = (relativePath: string) =>
  fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

const contract = JSON.parse(
  read("docs/privacy-request-operator-stdin-shell-2026-09-14.json")
);
const runbook = read(
  "docs/privacy-request-operator-stdin-shell-2026-09-14.md"
);
const packageDocument = JSON.parse(read("package.json"));
const shellSource = read("scripts/run-privacy-request-operator.ts");
const shellPath = path.join(
  repositoryRoot,
  "scripts/run-privacy-request-operator.ts"
);

assert.equal(contract.contractVersion, privacyRequestOperatorCommandVersion);
assert.equal(contract.decisionStatus, "stdin_shell_only_locally_validated");
assert.equal(contract.productionExecutionAuthorized, false);
assert.equal(contract.implementation.executableEntrypointImplemented, true);
assert.equal(contract.implementation.stdinReaderImplemented, true);
assert.equal(contract.implementation.adapterState, "intentionally_unbound");
assert.equal(contract.implementation.databaseAdapterImplemented, false);
assert.equal(contract.implementation.productionCredentialImplemented, false);
assert.equal(contract.implementation.providerCapabilityImplemented, false);
assert.equal(contract.implementation.publicRouteImplemented, false);
assert.equal(contract.implementation.schedulerImplemented, false);
assert.equal(contract.adapter.externalActionPossible, false);
assert.equal(contract.input.maximumBytes, privacyRequestOperatorCommandMaximumBytes);
assert.equal(contract.input.transport, "single_json_document_over_stdin");
assert.equal(contract.input.commandLineArgumentsAllowed, false);
assert.equal(contract.input.persistedCommandFileAllowed, false);
assert.deepEqual(contract.exitCodes, {
  completed: 0,
  notExecuted: 2,
  operatorActionFailed: 3,
  unexpectedShellFailure: 4
});

const gateNames = [
  "PRIVACY_REQUEST_OPERATOR_RUNNER_ENABLED",
  "PRIVACY_REQUEST_OPERATIONS_ENABLED",
  "PRIVACY_REQUEST_MONITOR_ENABLED",
  "CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED"
] as const;

function runShell(input: {
  arguments?: string[];
  document: string;
  environment?: Record<string, string>;
}) {
  const environment: NodeJS.ProcessEnv = {
    NODE_ENV: "test",
    PATH: process.env.PATH,
    TMPDIR: process.env.TMPDIR
  };
  for (const gateName of gateNames) delete environment[gateName];
  Object.assign(environment, input.environment);

  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", shellPath, ...(input.arguments ?? [])],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: environment,
      input: input.document,
      timeout: 10_000
    }
  );

  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.stderr, "", "the shell must never emit stderr details");
  assert.match(result.stdout, /^\{.*\}\n$/);
  return {
    exitCode: result.status,
    output: JSON.parse(result.stdout)
  };
}

const command = (action: string, rest: Record<string, unknown> = {}) =>
  JSON.stringify({
    commandVersion: privacyRequestOperatorCommandVersion,
    operator: "privacy_owner",
    action,
    ...rest
  });

assert.deepEqual(runShell({ document: command("queue_summary") }), {
  exitCode: 2,
  output: {
    action: "queue_summary",
    decision: "not_executed",
    reason: "runner_disabled"
  }
});

assert.deepEqual(runShell({ document: "not-json" }), {
  exitCode: 2,
  output: {
    action: null,
    decision: "not_executed",
    reason: "invalid_command"
  }
});

assert.deepEqual(
  runShell({
    document: `${command("queue_summary")}${" ".repeat(
      privacyRequestOperatorCommandMaximumBytes
    )}`
  }),
  {
    exitCode: 2,
    output: {
      action: null,
      decision: "not_executed",
      reason: "invalid_command"
    }
  }
);

assert.deepEqual(
  runShell({
    arguments: ["--case", "must-not-be-accepted"],
    document: command("queue_summary")
  }),
  {
    exitCode: 2,
    output: {
      action: null,
      decision: "not_executed",
      reason: "invalid_command"
    }
  }
);

const enabledEnvironment = {
  PRIVACY_REQUEST_OPERATIONS_ENABLED: "true",
  PRIVACY_REQUEST_OPERATOR_RUNNER_ENABLED: "true"
};

assert.deepEqual(
  runShell({
    document: command("queue_summary"),
    environment: enabledEnvironment
  }),
  {
    exitCode: 2,
    output: {
      action: "queue_summary",
      decision: "not_executed",
      reason: "monitor_disabled"
    }
  }
);

assert.deepEqual(
  runShell({
    document: command("retention_apply"),
    environment: enabledEnvironment
  }),
  {
    exitCode: 2,
    output: {
      action: "retention_apply",
      decision: "not_executed",
      reason: "retention_disabled"
    }
  }
);

const fullyEnabledEnvironment = {
  ...enabledEnvironment,
  CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED: "true",
  PRIVACY_REQUEST_MONITOR_ENABLED: "true"
};

const unboundActionDocuments = [
  ["queue_summary", command("queue_summary")],
  [
    "open_first_party_case",
    command("open_first_party_case", {
      caseReference: "case_reference_123"
    })
  ],
  [
    "open_mailbox_case",
    command("open_mailbox_case", {
      identityState: "email_control",
      machineReceiptAt: "2026-09-14T20:01:00.000Z",
      receivedAt: "2026-09-14T20:00:00.000Z",
      requestType: "access_summary"
    })
  ],
  [
    "acknowledge",
    command("acknowledge", { caseReference: "case_reference_123" })
  ],
  [
    "review",
    command("review", {
      caseReference: "case_reference_123",
      exceptionCategory: "none",
      identityState: "reauthenticated",
      reauthenticatedAt: "2026-09-14T20:00:00.000Z",
      sourceBoundaryCategories: ["account_profile"]
    })
  ],
  [
    "resolve",
    command("resolve", {
      caseReference: "case_reference_123",
      exceptionCategory: "none",
      reauthenticatedAt: "2026-09-14T20:00:00.000Z",
      resolution: "fulfilled"
    })
  ],
  ["retention_apply", command("retention_apply")]
] as const;

for (const [action, actionDocument] of unboundActionDocuments) {
  assert.deepEqual(
    runShell({
      document: actionDocument,
      environment: fullyEnabledEnvironment
    }),
    {
      exitCode: 3,
      output: {
        action,
        decision: "failed",
        reason: "operator_action_failed"
      }
    }
  );
}

assert.match(shellSource, /process\.stdin/);
assert.match(shellSource, /process\.stdout/);
assert.match(shellSource, /process\.argv\.length !== 2/);
assert.match(shellSource, /unboundAdapter/);
assert.equal(
  /node:(?:fs|net|http|https|tls|dgram|dns|child_process)|getPrisma|\$queryRaw|\bfetch\s*\(|DATABASE_URL|console\.|process\.stderr/.test(
    shellSource
  ),
  false,
  "the stdin shell must not acquire storage, database, network, subprocess, credential, or stderr/logging capability"
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
    /run-privacy-request-operator|privacy-request-operator-stdin-shell/.test(
      source
    ),
    false,
    `${path.relative(repositoryRoot, applicationFile)} must not expose the stdin shell`
  );
}

assert.match(runbook, /fail-closed stdin shell only/i);
assert.match(runbook, /intentionally unbound/i);
assert.match(runbook, /no production binding/i);
assert.match(runbook, /does not authorize/i);
assert.match(
  packageDocument.scripts["privacy-request:operator:run"],
  /run-privacy-request-operator\.ts/
);
assert.match(
  packageDocument.scripts["privacy-request:operator-stdin-shell:check"],
  /check-privacy-request-operator-stdin\.ts/
);
assert.match(
  packageDocument.scripts["privacy-request:check"],
  /check-privacy-request-operator-stdin\.ts/
);

console.log("Privacy-request operator stdin-shell checks passed.");
