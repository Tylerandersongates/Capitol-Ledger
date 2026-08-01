# CapitolWonk EOD Handoff — Sentry Privacy Closed, Apple Signing Paused For Support — July 31, 2026

Generated Friday, July 31, 2026 for work completed July 30–31, 2026. This handoff supersedes the July 29 handoff and is the source of truth for the next clean CapitolWonk continuation.

## Standing Rules

- Use **CapitolWonk** as the user-facing app name. The repository folder remains `Capitol Ledger`.
- Keep **Daily Brief** as the user-facing name. Internal `Weekly Brief` compatibility names may remain until a separately approved migration.
- Keep browser work visible and leave useful evidence open at handoff.
- Always present the next best steps after completing a work unit.
- Routine safe fixes, commits, and non-destructive pushes are standing-approved.
- Ask before major dependency, architecture, schema, billing, subscription, Apple Developer, App Store Connect, Xcode signing, protected configuration, secret-management, tester-distribution, or build-upload changes.
- Never expose or commit credentials, Apple account or team identifiers, tester credentials, transaction identifiers, private keys, tokens, account-token values, bundle identifiers, certificate fingerprints, support case identifiers, or protected configuration.
- The Mac login/iCloud Keychain incident is closed. Do not sign out of iCloud, reset encrypted iCloud data, delete or reset keychains, remove trusted devices, alter FileVault, change Apple security state, or modify the preserved old keychain and recovery copy.
- Do not repurchase a subscription merely to establish state. Verify the current entitlement first and use Restore Purchases once only if the baseline is inconsistent.
- Do not upload a build, submit anything to App Review or TestFlight Beta App Review, enable a public TestFlight link, invite external testers, or distribute a build without Tyler present and explicitly approving the exact action and scope.

## Baseline

- **Source repository:** `/Users/tylergates/Documents/Capitol Ledger` — do not modify from this continuation.
- **Active worktree:** `/Users/tylergates/.codex/worktrees/7ce8/Capitol Ledger`
- **Evidence branch:** `codex/sentry-geo-deep-scrub-verification`
- **Evidence HEAD and upstream:** `85a31cc`, synchronized before this EOD update.
- **Last locally verified `origin/main`:** `d094c15`, the documentation-only July 29 EOD merge.
- **Worktree before this EOD update:** Clean.
- **Production target:** `https://project-qosv1.vercel.app`
- **Production state:** Post-July-29 `main` CI and automatic production deployment were verified green; production smoke evidence from the July 29 baseline remains valid.
- **Native candidate:** Marketing version `1.0`, build `2`, iPhone and iPad support, iOS 16.0 minimum, and the production web target.
- **Current build-upload decision:** **NO-GO — do not upload a build.**
- **Browser state:** The Apple Developer Support request was submitted from the Account Holder session. Do not expose the confirmation or case identifier.

The release-candidate checklist is updated at `docs/public-testflight-release-candidate-checklist.md`. Where earlier documents conflict with this handoff, this handoff controls.

## Completed July 30–31

### Clean Continuation And Temporary-Diagnostic Cleanup

- Reconfirmed the clean synchronized continuation baseline before new evidence work.
- Verified post-EOD CI and the production deployment were green.
- Confirmed the temporary Sentry diagnostic route was absent after cleanup.
- Confirmed the one-time diagnostic deployment variable was absent by presence only. No protected value was viewed or printed.
- The final evidence branch is pushed through `85a31cc`; no release work was merged to `main` during this continuation.

### Sentry Privacy Decision And Verification

- Researched Sentry's server-derived geography handling read-only and presented the exact remaining privacy exposure.
- Tyler approved remediation and exactly one new verification event.
- Replaced the insufficient geography rule in both Sentry projects with the documented recursive selector `$user.geo.**`.
- Ran exactly one authorized Preview Edge verification event. Sentry stored one event total with no raw IP field or literal and no displayed city, region, country, coordinate, or other geography value.
- Permanently deleted the synthetic issue after evidence capture.
- Removed the branch-only Preview variable, its one-time value, and the temporary diagnostic route. The cleanup Preview returned 404 for the removed route.
- Sentry's advanced rule affects new incoming events only. Pre-change events are not retroactively rewritten and remain subject to normal retention.
- Sentry server-derived geography is no longer a public-beta blocker for new events. Tyler's earlier acceptance of generated-only Vercel Edge stack frames remains in force.

### Protected Native Sentry Setup

- Tyler approved protected native Sentry setup and exactly one native verification event after a valid signed/device candidate exists.
- Supplied the native Sentry setting through a mode-0600 temporary build-settings file without printing or committing it.
- Xcode resolved the protected setting, an unsigned Release build passed, and the compiled app contained a valid resolved value.
- Removed the temporary protected file and compiled temporary artifacts.
- No native event was sent because no signed app was produced. The one-event verification scope remains unconsumed, but it is paused with all signing work pending Apple Support and a new exact action review.

### Xcode 27 And Physical-Device Preparation

- Reauthenticated the Xcode developer-account session enough for a developer team to appear.
- Enabled Developer Mode on one physical iPhone and established an unlocked wired connection.
- The iOS 27 device could not connect to stable Xcode 26.6 because Apple's required device-support update was unavailable from the Software Update server.
- Installed the official Xcode 27 beta 4 side by side at `/Applications/Xcode-27-beta.app` and verified its signature and Gatekeeper status.
- Kept stable Xcode 26.6 installed at `/Applications/Xcode.app` and left it as the system-selected developer directory.
- An unnecessary iOS 27 Simulator runtime and the downloaded Xcode archive consumed most free disk space. Tyler approved removing only those downloaded artifacts. Both were removed, about 9.6 GiB was recovered, and both Xcode applications remained intact.
- Xcode 27 beta 4 can see the physical iOS 27 device, but signed device attempts stopped at provisioning before producing a signed app or archive. Full physical-device QA did not begin.

### Development Certificate And Keychain Evidence

- The initial local audit found zero usable code-signing identities and an Apple Development certificate without a matching private key.
- Tyler explicitly approved revoking the existing Apple Development certificate believed at the time to belong to the secondary testing account and creating its replacement.
- The Apple Developer portal action revoked a **Development** certificate only. The separate Distribution Managed certificate was not changed.
- The replacement Apple Development certificate was issued, but read-only public-key comparison found that neither of the two private keys in the login keychain matches it. `security find-identity -v -p codesigning` still reports zero usable identities.
- A manual Certificate Assistant CSR attempt failed with “The specified item could not be found in the keychain.” No valid CSR was produced.
- No private key was deleted. No keychain, trust setting, Apple Account security state, team membership, distribution certificate, preserved recovery artifact, tester state, or App Store Connect state was changed.
- A revocation notice was delivered to the Account Holder mailbox, while the local certificate is labeled for the secondary testing user. Apple documents that Development certificates belong to individuals while certificate names also include team information. The notification recipient, team name, and local display name do **not** establish the revoked certificate's individual owner.
- The exact individual ownership of the revoked Development certificate is unresolved. Do not describe either Apple Account as switched, do not infer ownership from email routing or Keychain labels, and do not perform another certificate, CSR, profile, or Keychain action until Apple Support clarifies the record.

### Apple Developer Support Escalation

- Prepared an Apple Developer Support request under Development and Technical → Certificates, Identifiers, and Provisioning Profiles.
- Submitted the request from the Account Holder session without an attachment and without adding protected account, team, certificate, or bundle identifiers to the message.
- The request initially described the revoked certificate as belonging to the secondary testing account. Later notification evidence made that individual ownership uncertain.
- The existing case needs this correction when Apple permits a follow-up: the revoked Development certificate's individual owner is unconfirmed; Apple should identify it and advise how to establish the correct Account Holder/team local signing identity without resetting the login keychain or affecting the Distribution Managed certificate.
- Do not create a duplicate support case unless Apple directs it. Keep the case identifier and all account details private.

## Diagnostics

- **Code scan:** Confirmed the temporary Sentry route is absent from the cleaned evidence branch. No new full-app stale-code or performance diagnostic was run; the complete July 29 release regression remains the latest full-app diagnostic baseline.
- **Git checks:** Evidence branch and upstream matched at `85a31cc`; the worktree was clean before this EOD update.
- **Sentry checks:** Exactly one authorized Edge event; one stored event total; raw IP absent; derived geography absent; synthetic issue deleted; route and temporary Preview variable removed.
- **Native checks:** Protected-setting resolution and unsigned Release build passed. No signed build or archive exists.
- **Signing checks:** Zero usable code-signing identities. One replacement Development certificate is present without a matching local private key. Two local private keys were checked read-only; neither matches.
- **Xcode checks:** Xcode 27 beta 4 is installed side by side; stable Xcode 26.6 remains installed and system-selected.
- **Blocked checks:** Signed archive, native event delivery, app installation, complete physical-device QA, subscription transitions, and strict live App Store server checks remain blocked or incomplete.
- **Cleanup applied:** Removed the Sentry probe route, temporary Preview variable, synthetic issue, protected temporary native build-setting file, compiled temporary artifacts, unnecessary simulator runtime, and downloaded Xcode archive.

## QA

- **Production smoke:** Post-July-29 production deployment and smoke evidence remained green during the clean continuation.
- **Browser QA:** Sentry privacy remediation and cleanup were visibly verified. Apple Developer certificate and Support work was performed in the signed-in browser session without exposing protected values in documentation.
- **Physical-device QA:** Device connection and Developer Mode are established, but no signed candidate installed. The app-level matrix remains unstarted.
- **Known issue:** Apple signing is frozen pending Support clarification. The replacement Development certificate has no matching local private key, there are zero usable identities, and the revoked certificate's individual owner is unresolved.

## Accepted Public-Beta Risks

- **Dependency audit:** Three high and one moderate advisory remain through limited-reachability upstream PostCSS/sharp paths. Tyler accepted this residual risk for public-beta preparation.
- **Vercel Edge stack mapping:** Edge events show generated-only `vc/edge/function` frames instead of route source. Tyler accepted this monitoring limitation for public-beta preparation.

Neither acceptance authorizes a build upload, tester distribution, public link, TestFlight Beta App Review, or App Review.

## Current State

- **Sentry privacy:** Closed for new events. Raw IP and server-derived geography were absent in the single authorized verification event.
- **Native Sentry configuration:** Protected resolution verified in an unsigned Release build; runtime delivery remains unverified.
- **Apple signing:** Hard stop. Zero usable signing identities; no matching private key; no signed app or archive; Support case pending.
- **Certificate ownership:** Unresolved. The available notification and display names do not prove that Apple Accounts were switched or identify the revoked Development certificate's individual owner.
- **Physical device:** Connected and Developer Mode enabled, but the exact candidate has not installed and QA has not begun.
- **Subscriptions:** Existing entitlement and the Pro-to-Free, Team-to-Pro, and Team-to-Free transition matrix remain unverified. Do not repurchase.
- **Release candidate:** Version `1.0`, build `2` remains the intended candidate, but no upload decision can be presented until signing and downstream evidence are complete.
- **Distribution:** No build was uploaded, no public link was enabled, no tester was invited, and nothing was submitted for TestFlight Beta App Review or App Review.
- **Exact decision:** **NO-GO — do not upload or distribute a build.**

## Next Best Steps

1. **Reconfirm the handoff baseline**
   - Read this handoff completely.
   - Confirm the evidence branch is clean and synchronized.
   - Fetch read-only and confirm whether `origin/main` is still at or beyond `d094c15`.
   - Confirm the latest `main` CI and production deployment remain green.
2. **Correct and await the existing Apple Support case**
   - If the case offers an add-information option, state that the revoked Development certificate's individual owner is unconfirmed.
   - Ask Apple to identify the revoked certificate and advise how to establish the correct Account Holder/team local signing identity without resetting Keychain or changing the Distribution Managed certificate.
   - Do not create another case, attach screenshots containing identifiers, or disclose protected values unless Apple specifically requests a secure channel and Tyler approves the exact disclosure.
3. **Freeze Apple signing and security state**
   - Do not revoke or create another certificate, create another CSR, delete a key, regenerate a profile, change Xcode signing, sign out of an Apple Account, reset Keychain, or alter preserved recovery artifacts while Support is pending.
   - Treat names shown in Mail, Keychain, Xcode, and the portal as labels, not proof of account ownership.
4. **Present the exact post-Support action for approval**
   - When Apple responds, redact all identifiers before recording the guidance.
   - Present one narrowly scoped signing plan and obtain Tyler's explicit approval before performing it.
   - Reconfirm which account, team, certificate type, profile, and device the action would affect by presence or role only; do not expose their values.
5. **Resume signed-device evidence only after signing is healthy**
   - Produce and validate the exact signed Release candidate.
   - Install it on the connected device and run the complete physical-device matrix.
   - Supply the protected native Sentry setting again and send at most the one previously approved non-sensitive native verification event only after reviewing the exact action with Tyler.
6. **Complete subscription QA without repurchase**
   - Establish the current entitlement first.
   - Run Pro-to-Free, Team-to-Pro, and Team-to-Free with restore/manage/relaunch and duplicate-entitlement checks.
7. **Present the exact build-upload decision**
   - Include the exact version, build, commit, dependency risk, CI, deployment, signed archive, device QA, subscription, monitoring, release-note, and remaining-risk evidence.
   - Obtain Tyler's explicit approval for that exact upload immediately before any upload.
8. **Preserve distribution and review hard stops**
   - Do not enable a public TestFlight link, invite external testers, distribute a build, or submit TestFlight Beta App Review or App Review without Tyler present and explicitly approving the exact action.

## Resume Prompt For The New Task

```text
Read `/Users/tylergates/.codex/worktrees/7ce8/Capitol Ledger/docs/eod-handoff-2026-07-31.md` completely and use it as the source of truth for this clean CapitolWonk continuation.

Goal: resolve the Apple Development signing identity safely, then finish the remaining evidence required for an exact public/external TestFlight build-upload decision.

Start read-only. Confirm the evidence worktree is clean and synchronized, fetch and verify `origin/main` is at or beyond `d094c15`, and confirm current `main` CI and production deployment status. Then inspect the existing Apple Developer Support case for a response or an add-information option. Correct the case to state that the revoked Development certificate's individual owner is unconfirmed. Do not infer account ownership from Mail routing, Keychain labels, Xcode labels, or team display names.

Do not revoke or create another certificate, create another CSR, delete a key, regenerate a provisioning profile, change Xcode signing, sign out of an Apple Account, reset Keychain, change Apple security state, or touch preserved recovery artifacts while Support is pending. Do not expose credentials, account or team identifiers, support case identifiers, certificate fingerprints, private keys, tokens, bundle identifiers, tester data, transaction identifiers, or protected configuration.

Sentry privacy is closed for new events: exactly one approved Edge verification showed no raw IP and no server-derived geography, and all temporary diagnostic state was removed. Native protected-setting resolution passed in an unsigned Release build, but no native event was sent and no signed app exists.

Routine safe fixes, commits, and non-destructive pushes are standing-approved. Ask before any Apple Developer, App Store Connect, Xcode signing, protected configuration, subscription, tester-distribution, build-upload, or review action. Do not upload or distribute a build, enable a public TestFlight link, invite testers, or submit anything for review without Tyler present and explicitly approving the exact action.
```
