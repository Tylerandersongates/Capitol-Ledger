#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const auth = read("components/auth-flow-client.tsx");
const globals = read("app/globals.css");
const ledger = read("components/saved-ledger-controls.tsx");
const scrollFrame = read("components/mobile-glass-scroll-frame.tsx");
const shell = read("components/mobile-shell.tsx");

assert.ok(shell.includes("min-h-[100dvh]"), "The mobile shell should fill the real device viewport");
assert.ok(shell.includes("sm:rounded-[3.35rem]"), "The decorative phone bezel should be desktop-only");
assert.ok(shell.includes("hidden h-8 w-36") && shell.includes("sm:block"), "The simulated Dynamic Island should be hidden on phones");
assert.ok(shell.includes('<div className="hidden sm:block">'), "The simulated status bar should be hidden on phones");

assert.ok(globals.includes(".mobile-shell-content") && globals.includes("env(safe-area-inset-top)"), "Mobile content should respect device safe areas");
assert.ok(globals.includes(".mobile-glass-scroll-panel--vertical") && globals.includes("overflow-y: visible !important"), "Vertical cards should flow with the page on phones");
assert.ok(globals.includes(".mobile-glass-scroll-rail--vertical") && globals.includes("display: none"), "Hidden mobile scroll rails should not consume card width");
assert.ok(scrollFrame.includes("mobile-glass-scroll-panel--${axis}"), "Scroll frames should expose responsive axis hooks");

assert.ok(auth.includes('htmlFor={id}') && auth.includes('name={name}'), "Auth inputs should have stable label and form identities");
assert.ok(auth.includes('autoComplete="given-name"') && auth.includes('autoComplete="family-name"'), "Name fields should expose iOS autofill semantics");
assert.ok(!auth.includes("onPointerDown={() => inputRef.current?.focus()}"), "Auth field wrappers should not redirect pointer focus");

assert.ok(ledger.includes("accountSyncQueue"), "Account ledger writes should be serialized");
assert.ok(ledger.includes("latestLedgerRevisionByKey.get(key) !== revision"), "Stale account responses should be ignored");
assert.ok(ledger.includes("ledgerLocalRevision !== hydrationRevision"), "Hydration should not overwrite newer local setup choices");
assert.ok(ledger.includes('window.localStorage.setItem(issueInterestsPendingSyncKey, "1")'), "All account hydration paths should preserve topic choices while a save is pending");
assert.ok(ledger.includes("selectedRef.current"), "Rapid topic taps should use the latest synchronous selection");

console.log("TestFlight mobile UI check passed.");
