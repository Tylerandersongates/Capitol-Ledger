# Weekly Brief Delivery Guide

## Purpose

Weekly Brief delivery is now ready for a production provider, but the app does not need to choose that provider yet. Capitol Ledger can send a provider-agnostic webhook payload to an email or push bridge, while continuing to record delivery history in the app.

## Current App Path

1. `/brief` builds the personalized in-app Weekly Brief.
2. `/api/account/weekly-brief` prepares a user-initiated brief and records account history.
3. `/api/tasks/weekly-brief` runs scheduled delivery for eligible Pro and Team users.
4. `WeeklyBriefDelivery` stores queued, sent, failed, paused, and preview states.

## Required Environment

```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="https://your-app.example.com"
WEEKLY_BRIEF_CRON_SECRET="long-random-secret"
WEEKLY_BRIEF_DELIVERY="webhook"
WEEKLY_BRIEF_WEBHOOK_URL="https://provider-bridge.example.com/weekly-brief"
WEEKLY_BRIEF_WEBHOOK_SECRET="long-random-secret"
WEEKLY_BRIEF_FROM="Capitol Ledger <briefs@example.com>"
```

Run:

```bash
pnpm weekly-brief:check
pnpm weekly-brief:qa
```

Use `WEEKLY_BRIEF_REQUIRE_PROVIDER=true pnpm weekly-brief:check` when checking production readiness and you want the command to fail unless webhook delivery is configured.

## Provider Bridge Contract

When `WEEKLY_BRIEF_DELIVERY=webhook`, Capitol Ledger sends a `POST` request to `WEEKLY_BRIEF_WEBHOOK_URL` with:

```json
{
  "kind": "weekly_brief",
  "to": "user@example.com",
  "from": "Capitol Ledger <briefs@example.com>",
  "subject": "Capitol Ledger Weekly Civic Brief",
  "text": "Plain-text weekly brief body",
  "appName": "Capitol Ledger",
  "user": {
    "email": "user@example.com",
    "name": "Demo Citizen"
  },
  "brief": {
    "title": "Weekly Civic Brief",
    "district": {},
    "metrics": {},
    "lens": {},
    "priorityUpdates": [],
    "actionItems": []
  }
}
```

The request includes `X-Capitol-Ledger-Secret` when `WEEKLY_BRIEF_WEBHOOK_SECRET` is configured.

## Production Scheduler

Schedule:

```text
GET /api/tasks/weekly-brief
Authorization: Bearer <WEEKLY_BRIEF_CRON_SECRET>
```

Recommended cadence for the first production pass:

- Mondays at 8:00 AM in the primary user timezone.
- Run `?dryRun=true` after each deployment before enabling live delivery.
- Start with a small `?limit=25` until delivery metrics are trusted.

## QA Order

1. Apply Prisma migrations.
2. Run `pnpm production-auth:check`.
3. Run `WEEKLY_BRIEF_REQUIRE_PROVIDER=true pnpm weekly-brief:check`.
4. Run `pnpm weekly-brief:qa` against the deployed URL.
5. Run `WEEKLY_BRIEF_QA_LIVE_RUN=true pnpm weekly-brief:qa` only after provider sandbox delivery is ready.
6. Confirm `/account` shows delivery records as queued, sent, or failed.

## Open Decisions

- Provider choice for email and/or push.
- Whether Free users get a monthly preview brief or only in-app locked previews.
- Whether Team accounts should receive one shared brief, one per member, or both.
- Whether failed deliveries should retry automatically or show as user-visible failed records first.
