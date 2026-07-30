# CapitolWonk EOD Handoff — Public TestFlight Candidate Prepared, Privacy Decision Pending — July 29, 2026

Generated Wednesday, July 29, 2026 for work completed Wednesday, July 29, 2026. This handoff supersedes the July 28 handoff and is the source of truth for the next clean CapitolWonk continuation.

## Standing Rules

- Use **CapitolWonk** as the user-facing app name. The repository folder remains `Capitol Ledger`.
- Keep **Daily Brief** as the user-facing name. Internal `Weekly Brief` compatibility names may remain until a separately approved migration.
- Keep browser work visible and leave useful evidence open at handoff.
- Always present the next best steps after completing a work unit.
- Routine safe fixes, commits, and non-destructive pushes are standing-approved.
- Ask before major dependency, architecture, schema, billing, subscription, Apple Developer, App Store Connect, Xcode signing, protected configuration, secret-management, tester-distribution, or build-upload changes.
- Never expose or commit credentials, Apple account or team identifiers, tester credentials, transaction identifiers, private keys, tokens, account-token values, bundle identifiers, or protected configuration.
- The Mac login/iCloud Keychain incident is closed. Do not sign out of iCloud, reset encrypted iCloud data, delete keychains, remove trusted devices, alter FileVault, or modify the preserved old keychain and recovery copy.
- Do not repurchase a subscription merely to establish state. Verify the current entitlement first and use Restore Purchases once only if the baseline is inconsistent.
- Do not submit anything to App Review or TestFlight Beta App Review without Tyler present and explicitly approving that specific submission.
- Do not create a public TestFlight link, invite external testers, distribute a build, or upload a build until Tyler approves the exact action, build, and scope.

## Baseline

- **Repo:** `/Users/tylergates/Documents/Capitol Ledger`
- **Verified app-source branch:** `main`
- **Verified app-source HEAD before the documentation-only EOD merge:** `2004e4f`
- **Worktree before the final EOD update:** Clean.
- **Production target:** `https://project-qosv1.vercel.app`
- **Production state:** Ready on Vercel with successful post-merge `main` CI.
- **Production catalog:** Verified at 537 officials, 17,941 bills, and 1,515 votes, including a current House vote with 434 named member positions and an official source.
- **Native candidate:** Marketing version `1.0`, build `2`, iPhone and iPad support, iOS 16.0 minimum, and the production web target.
- **Goal for the next continuation:** Finish the remaining privacy, signing, physical-device, and subscription evidence required to present an exact build-upload decision. Review submission and tester distribution remain separate hard stops.

The July 29 EOD/checklist merge is documentation-only. The next session must verify the exact current `main` HEAD and confirm it is synchronized with `origin/main` before continuing.

## Completed July 29

### Release Baseline And Dependency Security

- Reconfirmed a clean synchronized release baseline and verified the latest Congress catalog in production.
- Upgraded the approved framework/security surface to the maintained Next.js 15 line with aligned React, Sentry, ESLint, PostCSS, SWC, and compatibility changes.
- Passed frozen install, TypeScript, ESLint, optimized build, full readiness/browser regression, unsigned native Release build, CI, Preview, post-merge `main` CI, and automatic production deployment.
- Reduced the production audit from 28 advisories to three high and one moderate advisory in limited-reachability upstream PostCSS/sharp paths.
- Tyler explicitly accepted that documented dependency residual risk for public-beta preparation.
- A later local reinstall correctly stopped at the repository minimum-package-age policy for 17 recent lockfile entries. The policy was not bypassed. Pull-request and `main` CI continued to pass the frozen install.

### Native Release Candidate

- Confirmed the approved candidate is version `1.0`, build `2`.
- Passed the native bridge and TestFlight gates, generic iOS Simulator Release build with signing disabled, and signing-disabled generic iOS device archive plus structural/metadata validation.
- Tyler approved use of the existing signing configuration without modification for a local archive.
- A signed archive attempt stopped safely because the preserved Xcode developer-account session is unusable and no matching provisioning profile is available.
- No Apple security, account, team, bundle, certificate, profile, capability, upload, tester, or review state was changed.

### Protected Production Readiness

- Strict Weekly/Daily Brief configuration passes without printing protected values.
- Production authentication reaches a ready database schema, secure-cookie mode is active, and the live dashboard smoke test passes.
- Vercel Production contains the five required Apple server/account-sync variables by presence. Their values were not viewed or exposed.
- Removed all eight retired Stripe launch variables from Production and Preview and verified the cleanup in a Ready production deployment.
- Prepared and verified the sanitized tester-facing guide at `docs/public-testflight-tester-guide.md`. Historical web-beta guides remain non-distributable.

### Sentry Monitoring And Privacy

- Created the free CapitolWonk Sentry organization with separate web and iOS projects without accepting billing or an upgrade.
- Enabled high-priority alerts, kept replay and default PII disabled in CapitolWonk, configured protected values as sensitive deployment settings, corrected both web DSNs, and limited the release-upload token to the required scopes.
- Verified production feedback, browser transport, Node.js, and Vercel Edge ingestion. The production release reports 518 source-map artifacts.
- Verified secret-gated diagnostics reject unauthorized requests with 404 and accept/flush fixed synthetic events.
- Enabled **Prevent Storing of IP Addresses** for new events in both projects. A fresh Edge event no longer stored the raw request IP.
- Tyler approved a narrowly scoped advanced rule in both projects to remove anything from `user.geo`. One authorized Edge retest proved the rule does **not** remove Sentry's server-derived geography.
- Expanded every Edge frame in the retest. All remained generated `vc/edge/function` frames with no route-source mapping.
- Tyler explicitly accepted generated-only Edge frames as a public-beta monitoring limitation.
- The final retest's one-time Preview secret, temporary route/page, in-memory token, and synthetic issue were removed. Earlier synthetic diagnostic issues were also permanently deleted.
- No diagnostic secret or protected value entered git, chat, documentation, or logs. No diagnostic route is approved to remain in `main`.

## Diagnostics And QA

- Supported Node `22.22.3` local runtime guard: passed.
- Frozen dependency install in pull-request and `main` CI: passed.
- TypeScript: passed.
- Next.js ESLint: passed.
- Feedback readiness: passed.
- Optimized production build: passed.
- Complete offline route, search, Congress catalog, bill, member, vote, accountability, video, AI fixture, native bridge, mobile UI, launch copy, account deletion, billing-transition, feedback, and demo-safe readiness checks: passed.
- Unsigned generic Simulator Release build: passed.
- Signing-disabled generic device archive and metadata/executable validation: passed.
- Temporary Sentry probe CI and Preview: passed before cleanup.
- Cleanup Preview returned 404 for the removed diagnostic page.

## Accepted Public-Beta Risks

- **Dependency audit:** Three high and one moderate advisory remain through limited-reachability upstream PostCSS/sharp paths. Tyler accepted this residual risk for public-beta preparation.
- **Vercel Edge stack mapping:** Edge events show generated-only `vc/edge/function` frames instead of the route source. Tyler accepted this monitoring limitation for public-beta preparation.

Neither acceptance authorizes a build upload, tester distribution, public link, TestFlight Beta App Review, or App Review.

## Remaining Beta Blockers And Approval-Gated Work

- **Sentry server-derived geography:** Raw IP storage is disabled, but derived geography remains even with the approved `user.geo` removal rule. This is not accepted yet. Do not run another probe or make broader Sentry privacy changes without new explicit approval.
- **Signed Release archive:** The preserved Xcode account session cannot authenticate and no matching profile is available. Do not repair or replace Apple/Xcode/Keychain credentials, request organization API access, or alter signing without a new explicit approval.
- **Native Sentry delivery:** The native protected value and actual device/runtime event still need verification on the exact signed candidate.
- **Physical-device QA:** Sign-in, relaunch/persistence, dashboard, Daily Brief, Officials, bills, votes, alerts, feedback, privacy/support/account deletion, and the exact release candidate remain unverified on a physical device.
- **Subscription baseline and transitions:** Establish the existing entitlement without repurchase, then verify Pro to Free, Team to Pro, and Team to Free with restore/manage/relaunch and duplicate-entitlement checks.
- **Local dependency recheck:** Repeat the frozen local install only after the repository minimum-package-age window expires; do not bypass the policy.
- **Build upload:** Tyler must approve the exact archive/build immediately before upload.
- **Tester distribution:** Tyler must approve the exact uploaded build, group/audience, tester list or public-link scope, and tester-facing metadata before any invitation or public link.
- **Review:** Tyler must be present and explicitly approve the exact TestFlight Beta App Review or App Review submission action.

## Next Session Task List

1. **Reconfirm the handoff baseline**
   - Read this handoff completely.
   - Confirm `main` is clean and synchronized with `origin/main`.
   - Confirm post-EOD `main` CI and the automatic production deployment are green.
   - Confirm the diagnostic route is absent and no temporary diagnostic variable exists by presence only.
2. **Resolve the remaining Sentry privacy decision**
   - Begin with read-only research or Sentry support documentation on server-derived geography retention.
   - Present Tyler with the exact remaining privacy exposure and options.
   - Obtain explicit approval before any broader Sentry/organization privacy setting, rule change, or further probe.
   - If Tyler accepts the risk instead, record the exact acceptance in the release checklist.
3. **Re-run the local frozen install when eligible**
   - Use supported Node `22.22.3` and pnpm `9.15.9`.
   - Do not relax or bypass the minimum-package-age policy.
   - Re-run TypeScript, ESLint, optimized build, audit, and the current release/readiness suite if the install succeeds.
4. **Prepare the signed/device candidate**
   - Present the exact Apple/Xcode account and provisioning action needed.
   - Obtain explicit approval before repairing authentication, changing signing state, or requesting new access.
   - After a valid local signed archive exists, verify native Sentry delivery and the complete physical-device matrix.
5. **Complete subscription QA without repurchase**
   - Establish the current entitlement first.
   - Run Pro to Free, Team to Pro, and Team to Free only with the intended approval and protected environment.
6. **Build-upload decision**
   - Present the exact version, build, commit, audit, CI, deployment, archive, device, subscription, monitoring, release-note, and remaining-risk evidence.
   - Obtain Tyler's explicit approval for that exact upload.
7. **Tester-distribution and review hard stops**
   - Do not invite external testers, enable a public link, or distribute a build without exact-scope approval.
   - Do not submit TestFlight Beta App Review or App Review without Tyler present and explicitly approving the specific action.

## Resume Prompt For The New Task

```text
Read `/Users/tylergates/Documents/Capitol Ledger/docs/eod-handoff-2026-07-29.md` completely and use it as the source of truth for this clean CapitolWonk continuation.

Goal: finish the remaining evidence and approval gates required to present an exact public/external TestFlight build-upload decision.

Start by confirming `main` is clean and synchronized, post-EOD CI and production deployment are green, the temporary Sentry diagnostic route is absent, and no temporary diagnostic variable remains by presence only. Then research Sentry's server-derived geography retention read-only and present the exact privacy decision without changing protected configuration or running another probe.

Routine safe fixes, commits, and non-destructive pushes are standing-approved. Ask before major dependency, architecture, schema, billing, subscription, Apple Developer, App Store Connect, Xcode signing, protected configuration, secret-management, tester-distribution, or build-upload changes.

Never expose credentials, Apple account or team identifiers, tester credentials, transaction identifiers, private keys, tokens, account-token values, bundle identifiers, or protected configuration. The Mac login/iCloud Keychain incident is closed; do not alter Apple security state or the preserved recovery artifacts. Do not repurchase to establish subscription state.

Do not upload a build, submit anything to App Review or TestFlight Beta App Review, enable a public TestFlight link, or invite external testers without Tyler present and explicitly approving the specific action.
```
