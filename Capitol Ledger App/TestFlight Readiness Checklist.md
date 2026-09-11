# TestFlight Readiness Checklist

Status: historical implementation reference from July 18, 2026; current ordering and release state were reconciled September 10, 2026.

> Public/external release-candidate status is tracked in `docs/public-testflight-release-candidate-checklist.md`; the current schedule and carryovers are in `docs/project-timeline.md` and `docs/eod-handoff-2026-09-10.md`. This file remains an implementation reference and does not authorize build upload, tester distribution, TestFlight Beta App Review, or App Review.

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
3. Verify Pro monthly uses product ID `com.capitolwonk.pro.monthly` at $4.99 with the 7-day free trial introductory offer that renews at $4.99/month unless canceled before renewal.
4. Verify Pro annual uses product ID `com.capitolwonk.pro.annual` at $39.99/year.
5. Keep Team monthly product ID `com.capitolwonk.team.monthly` at $17.99 for three seats and Team annual `com.capitolwonk.team.annual` at $179.99 for three seats.
6. July 17, 2026 audit complete: monthly 4-20 and annual 4-16 use `com.capitolwonk.team.{seatCount}.{cycle}`, are U.S.-only, and match the exact matrix; annual 17-20 are reserved and unavailable.
7. English (U.S.) display names, subscription descriptions, and prices are set for the 30 additional launch-active Team products. Still reorder the subscription levels and complete any required App Review screenshots/notes before adding the products for review.
8. July 17, 2026: generated the `CapitolWonk Server API` In-App Purchase key. Keep its one-time `.p8` download outside git and configure it only through deployment secrets.
9. Add host environment variables through the deployment provider, never git:
   - `APP_STORE_BUNDLE_ID`
   - `APP_STORE_ACCOUNT_TOKEN_NAMESPACE`
   - `APP_STORE_CONNECT_ISSUER_ID`
   - `APP_STORE_CONNECT_KEY_ID`
   - `APP_STORE_CONNECT_PRIVATE_KEY`
10. After separate deployment approval, deploy and verify support/privacy URLs:
   - `https://project-qosv1.vercel.app/support`
   - `https://project-qosv1.vercel.app/privacy`
11. Keep Stripe checkout variables out of the App Store launch environment unless a separate web checkout path is deliberately reintroduced.

## Purchase QA Gate

1. Run StoreKit local purchase smoke from Xcode if useful.
2. Run sandbox/TestFlight purchase QA for monthly and annual Pro plus representative Team tiers: 3, 4, 10, and 20 seats.
3. Verify purchase unlocks the selected paid plan on device.
4. Verify Pro monthly shows the 7-day free trial terms and the post-trial $4.99/month renewal before confirmation.
5. Verify signed transaction sync updates the signed-in account.
6. Verify restore purchases works after reinstall/sign-out/sign-in.
7. Verify cancellation/expiration removes paid access after Apple reports inactive entitlement.
8. Verify an Apple original transaction cannot be linked to a second account.
9. Verify Team purchases charge the selected tier total, open exactly the selected supported teammate seats, and do not consume a seat for the owner.
10. Verify monthly allows 3-20, annual allows 3-16, annual 17-20 routes to custom planning, and all 21+ counts use the custom-plan path.

## Final Text Tone Pass

Do this after the native purchase path is stable and before TestFlight screenshots/review notes.

Review launch-facing copy for clarity, trust, and App Store reviewer comprehension:

1. `/sign-in`: account creation, verification, reset, and errors.
2. `/account`: profile, saved ledger, privacy, plan status, and sign-out.
3. `/settings`: account sync, notification preferences, plan/purchases, feedback entry, and the confirmed immediate account-deletion action.
4. `/privacy` and `/support`: App Store support/privacy copy, direct deletion routing, privacy requests, purchase help, and review clarity.
5. `/upgrade`: Apple purchase, 7-day Pro trial disclosure, restore purchases, monthly 3-20 and annual 3-16 Team selection/totals, custom-plan paths, Free/Pro language.
6. `/feedback`: secure Sentry issue reporting, optional contact details, and successful/error states.
7. `/alerts`: action-needed labels, unread/read states, priority gating language.
8. `/brief`: in-app Daily Brief wording and locked/pro states.
9. `/search`, bill detail, and member detail: empty states, source placeholders, and screenshot-visible labels.
10. Empty states and error states across auth, purchase sync, feedback, alerts, and account persistence.

## Verification Plan

Account deletion is a separately controlled destructive gate. Before inviting reviewers or external testers:

1. Deploy the deletion-integrity, cleanup-outbox, and Team-pause workspace-integrity migrations before the matching source. Verify every expected live table/index/foreign key, including cleanup-job dedupe/status indexes and the nullable `TeamSubscriptionPause.workspaceId` cascade. Prove migration `20260910152000_team_subscription_pause_workspace_integrity` converts only the known empty/owner-upgrade sentinels and aborts on an unexpected orphan.
2. Configure a protected `ACCOUNT_DELETION_CLEANUP_SECRET` (or the documented task-secret fallback), deploy the authenticated cleanup route, schedule it, and add no-payload monitoring/alerts for pending age, attempts, task failures, and stale `processing` jobs.
3. Use only a disposable production-shaped account populated across account, civic-action, official-message, legacy feedback, Team, Brief, auth, and subscription stores.
4. From Settings > Your data > Delete account, acknowledge that App Store billing is separate, type `DELETE`, and choose Permanently delete account.
5. Verify immediate database completion; zero account-linked rows/raw-store matches; a minimal `resolved` audit with `userId` removed; cleanup jobs retained only while pending/retrying and erased after success; exact-ID/no-memory persistence; hashed rate-limit-subject clearing; every-session invalidation; and current-device clearing plus the multi-tab/browser/native-writer fence. Confirm a verified success receipt shows completion while an ambiguous result is explicitly unconfirmed.
6. For a Team owner, verify the deletion transaction captures each affected member before workspace deletion and causes no precommit member/provider mutation. In real Postgres plus Stripe test mode, race a Team-seat pause against deletion, prove account/workspace locking serializes the operations, and prove a failed pause transaction attempts provider compensation. Confirm the worker restores or safely marks each member once and unrelated data survives.
7. Force a database-transaction failure in a controlled non-production environment and confirm rollback leaves the owner account unchanged and retryable, commits no cleanup job, and causes no Team-member or provider mutation.
8. Separately force a post-commit provider failure. Confirm the account stays deleted, the job returns to `pending`, the authenticated task retries idempotently, stale `processing` work can be reclaimed, and success erases the job. For legacy Stripe, prove a missing resource completes cleanup, a terminal member-resume result becomes checkout-required, and a transient error remains retryable.
9. Replay signed Stripe webhooks inside/outside the five-minute timestamp tolerance. Verify live-state reconciliation and stale-subscription rejection; verify that, before acknowledging a late event for a deleted user, cleanup schedules an active subscription not to renew and detaches metadata where Stripe permits without recreating/email-remapping a user; and verify terminal/missing cases complete.
10. Confirm account deletion does not cancel App Store billing. Define removal procedures for separately submitted Sentry feedback containing identifying details and for records independently retained by Apple, Stripe, email providers, or message recipients.
11. Approve backup/PITR tombstone handling so a restore cannot silently resurrect a deleted account, then repeat the receipt, ambiguous-result and multi-tab/device-writer flow on the exact physical-device TestFlight candidate.

The reviewed branch implementation and fixture coverage do not satisfy these production gates. No production migration/deployment, task configuration/monitoring, live destructive QA, or provider-cleanup QA is evidenced as of September 10, 2026. Follow [`docs/account-deletion-runbook-2026-09-10.md`](../docs/account-deletion-runbook-2026-09-10.md).

Run these before treating the build as TestFlight-ready:

```bash
pnpm testflight:check
pnpm account-deletion:check
pnpm feedback:check
pnpm launch-copy:check
pnpm ios-native:check
pnpm billing:check
pnpm billing-transition:check
pnpm backend:check
pnpm lint
pnpm exec tsc --noEmit --pretty false
```

After App Store Connect products and server variables are configured, run:

```bash
TESTFLIGHT_REQUIRE_READY=true pnpm testflight:check
BILLING_REQUIRE_APP_STORE=true pnpm billing:check
SENTRY_REQUIRE_PRODUCTION=true pnpm feedback:check
```

## Next Best Step

While the T04 signing freeze remains, follow the September 11 task in the current EOD/timeline: first inspect the reviewed non-production branch checkpoint's GitHub CI and Vercel Preview evidence, then inspect production migration history read-only and prepare—but do not execute—the ordered migration, cleanup-task, monitoring, disposable-account, Stripe, and physical-device QA plan. If `20260718154000_account_deletion_requests` is absent, it precedes the three new September 10 migrations. Tyler's final September 10 branch push does not authorize Apple-record changes, protected production configuration, production deployment, a destructive or signed/sandbox/TestFlight purchase attempt, upload, or tester distribution; each remains a separate action-time gate. When Apple Developer Support replies, inspect the response read-only and use it to choose the next narrowly scoped signing action.
