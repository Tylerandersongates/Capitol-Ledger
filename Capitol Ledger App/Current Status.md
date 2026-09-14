# Current Status

> Superseding September 14, 2026 status: Production Batch A applied the exact five reviewed migrations and passed its complete postflight. PR #8 then merged the matching default-off privacy/deletion source into `main` at `dca8330e012f723ecd77f2756a865e907c0fa553`; PR #12 merged fail-closed App Store verifier containment at `4836e3e48d95d677f8b64713a7f8af62204ea631`. Both GitHub checks and the matching Vercel production deployments passed; deployment `9F3k4yumJTfqDQtEBcAz1bZ6qgnr` for `4836e3e` is Ready. Privacy intake, deletion, retention, App Store verification, and Notifications V2 remain off. T04 remains frozen pending substantive Apple Support guidance. The active Apple-independent T09 slice is a repository-local, exact-opt-in, aggregate-only privacy queue monitor on `codex/privacy-operations-monitor`; it is not deployed, scheduled, configured, or run against production. The dated September 13 notes below are historical where they conflict with this paragraph. Use the [superseding task-ledger reconciliation](../docs/project-timeline.md#september-14-superseding-reconciliation).

> Current handoff note (September 13, 2026): exact non-production source candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` remains isolated in open, unmerged [PR #8](https://github.com/Tylerandersongates/Capitol-Ledger/pull/8) on `codex/sept12-privacy-neon-candidate`. The last independent remote verification covered predecessor PR checkpoint `0c09abc0523e2f4de16f55f4d6d2465d27f4abfa`; exact-head [CI #321](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34780116093) and matching Ready [Vercel Preview `7d1i8rinVS8iUhUTPUyba4DMwUfy`](https://vercel.com/capitolwonkce/project-qosv1/7d1i8rinVS8iUhUTPUyba4DMwUfy) pass for that predecessor. The documentation-only packet descendant requires its own live-head verification. The Preview publishes the verified CapitolWonk privacy fallback while database-backed intake remains disabled. Resend verifies `capitolwonk.com`; four public aliases and Vercel Production/Preview sender/contact values are configured, the existing sending secret was preserved, and unchanged production source `7ec68bcf142d6defe865c12959b0f9a84fce72d5` was redeployed Ready with live `/privacy` smoke passing. Neon Phase 1 verified the exact literal-name application database, expected five pending migrations, `PrivacyRequest` absent, zero `AccountDeletionRequest` rows, and no completed-deletion watermark. The temporary restore child and compute expired automatically; final target evidence verified 29 application tables and live reads on literal `Capitol%20Ledger`. With Tyler's separate exact confirmation, only the empty 7344 kB spaced-name database was permanently deleted. Neon now lists only retained `neondb` and application database `Capitol%20Ledger`; the post-delete production read smoke passed. No migration, restore, application-row write, candidate merge/deployment, or activation occurred. Apple Support still has not replied and Tyler plans to call September 14; preserve the signing/device freeze. The five-migration promotion packet, privacy operations/single-owner contingency, read-only SQL companions, and local capture manifest are prepared but unapproved. Production Batch A remains no-go because unchanged `7ec68bc` can still write legacy Stripe Team sentinel `team-owner-upgrade`, which migration 3 would make foreign-key-invalid. Review the packets before seeking a separate replacement-child/Phase 2 approval, mocked reproduction, and separately approved compatible-source or complete source/traffic-quiescence sequence. Use the [September 13 handoff](../docs/eod-handoff-2026-09-13.md) and [current timeline/task ledger](../docs/project-timeline.md). October 30 remains the user-set launch target and is low-confidence/materially at risk.

> September 13 preparation update: predecessor PR checkpoint `0c09abc` has passing exact-head CI #321 and matching Ready Preview `7d1i8rinVS8iUhUTPUyba4DMwUfy`, while `main` remains `7ec68bc`. The reviewed documentation-only descendant contains the [exact five-migration promotion packet](../docs/production-five-migration-promotion-packet-2026-09-13.md), [privacy operations/single-owner contingency](../docs/privacy-operations-single-owner-contingency-2026-09-13.md), and [local capture manifest](../docs/app-store-assets/capitolwonk-capture-manifest-2026-09-13.md); verify its live PR SHA and exact-head checks before use. Batch A remains no-go pending a replacement-child Phase 2 run, isolated no-provider reproduction of the legacy `team-owner-upgrade` incompatibility, a separately approved compatible-source or complete source/traffic-quiescence sequence, restore-drill phases 2–5, isolated verifier/failure validation, runner/endpoint binding, lock/window and recovery plans, and fresh production evidence. Privacy intake remains no-go because staff resolution/export tooling, request retention, monitoring, delivery exercises, and either a backup operator or an approved single-owner coverage/absence control are absent. No external state or protected value changed.

> Status note (September 10, 2026): T01–T03 are complete for their exact scopes. Tyler retained the existing logo artwork, and production source `7ec68bc` omits the hardcoded `CE` suffix from shared wordmark cards; CI, Ready/Current Vercel production and live smoke passed. Recovered evidence commits `46efc95` and `d7980aa` close T02 for new events after the approved recursive `$user.geo.**` Sentry scrub; no September probe or protected-setting change was made. T03 candidate `f4f04de` aligns the Next toolchain on `15.5.25`, refreshes all compatible vulnerable transitives, and passes frozen install, native/asserted-WASM builds, 38/38 application/readiness checks, 19/19 optimized route checks, 2/2 image requests, unsigned iOS Simulator Release, [exact-head CI](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34518247389) and matching Ready Vercel Preview. Production/full audits are **0 critical, 2 high and 2 moderate**, all in Next's exact nested `postcss@8.4.31`; Tyler explicitly accepted that exact four-advisory residual for `f4f04de`. Re-audit a changed graph and keep the exception visible. T04 is active and blocked pending Apple Developer Support guidance: the September 10 read-only reconciliation found zero code-signing identities, one unexpired Xcode-managed App Store profile matching the app, stable Xcode 26.6 selected with Xcode 27 beta unselected, and no currently available physical iPhone. Tyler confirmed that Apple had not replied, then explicitly approved a corrected follow-up on the existing case; Apple acknowledged receipt. No signing, certificate, profile, Keychain, device, build, upload, distribution, or review state changed. Await the reply, inspect it read-only, and present one narrowly scoped action for Tyler's approval. An unexplained uncommitted `pnpm-lock.yaml` downgrade was quarantined; Tyler then explicitly approved restoring only that file to the committed T03 version, and it now matches the accepted dependency graph. No dependency change was committed or pushed. Use the [latest EOD](../docs/eod-handoff-2026-09-10.md), [current timeline/task ledger](../docs/project-timeline.md), [T03 audit report](../docs/dependency-security-audit-2026-09-10.md), and [T04 signing reconciliation](../docs/apple-signing-reconciliation-2026-09-10.md) for current evidence and carryovers. The October 30 forecast remains low-confidence/materially at risk. The two App Store listing screenshots still show `CE` and require recapture under T09. TestFlight is not uploaded; signing, native monitoring, device/subscription QA and distribution/review gates remain open. The dated sections below are historical.

> App Privacy preparation note (September 10, 2026): the [source-backed provisional correction packet](../docs/app-store-privacy-correction-2026-09-10.md), public privacy-page update, and regression checks are captured in the reviewed non-production branch candidate. The draft retains nine questionnaire types and adds Emails or Text Messages, Device ID, Crash Data, Performance Data, and Other Diagnostic Data. The resolved native SDK's persistent installation identifiers require linked diagnostic answers unless removed and verified absent; tracking remains No for the current no-video/no-analytics configuration. The page is not deployed to production and App Store Connect is unchanged; archive/runtime/WKWebView/provider reconciliation plus separate remote approvals remain open under T09.

> Account-deletion implementation note (September 10, 2026): the prior request-only path is replaced in the reviewed non-production branch candidate by an in-app action that attempts immediate account deletion. One serializable transaction snapshots cleanup jobs, erases the account inventory, verifies zero matches, and deidentifies the audit without a precommit member/provider mutation. Production user resolution is exact-ID/read-only, with no stale recreation, email remap, or configured-database fallback to process memory. Cleanup jobs remain only while pending/retrying and are erased after success; missing/terminal Stripe outcomes complete and transient errors retry. Signed webhooks enforce timestamp tolerance, reconcile current provider state, reject stale subscription IDs, and, before acknowledging a deleted-user event, schedule an active subscription not to renew and detach metadata where Stripe permits. Concurrent Team-seat pauses serialize on account/workspace locks and attempt Stripe resume compensation if their own transaction fails. Rate-limit subjects are hashed/expired and cleared at deletion. The completed result requires an explicit receipt, ambiguous results are unconfirmed, and a multi-tab fence blocks browser/native StoreKit writers from recreating state. The pause migration converts only known sentinels and aborts on unexpected orphans. Apple billing remains separate. Separately submitted Sentry feedback is outside the account transaction, and current provider guidance does not support one-item User Feedback deletion; the intake/expiry design and public copy remain an open release blocker. See the [account-deletion runbook](../docs/account-deletion-runbook-2026-09-10.md). Production migrations/schema/task setup, real-Postgres/Stripe/device QA, backup/PITR policy, and provider procedures remain open.

> Historical candidate note (September 11, 2026): exact committed candidate `3dbba3a260b10924dff254deed7f65a5e392c239` on `codex/logo-refresh-sept10` adds the official Apple server dependency, canonical App Store state and hash-only Notifications V2 receipts, server reconciliation, Apple/Team fail-closed transitions, the fourth candidate-to-production migration `20260911110000_app_store_server_state`, exact default-off deletion and privacy-retention gates, telemetry/log minimization, and blank-account demo isolation. Its parent `bbe63e4` passed the isolated frozen install, production/full audits with **no known vulnerabilities**, release-source suite, TypeScript, ESLint, and Prisma generation. Exact-head CI `34666462130` exposed four unused demo paths; `3dbba3a` removes only those paths, passes the exact strict TypeScript command and release-source suite locally, and passes [exact-head CI `34668039916`](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34668039916). Matching Vercel deployment `6K9Xd24c4Pg4Nz1pRLorNzo6MxGb` is Ready, and anonymous `/dashboard`, `/search?type=bills`, and `/brief` smoke passes with no demo bill/vote results. The September 13 handoff and current note above supersede this boundary. Provider, sandbox, and device evidence remain open. See the [September 11 dependency note](../docs/dependency-security-audit-2026-09-11.md). The read-only production preflight was repeated and confirms exactly the four expected pending migrations with the unchanged clean orphan/sentinel snapshot. Deletion and retention gates are committed and source-verified but are not approved, deployed, configured, or activated. Apple purchase/renewal/restore/refund/notification behavior and Team acknowledgement/restoration still require the [App Store sandbox QA matrix](../docs/app-store-sandbox-qa-matrix-2026-09-11.md) on one signed candidate. Production `main` remains `7ec68bc`; no migration, deployment, protected configuration, App Store Connect change, account deletion, retention sweep, provider mutation, restore, signing action, upload, distribution, or release occurred. T04 remains frozen pending Apple Support, and the public channel still has no first video or player.

> Resume from the [September 13 handoff](../docs/eod-handoff-2026-09-13.md) and [current timeline/task ledger](../docs/project-timeline.md).

**Launch target confirmed by Tyler: October 30, 2026.** Proposed checkpoints and remaining review contingency are in the ledger; no upload/review/release approval is implied by the date.

## July 18, 2026 Feedback and Monitoring Update

- The local branch replaces the custom feedback API/review queue with Sentry for browser/server errors, native iOS crashes, and in-app reports.
- Session replay and default PII collection are disabled. Protected Sentry values have not been entered, and nothing from this change has been deployed or uploaded.
- Account deletion now uses a dedicated `AccountDeletionRequest` completion audit instead of sharing the feedback table. The later September 10 reviewed branch implementation executes immediate transactional account deletion, commits required post-delete cleanup jobs with it, and deidentifies the completed audit; production migration/task deployment and destructive/provider verification remain open.
- The old `BetaFeedback` production table is intentionally retained as a read-only archive until existing records are privately exported and verified.
- The next external steps are protected Sentry project setup, production migration/deploy, App Store privacy review, and a new TestFlight build. Each requires action-time approval.

## What We Built

The app now has a cohesive set of mobile MVP screens for CapitolWonk. The primary experience is an iPhone-style product demo with a consistent dark navy/gold visual system.

## Most Recent Work

- Set the post-TestFlight product sequence: start the standalone Supreme Court sister app next, while keeping state legislation as a future main-app expansion targeted for a later update.
- Completed a legal-name branding pass so front-facing app copy, public support/privacy pages, native iOS display name, App Store setup copy, active tester docs, and launch-facing checks use `CapitolWonk`.
- Added public `/privacy` and `/support` pages, linked them from Settings, and created the App Store Connect setup packet with the exact bundle ID, product IDs, support/privacy URLs, reviewer notes, screenshot candidates, and Apple-side checklist needed for the next App Store Connect pass.
- Expanded `pnpm testflight:check` so the App Store setup packet and support/privacy pages are part of the readiness gate.
- Tightened the App Store billing gate for the app-only launch path: `.env.example` now includes the Apple in-app purchase variables, `BILLING_REQUIRE_APP_STORE=true pnpm billing:check` now treats final bundle ID and stable account-token namespace as blockers, and strict TestFlight/billing checks currently fail only on Apple-side setup values that must come from App Store Connect/host configuration.
- Added a native iOS StoreKit shell under `ios/CapitolLedgerNative` with a SwiftUI app, WKWebView bridge, Pro monthly/annual product IDs, purchase/restore/manage handling, and native entitlement publishing back into the web subscription state.
- Added server-side App Store transaction validation at `/api/account/subscription/app-store`, so signed StoreKit transactions can sync validated Pro status into the account subscription record.
- Added the TestFlight readiness checklist and `pnpm testflight:check` so upcoming work is measured against the App Store/TestFlight path.
- Continued the final launch-facing text-tone pass across auth/account, dashboard screenshot candidates, Settings, Weekly Brief, live reports, report review, search empty states, member source placeholders, and locked feature cards; expanded `pnpm launch-copy:check` to keep stale beta/demo/payment wording out of those surfaces.
- Added `pnpm ios-native:check` to guard the native StoreKit bridge contract against the web `/upgrade` paywall.
- Replaced the legacy `/beta` tester checklist with a redirect into `/feedback?source=live-testing`.
- Simplified Settings and feedback entry points around live app issue reporting instead of beta tester intake.
- Added `pnpm reports:check` and `pnpm reports:triage` as the forward-facing report readiness commands while preserving the old aliases for compatibility.
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
- Confirmed speech/video links do not need a special Vercel environment variable in the current demo build. They ship from CapitolWonk bill/video data and work once the latest code is deployed; live video ingestion remains a later data-expansion step.
- Removed the bright page-level mobile gradients and returned the shared phone shell to a darker navy foundation so the glass cards, white type, and gold controls feel cleaner and more iPhone-native.
- Reworked `/search` into one unified discovery card: search, result type, quick chips, and Pro refine controls now live together, with the advanced filters collapsed instead of sitting as a separate dated Smart Filters card.
- Condensed `/account` by removing the full subscription demo and Weekly Brief delivery cards from the profile feed, linking the plan badge to `/upgrade`, adding Weekly Brief to settings, making Account Settings collapsible, and adding a compact Weekly Brief entry on `/dashboard`.
- Reduced the most prominent dashboard/search/profile heading sizes and the shared View All pill text so the mobile UI returns to a lighter, less heavy visual rhythm.
- Added beta tester district presets for California, Massachusetts, New York, and Texas so onboarding/search can quickly show relevant federal senators and district representatives for the first tester group.
- Added separate first-name and last-name account creation fields, while preserving the combined display name, so future database exports are easier to sort in spreadsheets.
- Fixed `/search?type=bills`, `/search?type=members`, and `/search?type=votes` so category-specific views show the fuller result set instead of only the three-card homepage preview.
- Fixed the Vercel Prisma deployment issue by adding `prisma generate` to the production build path, so account creation/sign-in can use the generated Prisma client after Vercel dependency caching.
- Restored the sign-in password visibility control so the eye button toggles password fields between hidden and visible.
- Pushed the local CapitolWonk app to GitHub on `main`, giving Vercel a deployable repository source for Phase 1.
- Vercel deployments are now populating from the GitHub-connected CapitolWonk project; Phase 1 is ready for deployed smoke testing.
- Reorganized the remaining work into a phased roadmap and started Phase 1: Web Beta Readiness.
- Added `Phase 1 Web Beta Launch Checklist.md` so the Vercel/Neon beta setup, terminal checks, tester invite route, and Phase 1 exit criteria are in one place.
- Local `beta:check` passes the Phase 1 file/core environment checks; the remaining beta setup is setting `BETA_REVIEWER_EMAILS`, using the deployed Vercel URL for `NEXT_PUBLIC_APP_URL`, and running the database-backed production beta checks from the normal Terminal.
- Added a live app reporting flow at `/feedback`, linked from Settings, with `/api/feedback`, demo fallback storage, database-ready report persistence, and a checked-in Prisma migration.
- Added `/feedback/review` as a report review queue so reports can be grouped by severity and category before each fix pass.
- Made `/feedback/review` actionable: reviewer accounts can move reports through New, Reviewing, Planned, and Resolved states from the mobile review queue.
- Added status filters to `/feedback/review` so reviewers can separate All, Open, New, Reviewing, Planned, and Resolved reports as usage grows.
- Fixed `/feedback/review` intake counters so High, Medium, Low, and Open now reflect active unresolved reports and reset after reports are resolved.
- Added reviewer workflow actions to `/feedback/review`: copy a triage summary and export the current filtered report view as CSV for fix passes.
- Added persistent triage decisions to reports: reviewers can mark reports as Blocker, Acceptable, or Later, with database and demo-mode support.
- Added triage filters to `/feedback/review` for Blockers, Untriaged, Acceptable, and Later so fix passes can focus on the right report set.
- Added `pnpm reports:triage` to summarize database-backed report counts before each fix pass, with optional failure flags for blockers and untriaged reports.
- Hardened the reporting readiness check: production checks now require reviewer emails and reject local preview URLs as the public app URL.
- Added `pnpm reports:check` so live app reporting readiness can be checked, including feedback pages, API route, migration, `.env.local` values, and optional database table presence with `REPORTS_CHECK_DATABASE=true`.
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
- Adjusted `/sign-in` account creation visibility: first-time visitors still see Create/New account, while returning users with existing CapitolWonk browser/account state get a clean login-only screen.
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
- Added a Congress.gov normalization layer so live members, bills, committees, and official source links can use CapitolWonk data shapes.
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

`http://127.0.0.1:3023`

Useful pages:

- `http://127.0.0.1:3023/onboarding`
- `http://127.0.0.1:3023/dashboard`
- `http://127.0.0.1:3023/search`
- `http://127.0.0.1:3023/map`
- `http://127.0.0.1:3023/alerts`
- `http://127.0.0.1:3023/brief`
- `http://127.0.0.1:3023/upgrade`
- `http://127.0.0.1:3023/account`
- `http://127.0.0.1:3023/beta`
- `http://127.0.0.1:3023/feedback`

## Historical Build Status

The checks below were recorded for earlier committed candidates. They do not clear September 11 candidate `3dbba3a`; use the current evidence note above and require its exact-head CI, matching Preview/smoke, provider, sandbox, and device results.

- `pnpm feedback:check`
- `pnpm launch-copy:check`
- `pnpm testflight:check`
- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm ios-native:check`
- `xcodebuild -project ios/CapitolLedgerNative/CapitolLedgerNative.xcodeproj -scheme CapitolLedgerNative -sdk iphonesimulator -configuration Debug -derivedDataPath /private/tmp/capitol-ledger-native-derived CODE_SIGNING_ALLOWED=NO build`
- `pnpm billing:check`
- `BILLING_REQUIRE_APP_STORE=true pnpm billing:check` fails in the preserved local environment because Apple bundle/account-token/API values are absent there. Their Vercel Production presence is recorded separately but does not validate value shape or runtime behavior.
- `TESTFLIGHT_REQUIRE_READY=true pnpm testflight:check` likewise fails in the preserved local environment; Vercel presence alone is not a passing strict release gate.
- `pnpm run video-links:check`
- `NODE_OPTIONS='--require ./scripts/force-swc-wasm.cjs' next build`

## Product Notes

- Speech/video links are demo-ready and subscription-gated on bill detail pages through the `speechVideo` entitlement. Vercel only needs the latest deployment for the current source-backed demo links. A future production layer should ingest or verify live committee hearing, floor video, and member statement feeds before this becomes fully automated.
- The app has no polling loops in the current mobile flow. Shared hydration now avoids several duplicate profile/gamification/read-alert requests, which keeps the app lighter as we add more civic data.
- Subscription demo mode can now be switched from `/account` or `/upgrade`, and those plan states visibly affect dashboard, bill details, alerts, search, and map. The switcher and locked previews have been polished for investor walkthroughs, the demo script lives in `Subscription Demo Guide.md`, and live billing readiness can be checked with `pnpm billing:check`.
- The App Store subscription path has a direct StoreKit native shell plus a server validation endpoint for account-wide Pro and Team sync. The working candidate adds canonical Apple server state, hash-only notification receipts, current-status reconciliation, and fail-closed Team handling. App Store Connect already contains the recorded 38-product inventory; remaining work is product ordering/review metadata and exact-ID validation, App Store Server API credential/runtime validation, and execution of the [sandbox QA matrix](../docs/app-store-sandbox-qa-matrix-2026-09-11.md)—not duplicate product creation. Source fixtures are not Apple sandbox proof.
- App Store-required local gates are intentionally strict now: before sandbox/TestFlight purchase QA, apply the reviewed App Store state migration and configure `APP_STORE_BUNDLE_ID`, numeric `APP_STORE_APP_APPLE_ID`, `APP_STORE_ACCOUNT_TOKEN_NAMESPACE`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_ID`, and `APP_STORE_CONNECT_PRIVATE_KEY` in the host environment. Keep the Notifications V2 URL inactive until sandbox verification passes.
- TestFlight is the active prep direction. The launch-facing text-tone pass covers auth/account, dashboard, settings, upgrade, feedback, alerts, brief, search empty states, member source placeholders, locked feature cards, and bill/member detail sub-tabs. The immediate path is to freeze and freshly verify the September 11 working candidate while T04 waits on Apple. App Store Connect publication and sandbox/TestFlight Apple/Team QA follow only after their named gates and approvals.
- Production auth routes now exist and are wired to `/sign-in`. Real accounts require `DATABASE_URL`; deployed HTTPS should set `AUTH_COOKIE_SECURE=true`; the checked-in migration can be applied with `pnpm prisma:migrate:deploy`; `pnpm production-auth:check` verifies the required tables; password reset completion is ready for `/sign-in?resetToken=...` links; verification is ready for `/sign-in?verifyToken=...` links; auth email delivery can use `AUTH_EMAIL_DELIVERY=webhook` once a provider bridge is chosen. Use `pnpm auth-email:check` before production email QA. See `Auth Integration Notes.md`.
- Demo sign-in now avoids blocking on account sync. This keeps local/investor previews usable even when `DATABASE_URL` is present but the production database is not running.
- Auth hardening currently uses same-origin guards plus in-memory rate limiting for local and controlled-beta QA. Provider-backed multi-instance rate limiting remains an unresolved public-launch decision; do not treat the current limiter as final production clearance.
- Production auth QA can now be run with `AUTH_QA_BASE_URL=https://your-app.example.com pnpm production-auth:qa`.
- The current browser preview may need a restart after builds because it runs in production mode.
- Policy Interests now has an account settings edit mode. Selections persist into the saved ledger and should later feed live alert, search, and brief personalization once those services are connected.
- Party affiliation now syncs through the account profile API/database path when signed in, while still falling back to browser storage for demo mode.
- District setup and notification preferences now use the same account profile API/database path, while still falling back to browser storage for demo mode.
- The `/sign-in` screen has a demo-ready auth flow plus production-shaped auth endpoints. The current account milestone is the exact five-migration order—deletion integrity, cleanup outbox, Team-pause workspace integrity, App Store server state, then privacy-request intake—plus gated runtime verification, final auth-email delivery, and end-to-end account QA. Follow the [September 13 promotion packet](../docs/production-five-migration-promotion-packet-2026-09-13.md); no migration is authorized.
- The `/account` screen now behaves like an account-only area. Signed-out users route through `/sign-in`, and demo/production sessions return to the requested account destination after login.
- Gamification score now comes from defined event rules and is triggered by core demo actions: tracking bills, saving officials, reading alerts, reviewing votes, opening official sources, watching speech/video links, using alert detail action, and completing onboarding.
- Remaining gamification triggers should be added when new action flows exist, especially petition signing, representative contact delivery, team invites, and civic learning actions.
- The profile card is now downstream of the gamification model, so future score/streak/badge changes should be made in the gamification layer first and then reflected automatically on `/account`.
- Notification unread state now syncs through the account ledger path for signed-in/demo accounts, while still using browser storage as the offline demo fallback; the dashboard header badge uses the same unread state.
- Weekly Brief generates an in-app personalized summary from account state, is treated as a Pro feature in the demo entitlement model, records delivery history, has a secure scheduled-delivery runner, and includes safe QA/config checks plus a provider handoff guide. Real email/push delivery and its scheduler remain deferred post-launch. This is separate from the launch-critical account-deletion cleanup scheduler, which is not configured and still requires its protected secret, authenticated schedule, no-payload age monitor, and retry/reclaim evidence. A bounded retention sweep is now attached in source but remains exact-switch default-off; its general and legacy-feedback gates are not approved, deployed, or activated.
- Backend outside-service setup now has a reference PDF and consolidated readiness command. Use `pnpm backend:check` for a broad setup snapshot, then use the focused commands for auth, billing, and Weekly Brief before production testing.
- Congress.gov live-data setup now has a focused readiness command. The first local dry sync, Neon migration, and tiny write sync have succeeded; the next Congress.gov step is a tiny cosponsor-enabled write sync, then a tiny House-vote write sync, with Neon inspection after each run.
- Congress.gov member, bill, committee, official source-link, bill-summary, bill-cosponsor, House vote, and House member-vote upserts are now available behind `CONGRESS_SYNC_WRITE=true`; keep House vote ingestion explicit with `CONGRESS_SYNC_HOUSE_VOTES=true` and small limits until Neon records are inspected.
- Search/discovery, dashboard, and bill detail pages now read synced Neon civic records first and keep demo records as fallback. The next live-data UI move is extending that pattern into member detail, vote detail, alerts, and Weekly Brief inputs.
- Smart Filters are now useful as a high-volume discovery pattern. The live-data version should add broader facets such as policy area, bill status, committee, vote result, and source availability after Congress.gov records are fully synced.
- Beta testing now uses the in-app `/feedback` path with Sentry plus Apple's separate TestFlight feedback channel. The former custom review queue is retired, and legacy `BetaFeedback` records remain archived until a private export is verified.
- Bill details now separate the formal bill summary from the AI Policy Lens personal-impact read. Both longer description areas use fixed-height scroll boxes so cards stay visually consistent as bill text changes.
- `/bills` now routes to the searchable bills list instead of relying only on individual bill detail URLs.
- The mobile app now uses a darker shared navy background instead of page-level blue/gold gradients. If we later build a native iOS shell, this visual system should map cleanly into Apple-style Liquid Glass surfaces because cards already rely on translucent backgrounds, borders, and blur.
- `/search` now treats advanced filtering as a collapsed refine layer inside the main discovery panel. Future high-volume filters should extend that refine area instead of adding another separate Smart Filters card.
- `/account` is now more focused on identity, saved ledger, preferences, and privacy. Subscription management belongs on `/upgrade`, while Weekly Brief delivery/history belongs on `/brief` with a compact dashboard entry point.
