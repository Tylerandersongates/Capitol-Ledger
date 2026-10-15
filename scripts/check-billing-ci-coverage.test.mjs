import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { hasBillingCiCoverage } from "./check-billing-ci-coverage.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = fs.readFileSync(path.join(root, "package.json"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
const readiness = fs.readFileSync(path.join(root, "scripts/check-billing-readiness.mjs"), "utf8");
const gate = "App Store lifecycle verification is release-gated";
const preflight = 'node scripts/check-braces-audit-exception.mjs --preflight "${{ runner.temp }}/capitolwonk-braces-audit"';
const finish = 'node scripts/check-braces-audit-exception.mjs --finish "${{ runner.temp }}/capitolwonk-braces-audit"';
const regressions = "node --test scripts/check-braces-audit-exception.test.mjs scripts/check-billing-ci-coverage.test.mjs";
const editedManifest = edit => {
  const value = JSON.parse(manifest);
  edit(value);
  return JSON.stringify(value);
};
const replace = (source, before, after) => {
  assert.ok(source.includes(before), `Mutation target must exist: ${before}`);
  return source.replace(before, after);
};

test("exact reviewed CI and unchanged strict candidate gates pass", () => {
  assert.equal(hasBillingCiCoverage(manifest, workflow), true);
  assert.ok(workflow.includes(regressions));
  const commands = ["pnpm run audit:prod", regressions, preflight, "pnpm run release-source:check", "pnpm run build", finish];
  const positions = commands.map(command => workflow.indexOf(`run: ${command}\n`));
  assert.ok(positions.every((position, i) => position >= 0 && (i === 0 || position > positions[i - 1])));
  assert.match(workflow, /runs-on: ubuntu-latest/);
  assert.match(workflow, /permissions:\n  contents: read/);
});
for (const value of ["", "{", "null", "[]", "{}", '{"scripts":null}', '{"scripts":[]}', '{"scripts":"invalid"}']) {
  test(`malformed or missing manifest scripts fail closed: ${value}`, () => assert.equal(hasBillingCiCoverage(value, workflow), false));
}
for (const value of [null, undefined, {}, 0]) {
  test(`non-string input fails closed: ${String(value)}`, () => {
    assert.equal(hasBillingCiCoverage(value, workflow), false);
    assert.equal(hasBillingCiCoverage(manifest, value), false);
  });
}
for (const name of ["audit:prod", "audit:full", "release-candidate:check", "release-source:check", "billing:check"]) {
  test(`missing ${name} fails closed`, () => assert.equal(hasBillingCiCoverage(editedManifest(m => delete m.scripts[name]), workflow), false));
}
for (const [name, edit] of [
  ["production audit threshold weakened", m => m.scripts["audit:prod"] = "pnpm audit --prod --audit-level critical"],
  ["full audit threshold weakened", m => m.scripts["audit:full"] = "pnpm audit --audit-level critical"],
  ["full audit restricted to production", m => m.scripts["audit:full"] = "pnpm audit --prod --audit-level high"],
  ["full audit error swallowed", m => m.scripts["audit:full"] += " || true"],
  ["candidate full audit removed", m => m.scripts["release-candidate:check"] = m.scripts["release-candidate:check"].replace("pnpm run audit:full && ", "")],
  ["candidate uses exception instead of raw audit", m => m.scripts["release-candidate:check"] = m.scripts["release-candidate:check"].replace("pnpm run audit:full", finish)],
  ["candidate strict flags removed", m => m.scripts["release-candidate:check"] = m.scripts["release-candidate:check"].replace("BILLING_REQUIRE_APP_STORE=true TESTFLIGHT_REQUIRE_READY=true ", "")],
  ["candidate failure swallowed", m => m.scripts["release-candidate:check"] += " || true"],
  ["source check disconnected from billing", m => m.scripts["release-source:check"] = "echo pnpm run billing:check"],
  ["billing readiness command commented out", m => m.scripts["billing:check"] = "echo node scripts/check-billing-readiness.mjs && true"],
  ["misleading manifest prose", m => { m.notes = m.scripts; m.scripts = {}; }]
]) {
  test(`manifest rejects ${name}`, () => assert.equal(hasBillingCiCoverage(editedManifest(edit), workflow), false));
}
const workflowMutations = [
  ["missing workflow", () => ""],
  ["commands appear only in comments", w => w.split("\n").map(line => `# ${line}`).join("\n")],
  ["old audit substring in a comment", w => `${w}# pnpm run audit:full\n`],
  ["disabled job", w => replace(w, "    runs-on: ubuntu-latest", "    if: false\n    runs-on: ubuntu-latest")],
  ["permissive job", w => replace(w, "    runs-on: ubuntu-latest", "    continue-on-error: true\n    runs-on: ubuntu-latest")],
  ["production audit skipped", w => replace(w, "        run: pnpm run audit:prod", "        if: false\n        run: pnpm run audit:prod")],
  ["regressions skipped", w => replace(w, `run: ${regressions}`, `if: false\n        run: ${regressions}`)],
  ["braces regressions removed", w => replace(w, regressions, "node --test scripts/check-billing-ci-coverage.test.mjs")],
  ["billing regressions removed", w => replace(w, regressions, "node --test scripts/check-braces-audit-exception.test.mjs")],
  ["preflight replaced by a comment", w => replace(w, `run: ${preflight}`, `run: echo skipped # ${preflight}`)],
  ["finish replaced by a comment", w => replace(w, `run: ${finish}`, `run: echo skipped # ${finish}`)],
  ["finish failure swallowed", w => replace(w, finish, `${finish} || true`)],
  ["finish continues on error", w => replace(w, `run: ${finish}`, `continue-on-error: true\n        run: ${finish}`)],
  ["finish skipped", w => replace(w, `run: ${finish}`, `if: false\n        run: ${finish}`)],
  ["finish ordered before build", w => replace(replace(w, finish, "__SWAP__"), "run: pnpm run build", `run: ${finish}`).replace("__SWAP__", "pnpm run build")],
  ["different evidence directory", w => replace(w, finish, finish.replace("capitolwonk-braces-audit", "other-evidence"))],
  ["release-source check disconnected", w => replace(w, "run: pnpm run release-source:check", "run: echo pnpm run release-source:check")],
  ["non-Linux runner", w => replace(w, "ubuntu-latest", "macos-latest")],
  ["write permission", w => replace(w, "contents: read", "contents: write")],
  ["privileged PR trigger", w => replace(w, "  pull_request:", "  pull_request_target:")],
  ["artifact retention disabled", w => replace(w, "        if: always()", "        if: false")],
  ["format-only drift requires review", w => `${w}\n`]
];
for (const [name, edit] of workflowMutations) {
  test(`workflow rejects ${name}`, () => assert.equal(hasBillingCiCoverage(manifest, edit(workflow)), false));
}

function runReadiness(t, edit = () => {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "capitol-billing-ci-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true })); // Only this test-created directory.
  // Copy only public tracked source inputs, never .env files or live credentials.
  const files = new Set([
    "scripts/check-billing-readiness.mjs", "scripts/check-billing-ci-coverage.mjs",
    ...[...readiness.matchAll(/readIfPresent\("([^"]+)"\)/g)].map(match => match[1])
  ]);
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
    fs.copyFileSync(path.join(root, file), path.join(directory, file));
  }
  edit(directory);
  return spawnSync(process.execPath, ["scripts/check-billing-readiness.mjs"], {
    cwd: directory, env: { NODE_ENV: "test" }, encoding: "utf8", timeout: 10000
  });
}
test("real billing-readiness CLI passes source-only mode with the reviewed gates", t => {
  const result = runReadiness(t);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.ok(result.stdout.includes(`PASS ${gate}`));
});
for (const [name, edit] of [
  ["comment-only final gate", directory => fs.writeFileSync(path.join(directory, ".github/workflows/ci.yml"), replace(workflow, `run: ${finish}`, `run: echo skipped # ${finish}`))],
  ["swallowed final failure", directory => fs.writeFileSync(path.join(directory, ".github/workflows/ci.yml"), replace(workflow, finish, `${finish} || true`))],
  ["weakened strict candidate", directory => fs.writeFileSync(path.join(directory, "package.json"), editedManifest(m => m.scripts["release-candidate:check"] = "pnpm run release-source:check"))],
  ["weakened raw full audit", directory => fs.writeFileSync(path.join(directory, "package.json"), editedManifest(m => m.scripts["audit:full"] = "true"))]
]) {
  test(`real billing-readiness CLI blocks ${name}`, t => {
    const result = runReadiness(t, edit);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.ok(result.stdout.includes(`FAIL ${gate}`));
  });
}
