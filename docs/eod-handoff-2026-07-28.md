# CapitolWonk EOD Handoff — Congress Search Catalog Complete — July 28, 2026

Generated Wednesday, July 29, 2026 for work completed Tuesday, July 28, 2026. This handoff supersedes the earlier July 28 closeout and is the source of truth for the next clean CapitolWonk continuation.

## Standing Rules

- Use **CapitolWonk** as the user-facing app name. The repository folder remains `Capitol Ledger`.
- Keep **Daily Brief** as the user-facing name. Internal `Weekly Brief` compatibility names may remain until a separately approved migration.
- Keep browser work visible and leave a useful preview open at handoff.
- Routine safe fixes, commits, and non-destructive pushes are standing-approved.
- Ask before major dependency, architecture, schema, billing, subscription, Apple Developer, App Store Connect, Xcode signing, protected configuration, or secret-management changes.
- Never expose or commit credentials, Apple account identifiers, tester credentials, transaction identifiers, private keys, tokens, account-token values, or protected configuration.
- The Mac login/iCloud Keychain incident is closed. Do not sign out of iCloud, reset encrypted iCloud data, delete keychains, remove trusted devices, alter FileVault, or modify the preserved old keychain and recovery copy.
- Do not repurchase a subscription merely to establish state. Verify the current entitlement first and use Restore Purchases once only if the baseline is inconsistent.
- Do not submit anything to App Review or TestFlight Beta App Review without Tyler present and explicitly approving that specific submission.
- Do not create a public TestFlight link, invite external testers, or distribute a build until Tyler approves the exact build and tester scope.

## Baseline

- **Repo:** `/Users/tylergates/Documents/Capitol Ledger`
- **Branch:** `main`
- **Verified app-source HEAD:** `5fbf270` — `Load complete 119th Congress vote catalog`
- **Origin sync:** Local `main` and `origin/main` match at `5fbf270`.
- **Worktree before this EOD update:** Clean.
- **Production target:** `https://project-qosv1.vercel.app`
- **Production verification:** The production target previously responded successfully with the CapitolWonk sign-in page. The July 28 Congress catalog commits were pushed, but their production deployment has not yet been independently verified in this handoff.
- **Local preview:** The supported local preview is available at `http://127.0.0.1:3023`.
- **Goal for the next continuation:** Prepare a verified release candidate for public/external TestFlight testing. Preparation is authorized; Apple review submission and tester distribution remain explicit approval gates.

## Completed July 28

### Mac Keychain Incident Closure

- Confirmed the operating-system update restored the missing Mac passwords and normal Keychain access.
- Read-only checks showed a healthy active login keychain, readable item metadata, available iCloud Keychain synchronization, FileVault still enabled, and no stuck credential-prompt process.
- No Apple security state, trusted device, preserved keychain artifact, or recovery copy was changed.
- The incident is closed. Its restrictions remain standing safeguards.

### Readiness And Security Hardening

- Rehydrated the repository's offloaded Git data and restored one missing Git object from origin without replacing history or discarding user work.
- Reinstalled dependencies from the frozen `pnpm` lockfile; dependency declarations and the lockfile were not changed.
- Added the dashboard logo priority hint and verified the observed Largest Contentful Paint warning was removed.
- Hardened the Weekly Brief delivery and billing readiness checks so missing protected configuration fails clearly without printing secret values.
- Added `docs/dependency-security-upgrade-plan-2026-07-28.md` for the separately approved framework/dependency upgrade.

### Officials Search

- Restored the intended saved-topic behavior for Officials:
  - A saved state such as California filters results to officials from that state.
  - Editing the saved state to **All** returns the complete current Congress roster.
  - The same behavior applies consistently to every individual state.
- Removed the misleading California-specific title change and aligned setup chips, persisted profile state, URL state, results, counts, and empty-state copy.
- Verified the full active roster is **537 officials**: **437 House members** and **100 Senators**.

### Full 119th Congress Bill Catalog

- Added guarded Congress.gov bill-catalog pagination, normalization, database upserts, exact search counts, and paginated bill results.
- Added dedicated catalog/readiness validation and integrated the catalog into the Congress synchronization path.
- Populated and verified the full current 119th Congress bill catalog available from the official source.

### Full 119th Congress Vote Catalog

- Added complete House and Senate vote ingestion:
  - House vote catalog pagination with official House Clerk XML details.
  - Senate vote catalog and member positions from official Senate XML.
  - Bounded concurrency, retries, local official-source caching, and fail-closed identity, tally, and member-mapping checks.
- Updated the vote identity to include Congress, chamber, session, and roll call.
- Added support for named/non-binary House choices using an explicit `OTHER` position plus the official position label.
- Added exact vote search counts, 50-result pagination, database-backed vote detail pages, bill links, member positions, and named-choice filtering/copy.
- Applied the approved vote migration. An older migration-history mismatch was resolved non-destructively only after confirming the live column exactly matched the recorded migration.
- Populated and independently reconciled:
  - **1,515 votes**
  - **645 House votes**
  - **870 Senate votes**
  - **365,830 member positions**
  - **804 votes linked to bills**
  - **434 named/other positions, all with labels**
  - **0 duplicate vote identities**
  - **0 incomplete votes**
- Preserved the active 537-member roster, retained historical inactive member records needed by prior votes, and kept roster deactivation/deletion disabled during vote ingestion.

### Publication

- Committed and pushed the July 28 work to `main`:
  - `34f3e84` — readiness-check hardening and dependency-security plan
  - `4686f1e` — Officials state-filter clarification
  - `2d2e70c` — complete Officials roster results
  - `75773da` — saved state applied to Officials search
  - `d4c72e3` — full current Congress bill catalog
  - `5fbf270` — complete 119th Congress vote catalog
- No App Review, TestFlight Beta App Review, tester invitation, public-link, Apple security, billing, or subscription action was taken.

## Diagnostics And QA

- TypeScript: passed.
- Next.js ESLint: passed with no warnings or errors.
- Optimized production build: passed.
- Congress vote-catalog reconciliation: passed.
- Congress readiness, search, member-vote, vote-position, and bill-vote checks: passed.
- Visible browser QA verified:
  - the complete Officials roster behavior;
  - state-to-All saved-topic transitions;
  - complete bill results and pagination;
  - **1,515** vote results with 50 per page and 31 pages;
  - a stored House vote detail with official source, bill link, and member positions;
  - a Speaker election showing the official named choices and all 434 named/other labels.
- The local preview reported no blocking page-level errors during the final vote pass.
- The earlier full-app diagnostic passed route integrity, offline validation, local TestFlight preparation, iOS bridge, account deletion, billing-transition fixtures, launch-copy, and production-build checks.

## Known Issues And Approval-Gated Work

- The production dependency audit previously reported 28 advisories: 13 high, 13 moderate, and 2 low. The separately documented framework/dependency upgrade needs approval before implementation and a full regression pass afterward.
- The protected Weekly Brief delivery check still needs its runtime configuration in the intended environment. Values must not be printed, copied to chat, or committed.
- The July 28 Congress catalog commits are pushed but have not yet been independently confirmed as the active production deployment.
- Authenticated production QA and the planned subscription transition matrix remain incomplete.
- The current Pro baseline must be established without repurchasing, followed by deliberate **Pro → Free**, **Team → Pro**, and **Team → Free** verification.
- Protected Sentry deployment/Xcode configuration and end-to-end feedback/error/crash delivery remain incomplete. Native crash monitoring requires a new uploaded TestFlight build.
- A new native release candidate still needs version/build confirmation, a clean archive/build validation, and device QA.
- External/public TestFlight configuration, the exact tester audience, beta description/contact information, export-compliance answers, build selection, and feedback-monitoring ownership still need verification.
- Apple may require TestFlight Beta App Review before external/public testing. Reaching that submit action is a hard stop for Tyler's presence and explicit approval.
- Nothing has been submitted to App Review or TestFlight Beta App Review.

## Public TestFlight Readiness Task List

1. **Reconfirm the release baseline**
   - Read this handoff completely.
   - Confirm `main` is clean and synchronized with `origin/main`.
   - Confirm the latest pushed Congress catalog release is healthy in production.
   - Run the current local release/readiness suite before changing Apple or subscription state.
2. **Classify dependency-security risk**
   - Re-run the production dependency audit without changing packages.
   - Map active-path exposure and decide whether the documented Next.js/dependency upgrade is a public-beta blocker.
   - Obtain Tyler's approval before changing framework or dependency versions.
3. **Finish protected monitoring and delivery checks**
   - Verify Weekly Brief protected runtime configuration in its intended environment without exposing values.
   - With Tyler's action-time approval, configure protected Sentry values outside git.
   - Verify one non-sensitive in-app report plus browser, server, and native diagnostic delivery with PII/replay safeguards intact.
4. **Complete subscription lifecycle QA without repurchase**
   - Establish the current Pro baseline across the physical TestFlight app, production browser, Settings/Profile, Upgrade, a Pro-gated feature, and protected server state.
   - Verify server validation and account-token association by presence only.
   - Run the transition matrix in order: **Pro → Free**, **Team → Pro**, **Team → Free**.
   - For every path, verify effective timing, phone/browser state, feature gates, protected server state, Restore Purchases, relaunch persistence, and duplicate-entitlement absence.
5. **Prepare and verify the native release candidate**
   - Confirm intended marketing version/build number and selected production URL.
   - Run the native bridge/readiness checks and a clean Xcode archive/build.
   - Verify signing/capabilities without copying account or team identifiers into chat or source.
   - Test sign-in, dashboard, Officials, bills, votes, feedback, account deletion, subscription purchase/restore/manage, and relaunch persistence on a physical device.
   - Obtain Tyler's explicit approval immediately before uploading a new TestFlight build.
6. **Prepare external/public TestFlight distribution**
   - Confirm the exact build, tester group, approved tester list or public-link audience, beta description, contact, tester guide, export-compliance answers, and feedback triage owner.
   - Verify support/privacy links and beta notes against the actual enabled production services.
   - Do not invite testers or enable a public link until Tyler approves the scope.
7. **Hard stop before review**
   - Present the final readiness evidence, remaining risks, and exact Apple action about to occur.
   - Do not click or invoke **Submit for Beta Review**, **Submit for Review**, or any equivalent review submission without Tyler present and explicitly approving that action.

## Resume Prompt For The New Task

```text
Read `/Users/tylergates/Documents/Capitol Ledger/docs/eod-handoff-2026-07-28.md` completely and use it as the source of truth for this clean CapitolWonk continuation.

Goal: prepare CapitolWonk for public/external TestFlight testing.

Start with task 1 in the Public TestFlight Readiness Task List: reconfirm the clean synchronized release baseline, verify that the latest Congress catalog release is healthy in production, and run the current local release/readiness suite. Then perform the read-only dependency-security audit and classify whether the separately planned upgrade is a public-beta blocker.

Routine safe fixes, commits, and non-destructive pushes are standing-approved. Ask before major dependency, architecture, schema, billing, subscription, Apple Developer, App Store Connect, Xcode signing, protected configuration, secret-management, tester-distribution, or build-upload changes.

Never expose credentials, Apple account or team identifiers, tester credentials, transaction identifiers, private keys, tokens, account-token values, or protected configuration. The Mac login/iCloud Keychain incident is closed; do not alter Apple security state or the preserved recovery artifacts. Do not repurchase to establish subscription state.

Do not submit anything to App Review or TestFlight Beta App Review, enable a public TestFlight link, or invite external testers without Tyler present and explicitly approving the specific action.
```
