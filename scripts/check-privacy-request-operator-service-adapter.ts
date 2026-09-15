#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PrivacyRequestOperationRecord } from "@/lib/privacy-request-operations-contract";
import {
  executePrivacyRequestOperatorDocument,
  privacyRequestOperatorCommandVersion
} from "@/lib/privacy-request-operator-runner";
import {
  createPrivacyRequestOperatorServiceAdapter,
  type PrivacyRequestOperatorServiceDatabaseClient
} from "@/lib/privacy-request-operator-service-adapter";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const read = (relativePath: string) =>
  fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

const contract = JSON.parse(
  read("docs/privacy-request-operator-service-adapter-2026-09-14.json")
);
const runbook = read(
  "docs/privacy-request-operator-service-adapter-2026-09-14.md"
);
const adapterSource = read("lib/privacy-request-operator-service-adapter.ts");
const shellSource = read("scripts/run-privacy-request-operator.ts");
const packageDocument = JSON.parse(read("package.json"));

assert.equal(contract.contractVersion, privacyRequestOperatorCommandVersion);
assert.equal(contract.decisionStatus, "service_adapter_deployed_after_pr21");
assert.equal(contract.productionExecutionAuthorized, false);
assert.equal(contract.deploymentEvidence.pullRequest, 21);
assert.equal(
  contract.deploymentEvidence.branchCommit,
  "17101896ccc3f0fd7e21cac1fce5a0acdb481000"
);
assert.equal(
  contract.deploymentEvidence.mergeCommit,
  "f83be73c4fdd34ffb9f8cef2faa68837d3985528"
);
assert.equal(
  contract.deploymentEvidence.vercelDeploymentId,
  "7HfnCVfeNTjHYvHmiyvkkWNmAyuU"
);
assert.equal(contract.deploymentEvidence.environment, "Production");
assert.equal(contract.deploymentEvidence.deploymentState, "Ready");
assert.equal(contract.deploymentEvidence.canonicalDomain, "www.capitolwonk.com");
assert.equal(contract.deploymentEvidence.apexPrivacyRedirectStatus, 308);
assert.equal(contract.deploymentEvidence.canonicalPrivacyStatus, 200);
assert.equal(contract.deploymentEvidence.privacyApiStatus, 503);
assert.equal(contract.deploymentEvidence.privacyApiCacheControl, "no-store");
assert.equal(contract.implementation.adapterFactoryImplemented, true);
assert.equal(contract.implementation.stdinShellBindingState, "intentionally_unbound");
assert.equal(contract.implementation.explicitDatabaseDependencyRequired, true);
assert.equal(contract.implementation.explicitEnvironmentDependencyRequired, true);
assert.equal(contract.implementation.explicitClockDependencyRequired, true);
assert.equal(contract.implementation.defaultDatabaseResolutionAllowed, false);
assert.equal(contract.implementation.databaseUrlReadAllowed, false);
assert.equal(contract.implementation.productionPrincipalImplemented, false);
assert.equal(contract.implementation.productionCredentialImplemented, false);
assert.equal(contract.implementation.publicRouteImplemented, false);
assert.equal(contract.implementation.schedulerImplemented, false);
assert.equal(contract.binding.stdinShellImportsAdapter, false);
assert.equal(contract.binding.applicationRouteImportsAdapter, false);
assert.equal(contract.binding.productionBindingState, "absent");
assert.equal(
  contract.binding.functionBoundaryContract,
  "privacy-request-operator-function-boundary-2026-09-14.json"
);
assert.equal(contract.binding.functionBoundaryState, "source_only_unbound_not_migrated");
assert.equal(contract.validation.syntheticDatabaseOnly, true);
assert.equal(contract.validation.allSevenActionsCovered, true);

const now = new Date("2026-09-14T20:00:00.000Z");
const caseReference = "case_reference_123";
const baseRecord: PrivacyRequestOperationRecord = {
  caseReference,
  deleteAt: null,
  exceptionCategory: "none",
  humanAcknowledgementAt: null,
  identityState: "intake_identity",
  lane: "first_party",
  machineReceiptAt: "2026-09-14T19:59:00.000Z",
  operator: null,
  receivedAt: "2026-09-14T19:58:00.000Z",
  requestType: "data_export",
  resolution: null,
  resolvedAt: null,
  sourceBoundaryCategories: [],
  workflowStatus: "new"
};

let databaseCalls = 0;
const database: PrivacyRequestOperatorServiceDatabaseClient = {
  async $queryRawUnsafe<T>(query: string, ...values: unknown[]) {
    databaseCalls += 1;

    if (query.includes("COUNT(*) FILTER")) {
      return [
        {
          deniedCount: 0,
          duplicateCount: 0,
          fulfilledCount: 1,
          newCount: 2,
          newOldestAgeSeconds: 3600,
          noActionNeededCount: 0,
          partiallyFulfilledCount: 0,
          redirectedToAccountDeletionCount: 0,
          reviewingCount: 1,
          reviewingOldestAgeSeconds: 90000,
          withdrawnCount: 0
        }
      ] as T;
    }
    if (query.includes("WITH minimized AS")) {
      return [{ count: 3 }] as T;
    }
    if (query.includes("WITH deleted AS")) {
      return [{ count: 2 }] as T;
    }
    if (query.includes("WITH inserted AS")) {
      assert.equal(values[0], caseReference);
      return [baseRecord] as T;
    }
    if (query.includes("VALUES ($1, 'mailbox'")) {
      return [
        {
          ...baseRecord,
          caseReference: "mailbox_case_123",
          identityState: values[4],
          lane: "mailbox",
          machineReceiptAt: values[3],
          receivedAt: values[2],
          requestType: values[1]
        }
      ] as T;
    }
    if (query.includes('SET\n        "humanAcknowledgementAt"')) {
      assert.equal(values[0], caseReference);
      return [
        {
          ...baseRecord,
          humanAcknowledgementAt: values[1],
          operator: values[2],
          workflowStatus: "reviewing"
        }
      ] as T;
    }
    if (query.includes('SET\n        "identityState"')) {
      assert.equal(values[0], caseReference);
      return [
        {
          ...baseRecord,
          exceptionCategory: values[3],
          humanAcknowledgementAt: "2026-09-14T19:59:30.000Z",
          identityState: values[1],
          operator: values[4],
          sourceBoundaryCategories: values[2],
          workflowStatus: "reviewing"
        }
      ] as T;
    }
    if (query.includes('"workflowStatus" = \'resolved\'')) {
      assert.equal(values[0], caseReference);
      return [
        {
          ...baseRecord,
          deleteAt: "2028-09-14T20:00:00.000Z",
          exceptionCategory: values[3],
          humanAcknowledgementAt: "2026-09-14T19:59:30.000Z",
          identityState: "reauthenticated",
          operator: values[4],
          resolution: values[1],
          resolvedAt: values[2],
          sourceBoundaryCategories: ["account_profile"],
          workflowStatus: "resolved"
        }
      ] as T;
    }

    throw new Error("Unexpected synthetic database query.");
  }
};

const enabledEnvironment = {
  CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED: "true",
  PRIVACY_REQUEST_MONITOR_ENABLED: "true",
  PRIVACY_REQUEST_OPERATIONS_ENABLED: "true",
  PRIVACY_REQUEST_OPERATOR_RUNNER_ENABLED: "true"
};
const adapter = createPrivacyRequestOperatorServiceAdapter({
  database,
  environment: enabledEnvironment,
  now: () => now
});
const command = (action: string, rest: Record<string, unknown> = {}) =>
  JSON.stringify({
    action,
    commandVersion: privacyRequestOperatorCommandVersion,
    operator: "privacy_owner",
    ...rest
  });

async function main() {
  const disabledResult = await executePrivacyRequestOperatorDocument({
    adapter,
    document: command("queue_summary"),
    environment: {}
  });
  assert.deepEqual(disabledResult, {
    action: "queue_summary",
    decision: "not_executed",
    reason: "runner_disabled"
  });
  assert.equal(databaseCalls, 0, "a disabled runner must not reach the adapter database");

  const cases = [
    ["queue_summary", command("queue_summary")],
    [
      "open_first_party_case",
      command("open_first_party_case", { caseReference })
    ],
    [
      "open_mailbox_case",
      command("open_mailbox_case", {
        identityState: "email_control",
        machineReceiptAt: "2026-09-14T19:59:00.000Z",
        receivedAt: "2026-09-14T19:58:00.000Z",
        requestType: "access_summary"
      })
    ],
    ["acknowledge", command("acknowledge", { caseReference })],
    [
      "review",
      command("review", {
        caseReference,
        exceptionCategory: "none",
        identityState: "reauthenticated",
        reauthenticatedAt: now.toISOString(),
        sourceBoundaryCategories: ["account_profile"]
      })
    ],
    [
      "resolve",
      command("resolve", {
        caseReference,
        exceptionCategory: "none",
        reauthenticatedAt: now.toISOString(),
        resolution: "fulfilled"
      })
    ],
    ["retention_apply", command("retention_apply")]
  ] as const;

  for (const [action, document] of cases) {
    const result = await executePrivacyRequestOperatorDocument({
      adapter,
      document,
      environment: enabledEnvironment
    });
    assert.equal(result.action, action);
    assert.equal(result.decision, "completed");
    assert.equal(
      /"(?:email|contactValue|mailboxBody|attachment|exportPayload|providerIdentifier|credential|rawError)":/.test(
        JSON.stringify(result)
      ),
      false,
      `${action} must preserve the minimized output boundary`
    );
  }

  assert.equal(databaseCalls, 8, "seven actions should issue only their expected eight service queries");

  assert.match(adapterSource, /options\.database/);
  assert.match(adapterSource, /options\.environment/);
  assert.match(adapterSource, /options\.now\(\)/);
  assert.equal(
    /getPrisma|hasDatabaseUrl|DATABASE_URL|process\.env|node:(?:fs|net|http|https|tls|dgram|dns|child_process)|\bfetch\s*\(|console\.|process\.stderr/.test(
      adapterSource
    ),
    false,
    "the adapter must not resolve production state or acquire network, filesystem, subprocess, or logging capability"
  );
  assert.equal(
    /privacy-request-operator-service-adapter/.test(shellSource),
    false,
    "the stdin shell must remain intentionally unbound"
  );

  function listSourceFiles(directory: string): string[] {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listSourceFiles(entryPath);
      return /\.(?:js|jsx|mjs|ts|tsx)$/.test(entry.name) ? [entryPath] : [];
    });
  }

  for (const applicationFile of listSourceFiles(path.join(repositoryRoot, "app"))) {
    assert.equal(
      /privacy-request-operator-service-adapter/.test(
        fs.readFileSync(applicationFile, "utf8")
      ),
      false,
      `${path.relative(repositoryRoot, applicationFile)} must not import the service adapter`
    );
  }

  assert.match(runbook, /explicit-dependency adapter is deployed after PR #21/i);
  assert.match(runbook, /not bound to the stdin shell or a production database/i);
  assert.match(runbook, /does not authorize/i);
  assert.match(
    packageDocument.scripts["privacy-request:operator-service-adapter:check"],
    /check-privacy-request-operator-service-adapter\.ts/
  );
  assert.match(
    packageDocument.scripts["privacy-request:check"],
    /check-privacy-request-operator-service-adapter\.ts/
  );

  process.stdout.write("Privacy-request operator service-adapter checks passed.\n");
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`
  );
  process.exitCode = 1;
});
