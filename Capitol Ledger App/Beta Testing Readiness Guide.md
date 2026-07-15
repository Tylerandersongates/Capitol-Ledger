# Beta Testing Readiness Guide

## Goal

Get CapitolWonk CE into the hands of trusted testers before App Store sale or public launch, collect useful feedback, fix the highest-impact issues, then package the Apple/TestFlight version with much less risk.

Current status: first trusted tester intake is planned for June 6, 2026.

## Recommended Order

For the detailed execution checklist, use `Phase 1 Web Beta Launch Checklist.md`.

1. Web beta first: deploy the current Next.js app to Vercel with Neon connected.
2. Apply production migrations, including `BetaFeedback`.
3. Set the deployed beta URL and reviewer email environment values.
4. Run `BETA_REQUIRE_PRODUCTION=true pnpm beta:check`.
5. Confirm `/feedback` saves records to Neon.
6. Review tester reports at `/feedback/review` and move them through New, Reviewing, Planned, and Resolved.
7. Mark active reports as Launch blocker, Beta OK, or Later.
8. Invite a small tester group and send them to `/beta`.
9. Review feedback after each round and tag each item as bug, flow issue, missing feature, data issue, design polish, or later.
10. Copy or export the review queue before each fix pass.
11. Move to Apple/TestFlight once sign-in, account state, subscriptions, feedback, and core civic data flows are stable.
12. Start Android packaging after the Apple/core flow is solid.

## Triage Before Each Fix Pass

Use `/feedback/review` to filter by:

- `Blockers`: reports that should be fixed before another tester round or store testing.
- `Untriaged`: active reports that still need a launch decision.
- `Beta OK`: issues that can remain during the current beta round.
- `Later`: useful ideas or polish items that should not block beta progress.

Run this after tester sessions to get a database-backed triage snapshot:

```bash
pnpm beta:triage
```

To make the command fail when blockers or untriaged reports remain:

```bash
BETA_TRIAGE_FAIL_ON_BLOCKERS=true BETA_TRIAGE_FAIL_ON_UNTRIAGED=true pnpm beta:triage
```

## Required Beta Environment

Before inviting testers, set these in Vercel and in any local environment used to run a production beta check:

```bash
NEXT_PUBLIC_APP_URL=https://your-vercel-beta-url
BETA_REVIEWER_EMAILS=you@example.com
```

Use a comma-separated list for multiple reviewers:

```bash
BETA_REVIEWER_EMAILS=you@example.com,teammate@example.com
```

`BETA_REVIEWER_EMAILS` controls who can see the full `/feedback/review` queue. Regular tester accounts can submit feedback, but should not see every other tester's reports.

## Tester Script

Ask testers to complete these tasks:

Open `/beta`, then work through the in-app checklist.

1. Create an account or sign in.
2. Try forgot password/password reset if they are comfortable testing account recovery.
3. Set district and policy interests.
4. Open the dashboard and explain what they think the top cards mean.
5. Search for bills and officials.
6. Open a bill, review summary, pros/cons, sources, votes, and video links.
7. Open an official profile and review voting/accountability sections.
8. Open alerts, read one alert, and confirm unread behavior makes sense.
9. Check badges, impact, voter registration, and election participation.
10. Check Letters Sent and Signed Petitions in the action ledger.
11. Open `/upgrade`, compare Free/Pro/Team, switch billing cycle, and describe what feels locked or unclear.
12. Use `/feedback` to report one bug, one confusing flow, and one missing item.

## Feedback Categories

- Bug: something breaks or fails.
- Flow: user gets lost or the next step is unclear.
- Missing: expected feature or information is not present.
- Data: record, vote, source, or summary looks wrong.
- Design: spacing, hierarchy, readability, or polish issue.
- Other: anything that does not fit cleanly.

## Android Recommendation

Android should wait until the Apple/core app flow is solid. The current app is web-first React/Next.js, so Android does not require starting over. A later Android version can reuse most product screens through a wrapper or shared React code path, but it still needs Android-specific QA, Play Console setup, push notification checks, billing decisions, device-size testing, and store screenshots.

Avoid adding Android-specific work now unless a tester or investor requires it. The efficient path is: web beta, Apple/TestFlight, then Android.

## Readiness Checklist

- Vercel deployment connected to Neon.
- `NEXT_PUBLIC_APP_URL` points to the deployed beta URL, not the local preview URL.
- `BETA_REVIEWER_EMAILS` includes your reviewer account email.
- Production auth QA passes.
- Password reset/forgot-password is verified working for the beta pass.
- Email verification delivery is confirmed if testers are creating new accounts.
- Congress.gov sync can run safely with conservative limits.
- Subscription demo modes are clear.
- `/feedback` saves tester reports.
- `/feedback/review` shows the reports you expect.
- `/feedback/review` can update report status for reviewer accounts.
- `/feedback/review` filters reports by All, Open, New, Reviewing, Planned, and Resolved.
- `/feedback/review` can classify active reports as Launch blocker, Beta OK, or Later.
- `/feedback/review` can filter active reports by Blockers, Untriaged, Beta OK, and Later.
- `/feedback/review` can copy a triage summary and export a filtered CSV.
- `pnpm beta:triage` summarizes blockers, untriaged reports, status counts, severity counts, and category counts from the database.
- `/beta` gives testers the checklist and routes them into feedback.
- `/beta` includes subscription/upgrade testing.
- `pnpm beta:check` passes for the deployed beta environment.
- `BETA_CHECK_DATABASE=true pnpm beta:check` confirms the feedback table exists when you want a direct database check.
- Dashboard, search, bill details, profile, alerts, badges, impact, account, upgrade, and sign-in have been tested on mobile width.
- Known issues are sorted into launch-blocking, beta-acceptable, and later.
