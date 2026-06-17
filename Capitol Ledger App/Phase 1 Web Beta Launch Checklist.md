# Phase 1 Web Beta Launch Checklist

Status: Phase 1 is tester-launch ready. First trusted tester intake is planned for June 6, 2026. Keep this checklist as the post-deploy smoke + tester intake maintenance runbook.

## Goal

Get Capitol Ledger onto a controlled Vercel web beta, connected to Neon, so a small tester group can use the app and send feedback before App Store/TestFlight packaging.

## What Phase 1 Is Not

- Not the App Store build.
- Not Android packaging.
- Not live Stripe checkout.
- Not the final Congress.gov full sync.
- Not broad public launch.

Phase 1 is the smallest useful tester release.

## One-Time Setup

In Vercel, set these environment values for the beta project:

```bash
DATABASE_URL="your Neon pooled or direct connection string"
AUTH_SECRET="your production auth secret"
AUTH_COOKIE_SECURE="true"
NEXT_PUBLIC_APP_URL="https://your-vercel-beta-url"
BETA_REVIEWER_EMAILS="your-reviewer-email@example.com"
CONGRESS_API_KEY="your Congress.gov API key"
```

Use a comma-separated list for multiple reviewer emails:

```bash
BETA_REVIEWER_EMAILS="you@example.com,reviewer@example.com"
```

Do not use `http://127.0.0.1:3020` for `NEXT_PUBLIC_APP_URL` once testers are involved. That value needs to be the deployed Vercel URL.

## Local Terminal Prep

If the normal Terminal says `node: command not found`, run this once in the project folder before the checks:

```bash
export PATH="/Users/tylergates/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
```

Then use:

```bash
node .tools/pnpm.cjs run beta:check
node .tools/pnpm.cjs run beta:triage
```

## Phase 1 Checks

Run these before inviting testers or after any major push:

```bash
node .tools/pnpm.cjs run prisma:migrate:deploy
BETA_REQUIRE_PRODUCTION=true BETA_CHECK_DATABASE=true node .tools/pnpm.cjs run beta:check
node .tools/pnpm.cjs run beta:triage
```

After the deployed Vercel URL is live, also check:

```bash
AUTH_QA_BASE_URL="https://your-vercel-beta-url" node .tools/pnpm.cjs run production-auth:qa
```

## Manual Beta Smoke Test

1. Open the deployed Vercel URL.
2. Create a reviewer account or sign in with the reviewer email listed in `BETA_REVIEWER_EMAILS`.
3. Visit `/beta`, `/dashboard`, `/search`, `/bills/demo-hr-22`, `/alerts`, `/badges`, `/impact`, `/account`, and `/upgrade`.
4. Submit one test report at `/feedback`.
5. Open `/feedback/review`.
6. Confirm the report appears.
7. Mark it as Reviewing or Resolved.
8. Mark the launch decision as Beta OK or Later unless it is truly blocking.
9. Run `beta:triage` again.

## June 6, 2026 Tester Intake

Send the first trusted testers:

- the deployed `/beta` link
- the beta tester guide PDF
- the editable DOCX only if a tester or collaborator needs to revise the instructions

Ask testers to focus on:

- sign-in, forgot password, and returning-user behavior
- dashboard comprehension
- search, bill detail, official profile, and alerts
- badges, impact, voter registration, and election participation
- Letters Sent and Signed Petitions in the action ledger
- subscription/upgrade clarity across Free, Pro, and Team
- feedback reporting from the row they are testing

After each tester session:

1. Open `/feedback/review`.
2. Filter `Open`, `Blockers`, and `Untriaged`.
3. Mark each report as Launch blocker, Beta OK, or Later.
4. Export CSV or copy the triage summary before starting fixes.

## Tester Invite Script

Send testers to:

```text
https://your-vercel-beta-url/beta
```

Ask them to complete the checklist and submit feedback for:

- one bug or broken item
- one confusing flow
- one missing feature or missing data point
- one design/readability note

## Phase 1 Exit Criteria

- The deployed beta opens from the Vercel URL.
- Neon migrations are applied.
- Reviewer account can access `/feedback/review`.
- Regular tester accounts can submit `/feedback`.
- Feedback saves to the database.
- `beta:check` passes in production mode.
- `beta:triage` shows no launch blockers.
- Active feedback is not left untriaged before the next tester round.
- The first 3 to 5 trusted testers can use the app without being guided screen by screen.

## What Comes After Phase 1

Move to Phase 2: Account and Auth Stability.

That phase is now in beta QA mode: password reset is verified working, and the remaining work is watching account/session tester feedback, confirming verification delivery as needed, and fixing any launch-blocking persistence issues.
