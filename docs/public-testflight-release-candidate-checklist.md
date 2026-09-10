# CapitolWonk Public TestFlight Release-Candidate Checklist

Status: preparation only; the current build-upload decision remains no-go. July 29–31 evidence below is historical; current status pointers were reconciled September 10, 2026 after the approved wordmark release, closure of T03 for dependency candidate `f4f04de`, and T04's read-only current-state pass plus approved Apple Support follow-up. Production source `7ec68bc` is live, but no new signed/device candidate or TestFlight upload was verified.

This is the go/no-go checklist for public or external TestFlight testing. Use the [September 10 EOD](eod-handoff-2026-09-10.md), [current timeline/task ledger](project-timeline.md), [T03 dependency audit](dependency-security-audit-2026-09-10.md) and [T04 signing reconciliation](apple-signing-reconciliation-2026-09-10.md) for current ordering and carryovers; the July 29–31 safety gates below remain binding. T01–T03 are complete for their exact scopes. T04 remains blocked pending Apple guidance: zero usable signing identities remain despite one current matching App Store profile, the paired iPhone is disconnected, and the explicitly approved corrected follow-up on the existing case was received by Apple. The unexplained uncommitted `pnpm-lock.yaml` downgrade is quarantined and excluded from candidate/T04 evidence; do not install, build or commit from it pending Tyler's direction. Corrected-wordmark listing screenshot recapture remains under T09. Reserve the October 2–6 owner-availability buffer when scheduling approvals/device work. Revalidate candidate-specific checks against the exact native candidate; no support contact, risk acceptance or historical checkmark authorizes a signed attempt, upload or distribution.

## Candidate Snapshot

- Verified app release source before the documentation-only EOD merge: `main` at `2004e4f`
- Native candidate branch: `codex/testflight-build-2-rc`
- Clean synchronized baseline before release work: `b2e11b4`
- Production web target: `https://project-qosv1.vercel.app`
- Current native project settings resolve to the approved candidate marketing version `1.0`, build `2`, iPhone and iPad support, and iOS 16.0 minimum deployment.
- The native target loads the production web target.
- Bundle and development-team settings are configured by presence. Their values must not be copied into chat, documentation, logs, or commits.
- Read-only App Store Connect verification found existing version `1.0`, build `1`, in Ready to Submit state. Tyler approved `1.0` build `2` as the next unused candidate. No App Store Connect state was changed.
- A signing-disabled device archive for `1.0` build `2` passes structural and metadata validation. September 10 read-only checks confirm zero usable code-signing identities. One non-expired, Xcode-managed App Store profile matches the project, but no usable matching certificate/private-key identity exists. Stable Xcode 26.6 is selected, Xcode 27 beta remains installed but unselected, and the paired iPhone record is disconnected with zero physical mobile devices currently available.
- T03 dependency evidence is exact to remote candidate `f4f04de`. The current worktree's unexplained lockfile diff is not part of that candidate, is not staged or pushed, and must remain quarantined until Tyler directs whether to restore or retain it.

## Completed Evidence

- [x] `main` and `origin/main` were clean and synchronized at the release baseline.
- [x] The production Congress catalog was visibly verified: 537 officials, 17,941 bills, 1,515 votes, and a current House vote with 434 named member positions and an official source.
- [x] The approved Next.js 15 maintenance upgrade was applied locally with aligned React, Sentry, ESLint config, PostCSS, and SWC packages.
- [x] Async `cookies()`, `params`, and `searchParams` compatibility updates pass TypeScript and ESLint.
- [x] Frozen pnpm 9.15.9 installs pass under supported Node 22 in pull-request and post-merge `main` CI. The September T03 candidate also passed a clean isolated frozen install with no minimum-age setting or bypass present. This does not certify the historical external guard: its owner/window are untracked, and the incidentally resolved `@typescript-eslint@8.70.0` family was about two days old at resolution. Do not describe the missing guard as a repository control.
- [x] The optimized Next.js 15 production build passes.
- [x] Pull request #2 CI, merge to `main` at `a381b9b`, post-merge `main` CI, automatic production deployment, and production feedback-page smoke testing pass.
- [x] Tyler explicitly accepted the July three-high/one-moderate PostCSS/sharp residual for public-beta preparation. This is historical evidence only and does not accept September's later critical/high advisories.
- [x] The September 10 T03 baseline audit completed with exact Node `22.22.3` and pnpm `9.15.9`, without an install or dependency change. It reported 15 production advisories—2 critical, 11 high and 2 moderate—and 18 package-version findings across the full graph (17 distinct advisory IDs). That baseline failed the release gate and triggered the remediation later verified and accepted below.
- [x] Tyler approved and Codex locally verified the narrow T03 remediation: aligned Next toolchain `15.5.25`, compatible patched transitives, no override or unrelated direct update. Production/full audits are now 0 critical, 2 high and 2 moderate, all in Next's exact nested `postcss@8.4.31`; frozen install, native/asserted-WASM builds, 38/38 validations and optimized HTTP/image smoke pass.
- [x] Exact-head GitHub Actions run `34518247389` passed for `f4f04de`, and Vercel deployment `mep97jz9t5Hncx1t2mRBeTytDqut` reached Ready. Authenticated branch-preview smoke covered 14 representative app pages/redirects plus local and remote Next Image paths; the unprotected local optimized smoke remains the complete 19-route/2-image check because anonymous Preview requests are protected.
- [x] Tyler explicitly accepted the remaining Next-pinned `postcss@8.4.31` two-high/two-moderate limited-reachability residual for dependency candidate `f4f04de`, closing T03. This exception does not authorize a merge, production deployment, signing, archive, upload or tester distribution, and it does not transfer to a changed dependency graph.
- [x] The complete offline route, search, bill, member, vote, accountability, video, AI fixture, Congress catalog, native bridge, mobile UI, launch copy, account deletion, billing-transition, feedback, and demo-safe readiness checks pass.
- [x] Xcode 26.6 resolves the shared native target, Debug and Release configurations, and supported simulator runtimes without changing signing state.
- [x] A generic iOS Simulator Release build passes with `CODE_SIGNING_ALLOWED=NO` and `CODE_SIGNING_REQUIRED=NO`.
- [x] The September T03 candidate re-passed an isolated unsigned Xcode 26.6 Simulator Release compile/link for iOS 16.0, arm64 and x86_64. This does not validate signing, archive/upload, protected native configuration or native-event delivery.
- [x] A signing-disabled generic iOS device archive resolves to marketing version `1.0`, build `2`, and passes archive/app metadata plus executable-structure validation.
- [x] Strict Weekly/Daily Brief delivery configuration passes using the preserved protected environment without printing protected values.
- [x] Production authentication reaches a ready database schema. The approved Vercel secure-cookie value is set for Production and Preview, the strict database check passes with secure-cookie mode, the updated production deployment is Ready, and the live dashboard smoke test passes.
- [x] Vercel Production contains all five required Apple server/account-sync variables by presence. Their values were not viewed, copied, or exposed, and they remain unavailable to the local strict checks.
- [x] All eight retired Stripe launch variables were removed from Vercel Production and Preview, and the removal is active in the Ready production redeployment.
- [x] A free Sentry organization with separate Next.js and iOS projects is configured without billing or an upgrade. High-priority email alerts are enabled, session replay and default PII remain disabled in CapitolWonk, new-event IP storage prevention is enabled for both projects, and the release-upload token is limited to organization read, project read/write, and release-upload scopes.
- [x] All six protected Sentry values are stored as sensitive Vercel Production-and-Preview variables. A live probe exposed placeholder web DSNs that the former presence-only gate accepted; both web DSNs were corrected through Vercel's dedicated sensitive-value rotation flow, the web project received an explicit production/branch-preview domain allowlist, and the corrected production deployment is Ready.
- [x] A non-sensitive synthetic report submitted through the production `/feedback` form succeeded with email omitted, replay disabled, and default PII disabled. Sentry usage recorded one accepted feedback event and zero filtered, rate-limited, or invalid feedback events.
- [x] Sentry created and finalized the `a381b9b` production release, associated the Vercel production deployment, and reports 518 source-map artifacts. Browser, Node.js, and Edge delivery have been exercised end to end; synthetic diagnostic issues were permanently deleted after evidence capture.
- [x] Temporary, secret-gated Preview diagnostics verified Node.js and Edge runtime delivery. Unauthorized requests returned 404; fixed synthetic events were accepted and flushed. The one-time Preview secrets and all diagnostic routes were removed afterward and were never merged to `main`.
- [x] A fresh Edge-only verification ran after enabling new-event IP storage prevention on both Sentry projects. The raw request IP was no longer stored. The fixed event still contained derived geography, and all expanded stack frames remained generated `vc/edge/function` frames with no route-source mapping. Temporary-commit CI and Vercel Preview passed, the synthetic issue was permanently deleted, and the Preview secret plus probe code were removed.
- [x] Tyler first approved a narrowly scoped advanced rule to remove anything from `user.geo` for new events. Both Sentry projects stored that initial rule, but an authorized Edge retest at that stage proved it did not remove Sentry's server-derived geography; raw IP remained absent. The synthetic issue, Preview secret, and probe code were removed after evidence capture.
- [x] Tyler explicitly accepted generated-only Vercel Edge stack frames as a public-beta monitoring limitation. The expanded retest still contained only `vc/edge/function` frames; Node.js mapping to route source remains verified.
- [x] Tyler approved remediation instead of accepting ongoing server-derived geography. Both Sentry projects then used the recursive selector `$user.geo.**`. Exactly one authorized Preview Edge event verified one stored event total, no raw IP field or literal, and no displayed geography value or city, region, country, or coordinate fields. The synthetic issue, branch-only Preview variable, one-time value and diagnostic route were removed, and the cleanup route returned 404. The advanced rule applies only to new incoming events, so pre-change events were not retroactively rewritten. Do not run another probe or make broader privacy/configuration changes without a new explicit approval.
- [x] Tyler approved another local signed-archive attempt using the existing Xcode signing configuration only. After normal Swift-package metadata access was restored, dependency resolution passed and the archive reached the signing gate. It failed because no matching provisioning profile exists; no archive was created and no Apple or signing state changed in that attempt.
- [x] Tyler approved protected native Sentry setup. A mode-0600 temporary build-settings file supplied the iOS value without displaying or committing it. Xcode resolved the setting, an unsigned Release build passed, and the compiled app contained a valid resolved value. The protected file and compiled temporary artifacts were removed afterward. No native event was sent because no signed candidate had been produced; no later signed candidate is verified. The approved one-event scope remains unconsumed and paused pending a valid signed/device candidate plus exact-action review.
- [x] Tyler approved revoking one Apple Development certificate believed at the time to belong to the secondary testing account and creating a replacement. Only a Development certificate was revoked; the separate Distribution Managed certificate was not changed. The replacement Development certificate has no matching private key among the two local login-keychain private keys, and the local identity check still reports zero usable identities.
- [x] A manual CSR attempt failed with “The specified item could not be found in the keychain.” No valid CSR was produced. No private key was deleted or exported; no keychain, trust setting, Apple security state or preserved recovery artifact was reset or altered.
- [x] A certificate-revocation notice was delivered to the Account Holder mailbox, while the local certificate is labeled for the secondary testing user. Those names and notification routing do not identify the revoked certificate's individual owner. The exact individual ownership is unresolved and must be confirmed by Apple Support rather than inferred.
- [x] An Apple Developer Support case was submitted from the Account Holder session without an attachment or protected identifiers in the message. On September 10 Tyler confirmed no reply, supplied the private case ID and explicitly approved the exact correction stating that the revoked Development certificate's individual owner is unconfirmed. The same-case follow-up reported the current zero-identity/matching-profile evidence and asked for a supported recovery path without resetting Keychain or changing the Distribution Managed certificate. Apple confirmed receipt. The private case ID is omitted here. Do not create another case unless Apple directs it.
- [x] September 10 read-only signing reconciliation confirmed zero usable identities, one current matching Xcode-managed App Store profile, stable Xcode 26.6 selected, Xcode 27 beta installed/unselected and the paired iPhone disconnected. No Apple signing/security, profile, device or source setting changed.
- [x] The sanitized external/public guide is prepared at `docs/public-testflight-tester-guide.md` with current feature coverage, assigned-scenario-only subscription testing, severity definitions, privacy-safe reporting, and immediate-stop rules.
- [x] No Apple Account security, team membership, bundle, capability, subscription, tester, upload or review state was changed. The approved Development-certificate revocation and replacement are the only Apple signing-state changes made after the earlier read-only diagnostics.

## Beta Blockers

All blockers must be resolved or explicitly accepted at the correct approval gate before external/public distribution.

- [x] Complete branch CI and preview-deployment regression, review the upgrade diff, merge to `main`, and verify post-merge CI plus production deployment.
- [x] Record the historical July production-audit exception. The upgrade reduced that audit from 28 advisories to four, and Tyler accepted the then-current limited-reachability three-high/one-moderate PostCSS/sharp residual for public-beta preparation. This checkmark records the July subset only; it is insufficient for current dependency clearance and accepts none of September's new findings.
- [x] Close the September 10 T03 dependency gate. Dependency candidate `f4f04de` clears both criticals and every remediable high; production/full audits have 0 critical, 2 high and 2 moderate findings, all in Next's exact nested `postcss@8.4.31`. Local release verification, exact-head branch CI and Vercel Preview pass. Tyler explicitly accepted this exact candidate's four-advisory limited-reachability residual. Keep the exception visible, monitor for a supported Next release with patched nested PostCSS, and re-audit any changed dependency graph.
- [x] Pass strict production authentication readiness in the intended deployed environment. The database schema and secure-cookie configuration pass, the updated production deployment is Ready, and the dashboard smoke test passes.
- [x] Pass strict Weekly/Daily Brief delivery readiness with protected database, task secret, provider, sender, and deployed URL configuration.
- [x] Complete protected Sentry privacy remediation. Browser transport, feedback delivery, Node.js and Edge runtime ingestion, production release creation, and source-map artifact upload are verified. Raw Edge request-IP storage is disabled, the recursive geography scrub is verified for new events, and Tyler accepted generated-only Edge stack frames for public beta.
- [ ] Complete native crash-delivery verification on the exact protected signed/device candidate. Protected-setting resolution and an unsigned Release build pass, but no native event has been sent; the approved one-event scope remains unconsumed and paused pending a valid candidate plus exact-action review.
- [x] Confirm marketing version `1.0` and unused build number `2`.
- [ ] Create and validate a signed Release archive. Current September 10 evidence shows zero usable code-signing identities despite one matching, non-expired App Store profile. The existing open Support case now contains the explicitly approved ownership correction and current signing evidence; Apple confirmed receipt but has not provided guidance. Preserve the certificate/CSR/private-key/Keychain/profile/signing freeze until a response is reconciled and Tyler approves one exact action.
- [ ] Complete physical-device QA on the exact release candidate. The paired iPhone record and Developer Mode remain known, but the device is disconnected and zero physical mobile devices are currently available. No verified signed candidate has installed and the app-level matrix has not begun.
- [ ] Establish the existing subscription baseline without repurchase and complete the approved transition matrix: Pro to Free, Team to Pro, and Team to Free.
- [x] Prepare and verify the sanitized external TestFlight tester guide at `docs/public-testflight-tester-guide.md`. Existing Round 1–3 guides remain historical web-beta references and are not approved for public TestFlight distribution.

## Protected Configuration And Device QA

Do not print, copy to chat, or commit protected values or identifiers.

- [x] Tyler approved the current protected-configuration work. In Vercel, set secure-cookie mode and remove all eight retired Stripe launch variables from Production and Preview without viewing or copying protected values.
- [ ] Finish the intended production/TestFlight environment outside git. The five Apple server variables exist in Vercel Production by presence. The two web Sentry DSNs are corrected, production feedback delivery is verified, and July 30 evidence verified new-event IP storage prevention plus the recursive `$user.geo.**` removal rule in both Sentry projects. The live rule was not re-read in September because the available Sentry browser session is signed out. The native Sentry value resolved successfully through a protected temporary Xcode build setting and passed an unsigned Release build; it must be supplied again and verified on the exact signed/device candidate.
- [ ] Run the strict gates without exposing values:
  - `TESTFLIGHT_REQUIRE_READY=true pnpm testflight:check`
  - `BILLING_REQUIRE_APP_STORE=true pnpm billing:check`
  - `SENTRY_REQUIRE_PRODUCTION=true pnpm feedback:check`
- [ ] Resolve the July 29 strict-gate results:
  - The preserved local file is missing five protected App Store values, so local TestFlight and Billing strict checks still fail. Vercel Production contains all five by presence, but their value shape and live App Store Server API behavior have not been validated.
  - Billing readiness confirms retired Stripe configuration is absent when run with the approved launch-path overrides. All eight retired Vercel variables were removed from Production and Preview.
  - The free Next.js and iOS projects plus least-privilege release-upload token are configured. Production web feedback delivery is verified end to end. The readiness gate now validates Sentry DSN URL shape instead of accepting any non-empty placeholder. Production release creation, 518 source-map artifacts, and secret-gated Preview Node.js/Edge runtime ingestion are verified. New-event IP storage prevention removes the raw Edge request IP, and the recursive `$user.geo.**` rule removed server-derived geography from the single July Preview verification event. Tyler accepted generated-only Edge stack frames for public beta. Protected native-setting resolution and an unsigned Release build pass; native runtime-event delivery still requires the exact signed/device candidate.
  - Production authentication reaches the ready database schema and passes with secure-cookie mode. The updated production deployment is Ready and the dashboard smoke test passes.
  - Weekly/Daily Brief delivery configuration passes.
- [x] Redeploy the current `main` production commit once with the completed web protected configuration. The deployment is Ready and the dashboard smoke test passes.
- [ ] Verify production authentication and Daily Brief delivery in their intended protected environment.
- [ ] Verify one non-sensitive in-app feedback report plus browser, server, edge, and native diagnostics with PII and replay safeguards intact. Production feedback, browser transport, and Preview Node.js/Edge ingestion are verified. Raw Edge request-IP storage and new-event server-derived geography are remediated, generated-only Edge stack frames are accepted for public beta, and native diagnostics remain.
- [ ] On the exact physical-device candidate, verify:
  - sign-in, verification, sign-out, relaunch, and persistence;
  - dashboard, Daily Brief, Officials, bills, votes, alerts, feedback, privacy, support, and account deletion;
  - purchase, restore, manage, cancellation/expiration, and duplicate-entitlement behavior without repurchasing to establish state;
  - Pro and Team feature gates plus the approved transition matrix;
  - native crash delivery only after resupplying the protected setting on a valid signed/device candidate and reviewing the exact one-event action with Tyler.

## Build-Upload Approval

Current decision as of September 10, 2026: **NO-GO — do not upload a build.** T02 is verified for new-event privacy and T03 is closed for dependency candidate `f4f04de`. T04's current-state reconciliation is complete, but signing remains blocked: zero usable identities are present, the matching App Store profile cannot sign alone, the device is disconnected and Apple has only acknowledged the approved corrected follow-up. No evidence establishes a supported signing path, signed Release archive, installed exact-device candidate, native event, subscription-transition result or complete strict protected-check result.

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
| `docs/eod-handoff-2026-09-10.md` and `docs/project-timeline.md` | Current release state, next action, full carryovers and availability-adjusted planning. |
| `docs/eod-handoff-2026-07-29.md` | Prior candidate evidence and standing safety/approval rules; not the current web commit or fresh native QA. |
| `docs/eod-handoff-2026-07-28.md` | Historical source for the original release-readiness task list. |
| `docs/dependency-security-upgrade-plan-2026-07-28.md` | Approved upgrade scope and regression plan. |
| `docs/dependency-security-audit-2026-09-10.md` | Closed T03 audit, remediation evidence, reachability analysis and candidate-specific residual-risk acceptance. |
| `docs/apple-signing-reconciliation-2026-09-10.md` | Current T04 identity/profile/toolchain/device evidence, approved Support follow-up, preserved freeze and exact next gate. |
| `docs/public-testflight-tester-guide.md` | Sanitized tester-facing guide for the approved external/public TestFlight build and scope. Reverify against enabled services before distribution. |
| `Capitol Ledger App/App Store Connect Setup Packet.md` | Apple field and subscription reference only; dated July 17 and subordinate to the EOD handoff and this checklist. |
| `Capitol Ledger App/TestFlight Readiness Checklist.md` | Implementation reference only; dated July 18 and subordinate to this checklist. |
| `docs/beta-tester-guide/README.md` and generated PDF/DOCX | Historical first-round web-beta material; feedback routing is stale. Do not distribute for public TestFlight. |
| `docs/round-2-beta-tester-guide/README.md` | Historical web-beta material; explicitly excludes TestFlight packaging. Do not distribute for public TestFlight. |
| `docs/round-3-beta-tester-guide/README.md` and generated DOCX | Historical web-beta material with obsolete checkout and scope instructions. Do not distribute for public TestFlight. |
| `docs/tyler-personal-beta-test-guide.md` | Private operator checklist. Never distribute to testers. |
