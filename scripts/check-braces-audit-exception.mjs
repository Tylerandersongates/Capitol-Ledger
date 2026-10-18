import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// No ignore list is passed to pnpm. This evaluates one documented exception
// AFTER validating the unfiltered report, installed mitigation, and build scope.
export const SPEC = {
  id: "CW-SEC-2026-10-BRACES",
  ghsa: "GHSA-vfj7-8cjw-p6xm",
  cve: "CVE-2026-93687",
  version: "3.0.3",
  updated: "2026-10-02T22:36:34.000Z",
  validFrom: "2026-10-15T00:00:00.000Z",
  reviewBy: "2026-10-23T07:00:00.000Z",
  expires: "2026-10-30T07:00:00.000Z",
  patch: "patches/braces@3.0.3.patch",
  pins: {
    "package.json": "e8b0f862d288951a02f2716b74c1db32c2956c3ec64ccd9771b48ec4f8648b42",
    "pnpm-lock.yaml": "826540359c68b4e88192cd09c6fcf4722ae2ff80c4ad22a147c0ab2c140d9161",
    "patches/braces@3.0.3.patch": "b898113166cec1ce5ab45fbffa452d66bdd1d82f0e42f7547c35664da4644d56",
    "tailwind.config.ts": "62dad03af9194471d06f672dd6bf3d5dae02a72e95521cc69cc65f7daf84708f",
    "next.config.mjs": "acebbeb9496dd783757947e8e4978ffb8944f4df883a801dc8d38b6fc0cb4357",
    "postcss.config.mjs": "2147573f4053310e348ad9d722882426c884376f42a354daea89bcd663b33b25",
    ".eslintrc.json": "c42575f830bb5003bb7be58fbec13d0ca65a6188155067e98076a7f3977e7472"
  },
  installed: {
    "index.js": "332ea07c7b006361aad12aa994ca75dc1db8e8382b884909e2f38f10b85c88a4",
    "package.json": "56f08b888a4f30dc7cf8a7dbb36ffe92b737912ba36abe9d069d32167c957ac7",
    "lib/compile.js": "88cf20f18b59c9b2741c2d9b0f0ac6b2967d8e174667edf817133ca57d76809e",
    "lib/constants.js": "8d0bfdb50bb1e5267facef720ba09179634761165e3d6e13ad512ed10d6c180c",
    "lib/expand.js": "46a259d3f23c0cd441fa370f16d5d48fa71060dfe918eeba84f6e95d3a94d368",
    "lib/parse.js": "adf3c108a16afaabe5379298d2227881e88f536cc7345b7df780a80d38dd01f9",
    "lib/stringify.js": "a3b8b5e7567ff9bfdbe155479fbdd92d5a924c3919adf05316f8f0c4f6330332",
    "lib/utils.js": "bbdfdad69da36c1994a19006af254659586a20d2c00b2a936926b7905cfb3aaf"
  },
  paths: [
    "devDependencies>eslint-config-next@15.5.25>@next/eslint-plugin-next@15.5.25>fast-glob@3.3.1>micromatch@4.0.8>braces@3.0.3",
    "devDependencies>tailwindcss@3.4.19>chokidar@3.6.0>braces@3.0.3",
    "devDependencies>tailwindcss@3.4.19>fast-glob@3.3.3>micromatch@4.0.8>braces@3.0.3",
    "devDependencies>tailwindcss@3.4.19>micromatch@4.0.8>braces@3.0.3"
  ]
};
export const RECORD = "docs/security/braces-exception-2026-10-15.json";
const forbidden = /(?:^|\/)(?:braces|micromatch|fast-glob|chokidar|tailwindcss)(?:@[^/]+)?(?:\/|$)/;
export const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const json = file => JSON.parse(fs.readFileSync(file, "utf8"));
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const utc = value => {
  assert.equal(typeof value, "string", "Missing UTC timestamp");
  const stamp = Date.parse(value);
  assert.ok(Number.isFinite(stamp) && new Date(stamp).toISOString() === value, "Invalid UTC timestamp");
  return stamp;
};

export function checkRecord(record, now = Date.now()) {
  assert.ok(Number.isFinite(now), "Invalid clock");
  assert.equal(record.schemaVersion, 1);
  assert.equal(record.id, SPEC.id);
  assert.equal(record.status, "approved", "Exception is pending owner approval");
  assert.equal(record.riskOwner, "Tyler");
  assert.equal(record.approval?.approvedBy, "Tyler");
  assert.ok(typeof record.approval.decisionReference === "string" && record.approval.decisionReference.length >= 12 && !/pending|todo|tbd/i.test(record.approval.decisionReference), "Missing approval evidence reference");
  assert.equal(record.validFromUtc, SPEC.validFrom);
  assert.equal(record.reviewByUtc, SPEC.reviewBy);
  assert.equal(record.expiresAtUtc, SPEC.expires);
  assert.ok(now >= utc(SPEC.validFrom) && now < utc(SPEC.expires), "Exception not valid or expired");
  assert.ok(now < utc(SPEC.reviewBy), "Mandatory October 22 review is overdue; no automatic renewal");
  const approved = utc(record.approval.approvedAtUtc);
  assert.ok(approved >= utc(SPEC.validFrom) && approved <= now, "Approval date is invalid or in the future");
  assert.ok(now - approved < 14 * 86400000, "Approval exceeds 14 days");
  assert.deepEqual(record.scope, { package: "braces", version: SPEC.version, advisory: SPEC.ghsa, cve: SPEC.cve, disposition: "mitigated-still-flagged", developmentOnly: true });
  assert.deepEqual(record.pins, SPEC.pins);
  assert.deepEqual(record.installedSha256, SPEC.installed);
  assert.deepEqual(record.allowedPaths, SPEC.paths);
}

export function auditDecision(report, exit) {
  assert.ok(object(report) && object(report.advisories) && object(report.metadata?.vulnerabilities), "Malformed audit schema");
  assert.ok(Array.isArray(report.muted) && report.muted.length === 0, "Muted or missing audit findings");
  const levels = ["info", "low", "moderate", "high", "critical"];
  const counts = Object.fromEntries(levels.map(level => [level, 0]));
  let accepted = 0;
  for (const [key, advisory] of Object.entries(report.advisories)) {
    assert.ok(object(advisory) && String(advisory.id) === key && levels.includes(advisory.severity), "Unknown/malformed advisory");
    assert.ok(typeof advisory.module_name === "string" && advisory.module_name.length > 0);
    assert.ok(/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(advisory.github_advisory_id), "Missing advisory identity");
    assert.ok(Array.isArray(advisory.findings) && advisory.findings.length > 0, "Missing affected versions");
    for (const finding of advisory.findings) {
      assert.ok(object(finding) && typeof finding.version === "string" && Array.isArray(finding.paths) && finding.paths.every(item => typeof item === "string"), "Malformed finding");
    }
    counts[advisory.severity]++;
    if (advisory.github_advisory_id === SPEC.ghsa) {
      assert.equal(advisory.module_name, "braces");
      assert.equal(advisory.severity, "high");
      assert.equal(advisory.vulnerable_versions, "<=3.0.3");
      assert.equal(advisory.patched_versions, "<0.0.0", "Published fix or advisory schema change requires reassessment");
      assert.equal(advisory.updated, SPEC.updated, "Advisory changed; reassess exception");
      assert.deepEqual(advisory.cves, [SPEC.cve]);
      assert.ok(advisory.findings.every(finding => finding.version === SPEC.version));
      accepted++;
    } else {
      assert.ok(!["high", "critical"].includes(advisory.severity), `Unaccepted ${advisory.severity}: ${advisory.github_advisory_id}`);
    }
  }
  assert.deepEqual(report.metadata.vulnerabilities, counts, "Audit totals disagree with raw findings");
  assert.equal(exit, Object.values(counts).some(count => count > 0) ? 1 : 0, "Unexpected audit exit or registry failure");
  assert.equal(accepted, 1, "Exception missing/duplicated; retire or reassess it");
  assert.equal(counts.high, 1);
  assert.equal(counts.critical, 0);
  return { rawCounts: counts, acceptedHigh: 1, unacceptedHigh: 0, critical: 0, disposition: "mitigated-still-flagged" };
}

export function graphScope(all, production) {
  const collect = tree => {
    assert.ok(Array.isArray(tree) && tree.length === 1 && object(tree[0]), "Malformed pnpm dependency graph");
    assert.equal(tree[0].name, "capitol-ledger");
    assert.equal(tree[0].version, "0.1.0");
    assert.equal(tree[0].private, true);
    assert.equal(typeof tree[0].path, "string");
    assert.ok(Object.keys(tree[0]).every(key => ["name", "version", "path", "private", "dependencies", "devDependencies", "optionalDependencies"].includes(key)), "Unknown dependency graph schema");
    const found = [];
    const walk = (dependencies, trail, depth = 0) => {
      assert.ok(depth <= 16 && object(dependencies), "Malformed/deep graph");
      for (const [name, node] of Object.entries(dependencies)) {
        assert.ok(object(node) && typeof node.version === "string" && typeof node.path === "string");
        const next = [...trail, `${name}@${node.version}`];
        if (name === "braces") found.push({ trail: next.join(">"), version: node.version, directory: node.path });
        if (node.dependencies) walk(node.dependencies, next, depth + 1);
      }
    };
    for (const group of ["dependencies", "devDependencies", "optionalDependencies"]) {
      if (tree[0][group]) walk(tree[0][group], [group]);
    }
    return found;
  };
  assert.equal(collect(production).length, 0, "braces is reachable through production dependencies");
  assert.equal(all[0].path, production[0].path, "Dependency graphs refer to different projects");
  const matches = collect(all);
  assert.deepEqual(matches.map(item => item.trail).sort(), SPEC.paths, "Dependency paths changed");
  assert.ok(matches.every(item => item.version === SPEC.version));
  return [...new Set(matches.map(item => item.directory))];
}

export function inside(root, target) {
  const relative = path.relative(fs.realpathSync(root), fs.realpathSync(target));
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative), "Dependency escapes local node_modules");
}

export function checkFiles(root, directory) {
  inside(path.join(root, "node_modules"), directory);
  for (const [file, digest] of Object.entries(SPEC.installed)) {
    const target = path.join(directory, file);
    inside(directory, target);
    assert.equal(sha(fs.readFileSync(target)), digest, `Installed mitigation differs: ${file}`);
  }
  assert.deepEqual(fs.readdirSync(path.join(directory, "lib")).sort(), ["compile.js", "constants.js", "expand.js", "parse.js", "stringify.js", "utils.js"]);
}

export const PROBE = `
const assert = require('node:assert/strict');
const b = require(process.argv[1]);
const rejects = fn => assert.throws(fn, e => e.name === 'SyntaxError' && /nesting depth/.test(e.message));
let cases = 0;
for (const pattern of ['{'.repeat(4000)+'x'+'}'.repeat(4000), '('.repeat(4000)+'x'+')'.repeat(4000), '{'.repeat(4000), '('.repeat(4000), '{('.repeat(2000)+'x'+')}'.repeat(2000)]) {
  for (const op of ['parse','compile','expand','stringify']) { rejects(() => b[op](pattern)); cases++; }
  rejects(() => b(pattern, { maxDepth: Infinity, maxLength: Infinity })); cases++;
}
for (const op of ['compile','expand','stringify']) {
  let ast = {type:'root',nodes:[]};
  for(let i=0;i<100;i++) ast={type:'root',nodes:[ast]};
  b[op](ast);
  rejects(() => b[op]({type:'root',nodes:[ast]})); cases++;
  const cycle={type:'root',nodes:[]};cycle.nodes.push(cycle);
  rejects(() => b[op](cycle)); cases++;
}
assert.deepEqual(b.expand('a/{b,c}/{1..2}'),['a/b/1','a/b/2','a/c/1','a/c/2']);
assert.equal(b.compile('a/{b,c}'),'a/(b|c)');
console.log(JSON.stringify({cases,ordinarySyntax:'pass'}));
`;

export function checkedRun(command, args, root, run = spawnSync) {
  const result = run(command, args, { cwd: root, encoding: "utf8", timeout: 60000, maxBuffer: 16 * 1024 * 1024 });
  assert.ok(!result.error && !result.signal && result.status === 0, `Local command failed: ${command} ${args.join(" ")}`);
  return result.stdout.trim();
}

export function sourceScope(root) {
  const require = createRequire(path.join(root, "package.json"));
  const ts = require("typescript");
  const sources = [];
  const scan = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      assert.ok(!entry.isSymbolicLink(), "Application source symlink requires review");
      if (entry.isDirectory()) scan(target);
      else if (/\.[cm]?[jt]sx?$/.test(entry.name)) inspect(target);
    }
  };
  const inspect = file => {
    const bytes = fs.readFileSync(file, "utf8");
    sources.push([path.relative(root, file), sha(bytes)]);
    const ast = ts.createSourceFile(file, bytes, ts.ScriptTarget.Latest, true);
    const visit = node => {
      let moduleName;
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) moduleName = node.moduleSpecifier;
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require"))) moduleName = node.arguments[0];
      if (moduleName) {
        assert.ok(ts.isStringLiteralLike(moduleName), "Dynamic application loader requires review");
        assert.ok(!forbidden.test(moduleName.text), `Build-tool application import requires review: ${path.relative(root, file)}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  };
  for (const name of ["app", "components", "lib"]) scan(path.join(root, name));
  for (const name of ["instrumentation.ts", "instrumentation-client.ts", "middleware.ts", "sentry.server.config.ts", "sentry.edge.config.ts", "sentry.client.config.ts"]) if (fs.existsSync(path.join(root, name))) inspect(path.join(root, name));
  return sha(JSON.stringify(sources.sort(([a], [b]) => a.localeCompare(b))));
}

export function checkTraces(root, startedAt, now = Date.now()) {
  const build = path.join(root, ".next");
  assert.ok(fs.lstatSync(build).isDirectory() && !fs.lstatSync(build).isSymbolicLink(), "Build directory is not local");
  const fresh = file => {
    const stat = fs.lstatSync(file);
    assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.mtimeMs >= startedAt - 2000 && stat.mtimeMs <= now + 2000, "Missing/stale build evidence");
  };
  fresh(path.join(build, "BUILD_ID"));
  assert.ok(fs.readFileSync(path.join(build, "BUILD_ID"), "utf8").trim().length > 0);
  const files = [path.join(build, "next-server.js.nft.json"), path.join(build, "next-minimal-server.js.nft.json")];
  const scan = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      assert.ok(!entry.isSymbolicLink(), "Trace directory symlink requires review");
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) scan(file);
      else if (entry.name.endsWith(".nft.json")) files.push(file);
    }
  };
  scan(path.join(build, "server"));
  assert.ok(files.length >= 80, "Incomplete build traces; scope review required");
  for (const file of files) {
    fresh(file);
    const trace = json(file);
    assert.equal(trace.version, 1);
    assert.ok(Array.isArray(trace.files) && trace.files.every(item => typeof item === "string"));
    for (const dependency of trace.files) assert.ok(!forbidden.test(dependency.replaceAll("\\", "/")), `Build tooling appears in production trace: ${path.relative(root, file)}`);
  }
  return files.length;
}

export function verifyScope(root, now, run = spawnSync) {
  const record = json(path.join(root, RECORD));
  checkRecord(record, now);
  assert.equal(Number(process.versions.node.split(".")[0]), 22, "Use Node 22");
  assert.ok(!fs.lstatSync(path.join(root, "node_modules")).isSymbolicLink(), "node_modules must be repo-local");
  for (const [file, digest] of Object.entries(SPEC.pins)) assert.equal(sha(fs.readFileSync(path.join(root, file))), digest, `Reviewed input changed: ${file}`);
  const manifest = json(path.join(root, "package.json"));
  assert.equal(manifest.packageManager, "pnpm@9.15.9");
  assert.ok(!manifest.pnpm?.auditConfig, "Global audit suppression is forbidden");
  assert.deepEqual(manifest.pnpm?.patchedDependencies, { "braces@3.0.3": SPEC.patch });
  assert.equal(checkedRun("pnpm", ["--version"], root, run), "9.15.9");
  const all = JSON.parse(checkedRun("pnpm", ["list", "braces", "--json", "--depth", "Infinity"], root, run));
  const production = JSON.parse(checkedRun("pnpm", ["list", "braces", "--prod", "--json", "--depth", "Infinity"], root, run));
  const directories = graphScope(all, production);
  assert.equal(fs.realpathSync(all[0].path), fs.realpathSync(root), "pnpm graph does not describe this checkout");
  const probes = [];
  for (const directory of directories) {
    checkFiles(root, directory);
    const result = run(process.execPath, ["--stack-size=512", "--max-old-space-size=64", "-e", PROBE, path.join(directory, "index.js")], { cwd: root, encoding: "utf8", timeout: 5000, maxBuffer: 65536 });
    assert.ok(!result.error && !result.signal && result.status === 0, "Mitigation regression probe failed");
    const probe = JSON.parse(result.stdout);
    assert.deepEqual(probe, { cases: 31, ordinarySyntax: "pass" });
    probes.push(probe);
  }
  const source = sourceScope(root);
  const inputs = { record: sha(fs.readFileSync(path.join(root, RECORD))), pins: SPEC.pins, source, enforcement: sha(fs.readFileSync(fileURLToPath(import.meta.url))) };
  return { fingerprint: sha(JSON.stringify(inputs)), paths: SPEC.paths, probes };
}

export function captureAudit(root, evidence, run = spawnSync) {
  assert.ok(!fs.existsSync(path.join(evidence, "full-audit.raw.json")), "Audit evidence already exists");
  const result = run("pnpm", ["audit", "--json", "--audit-level", "high", "--registry=https://registry.npmjs.org/"], { cwd: root, encoding: "utf8", timeout: 90000, maxBuffer: 16 * 1024 * 1024 });
  fs.writeFileSync(path.join(evidence, "full-audit.raw.json"), result.stdout ?? "");
  fs.writeFileSync(path.join(evidence, "full-audit.stderr.txt"), result.stderr ?? "");
  assert.ok(!result.error && !result.signal && [0, 1].includes(result.status), "Audit transport/registry failure");
  return auditDecision(JSON.parse(result.stdout), result.status);
}

export function checkUpstream(root, evidence, run = spawnSync) {
  assert.ok(!fs.existsSync(path.join(evidence, "braces-latest.raw.json")), "Upstream evidence already exists");
  const result = run("pnpm", ["view", "braces", "version", "--json", "--registry=https://registry.npmjs.org/"], { cwd: root, encoding: "utf8", timeout: 60000, maxBuffer: 65536 });
  fs.writeFileSync(path.join(evidence, "braces-latest.raw.json"), result.stdout ?? "");
  fs.writeFileSync(path.join(evidence, "braces-latest.stderr.txt"), result.stderr ?? "");
  assert.ok(!result.error && !result.signal && result.status === 0, "Upstream version lookup failed");
  assert.equal(JSON.parse(result.stdout), SPEC.version, "New published braces latest version requires reassessment");
}

export function checkSession(preflight, scope, now) {
  const started = utc(preflight.startedAtUtc);
  assert.ok(now >= started && now - started <= 25 * 60000, "Stale/missing preflight");
  assert.equal(scope.fingerprint, preflight.scope?.fingerprint, "Scope changed during build");
  return started;
}

export function main(args = process.argv.slice(2), root = process.cwd()) {
  assert.equal(args.length, 2, "Usage: --preflight|--finish <fresh-evidence-directory>");
  const [mode, evidence] = args;
  assert.ok(["--preflight", "--finish"].includes(mode));
  assert.ok(path.isAbsolute(evidence), "Evidence directory must be absolute");
  const now = Date.now(); // No environment or CLI clock override.
  if (mode === "--preflight") {
    fs.mkdirSync(evidence); // Existing directory fails: never reuse stale evidence.
    const scope = verifyScope(root, now);
    fs.writeFileSync(path.join(evidence, "preflight.json"), JSON.stringify({ startedAtUtc: new Date(now).toISOString(), scope }, null, 2));
    console.log("PASS mitigation and development scope; final audit disposition waits for the build.");
  } else {
    assert.equal(process.platform, "linux", "Final exception gate requires Linux CI evidence");
    const preflight = json(path.join(evidence, "preflight.json"));
    const scope = verifyScope(root, now);
    const started = checkSession(preflight, scope, now);
    const traces = checkTraces(root, started, now);
    checkUpstream(root, evidence);
    const decision = captureAudit(root, evidence);
    checkRecord(json(path.join(root, RECORD)), Date.now()); // Never accept after a deadline elapsed during the network request.
    fs.writeFileSync(path.join(evidence, "decision.json"), JSON.stringify({ checkedAtUtc: new Date().toISOString(), exceptionId: SPEC.id, traces, ...decision }, null, 2));
    console.log(`PASS WITH TEMPORARY EXCEPTION: ${decision.acceptedHigh} accepted high (${SPEC.ghsa}); ${decision.rawCounts.moderate} moderate; 0 unaccepted high/critical. Raw audit retained. NOT a clean audit.`);
  }
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  try { main(); } catch (error) {
    console.error(`FAIL CLOSED: ${error.message}`);
    process.exitCode = 1;
  }
}
