# Next Steps

## Phase Roadmap

### Phase Status Snapshot

1. Phase 1: Web Beta Readiness - Baseline complete, now in maintenance mode.
2. Phase 2: Account and Auth Stability - In progress.
3. Phase 3: Design QA and Beta Polish - In progress (current UI iteration lane).
4. Phase 4: Subscription Demo Integration - Ready after Phase 3 visual freeze.
5. Phase 5: Core Civic Data Expansion - Planned.
6. Phase 6: External Production Services - Planned.
7. Phase 7: App Store and TestFlight - Planned.

### Phase 1: Web Beta Readiness - Baseline Complete

Goal: get Capitol Ledger deployed as a controlled web beta so trusted testers can use the app, submit reports, and give us real flow/design feedback before App Store or TestFlight work.

Estimated time: 0.5 to 1.5 focused days, depending mostly on Vercel environment setup and the first tester report pass.

1. Deploy the current app to Vercel with Neon connected.
2. Apply the newest Prisma migrations against Neon.
3. Set beta environment values in Vercel: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_COOKIE_SECURE=true`, `NEXT_PUBLIC_APP_URL`, `BETA_REVIEWER_EMAILS`, and `CONGRESS_API_KEY`.
4. Run the Phase 1 readiness checks from `Phase 1 Web Beta Launch Checklist.md`.
5. Create or sign in with the reviewer account listed in `BETA_REVIEWER_EMAILS`.
6. Submit one test report from `/feedback`.
7. Confirm it appears in `/feedback/review`, then mark status and launch decision.
8. Run the beta triage check after every tester session.
9. Invite a first small group of 3 to 5 trusted testers through `/beta`.

Exit criteria:

- Deployed beta loads from the Vercel URL.
- Sign-in/create account/sign-out flows work in the deployed beta.
- `/feedback` writes to Neon.
- `/feedback/review` is available to reviewer accounts only.
- `beta:check` passes in production-check mode.
- `beta:triage` shows zero launch blockers and zero untriaged active reports before widening the tester group.

Current Phase 1 status:

- GitHub has the initial Capitol Ledger app push on `main`.
- Vercel deployments are now populating from the GitHub-connected project.
- The latest design cleanup has darkened the shared mobile shell, simplified `/search`, shortened `/account`, and added a compact dashboard entry point for Weekly Brief.
- A light performance pass removed duplicate account/profile, gamification, and read-alert hydration paths. No active polling loops were found in the current mobile flow.
- Speech/video links are wired for the current demo through bill video data, bill detail cards, subscription gating, and gamification. Use `pnpm video-links:check` before demos; no Vercel video-link key is required yet.
- The first beta tester states are now supported in the demo data and onboarding flow: California, Massachusetts, New York, and Texas.
- Account creation now captures first name and last name separately for cleaner tester export and future customer records.
- Search category views now show the fuller list for Bills, Officials, and Votes instead of only preview cards.
- Vercel production build path includes `prisma generate`, resolving prior Prisma-client deployment mismatches.
- Local `beta:check` passes the file and core environment checks.
- Phase 1 ongoing maintenance step: run a deployed smoke test after each major push (submit one `/feedback` report and confirm visibility in `/feedback/review`).
- Local `.env.local` can stay pointed at the local preview; Vercel owns the deployed `NEXT_PUBLIC_APP_URL` value.
- The database-backed `beta:triage` check should be run from the normal Terminal against Neon because the Codex sandbox can hit local Prisma engine restrictions.

### Phase 2: Account And Auth Stability

Goal: make real account behavior feel dependable before inviting broader testers.

Estimated time: 1 to 2 days.

1. Connect real auth email delivery for verification and password reset using `Auth Email Delivery Guide.md`.
2. Run `auth-email:check`, `production-auth:check`, and deployed `production-auth:qa`.
3. Confirm returning users see the clean sign-in screen, while first-time visitors can create an account.
4. Confirm onboarding, district setup, party affiliation, alert preferences, read alerts, saved ledger, subscription mode, and gamification persist after sign-out/sign-in.
5. Decide whether the current in-memory rate limiting is enough for beta, or add a provider-backed limiter before public traffic.

### Phase 3: Design QA And Beta Polish

Goal: remove visual friction from the tester-facing app before a larger beta round.

Estimated time: 0.5 to 1 day.

1. Do a beta-readiness visual pass on `/feedback`, `/sign-in`, `/account`, `/dashboard`, `/search`, `/alerts`, `/badges`, and `/upgrade`.
2. Decide the final Weekly Brief visual treatment once the scheduled delivery service is connected.
3. Add state and local official profile destinations for the map/government levels flow.
4. Create investor/App Store screenshot layouts from finished mobile pages.
5. Run a final visual QA pass after restarting the production preview.

### Phase 4: Subscription Demo Integration

Goal: make Free, Pro Intelligence, and Civic Team easy to demonstrate and explain.

Estimated time: 2 to 4 hours.

1. Tune locked preview card copy and spacing after viewing the restarted app.
2. Capture demo screenshots for Free, Pro Intelligence, and Civic Team.
3. Prepare an investor-facing timed walkthrough based on `Subscription Demo Guide.md`.

### Phase 5: Core Civic Data Expansion

Goal: expand live-first data beyond the current synced pages.

Estimated time: 2 to 4 days.

1. Run a tiny cosponsor-enabled Congress.gov sync, inspect Neon `Member` and `Cosponsor` rows, then increase limits carefully.
2. Run a tiny House-vote dry sync, then a tiny House-vote write sync, inspect Neon `Vote` and `MemberVote` rows, and keep Senate vote ingestion as a later blended-source step.
3. Extend the live-first database path from `/search`, `/dashboard`, and bill detail pages into member detail, vote detail, alerts, and Weekly Brief pages.
4. Expand search facets for high-volume records: chamber, party, state, policy area, bill status, committee, vote result, and source availability.
5. Replace deterministic bill pros/cons with live AI policy analysis using official bill text, CRS summaries, vote records, and source links.
6. Replace deterministic source matching with live source discovery once committee, hearing, video, and member statement feeds are connected.

### Phase 6: External Production Services

Goal: connect the outside services needed for paid production use.

Estimated time: 3 to 7 days, depending on provider approvals.

1. Run `backend:check` as the broad outside-service tracker.
2. Configure Stripe live price IDs, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`, then run `BILLING_REQUIRE_STRIPE=true billing:check`.
3. Choose the Weekly Brief email/push provider bridge, configure the task secret and provider settings, then run `weekly-brief:check` and `weekly-brief:qa`.
4. Add remaining gamification triggers once product flows exist: petition signing, representative contact delivery, team invites, and civic learning actions.
5. Add monitoring/error reporting and production rate limiting before public launch.

### Phase 7: App Store And TestFlight

Goal: package the tested product for Apple review and pre-sale testing.

Estimated time: 2 to 5 days after beta feedback is stable.

1. Freeze the beta-tested core flow.
2. Prepare App Store screenshots and description.
3. Package the Apple build path.
4. Run TestFlight on real devices.
5. Fix TestFlight-only issues.
6. Decide Android timing after Apple/core flow is solid.

## Completed Product Work

1. Extracted the repeated mobile phone-shell/status-bar layout into a shared component used across the mobile landing pages.
2. Extracted repeated mobile cards and bottom navigation into shared reusable components.
3. Connected demo screens to the shared app data layer where data is already available, including dashboard counts, bill details, vote totals, member profile metrics, alerts, map metrics, and onboarding officials.
4. Added browser-based persistence for saved officials, bills, alerts, and issue interests, with account-page saved-ledger counts.
5. Added browser-based subscription state handling for Free, Pro, and Civic Team plans, including monthly/annual cycle selection and account-page plan summary.
6. Replaced demo bill speech/video placeholders with verified official source links from Senate committee pages, Senate roll-call votes, HouseLive, and Congress.gov video.
7. Added Congress.gov normalization for live member, bill, committee, and source-link records, including normalized API responses and sync-script preparation.
8. Added demo account-backed saved-ledger sync for officials, bills, alerts, and issue interests, with sign-in creating an account session and preserving browser-saved records.
9. Added account-backed subscription sync with provider-ready billing fields for Stripe, RevenueCat, or App Store records, while preserving browser-selected plan state in demo mode.
10. Added Stripe-ready checkout and webhook routes for subscription purchases, including safe demo fallback when live billing keys are not configured.
11. Added database-ready persistence for account ledgers and subscriptions, including Prisma schema models and API routes that use the database when `DATABASE_URL` is configured while keeping demo fallback.
12. Added a deterministic bill source-matching layer that connects bills to official bill records, committee sources, floor videos, roll-call votes, sponsor profiles, and Congressional Record lookup, surfaced on bill detail pages.
13. Added Congress.gov CRS bill-summary resolution order: official summary first, stored summary fallback second, and official-pending fallback when Congress.gov has not published a summary.
14. Added browser-saved party affiliation as an optional profile preference, with display under the profile location line and selector placement inside Account Settings.
15. Added browser-saved notification read state so unread indicators turn off after an alert is opened and read alerts are removed from the `Unread` filter.
16. Added a shared gamification data layer feeding the profile card, `/impact`, and `/badges` so civic score, day streak, badge count, recent achievements, and impact actions stay consistent.
17. Connected profile stat tiles to gamification destinations: Civic Score and Day Streak route to `/impact`, and Badges routes to `/badges`.
18. Defined gamification event rules for core product actions, including point values, streak credit, dedupe behavior, impact metric mapping, and badge thresholds for tracking bills, saving officials, reading alerts, opening sources, reviewing votes, watching speech/video, contacting representatives, signing petitions, and completing onboarding.
19. Added account-backed gamification persistence with a Prisma-ready model, `/api/account/gamification`, demo fallback storage, and sync hooks on `/account`, `/impact`, and `/badges`.
20. Added a centralized subscription entitlement matrix plus demo mode switchers on `/account` and `/upgrade` so Free, Pro Intelligence, and Civic Team can be shown without manually editing state.
21. Applied subscription entitlement gates across the app: Pro policy lens on dashboard, Pro AI/source/video bill details, Pro advanced search and export report previews, Pro priority alerts, and Civic Team map/workspace panels.
22. Added `Subscription Demo Guide.md` with setup steps, expected behavior, QA checklist, and walkthrough scripts for Free, Pro Intelligence, and Civic Team.
23. Connected the `/account` Policy Interests edit control so issue chips can be edited, saved locally, and synced through the account ledger path.
24. Upgraded `/sign-in` into an interactive demo-ready auth flow with sign-in, create account, forgot-password, verification, success handoff, validation states, and demo account sync.
25. Added `/account` sign-out functionality that clears the demo account session and routes back to `/sign-in`.
26. Connected `/sign-in` to production-shaped auth APIs with password hashing, HTTP-only auth sessions, session lookup, sign out, email verification token support, password reset token support, and demo fallback.
27. Added account profile persistence through `/api/account/profile`, including party affiliation, district metadata, display name, notification preference fields, database fallback, and party-affiliation sync from `/account`.
28. Added beta-state personalization for the first tester group with California, Massachusetts, New York, and Texas district presets plus matched senators/representatives in onboarding and search.
29. Updated account creation to collect first name and last name separately while keeping a combined display name for the profile UI.
30. Fixed search category views so `View All` pages for bills, officials, and votes show the full available list instead of a three-record preview.
28. Connected district setup and notification preference controls to account profile persistence, including browser fallback, account API sync, and sign-in/demo migration.
29. Connected core app actions to gamification event recording, including tracked bills, saved officials, read alerts, reviewed vote records, opened official sources, watched speech/video links, onboarding completion, and alert-detail action.
30. Updated `/account`, `/impact`, and `/badges` to use live gamification snapshots and added sign-in/demo migration for gamification state.
31. Moved notification read/unread state into the account ledger path, including local demo fallback, sign-in/demo migration, database-ready `ReadAlert` records, and `/alerts` hydration so read status can follow signed-in users across devices.
32. Added protected-route behavior for `/account`: signed-out users are redirected to `/sign-in` with a return path, while production and demo account sessions are allowed through for real use and investor walkthroughs.
33. Updated sign-in success handoff so production account verification keeps the production session active, while demo mode remains a separate explicit path.
34. Activated Weekly Brief generation with `/brief`, `/api/account/weekly-brief`, and an `/account` delivery card that combines district, saved ledger, policy interests, unread alerts, and subscription level into a personalized civic summary.
35. Connected the dashboard alert badge to the same read/unread alert ledger used by `/alerts`, so the header indicator resets to blank after all active new alerts are read.
36. Gated Weekly Brief controls behind Pro Intelligence so Free users see the feature as locked/inactive and are routed to upgrade before preparing delivery.
37. Updated `/sign-in` so account creation is available for first-time visitors, then the Create tab and New account button are hidden for returning users with existing Capitol Ledger browser/account state.
38. Added password reset completion for production auth: reset tokens can now update the stored password, clear old sessions, create a fresh production session, and return the user through the `/sign-in?resetToken=...` mobile flow.
39. Added the first Prisma production migration plus deploy/check scripts so the auth, account ledger, subscription, gamification, and civic-data tables can be applied and verified against a real hosted Postgres database.
40. Added auth email delivery plumbing for verification and password-reset links, including a provider-ready webhook payload, optional webhook secret header, `/sign-in?verifyToken=...` handling, and environment setup notes.
41. Added auth hardening with same-origin mutation guards and rate limits across sign-in, account creation, password reset, email verification, demo session start, checkout, weekly brief preparation, and account-changing APIs.
42. Added a production-auth QA runner so deployed auth behavior can be checked safely, with optional live account creation and rate-limit stress modes.
43. Added Weekly Brief delivery history with a database-backed delivery table, in-app demo fallback, API history responses, and a compact account-page history view for queued/prepared/sent/failed/paused briefs.
44. Added a secure scheduled Weekly Brief delivery runner at `/api/tasks/weekly-brief` that finds eligible Pro/Team users, prepares briefs, records queued/sent/failed delivery history, and can hand off to a future webhook provider.
45. Added a Weekly Brief task QA runner (`pnpm weekly-brief:qa`) that checks task-route secret protection, dry-run behavior, response shape, and optional live delivery-record writes.
46. Added `Weekly Brief Delivery Guide.md` and `pnpm weekly-brief:check` so provider readiness, cron secrets, webhook settings, sender identity, and production delivery configuration can be checked before a paid provider is integrated.
47. Added `Billing Readiness Guide.md` and `pnpm billing:check` so database, app URL, Stripe keys, webhook secret, and paid plan price IDs can be checked before live checkout testing.
48. Added a backend setup recommendations PDF and `pnpm backend:check` so outside-service setup can be tracked from one consolidated readiness command.
49. Added `Auth Email Delivery Guide.md` and `pnpm auth-email:check` so verification and password-reset email provider readiness can be checked before production auth QA.
50. Added `Congress Live Data Sync Guide.md`, `pnpm congress:check`, and configurable `pnpm sync:congress` settings so live Congress.gov setup can be checked before database upserts are built.
51. Added the first Congress.gov database write path: `CONGRESS_SYNC_WRITE=true pnpm sync:congress` now upserts normalized member and bill records.
52. Added Congress.gov committee and official source-link persistence, including new Prisma models/migration and sync upserts.
53. Added official Congress.gov bill-summary persistence so the live sync can resolve published CRS summaries and update database-backed bill records before votes and cosponsors are connected.
54. Fixed demo sign-in handoff so Demo/Continue in demo mode creates the demo session, routes immediately, and syncs saved account data in the background instead of blocking on database availability.
55. Applied Neon migrations and completed the first tiny Congress.gov write sync, confirming live member, bill, committee, and official source-link records can persist in Neon.
56. Added Congress.gov cosponsor sync: per-bill cosponsor fetches, normalized cosponsor member records, `Cosponsor` upserts, source-link dedupe, readiness checks, and sync environment controls.
57. Added Congress.gov House roll-call vote sync behind explicit flags, including normalized House vote records, House member vote-position records, `Vote` and `MemberVote` upserts, and readiness checks with conservative per-run limits.
58. Connected `/search` and `/api/search` to a live-first Neon data path for synced members, bills, and votes, while preserving demo records as fallback so the product remains presentation-ready.
59. Connected `/dashboard` to the live-first Neon data path for synced bills and House votes, with demo fallback preserved and the route marked dynamic so runtime Congress.gov updates can appear after each sync.
60. Connected `/bills/[billId]` to the live-first Neon data path for synced bill records, sponsors, linked House votes, member vote positions, and official source links, while preserving demo bill fallback.
61. Added a tester-facing Beta Feedback flow with `/feedback`, `/api/feedback`, account-page access, demo fallback capture, database-ready `BetaFeedback` persistence, and a checked-in Prisma migration.
62. Added a beta feedback review queue at `/feedback/review` plus `pnpm beta:check` so tester reports can be reviewed and beta readiness can be checked before inviting external users.
63. Added `/beta` as an in-app tester checklist so early users can follow the intended beta script and submit focused feedback without extra explanation.
64. Added feedback triage status controls so beta reviewer accounts can mark reports as New, Reviewing, Planned, or Resolved from `/feedback/review`.
65. Added review queue status filters so beta reports can be viewed by All, Open, New, Reviewing, Planned, or Resolved.
66. Fixed beta review metrics so High, Medium, Low, and Open counters reflect active unresolved reports instead of resolved historical reports.
67. Added beta reviewer workflow actions for copying a triage summary and exporting the current filtered report queue as CSV.
68. Hardened beta readiness checks so external beta setup requires reviewer emails and a deployed public app URL instead of a local preview URL.
69. Added persistent launch-triage decisions to beta feedback so reports can be marked Launch blocker, Beta OK, or Later before each fix pass.
70. Added launch-triage filters to `/feedback/review` for Blockers, Untriaged, Beta OK, and Later.
71. Added `pnpm beta:triage` so database-backed beta feedback can be summarized before each fix pass, with optional blocker/untriaged failure gates.
72. Tightened duplicate browser/account hydration for profile, party affiliation, gamification, and read-alert state so pages avoid unnecessary repeated background requests.
73. Added `pnpm video-links:check` to verify the current speech/video demo layer before investor or beta walkthroughs.
74. Added a visible Capitol Ledger Accountability v0.1 methodology for official profiles, including weighted transparency factors, score evidence labels, and a nonpartisan explanation of what the score does and does not measure.

## Completed Design Work

1. Added mobile vote record detail pages with dashboard-consistent cards, vote breakdown visualization, linked bill context, featured official positions, and official source access.
2. Added deeper bill detail tabs for Overview, Votes, Timeline, and Details, including linked vote records, member vote positions, expanded legislative timeline, official source map, and speech/video sections.
3. Added an AI Policy Lens card under bill summaries with neutral pros and cons, clearly labeled as generated analysis rather than official source material.
4. Standardized the mobile design system across pages with lighter page/card title weights, softer shared glass cards, consistent phone gutters, frosted icon buttons, and matching oval View All/action pills.
5. Redesigned notifications from overlapping category tabs into a cleaner action-first inbox with `All`, `Action Needed`, and `Unread` filters, time-grouped sections, category pills, and unread/action indicators.
6. Refined `/impact` and `/badges` to match the current lighter mobile card system while preserving the trophy/badge and civic score visual language from the mockups.
7. Redesigned `/sign-in` into a complete mobile account entry flow that matches the lighter Capitol Ledger mobile system across sign-in, create-account, forgot-password, verification, and success states.
8. Removed the inactive `/search` header filter icon and refined `/badges?filter=locked` tile spacing so locked badge names and requirements read cleanly.
9. Rebuilt `/search` Smart Filters into combinable Pro official-record filters with active states, reset behavior, preserved search text, and live match counts.
10. Matched `/badges?filter=earned` name and description spacing to the locked badge layout so earned and locked badge grids read consistently.
11. Converted the dashboard notification control into a real `/alerts` link with an unread alert badge that hides when no new alerts remain.
12. Polished the subscription demo switcher, billing cycle toggle, and locked feature previews so Free, Pro, and Team states read more clearly across gated pages.
13. Ran a focused QA/build pass across dashboard, upgrade, account, search, and badges; build passed and the live preview needs a restart to display the newest production bundle.
14. Removed the redundant notification settings icon from `/alerts` so notification preferences stay centralized in account settings.
15. Removed the redundant top-right profile settings icon from `/account` because the visible Account Settings section already owns those controls.
16. Completed the final low-token dead-control sweep: search submit/export, map district and level controls, bill source action, member header actions, impact period label, account privacy actions, and public pricing CTAs now either navigate or read as non-interactive.
17. Reworked the bill detail AI Policy Lens into a Personal Impact read, kept bill summaries in a cleaner bill-description voice, and put long summary/impact copy inside fixed-height scroll boxes.
18. Added a safe `/bills` route that sends users to the bills discovery list.
19. Removed bright page-level gradients in favor of a darker shared navy mobile shell so the existing glass cards and gold/white controls read more like the desired iPhone Liquid Glass direction.
20. Combined `/search` search, result type tabs, quick discovery chips, and Pro refine controls into one cohesive discovery panel, with advanced filters collapsed by default.
21. Condensed `/account` by moving subscription management to `/upgrade`, moving Weekly Brief delivery/history to `/brief`, adding a compact dashboard entry point, and making Account Settings collapsible.

## Notes For Continuing

The current app code lives in the main workspace root. This folder is the project organizer, not a replacement for the app source.
