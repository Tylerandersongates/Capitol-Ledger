# Auth Integration Notes

## What Is Connected

- `/sign-in` now talks to production-shaped auth routes for sign in, account creation, password reset request, password reset completion, email verification, session lookup, and sign out.
- Verification links can land at `/sign-in?verifyToken=<token>`.
- Password reset links can land at `/sign-in?resetToken=<token>`.
- Production sessions use an HTTP-only `capitol-ledger-auth-session` cookie.
- Demo sessions still use `capitol-ledger-demo-session` so investor demos keep working without a live database.
- Existing account-backed APIs now accept either a production auth session or a demo session:
  - `/api/account/profile`
  - `/api/account/ledger`
  - `/api/account/subscription`
  - `/api/account/gamification`
  - `/api/account/weekly-brief`
  - `/api/follows`
  - `/api/account/subscription/checkout`
- Sign-in and demo-account handoff now migrate saved ledger, subscription state, profile settings, district setup, notification preferences, and gamification snapshots into the account paths.
- Notification read/unread state is now part of the account ledger, so read alerts can migrate at sign-in and follow a user across devices once database persistence is enabled.
- `/account` now requires a production or demo account session and redirects signed-out users to `/sign-in` with a return path.
- Verified production accounts now continue through the production session on setup/dashboard handoff; demo mode is still explicit.
- Weekly Brief generation uses the account session to combine profile, saved ledger, subscription, and unread alert state for `/brief` and `/api/account/weekly-brief`, and now records delivery history for prepared/queued/sent/failed/paused brief states.
- Scheduled Weekly Brief delivery is exposed through `/api/tasks/weekly-brief` and requires `WEEKLY_BRIEF_CRON_SECRET`, `CAPITOL_LEDGER_TASK_SECRET`, or `CRON_SECRET` in production.
- Auth and account-changing API routes now reject cross-origin mutation requests.
- Auth-sensitive routes now include in-memory rate limits for sign-in, account creation, password reset, email verification, demo session start, checkout, and weekly brief preparation.

## New Auth Routes

- `POST /api/auth/register`
- `POST /api/auth/sign-in`
- `DELETE /api/auth/sign-out`
- `GET /api/auth/session`
- `POST /api/auth/password-reset`
- `POST /api/auth/password-reset/confirm`
- `POST /api/auth/verify-email`

## Data Model Added

- `User.passwordHash`
- `User.emailVerifiedAt`
- `AuthSession`
- `EmailVerificationToken`
- `PasswordResetToken`
- `User.partyAffiliation`
- `User.districtLabel`
- `User.districtState`
- `User.districtCode`
- `User.notificationPreferences`
- `ReadAlert`
- `WeeklyBriefDelivery`

The runtime auth helper can lazily create the missing auth columns/tables when `DATABASE_URL` is present, but production should use the checked-in Prisma migration before launch.

## Production Database Deployment

1. Set `DATABASE_URL` to the hosted Postgres database.
2. Run `pnpm prisma:migrate:deploy` to apply the checked-in migration.
3. Run `pnpm production-auth:check` to confirm the account, session, reset-token, verification-token, saved-ledger, subscription, gamification, and Weekly Brief delivery tables are present.
4. Run `pnpm production-auth:qa` against the deployed app URL to verify safe auth behavior without creating a live account.
5. Run `pnpm prisma:generate` after migration deployment when the hosting environment does not generate Prisma Client during build.

## Production Auth QA

Use `AUTH_QA_BASE_URL=https://your-app.example.com pnpm production-auth:qa` to run the safe checks:

- Session endpoint responds.
- Protected account mutation requires auth.
- Cross-origin sign-in is rejected.
- Sign-in is production-shaped.
- Password reset request is production-shaped.
- Password reset token confirmation is production-shaped.

Optional checks:

- `AUTH_QA_CREATE_ACCOUNT=true` creates a real test account, verifies it when a manual verification link is available, signs out, and signs back in.
- `AUTH_QA_RATE_LIMIT=true` intentionally repeats failed sign-in attempts until the rate limit responds.

## Auth Email Readiness QA

Use `AUTH_EMAIL_REQUIRE_PROVIDER=true pnpm auth-email:check` before testing production verification and password-reset email delivery. See `Auth Email Delivery Guide.md` for the provider contract and recommended QA order.

## Weekly Brief Task QA

Use `WEEKLY_BRIEF_REQUIRE_PROVIDER=true pnpm weekly-brief:check` to verify the delivery environment before connecting live sends. See `Weekly Brief Delivery Guide.md` for the provider contract.

Use `WEEKLY_BRIEF_QA_BASE_URL=https://your-app.example.com WEEKLY_BRIEF_CRON_SECRET=... pnpm weekly-brief:qa` to run the safe scheduled-brief checks:

- Missing task secret is rejected.
- Authorized dry run is production-shaped.
- Runner response includes eligible user counts and delivery-record shape.
- Database-missing state returns a clean production-shaped 503.

Optional check:

- `WEEKLY_BRIEF_QA_LIVE_RUN=true` runs the task with `dryRun=false` and writes queued/sent/failed delivery records for up to five eligible users.

## Billing Readiness QA

Use `BILLING_REQUIRE_STRIPE=true pnpm billing:check` before testing real paid checkout. See `Billing Readiness Guide.md` for Stripe price ID names, webhook requirements, and the recommended checkout/webhook QA order.

## Environment Needed For Real Accounts

- `DATABASE_URL`
- `AUTH_COOKIE_SECURE=true` in deployed HTTPS production
- `NEXT_PUBLIC_APP_URL` for email links such as `/sign-in?resetToken=...`
- `AUTH_EMAIL_DELIVERY=webhook` when an email provider/webhook bridge is connected
- `AUTH_EMAIL_WEBHOOK_URL` for the provider/webhook endpoint
- `AUTH_EMAIL_WEBHOOK_SECRET` when the webhook bridge should validate Capitol Ledger requests
- `AUTH_EMAIL_FROM` for the sending identity shown in auth messages
- `WEEKLY_BRIEF_CRON_SECRET` for the scheduled brief task route
- `WEEKLY_BRIEF_DELIVERY=webhook` when a Weekly Brief provider bridge is connected
- `WEEKLY_BRIEF_WEBHOOK_URL` for the Weekly Brief provider/webhook endpoint
- `WEEKLY_BRIEF_WEBHOOK_SECRET` when the Weekly Brief webhook bridge should validate Capitol Ledger requests
- `WEEKLY_BRIEF_FROM` for the sending identity shown in Weekly Brief messages
- `STRIPE_SECRET_KEY` for paid checkout
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` for future client-side Stripe surfaces
- `STRIPE_WEBHOOK_SECRET` for Stripe subscription event verification
- `CAPITOL_LEDGER_STRIPE_PRO_MONTHLY_PRICE_ID`
- `CAPITOL_LEDGER_STRIPE_PRO_ANNUAL_PRICE_ID`
- `CAPITOL_LEDGER_STRIPE_TEAM_MONTHLY_PRICE_ID`
- `CAPITOL_LEDGER_STRIPE_TEAM_ANNUAL_PRICE_ID`
- `CONGRESS_API_KEY` for live federal civic data sync
- `CONGRESS_SYNC_CONGRESS` and `CONGRESS_SYNC_LIMIT` for the Congress.gov sync smoke test

## Auth Email Delivery

When `AUTH_EMAIL_DELIVERY=webhook`, Capitol Ledger sends a JSON payload to `AUTH_EMAIL_WEBHOOK_URL` for verification and password reset emails. The payload includes:

- `kind`: `verify_email` or `password_reset`
- `to`
- `subject`
- `text`
- `actionUrl`
- `user`
- `appName`
- `from`

The webhook request includes `X-Capitol-Ledger-Secret` when `AUTH_EMAIL_WEBHOOK_SECRET` is configured. When email delivery is disabled, auth still prepares tokens for demo/manual testing but does not send email.

## Weekly Brief Delivery

`GET` or `POST /api/tasks/weekly-brief` runs the scheduled Weekly Brief delivery worker. In production, call it with `Authorization: Bearer <WEEKLY_BRIEF_CRON_SECRET>` or `X-Capitol-Ledger-Task-Secret`.

The worker:

- Finds users with Weekly Brief enabled, an active Pro/Team subscription, and a database-backed account.
- Builds the same personalized brief used by `/brief`.
- Records queued, sent, or failed delivery history in `WeeklyBriefDelivery`.
- Sends to `WEEKLY_BRIEF_WEBHOOK_URL` when `WEEKLY_BRIEF_DELIVERY=webhook`; otherwise it records a demo queue state.

Use `?dryRun=true` or `{ "dryRun": true }` to preview eligible users without writing delivery records.

## Remaining Auth Work

1. Apply the checked-in Prisma migration against the production database and run `pnpm production-auth:check`.
2. Connect the auth email webhook to an email provider, run `AUTH_EMAIL_REQUIRE_PROVIDER=true pnpm auth-email:check`, and test verification links, reset links, expiry, and invalid-token states.
3. Connect the Weekly Brief webhook to an email/push provider, configure the host scheduler to call `/api/tasks/weekly-brief`, and test sent/failed delivery history with `pnpm weekly-brief:qa`.
4. Configure Stripe checkout and webhook values, then run `BILLING_REQUIRE_STRIPE=true pnpm billing:check`.
5. Configure Congress.gov values, then run `pnpm congress:check` before building live civic-data upserts.
6. Add provider-backed or edge-backed persistent rate limiting before launch if the deployment target needs protection across multiple server instances.
7. Decide whether `/impact`, `/badges`, and subscription management should also require account sessions or remain demo-accessible.
8. Run `pnpm production-auth:qa` after database and email provider setup.
9. QA district setup, notification preferences, notification read state, party affiliation, gamification snapshots, and browser-saved data migration with a real database.
10. QA create account, verify email, sign out, sign in, password reset, profile persistence, and protected-route redirects end to end.
