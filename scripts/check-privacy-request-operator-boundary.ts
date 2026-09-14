#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isPrivacyRequestOperatorAction,
  isPrivacyRequestOperatorRunnerEnabled,
  privacyRequestOperatorActions,
  privacyRequestOperatorBoundaryDecision
} from "@/lib/privacy-request-operator-boundary";
import { privacyRequestCoverageAction } from "@/lib/privacy-request-operations-contract";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

const boundary = JSON.parse(
  read("docs/privacy-request-operator-boundary-2026-09-14.json")
);
const runbook = read(
  "docs/privacy-request-operator-boundary-and-pause-runbook-2026-09-14.md"
);
const environmentExample = read(".env.example");
const packageDocument = JSON.parse(read("package.json"));
const guardSource = read("lib/privacy-request-operator-boundary.ts");

assert.equal(boundary.boundaryVersion, "2026-09-14");
assert.equal(boundary.decisionStatus, "guard_and_dispatcher_core_locally_validated");
assert.equal(boundary.productionExecutionAuthorized, false);
assert.equal(
  boundary.runner.implementationState,
  "guard_and_dispatcher_core_no_executable_runner"
);
assert.equal(
  boundary.runner.dispatcherCoreContract,
  "privacy-request-operator-runner-core-2026-09-14.json"
);
assert.equal(boundary.runner.surface, "future_local_server_command_only");
assert.equal(boundary.runner.publicRouteAllowed, false);
assert.equal(boundary.runner.clientBundleAllowed, false);
assert.equal(boundary.runner.productionBindingState, "absent");
assert.equal(boundary.runner.operatorRole, "privacy_owner");
assert.equal(boundary.runner.singleCaseOnly, true);
assert.equal(boundary.runner.batchMutationAllowed, false);
assert.equal(boundary.runner.inputTransport, "single_json_document_over_stdin");
assert.equal(boundary.runner.commandLinePayloadAllowed, false);
assert.equal(boundary.runner.persistedCommandFileAllowed, false);
assert.deepEqual(boundary.runner.allowedActions, privacyRequestOperatorActions);

const baseEnvironment = {
  PRIVACY_REQUEST_OPERATIONS_ENABLED: "true",
  PRIVACY_REQUEST_OPERATOR_RUNNER_ENABLED: "true"
};
const disabledGateValues = [undefined, "", "false", "TRUE", "1", "true "];

for (const value of disabledGateValues) {
  assert.equal(
    isPrivacyRequestOperatorRunnerEnabled({
      PRIVACY_REQUEST_OPERATOR_RUNNER_ENABLED: value
    }),
    false,
    `PRIVACY_REQUEST_OPERATOR_RUNNER_ENABLED=${String(value)} must fail closed`
  );
}
assert.equal(
  isPrivacyRequestOperatorRunnerEnabled({
    PRIVACY_REQUEST_OPERATOR_RUNNER_ENABLED: "true"
  }),
  true
);

for (const action of privacyRequestOperatorActions) {
  assert.equal(isPrivacyRequestOperatorAction(action), true);
}
for (const action of [undefined, null, "", "query", "batch", "migration", "export"]) {
  assert.equal(isPrivacyRequestOperatorAction(action), false);
}

assert.equal(
  privacyRequestOperatorBoundaryDecision({
    action: "acknowledge",
    environment: {},
    operator: "privacy_owner"
  }),
  "runner_disabled"
);
assert.equal(
  privacyRequestOperatorBoundaryDecision({
    action: "acknowledge",
    environment: { PRIVACY_REQUEST_OPERATOR_RUNNER_ENABLED: "true" },
    operator: "privacy_owner"
  }),
  "operations_disabled"
);
for (const value of disabledGateValues) {
  assert.equal(
    privacyRequestOperatorBoundaryDecision({
      action: "acknowledge",
      environment: {
        PRIVACY_REQUEST_OPERATIONS_ENABLED: value,
        PRIVACY_REQUEST_OPERATOR_RUNNER_ENABLED: "true"
      },
      operator: "privacy_owner"
    }),
    "operations_disabled"
  );
  assert.equal(
    privacyRequestOperatorBoundaryDecision({
      action: "queue_summary",
      environment: {
        ...baseEnvironment,
        PRIVACY_REQUEST_MONITOR_ENABLED: value
      },
      operator: "privacy_owner"
    }),
    "monitor_disabled"
  );
  assert.equal(
    privacyRequestOperatorBoundaryDecision({
      action: "retention_apply",
      environment: {
        ...baseEnvironment,
        CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED: value
      },
      operator: "privacy_owner"
    }),
    "retention_disabled"
  );
}
assert.equal(
  privacyRequestOperatorBoundaryDecision({
    action: "acknowledge",
    environment: baseEnvironment,
    operator: null
  }),
  "wrong_role"
);
assert.equal(
  privacyRequestOperatorBoundaryDecision({
    action: "queue_summary",
    environment: baseEnvironment,
    operator: "privacy_owner"
  }),
  "monitor_disabled"
);
assert.equal(
  privacyRequestOperatorBoundaryDecision({
    action: "retention_apply",
    environment: baseEnvironment,
    operator: "privacy_owner"
  }),
  "retention_disabled"
);
assert.equal(
  privacyRequestOperatorBoundaryDecision({
    action: "queue_summary",
    environment: {
      ...baseEnvironment,
      PRIVACY_REQUEST_MONITOR_ENABLED: "true"
    },
    operator: "privacy_owner"
  }),
  "allowed"
);
assert.equal(
  privacyRequestOperatorBoundaryDecision({
    action: "retention_apply",
    environment: {
      ...baseEnvironment,
      CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED: "true"
    },
    operator: "privacy_owner"
  }),
  "allowed"
);
for (const action of [
  "open_first_party_case",
  "open_mailbox_case",
  "acknowledge",
  "review",
  "resolve"
] as const) {
  assert.equal(
    privacyRequestOperatorBoundaryDecision({
      action,
      environment: baseEnvironment,
      operator: "privacy_owner"
    }),
    "allowed"
  );
}

for (const [setting, value] of Object.entries(boundary.runner.defaultGateValues)) {
  assert.equal(value, "false");
  assert.ok(
    environmentExample.includes(`${setting}="false"`),
    `${setting} must remain false in .env.example`
  );
}

for (const action of privacyRequestOperatorActions) {
  const requirements = boundary.runner.actionRequirements[action];
  assert.ok(requirements.includes("PRIVACY_REQUEST_OPERATOR_RUNNER_ENABLED"));
  assert.ok(requirements.includes("PRIVACY_REQUEST_OPERATIONS_ENABLED"));
}
assert.ok(
  boundary.runner.actionRequirements.queue_summary.includes(
    "PRIVACY_REQUEST_MONITOR_ENABLED"
  )
);
assert.ok(
  boundary.runner.actionRequirements.retention_apply.includes(
    "CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED"
  )
);

for (const prohibited of [
  "credentialInArgumentsAllowed",
  "credentialInCommandFileAllowed",
  "migrationCredentialAllowed",
  "ddlAllowed",
  "roleAdministrationAllowed",
  "unrelatedTableAccessAllowed",
  "mailboxCredentialAllowed",
  "providerCredentialAllowed"
]) {
  assert.equal(boundary.runner.databaseAccess[prohibited], false);
}
for (const prohibited of [
  "requestPayloadAllowed",
  "contactValueAllowed",
  "mailboxBodyAllowed",
  "exportPayloadAllowed",
  "providerIdentifierAllowed",
  "credentialAllowed",
  "rawErrorAllowed"
]) {
  assert.equal(boundary.runner.output[prohibited], false);
}

assert.equal(boundary.pauseReturn.project, "capitolwonkce/project-qosv1");
assert.equal(boundary.pauseReturn.environment, "Production");
assert.equal(boundary.pauseReturn.setting, "PRIVACY_REQUEST_INTAKE_ENABLED");
assert.equal(boundary.pauseReturn.triggerReviewWindows, 2);
assert.equal(boundary.pauseReturn.inactiveLaneAction, "leave_disabled_without_vercel_change");
assert.equal(boundary.pauseReturn.pause.value, "false");
assert.equal(boundary.pauseReturn.pause.automaticAllowed, false);
assert.equal(boundary.pauseReturn.pause.actionTimeApprovalRequired, true);
assert.equal(boundary.pauseReturn.pause.redeployExactReviewedSourceRequired, true);
assert.equal(boundary.pauseReturn.pause.expectedAnonymousApiStatus, 503);
assert.equal(boundary.pauseReturn.pause.expectedCacheControl, "no-store");
assert.equal(boundary.pauseReturn.return.value, "true");
assert.equal(boundary.pauseReturn.return.automaticAllowed, false);
assert.equal(boundary.pauseReturn.return.actionTimeApprovalRequired, true);
assert.equal(boundary.pauseReturn.return.redeployExactReviewedSourceRequired, true);
assert.equal(boundary.pauseReturn.return.productionRequestSubmissionIncluded, false);
assert.equal(boundary.pauseReturn.return.coverageWindowsRequired, 2);
assert.equal(boundary.pauseReturn.return.recoveryOrder, "oldest_unreviewed_first");

for (const scenario of boundary.syntheticCoverageScenarios) {
  assert.equal(
    privacyRequestCoverageAction({
      consecutiveMissedReviewWindows: scenario.consecutiveMissedReviewWindows,
      expectedMissedReviewWindows: scenario.expectedMissedReviewWindows,
      intakeActive: scenario.intakeActive
    }),
    scenario.expectedAction,
    scenario.name
  );
}

assert.match(runbook, /no executable runner or production binding exists/i);
assert.match(runbook, /does not preauthorize its configuration change/i);
assert.match(runbook, /Production-scoped `PRIVACY_REQUEST_INTAKE_ENABLED` from `true` to exact lowercase `false`/);
assert.match(runbook, /Production-scoped `PRIVACY_REQUEST_INTAKE_ENABLED` from exact lowercase `false` to exact lowercase `true`/);
assert.match(runbook, /two scheduled review windows/i);
assert.match(runbook, /oldest-unreviewed-first/i);
assert.match(runbook, /Do not touch Vercel/i);
assert.match(runbook, /does not make the runner/i);

assert.equal(
  /getPrisma|\$queryRaw|console\.|\bfetch\s*\(|process\.argv|node:fs/.test(guardSource),
  false,
  "the pure guard must not acquire data, credentials, arguments, or logging bindings"
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
    /privacy-request-operator-boundary|PRIVACY_REQUEST_OPERATOR_RUNNER_ENABLED/.test(
      source
    ),
    false,
    `${path.relative(repositoryRoot, applicationFile)} must not expose the operator guard`
  );
}

assert.match(
  packageDocument.scripts["privacy-request:operator-boundary:check"],
  /check-privacy-request-operator-boundary\.ts/
);
assert.match(
  packageDocument.scripts["privacy-request:check"],
  /check-privacy-request-operator-boundary\.ts/
);

console.log("Privacy-request operator-boundary checks passed.");
