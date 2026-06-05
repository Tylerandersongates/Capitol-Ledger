# Current Status

## What We Built

The app now has a cohesive set of mobile MVP screens for Capitol Ledger. The primary experience is an iPhone-style product demo with a consistent dark navy/gold visual system.

## Most Recent Work

- Pushed latest beta tester polish and guide package to `origin/main` at commit `b5106dd Prepare beta tester polish and guide`.
- First trusted beta tester intake is planned for June 6, 2026.
- Added first-round beta tester guide deliverables under `docs/beta-tester-guide`: Markdown source, generated PDF, editable DOCX, annotated snapshots, and generator scripts.
- Added subscription/upgrade testing to the in-app `/beta` checklist, bringing the tester queue to 8 flows.
- Confirmed `BETA_REVIEWER_EMAILS` exists in Vercel from June 1, 2026, and updated local `.env.local` for parity without committing the email value.
- Verified forgot-password/password reset works for the beta pass.
- Updated Recent Achievements on `/impact` to read as latest unlocked badges and keep its badge list bounded with internal scrolling.
- Updated `/account` profile header so party affiliation and subscription pills stay side by side without unpredictable wrapping.
- Updated election participation logging to one tap to log and one tap to remove, with six listed elections matching the Super Voter path.
- Restored `/badges` all-view behavior so earned and locked badges both show full badge sets instead of a tiny preview.
- Removed misleading Remember Me and Face ID UI from sign-in until real session/passkey support is ready.
- Added clear save-state UI feedback on official and bill profile star actions: users now see `Saved to your ledger` / `Removed from your ledger` confirmation chips immediately after tapping.
- Confirmed the profile star action is wired to saved-ledger persistence (local + account sync path), so save/unsave behavior now has both visible UI feedback and data-state impact.
- Began the official-profile polish pass (layout balance + score explanation + interaction clarity) as the active design iteration track after beta plumbing stabilized.
- Tightened client-side hydration so account profile, party affiliation, gamification, and read-alert state reuse shared browser/account requests instead of asking the same API endpoints multiple times on one page.
- Added `pnpm video-links:check` as a lightweight readiness check for the speech/video selling point, confirming bill video records, bill-detail rendering, subscription gating, and gamification hooks are still wired.
- Confirmed speech/video links do not need a special Vercel environment variable in the current demo build. They ship from Capitol Ledger bill/video data and work once the latest code is deployed; live video ingestion remains a later data-expansion step.
- Removed the bright page-level mobile gradients and returned the shared phone shell to a darker navy foundation so the glass cards, white type, and gold controls feel cleaner and more iPhone-native.
- Reworked `/search` into one unified discovery card: search, result type, quick chips, and Pro refine controls now live together, with the advanced filters collapsed instead of sitting as a separate dated Smart Filters card.
- Condensed `/account` by removing the full subscription demo and Weekly Brief delivery cards from the profile feed, linking the plan badge to `/upgrade`, adding Weekly Brief to settings, making Account Settings collapsible, and adding a compact Weekly Brief entry on `/dashboard`.
- Reduced the most prominent dashboard/search/profile heading sizes and the shared View All pill text so the mobile UI returns to a lighter, less heavy visual rhythm.
- Added beta tester district presets for California, Massachusetts, New York, and Texas so onboarding/search can quickly show relevant federal senators and district representatives for the first tester group.
- Added separate first-name and last-name account creation fields, while preserving the combined display name, so future database exports are easier to sort in spreadsheets.
- Fixed `/search?type=bills`, `/search?type=members`, and `/search?type=votes` so category-specific views show the fuller result set instead of only the three-card homepage preview.
- Fixed the Vercel Prisma deployment issue by adding `prisma generate` to the production build path, so account creation/sign-in can use the generated Prisma client after Vercel dependency caching.
- Restored the sign-in password visibility control so the eye button toggles password fields between hidden and visible.
- Pushed the local Capitol Ledger app to GitHub on `main`, giving Vercel a deployable repository source for Phase 1.
- Vercel deployments are now populating from the GitHub-connected Capitol Ledger project; Phase 1 is ready for deployed smoke testing.
- Reorganized the remaining work into a phased roadmap and started Phase 1: Web Beta Readiness.
- Added `Phase 1 Web Beta Launch Checklist.md` so the Vercel/Neon beta setup, terminal checks, tester invite route, and Phase 1 exit criteria are in one place.
- Local `beta:check` passes the Phase 1 file/core environment checks; the remaining beta setup is setting `BETA_REVIEWER_EMAILS`, using the deployed Vercel URL for `NEXT_PUBLIC_APP_URL`, and running the database-backed production beta checks from the normal Terminal.
- Added a beta tester feedback flow at `/feedback`, linked from `/account`, with `/api/feedback`, demo fallback storage, database-ready `BetaFeedback` persistence, and a checked-in Prisma migration.
- Added `/feedback/review` as a beta review queue so reports can be grouped by severity and category before each fix pass.
- Made `/feedback/review` actionable: reviewer accounts can move reports through New, Reviewing, Planned, and Resolved states from the mobile review queue.
- Added status filters to `/feedback/review` so beta reviewers can separate All, Open, New, Reviewing, Planned, and Resolved reports as tester volume grows.
- Fixed `/feedback/review` intake counters so High, Medium, Low, and Open now reflect active unresolved reports and reset after reports are resolved.
- Added reviewer workflow actions to `/feedback/review`: copy a triage summary and export the current filtered report view as CSV for beta fix passes.
- Added persistent launch-triage decisions to beta feedback: reviewers can mark reports as Launch blocker, Beta OK, or Later, with database and demo-mode support.
- Added launch-triage filters to `/feedback/review` for Blockers, Untriaged, Beta OK, and Later so beta fix passes can focus on the right report set.
- Added `pnpm beta:triage` to summarize database-backed beta feedback counts before each fix pass, with optional failure flags for blockers and untriaged reports.
- Hardened the beta readiness check for external tester setup: production beta checks now require reviewer emails and reject local preview URLs as the public app URL.
- Added `pnpm beta:check` so beta readiness can be checked before inviting testers, including feedback pages, API route, migration, `.env.local` values, and optional database table presence with `BETA_CHECK_DATABASE=true`.
- Added `/beta` as an in-app tester checklist that walks early users through the safest beta test route and hands them off to `/feedback`.
- Added the next Congress.gov live-data layer: `pnpm sync:congress` can now fetch bill cosponsors, normalize cosponsor member records, upsert `Cosponsor` links, and include those members in official source-link records when `CONGRESS_SYNC_COSPONSORS=true`.
- Added a conservative House roll-call vote sync layer behind explicit flags: `pnpm sync:congress` can now fetch House votes, normalize House member vote positions, upsert `Vote` and `MemberVote` records, and create member records needed by vote positions when `CONGRESS_SYNC_HOUSE_VOTES=true`.
- Connected `/search` and `/api/search` to a live-first Neon data path for synced members, bills, and votes, with demo records merged in as fallback so the app stays complete while the live database is still being filled.
- Extended the live-first Neon data path into `/dashboard`: the dashboard now reads synced bills and House vote records at runtime, merges them with demo fallback data, and stays dynamic so refreshed Congress.gov records are not baked into the production build.
- Extended the live-first Neon data path into bill detail pages: `/bills/[billId]` can now resolve synced bill records, sponsors, House votes, member vote positions, and official source links from Neon, while preserving demo fallback for the existing polished demo bills.
- Connected the dashboard notification icon to the unread alert ledger, so it links to `/alerts` and its badge resets to blank when there are no active new alerts.
- Removed the redundant notification settings icon from `/alerts`; notification preference controls now remain centralized under account settings.
- Removed the redundant top-right profile settings icon from `/account`, leaving the page header focused and the settings section as the clear control area.
- Gated Weekly Brief on Free subscriptions: the account preference toggle is locked/inactive, and the delivery card routes Free users to upgrade instead of preparing a brief.
- Adjusted `/sign-in` account creation visibility: first-time visitors still see Create/New account, while returning users with existing Capitol Ledger browser/account state get a clean login-only screen.
- Added production password reset completion: reset-token links can now land on `/sign-in`, accept a new password, clear old sessions, and return the user through a fresh production account session.
- Added the first checked-in Prisma production migration and deploy/check scripts so a hosted Postgres database can be migrated and verified for auth, account ledger, subscription, and gamification persistence.
- Added provider-ready auth email delivery plumbing for verification and password reset messages, including webhook payloads, optional webhook secret headers, and mobile landing flows for `/sign-in?verifyToken=...` and `/sign-in?resetToken=...`.
- Added auth hardening: same-origin mutation guards now protect auth/account-changing API routes, and auth-sensitive routes have rate limits for sign-in, account creation, password reset, verification, demo session start, checkout, and weekly brief preparation.
- Added a production-auth QA runner for deployed environments. The safe mode checks auth shape and origin protection without creating accounts, and optional flags can run live account creation and rate-limit stress tests.
- Added Weekly Brief delivery history: preparing a brief now creates a queued/paused record, the account page shows recent delivery records, and a new Prisma table is ready for real sent/failed delivery tracking.
- Added the scheduled Weekly Brief delivery bridge: `/api/tasks/weekly-brief` can run with a task secret, find eligible Pro/Team users, prepare briefs, record queued/sent/failed delivery history, and hand off to a future webhook provider.
- Added `pnpm weekly-brief:qa` so the scheduled brief task can be checked safely with dry-run behavior first, then optional live delivery-record writes when explicitly enabled.
- Added `Weekly Brief Delivery Guide.md` and `pnpm weekly-brief:check` so delivery provider readiness can be checked before integrating a paid email or push service.
- Added `Billing Readiness Guide.md` and `pnpm billing:check` so Stripe/database readiness can be checked before moving from demo subscription mode into real checkout testing.
- Added a backend setup recommendations PDF and `pnpm backend:check` so outside services can be reviewed and checked from one consolidated readiness pass.
- Added `Auth Email Delivery Guide.md` and `pnpm auth-email:check` so account verification and password-reset email provider setup has its own readiness gate.
- Added `Congress Live Data Sync Guide.md` and `pnpm congress:check`, plus configurable `pnpm sync:congress` settings, so Congress.gov API readiness can be checked before database upserts are built.
- Added the first Congress.gov persistence path: `CONGRESS_SYNC_WRITE=true pnpm sync:congress` now upserts normalized member, bill, committee, and official source-link records with safe sponsor-link handling.
- Added official Congress.gov bill-summary persistence: summary sync is enabled by default for the current batch, resolves published CRS summaries, and updates the existing database-backed `Bill.summary` field.
- Ran the first local Congress.gov dry sync milestone from the terminal, confirming the next safest live-data move is a tiny write sync against the configured database.
- Neon Console and a new Vercel project are ready, so the intended database target should move from the temporary local `localhost` connection to a Neon Postgres connection before any Congress.gov write sync.
- `.env.local` now points `DATABASE_URL` at a Neon direct Postgres host instead of `localhost`; `AUTH_SECRET`, `CONGRESS_API_KEY`, and core app values are present for the current demo/dev stage.
- Neon migrations were applied successfully from the normal local Terminal, so the database schema is ready for the first tiny Congress.gov write sync.
- The first tiny Congress.gov write sync completed successfully into Neon; `Member`, `Bill`, `Committee`, and `OfficialSourceLink` rows are now present.
- Fixed demo sign-in recovery for local previews: Demo/Continue in demo mode now starts the demo session first, routes immediately, and syncs saved account data in the background so an unavailable local database cannot make the button appear dead.
- Completed the final low-token interaction cleanup: small controls that looked tappable now either navigate somewhere useful or have been changed into passive planned-state labels.
- Polished subscription demo controls with shorter Free/Pro/Team switcher labels, clearer demo copy, a softer billing-cycle toggle, and cleaner locked feature preview cards across gated pages.
- Ran a focused QA/build pass across `/dashboard`, `/upgrade`, `/account`, `/search`, and `/badges?filter=earned`; the app builds cleanly and the live preview has no runtime errors, but the production preview needs a restart to show the newest bundle.
- Matched `/badges?filter=earned` tile name and description spacing to the locked badge layout so earned and locked badge grids use the same readable structure.
- Rebuilt `/search` Smart Filters into a clearer Pro filter panel for official records, with Chamber, Party, and State groups, active states, reset behavior, preserved search text, and live match counts.
- Removed the inactive header filter icon from `/search` so the page no longer shows a control that is not connected to account settings or a live filter drawer.
- Refined `/badges?filter=locked` spacing so locked badge names and requirements have cleaner separation and less cramped line wrapping.
- Activated Weekly Brief generation with a new `/brief` mobile page and `/api/account/weekly-brief` endpoint.
- Added an `/account` Weekly Brief delivery card for previewing and preparing the personalized brief from district, saved ledger, policy interests, unread alerts, and subscription mode.
- Added protected-route behavior for `/account`, sending signed-out users to `/sign-in` while preserving demo-session access for investor walkthroughs.
- Updated the sign-in/demo flow so return paths are honored after demo start or production sign-in.
- Updated the verified-account success buttons so production account creation stays in the production session instead of switching into demo mode.
- Moved notification read/unread state into the account ledger path so `/alerts` can merge local demo read status with signed-in account state.
- Added database-ready `ReadAlert` records and sign-in/demo migration for read alerts, while keeping browser fallback for demos without a live database.
- Connected core product actions into the gamification layer: tracking bills, saving officials, reading alerts, opening vote records, opening official sources, watching speech/video links, completing onboarding, and using the alert detail action.
- Added browser-backed gamification event recording with dedupe behavior, local score/streak/badge updates, and account sync through `/api/account/gamification`.
- Updated `/account`, `/impact`, and `/badges` to read live gamification snapshots so Civic Score, Day Streak, Badges, Impact Breakdown, and badge progress can update after user actions.
- Updated sign-in and demo-account migration so gamification snapshots move into the account alongside saved ledger, subscription, profile, district, and notification settings.
- Connected `/onboarding` district setup to the account profile path, with browser fallback and `/api/account/profile` sync.
- Connected `/account` and `/onboarding` alert preference toggles to shared notification preference storage and account profile sync.
- Updated sign-in and demo-account migration so district metadata and notification preferences move into the account profile alongside party affiliation.
- Added `/api/account/profile` and account profile persistence for party affiliation, district metadata, display name, and notification preference fields.
- Connected the `/account` party affiliation selector to the account profile API/database path with browser fallback and sign-in/demo migration.
- Connected the `/sign-in` mobile flow to production-shaped auth APIs for account creation, sign in, sign out, session lookup, password reset, and email verification while preserving demo mode.
- Added production auth database support for password hashes, HTTP-only auth sessions, email verification tokens, and password reset tokens.
- Added `/account` sign-out functionality that clears the demo account session and returns users to `/sign-in`.
- Upgraded `/sign-in` from a static demo entry page into an interactive mobile auth flow with sign-in, create account, forgot-password, verification, success handoff, validation states, and demo-account sync.
- Turned the `/account` Policy Interests “Edit” control into a real edit mode so issue chips can be changed, saved to the civic ledger, and synced through the existing account ledger path.
- Added `Subscription Demo Guide.md` with demo setup, expected plan behavior, QA checklist, and walkthrough scripts for Free, Pro Intelligence, and Civic Team.
- Applied subscription entitlement gates across the main demo surfaces: dashboard Pro policy lens, bill detail AI/source/video gates, search smart filters and export reports, alerts priority lane, and Civic Team map/workspace panel.
- Added a centralized subscription entitlement matrix for Free, Pro Intelligence, and Civic Team, plus demo mode switchers on `/account` and `/upgrade`.
- Added reusable plan-aware subscription components so future screens can show locked previews, upgrade prompts, and plan-specific feature access from one shared source.
- Added account-backed gamification persistence with a Prisma-ready account gamification model, `/api/account/gamification`, demo fallback storage, and quiet sync hooks on `/account`, `/impact`, and `/badges`.
- Defined gamification event rules for core actions, including points, streak credit, dedupe behavior, badge thresholds, and impact metric mapping.
- Created a shared gamification data layer for civic score, day streak, earned badge count, badge catalog, recent achievements, and impact actions.
- Updated `/impact` and `/badges` to render from shared gamification data while matching the current lighter mobile card system.
- Connected the `/account` profile stats to the same gamification data, with Civic Score and Day Streak linking to `/impact` and Badges linking to `/badges`.
- Added real demo inbox behavior to `/alerts`: unread indicators are browser-saved, alerts mark read when opened, and read alerts leave the `Unread` filter.
- Added optional party affiliation to `/account`, with the affiliation displayed under the city/district line and a compact selector inside Account Settings.
- Redesigned `/alerts` into an action-first notification inbox using `All`, `Action Needed`, and `Unread` filters instead of overlapping category tabs.
- Standardized the mobile visual system across pages using the cleaner lighter dashboard look: softer shared cards, lighter heading weights, matching gutters, frosted icon buttons, and oval View All/action pills.
- Added a bill source-matching layer and surfaced an Official Source Map on bill detail pages.
- Added database-ready persistence for account ledger and subscription records, with demo fallback when no production database is configured.
- Added Stripe-ready checkout and webhook routes for subscription purchases, with demo fallback when live billing keys are not configured.
- Added account-backed subscription sync with provider-ready billing fields so selected plans can later connect to Stripe, RevenueCat, or App Store records.
- Added demo account-backed saved-ledger sync so saved officials, bills, alerts, and issue interests can move from browser fallback into an account session.
- Added a Congress.gov normalization layer so live members, bills, committees, and official source links can use Capitol Ledger data shapes.
- Replaced bill-level video/speech/comment placeholders with verified official source links and visible verification labels.
- Rebuilt `/sign-in` as the sign-in / create-account mobile screen.
- Rebuilt `/` as the public homepage matching the mobile product system.
- Rebuilt `/onboarding` as the district setup flow.
- Rebuilt `/account` as the user profile settings page.
- Rebuilt `/search` as the search/discovery page.
- Rebuilt `/upgrade` as the subscription upgrade page.
- Rebuilt `/map` as the government levels page.
- Added supporting engagement pages: `/badges`, `/impact`, `/alerts/detail`.

## Current Preview

Use:

`http://127.0.0.1:3020`

Useful pages:

- `http://127.0.0.1:3020/onboarding`
- `http://127.0.0.1:3020/dashboard`
- `http://127.0.0.1:3020/search`
- `http://127.0.0.1:3020/map`
- `http://127.0.0.1:3020/alerts`
- `http://127.0.0.1:3020/brief`
- `http://127.0.0.1:3020/upgrade`
- `http://127.0.0.1:3020/account`
- `http://127.0.0.1:3020/beta`
- `http://127.0.0.1:3020/feedback`
- `http://127.0.0.1:3020/feedback/review`

## Build Status

Last checked passes:

- `pnpm run video-links:check`
- `pnpm exec tsc --noEmit --pretty false`
- `NODE_OPTIONS='--require ./scripts/force-swc-wasm.cjs' next build`

## Product Notes

- Speech/video links are demo-ready and subscription-gated on bill detail pages through the `speechVideo` entitlement. Vercel only needs the latest deployment for the current source-backed demo links. A future production layer should ingest or verify live committee hearing, floor video, and member statement feeds before this becomes fully automated.
- The app has no polling loops in the current mobile flow. Shared hydration now avoids several duplicate profile/gamification/read-alert requests, which keeps the app lighter as we add more civic data.
- Subscription demo mode can now be switched from `/account` or `/upgrade`, and those plan states visibly affect dashboard, bill details, alerts, search, and map. The switcher and locked previews have been polished for investor walkthroughs, the demo script lives in `Subscription Demo Guide.md`, and live billing readiness can be checked with `pnpm billing:check`.
- Production auth routes now exist and are wired to `/sign-in`. Real accounts require `DATABASE_URL`; deployed HTTPS should set `AUTH_COOKIE_SECURE=true`; the checked-in migration can be applied with `pnpm prisma:migrate:deploy`; `pnpm production-auth:check` verifies the required tables; password reset completion is ready for `/sign-in?resetToken=...` links; verification is ready for `/sign-in?verifyToken=...` links; auth email delivery can use `AUTH_EMAIL_DELIVERY=webhook` once a provider bridge is chosen. Use `pnpm auth-email:check` before production email QA. See `Auth Integration Notes.md`.
- Demo sign-in now avoids blocking on account sync. This keeps local/investor previews usable even when `DATABASE_URL` is present but the production database is not running.
- Auth hardening currently uses same-origin guards plus in-memory rate limiting, which is enough for a first production pass and local QA. For a multi-instance hosted deployment, replace or supplement the rate limit store with an edge/provider-backed limiter.
- Production auth QA can now be run with `AUTH_QA_BASE_URL=https://your-app.example.com pnpm production-auth:qa`.
- The current browser preview may need a restart after builds because it runs in production mode.
- Policy Interests now has an account settings edit mode. Selections persist into the saved ledger and should later feed live alert, search, and brief personalization once those services are connected.
- Party affiliation now syncs through the account profile API/database path when signed in, while still falling back to browser storage for demo mode.
- District setup and notification preferences now use the same account profile API/database path, while still falling back to browser storage for demo mode.
- The `/sign-in` screen now has a complete demo-ready auth flow plus production-shaped auth endpoints. The next account milestone is running a real database migration, wiring email delivery, and QAing account creation end to end.
- The `/account` screen now behaves like an account-only area. Signed-out users route through `/sign-in`, and demo/production sessions return to the requested account destination after login.
- Gamification score now comes from defined event rules and is triggered by core demo actions: tracking bills, saving officials, reading alerts, reviewing votes, opening official sources, watching speech/video links, using alert detail action, and completing onboarding.
- Remaining gamification triggers should be added when new action flows exist, especially petition signing, representative contact delivery, team invites, and civic learning actions.
- The profile card is now downstream of the gamification model, so future score/streak/badge changes should be made in the gamification layer first and then reflected automatically on `/account`.
- Notification unread state now syncs through the account ledger path for signed-in/demo accounts, while still using browser storage as the offline demo fallback; the dashboard header badge uses the same unread state.
- Weekly Brief now generates an in-app personalized summary from account state, is treated as a Pro feature in the demo entitlement model, records delivery history, has a secure scheduled delivery runner, includes safe QA/config checks, and has a provider handoff guide. The remaining production step is choosing and connecting a real email/push provider webhook, then adding it to the host scheduler.
- Backend outside-service setup now has a reference PDF and consolidated readiness command. Use `pnpm backend:check` for a broad setup snapshot, then use the focused commands for auth, billing, and Weekly Brief before production testing.
- Congress.gov live-data setup now has a focused readiness command. The first local dry sync, Neon migration, and tiny write sync have succeeded; the next Congress.gov step is a tiny cosponsor-enabled write sync, then a tiny House-vote write sync, with Neon inspection after each run.
- Congress.gov member, bill, committee, official source-link, bill-summary, bill-cosponsor, House vote, and House member-vote upserts are now available behind `CONGRESS_SYNC_WRITE=true`; keep House vote ingestion explicit with `CONGRESS_SYNC_HOUSE_VOTES=true` and small limits until Neon records are inspected.
- Search/discovery, dashboard, and bill detail pages now read synced Neon civic records first and keep demo records as fallback. The next live-data UI move is extending that pattern into member detail, vote detail, alerts, and Weekly Brief inputs.
- Smart Filters are now useful as a high-volume discovery pattern. The live-data version should add broader facets such as policy area, bill status, committee, vote result, and source availability after Congress.gov records are fully synced.
- Beta testing now has an in-app tester checklist, feedback intake path, actionable filtered review queue, readiness check, first-round tester guide, and subscription testing path. The next beta-readiness step is to run the June 6, 2026 trusted tester intake, triage `BetaFeedback` records after each session, and only then package the Apple/TestFlight build.
- Bill details now separate the formal bill summary from the AI Policy Lens personal-impact read. Both longer description areas use fixed-height scroll boxes so cards stay visually consistent as bill text changes.
- `/bills` now routes to the searchable bills list instead of relying only on individual bill detail URLs.
- The mobile app now uses a darker shared navy background instead of page-level blue/gold gradients. If we later build a native iOS shell, this visual system should map cleanly into Apple-style Liquid Glass surfaces because cards already rely on translucent backgrounds, borders, and blur.
- `/search` now treats advanced filtering as a collapsed refine layer inside the main discovery panel. Future high-volume filters should extend that refine area instead of adding another separate Smart Filters card.
- `/account` is now more focused on identity, saved ledger, preferences, and privacy. Subscription management belongs on `/upgrade`, while Weekly Brief delivery/history belongs on `/brief` with a compact dashboard entry point.
