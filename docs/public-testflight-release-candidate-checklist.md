# CapitolWonk Public TestFlight Release-Candidate Checklist

Status: preparation only. Updated July 29, 2026 from the July 28 EOD handoff.

This is the go/no-go checklist for public or external TestFlight testing. The July 28 EOD handoff remains the source of truth. App Store Connect setup notes and earlier beta guides are reference material only.

## Candidate Snapshot

- Release branch: `codex/next15-security-upgrade`
- Clean synchronized baseline before release work: `b2e11b4`
- Production web target: `https://project-qosv1.vercel.app`
- Current native project settings resolve to marketing version `1.0`, build `1`, iPhone and iPad support, and iOS 16.0 minimum deployment.
- The native target loads the production web target.
- Bundle and development-team settings are configured by presence. Their values must not be copied into chat, documentation, logs, or commits.
- The intended upload version and build number are not yet confirmed. Build `1` has prior TestFlight history, so a new upload requires an approved unused build number.

## Completed Evidence

- [x] `main` and `origin/main` were clean and synchronized at the release baseline.
- [x] The production Congress catalog was visibly verified: 537 officials, 17,941 bills, 1,515 votes, and a current House vote with 434 named member positions and an official source.
- [x] The approved Next.js 15 maintenance upgrade was applied locally with aligned React, Sentry, ESLint config, PostCSS, and SWC packages.
- [x] Async `cookies()`, `params`, and `searchParams` compatibility updates pass TypeScript and ESLint.
- [x] Frozen pnpm 9.15.9 install passes under supported Node 22.
- [x] The optimized Next.js 15 production build passes.
- [x] The complete offline route, search, bill, member, vote, accountability, video, AI fixture, Congress catalog, native bridge, mobile UI, launch copy, account deletion, billing-transition, feedback, and demo-safe readiness checks pass.
- [x] Xcode 26.6 resolves the shared native target, Debug and Release configurations, and supported simulator runtimes without changing signing state.
- [x] A generic iOS Simulator Release build passes with `CODE_SIGNING_ALLOWED=NO` and `CODE_SIGNING_REQUIRED=NO`.
- [x] No Apple account, team, bundle, capability, signing, subscription, tester, upload, or review state was changed during diagnostics.

## Beta Blockers

All blockers must be resolved or explicitly accepted at the correct approval gate before external/public distribution.

- [ ] Complete branch CI and preview-deployment regression, review the upgrade diff, then merge/deploy only after the release evidence is accepted.
- [ ] Resolve or explicitly accept the remaining production-audit exception. The upgrade reduced the audit from 28 advisories to four, but Next.js still pins three high and one moderate advisory through its bundled PostCSS and sharp dependencies. CapitolWonk does not accept user CSS or image uploads, production images are restricted to official Congress sources, and Vercel handles production image optimization. The July 28 zero-high target is nevertheless not met; do not add unsafe package overrides merely to silence the audit.
- [ ] Pass strict production authentication readiness in the intended environment.
- [ ] Pass strict Daily Brief delivery readiness with protected database and task configuration.
- [ ] Complete protected Sentry browser, server, edge, feedback, source-map, and native crash-delivery setup and end-to-end verification.
- [ ] Confirm the intended marketing version and an unused build number.
- [ ] Complete physical-device QA on the exact release candidate.
- [ ] Establish the existing subscription baseline without repurchase and complete the approved transition matrix: Pro to Free, Team to Pro, and Team to Free.
- [ ] Prepare a sanitized external TestFlight tester guide. Existing Round 1–3 guides are web-beta references and are not approved for public TestFlight distribution.

## Protected Configuration And Device QA

Do not print, copy to chat, or commit protected values or identifiers.

- [ ] With Tyler's action-time approval, configure the intended production/TestFlight environment outside git.
- [ ] Run the strict gates without exposing values:
  - `TESTFLIGHT_REQUIRE_READY=true pnpm testflight:check`
  - `BILLING_REQUIRE_APP_STORE=true pnpm billing:check`
  - `SENTRY_REQUIRE_PRODUCTION=true pnpm feedback:check`
- [ ] Verify production authentication and Daily Brief delivery in their intended protected environment.
- [ ] Verify one non-sensitive in-app feedback report plus browser, server, edge, and native diagnostics with PII and replay safeguards intact.
- [ ] On the exact physical-device candidate, verify:
  - sign-in, verification, sign-out, relaunch, and persistence;
  - dashboard, Daily Brief, Officials, bills, votes, alerts, feedback, privacy, support, and account deletion;
  - purchase, restore, manage, cancellation/expiration, and duplicate-entitlement behavior without repurchasing to establish state;
  - Pro and Team feature gates plus the approved transition matrix;
  - native crash delivery only after protected setup and an approved uploaded build.

## Build-Upload Approval

- [ ] Present Tyler with the exact marketing version, unused build number, commit, dependency audit, CI result, preview/production result, archive/build evidence, device evidence, protected-check status, release notes, and remaining risks.
- [ ] Confirm signing and capabilities by presence only; do not expose account, team, bundle, certificate, profile, or protected configuration values.
- [ ] Obtain Tyler's explicit approval for that exact build immediately before upload.
- [ ] **Hard stop:** do not archive for distribution or upload a build without that approval.

## Tester-Distribution Approval

- [ ] Confirm the exact uploaded build and processing status.
- [ ] Confirm the exact internal/external group, approved tester list or public-link audience, and tester scope.
- [ ] Confirm the beta description, contact information, export-compliance answers, support/privacy links, feedback triage owner, and monitoring coverage.
- [ ] Confirm the sanitized public-TestFlight tester guide matches the enabled production services and does not include private operational notes, obsolete checkout instructions, credentials, or identifiers.
- [ ] Obtain Tyler's explicit approval for the exact tester scope.
- [ ] **Hard stop:** do not invite external testers or enable a public TestFlight link without that approval.

## Hard Stop Before Review

- [ ] Present final readiness evidence, remaining risks, the exact build, tester scope, and the exact Apple action about to occur.
- [ ] Tyler must be present and explicitly approve the specific action.
- [ ] **Do not submit to TestFlight Beta App Review, App Review, or any equivalent review action without that approval.**

## Existing Document Audit

| Document | Use for this release candidate |
| --- | --- |
| `docs/eod-handoff-2026-07-28.md` | Source of truth. |
| `docs/dependency-security-upgrade-plan-2026-07-28.md` | Approved upgrade scope and regression plan. |
| `Capitol Ledger App/App Store Connect Setup Packet.md` | Apple field and subscription reference only; dated July 17 and subordinate to the EOD handoff and this checklist. |
| `Capitol Ledger App/TestFlight Readiness Checklist.md` | Implementation reference only; dated July 18 and subordinate to this checklist. |
| `docs/beta-tester-guide/README.md` and generated PDF/DOCX | Historical first-round web-beta material; feedback routing is stale. Do not distribute for public TestFlight. |
| `docs/round-2-beta-tester-guide/README.md` | Historical web-beta material; explicitly excludes TestFlight packaging. Do not distribute for public TestFlight. |
| `docs/round-3-beta-tester-guide/README.md` and generated DOCX | Historical web-beta material with obsolete checkout and scope instructions. Do not distribute for public TestFlight. |
| `docs/tyler-personal-beta-test-guide.md` | Private operator checklist. Never distribute to testers. |
