# Capitol Ledger EOD Handoff - July 18, 2026

Generated for Saturday, July 18, 2026. This extends the Friday, July 17 handoff and is the source of truth for the next chat.

## Standing Rules
- Speak directly. Keep updates concise, useful, and low-fluff.
- Keep the in-app browser open and visible during browser QA so Tyler can follow the work.
- Routine scoped fixes, commits, pushes, and visible QA are pre-approved. Ask Tyler immediately before major architecture, dependency, schema, destructive, secret-related, annual Team 17-20 product, or final App Review submission actions.
- Never expose or commit Apple credentials, App Store transaction identifiers, sandbox tester email, or sandbox tester password.
- Continue App Store review preparation without submitting anything. Ask Tyler immediately before the final Submit for Review action.
- Preserve **Daily Brief** as the user-facing name and internal **Weekly Brief** compatibility naming.
- A diagnostic means checking the whole app for stale imports, disconnected routes/APIs, duplicate work, serialized network calls, failing safeguards, build errors, and obvious performance drag. Do not delete compatibility surfaces or assets without evidence that they are safe to remove.

## Baseline
- Repo: `/Users/tylergates/Documents/Capitol Ledger`
- Branch: `main`
- Previous dated handoff: `docs/eod-handoff-2026-07-17.md`
- HEAD entering July 18 implementation work: `3a7cbde` (`Record July 17 EOD handoff`)
- Current release HEAD before this EOD commit: `18e6166` (`Streamline member and dashboard data paths`)
- Origin sync before this EOD document: `0` behind / `0` ahead
- Production target: `https://project-qosv1.vercel.app`
- Verified production release commit: `18e6166`
- Public brand: `CapitolWonk CE`
- Bundle ID: `com.capitolwonk.ce`
- App Store Connect app ID: `6788196048`
- TestFlight build: version `1.0`, build `1`
- Production database reads are enabled and the official current-member roster is now the authority for member/search surfaces.
- Browser handoff state before the EOD commit: Vercel deployment details for `18e6166`, showing **Ready**, **Production**, and **Current**.

## Completed Today

### Pro Monthly Purchase And Restore
- The first force-close/relaunch check did **not** keep Pro, so persistence was not accepted as complete.
- Tyler accidentally purchased Pro Monthly again while distracted. Treat that as a test event, not a planned lifecycle step.
- After the second purchase, the signed-in production browser and physical TestFlight app both showed Pro.
- Restore Purchases prompted for the sandbox Apple Account password, completed successfully, and returned **Pro purchase restored**.
- After restore, Pro remained the current plan and Pro-gated features were unlocked.
- Cross-surface Pro state is therefore verified after the second purchase and restore. The next lifecycle work must test downgrades deliberately and record protected server evidence without exposing identifiers.

### App Store Review Preparation
- Prepared and committed final dashboard screenshot assets:
  - `docs/app-store-assets/listing/capitolwonk-iphone-6.5-dashboard.png`
  - `docs/app-store-assets/listing/capitolwonk-ipad-13-dashboard.png`
- Tyler uploaded the iPhone and iPad screenshots to the iOS version record.
- Tyler entered and saved the review fields that were completed during the session.
- Copyright holder was confirmed as **Tyler Anderson Gates**.
- Distribution/pricing information reviewed during the session was approved and saved by Tyler.
- Nothing was submitted to App Review. Reconfirm build selection, the subscription group, reviewer account/contact fields, review notes, and every remaining warning before final submission.

### Tester Feedback System
- Replaced the custom shared feedback queue with Sentry-backed browser/server error monitoring, native iOS crash monitoring, and direct in-app feedback.
- Removed the retired custom feedback API, queue components, review workflow, and beta-feedback scripts that no longer belong in the launch path.
- Kept `/feedback/review` only as a compatibility redirect instead of leaving a dead review queue.
- Added dedicated account-deletion persistence so deletion requests no longer share feedback storage.
- Session replay and default PII collection remain disabled.
- The implementation is deployed, but protected Sentry project values and a new native/TestFlight build still need explicit setup and end-to-end verification. Ask Tyler immediately before entering or changing secrets or applying any outstanding production schema work.
- TestFlight feedback remains separately available in App Store Connect. External tester invitations and a real tester feedback pass are still pending.

### Representative Accountability Snapshot
- Rebuilt the key member accountability surface around evidence instead of a false-precision score.
- The app now keeps missing evidence visible, refuses to award points for missing data, labels preliminary/insufficient coverage, and requires verified scorable evidence in at least three categories covering 60% of the model before publishing an overall score.
- The evidence ledger separates voting participation, legislative record, transparency sources, and ethics/compliance coverage.
- Saved-topic evidence is personalized without guessing the user's policy position.
- Production QA verified Laura Friedman's page with 28 linked records and the correct 437-member House comparison cohort.

### Full House And Senate Roster
- Added a guarded full Congress roster sync, canonical-member normalization, reconciliation safeguards, and database upserts.
- Synchronized and audited the protected production roster against Congress.gov:
  - 537 current members total
  - 437 House members
  - 100 Senators
  - 537 matching active production records
  - 0 extra active records
  - 0 orphaned current-member source links
  - 19 historical members retained as inactive records
  - 100% canonical Congress.gov source-link coverage
  - 0 critical integrity failures
- Production member/search reads were enabled only after the audit and Tyler's approval.
- Search now returns the canonical current Laura Friedman record once; demo-only identities do not leak into a complete official roster.
- Remaining non-blocking gaps are explicit: two portrait fallbacks, incomplete direct official-site coverage, and unverified election dates shown as **Not listed** rather than fabricated.
- Durable audit artifacts are under `docs/reports/congress-roster-audit-2026-07-18/`.

### Full-App Diagnostic And Cleanup
- Audited tracked app, component, library, route, API, script, and public-asset surfaces.
- Removed three verified unused UI imports.
- Changed independent member profile, legislation, and chamber vote enrichment from a serialized waterfall to concurrent work, while requesting only the member's relevant chamber vote source.
- Replaced repeated dashboard bill scans with a single bill lookup map.
- Repaired a stale billing-transition safeguard so it verifies both the Pro product map and Team seat-product resolver.
- Preserved intentional redirect routes, external/native API surfaces, and design collateral because there was not enough evidence to delete them safely.
- Committed and pushed today's work:
  - `28f3fc7` - Add App Store listing screenshots
  - `3738818` - Replace custom feedback queue with Sentry
  - `060abcb` - Make member accountability evidence-first
  - `9065c9f` - Add guarded full Congress roster sync
  - `4f339dd` - Harden production member roster reads
  - `18e6166` - Streamline member and dashboard data paths

## Diagnostics And QA
- `next lint`: passed with no warnings or errors.
- `tsc --noEmit`: passed.
- Strict unused-local/unused-parameter TypeScript check: passed.
- Optimized production build: passed; all 63 pages/API routes compiled and generated successfully.
- Member service history, member vote records, profile actions, roles, issue topics, and accountability score safeguards: passed.
- Search filters/results, live docket, policy-edge, bill status/action/detail/timeline/votes, vote positions, gamification, video, and YouTube-statement safeguards: passed.
- Billing transition, billing readiness, TestFlight readiness/mobile UI, iOS native bridge, account deletion, launch copy, election copy, backend demo-safe, feedback implementation, and Congress demo-safe checks: passed or completed with expected protected-configuration warnings.
- Strict production-only checks still require protected runtime values/network access. Local warnings about Sentry, delivery secrets, and production database access were not treated as code failures.
- Visible local QA passed for the canonical member page, member search, and dashboard. No browser console errors were present.
- Production deployment `18e6166` reached **Ready** and **Current**.
- Visible production QA passed for:
  - `/members/F000483`
  - `/dashboard`
  - canonical roster/search data
  - Pro tools active
  - Daily Brief user-facing naming
- A single post-deploy timing sample returned HTTP 200 for member, search, and dashboard. It confirmed availability, not a stable performance benchmark; upstream government/database variability remains the dominant source of response-time variation.

## Current State
- `main` is synchronized with `origin/main` at `18e6166` before this EOD commit.
- Production is running the verified cleanup, evidence-first accountability view, canonical 537-member roster, Sentry feedback implementation, and App Store screenshot assets.
- The cleaned production web release is ready for the next TestFlight testing session through the existing native shell, which loads the production app dynamically.
- Production database reads are enabled and verified against the full official roster.
- The current test account shows Pro on both browser and phone after the second sandbox purchase and a successful Restore Purchases flow; Pro features are unlocked.
- The original force-close/relaunch persistence attempt failed. Do not describe the lifecycle as fully verified until the planned downgrade/expiration paths and protected ledger checks are completed.
- The protected transaction ID, original transaction ID, and App Account Token values must never be copied into chat or git. Confirm only their presence/association in the protected system.
- Tester feedback now belongs in private Sentry Issues/User Feedback plus Apple's TestFlight feedback surface. Sentry protected setup and a native rebuild remain pending.
- Native-only Sentry crash monitoring is the part that still requires a future uploaded build; it does not block testing today's cleaned web release in the current TestFlight shell.
- App Store listing screenshots and completed review fields are saved. Nothing has been submitted to App Review.
- External TestFlight testers and tester feedback review are still pending.
- Daily Brief remains user-facing. Weekly Brief remains internal compatibility naming only.

## Tomorrow Pickup Tasks
1. Confirm the repository and release state:
   - Read this file completely.
   - Run `git status --short --branch` and confirm `main` is clean and synchronized with `origin/main`.
   - Confirm the production deployment is still healthy before changing subscription state.
2. Establish a protected Pro baseline before any new transaction:
   - Force-close and relaunch the physical TestFlight app.
   - Confirm Pro on the phone, production browser, Upgrade, Settings/Profile, and at least one Pro-gated feature.
   - Confirm the protected server ledger shows an active App Store entitlement, validated server-side, associated with the correct account token, without exposing any identifier values.
   - Run Restore Purchases once only if baseline state is inconsistent; do not repurchase reflexively.
3. Test **Pro -> Free** deliberately:
   - Use the supported App Store subscription-management/cancellation path.
   - Record whether Free becomes effective immediately or only after the sandbox billing period expires.
   - After the effective transition, confirm Free on phone, browser, Upgrade, Settings/Profile, protected server ledger, and feature gates.
   - Force-close/relaunch and confirm Free persists.
   - Run Restore Purchases after expiry/cancellation is effective and confirm it does not incorrectly resurrect an inactive Pro entitlement.
4. Test **Team -> Pro** deliberately:
   - Start with a supported Team Monthly product and verify owner/seat access before changing plans.
   - Move to Pro through the supported Apple path; confirm Team access is removed at the correct effective time and Pro access is active.
   - Verify phone, browser, server validation, account-token association, restore behavior, force-close/relaunch persistence, and absence of duplicate active entitlements.
5. Test **Team -> Free** deliberately:
   - Re-establish a supported Team Monthly baseline only after the Team -> Pro result is recorded.
   - Cancel/expire Team through the supported Apple path and confirm owner/team access, reserved seats, and paid feature gates return to the correct Free state.
   - Verify phone, browser, protected server ledger, Restore Purchases, and force-close/relaunch persistence.
   - Do not clear sandbox purchase history, delete the sandbox tester, change annual Team 17-20 products, or perform another destructive sandbox action without Tyler's immediate approval.
6. Record the transition matrix without secrets:
   - For each path, record starting plan, requested action, Apple status, effective time, resulting app plan, server-validation result, restore result, relaunch result, and feature-gate result.
   - Never record tester credentials or transaction/account-token identifier values.
7. Continue TestFlight tester preparation:
   - Confirm internal/external tester groups and the intended build.
   - Invite only the approved tester list.
   - Review Apple's TestFlight feedback in App Store Connect and private in-app feedback in Sentry after protected setup is complete.
8. Finish protected feedback setup only with action-time approval:
   - Configure the Sentry project/DSNs and source-map token outside git.
   - Apply/verify any required production migration.
   - Build/upload a new native TestFlight build containing native Sentry crash monitoring.
   - Run strict feedback readiness and submit one non-sensitive test report; verify it arrives privately.
9. Continue App Store review preparation without submitting:
   - Reconfirm screenshots, build selection, copyright, review contact/demo credentials, notes, subscription group, and required subscription products.
   - Keep credentials outside chat and git.
   - Ask Tyler immediately before final Submit for Review.
10. After subscription, tester-feedback, and review-readiness work, return to the remaining prioritized product-improvement list from the July 17 research.

## Tomorrow Start Sequence
1. Read this file completely and use it as the source of truth.
2. Confirm `main` is clean and synchronized with `origin/main`.
3. Open the production app and the physical TestFlight build; verify the current Pro baseline without making another purchase.
4. Verify the protected ledger/server/account-token association without exposing identifiers.
5. Run the downgrade matrix in this order: **Pro -> Free**, **Team -> Pro**, **Team -> Free**.
6. After each transition, verify browser, phone, feature gates, force-close/relaunch, server validation, and Restore Purchases.
7. Continue TestFlight tester/feedback and App Store review preparation without submitting.

## Resume Prompt For New Thread
```text
Read `docs/eod-handoff-2026-07-18.md` completely and use it as the source of truth for Sunday, July 19, 2026.

Repo: `/Users/tylergates/Documents/Capitol Ledger`
Branch: `main`
Production: `https://project-qosv1.vercel.app`
Verified release commit before the July 18 EOD: `18e6166` (`Streamline member and dashboard data paths`)

Start by confirming the repository is clean and synchronized and that production is healthy. Production database reads are enabled and the protected ledger contains the audited official roster: 537 current members, 437 House and 100 Senate, with no extra active records or critical integrity failures.

The current sandbox test account shows Pro on both the phone and production browser after an accidental second Pro Monthly purchase. Restore Purchases succeeded and Pro features are unlocked. The first force-close/relaunch persistence check had failed, so begin by establishing a fresh Pro baseline without repurchasing and verify the protected App Store ledger, server validation, and account-token association without exposing identifier values.

Then test the downgrade matrix in order: Pro to Free, Team to Pro, and Team to Free. For every transition verify effective timing, browser and phone plan state, feature gates, protected server state, force-close/relaunch persistence, Restore Purchases, and absence of duplicate active entitlements. Do not clear sandbox purchase history, delete the tester, or make destructive sandbox changes without Tyler's approval.

The custom feedback queue was replaced with Sentry and the implementation is deployed, but protected Sentry setup and a new native/TestFlight build remain. External TestFlight testers and real tester feedback review are also pending.

The iPhone and iPad App Store screenshots, copyright, and completed review fields were saved. Nothing was submitted to App Review. Continue review preparation without submitting and ask Tyler immediately before final Submit for Review.

Do not expose or commit Apple credentials, transaction identifiers, tester email, or tester password. Ask before major architecture, dependency, schema, destructive, secret-related, annual Team 17-20 product, or final submission changes. Preserve Daily Brief user-facing naming and internal Weekly Brief compatibility naming. Keep the in-app browser visible during browser QA.
```
