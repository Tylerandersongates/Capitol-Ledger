#!/usr/bin/env node

import {
  executePrivacyRequestOperatorDocument,
  privacyRequestOperatorCommandMaximumBytes,
  type PrivacyRequestOperatorExecutionResult,
  type PrivacyRequestOperatorRunnerAdapter
} from "@/lib/privacy-request-operator-runner";

const invalidCommandResult = {
  action: null,
  decision: "not_executed",
  reason: "invalid_command"
} as const;

function adapterUnavailable(): never {
  throw new Error("Privacy operator adapter is not bound.");
}

const unboundAdapter: PrivacyRequestOperatorRunnerAdapter = {
  acknowledge: async () => adapterUnavailable(),
  openFirstPartyCase: async () => adapterUnavailable(),
  openMailboxCase: async () => adapterUnavailable(),
  queueSummary: async () => adapterUnavailable(),
  retentionApply: async () => adapterUnavailable(),
  review: async () => adapterUnavailable(),
  resolve: async () => adapterUnavailable()
};

async function readBoundedDocument() {
  if (process.stdin.isTTY) {
    throw new Error("A piped command document is required.");
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of process.stdin) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > privacyRequestOperatorCommandMaximumBytes) {
      throw new Error("The command document is too large.");
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks, totalBytes).toString("utf8");
}

function exitCodeFor(result: PrivacyRequestOperatorExecutionResult) {
  if (result.decision === "completed") return 0;
  if (result.decision === "not_executed") return 2;
  return 3;
}

function writeResult(
  result: PrivacyRequestOperatorExecutionResult,
  exitCode = exitCodeFor(result)
) {
  process.exitCode = exitCode;
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

async function main() {
  if (process.argv.length !== 2) {
    writeResult(invalidCommandResult);
    return;
  }

  let document: string;
  try {
    document = await readBoundedDocument();
  } catch {
    writeResult(invalidCommandResult);
    return;
  }

  const result = await executePrivacyRequestOperatorDocument({
    adapter: unboundAdapter,
    document
  });
  writeResult(result);
}

process.stdout.on("error", () => {
  process.exitCode = 4;
});

main().catch(() => {
  writeResult(invalidCommandResult, 4);
});
