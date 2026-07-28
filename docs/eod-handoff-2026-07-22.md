# Capitol Ledger EOD Handoff - July 22, 2026

Generated for Wednesday, July 22, 2026. This extends `docs/eod-handoff-2026-07-19.md` and is the source of truth for the next chat.

## First Instruction For The Next Chat
- Let Tyler explain the new idea about what may have changed the Mac login before running diagnostics or reconnecting accounts.
- Do not dismiss or confirm the idea without checking the timeline and non-secret local evidence.
- Begin with read-only checks. Make no Keychain, iCloud, Apple Account, FileVault, Adobe, Xcode, TestFlight, or subscription-state change until the proposed cause is understood.

## Standing Rules
- Speak directly and keep updates concise.
- Keep the in-app browser visible during browser QA.
- Ask Tyler immediately before any destructive, secret-related, architecture, dependency, schema, annual Team 17-20 product, or final App Review submission action.
- Never expose or commit passwords, passkeys, Keychain contents, Apple credentials, Apple Account details, App Store transaction identifiers, account tokens, device identifiers, tester email, or tester password.
- Continue TestFlight and App Store review preparation without submitting anything. Ask Tyler immediately before final **Submit for Review**.
- Preserve **Daily Brief** as the user-facing name and internal **Weekly Brief** compatibility naming.

## Central Unresolved Event
- Tyler's known Mac login password stopped working at the actual computer login, and access was recovered by resetting/changing the login password.
- The mechanism that changed or invalidated the original Mac login remains unknown.
- Creating TestFlight, App Store Connect, or sandbox Apple Accounts does not ordinarily change a Mac local-login password. Those accounts can, however, create additional authentication prompts or account confusion if used in the wrong macOS account location.
- The likely credential-loss sequence remains: Mac login recovery/reset, then loss of access to the prior login Keychain, then missing Mac passwords/passkeys and repeated application credential prompts.
- Do not treat that sequence as proof of what caused the original login change. Tyler has a new theory that must be heard and checked first.

## Preserved Keychain Evidence
- The active user Keychain search list contains only the current `login.keychain-db`.
- The preserved prior `login_renamed_1.keychain-db` remains outside the active search list.
- The protected recovery copy created on July 19 remains present outside the repository.
- A read-only comparison on July 22 confirmed that the preserved prior Keychain and its recovery copy are still byte-for-byte identical.
- The preserved prior Keychain and its recovery copy retain their July 18 modification time and size. The active current Keychain continues to receive normal writes.
- The available previous password did not unlock the preserved prior Keychain. Do not brute-force, reset, delete, replace, import, or expose either preserved file.

## iCloud Passwords And Passkeys State
- The trusted iPhone remains the known-good location for the complete expected credential collection. Leave it signed in, trusted, and untouched.
- The Mac previously showed only a partial collection and no passkeys.
- Prior identifier-free diagnostics found the Apple Account valid, CloudKit available, iCloud Keychain user views enabled, and device trust ready, while encrypted Keychain views remained `waitfortlk` because the Mac lacked the required local top-level keys.
- Sync toggling, retaining the local copy, restarting the Keychain proxy, and restarting the Mac did not repopulate the missing Mac collection.
- Apple Support did not provide a working resolution. The next chat will investigate carefully using Tyler's new theory and read-only evidence first.
- Do not sign out of iCloud, select **Reset Encrypted Data**, reset iCloud Keychain, remove the trusted iPhone, or delete local Keychains.

## Account Separation
- The personal Apple Account is the only account that should be used for the Mac's main iCloud sign-in and iCloud Passwords & Keychain.
- App Store Connect/Xcode developer accounts should be used only where required for development access.
- Sandbox purchase-test accounts should remain confined to the sandbox testing location on the test device.
- TestFlight tester accounts should not be connected to the Mac's main iCloud account merely to test a build.
- Do not reconnect all Apple Accounts as a troubleshooting step. First verify, without recording account identifiers, which role is active in each location.

## Popups And Adobe
- The locked preserved Keychain was removed from the active search list because it caused repeated SecurityAgent prompts.
- Adobe Creative Cloud, Core Sync, and related background components previously caused recurring credential prompts after the login-Keychain disruption.
- Adobe automatic login agents were disabled and its background stack was stopped; Adobe applications remain installed.
- The process-list check was unavailable in the current restricted diagnostic environment, so the July 22 running state of those background processes was not asserted.
- If a popup returns, record its exact application name and wording without entering or sharing a password. Do not reconnect accounts merely to silence it.

## Developer Mode, Xcode, And TestFlight
- iPhone Developer Mode and normal Xcode device pairing do not ordinarily change a Mac login password or delete iCloud passwords/passkeys.
- Developer Mode is needed for locally installed development builds, not ordinary TestFlight use. It may stay off unless local Xcode device testing resumes.
- Xcode and App Store Connect sessions may need reauthentication because their credentials were stored in the inaccessible prior Keychain. This is more likely an effect of the login/Keychain event than its cause.

## Capitol Ledger Project State
- Repo: `/Users/tylergates/Documents/Capitol Ledger`
- Branch: `main`
- HEAD: `c690931` (`Record July 18 EOD handoff`)
- Local refs on July 22 show `main` and `origin/main` at 0 ahead / 0 behind. No network fetch was performed as part of this EOD.
- The worktree contains the untracked July 19 handoff and this July 22 handoff. No app source, dependency, schema, secret, subscription, purchase, restore, cancellation, or App Store submission change was made in this chat.
- The last verified project audit found the tracked project files and critical directories intact and production healthy at the expected sign-in route.
- The Pro baseline and downgrade matrix remain paused until computer credential access is stable.

## New-Day Start Sequence
1. Read this file completely and use it as the source of truth.
2. Ask Tyler to explain the new idea and reconstruct the login-change timeline before changing anything.
3. Separate the actual Mac/FileVault login event from later SecurityAgent, Apple Account, Adobe, Xcode, and Keychain prompts.
4. Perform only read-only, identifier-free checks needed to test Tyler's theory, including local account, FileVault/secure-token, Keychain metadata, and relevant timestamp evidence when appropriate.
5. Confirm the trusted iPhone still has the complete expected collection and leave it untouched.
6. Choose a recovery path only after reviewing the evidence with Tyler. Obtain immediate approval before any reset, sign-out, account removal, credential replacement, or other destructive action.
7. After credential recovery is verified, reconfirm `main` against the live remote, confirm production health in the visible in-app browser, and orient Tyler before changing subscription state.
8. Establish the current Pro baseline without repurchasing and verify protected App Store ledger/server/account-token association without exposing identifiers.
9. Test the downgrade matrix in order: **Pro -> Free**, **Team -> Pro**, **Team -> Free**.
10. Continue TestFlight tester/feedback and App Store review preparation without submitting anything.

## Resume Prompt For New Thread
```text
Read `docs/eod-handoff-2026-07-22.md` completely and use it as the source of truth.

First, ask me to explain my new idea about what may have changed or invalidated the original Mac login. Do not reconnect accounts, reset anything, or change Keychain/iCloud/FileVault/Adobe/Xcode/TestFlight/subscription state until you understand the theory and have checked it against read-only, non-secret local evidence.

The actual Mac login stopped accepting the known password, login access was recovered by resetting/changing it, and the original cause remains unknown. The trusted iPhone remains the known-good credential collection. The Mac has a new active login Keychain; the prior locked Keychain and a byte-identical recovery copy are preserved outside the repo and outside the active search list. Apple Support did not resolve the iCloud Keychain top-level-key problem. Do not sign out of iCloud, reset encrypted data, delete Keychains, remove the trusted iPhone, expose credentials, or reconnect every Apple Account as a troubleshooting step.

After we establish the cause and safely recover credential access, return to the Capitol Ledger sequence: verify main and production, establish Pro without repurchasing, verify protected account-token association without exposing identifiers, then test Pro to Free, Team to Pro, and Team to Free. Continue TestFlight and App Store review preparation without submitting anything.
```
