#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const auth = read("components/auth-flow-client.tsx");
const accountProfile = read("components/account-profile-controls.tsx");
const billDetail = read("app/bills/[billId]/page.tsx");
const billVoteBreakdown = read("components/bill-vote-member-breakdown.tsx");
const dashboard = read("components/dashboard-client.tsx");
const gamification = read("components/gamification-live-stats.tsx");
const globals = read("app/globals.css");
const ledger = read("components/saved-ledger-controls.tsx");
const memberDetail = read("app/members/[bioguideId]/page.tsx");
const policyEdge = read("components/policy-edge-feed.tsx");
const search = read("app/search/page.tsx");
const searchSetup = read("components/search-setup-chips.tsx");
const scrollFrame = read("components/mobile-glass-scroll-frame.tsx");
const shell = read("components/mobile-shell.tsx");
const savedVotePositions = read("components/vote-saved-official-positions.tsx");

assert.ok(shell.includes("min-h-[100dvh]"), "The mobile shell should fill the real device viewport");
assert.ok(shell.includes("sm:rounded-[3.35rem]"), "The decorative phone bezel should be desktop-only");
assert.ok(shell.includes("hidden h-8 w-36") && shell.includes("sm:block"), "The simulated Dynamic Island should be hidden on phones");
assert.ok(shell.includes('<div className="hidden sm:block">'), "The simulated status bar should be hidden on phones");

assert.ok(globals.includes(".mobile-shell-content") && globals.includes("env(safe-area-inset-top)"), "Mobile content should respect device safe areas");
assert.ok(globals.includes(".mobile-glass-scroll-panel--vertical") && globals.includes("overflow-y: visible !important"), "Vertical cards should flow with the page on phones");
assert.ok(globals.includes(".mobile-glass-scroll-rail--vertical") && globals.includes("display: none"), "Hidden mobile scroll rails should not consume card width");
assert.ok(
  search.includes("containedOnMobile")
    && globals.includes(".mobile-glass-scroll-frame--contained-mobile .mobile-glass-scroll-panel--vertical")
    && globals.includes("overflow-y: auto !important"),
  "Search results should retain their bounded vertical scroll panel on phones"
);
assert.ok(
  billVoteBreakdown.includes("containedOnMobile") && billVoteBreakdown.includes('mobileHeight="21rem"'),
  "Bill member votes should retain their bounded vertical scroll panel on phones"
);
assert.ok(
  billDetail.includes('ariaLabel={hasLongOfficialBillText ? "Official bill text" : undefined}')
    && billDetail.includes("containedOnMobile={hasLongOfficialBillText}")
    && billDetail.includes('mobileHeight="16rem"'),
  "Long official bill text should retain a labeled bounded scroll panel on phones"
);
assert.ok(
  billDetail.includes('ariaLabel="Bill timeline updates"')
    && billDetail.includes("containedOnMobile={billActions.length > 4}")
    && billDetail.includes('mobileHeight="24rem"'),
  "Long bill timelines should retain a labeled bounded scroll panel on phones"
);
assert.ok(
  billDetail.includes('ariaLabel="Official source records"\n        containedOnMobile\n        heightClassName="h-[248px]"\n        mobileHeight="21rem"'),
  "Official source records should retain a labeled bounded scroll panel on phones"
);
const explicitlyBoundedListSources = {
  "bill detail": billDetail,
  dashboard,
  gamification,
  "member detail": memberDetail,
  "policy edge": policyEdge,
  "saved ledger": ledger,
  "saved vote positions": savedVotePositions,
  "search setup": searchSetup
};

for (const [sourceName, source] of Object.entries(explicitlyBoundedListSources)) {
  const fixedVerticalFrames = [...source.matchAll(/<MobileGlassScrollFrame\b[\s\S]*?\n\s*>/g)]
    .map((match) => match[0])
    .filter((tag) => tag.includes("heightClassName") && !tag.includes('axis="horizontal"'));

  assert.ok(fixedVerticalFrames.length > 0, `${sourceName} should include at least one explicitly bounded vertical list`);
  assert.ok(
    fixedVerticalFrames.every((tag) => tag.includes("containedOnMobile")),
    `${sourceName} explicitly bounded vertical lists should retain containment on phones`
  );
}
assert.ok(scrollFrame.includes("mobile-glass-scroll-panel--${axis}"), "Scroll frames should expose responsive axis hooks");
assert.ok(
  scrollFrame.includes("touch-pan-y overflow-x-hidden overflow-y-auto overscroll-x-none overscroll-y-contain"),
  "Vertical scroll panels should stay locked to their frame while retaining vertical touch scrolling"
);
assert.ok(
  billDetail.includes('max-w-full whitespace-pre-line break-words [overflow-wrap:anywhere]'),
  "Long official bill-text separators should wrap without creating horizontal drift"
);

assert.ok(auth.includes('htmlFor={id}') && auth.includes('name={name}'), "Auth inputs should have stable label and form identities");
assert.ok(auth.includes('autoComplete="given-name"') && auth.includes('autoComplete="family-name"'), "Name fields should expose iOS autofill semantics");
assert.ok(!auth.includes("onPointerDown={() => inputRef.current?.focus()}"), "Auth field wrappers should not redirect pointer focus");

assert.ok(
  accountProfile.includes('matchedDistrict.districtCode ? "Search another city, ZIP, or district" : "Enter a city, ZIP, or district code"'),
  "District lookup should distinguish changing a saved district from the initial search"
);
assert.ok(!accountProfile.includes("Austin, 78701, or TX-10"), "District lookup should not imply a specific location");

assert.ok(
  dashboard.includes('className="mt-1.5 grid grid-cols-1 gap-1.5 min-[480px]:grid-cols-2"'),
  "Dashboard Top Activity rows should stack on phone-width viewports"
);
assert.ok(
  dashboard.includes('className="grid grid-cols-[minmax(0,1fr)_auto] items-center'),
  "Dashboard Top Activity rows should reserve a bounded label column and a separate count column"
);
assert.ok(
  dashboard.includes('className="flex min-w-0 items-center gap-1.5"')
    && dashboard.includes('className="h-2 w-2 shrink-0 rounded-full"')
    && dashboard.includes('className="min-w-0 truncate text-white/68"')
    && dashboard.includes('className="ml-2 shrink-0 font-medium text-white/82"'),
  "Dashboard Top Activity labels should shrink or truncate without crossing their count boundary"
);

assert.ok(ledger.includes("accountSyncQueue"), "Account ledger writes should be serialized");
assert.ok(ledger.includes("latestLedgerRevisionByKey.get(key) !== revision"), "Stale account responses should be ignored");
assert.ok(ledger.includes("ledgerLocalRevision !== hydrationRevision"), "Hydration should not overwrite newer local setup choices");
assert.ok(ledger.includes('window.localStorage.setItem(issueInterestsPendingSyncKey, "1")'), "All account hydration paths should preserve topic choices while a save is pending");
assert.ok(ledger.includes("selectedRef.current"), "Rapid topic taps should use the latest synchronous selection");

console.log("TestFlight mobile UI check passed.");
