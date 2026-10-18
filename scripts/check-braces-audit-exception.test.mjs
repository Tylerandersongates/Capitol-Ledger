import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { SPEC, RECORD, checkRecord, auditDecision, graphScope, checkFiles, sourceScope, checkTraces, checkSession, captureAudit, checkUpstream, checkedRun, verifyScope, main } from "./check-braces-audit-exception.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const now = Date.parse("2026-10-16T12:00:00.000Z");
const readRecord = () => JSON.parse(fs.readFileSync(path.join(root, RECORD)));
const approved = () => ({ ...readRecord(), status: "approved", approval: { approvedBy: "Tyler", approvedAtUtc: "2026-10-15T20:00:00.000Z", decisionReference: "TEST FIXTURE ONLY — not actual owner approval" } });
const temporary = t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "capitol-exception-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true })); // Only this test-created directory.
  return dir;
};
const fixtureReport = () => {
  const advisory = (id, ghsa, module, severity) => ({ id, github_advisory_id: ghsa, module_name: module, severity, findings: [{ version: "1.0.0", paths: [] }] });
  const target = { ...advisory(1, SPEC.ghsa, "braces", "high"), findings: [{ version: SPEC.version, paths: [] }], vulnerable_versions: "<=3.0.3", patched_versions: "<0.0.0", updated: SPEC.updated, cves: [SPEC.cve] };
  return { advisories: { 1: target, 2: advisory(2, "GHSA-aaaa-bbbb-cccc", "other", "moderate") }, muted: [], metadata: { vulnerabilities: { info: 0, low: 0, moderate: 1, high: 1, critical: 0 } } };
};
const fixtureGraph = directory => {
  const top = { name: "capitol-ledger", version: "0.1.0", private: true, path: "/fixture", devDependencies: {} };
  for (const trail of SPEC.paths) {
    const [, ...tokens] = trail.split(">");
    let edges = top.devDependencies;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const split = token.lastIndexOf("@");
      const name = token.slice(0, split);
      edges[name] ??= { version: token.slice(split + 1), path: directory };
      if (i < tokens.length - 1) { edges[name].dependencies ??= {}; edges = edges[name].dependencies; }
    }
  }
  return [top];
};
function library() {
  // These overrides belong ONLY to this test file. The production gate has no
  // approval, clock, graph, or mitigation bypass environment variables.
  if (process.env.BRACES_TEST_LIBRARY) return process.env.BRACES_TEST_LIBRARY;
  const app = createRequire(path.join(root, "package.json"));
  const tailwind = createRequire(app.resolve("tailwindcss"));
  const micromatch = createRequire(tailwind.resolve("micromatch"));
  return path.dirname(micromatch.resolve("braces"));
}
function typescript() {
  if (process.env.BRACES_TEST_TYPESCRIPT) return process.env.BRACES_TEST_TYPESCRIPT;
  return path.dirname(createRequire(path.join(root, "package.json")).resolve("typescript/package.json"));
}
function scopeFixture(t) {
  const dir = temporary(t);
  for (const file of [...Object.keys(SPEC.pins), RECORD]) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.copyFileSync(path.join(root, file), path.join(dir, file));
  }
  fs.writeFileSync(path.join(dir, RECORD), JSON.stringify(approved()));
  const installed = path.join(dir, "node_modules/.pnpm/braces-test/node_modules/braces");
  fs.mkdirSync(installed, { recursive: true });
  for (const file of Object.keys(SPEC.installed)) {
    fs.mkdirSync(path.dirname(path.join(installed, file)), { recursive: true });
    fs.copyFileSync(path.join(library(), file), path.join(installed, file));
  }
  // fill-range is unchanged; resolve it from the actual test library's parent.
  const fillRange = path.dirname(createRequire(path.join(library(), "package.json")).resolve("fill-range/package.json"));
  fs.symlinkSync(fillRange, path.join(installed, "../fill-range"), "dir");
  fs.symlinkSync(typescript(), path.join(dir, "node_modules/typescript"), "dir");
  for (const name of ["app", "components", "lib"]) fs.mkdirSync(path.join(dir, name));
  fs.writeFileSync(path.join(dir, "app/page.tsx"), "export default function Page(){return null}");
  const all = fixtureGraph(installed);
  all[0].path = dir;
  const production = [{ name: "capitol-ledger", version: "0.1.0", private: true, path: dir }];
  const run = (cmd, args, options) => {
    if (cmd !== "pnpm") return spawnSync(cmd, args, options);
    const stdout = args[0] === "--version" ? "9.15.9" : JSON.stringify(args.includes("--prod") ? production : all);
    return { status: 0, signal: null, stdout, stderr: "" };
  };
  return { dir, installed, all, production, run };
}

test("a pending record is not accepted risk", () => {
  const record = readRecord();
  record.status = "pending";
  assert.throws(() => checkRecord(record, now), /pending owner approval/);
});
test("a fully scoped synthetic approved record passes within its window", () => checkRecord(approved(), now));
for (const [name, mutate] of [
  ["wrong owner", r => r.riskOwner = "someone else"],
  ["wrong approver", r => r.approval.approvedBy = "someone else"],
  ["missing approval timestamp", r => r.approval.approvedAtUtc = null],
  ["future approval", r => r.approval.approvedAtUtc = "2026-10-17T00:00:00.000Z"],
  ["missing decision reference", r => r.approval.decisionReference = null],
  ["placeholder approval", r => r.approval.decisionReference = "pending owner approval"],
  ["extended expiry", r => r.expiresAtUtc = "2026-11-30T07:00:00.000Z"],
  ["extended review", r => r.reviewByUtc = r.expiresAtUtc],
  ["different advisory", r => r.scope.advisory = "GHSA-aaaa-bbbb-cccc"],
  ["different version", r => r.scope.version = "3.0.2"],
  ["production exception", r => r.scope.developmentOnly = false],
  ["edited pins", r => r.pins = {}],
  ["edited installed bytes", r => r.installedSha256 = {}],
  ["broader paths", r => r.allowedPaths = [...SPEC.paths, "dependencies>braces@3.0.3"]]
]) test(`record rejects ${name}`, () => { const r = approved(); mutate(r); assert.throws(() => checkRecord(r, now)); });
for (const stamp of ["2026-10-14T23:59:59.000Z", SPEC.reviewBy, SPEC.expires, "2027-01-01T00:00:00.000Z"]) test(`deadline fails closed: ${stamp}`, () => assert.throws(() => checkRecord(approved(), Date.parse(stamp))));
test("review deadline boundary permits the last prior millisecond", () => checkRecord(approved(), Date.parse(SPEC.reviewBy) - 1));
test("audit retains one accepted HIGH and all raw moderate counts", () => assert.deepEqual(auditDecision(fixtureReport(), 1), { rawCounts: { info: 0, low: 0, moderate: 1, high: 1, critical: 0 }, acceptedHigh: 1, unacceptedHigh: 0, critical: 0, disposition: "mitigated-still-flagged" }));
for (const [name, mutate] of [
  ["unrelated high", r => { r.advisories[2].severity = "high"; r.metadata.vulnerabilities.moderate--; r.metadata.vulnerabilities.high++; }],
  ["unrelated critical", r => { r.advisories[2].severity = "critical"; r.metadata.vulnerabilities.moderate--; r.metadata.vulnerabilities.critical++; }],
  ["target escalates to critical", r => r.advisories[1].severity = "critical"],
  ["target changes package", r => r.advisories[1].module_name = "another-package"],
  ["target changes version", r => r.advisories[1].findings[0].version = "3.0.2"],
  ["mixed affected versions", r => r.advisories[1].findings.push({ version: "3.0.2", paths: [] })],
  ["published fix", r => r.advisories[1].patched_versions = ">=3.0.4"],
  ["advisory update", r => r.advisories[1].updated = "2026-10-16T00:00:00.000Z"],
  ["missing identity", r => delete r.advisories[1].github_advisory_id],
  ["different CVE", r => r.advisories[1].cves = []],
  ["unknown severity", r => r.advisories[2].severity = "unknown"],
  ["muted report", r => r.muted = [1]],
  ["missing muted schema", r => delete r.muted],
  ["inconsistent totals", r => r.metadata.vulnerabilities.high = 0],
  ["unknown totals schema", r => r.metadata.vulnerabilities.newSeverity = 0],
  ["missing advisory", r => { delete r.advisories[1]; r.metadata.vulnerabilities.high = 0; }],
  ["duplicated target", r => { r.advisories[3] = { ...r.advisories[1], id: 3 }; r.metadata.vulnerabilities.high++; }],
  ["registry error JSON", r => { delete r.advisories; r.error = "registry unavailable"; }]
]) test(`audit rejects ${name}`, () => { const report = fixtureReport(); mutate(report); assert.throws(() => auditDecision(report, 1)); });
for (const exit of [0, 2, 7, null]) test(`audit rejects unexpected exit ${exit}`, () => assert.throws(() => auditDecision(fixtureReport(), exit)));
test("audit does not rely on empty or misleading path metadata", () => {
  const report = fixtureReport();
  report.advisories[1].findings[0].paths = ["npm metadata is not the graph authority"];
  assert.equal(auditDecision(report, 1).acceptedHigh, 1);
});
const emptyProduction = () => [{ name: "capitol-ledger", version: "0.1.0", private: true, path: "/fixture" }];
test("exact independent four-path development graph passes", () => assert.deepEqual(graphScope(fixtureGraph("/fixture"), emptyProduction()), ["/fixture"]));
test("production graph exposure rejects", () => { const prod = emptyProduction(); prod[0].dependencies = { braces: { version: "3.0.3", path: "/fixture" } }; assert.throws(() => graphScope(fixtureGraph("/fixture"), prod)); });
test("additional development path rejects", () => { const graph = fixtureGraph("/fixture"); graph[0].devDependencies.braces = { version: "3.0.3", path: "/fixture" }; assert.throws(() => graphScope(graph, emptyProduction())); });
test("missing graph path rejects", () => { const graph = fixtureGraph("/fixture"); delete graph[0].devDependencies.tailwindcss.dependencies.chokidar; assert.throws(() => graphScope(graph, emptyProduction())); });
test("changed graph parent version rejects", () => { const graph = fixtureGraph("/fixture"); graph[0].devDependencies.tailwindcss.version = "4.0.0"; assert.throws(() => graphScope(graph, emptyProduction())); });
test("missing or ambiguous graph schema rejects", () => { for (const graph of [null, {}, [], [{}], [{}, {}]]) assert.throws(() => graphScope(graph, emptyProduction())); });
test("unknown graph root fields reject", () => { const graph = fixtureGraph("/fixture"); graph[0].prodDependencies = {}; assert.throws(() => graphScope(graph, emptyProduction())); });
test("graphs from different projects reject", () => { const prod = emptyProduction(); prod[0].path = "/another-project"; assert.throws(() => graphScope(fixtureGraph("/fixture"), prod)); });

test("full local scope verification executes real regression probes", t => { const f = scopeFixture(t); assert.equal(verifyScope(f.dir, now, f.run).probes[0].cases, 31); });
for (const file of Object.keys(SPEC.pins)) test(`scope rejects changed ${file}`, t => { const f = scopeFixture(t); fs.appendFileSync(path.join(f.dir, file), "\n"); assert.throws(() => verifyScope(f.dir, now, f.run)); });
for (const file of Object.keys(SPEC.installed)) test(`installed-byte check rejects changed ${file}`, t => { const f = scopeFixture(t); fs.appendFileSync(path.join(f.installed, file), "\n"); assert.throws(() => checkFiles(f.dir, f.installed)); });
test("extra installed library file rejects", t => { const f = scopeFixture(t); fs.writeFileSync(path.join(f.installed, "lib/extra.js"), ""); assert.throws(() => checkFiles(f.dir, f.installed)); });
test("external installed dependency directory rejects", t => { const f = scopeFixture(t); assert.throws(() => checkFiles(f.dir, library()), /escapes/); });
for (const module of ["braces", "micromatch", "fast-glob", "chokidar", "tailwindcss", "braces/lib/compile"]) test(`application import of ${module} rejects`, t => { const f = scopeFixture(t); fs.writeFileSync(path.join(f.dir, "app/page.tsx"), `import x from '${module}';`); assert.throws(() => sourceScope(f.dir), /requires review/); });
test("dynamic require/import expressions require review", t => { const f = scopeFixture(t); fs.writeFileSync(path.join(f.dir, "lib/dynamic.ts"), "const x = import(name);"); assert.throws(() => sourceScope(f.dir), /requires review/); });
test("source changes alter the preflight fingerprint", t => { const f = scopeFixture(t); const before = verifyScope(f.dir, now, f.run); fs.appendFileSync(path.join(f.dir, "app/page.tsx"), "\n// change"); const after = verifyScope(f.dir, now, f.run); assert.notEqual(before.fingerprint, after.fingerprint); });

function traceFixture(t) {
  const dir = temporary(t);
  const server = path.join(dir, ".next/server");
  fs.mkdirSync(server, { recursive: true });
  fs.writeFileSync(path.join(dir, ".next/BUILD_ID"), "fixture-build");
  const files = [".next/next-server.js.nft.json", ".next/next-minimal-server.js.nft.json", ...Array.from({ length: 78 }, (_, i) => `.next/server/route-${i}.nft.json`)];
  for (const file of files) fs.writeFileSync(path.join(dir, file), JSON.stringify({ version: 1, files: ["../node_modules/safe/index.js"] }));
  return { dir, files, start: Date.now() - 1000 };
}
test("complete fresh production traces pass", t => { const f = traceFixture(t); assert.equal(checkTraces(f.dir, f.start), 80); });
for (const module of ["braces", "micromatch", "fast-glob", "chokidar", "tailwindcss"]) test(`production trace exposure to ${module} rejects`, t => { const f = traceFixture(t); fs.writeFileSync(path.join(f.dir, f.files[0]), JSON.stringify({ version: 1, files: [`../node_modules/.pnpm/${module}@3.0.3/node_modules/${module}/index.js`] })); assert.throws(() => checkTraces(f.dir, f.start)); });
test("Windows-style trace exposure also rejects", t => { const f = traceFixture(t); fs.writeFileSync(path.join(f.dir, f.files[0]), JSON.stringify({ version: 1, files: ["..\\node_modules\\braces\\index.js"] })); assert.throws(() => checkTraces(f.dir, f.start)); });
test("stale build evidence rejects", t => { const f = traceFixture(t); fs.utimesSync(path.join(f.dir, f.files[0]), new Date(0), new Date(0)); assert.throws(() => checkTraces(f.dir, f.start)); });
test("missing/incomplete traces reject", t => { const f = traceFixture(t); fs.unlinkSync(path.join(f.dir, f.files[2])); assert.throws(() => checkTraces(f.dir, f.start)); });
test("missing successful BUILD_ID rejects", t => { const f = traceFixture(t); fs.unlinkSync(path.join(f.dir, ".next/BUILD_ID")); assert.throws(() => checkTraces(f.dir, f.start)); });
test("malformed trace rejects", t => { const f = traceFixture(t); fs.writeFileSync(path.join(f.dir, f.files[0]), "{}"); assert.throws(() => checkTraces(f.dir, f.start)); });
test("stale/changed/future preflight rejects", () => { const scope = { fingerprint: "fixture" }; const p = { startedAtUtc: new Date(now).toISOString(), scope }; assert.equal(checkSession(p, scope, now + 1000), now); assert.throws(() => checkSession(p, scope, now + 25 * 60000 + 1)); assert.throws(() => checkSession(p, scope, now - 1)); assert.throws(() => checkSession(p, { fingerprint: "changed" }, now)); });

test("capture retains unfiltered raw evidence and constrained command", t => {
  const dir = temporary(t);
  const raw = JSON.stringify(fixtureReport(), null, 2);
  const run = (command, args) => { assert.equal(command, "pnpm"); assert.deepEqual(args, ["audit", "--json", "--audit-level", "high", "--registry=https://registry.npmjs.org/"]); return { status: 1, stdout: raw, stderr: "" }; };
  assert.equal(captureAudit(root, dir, run).acceptedHigh, 1);
  assert.equal(fs.readFileSync(path.join(dir, "full-audit.raw.json"), "utf8"), raw);
  assert.throws(() => captureAudit(root, dir, run), /already exists/);
});
for (const [name, response] of [
  ["timeout", { error: new Error("timeout"), status: null, stdout: "", stderr: "timeout" }],
  ["signal", { status: null, signal: "SIGTERM", stdout: "", stderr: "" }],
  ["registry JSON error", { status: 1, stdout: '{"error":"registry"}', stderr: "" }],
  ["invalid JSON", { status: 1, stdout: "unavailable", stderr: "" }],
  ["exit 7", { status: 7, stdout: "{}", stderr: "" }]
]) test(`capture fails closed and preserves evidence on ${name}`, t => { const dir = temporary(t); assert.throws(() => captureAudit(root, dir, () => response)); assert.equal(fs.readFileSync(path.join(dir, "full-audit.raw.json"), "utf8"), response.stdout); });
test("local command failures cannot become successful scope evidence", () => assert.throws(() => checkedRun("pnpm", ["list"], root, () => ({ status: 1, stdout: "[]" }))));
test("CLI provides no approval/clock bypass flags", () => { assert.throws(() => main(["--approve", "/tmp/test"])); assert.throws(() => main(["--finish", "relative"])); assert.throws(() => main(["--finish", "/tmp/test", "--now=0"])); });
for (const alias of [false, true]) test(`pending CLI record blocks through ${alias ? "symlinked" : "absolute"} entrypoint`, t => {
  const f = scopeFixture(t);
  const record = approved(); record.status = "pending";
  fs.writeFileSync(path.join(f.dir, RECORD), JSON.stringify(record));
  let entry = path.join(root, "scripts/check-braces-audit-exception.mjs");
  if (alias) { const link = path.join(f.dir, "gate-alias.mjs"); fs.symlinkSync(entry, link); entry = link; }
  const result = spawnSync(process.execPath, [entry, "--preflight", path.join(f.dir, "evidence")], { cwd: f.dir, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /pending owner approval/);
});
test("upstream lookup retains raw metadata, pins npm and rejects evidence reuse", t => {
  const dir = temporary(t);
  const run = (command, args) => {
    assert.equal(command, "pnpm");
    assert.deepEqual(args, ["view", "braces", "version", "--json", "--registry=https://registry.npmjs.org/"]);
    return { status: 0, stdout: '"3.0.3"\n', stderr: "" };
  };
  checkUpstream(root, dir, run);
  assert.equal(fs.readFileSync(path.join(dir, "braces-latest.raw.json"), "utf8"), '"3.0.3"\n');
  assert.throws(() => checkUpstream(root, dir, run));
});
for (const [name, response] of [
  ["new version", { status: 0, stdout: '"3.0.4"', stderr: "" }],
  ["missing version", { status: 0, stdout: "{}", stderr: "" }],
  ["invalid metadata", { status: 0, stdout: "unavailable", stderr: "" }],
  ["registry failure", { status: 1, stdout: "", stderr: "registry unavailable" }],
  ["timeout", { status: null, error: new Error("timeout"), stdout: "", stderr: "" }]
]) test(`upstream metadata fails closed: ${name}`, t => assert.throws(() => checkUpstream(root, temporary(t), () => response)));

test("manifest source pins must agree with the reviewed enforcer", () => {
  const record = approved();
  record.pins["package.json"] = "0".repeat(64);
  assert.throws(() => checkRecord(record, now));
});
