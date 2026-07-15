# GDELT Daily Brief Signals Guide

## Purpose

GDELT powers the Daily Brief media awareness layer. It should help identify major US-politics stories connected to a user's followed issues, but it is not the source of record for official government action.

The Daily Brief should keep this trust boundary:

- Congress.gov, Federal Register, House/Senate vote records, and app bill data are official updates.
- GDELT is a media source for story awareness, coverage volume, and issue matching.
- Written summaries can acknowledge GDELT results, but official records should remain the backbone for claims about bill status, votes, rules, or agency action.

## Runtime Path

- Client: `lib/gdelt/client.ts`
- Brief model: `lib/weekly-brief.ts`
- UI surface: `/brief`, in the Source Watch card
- Label: `Story Signal`
- Source kind: `gdelt-media`

The GDELT client uses the DOC 2.0 Article List API with:

- `mode=artlist`
- `format=json`
- `sourcecountry:US`
- `sourcelang:english`
- a federal-politics query clause
- issue-lane query clauses based on followed topics

Keep this as one combined request per brief. GDELT rate limits frequent API calls, so do not fan out parallel requests per issue lane inside a page render.

## Environment

```env
GDELT_DAILY_BRIEF_ENABLED="true"
GDELT_DAILY_BRIEF_TIMESPAN="24h"
GDELT_DAILY_BRIEF_MAX_RECORDS="6"
GDELT_DAILY_BRIEF_TIMEOUT_MS="2500"
GDELT_DAILY_BRIEF_CACHE_MS="900000"
```

GDELT does not require an API key for this first integration. Keep the timeout short so `/brief` never feels blocked by a media request.

## Filtering

The first build limits the pull to US-based, English-language sources and then adds both:

1. A federal-politics clause, such as Congress, Senate, House of Representatives, White House, Supreme Court, federal agency, federal government, federal rule, and legislation.
2. An issue clause, such as healthcare, immigration, federal budget, education, infrastructure, climate, veterans, gun violence, or public safety.

`sourcecountry:US` means the outlet is US-based. It does not prove the article is about US politics by itself, so the federal-politics and issue clauses must stay in the query.

## QA

Run:

```sh
pnpm weekly-brief:in-app-check
pnpm backend:check
pnpm lint
pnpm exec tsc --noEmit --pretty false
```

For local app preview, reload `/brief` and verify:

- Source Watch still shows official updates.
- Story Signal rows show GDELT source/domain when live results are available.
- If GDELT is unavailable or slow, static watch-lane fallbacks still render.
- Rate-limited or failed GDELT responses do not overwrite a previous cache with empty results.
