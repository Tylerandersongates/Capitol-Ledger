# TestFlight Readiness Checklist

Status: historical implementation reference from July 18, 2026; current ordering and release state were reconciled September 11, 2026.

> Public/external release-candidate status is tracked in `docs/public-testflight-release-candidate-checklist.md`; the current schedule and carryovers are in `docs/project-timeline.md` and `docs/eod-handoff-2026-09-10.md`; backup/PITR and provider procedures are tracked in `docs/backup-pitr-provider-retention-evidence-2026-09-11.md`. This file remains an implementation reference and does not authorize build upload, tester distribution, TestFlight Beta App Review, or App Review.

> Current candidate boundary: the September 11 working tree is uncommitted and unfrozen. It adds the fourth pending migration `20260911110000_app_store_server_state`, Apple/Team lifecycle handling, and default-off deletion/retention gates. The `f4f04de` dependency audit and `a6cb1da` CI/Preview/smoke are historical and stale for this candidate. The pnpm 9 lock now forces Next's PostCSS to `8.5.25`; current production/full working-tree audits both report **no known vulnerabilities**, and CI plus `release-candidate:check` now run both audits. A frozen-install re-audit remains required. Production transitive `jsrsasign@11.1.5`, used by Apple's official server library for X.509/OCSP, has no current advisory but is deprecated/unmaintained and requires upstream monitoring/upgrade plus Tyler's explicit risk acceptance before launch. See the [September 11 dependency note](../docs/dependency-security-audit-2026-09-11.md). No gate or candidate is approved, deployed, configured, activated, sandbox verified, or device verified.

## Direction

Everything going forward should reduce risk on the path to TestFlight and App Store review. Defer broad product expansion unless it fixes a launch blocker, account/payment risk, review risk, or final user-facing text issue.

Post-TestFlight sequence: start the standalone Supreme Court sister-app track first; keep state legislation as a future main-app expansion, likely for an early-next-year update.

## Local Native Build Gate

1. Keep the native iOS shell under `ios/CapitolLedgerNative`.
2. Keep the native purchase bridge name aligned with the web paywall: `capitolLedgerPurchase`.
3. Keep Pro and Team product IDs aligned across web, native, server validation, and App Store Connect:
   - `com.capitolwonk.pro.monthly`
   - `com.capitolwonk.pro.annual`
   - `com.capitolwonk.team.monthly`
   - `com.capitolwonk.team.annual`
   - `com.capitolwonk.team.{seatCount}.{cycle}` for monthly 4-20 and annual 4-16 seats
4. Keep Civic Team purchasable through Apple for 3-20 monthly seats and 3-16 annual seats; annual 17-20 and all 21+ teams use the custom-plan workflow.
5. Run the native build before upload prep:

```bash
xcodebuild -project ios/CapitolLedgerNative/CapitolLedgerNative.xcodeproj -scheme CapitolLedgerNative -sdk iphonesimulator -configuration Debug -derivedDataPath /private/tmp/capitol-ledger-native-derived CODE_SIGNING_ALLOWED=NO build
```

## App Store Connect Setup

Use the App Store Connect setup packet as the entry packet for App Store Connect fields, subscription notes, privacy/support URLs, screenshot candidates, and reviewer notes. The current release evidence records an existing app record and 38 existing subscription products. Do not create duplicates or change the final `com.capitolwonk.ce` identity while the T04 signing freeze remains.

1. Verify the existing app record uses the final app name, bundle ID `com.capitolwonk.ce`, SKU, and documented product IDs; do not change them without a separately approved identity migration.
2. Verify the existing subscription group contains Pro and Team.
3. Verify Pro monthly uses product ID `com.capitolwonk.pro.monthly` at $4.99/month with a 7-day introductory offer for eligible new subscribers. Capture a redacted App Store Connect screenshot showing the product, exact offer duration, standard renewal price, territory/currency, and configuration status; this proves configuration, not subscriber eligibility.
4. Verify Pro annual uses product ID `com.capitolwonk.pro.annual` at $39.99/year.
5. Keep Team monthly product ID `com.capitolwonk.team.monthly` at $17.99 for three seats and Team annual `com.capitolwonk.team.annual` at $179.99 for three seats.
6. July 17, 2026 audit complete: monthly 4-20 and annual 4-16 use `com.capitolwonk.team.{seatCount}.{cycle}`, are U.S.-only, and match the exact matrix; annual 17-20 are reserved and unavailable.
7. English (U.S.) display names, subscription descriptions, and prices are set for the 30 additional launch-active Team products. Still reorder the subscription levels and complete any required App Review screenshots/notes before adding the products for review.
8. July 17, 2026: generated the `CapitolWonk Server API` In-App Purchase key. Keep its one-time `.p8` download outside git and configure it only through deployment secrets.
9. Add host environment variables through the deployment provider, never git:
   - `APP_STORE_BUNDLE_ID`
   - `APP_STORE_APP_APPLE_ID` (numeric app ID, not an in-app product ID)
   - `APP_STORE_ACCOUNT_TOKEN_NAMESPACE`
   - `APP_STORE_CONNECT_ISSUER_ID`
   - `APP_STORE_CONNECT_KEY_ID`
   - `APP_STORE_CONNECT_PRIVATE_KEY`
10. After separate deployment approval, deploy and verify support/privacy URLs:
   - `https://project-qosv1.vercel.app/support`
   - `https://project-qosv1.vercel.app/privacy`
11. Keep Stripe checkout variables out of the App Store launch environment unless a separate web checkout path is deliberately reintroduced.
12. Keep `ACCOUNT_DELETION_ENABLED`, `CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED`, and `CAPITOLWONK_LEGACY_FEEDBACK_RETENTION_ENABLED` at their exact default-off values until their independent production evidence and activation approvals pass.

## Purchase QA Gate

Use the [September 11 App Store sandbox QA matrix](../docs/app-store-sandbox-qa-matrix-2026-09-11.md) as the detailed execution and evidence record. The abbreviated list below is not a substitute for its purchase, lifecycle, notification-ordering, Team, deletion, and privacy cases.

1. Run StoreKit local purchase smoke from Xcode if useful.
2. Run sandbox/TestFlight purchase QA for monthly and annual Pro plus representative Team tiers: 3, 4, 10, and 20 seats.
3. Verify purchase unlocks the selected paid plan on device.
4. With an eligible new subscriber, verify Apple's confirmation shows exactly 7 days free followed by $4.99/month and the cancellation/renewal terms before purchase.
5. With an ineligible or previously subscribed tester, verify the app makes no trial promise and Apple's confirmation shows the standard $4.99/month terms.
6. Verify cancel-before-conversion, conversion to paid monthly renewal, and expiry without conversion all reconcile through Notifications V2 and current Apple server state rather than stale device or event state.
7. Verify signed transaction sync updates the signed-in account.
8. Verify restore purchases works after reinstall/sign-out/sign-in.
9. Verify cancellation/expiration removes paid access after Apple reports inactive entitlement.
10. Verify an Apple original transaction cannot be linked to a second account.
11. Verify Team purchases charge the selected tier total, open exactly the selected supported teammate seats, and do not consume a seat for the owner.
12. Verify monthly allows 3-20, annual allows 3-16, annual 17-20 routes to custom planning, and all 21+ counts use the custom-plan path.

## Final Text Tone Pass

Do this after the native purchase path is stable and before TestFlight screenshots/review notes.

Review launch-facing copy for clarity, trust, and App Store reviewer comprehension:

1. `/sign-in`: account creation, verification, reset, and errors.
2. `/account`: profile, saved ledger, privacy, plan status, and sign-out.
3. `/settings`: account sync, notification preferences, plan/purchases, feedback entry, and the confirmed immediate account-deletion action.
4. `/privacy` and `/support`: App Store support/privacy copy, direct deletion routing, privacy requests, purchase help, and review clarity.
5. `/upgrade`: Apple purchase, conditional introductory-offer wording, Apple eligibility/exact-terms confirmation, restore purchases, monthly 3-20 and annual 3-16 Team selection/totals, custom-plan paths, Free/Pro language.
6. `/feedback`: secure Sentry issue reporting, optional contact details, and successful/error states.
7. `/alerts`: action-needed labels, unread/read states, priority gating language.
8. `/brief`: in-app Daily Brief wording and locked/pro states.
9. `/search`, bill detail, and member detail: empty states, source placeholders, and screenshot-visible labels.
10. Empty states and error states across auth, purchase sync, feedback, alerts, and account persistence.

## Verification Plan

Account deletion is a separately controlled destructive gate. Before inviting reviewers or external testers:

1. Follow the [September 13 promotion packet](../docs/production-five-migration-promotion-packet-2026-09-13.md). Only after its restore, runner, lock/window, recovery, and fresh-preflight gates pass may a separately approved Batch A deploy the exact five-item order—deletion integrity, cleanup outbox, Team-pause workspace integrity, `20260911110000_app_store_server_state`, then `20260912120000_privacy_request_intake`. Verify every expected live table/index/foreign key/check constraint, including cleanup-job indexes, nullable `TeamSubscriptionPause.workspaceId`, App Store token/lineage ownership, notification UUID/hash/status constraints, receipt deidentification, and privacy-request type/status/resolution/deduplication rules. Prove the Team-pause migration converts only the known empty/owner-upgrade sentinels and aborts on an unexpected orphan.
2. Configure a protected `ACCOUNT_DELETION_CLEANUP_SECRET` (or the documented task-secret fallback), deploy the authenticated cleanup route, schedule it, and add no-payload monitoring/alerts for pending age, attempts, task failures, and stale `processing` jobs.
3. Use only a disposable production-shaped account populated across account, civic-action, official-message, legacy feedback, Team, Brief, auth, and subscription stores.
4. From Settings > Your data > Delete account, acknowledge that App Store billing is separate, type `DELETE`, and choose Permanently delete account.
5. Verify immediate database completion; zero account-linked rows/raw-store matches; a minimal `resolved` audit with `userId` removed; cleanup jobs retained only while pending/retrying and erased after success; exact-ID/no-memory persistence; hashed rate-limit-subject clearing; every-session invalidation; and current-device clearing plus the multi-tab/browser/native-writer fence. Confirm a verified success receipt shows completion while an ambiguous result is explicitly unconfirmed.
6. For a Team owner, verify the deletion transaction captures each affected member before workspace deletion and causes no precommit member/provider mutation. In real Postgres plus Stripe test mode, race a Team-seat pause against deletion, prove account/workspace locking serializes the operations, and prove a failed pause transaction attempts provider compensation. Confirm the worker restores or safely marks each member once and unrelated data survives.
7. Force a database-transaction failure in a controlled non-production environment and confirm rollback leaves the owner account unchanged and retryable, commits no cleanup job, and causes no Team-member or provider mutation.
8. Separately force a post-commit provider failure. Confirm the account stays deleted, the job returns to `pending`, the authenticated task retries idempotently, stale `processing` work can be reclaimed, and success erases the job. For legacy Stripe, prove a missing resource completes cleanup, a terminal member-resume result becomes checkout-required, and a transient error remains retryable.
9. Replay signed Stripe webhooks inside/outside the five-minute timestamp tolerance. Verify live-state reconciliation and stale-subscription rejection; verify that, before acknowledging a late event for a deleted user, cleanup schedules an active subscription not to renew and detaches metadata where Stripe permits without recreating/email-remapping a user; and verify terminal/missing cases complete.
10. Confirm account deletion does not cancel App Store billing. Resolve the Sentry User Feedback one-report-deletion limitation and define truthful expiry/removal procedures for records independently retained by Apple, Stripe, email providers, or message recipients.
11. Close the [September 11 backup/PITR and provider-retention checklist](../docs/backup-pitr-provider-retention-evidence-2026-09-11.md), including an approved restore design/drill and sensitive query/token logging proof, then repeat the receipt, ambiguous-result and multi-tab/device-writer flow on the exact physical-device TestFlight candidate.
12. Keep the implemented deletion and retention switches default-off through deployment verification. Activate deletion only after its live worker/monitor/provider/device gates and a separate action-time approval. Activate the retention sweep only after its row-type policy, bounded-delete behavior, monitoring, restore reconciliation, and separate approval pass; legacy feedback requires its additional export/removal approval and switch.

The uncommitted working implementation and fixture coverage do not satisfy these production gates or Apple/Team sandbox proof. No production migration/deployment, task configuration/monitoring, live destructive QA, provider-cleanup QA, gate activation, or signed-device sandbox result is evidenced as of September 11, 2026. Follow [`docs/account-deletion-runbook-2026-09-10.md`](../docs/account-deletion-runbook-2026-09-10.md) and the [sandbox QA matrix](../docs/app-store-sandbox-qa-matrix-2026-09-11.md).

Run these before treating the build as TestFlight-ready:

```bash
pnpm testflight:check
pnpm account-deletion:check
pnpm feedback:check
pnpm launch-copy:check
pnpm ios-native:check
pnpm billing:check
pnpm billing-transition:check
pnpm testflight-ui:check
pnpm release-source:check
pnpm backend:check
pnpm lint
pnpm exec tsc --noEmit --pretty false
```

`release-source:check` is the secret-free CI/source safeguard. It is not protected-environment or release-candidate evidence. After App Store Connect products and protected server variables are configured, run the strict candidate gate and the focused strict checks without printing their values:

```bash
pnpm release-candidate:check
TESTFLIGHT_REQUIRE_READY=true pnpm testflight:check
BILLING_REQUIRE_APP_STORE=true pnpm billing:check
SENTRY_REQUIRE_PRODUCTION=true pnpm feedback:check
```

## Next Best Step

While the T04 signing freeze remains, freeze the September 11 working tree and repeat the currently clean production/full audits with a frozen install, strict checks, exact-head CI, matching Preview, and proportionate smoke; current working-tree results cannot approve release. Close the unmaintained `jsrsasign` monitoring/upgrade and owner-acceptance gate. Then use the [production privacy/deletion approval packet](../docs/production-privacy-deletion-approval-packet-2026-09-11.md), [backup/PITR and provider-retention checklist](../docs/backup-pitr-provider-retention-evidence-2026-09-11.md), and [App Store sandbox QA matrix](../docs/app-store-sandbox-qa-matrix-2026-09-11.md). The earlier production preflight found three September 10 migrations pending; the new App Store state migration makes the current expected set four, subject to a fresh read-only check. Default-off deletion/retention source gates are implemented but not approved, deployed, configured, or activated. Do not execute migrations, production deployment, protected task configuration, destructive/provider QA, signing/device work, App Store changes, upload, or tester distribution without the corresponding action-time approval. When Apple Developer Support replies, inspect it read-only and use it to choose the next narrowly scoped signing action.
