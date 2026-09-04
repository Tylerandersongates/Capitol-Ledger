# Next Steps

Current-status note (September 3, 2026): the roadmap below is a July 18 snapshot, not current deployment verification. Follow the latest dated EOD for release gates. Public branding is now CapitolWonk; the Daily Brief video is free and personalized coverage remains Pro. The local changes are not deployed. Round 1–3 exported tester guides are historical and must not be distributed as current launch material without a fresh review and export.

## Phase Roadmap

Status: updated July 18, 2026. CapitolWonk is in TestFlight prep mode: finish protected monitoring setup, App Store billing validation, final launch-facing text tone, and only work that reduces App Store/TestFlight risk.

### Phase Status Snapshot

1. Phase 1: Web Beta Readiness - Complete for controlled beta. Round 1 ran, Vercel and GitHub Actions are green, and the earlier internal feedback queue has now been replaced locally by Sentry.
2. Phase 2: Account and Auth Stability - Complete for web beta, monitor during Round 2. New testers use email verification; returning Round 1 testers sign back into already verified accounts and check profile/gamification persistence.
3. Phase 3: Design QA and Beta Polish - Round 1 blocker pass complete. Remaining work is feedback-driven polish from Round 2.
4. Phase 4: Subscription Demo Integration - Demo complete for beta. Direct StoreKit and server-side App Store transaction validation are now in place; App Store Connect products, server credentials, and sandbox/TestFlight QA remain before paid launch.
5. Phase 5: Core Civic Data Expansion - Partially complete. Live-first search, dashboard, and bill detail paths are connected; more civic surfaces and larger sync passes remain before App Store upload.
6. Phase 6: External Production Services - Partially complete. Sentry web/native integration is implemented locally; protected project configuration, migration/deployment, and production verification still require approval. Auth/email, billing, push, and production rate limiting also need final production checks. Daily Brief outbound delivery is deferred to the post-launch next build; the beta/App Store v1 path keeps Daily Brief in app.
7. Phase 7: App Store and TestFlight - Active prep. Native shell, StoreKit bridge, and server validation are in place; remaining work is App Store Connect setup, production env configuration, final text-tone pass, and sandbox/TestFlight QA.

### Post-Launch Next Build

1. Daily Brief outbound delivery: after launch, evaluate email/push delivery for Daily Briefs, choose the provider bridge, define unsubscribe/history behavior, configure the cron secret/provider settings, and run `pnpm weekly-brief:check` plus `pnpm weekly-brief:qa` before turning on real sends.
2. Sister Supreme Court app: after the main app reaches TestFlight, begin product/data planning for a standalone Supreme Court app focused on docket tracking, oral argument audio, opinions, decision explainers, and saved case alerts.
3. State legislation expansion: keep state legislation inside the main app, but defer the first state pilot to a future update, likely the beginning of next year, after the TestFlight path and Supreme Court sister app are underway.

### Current Working Rule

Everything going forward should serve the TestFlight path. Defer broad product expansion unless it fixes a launch blocker, account/payment risk, App Store review risk, or final user-facing text issue.

Roadmap sequencing rule: do not pull Supreme Court or state-legislation expansion into the current TestFlight scope. Supreme Court work starts as a sister-app track after TestFlight. State legislation remains a main-app future update.

### Feedback System Replacement - Local, Not Yet Deployed

1. `/feedback` now sends directly to Sentry; the internal `/feedback/review` queue and its API/scripts are retired.
2. Browser/server error monitoring and native iOS crash monitoring are implemented with session replay and default PII disabled.
3. Account deletion now uses a dedicated `AccountDeletionRequest` table and remains independent of monitoring.
4. The old `BetaFeedback` production table must remain as a read-only archive until existing reports are privately exported and verified.
5. Next actions require protected Sentry project values, a production database migration, a web deploy, and a new TestFlight build. Stop for Tyler's approval immediately before those external changes.

### Current Waiting State

We are waiting for Round 2 tester activity. The app-facing priority is to avoid unnecessary pushes while testers may be active, except for minor docs updates or blocker fixes.

Round 2 tester materials:

- Tester guide source: `docs/round-2-beta-tester-guide/README.md`
- Historical exported tester guide: `public/downloads/capitol-ledger-round-2-beta-tester-guide.docx` (not current distribution material)
- Feedback triage after deployment: private Sentry Issues/User Feedback plus App Store Connect TestFlight feedback
- Internal returning-user QA: Returning User QA Script
- Internal Round 2 readiness: Round 2 Beta Readiness Checklist

Round 2 asks:

1. New testers create an account, verify by email link, sign back in, and complete setup.
2. Returning Round 1 testers sign into their already verified accounts without creating a new account.
3. Returning testers confirm profile choices, affiliation if set, interests, saved items, alerts, badges, score, and days logged in stayed intact or updated reasonably.
4. All testers report trust, clarity, missing data, confusing labels, and account persistence issues through `/feedback`.

### Phase 1: Web Beta Readiness - Complete

Goal: get CapitolWonk deployed as a controlled web beta so trusted testers can use the app, submit reports, and give us real flow/design feedback before App Store or TestFlight work.

Completed:

1. Deployed beta is live on Vercel at `https://project-qosv1.vercel.app`.
2. GitHub Actions quality checks are installed and passing on the latest docs pushes.
3. `/beta` and `/feedback` were available for tester intake; the local replacement now routes `/feedback` to Sentry.
4. The retired reviewer-only queue is preserved only in git history and legacy database records.
5. Round 1 tester guide exists under `docs/beta-tester-guide`.
6. Round 2 tester guide exists under `docs/round-2-beta-tester-guide` with a public DOCX download.
7. The active feedback queue was triaged to zero active blockers before the Round 2 handoff.

Exit criteria:

- Deployed beta loads from the Vercel URL.
- Sign-in/create account/sign-out flows work in the deployed beta.
- `/feedback` creates a private Sentry feedback item after protected values are configured.
- `SENTRY_REQUIRE_PRODUCTION=true pnpm feedback:check` passes.
- Sentry and App Store Connect feedback show no unresolved launch blockers before widening the tester group.

Maintenance while Round 2 is active:

1. Review Sentry Issues/User Feedback and App Store Connect TestFlight feedback after tester sessions.
2. Classify each active report as launch blocker, current-beta fix, or later before each fix pass.
3. Fix blockers immediately; batch non-blocking polish.
4. Run a deployed smoke test after any app-facing push.

### Phase 2: Account And Auth Stability - Web Beta Complete, Monitor In Round 2

Goal: keep real account behavior dependable during the trusted beta round.

Completed for beta:

1. Password reset/forgot-password is verified working for the beta pass.
2. Email verification works for new account creation and was part of Round 1.
3. Returning-user QA confirmed sign-out, protected `/account` redirect, sign-back-in, profile persistence, saved ledger persistence, and district/interests restoration.
4. `/settings` party affiliation state now stays synced with account profile changes.
5. Tester reports remain private in Sentry and App Store Connect; the retired shared review route is no longer part of the app.
6. Auth-sensitive routes have same-origin guards and in-memory rate limiting for beta.

Remaining before App Store upload:

1. Watch Round 2 reports for account/session confusion, profile resets, verification confusion, or days-logged-in issues.
2. Decide whether to replace in-memory rate limiting with an edge/provider-backed limiter before public launch.
3. Confirm final auth email provider settings for production volume.
4. Confirm privacy/account deletion expectations for Apple review.

### Phase 3: Design QA And Beta Polish - Round 1 Complete, Round 2 Pending

Goal: remove visual friction reported by testers before a larger beta round.

Completed:

1. Round 1 `/feedback/review` triage ran and active reports were resolved before the Round 2 handoff.
2. Round 1 returning-user blockers were fixed and resolved.
3. Mobile visual rhythm, search, account, alerts, badges, upgrade, and feedback review polish have been through multiple beta-readiness passes.
4. Round 2 tester instructions now focus on persistence, trust, clarity, missing data, and useful civic workflow.

Remaining before App Store upload:

1. Triage Round 2 reports into blocker, beta OK, later, duplicate, or resolved.
2. Fix all launch blockers and high-severity account/data contradictions.
3. Treat the launch-facing text-tone pass as mostly complete; only fix new copy issues found during App Store screenshot capture or TestFlight QA.
4. Capture final App Store screenshot candidates from stable mobile pages.
5. Finish App Store Connect setup, Pro subscription products, final bundle ID/signing, and App Store Server API credentials.
6. Keep Daily Brief visual treatment focused on the in-app beta page; revisit outbound delivery treatment in the Post-Launch Next Build.

### Phase 4: Subscription Demo Integration - Demo Complete, Live Billing Pending

Goal: make Free, Pro Intelligence, and Civic Team easy to demonstrate, test, and explain.

Completed for beta:

1. `/upgrade` and subscription demo controls are part of the beta checklist.
2. Free, Pro Intelligence, and Civic Team demo states are visible and entitlement-gated.
3. `Subscription Demo Guide.md` and `Billing Readiness Guide.md` document the demo and live-billing gates.
4. Live Stripe setup is intentionally on hold until real price IDs exist.
5. Direct StoreKit purchase, restore, and manage actions are wired through the native iOS shell.
6. `/api/account/subscription/app-store` validates signed StoreKit transactions through App Store Server API before writing account subscription state.

Remaining before App Store upload:

1. Reorder the paid-plans subscription levels and complete required App Review information. July 17 App Store Connect QA confirmed the 38-record inventory, exact launch-active Team prices, U.S.-only availability, English (U.S.) metadata, and unavailable annual 17-20 reserves.
2. Confirm Pro IDs, the three-seat Team IDs, and every 4-20 seat `com.capitolwonk.team.{seatCount}.{cycle}` product match the setup packet.
3. Add App Store Server API variables through Apple/Vercel tooling, not git: `APP_STORE_BUNDLE_ID`, `APP_STORE_ACCOUNT_TOKEN_NAMESPACE`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_ID`, and `APP_STORE_CONNECT_PRIVATE_KEY`.
4. Keep Stripe disabled for launch unless a web checkout path is deliberately reintroduced.
5. Rerun `TESTFLIGHT_REQUIRE_READY=true pnpm testflight:check` and `BILLING_REQUIRE_APP_STORE=true pnpm billing:check`; both should pass after Apple setup.
6. Run subscription purchase, restore, renewal, cancellation, and expiration QA in sandbox/TestFlight.

### Phase 5: Core Civic Data Expansion - Partial, App Store Data Hardening Remaining

Goal: expand live-first data beyond the current synced pages.

Estimated time: 2 to 4 days.

Completed:

1. Neon migrations are applied.
2. Congress.gov member, bill, committee, official source-link, bill-summary, cosponsor, House vote, and member vote-position upserts exist behind explicit sync flags.
3. Tiny write syncs have confirmed live records can persist in Neon.
4. `/search`, `/dashboard`, and bill detail pages read live-first Neon civic records with demo fallback.
5. Accountability methodology v0.1 is visible on official profiles.

Remaining before App Store upload:

1. Run controlled larger Congress.gov syncs and inspect Neon row quality after each step.
2. Extend live-first data into member detail, vote detail, alerts, and Weekly Brief inputs.
3. Decide how much Senate vote ingestion is required for App Store v1 versus later.
4. Expand high-volume search facets: chamber, party, state, policy area, bill status, committee, vote result, and source availability.
5. Replace or clearly label deterministic AI policy analysis with source-grounded live analysis where needed.
6. Add a data freshness and source limitation note where demo fallback remains.

### Phase 6: External Production Services - Partial, Production Gates Remaining

Goal: connect the outside services needed for paid production use.

Estimated time: 3 to 7 days, depending on provider approvals.

Completed or prepared:

1. `backend:check`, `billing:check`, `launch-copy:check`, `auth-email:check`, `weekly-brief:check`, `weekly-brief:qa`, and `congress:check` exist as readiness commands.
2. Auth email delivery plumbing exists for verification and password reset.
3. Weekly Brief task route and delivery-history table exist.
4. Legacy Stripe checkout/webhook routes still exist in demo-safe mode, but the current launch billing path is Apple in-app purchase through StoreKit and App Store Server API validation.
5. `pnpm testflight:check` exists as the TestFlight readiness gate for native files, StoreKit products, account-token binding, required env names, and final text-tone tracking.

Remaining before App Store upload:

1. Run `pnpm backend:check` as the broad outside-service tracker before production freeze.
2. Choose final auth email provider settings and verify production delivery.
3. Keep Weekly Brief in app for beta/App Store v1. Defer email/push provider bridge, cron activation, and real outbound sends to the Post-Launch Next Build.
4. Choose push-notification provider and implement device token storage, alert-triggered sends, permission prompts, and unsubscribe/preference controls if push is part of App Store v1.
5. Add monitoring/error reporting and production rate limiting before public launch.
6. Confirm privacy policy, support URL, data retention, and account deletion story for Apple review.

### Phase 7: App Store And TestFlight - Remaining Path To Upload

Goal: package the tested product for Apple review and pre-sale testing.

Estimated time: 2 to 5 days after App Store Connect setup and final text-tone pass are stable.

Prerequisites:

1. App Store Connect app record, final bundle ID, signing, and Pro subscription products are ready.
2. App Store Server API environment variables are configured in the host.
3. Final launch-facing text-tone pass is complete for auth/account/settings/upgrade/feedback/alerts/brief empty/error states.
4. Zero launch blockers remain open.
5. Account persistence, saved state, and days-logged-in behavior are acceptable for returning testers.
6. Subscription/App Store purchase path is direct StoreKit, with server validation configured and verified in sandbox/TestFlight.
7. External production-service gates are either completed or clearly deferred from App Store v1.

Upload checklist:

1. Run `pnpm testflight:check`.
2. Run `TESTFLIGHT_REQUIRE_READY=true pnpm testflight:check` after Apple/env setup.
3. Freeze the beta-tested core flow.
4. Use the App Store Connect setup packet to prepare App Store Connect app record, bundle ID, signing, capabilities, support URL, privacy policy URL, subscription products, and review notes.
5. Prepare App Store description, keywords, promotional text, release notes, category, and review notes.
6. Prepare App Privacy nutrition labels based on actual account, analytics, civic activity, purchase, and notification data use.
7. Capture final screenshots for required iPhone sizes from the stable mobile pages.
8. Package the Apple build path and verify production environment settings.
9. Upload the first build to App Store Connect.
10. Run TestFlight on real devices.
11. Fix TestFlight-only issues and re-upload as needed.
12. Submit for App Review when TestFlight, billing, auth, privacy, and feedback triage are clean.
13. Decide Android timing after Apple/core flow is solid.

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
34. Activated Daily Brief generation with `/brief`, `/api/account/weekly-brief`, and an `/account` delivery card that combines district, saved ledger, policy interests, unread alerts, and subscription level into a personalized civic summary.
35. Connected the dashboard alert badge to the same read/unread alert ledger used by `/alerts`, so the header indicator resets to blank after all active new alerts are read.
36. Gated Daily Brief controls behind Pro Intelligence so Free users see the feature as locked/inactive and are routed to upgrade before preparing delivery.
37. Updated `/sign-in` so account creation is available for first-time visitors, then the Create tab and New account button are hidden for returning users with existing CapitolWonk browser/account state.
38. Added password reset completion for production auth: reset tokens can now update the stored password, clear old sessions, create a fresh production session, and return the user through the `/sign-in?resetToken=...` mobile flow.
39. Added the first Prisma production migration plus deploy/check scripts so the auth, account ledger, subscription, gamification, and civic-data tables can be applied and verified against a real hosted Postgres database.
40. Added auth email delivery plumbing for verification and password-reset links, including a provider-ready webhook payload, optional webhook secret header, `/sign-in?verifyToken=...` handling, and environment setup notes.
41. Added auth hardening with same-origin mutation guards and rate limits across sign-in, account creation, password reset, email verification, demo session start, checkout, weekly brief preparation, and account-changing APIs.
42. Added a production-auth QA runner so deployed auth behavior can be checked safely, with optional live account creation and rate-limit stress modes.
43. Added Daily Brief delivery history with a database-backed delivery table, in-app demo fallback, API history responses, and a compact account-page history view for queued/prepared/sent/failed/paused briefs.
44. Added a secure scheduled Daily Brief delivery runner at `/api/tasks/weekly-brief` that finds eligible Pro/Team users, prepares briefs, records queued/sent/failed delivery history, and can hand off to a future webhook provider.
45. Added a Daily Brief task QA runner (`pnpm weekly-brief:qa`) that checks task-route secret protection, dry-run behavior, response shape, and optional live delivery-record writes.
46. Added `Weekly Brief Delivery Guide.md` and `pnpm weekly-brief:check` so provider readiness, cron secrets, webhook settings, sender identity, and production delivery configuration can be checked before a paid provider is integrated.
47. Added `Billing Readiness Guide.md` and `pnpm billing:check` so database, app URL, App Store Server API values, StoreKit product IDs, and account-sync readiness can be checked before sandbox/TestFlight purchase testing.
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
74. Added a visible CapitolWonk Accountability v0.1 methodology for official profiles, including weighted transparency factors, score evidence labels, and a nonpartisan explanation of what the score does and does not measure.
75. Added the GDELT Daily Brief media-signal layer so `/brief` can pull US-politics news signals by followed issue while keeping official bill/vote records as the source of record.

## Open Product Todos

- None currently tracked.

## Completed Design Work

1. Added mobile vote record detail pages with dashboard-consistent cards, vote breakdown visualization, linked bill context, featured official positions, and official source access.
2. Added deeper bill detail tabs for Overview, Votes, Timeline, and Details, including linked vote records, member vote positions, expanded legislative timeline, official source map, and speech/video sections.
3. Added an AI Policy Lens card under bill summaries with neutral pros and cons, clearly labeled as generated analysis rather than official source material.
4. Standardized the mobile design system across pages with lighter page/card title weights, softer shared glass cards, consistent phone gutters, frosted icon buttons, and matching oval View All/action pills.
5. Redesigned notifications from overlapping category tabs into a cleaner action-first inbox with `All`, `Action Needed`, and `Unread` filters, time-grouped sections, category pills, and unread/action indicators.
6. Refined `/impact` and `/badges` to match the current lighter mobile card system while preserving the trophy/badge and civic score visual language from the mockups.
7. Redesigned `/sign-in` into a complete mobile account entry flow that matches the lighter CapitolWonk mobile system across sign-in, create-account, forgot-password, verification, and success states.
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
21. Condensed `/account` by moving subscription management to `/upgrade`, moving Daily Brief delivery/history to `/brief`, adding a compact dashboard entry point, and making Account Settings collapsible.
22. Added neutral member vote lists to standalone vote detail pages and bill vote-history rows, with optional filters for party plus Yes, No, Present, and Not Voting positions.

## Notes For Continuing

The current app code lives in the main workspace root. This folder is the project organizer, not a replacement for the app source.
