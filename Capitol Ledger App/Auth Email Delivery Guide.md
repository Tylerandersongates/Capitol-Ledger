# Auth Email Delivery Guide

## Purpose

CapitolWonk can create real account sessions, verification tokens, and password-reset tokens. This guide covers the outside email provider step needed to send verification and reset links to users.

## Current App Path

1. `/sign-in` handles account creation, sign-in, forgot password, verification, and reset-token flows.
2. `POST /api/auth/register` creates an account and prepares a verification email.
3. `POST /api/auth/password-reset` prepares a password-reset email.
4. Verification links route to `/sign-in?verifyToken=<token>`.
5. Password reset links route to `/sign-in?resetToken=<token>`.
6. `POST /api/auth/verification-email` lets the signed-in, unverified account request a new link up to three times per hour.
7. `AUTH_EMAIL_DELIVERY=resend` sends directly through Resend; `AUTH_EMAIL_DELIVERY=webhook` sends a provider-agnostic payload to an outside email bridge.

## Required Environment

```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="https://your-app.example.com"
AUTH_SECRET="long-random-secret"
AUTH_COOKIE_SECURE="true"
AUTH_EMAIL_FROM="CapitolWonk <accounts@example.com>"
```

Choose one delivery path:

```bash
AUTH_EMAIL_DELIVERY="resend"
RESEND_API_KEY="re_..."
```

or:

```bash
AUTH_EMAIL_DELIVERY="webhook"
AUTH_EMAIL_WEBHOOK_URL="https://provider-bridge.example.com/auth-email"
AUTH_EMAIL_WEBHOOK_SECRET="long-random-secret"
```

Run:

```bash
pnpm auth-email:check
```

Use this when checking production provider readiness:

```bash
AUTH_EMAIL_REQUIRE_PROVIDER=true pnpm auth-email:check
```

## Provider Bridge Contract

When `AUTH_EMAIL_DELIVERY=webhook`, CapitolWonk sends a `POST` request to `AUTH_EMAIL_WEBHOOK_URL` with:

```json
{
  "kind": "verify_email",
  "to": "user@example.com",
  "from": "CapitolWonk <accounts@example.com>",
  "subject": "Verify your CapitolWonk account",
  "text": "Plain-text email body with the secure action link",
  "actionUrl": "https://your-app.example.com/sign-in?verifyToken=...",
  "appName": "CapitolWonk",
  "user": {
    "email": "user@example.com",
    "name": "Demo Citizen"
  }
}
```

For password reset, `kind` is `password_reset` and `actionUrl` contains `resetToken`.

The request includes `X-Capitol-Ledger-Secret` when `AUTH_EMAIL_WEBHOOK_SECRET` is configured.

## Trust Guarantees

- Password-reset requests always return the same public response whether or not an account exists; provider mode and account existence are not returned.
- Password-reset provider delivery runs after the public response so provider latency does not become an account-existence timing signal.
- Password-reset links expire after 60 minutes. Verification links expire after 24 hours.
- Tokens are stored only as hashes, are claimed atomically, and can be used once.
- Issuing a new verification or reset token invalidates older unused tokens for that account. Completing a password reset also invalidates every existing account session.
- Production action links require the configured credential-free HTTPS `NEXT_PUBLIC_APP_URL`; request `Host` values cannot replace it.
- Provider calls time out after 10 seconds and do not follow redirects with the email payload.
- Operational delivery logs include only message kind, provider mode, outcome, and a coarse error code. They exclude recipients, names, tokens, action URLs, provider URLs, and message bodies.
- Manual links are never returned when `NODE_ENV=production`.

## Recommended Provider Setup

Use direct Resend delivery for the first production pass unless deliverability requirements justify a separate provider bridge.

Recommended first setup:

1. Verify the sending domain.
2. Create the sender identity used by `AUTH_EMAIL_FROM`.
3. Configure `AUTH_EMAIL_DELIVERY=resend` and `RESEND_API_KEY`. If a bridge is used instead, validate `X-Capitol-Ledger-Secret` before accepting a payload.
4. Send the payload as a plain-text transactional email first.
5. Add branded HTML after the plain-text path is reliable.

## QA Order

1. Apply Prisma migrations.
2. Run `pnpm production-auth:check`.
3. Configure the email provider/webhook environment.
4. Run `AUTH_EMAIL_REQUIRE_PROVIDER=true pnpm auth-email:check`.
5. Create a test account from `/sign-in`.
6. Confirm the verification email arrives and opens `/sign-in?verifyToken=...`.
7. Use forgot password and confirm the reset email arrives.
8. Complete the reset flow and sign in with the new password.
9. Confirm reset requests for existing and nonexistent accounts return the same status and response shape.
10. Request two verification links and two reset links; confirm only the newest link of each type works.
11. Test expired, reused, invalid, and concurrent token submissions.
12. Simulate a provider timeout/failure; confirm registration preserves the account and exposes the resend recovery path, while password reset keeps the generic public response.
13. Confirm delivery logs contain no recipient, name, token, action URL, provider URL, or message body.

## Demo Safety

When auth email delivery is disabled or in `manual_demo`, the app can still prepare and expose tokens during local development. Deployed production-mode builds never return manual action links. A real provider remains required before launch.

## Open Decisions

- Whether verification should be required before a user can use the full account dashboard.
- Whether auth emails should use plain text only for launch or include branded HTML.
- Whether support/contact links should be included in auth email footers.
