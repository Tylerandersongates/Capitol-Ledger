import { existsSync, lstatSync, readdirSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

const checks = [];

function record(kind, name, detail = "") {
  checks.push({ kind, name });
  const marker = kind === "pass" ? "PASS" : kind === "fail" ? "FAIL" : "WARN";
  console.log(`${marker} ${name}${detail ? ` - ${detail}` : ""}`);
}

function pass(name, detail = "") {
  record("pass", name, detail);
}

function warn(name, detail = "") {
  record("warn", name, detail);
}

function fail(name, detail = "") {
  record("fail", name, detail);
}

function findDarwinSwcBinary() {
  const pnpmDir = "node_modules/.pnpm";
  if (!existsSync(pnpmDir)) return "";

  const packageDir = readdirSync(pnpmDir).find((entry) => entry.startsWith("@next+swc-darwin-arm64@"));
  if (!packageDir) return "";

  return join(pnpmDir, packageDir, "node_modules/@next/swc-darwin-arm64/next-swc.darwin-arm64.node");
}

function checkNodeVersion() {
  const version = process.versions.node;
  const major = Number(version.split(".")[0]);

  if (major === 20 || major === 22) {
    pass(`Node ${version} is supported`);
    return;
  }

  fail(`Node ${version} is supported`, "Use Node 20 or 22 for local Next preview. Node 24 can hang during route compilation in this app.");
}

function checkNodeModules() {
  if (!existsSync("node_modules")) {
    fail("node_modules exists", "Run pnpm install before starting local preview.");
    return;
  }

  const stats = lstatSync("node_modules");
  if (stats.isSymbolicLink()) {
    fail("node_modules is repo-local", "Remove the external symlink and reinstall dependencies in this repo.");
    return;
  }

  pass("node_modules is repo-local");
}

function countDuplicateDependencyLinks(dir, depth = 0) {
  if (!existsSync(dir) || depth > 4) return 0;

  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.endsWith(" 2")) count += 1;
    if (entry.isDirectory()) count += countDuplicateDependencyLinks(join(dir, entry.name), depth + 1);
  }

  return count;
}

function checkDuplicateDependencyLinks() {
  const duplicates = countDuplicateDependencyLinks("node_modules");
  if (!duplicates) {
    pass("node_modules has no duplicate copy links");
    return;
  }

  fail("node_modules has no duplicate copy links", `Found ${duplicates} duplicate '* 2' entries. Move node_modules aside and reinstall cleanly.`);
}

function checkNativeSwc() {
  if (process.platform !== "darwin" || process.arch !== "arm64") return;

  const swcBinary = findDarwinSwcBinary();
  if (!swcBinary || !existsSync(swcBinary)) {
    warn("Next native SWC binary is present", "Next can fall back to WASM, but local preview may start slowly.");
    return;
  }

  const result = spawnSync("codesign", ["--verify", swcBinary], { stdio: "ignore" });
  if (result.status === 0) {
    pass("Next native SWC binary is signed");
    return;
  }

  fail("Next native SWC binary is signed", `Run codesign --force --sign - "${swcBinary}" before starting local preview.`);
}

console.log("Checking Capitol Ledger CE local preview runtime");
checkNodeVersion();
checkNodeModules();
checkDuplicateDependencyLinks();
checkNativeSwc();

const failures = checks.filter((check) => check.kind === "fail");
if (failures.length) {
  console.error(`Local preview is not ready: ${failures.length} blocking issue(s).`);
  process.exit(1);
}

console.log("Local preview runtime check completed.");
