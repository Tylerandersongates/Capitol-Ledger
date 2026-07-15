# Auth Email Delivery Guide

## Purpose

CapitolWonk CE can create real account sessions, verification tokens, and password-reset tokens. This guide covers the outside email provider step needed to send verification and reset links to users.

## Current App Path

1. `/sign-in` handles account creation, sign-in, forgot password, verification, and reset-token flows.
2. `POST /api/auth/register` creates an account and prepares a verification email.
3. `POST /api/auth/password-reset` prepares a password-reset email.
4. Verification links route to `/sign-in?verifyToken=<token>`.
5. Password reset links route to `/sign-in?resetToken=<token>`.
6. `AUTH_EMAIL_DELIVERY=webhook` sends a provider-agnostic payload to an outside email bridge.

## Required Environment

```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="https://your-app.example.com"
AUTH_SECRET="long-random-secret"
AUTH_COOKIE_SECURE="true"
AUTH_EMAIL_DELIVERY="webhook"
AUTH_EMAIL_FROM="CapitolWonk CE <accounts@example.com>"
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

When `AUTH_EMAIL_DELIVERY=webhook`, CapitolWonk CE sends a `POST` request to `AUTH_EMAIL_WEBHOOK_URL` with:

```json
{
  "kind": "verify_email",
  "to": "user@example.com",
  "from": "CapitolWonk CE <accounts@example.com>",
  "subject": "Verify your CapitolWonk CE account",
  "text": "Plain-text email body with the secure action link",
  "actionUrl": "https://your-app.example.com/sign-in?verifyToken=...",
  "appName": "CapitolWonk CE",
  "user": {
    "email": "user@example.com",
    "name": "Demo Citizen"
  }
}
```

For password reset, `kind` is `password_reset` and `actionUrl` contains `resetToken`.

The request includes `X-Capitol-Ledger-Secret` when `AUTH_EMAIL_WEBHOOK_SECRET` is configured.

## Recommended Provider Setup

Use Resend for the first production pass unless deliverability requirements push the project toward Postmark.

Recommended first setup:

1. Verify the sending domain.
2. Create the sender identity used by `AUTH_EMAIL_FROM`.
3. Create a small webhook bridge or serverless function that accepts CapitolWonk CE payloads.
4. Validate `X-Capitol-Ledger-Secret`.
5. Send the payload as a plain-text transactional email first.
6. Add branded HTML after the plain-text path is reliable.

## QA Order

1. Apply Prisma migrations.
2. Run `pnpm production-auth:check`.
3. Configure the email provider/webhook environment.
4. Run `AUTH_EMAIL_REQUIRE_PROVIDER=true pnpm auth-email:check`.
5. Create a test account from `/sign-in`.
6. Confirm the verification email arrives and opens `/sign-in?verifyToken=...`.
7. Use forgot password and confirm the reset email arrives.
8. Complete the reset flow and sign in with the new password.
9. Test expired, reused, and invalid token states.

## Demo Safety

When auth email delivery is disabled or in `manual_demo`, the app can still prepare tokens for local testing. Production users need webhook delivery before launch.

## Open Decisions

- Final email provider: Resend first, Postmark if transactional deliverability becomes more important than simplicity.
- Whether verification should be required before a user can use the full account dashboard.
- Whether auth emails should use plain text only for launch or include branded HTML.
- Whether support/contact links should be included in auth email footers.
