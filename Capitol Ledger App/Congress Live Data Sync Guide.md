# Congress Live Data Sync Guide

## Purpose

CapitolWonk already has a Congress.gov API client, normalizers, API preview routes, sync smoke test, and first database write path. This guide defines the setup needed to run member, bill, committee, source-link, official summary, cosponsor, House vote, and House member-vote upserts, then expand later into Senate vote ingestion.

## Current App Path

1. `lib/congress/client.ts` fetches Congress.gov members, bills, committees, bill records, bill summaries, bill cosponsors, House votes, House member vote positions, and member records.
2. `lib/congress/normalizers.ts` converts Congress.gov records into CapitolWonk member, bill, committee, cosponsor, House vote, House member-vote, and source-link shapes.
3. `/api/congress/members`, `/api/congress/bills`, and `/api/congress/committees` expose live preview endpoints when `CONGRESS_API_KEY` is configured.
4. `pnpm sync:congress` smoke-tests API access and normalization.
5. `CONGRESS_SYNC_FULL_MEMBER_ROSTER=true pnpm sync:congress` paginates and validates the complete current-Congress roster without writing by default.
6. `CONGRESS_SYNC_WRITE=true pnpm sync:congress` persists normalized members, bills, committees, cosponsors, House votes, House member vote positions, official source links, and resolved official bill summaries into the app database.

## Required Environment

```bash
DATABASE_URL="postgresql://..."
CONGRESS_API_KEY="your-congress-gov-api-key"
CONGRESS_SYNC_CONGRESS="119"
CONGRESS_SYNC_BATCH="true"
CONGRESS_SYNC_LIMIT="25"
CONGRESS_SYNC_FULL_MEMBER_ROSTER="false"
CONGRESS_SYNC_MEMBER_PAGE_LIMIT="250"
CONGRESS_SYNC_MEMBER_MAX_PAGES="10"
CONGRESS_SYNC_MEMBER_MIN_COUNT="500"
CONGRESS_SYNC_RECONCILE_ROSTER="false"
CONGRESS_CHECK_LIVE="false"
CONGRESS_SYNC_SUMMARIES="true"
CONGRESS_SYNC_COSPONSORS="true"
CONGRESS_SYNC_COSPONSOR_LIMIT="50"
CONGRESS_SYNC_HOUSE_VOTES="false"
CONGRESS_SYNC_HOUSE_SESSION="1"
CONGRESS_SYNC_HOUSE_VOTE_LIMIT="5"
CONGRESS_SYNC_HOUSE_MEMBER_VOTES="true"
CONGRESS_SYNC_HOUSE_MEMBER_VOTE_LIMIT="500"
CONGRESS_SYNC_BILLS=""
CONGRESS_SYNC_HOUSE_VOTE_NUMBERS=""
CONGRESS_SYNC_TERRITORY_DELEGATES="true"
CONGRESS_SYNC_WRITE="false"
NEXT_PUBLIC_APP_URL="https://your-app.example.com"
```

Run:

```bash
pnpm congress:check
```

Use this when checking production sync readiness:

```bash
CONGRESS_REQUIRE_LIVE=true pnpm congress:check
```

Use this when you want the checker to make a live Congress.gov request:

```bash
CONGRESS_CHECK_LIVE=true pnpm congress:check
```

## Smoke Test

After the key is configured:

```bash
CONGRESS_SYNC_CONGRESS=119 CONGRESS_SYNC_LIMIT=5 pnpm sync:congress
```

The smoke test should report normalized members, bills, committees, bill cosponsor links, cosponsor member records, and official source links.

## Full Current Roster Bootstrap

Use the current-Congress roster endpoint for the initial House and Senate population. The sync follows Congress.gov pagination, deduplicates Bioguide IDs, and fails before any database write when the API response is incomplete, contains inactive records, or falls outside the guarded totals. The default guard requires at least 500 total members, 400 House members, and 90 senators.

First run the complete roster in dry-run mode. Keep summaries, cosponsors, and House votes off so the result is easy to audit:

```bash
CONGRESS_SYNC_CONGRESS=119 CONGRESS_SYNC_FULL_MEMBER_ROSTER=true CONGRESS_SYNC_MEMBER_PAGE_LIMIT=250 CONGRESS_SYNC_MEMBER_MAX_PAGES=10 CONGRESS_SYNC_MEMBER_MIN_COUNT=500 CONGRESS_SYNC_SUMMARIES=false CONGRESS_SYNC_COSPONSORS=false CONGRESS_SYNC_HOUSE_VOTES=false CONGRESS_SYNC_LIMIT=1 CONGRESS_SYNC_WRITE=false pnpm sync:congress
```

The output must report the validated total, separate House and Senate counts, number of pages, and Congress.gov advertised count. Do not continue if those counts are missing or outside the safety range.

After the dry run is reviewed, populate or refresh roster records without deactivating anything:

```bash
CONGRESS_SYNC_CONGRESS=119 CONGRESS_SYNC_FULL_MEMBER_ROSTER=true CONGRESS_SYNC_RECONCILE_ROSTER=false CONGRESS_SYNC_SUMMARIES=false CONGRESS_SYNC_COSPONSORS=false CONGRESS_SYNC_HOUSE_VOTES=false CONGRESS_SYNC_LIMIT=1 CONGRESS_SYNC_WRITE=true pnpm sync:congress
```

Only after the upsert result and stored roster have been inspected should reconciliation be enabled in a separate run:

```bash
CONGRESS_SYNC_CONGRESS=119 CONGRESS_SYNC_FULL_MEMBER_ROSTER=true CONGRESS_SYNC_RECONCILE_ROSTER=true CONGRESS_SYNC_SUMMARIES=false CONGRESS_SYNC_COSPONSORS=false CONGRESS_SYNC_HOUSE_VOTES=false CONGRESS_SYNC_LIMIT=1 CONGRESS_SYNC_WRITE=true pnpm sync:congress
```

Reconciliation only marks previously active records absent from the validated current roster inactive. It refuses to run with fewer than 500 unique active Bioguide IDs. It does not delete members or historical data.

Keep `CAPITOL_LEDGER_ENABLE_DATABASE_READS=false` throughout bootstrap and database inspection. Enable production database-backed reads only after the imported roster and the app's database/demo merge behavior have been audited.

## First Write Step

Member, bill, committee, source-link, official bill-summary, bill-cosponsor, House vote, and House member-vote upserts are now available behind an explicit write flag:

```bash
CONGRESS_SYNC_CONGRESS=119 CONGRESS_SYNC_LIMIT=5 CONGRESS_SYNC_WRITE=true pnpm sync:congress
```

The write step persists:

- Members by `bioguideId`
- Bills by `congress`, `billType`, and `billNumber`
- Committees by normalized committee ID
- Cosponsor member records by `bioguideId`
- Cosponsor links by `billId` and `memberBioguideId`
- House votes by `congress`, `chamber`, and `rollCall`
- House member vote positions by `voteId` and `memberBioguideId`
- Official source links by source-link ID
- Official Congress.gov summaries into the existing `Bill.summary` field when summaries are published

Sponsor links are attached only when the sponsor member already exists in the database. This keeps small sync batches from failing when a bill references a sponsor outside the current member batch.

Summary sync is enabled by default for the current batch. Set `CONGRESS_SYNC_SUMMARIES=false` when you only want the faster member/bill/committee/source-link write path.

Cosponsor sync is enabled by default for the current bill batch. Set `CONGRESS_SYNC_COSPONSORS=false` to skip the extra per-bill API calls, or lower `CONGRESS_SYNC_COSPONSOR_LIMIT` when testing.

House vote sync is explicit because Congress.gov marks the House vote endpoints as beta and each vote can create hundreds of member-position rows. Set `CONGRESS_SYNC_HOUSE_VOTES=true` only for a tiny dry/write run, then inspect Neon before increasing limits.

Example tiny House vote write:

```bash
CONGRESS_SYNC_CONGRESS=119 CONGRESS_SYNC_LIMIT=5 CONGRESS_SYNC_HOUSE_VOTES=true CONGRESS_SYNC_HOUSE_VOTE_LIMIT=2 CONGRESS_SYNC_HOUSE_MEMBER_VOTE_LIMIT=500 CONGRESS_SYNC_WRITE=true pnpm sync:congress
```

For a precise one-bill pull, set `CONGRESS_SYNC_BILLS` to comma-separated bill keys. Keys can be `HR:22` for the configured Congress or `119:HR:22` for an explicit Congress. Pair this with `CONGRESS_SYNC_HOUSE_VOTE_NUMBERS` when the bill has known House roll calls that should be synced with member positions:

```bash
CONGRESS_SYNC_CONGRESS=119 CONGRESS_SYNC_BATCH=false CONGRESS_SYNC_LIMIT=1 CONGRESS_SYNC_BILLS=119:HR:22 CONGRESS_SYNC_COSPONSOR_LIMIT=250 CONGRESS_SYNC_HOUSE_SESSION=1 CONGRESS_SYNC_HOUSE_VOTE_NUMBERS=102 CONGRESS_SYNC_HOUSE_MEMBER_VOTE_LIMIT=500 CONGRESS_SYNC_TERRITORY_DELEGATES=false CONGRESS_SYNC_WRITE=true pnpm sync:congress
```

## Sync Order

Recommended first production sync order:

1. Members
2. Bills
3. Committees
4. Source links
5. Bill summaries
6. Cosponsor member records
7. Bill cosponsor links
8. House vote member records
9. House votes
10. House member vote positions
11. Senate vote records

Members should sync before bills so bill sponsors can resolve to existing member records. Cosponsor member records sync before cosponsor links so the foreign keys are present. House vote member records sync before House member-vote positions so member foreign keys are present. Senate vote ingestion should wait for a dedicated blended-source path.

## QA Order

1. Apply Prisma migrations.
2. Run `pnpm production-auth:check` to confirm database schema is present.
3. Run `pnpm congress:check`.
4. Run `pnpm congress-roster:check` to exercise pagination, completeness, and reconciliation guards.
5. Run `CONGRESS_CHECK_LIVE=true pnpm congress:check` once the API key is available.
6. Run the full current-roster bootstrap in dry-run mode and review every reported count.
7. Run the full current-roster write with `CONGRESS_SYNC_RECONCILE_ROSTER=false`.
8. Inspect the stored member total, chamber split, unique Bioguide IDs, and active flags while app database reads remain disabled.
9. Run the separately guarded reconciliation only after the stored roster passes inspection.
10. Run `pnpm sync:congress` with a small bill and committee limit.
11. Run `CONGRESS_SYNC_WRITE=true pnpm sync:congress` with a small limit.
12. Inspect the database bill, committee, official source-link, bill-summary, and cosponsor records.
13. Run `CONGRESS_SYNC_HOUSE_VOTES=true pnpm sync:congress` in dry-run mode with tiny limits.
14. Run `CONGRESS_SYNC_HOUSE_VOTES=true CONGRESS_SYNC_WRITE=true pnpm sync:congress` with tiny limits.
15. Inspect `Vote` and `MemberVote` rows in Neon before increasing limits.

## Demo Safety

The mobile app still has demo data and source-linked placeholders, so local demos do not require the Congress.gov API key. Live-data pages and sync tests require the key.

## Open Decisions

- How often to sync members, bills, committees, summaries, cosponsors, House votes, member vote positions, and source links.
- Which protected scheduler should run the roster sync after the one-time bootstrap is verified.
- Whether to keep raw Congress.gov payloads in `rawJson` for auditability.
- Whether to sync only the current Congress first or backfill earlier Congresses.
- How aggressively to retry API failures.
- Whether Senate vote/member-vote sync should use Congress.gov where available, Senate.gov roll-call data, or a blended source path.
