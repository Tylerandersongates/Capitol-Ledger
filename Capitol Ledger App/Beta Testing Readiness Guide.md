# Beta Testing Readiness Guide

## Goal

Use TestFlight and the in-app report form to collect useful feedback, fix the highest-impact issues, and reduce App Store launch risk.

Current status: TestFlight preparation is active as of July 18, 2026. App Store submission is not authorized by this guide.

## Feedback Systems

- TestFlight feedback submitted through Apple is reviewed in App Store Connect under the app's TestFlight feedback area.
- Reports submitted through `/feedback` are sent to the private Sentry project configured for CapitolWonk.
- Browser, server, and native iOS errors are also sent to Sentry when their protected DSN values are configured.
- Sentry session replay and default PII collection are disabled.
- Account deletion uses the dedicated in-app deletion workflow and never enters the feedback system. The action commits account erasure together with any required Team-member/legacy-Stripe cleanup jobs, then clears sessions/cookies and fences current-device CapitolWonk storage across tabs and native purchase publication. A deidentified completion audit remains; a cleanup job is retained only while pending/retrying and is erased after success. The completed page requires an explicit receipt from a verified success response; an ambiguous result is labeled unconfirmed.
- Sentry feedback submitted separately is not linked by CapitolWonk account ID by default. Account deletion therefore does not locate it. Current provider guidance says User Feedback cannot be individually deleted and may require whole-project deletion, so one-report removal is an unresolved release blocker; testers must not be promised that Support can remove a specific report until the intake or retention design is corrected and evidenced.
- The retired `BetaFeedback` table is retained temporarily as a read-only archive until its production records are exported and verified.

## Recommended Order

These are ordered gates, not standing authorization. Obtain Tyler's action-time approval before any production migration, provider/project creation, protected configuration, deployment, build upload, distribution, or destructive QA.

1. Follow the [September 13 five-migration promotion packet](../docs/production-five-migration-promotion-packet-2026-09-13.md) rather than this historical shorthand. The September 11 preflight proves `20260718154000_account_deletion_requests` is already applied; current Phase 1 evidence records `20260910150000`, `20260910151000`, `20260910152000`, `20260911110000`, and `20260912120000` pending in order. Batch A remains no-go until every packet prerequisite and fresh direct-production preflight passes. Verify live tables, indexes, foreign keys, and check constraints before any destructive QA.
2. After provider-configuration approval, create or verify the private Sentry organization/project and configure protected deployment and Xcode values without committing secrets.
3. After cleanup-task approval, configure its protected secret, authenticated schedule, and no-payload monitoring/retry alerts without committing or displaying the secret.
4. Run the feedback, account-deletion, TestFlight, billing, lint, type, web-build, and native-build checks.
5. Deploy the verified web change and upload a new native TestFlight build only after action-time approval.
6. Verify a test `/feedback` report arrives in Sentry and contains no unintended personal data.
7. Verify a deliberate browser error, server error, and native test crash arrive in the correct project before inviting testers.
8. With explicit assignment only, verify deletion first with a disposable production-shaped account, including post-commit Team-member/legacy-Stripe cleanup and retry, then on a physical-device TestFlight candidate. Do not use a reusable reviewer or tester account.
9. Close the internal September 11 backup/PITR and provider-retention evidence checklist, including the safe deletion-activation, Sentry-feedback and sensitive URL/log gates.
10. Invite a small TestFlight tester group and direct testers to Apple's TestFlight feedback control or `/feedback`.
11. Triage Sentry issues and Apple TestFlight feedback after each round as blocker, current-beta fix, or later.
12. Keep the App Store review submission separate and obtain Tyler's approval immediately before **Submit for Review**.

## Required Protected Configuration

Set these in the deployment provider, never in git:

```text
NEXT_PUBLIC_SENTRY_DSN
SENTRY_DSN
SENTRY_ORG
SENTRY_PROJECT
SENTRY_AUTH_TOKEN
ACCOUNT_DELETION_CLEANUP_SECRET
```

Set this as a protected Xcode or CI build value, never in the checked-in Info.plist:

```text
CAPITOL_LEDGER_SENTRY_DSN
```

`NEXT_PUBLIC_SENTRY_DSN` is a client DSN rather than an account password or auth token, but it should still be managed through the deployment configuration so environments can be separated. `SENTRY_AUTH_TOKEN` and `ACCOUNT_DELETION_CLEANUP_SECRET` are secrets and must never appear in logs, screenshots, app code, or commits.

Before a production deploy or TestFlight upload, run:

```bash
SENTRY_REQUIRE_PRODUCTION=true pnpm feedback:check
pnpm account-deletion:check
pnpm testflight:check
pnpm lint
pnpm exec tsc --noEmit --pretty false
```

## Tester Script

Ask testers to complete these tasks:

1. Create an account or sign in.
2. Set district and policy interests.
3. Open the dashboard and explain what the top cards mean.
4. Search for bills and officials.
5. Open a bill and review summary, sources, votes, and video links.
6. Open alerts and confirm unread behavior makes sense.
7. Check badges, impact, and the saved action ledger.
8. Open `/upgrade`, compare Free, Pro, and Team, and report anything unclear.
9. Force-close and relaunch after a sandbox purchase or restore, then verify entitlement persistence.
10. Submit one report through TestFlight and one through `/feedback` so both intake paths are verified.

Account deletion is not part of the general tester pass. For the separately assigned destructive scenario only, use a disposable account, open Settings > Your data > Delete account, review the Team and Apple-billing warnings, type `DELETE`, and choose Permanently delete account. A verified success should show completion, clear and fence the current device's CapitolWonk state, and sign out every session. An ambiguous response must show deletion not confirmed; stop and report it rather than assuming success or repeatedly submitting. App Store billing remains active until managed separately.

Do not ask testers to include passwords, Apple credentials, transaction identifiers, or other secrets in reports or screenshots.

## Triage Before Each Fix Pass

Use Sentry's Issues and User Feedback views for in-app reports and technical errors. Use App Store Connect's TestFlight feedback view for Apple-submitted screenshots, comments, and crash details. For each item:

- confirm it is reproducible or supported by diagnostics;
- classify it as launch blocker, current-beta fix, or later;
- link duplicates instead of maintaining a second in-app review queue;
- avoid copying tester identity or diagnostic identifiers into public tickets;
- verify the fix in the same environment and close it only after retesting.

## Readiness Checklist

These are release exit criteria. An unchecked item remains open unless its evidence is linked in the current handoff; local source or fixture coverage alone does not complete a production, provider, or physical-device gate.

- [ ] Sentry project access is restricted to approved maintainers.
- [ ] Protected Sentry values are configured in Vercel and Xcode/CI.
- [ ] `/feedback` successfully creates a Sentry feedback item.
- [ ] Browser/server errors and native crashes reach Sentry with replay and default PII disabled.
- [ ] Apple's TestFlight feedback area is visible and monitored for the active build.
- [ ] Account deletion immediately erases the disposable account and every linked table/raw store in the implemented inventory in one database transaction, commits any required cleanup jobs with that deletion, and retains a deidentified completed `AccountDeletionRequest` audit independently of Sentry.
- [ ] Exact-ID/read-only production persistence cannot recreate or email-remap a missing user, configured database failures do not fall back to process memory, and hashed/expiring rate-limit subjects are cleared for the deleted account.
- [ ] The deletion transaction causes no precommit Team-member/provider mutation. A forced deletion-transaction failure rolls back deletion and new jobs together, leaves the owner unchanged, and permits a controlled retry. Separately, a concurrent Team-seat pause serializes on account/workspace locks and attempts Stripe resume compensation if its own transaction fails.
- [ ] Signed Stripe webhooks enforce timestamp tolerance, reconcile current provider state, reject stale subscription IDs, and, before acknowledging a deleted-user event, schedule an active subscription not to renew and detach metadata where Stripe permits. Missing/terminal cleanup outcomes complete; transient failures remain retryable.
- [ ] The authenticated post-commit task is scheduled and age-monitored; completed jobs are erased, and jobs are retained only while pending/retrying.
- [ ] All auth sessions and response cookies are invalid after success; all `capitol-ledger:` local/session storage is gone on the current device; an explicit receipt distinguishes verified completion from an ambiguous unconfirmed result; and the multi-tab fence prevents browser and native StoreKit writers from recreating state.
- [ ] Migration `20260910152000_team_subscription_pause_workspace_integrity` converts only the known empty/owner-upgrade sentinels to `NULL`, aborts on an unexpected orphan, and enforces the nullable real-workspace cascade.
- [ ] Production migration/live schema and FK checks, cleanup-task secret/schedule/age-monitoring/retry checks, disposable-account verification, real-Postgres concurrency, Stripe webhook/cleanup/compensation, physical-device multi-tab/native-writer QA, backup/PITR tombstone policy, and external-provider retention/removal procedures are complete.
- [ ] App Store billing is confirmed unaffected by account deletion. The Sentry User Feedback limitation is resolved through an approved intake/expiry design and public/tester copy does not promise unsupported one-report deletion.
- [ ] Legacy feedback records are preserved until a private export is verified; no tester data is exposed in source control.
- [ ] Production auth QA passes.
- [ ] Subscription purchase, relaunch persistence, restore, account-token association, and server validation are verified.
- [ ] Dashboard, search, bill details, profile, alerts, account, upgrade, and sign-in have been tested at iPhone and iPad sizes.
- [ ] Known issues are sorted into launch-blocking, beta-acceptable, and later.
- [ ] Tyler authorizes **Submit for Review** immediately before submission.
