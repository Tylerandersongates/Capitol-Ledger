# Beta Testing Readiness Guide

## Goal

Use TestFlight and the in-app report form to collect useful feedback, fix the highest-impact issues, and reduce App Store launch risk.

Current status: TestFlight preparation is active as of July 18, 2026. App Store submission is not authorized by this guide.

## Feedback Systems

- TestFlight feedback submitted through Apple is reviewed in App Store Connect under the app's TestFlight feedback area.
- Reports submitted through `/feedback` are sent to the private Sentry project configured for CapitolWonk CE.
- Browser, server, and native iOS errors are also sent to Sentry when their protected DSN values are configured.
- Sentry session replay and default PII collection are disabled.
- Account deletion uses the dedicated `AccountDeletionRequest` workflow and never enters the feedback system.
- The retired `BetaFeedback` table is retained temporarily as a read-only archive until its production records are exported and verified.

## Recommended Order

1. Apply the production migration that creates `AccountDeletionRequest` and verify account-deletion readiness.
2. Create the private Sentry organization/project and configure protected deployment and Xcode values without committing secrets.
3. Run the feedback, account-deletion, TestFlight, billing, lint, type, web-build, and native-build checks.
4. Deploy the verified web change and upload a new native TestFlight build only after action-time approval.
5. Verify a test `/feedback` report arrives in Sentry and contains no unintended personal data.
6. Verify a deliberate browser error, server error, and native test crash arrive in the correct project before inviting testers.
7. Invite a small TestFlight tester group and direct testers to Apple's TestFlight feedback control or `/feedback`.
8. Triage Sentry issues and Apple TestFlight feedback after each round as blocker, current-beta fix, or later.
9. Keep the App Store review submission separate and obtain Tyler's approval immediately before **Submit for Review**.

## Required Protected Configuration

Set these in the deployment provider, never in git:

```text
NEXT_PUBLIC_SENTRY_DSN
SENTRY_DSN
SENTRY_ORG
SENTRY_PROJECT
SENTRY_AUTH_TOKEN
```

Set this as a protected Xcode or CI build value, never in the checked-in Info.plist:

```text
CAPITOL_LEDGER_SENTRY_DSN
```

`NEXT_PUBLIC_SENTRY_DSN` is a client DSN rather than an account password or auth token, but it should still be managed through the deployment configuration so environments can be separated. `SENTRY_AUTH_TOKEN` is secret and must never appear in logs, screenshots, app code, or commits.

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

Do not ask testers to include passwords, Apple credentials, transaction identifiers, or other secrets in reports or screenshots.

## Triage Before Each Fix Pass

Use Sentry's Issues and User Feedback views for in-app reports and technical errors. Use App Store Connect's TestFlight feedback view for Apple-submitted screenshots, comments, and crash details. For each item:

- confirm it is reproducible or supported by diagnostics;
- classify it as launch blocker, current-beta fix, or later;
- link duplicates instead of maintaining a second in-app review queue;
- avoid copying tester identity or diagnostic identifiers into public tickets;
- verify the fix in the same environment and close it only after retesting.

## Readiness Checklist

- Sentry project access is restricted to approved maintainers.
- Protected Sentry values are configured in Vercel and Xcode/CI.
- `/feedback` successfully creates a Sentry feedback item.
- Browser/server errors and native crashes reach Sentry with replay and default PII disabled.
- Apple's TestFlight feedback area is visible and monitored for the active build.
- Account deletion persists to `AccountDeletionRequest` and completes independently of Sentry.
- Legacy feedback records are preserved until a private export is verified; no tester data is exposed in source control.
- Production auth QA passes.
- Subscription purchase, relaunch persistence, restore, account-token association, and server validation are verified.
- Dashboard, search, bill details, profile, alerts, account, upgrade, and sign-in have been tested at iPhone and iPad sizes.
- Known issues are sorted into launch-blocking, beta-acceptable, and later.
- Tyler has not yet authorized **Submit for Review** unless that approval is recorded immediately before submission.
