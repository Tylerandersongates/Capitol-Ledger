# Capitol Ledger EOD Handoff - July 19, 2026

Generated for Sunday, July 19, 2026. This extends `docs/eod-handoff-2026-07-18.md` and is the source of truth for the next chat.

## Standing Rules
- Speak directly and keep updates concise.
- Keep the in-app browser visible during browser QA.
- Routine scoped fixes, commits, pushes, and visible QA are pre-approved. Ask Tyler immediately before major architecture, dependency, schema, destructive, secret-related, annual Team 17-20 product, or final App Review submission actions.
- Never expose or commit Apple credentials, App Store transaction identifiers, sandbox tester credentials, Apple Account details, device identifiers, password/passkey contents, or keychain contents.
- Continue App Store review preparation without submitting anything. Ask Tyler immediately before final Submit for Review.
- Preserve **Daily Brief** as the user-facing name and internal **Weekly Brief** compatibility naming.

## Project Baseline Verified Today
- Repo: `/Users/tylergates/Documents/Capitol Ledger`
- Branch: `main`
- HEAD: `c690931` (`Record July 18 EOD handoff`)
- `main` was clean and synchronized with `origin/main`: 0 ahead / 0 behind.
- Production target: `https://project-qosv1.vercel.app`
- Production loaded successfully in the visible in-app browser, reached the expected sign-in route, completed page loading, and showed no browser console errors.
- The production browser session was not authenticated, so no subscription state was changed.
- All 365 tracked project files matched the clean Git worktree. Critical app, component, library, Prisma, public asset, script, native iOS, and documentation directories were present.
- The ignored local environment file remained present with all of its existing entries populated. Protected Apple Server API and Sentry production settings remain intentionally outside Git; do not copy them into chat or the repository.
- Core installed dependency files were present. The package runner attempted to reconcile a local dependency-layout mismatch and aborted before changing it. Direct execution with the bundled Node runtime passed the relevant checks.

## Checks Completed
- Billing transition fixture check: passed.
- App Store billing readiness: passed in local prep mode with expected protected-production warnings.
- iOS native StoreKit bridge check: passed.
- TestFlight readiness: passed in local prep mode with expected protected-production warnings.
- No purchase, restore, cancellation, subscription-management action, App Store submission, schema change, secret change, or production write was performed.

## Subscription And TestFlight State
- The Pro baseline and downgrade matrix were not started because the computer credential issue blocked safe sign-in and Apple/TestFlight work.
- Do not repurchase Pro reflexively.
- Resume in this order only after computer credential access is stable:
  1. Establish the current Pro baseline across the physical TestFlight app, production browser, Upgrade, Settings/Profile, a Pro-gated feature, and protected server state.
  2. Confirm server-side App Store validation and correct account-token association using presence/association evidence only; never expose identifier values.
  3. Test **Pro -> Free**.
  4. Test **Team -> Pro**.
  5. Test **Team -> Free**.
  6. After every transition, verify phone, browser, feature gates, protected server state, force-close/relaunch persistence, Restore Purchases, effective timing, and absence of duplicate active entitlements.
- Continue TestFlight tester/feedback and App Store review preparation without submitting anything.

## Computer Credential Recovery
- Tyler recovered access to the Mac after the login password stopped working and was reset/changed.
- The project files were audited because passwords, passkeys, and authentication state appeared to be missing. The project itself was intact.
- macOS had created a new login keychain and preserved the prior login keychain outside the repository.
- A protected local safety copy of the preserved keychain was made and verified identical. Neither keychain was deleted, reset, imported into Git, or inspected for credential contents.
- The available previous password did not unlock the preserved keychain. Do not brute-force it, reset it, delete it, or expose it.
- The preserved locked keychain was disconnected from the active keychain search list after it caused repeated Apple SecurityAgent prompts. The current login keychain remains the only active user keychain. The preserved original and verified safety copy remain on disk outside the repository.
- The recurring SecurityAgent popup was resolved after disconnecting the locked keychain.
- Adobe Creative Cloud and its background sync stack repeatedly reopened credential prompts. The Creative Cloud desktop, CCX Process, and Adobe Desktop Service login agents were disabled, and the current Creative Cloud background stack was stopped. Adobe applications remain installed and can be opened manually. Re-enable automatic startup only after credential recovery if Tyler wants it.

## iCloud Passwords And Passkeys Diagnosis
- A trusted iPhone still shows the complete expected password and passkey collection. Do not record its item counts or any entry details in Git or chat.
- The Mac Passwords app shows only a partial collection and no passkeys.
- iCloud Passwords & Keychain sync was enabled on the Mac. Toggling Mac sync off while retaining a local copy, turning it back on, restarting the Keychain proxy, and restarting the Mac did not repopulate the missing items.
- Apple System Status reported iCloud Keychain available.
- Identifier-free local diagnostics established:
  - the Apple Account credentials are valid;
  - CloudKit is available;
  - iCloud Keychain user views are enabled;
  - the Mac trust state reports ready;
  - Passwords, Wi-Fi, protected storage, and the other encrypted Keychain views are waiting for top-level encryption keys;
  - a fetch-only sync failed because the Mac has no local keys for those views.
- This is an iCloud encryption-key recovery/trust-share problem on the Mac, not evidence that the cloud credential collection was deleted.
- No destructive Keychain reset, cloud reset, encrypted-data reset, iCloud sign-out, trusted-device removal, or undocumented repair command was performed.

## Apple Support Handoff
- Contact Apple Support before attempting deeper repair.
- Safe diagnostic summary for Apple Support:
  - Mac login password recovery created a new local login keychain.
  - A trusted iPhone retains the complete iCloud Passwords/passkey collection.
  - The Mac is signed into iCloud, Passwords & Keychain sync is enabled, CloudKit is available, and device trust is ready.
  - The Mac's encrypted Keychain views remain `waitfortlk`, and a fetch-only sync reports no local keys.
  - Sync toggle, Keychain proxy restart, and full Mac restart did not resolve it.
- Do not provide Apple Support with passwords, passkeys, keychain files, tester credentials, or App Store transaction identifiers in ordinary chat. Use only Apple's authenticated support flow.
- Do not sign out of iCloud, choose **Reset Encrypted Data**, delete either keychain, remove the trusted iPhone, or run a cloud/keychain reset without understanding the effect and obtaining Tyler's immediate approval.

## Tomorrow Start Sequence
1. Read this file completely and use it as the source of truth.
2. Confirm the SecurityAgent and Creative Cloud popup loops remain resolved.
3. Confirm the trusted iPhone still has the complete password/passkey collection and leave it untouched as the known-good copy.
4. Contact Apple Support with the identifier-free diagnostic summary above and follow only the supported recovery path.
5. After recovery, confirm the Mac Passwords collection and passkeys repopulate before re-enabling Creative Cloud automatic startup.
6. Reconfirm `main` is clean and synchronized and production is healthy.
7. Sign into production directly without sharing credentials, force-close/relaunch the physical TestFlight app, and resume the Pro baseline without repurchasing.
8. Continue the downgrade matrix in order: **Pro -> Free**, **Team -> Pro**, **Team -> Free**.
9. Continue TestFlight tester/feedback and App Store review preparation without submitting anything.

## Resume Prompt For New Thread
```text
Read `docs/eod-handoff-2026-07-19.md` completely and use it as the source of truth.

The Capitol Ledger repository was clean and synchronized at `c690931`, all tracked project files and critical directories were present, and production was healthy. No subscription, purchase, restore, cancellation, schema, secret, or App Store submission action was performed on July 19.

The work paused because Mac login password recovery created a new login keychain and the Mac stopped receiving iCloud Keychain encryption keys. A trusted iPhone retains the complete password/passkey collection. The Mac remains partial, with its encrypted Keychain views waiting for top-level keys despite sync toggling, a Keychain proxy restart, and a full Mac restart. The preserved prior keychain and a verified safety copy remain outside the repo; the prior keychain is disconnected from active searches because it cannot be unlocked with the available password and caused repeated SecurityAgent prompts. Creative Cloud automatic login agents are disabled and its background stack is stopped.

Begin with Apple Support using the identifier-free diagnostic in the handoff. Do not sign out of iCloud, reset encrypted data, delete keychains, remove the trusted iPhone, or expose credentials. After Apple resolves the Mac sync, verify the full Passwords/passkey collection on the Mac, reconfirm the repo and production baseline, then establish Pro without repurchasing and run the downgrade matrix in order: Pro to Free, Team to Pro, Team to Free. Continue TestFlight and App Store review preparation without submitting anything.
```
