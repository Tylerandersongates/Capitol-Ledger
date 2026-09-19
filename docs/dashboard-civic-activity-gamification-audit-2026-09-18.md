# Dashboard Civic Activity and gamification audit — September 18, 2026

## Finding

The live Dashboard, Impact, and Badges surfaces load the signed-in account's persisted gamification snapshot and the visible **440-point Level 3** result is arithmetically consistent with the stored event counts. Several labels and progress mechanics do not match the data actually stored. The current surface cannot support a truthful monthly view or a consecutive-day streak, counts only four selected event types as “Civic Activity,” shows the wrong within-level percentage, and advertises badges that have no earning path.

This is a launch-quality trust defect. Keep it in the weekend Dashboard workstream, with the Live Bill Tracker freshness repair first because that defect affects the product's core official-data claim.

## Live Production evidence

The signed-in Production account showed:

- Dashboard: **Civic Score 440**, **Level 3 — Issue Tracker**, **Day Streak 3d**, **Badges 4/28**, and **Civic Activity 4** with **+440 this month**.
- Impact: **440 points this month**, **59% toward next level**, **40 points in this level**, **310 points to Level 4**, **3 days**, and an Activity Summary of **4** marked **This month**.
- Badges: four earned badges—Civic Starter, District Finder, Representative Watch, and Register to Vote—and event counts of one registration, one tracked bill, two vote records, one logged election, three read alerts, two checked sources, zero letters, and zero comments.

The score reconciles exactly when the three saved officials implied by Representative Watch and the completed district setup are included:

| Stored event | Count | Points each | Score |
| --- | ---: | ---: | ---: |
| District setup | 1 | 100 | 100 |
| Registration form | 1 | 75 | 75 |
| Bill tracked | 1 | 40 | 40 |
| Vote record reviewed | 2 | 35 | 70 |
| Election logged | 1 | 60 | 60 |
| Alert read | 3 | 10 | 30 |
| Official source opened | 2 | 10 | 20 |
| Official saved | 3 | 15 | 45 |
| **Total** | **14** |  | **440** |

The four-action Dashboard total is therefore only the sum of tracked bills, vote activity/elections, letters, and public comments. Ten other recorded actions contribute points and badges but are excluded from “Civic Activity.”

## Current structure and defects

### 1. “This month” has no month boundary

The browser increments `monthlyGain` for each accepted event and persists that running integer in local storage and `AccountGamification`. The schema has no month key or dated event ledger, and hydration does not reset or recompute it at a month boundary. Impact and Dashboard nevertheless call the value “this month.” The same lifetime event counts also feed the Impact chart labeled “This month.”

### 2. “Day streak” is an active-day counter

The browser adds one when a qualifying event occurs on a date different from `lastStreakCreditDate`. It does not check whether the prior credit date was yesterday and does not reset after a missed day. Only a count and last date are stored, so the UI cannot reconstruct actual consecutive activity dates. The week indicator draws the count backward from today as consecutive checked weekdays even when those were not the real activity dates.

### 3. Level progress uses the wrong denominator

At 440 points, Level 3 spans 400–749 and Level 4 begins at 750. The screen correctly says **40 points in this level** and **310 points to Level 4**, but calculates the progress bar as `440 / 750 = 59%`. Within Level 3 the correct progress is `(440 - 400) / (750 - 400)`, about **11%**.

### 4. Nine advertised badges have no earning path

Nineteen badge IDs are connected to event rules. Eight catalog badges only receive a hard-coded `0/target` display and have no trigger: Policy Expert, Committee Watcher, Constitution Champion, Committee Pro, Local Builder, Transparency Ally, Policy Architect, and Coalition Builder. Civic Luminary displays level progress but is never awarded when Level 10 is reached. These nine badges make the 28-badge denominator and locked list misleading.

Two mapped badge rules also conflict with their copy:

- Civic Streak says “Keep a 14-day streak” but is awarded after 14 alerts read.
- Change Maker says “Complete 50 civic actions” but is awarded only when either public comments or representative contacts individually reach 50.

### 5. Account storage is aggregate and client-authored

The browser owns dedupe keys in device-local storage, mutates the complete aggregate snapshot, and posts that snapshot to `/api/account/gamification`. The server normalizes counts and recomputes the score, but it does not validate individual events or persist their target/date identity. A second browser therefore cannot share once-per-target dedupe evidence, and a stale device can overwrite newer aggregate counts. Concurrent writes are whole-snapshot last-write updates apart from a narrow streak clamp.

### 6. Event labels need exact semantics

Opening a vote route records a review automatically. Clicking an official source records a source check. Registration and election participation are self-reported. Representative contact is recorded after the app reports delivery or after the user explicitly confirms an externally prepared message. These can be useful engagement signals, but the UI should use the matching verbs and avoid implying independently verified civic outcomes.

## Correct target behavior

1. Define **all-time score**, **current-month points**, **all-time civic actions**, and the smaller four-category **impact breakdown** as separate metrics. Show only labels backed by their stored time window.
2. Store dated, server-accepted event records with a unique event/target key where dedupe applies. Derive account aggregates from that ledger so multiple devices cannot replay or overwrite progress.
3. Derive a streak from distinct consecutive activity dates in the account time zone. Reset after a missed day and render only dates that actually received credit.
4. Calculate level progress inside the active tier: `(score - current threshold) / (next threshold - current threshold)`.
5. Add real triggers for every launch badge or hide unsupported badges from the earned/locked denominator. Connect Civic Streak to streak state and Change Maker to the defined aggregate action total.
6. Keep event copy literal: records reviewed, sources opened, elections logged, comments marked complete, and messages sent or user-confirmed.
7. Add focused tests for month rollover, missed-day streak reset, time-zone day boundaries, level thresholds, badge reachability, dedupe across devices, stale concurrent writes, and account sign-out/deletion isolation.

## Weekend benchmark

### Saturday, September 19

1. Complete the Live Bill Tracker truth/freshness source candidate first.
2. Freeze the gamification metric contract and prepare the source candidate for truthful all-time/month labels, a real consecutive-day streak, correct within-level progress, and supported badge inventory.
3. Add deterministic unit coverage for the metric formulas and badge reachability. No Production change is implied.

### Sunday, September 20

1. Complete account persistence/dedupe work needed for multi-device correctness, or explicitly ship the smaller truthful-label candidate while the event-ledger migration remains tracked and hidden behind accurate copy.
2. Verify a matching Preview at phone width across Dashboard, Impact, and Badges.
3. Exercise new account, existing account, same-day repeat, missed-day reset, month rollover, sign-out/sign-in, and two-browser stale-write scenarios.
4. Record the remaining device-only rows and present any Production action as a separate exact approval.

The weekend is successful if both core Dashboard surfaces have reviewable source candidates and honest fallback behavior. A schedule lead should be claimed only after the tracker and gamification Preview evidence pass.
