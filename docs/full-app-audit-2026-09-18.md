# CapitolWonk full app audit — September 18, 2026

## Executive result

CapitolWonk is **not ready for TestFlight distribution, App Review, or a public launch candidate**. The current Production site contains one critical user-trust defect: Alerts can combine an unlinked Senate nomination vote with an unrelated House bill and present the result as a current action item. The current signed iOS candidate also lacks an enabled in-app account-deletion path, which is a launch blocker for an app that supports account creation.

The audit also confirmed that the Live Bill Tracker is a stale bounded database snapshot labeled with page-render time, all 54 inspected Live Docket rows omit sponsor names, Civic Activity labels and progress mechanics do not match the persisted data, and the Officials accountability framework cannot produce its advertised score. These are product-truth defects, not cosmetic polish.

The app has useful foundations: authentication cookies and tokens are handled conservatively, destructive account and privacy features fail closed while disabled, bill Details now distinguishes current official text from an older CRS summary, numeric official scores remain withheld, sensitive mutations generally enforce same-origin requests, and 34 focused source checks passed. Those controls should be preserved while the defects below are repaired.

No Production data, configuration, provider, Apple, deployment, or account state changed during this audit.

## Scope and method

The audit covered:

- Production route behavior and copy on the canonical web app;
- official-data freshness, bill/vote linkage, sponsor resolution, and public-record scoring;
- authentication, account persistence, deletion, privacy intake, subscriptions, and Team boundaries;
- civic actions, alerts, gamification, Daily Brief, and contact-an-official workflows;
- responsive navigation, accessibility semantics, search performance, loading/error states, and native WebView behavior;
- request security, cache policy, public proxy exposure, secrets, dependencies, scheduled operations, and release controls;
- repository checks, build/test coverage, documentation continuity, and current T01–T11 launch gates.

Evidence came from read-only Production browser inspection, anonymous HTTP response inspection, source review at source head `aea0c82`, the signed-build/release records, and the three same-date focused audits linked below. No destructive QA, purchase, deletion, provider mutation, production database query, deployment, upload, or release action was performed.

Severity means:

- **P0:** stop launch or remove the behavior before another candidate is promoted;
- **P1:** required before launch because it affects truth, security, accessibility, data integrity, or a core workflow;
- **P2:** launch-quality work that may follow the P0/P1 candidate if its limitation is explicit and contained.

## P0 findings

### P0-1 — Alerts fabricate an unrelated bill/vote action

Production Alerts showed H.R. 9954 as needing attention and the detail page said it “recorded a nomination confirmed vote in the Senate,” dated it “Today,” and directed the user to contact a Senator. H.R. 9954 is an unrelated House bill. The newest vote has no linked bill.

The source creates this false relationship directly:

- `app/alerts/page.tsx` selects `recentVote.bill ?? trackedBill`, then manufactures a system alert with `group: "today"` and `time: "Today"`.
- `app/alerts/detail/page.tsx` repeats the fallback and renders the unrelated vote result, chamber, and date against that bill.
- `lib/alert-summary.ts` counts the same synthetic alert as active.
- `lib/data.ts` sets the default unread alert whenever either a linked recent-vote bill **or any tracked bill** exists.
- the Production update-event feed currently has no live source and deliberately returns an empty array, so the false system alert is the main live alert experience.

**Required repair:** remove the unrelated `trackedBill` fallback everywhere; create a reminder only from a verified bill-vote relationship or a separately modeled event; derive urgency and relative time from the event date; require a current action window and user relevance; otherwise show an honest empty state. Add fixtures for unlinked nominations, stale votes, linked bill votes, chamber contact selection, and no active alerts.

### P0-2 — In-app account deletion is disabled

Production truthfully hides the Delete Account control and `/api/account/deletion-request` fails closed with HTTP 503 and `ACCOUNT_DELETION_DISABLED`. The first-party privacy request intake also remains disabled and points users to the dedicated mailbox. That is safe as a current fallback, but an iOS app that allows account creation needs an accessible in-app account-deletion flow before App Review.

The deletion implementation and migrations exist, but runtime activation still lacks production migration/task/provider proof, cleanup scheduling and age monitoring, real PostgreSQL/concurrency evidence, provider cleanup procedures, a backup/PITR tombstone drill, and disposable-account device QA. These gates must be completed before activation; hiding the control cannot be the launch state.

**Required repair:** complete the existing deletion runbook, activate only after its production and device gates pass, expose the in-app action, and verify explicit success, ambiguous failure, sign-out/session invalidation, local-storage fencing, Team/provider cleanup, retries, and monitoring. Keep mailbox privacy intake truthful until its separate first-party operator path is ready.

## P1 findings

### P1-1 — The “Live” bill surfaces do not have a live feed

Production Live Docket displayed 54 bills, “Live,” and “Updated Sep 19, 2026.” Fifty displayed actions were dated July 27 and four July 23; H.R. 7008’s August 6 action was absent. The app was inspected on September 18 PDT, so server UTC page-render time also produced a future local date.

The dashboard loads at most 50 stored bills plus vote-linked rows, caches that database read for 60 seconds, and uses `new Date().toISOString()` as `generatedAt`. No protected Congress sync task or configured Vercel cron exists. Opening an individual bill can fetch fresher actions into that response, but it does not persist them back to the docket. Risk Watch and Priority Feed repeat the page-render timestamp as their update time.

The complete evidence and target are in the [Live Bill Tracker audit](live-bill-tracker-audit-2026-09-18.md).

**Required repair:** relabel the current surface as recent stored activity immediately; store and display the last successful source-sync time; define the docket by a disclosed date window or limit; add a protected, bounded, observable, idempotent Congress synchronization task and a reviewed schedule; record success/failure/counts; show stale and unavailable states; resolve saved bills outside the top-50 ceiling; derive stages from action history.

### P1-2 — Sponsors are missing across the Live Docket

All 54 inspected Production docket rows displayed “Congress - Legislation” instead of a sponsor. Individual H.R. 7008 Details correctly resolves Bryan Steil, which made the discrepancy visible.

`LiveDocketBillRow` calls `getBillSponsor(bill)`, but that helper looks only in the bundled fixture member array. The dashboard query already returns the current database member set, yet the row does not use it.

**Required repair:** build a sponsor map from the live/database member collection returned with the docket and use that map across Docket, Priority Feed, and Risk Watch. Preserve an explicit “Sponsor unavailable” state and add a database-backed fixture that would fail if code falls back to bundled members.

### P1-3 — Civic Activity has truthful-score but false-window and progress mechanics

The live 440-point score reconciles to stored event counts. The surrounding presentation does not: “this month” has no month boundary, a “day streak” increments across nonconsecutive days, Level 3 progress is shown as 59% instead of about 11%, ten point-bearing events are omitted from the four-action Civic Activity total, and nine of 28 advertised badges have no earning path. Whole client-authored snapshot writes plus device-local dedupe allow multi-browser replay and stale overwrites.

The calculations and target are in the [Dashboard Civic Activity audit](dashboard-civic-activity-gamification-audit-2026-09-18.md).

**Required repair:** define distinct all-time and current-month metrics; correct within-tier progress; derive streaks from dated consecutive activity; hide or implement unsupported badges; use literal event labels; move toward a server-accepted dated event ledger with unique event/target keys. If the ledger cannot fit the weekend, ship the smaller honest-label/formula candidate and keep unsupported multi-device claims out of the UI.

### P1-4 — Official accountability is a partial snapshot inside an unreachable score

Production correctly withholds numeric scores, which must continue. Only voting can produce a numeric value; the score requires three numeric categories, so no official can qualify. Vote and legislation totals are capped recent samples without visible windows, request-time enrichment can time out to a stored fallback, zero is not distinguished from missing/partial data, transparency counts identity links, and issue-keyword counts have no evidence drill-down.

The full model review is in the [Official Public Record Accountability audit](official-accountability-snapshot-audit-2026-09-18.md).

**Required repair:** lead with “Public record snapshot” or “Record coverage,” label sample sizes/date windows and source-sync state, distinguish zero from unavailable/partial/timed-out, persist observable evidence rather than changing it during page requests, and add drill-down. Keep numeric scoring disabled until three objective, complete, independently reviewed categories exist.

### P1-5 — Search renders too much data and is slow

Read-only Production measurements found:

| Route | Total time | TTFB | Uncompressed HTML |
| --- | ---: | ---: | ---: |
| `/search` | 2.562 s | 2.161 s | 1,959,977 B |
| `/search?type=members` | 3.580 s | 3.016 s | 1,563,052 B |
| `/search?type=votes` | 3.760 s | 3.567 s | 221,745 B |
| `/search?type=bills` | 2.133 s | 1.865 s | 333,086 B |

The default page reported 19,993 results, 537 officials, 17,941 bills, and 728 controls. Member search can load and render up to 600 officials at once. Compression reduces transfer bytes, but server work and a very large DOM remain.

**Required repair:** paginate or virtualize officials; do not render every category on the default route; make counts and filters independent from result payloads; cap first paint; add a measurable phone target and a DOM/control budget. Preserve the user’s recent H.R. 7008 improvement, whose reported installed-phone opens averaged 1.71 seconds.

### P1-6 — The official-contact workflow can fail and penalize an abandoned draft

Manual mode creates a `mailto:` URL with an empty recipient, assigns `window.location.href`, then opens the official contact page in another window. The native WebView opens external URLs only when `WKNavigationAction.navigationType == .linkActivated`; programmatic navigation can therefore be canceled. The server writes a `prepared` contact row before the user sends anything, and cooldown lookup reads the latest row without filtering for `deliveryStatus = 'sent'`. Preparing or abandoning a draft can trigger the three-day limit.

**Required repair:** offer one reliable official contact path with explicit subject/body copy actions; open external URLs through a native-compatible user action; start cooldown only from webhook-confirmed or user-confirmed sent records; keep prepared drafts separate from sent history and gamification; add WKWebView/device scenarios for mailto, office forms, cancellation, confirmation, and retry.

### P1-7 — Browser response hardening is incomplete

Production sends HSTS, but inspected pages lacked Content Security Policy, `frame-ancestors`, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP, and CORP. Dynamic pages can also expose `X-Powered-By: Next.js`. `next.config.mjs` configures Sentry and images only.

**Required repair:** add and Preview-test a route-aware CSP, `frame-ancestors 'none'`, DENY framing, nosniff, a strict referrer policy, minimal permissions, and appropriate opener/resource policies. Disable the powered-by header. Build the CSP from the actual Sentry, image, Congress, StoreKit, and video requirements rather than using broad wildcards.

### P1-8 — Serverless rate limiting and body controls are not dependable

The request guard uses a global in-memory `Map`. Counts reset on cold starts and are not shared across serverless instances, so authentication, reset, registration, and contact limits are best-effort only. Auth endpoints parse JSON before applying the guard and do not enforce explicit request-body size limits.

**Required repair:** use a persistent/shared rate-limit store, preserve hashed subjects, enforce limits before expensive work, cap request bodies, and define fail-open/fail-closed behavior per route. Retain same-origin enforcement and the existing non-enumerating password-reset response.

### P1-9 — Personalized API cache policy should be explicit

Anonymous inspection found session and account endpoints returning `Cache-Control: public, max-age=0, must-revalidate` without `Vary: Cookie`; Vercel reported cache misses, so no cross-user response reuse was observed. Deletion/privacy routes correctly use `no-store`.

**Required repair:** set `Cache-Control: private, no-store` on session, auth state, account, subscription, gamification, ledger, follows, Team, and other personalized responses; add `Vary` where applicable. Remove impossible Production copy that tells signed-out users to start a demo session when demo auth is disabled.

### P1-10 — Public Congress/search proxies can amplify cost and upstream load

The unauthenticated Congress bill/member proxy routes accept limits up to 250, use no-store upstream requests, have no rate limit, and expose a `format=raw` response. The inspected raw response did not contain an API key. Search and suggest are also public and unthrottled; a cold suggest request took 1.813 seconds while building its catalog.

**Required repair:** remove the raw Production option unless there is a documented consumer; add bounded caching and shared throttling; lower or paginate limits; validate offsets/query lengths; expose only normalized fields; add upstream failure and quota observability.

### P1-11 — Core form and search accessibility is incomplete

The Feedback inputs have visible text rendered as `<div>` elements, without associated `<label>` or accessible names. The main search input relies on placeholder text. Its autocomplete input lacks `aria-controls`, `aria-expanded`, `aria-autocomplete`, and active-descendant handling; the listbox contains links without option semantics or arrow-key behavior. Many controls suppress outlines and depend on border/hover changes; multiple dashboard controls are below a 44 px mobile target.

**Required repair:** associate every form control with a real label; implement the ARIA combobox pattern and keyboard behavior or simplify to a normal search field; add consistent `focus-visible` treatment; expand phone targets; run automated axe checks and VoiceOver/manual keyboard passes on the launch routes.

### P1-12 — Apple billing, monitoring, privacy, and release evidence remain open

The source fails closed for App Store server processing, but Apple server-library `3.1.0` still reaches `jsrsasign@11.1.5` and the known OCSP freshness issue remains the T03 gate. Native monitoring delivery, real Apple sandbox purchase/restore/renewal/refund/notification behavior, App Privacy answer reconciliation, corrected listing captures, and exact TestFlight/App Review packets are not complete. TestFlight, App Review, and release have not occurred.

**Required repair:** retain the September 25 verifier decision checkpoint; keep server processing off until a reviewed fix and acceptance evidence exist; execute T05/T07 on the signed disposable candidate/account under their exact gates; finish T09 against the exact archive; keep T10/T11 upload, distribution, submission, and release as separate owner approvals.

### P1-13 — Scheduled operations are missing

There is no configured Congress sync job. Daily Brief generation/delivery and account-deletion cleanup have protected task surfaces or source support but no active schedule. First-party privacy operations and monitoring remain intentionally off. A 60-second page-data cache is not a synchronization system.

**Required repair:** establish explicit ownership, authentication, idempotency, success/failure records, alerting, retry, maximum age, and a manual recovery path for each launch-required job before its feature is enabled. Keep disabled features and copy aligned until their schedule is proven.

## P2 findings

### P2-1 — Native origin and device-family coverage need a deliberate decision

`Info.plist` points the app to `https://project-qosv1.vercel.app`, while users and release evidence use `www.capitolwonk.com`. That creates separate cookie/origin identity and binds the native app to a provider hostname. The Xcode target supports iPhone and iPad plus portrait and landscape, while the web shell remains phone-width and some layouts use a simulated status bar.

Choose the stable custom-domain origin before the final archive and retest authentication, StoreKit bridge trust, external links, deletion fencing, cookies, and redirects. Either support the declared iPad/orientation matrix or narrow the target honestly. The empty launch-screen dictionary and missing app-owned privacy manifest should also be reconciled against the exact archive and SDK manifests.

### P2-2 — Loading, error, discovery, and metadata coverage is thin

Only Dashboard and member routes have route loading UI, only the global error boundary was found, and there is no custom not-found route. Most pages use generic metadata; bill/member pages lack useful dynamic titles and sharing data. No app manifest, robots, sitemap, or Open Graph image route was found beyond the application icon.

Add contained loading/error/empty states for slow core routes, a branded 404, dynamic bill/member metadata, and the web-discovery assets appropriate to the final public scope.

### P2-3 — Daily Brief, Map, and empty civic surfaces need scope labels

The Daily Brief truthfully says the first video is coming soon and outbound delivery is inactive. Map truthfully says geographic activity is unavailable, but it is currently a totals page rather than a map. Letters and petitions have honest empty/partner states. Decide which of these are launch features and give each an explicit unavailable/beta description so navigation does not imply completed functionality.

### P2-4 — Local verification is broad but shallow

Thirty-four focused `.mjs`/fixture checks passed across deletion readiness, bills, votes, billing transition, blank accounts, dashboard empty state, elections, feedback, gamification, iOS bridge, launch copy, docket, member surfaces, policy feeds, privacy, search, TestFlight UI, videos, and Brief behavior. Most are source-presence or deterministic fixture guards; there is no route-wide browser test suite, accessibility gate, visual regression suite, or formal test runner configuration.

A strict local TypeScript run under the available bundled Node 24 environment produced no output for more than five minutes and was stopped. The project pins pnpm 9.15.9 and prior CI used the expected runtime successfully, while the current workstation had no normal `node` on PATH, a pnpm 11 fallback warning, and a shared `node_modules` link. This is a reproducibility/tooling issue and means this audit does not claim a fresh complete type/lint/build pass at the current source head.

Add a pinned local bootstrap, restore a valid lint command for Next 15, and introduce a small high-value browser suite for auth isolation, bill/vote linkage, tracker stale state, search pagination, deletion fencing, contact confirmation, billing bridge, and accessibility.

### P2-5 — Repository onboarding documentation has drifted

The README remains demo-oriented and references npm despite the pinned pnpm package manager. Release truth is concentrated in dated handoffs and a large ledger. Refresh onboarding, local runtime, environment, scheduled-job, and release-check instructions after the P0/P1 candidate so a clean checkout can reproduce the documented gates.

## Positive controls to preserve

- Auth cookies are HTTP-only, SameSite Lax, Secure on Vercel Production, and scoped to `/`.
- Session/reset tokens use cryptographically random values and are stored as hashes; reset tokens expire and successful password reset invalidates sessions.
- Passwords use scrypt with random salts; password-reset responses avoid account enumeration.
- Demo authentication is disabled on Vercel deployments.
- Sensitive mutation routes generally enforce an allowed origin and authenticated account boundary.
- Billing transition code treats provider state as authoritative and keeps App Store server processing disabled until the verifier gate is satisfied.
- Account deletion and first-party privacy intake fail closed while their operational gates are off.
- The tracked-file secret scan found no credential pattern; the only private-key marker was a redacted documentation example. Only `.env.example` was tracked, with no `.p8`, `.pem`, `.p12`, key, or mobile-provisioning file.
- The public Congress raw response inspected during the audit contained normal bill/pagination/request fields and no API credential.
- H.R. 7008 Details now leads with the current official bill-text overview, retains the official CRS summary as its own dated source, shows August 6 Senate-calendar status, and does not imply final passage.
- Official profiles keep missing disclosure/ethics evidence visible and withhold numeric scores.
- Privacy/support pages truthfully expose the mailbox fallback while first-party intake is disabled.

## Route and workflow disposition

| Area | Current disposition | Launch requirement |
| --- | --- | --- |
| Sign-in/register/reset/session | Core controls sound; rate limiting, body caps, and personalized cache policy incomplete | P1 hardening plus regression |
| Dashboard/Home | Loads; data freshness and gamification labels undermine trust | Tracker and metric candidate |
| Search | Functionally broad; very large response/DOM and weak combobox semantics | Pagination, performance, accessibility |
| Live Docket/Risk/Priority | Stale snapshot labeled live; render timestamp; sponsors missing | Source-sync state, sponsor resolution, honest labels |
| Bill Details | H.R. 7008 current text/status/sponsor/back navigation verified | Cross-bill regression and feed integration |
| Votes | Stored detail mapping is coherent; Alerts misuse an unlinked vote | Remove false linkage; add linkage fixtures |
| Officials | Profiles load slowly; partial recent evidence; no viable score | Snapshot labels, persisted coverage, scoring stays off |
| Alerts | Critical false bill/vote action | P0 removal/rebuild |
| Civic Activity/Impact/Badges | Score arithmetic reconciles; window/streak/progress/badge semantics fail | P1 metric/persistence repair |
| Official contact/Letters | Prepared/sent distinction exists; manual path and cooldown are wrong | Native-safe path and sent-only cooldown |
| Petitions/Regulations | Current regulation windows load; partner-petition state is disclosed | Focused source/freshness regression |
| Privacy/deletion | Mailbox fallback truthful; deletion unavailable | P0 iOS launch gate and runbook proof |
| Subscription/Team | UI and fail-closed source exist; sandbox/provider evidence incomplete | T03/T07 evidence before distribution |
| Daily Brief/video | Honest placeholder; no first episode or delivery schedule | Explicit T08 launch-scope decision |
| Feedback/support | Delivery boundary is stated; feedback controls lack labels | Accessibility and runtime monitoring proof |
| Native wrapper | Signed build 2 installs; custom-domain origin/iPad/external-link QA open | T05–T07/T09 and device matrix |
| Release | No TestFlight/App Review/release action yet | All red gates green plus exact approvals |

## Ordered repair sequence

### Saturday, September 19 — minimum to remain on schedule

1. **Alerts P0:** remove all unlinked bill/vote fallbacks, suppress fabricated reminders, add focused fixtures, and verify Alerts/Alert Details empty and linked states in a matching phone-width Preview.
2. **Tracker truth:** change “Today/Live/Updated” to source-backed wording, add stored-sync/stale-state contract and sponsor map, then verify H.R. 7008 and at least two other bills.
3. **Bounded sync candidate:** implement the protected idempotent task, metadata persistence, retry/failure behavior, and saved-bill-outside-window handling locally. Do not activate a Production cron without its separate review/action gate.
4. **Gamification contract:** freeze all-time/month/action/streak/level/badge definitions and land deterministic formula and reachability checks. If time remains, implement the honest-label/formula slice.

**Saturday exit evidence:** false alert cannot be reproduced; all sampled docket sponsors resolve or say unavailable; displayed freshness comes from sync state; sync-task auth/retry fixtures pass; the gamification contract and checks are reviewable.

### Sunday, September 20 — minimum to remain on schedule

1. Complete the gamification candidate or keep the smaller honest fallback; verify new/existing accounts, same-day repeat, missed day, month rollover, sign-in persistence, and two-browser stale-write behavior.
2. Fix the sent-only official-contact cooldown and native-compatible external navigation; device-test the contact path without sending a real message unless separately authorized.
3. Add the baseline response headers, private/no-store personalized API policy, real form labels/search semantics, and one automated accessibility smoke.
4. Run a matching Preview at 390/402 px and the remaining installed-phone Dashboard, Search, Account, Privacy, Support, Alerts, and back-navigation matrix. Record exact source/build IDs and unresolved gates.

**Sunday exit evidence:** both Dashboard trust candidates have matching Preview results; no abandoned contact draft starts a cooldown; personalized responses are private/no-store; the core form/search accessible names pass; the remaining device matrix is an explicit pass/fail list.

### Monday recovery and launch path

1. Repair any failed weekend regression first.
2. Build the persisted Officials evidence/source-sync candidate with sample windows and zero/partial distinctions; keep numeric scoring disabled.
3. Paginate member search and measure the new server/DOM budget.
4. Finish the source-only T05/T09 evidence that is dependency-ready.
5. Preserve the September 25 T03 verifier decision checkpoint and every separate T05/T07/T09–T11 approval gate.

The two full weekend days can still support the September 25 checkpoint, but the prior schedule-lead claim is withdrawn until the Alerts P0 and both Dashboard trust candidates pass. October 30 remains possible only as a low-confidence target and should not be represented as launch-ready while these gates are red.

## Acceptance gate for the next candidate

Do not promote the next candidate unless all of the following are inspectable:

- no alert can combine records without an explicit verified relationship;
- bill freshness and sponsor claims are source-backed and stale-aware;
- gamification labels, formulas, streaks, badges, and persistence match stored evidence;
- official scoring remains off and partial evidence is labeled;
- personalized APIs are private/no-store, shared rate limits and body caps protect sensitive routes, and baseline browser headers pass;
- core forms/search have accessible names and keyboard behavior;
- account deletion has completed its production/device runbook before App Review;
- native origin, external navigation, monitoring, Apple sandbox, App Privacy, and verifier gates match the exact archive;
- exact-head type/lint/build, focused fixtures, matching Preview, and the installed-device matrix pass;
- Production merge/deployment, TestFlight, App Review, and release each receive their required separate approval.
