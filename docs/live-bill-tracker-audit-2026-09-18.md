# Live Bill Tracker audit — September 18, 2026

## Finding

The Production Live Bill Tracker is a bounded database snapshot rendered on a dynamic page. It is not currently backed by an automatic Congress.gov synchronization schedule or client polling, so the word **Live** and the current-day freshness label overstate what the surface guarantees.

## Production evidence

- The Dashboard showed **54 active bills**, split into **0 passed**, **47 in committee**, and **7 in progress**.
- The Live Docket showed **Updated Sep 19, 2026**, but all 54 displayed latest-action records were older: **50 dated July 27** and **4 dated July 23**.
- H.R. 7008 was absent from the Live Docket even though its bill-detail route refreshes official actions on demand and shows an August 6 Senate-calendar action.
- Vercel Project Settings → Cron Jobs was enabled but showed the setup screen with no configured jobs.

## Current structure

1. `/dashboard` is force-dynamic and calls `getDashboardDataWithLiveData()` for its server-rendered data.
2. The dashboard database query loads the 50 bills with the newest stored `latestActionDate`, the 12 newest stored votes, and active members. Vote-linked bill rows can increase the final deduplicated bill count beyond 50.
3. `buildDashboardData()` deduplicates those records, classifies each bill from its single stored `latestActionText`, calculates the three displayed status totals, and sets `generatedAt` to the current render time.
4. The dashboard card calls that bounded result “Today’s bills” and “active bills in Congress.” `/live-docket` reuses the same result and calls the render timestamp “Updated.”
5. The separate Saved bill tracker takes the first saved bill that also appears in the bounded dashboard result, maps its single latest-action string into eight visual stages, and converts that stage index into a percent-to-final-stage value.
6. Database dashboard reads are cached for 60 seconds. A successful result is also retained in process for up to 10 minutes as a failure fallback.

## How records update today

- `pnpm sync:congress` can fetch and normalize Congress.gov records. It writes them only when `CONGRESS_SYNC_WRITE=true` and is currently an operator-run script.
- The repository has no `vercel.json` cron declaration and no protected Congress synchronization task route. Vercel has no configured project cron job.
- The dashboard and Live Docket do not call Congress.gov directly. Reloading can only re-read the stored database snapshot after the 60-second server cache expires.
- Client focus and `pageshow` handlers refresh account preferences, saved records, and local state; they do not refresh the server-supplied bill dataset.
- An individual bill Details route separately fetches official actions from Congress.gov when opened and merges them into that response in memory. It does not write that fresher action back to the dashboard database, which explains why H.R. 7008 can be current on Details but absent from the docket.

## Correct target behavior

1. Use accurate copy until freshness is proven: **Recent bill activity** and an explicit source-sync timestamp, rather than “Today” and the page-render date.
2. Add a protected, observable, idempotent Congress.gov sync task for a bounded recent-bill batch; schedule it at a reviewed cadence and retain a daily guarded reconciliation path.
3. Persist sync-run success, source update time, counts, and failures. The UI should show the most recent successful source sync and a stale state when it exceeds the agreed threshold.
4. Define the docket by an action-date window or a clearly labeled latest-record limit. Do not label an arbitrary top-50 database query as all active bills.
5. Derive stage and passage milestones from official action history, including chamber-specific passage, rather than a keyword scan of only the latest action.
6. Guarantee that saved bills are resolved independently of the top-50 docket ceiling, then refresh them when the dashboard opens or regains focus.
7. Add freshness, stale-feed, status-history, saved-bill-outside-window, scheduler-authentication, retry, and failure-fallback checks before Production approval.

## Weekend execution order

- **Saturday:** prepare the focused source candidate for truthful freshness labeling, persisted sync metadata, a protected bounded sync task, and refreshed docket/saved-bill queries; run local checks and matching Preview evidence. Continue Dashboard/Home phone QA after the first reviewed candidate is stable.
- **Sunday:** close Preview findings, verify scheduler failure behavior without activating Production, finish the ordered phone matrix sections available on the device, and present any exact Production action separately.

The two full workdays can absorb this newly found core defect while preserving the September 25 checkpoint. A three-to-four-day lead should not be claimed until the tracker candidate and weekend device evidence pass.
