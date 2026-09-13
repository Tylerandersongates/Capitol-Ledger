# CapitolWonk Provider And Logging Static Audit — September 13, 2026

Status: **read-only source audit complete; two P1 response/error-boundary findings require source remediation or an explicit release disposition before the affected paths are activated. Runtime and protected-provider evidence remains open.**

This audit is bound to exact non-production source candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` on `codex/sept12-privacy-neon-candidate`. The application, configuration samples, native wrapper, and provider boundaries inspected here have no source changes between that candidate and the September 13 documentation head. Production remains the older source recorded in the [September 13 handoff](eod-handoff-2026-09-13.md); this audit does not represent the candidate as merged, deployed, migrated, activated, signed, device-tested, or released.

The companion [provider/PITR evidence register](backup-pitr-provider-retention-evidence-2026-09-11.md) remains authoritative for provider settings, retention, restore, and removal evidence. The [App Privacy and release-assets packet](app-privacy-release-assets-prep-2026-09-12.md) remains authoritative for provisional questionnaire classifications and exact-release evidence gates. This document narrows the remaining work by recording what source alone proves about direct application logging, Sentry capture, outbound provider payloads, webhook/task responses, and default enablement.

No application source, dependency, environment value, database, provider setting, webhook, task, message, App Store state, signing state, or production state was changed. No route, task, delivery, deletion, provider call, or runtime probe was executed.

## Scope And Evidence Standard

The audit inspected:

- direct `console.*` calls in application/runtime source;
- browser, server, edge, and native Sentry initialization and explicit capture calls;
- the shared telemetry scrubber;
- Resend, configurable email webhooks, official-contact delivery, Apple, Stripe, Congress.gov, Regulations.gov, GDELT, OpenAI, and YouTube boundaries;
- scheduled-task authentication and response shapes;
- tracked sample environment defaults and code-level feature gates; and
- token-bearing URL construction that may cross platform logging boundaries.

The conclusions below deliberately use three evidence classes:

1. **Source-closed:** the exact candidate proves the narrow statement without a runtime assumption.
2. **Source-open:** the exact candidate proves a behavior or defect that still needs a code change, test, or explicit release disposition.
3. **Runtime/protected open:** source cannot prove the deployed environment value, provider behavior, retained event fields, scheduler, delivery result, or destructive lifecycle outcome.

`.env.example` is a default/configuration sample, not evidence of Vercel Production or Preview values. Provider dashboard settings are not proof of payloads retained at runtime. Conversely, absence from a provider dashboard does not prove that application source cannot call that provider when a protected value or exact mode is supplied.

## Prioritized Result

| Priority | Finding | Source disposition | Required release disposition |
| --- | --- | --- | --- |
| P1 | Weekly Brief task returns per-user email, personalized summary, and error text | Source-open | Return aggregate/coded results before scheduled delivery activation |
| P1 | Legacy Stripe paths preserve raw provider response bodies; portal returns one to the client | Source-open | Normalize provider errors before continued legacy use |
| P1/P2 | Apple SDK causes can retain raw detail and candidate routes have no explicit runtime-off switch | Source-open plus runtime open | Reconcile gate/cause handling before Batch B; Apple/runtime proof remains blocked |
| P2 | Direct application `console.*` calls are generic/minimized | Source-closed for direct calls only | Preserve; obtain platform/runtime evidence separately |
| P2 | Web Sentry configuration is minimized, but free text and native/runtime fields remain provider boundaries | Partly source-closed; runtime open | Preserve web controls and obtain sanitized web/native event evidence |
| P2 | Email/webhook payload categories are identifiable and sometimes include tokens or arbitrary user content | Source-closed inventory; runtime open | Confirm exact modes/providers and removal/retention before enabling each path |
| P2 | Rate limiting is process-local despite tracked Upstash placeholders | Source-closed behavior; release decision open | Decide on provider-backed enforcement before abuse-sensitive delivery is enabled |
| P3/conditional | Public-data and conditional AI/video provider boundaries are bounded in source | Mostly source-closed; runtime open | Reconcile exact enablement and retained provider data at release |
| P2 | Verification, reset, invite, and task context can appear in URLs | Source-closed behavior; runtime open | Prove platform logs exclude sensitive query values or change the transport |

## Finding 1 — P1: Weekly Brief Task Response Contains Per-User Data

### Source evidence

`lib/weekly-brief-delivery-runner.ts:37-52` defines `WeeklyBriefDeliveryRunResult.records` with:

- recipient `email`;
- optional provider `error` text;
- optional personalized Brief `summary`; and
- delivery mode and status.

The runner adds those values for dry runs at `lib/weekly-brief-delivery-runner.ts:218-223`, provider failures at `lib/weekly-brief-delivery-runner.ts:242-248`, ordinary delivery/preparation at `lib/weekly-brief-delivery-runner.ts:269-274`, and outer failures at `lib/weekly-brief-delivery-runner.ts:275-282`. It returns the full `records` array at `lib/weekly-brief-delivery-runner.ts:286-296`. `app/api/tasks/weekly-brief/route.ts:50-52` returns that result as JSON.

The route uses a timing-safe task-secret comparison and fails closed in production when no secret is configured at `app/api/tasks/weekly-brief/route.ts:24-35`. The tracked sample keeps delivery disabled and the task secret blank at `.env.example:63-67`.

### Disposition

- **Source-open:** a caller possessing the task secret receives per-user email addresses, personalized headlines, and possibly exception text. Dry-run is not an aggregate-only monitoring response.
- **Required source correction before activation:** return aggregate counts and stable coded failure categories only. Do not include recipient addresses, personalized content, provider bodies, or raw exception messages in the HTTP task response. If per-user operational state is required, keep a minimized access-controlled record outside the task response and define its retention.
- **Runtime/protected open:** exact deployed delivery mode, task-secret presence, scheduler presence, endpoint callers, access-log retention, and real provider response behavior are not proved here. Invoking the task would require protected authorization and separate approval; non-dry-run delivery can persist and send.

## Finding 2 — P1: Legacy Stripe Preserves Raw Provider Response Text

### Source evidence

`lib/billing/stripe.ts:89-102` parses a Stripe response but deliberately preserves the raw response body or provider message in `StripeRequestError`. Raw `response.text()` values are thrown from:

- billing portal creation at `lib/billing/stripe.ts:178-180`;
- subscription lookup at `lib/billing/stripe.ts:297-300`;
- customer subscription lookup at `lib/billing/stripe.ts:321-324`;
- paginated customer subscription lookup at `lib/billing/stripe.ts:359-363`;
- plan-specific lookup at `lib/billing/stripe.ts:404-407`; and
- subscription update at `lib/billing/stripe.ts:436-439`.

`app/api/account/subscription/portal/route.ts:49-65` catches a portal error and returns the exception message in `missingConfiguration` to the authenticated client. Uncaught errors elsewhere can also reach the automatic Sentry request-error boundary exported at `instrumentation.ts:13`.

The sample documents Stripe as legacy maintenance only and leaves the secret, webhook secret, and price IDs blank at `.env.example:92-99`. Checkout is retired in source; this does not establish whether legacy production records or protected Stripe values still exist.

### Disposition

- **Source-open:** provider-controlled error text crosses the application error boundary. The audit does not claim a particular Stripe response currently contains personal data, but its content is uncontrolled and may contain provider identifiers or request context.
- **Required source correction before continued legacy use:** parse only the stable HTTP status and allowlisted Stripe code needed for control flow. Map all client responses, stored errors, and Sentry-visible exceptions to stable application-owned messages. Do not return provider bodies in `missingConfiguration`.
- **Runtime/protected open:** exact Stripe secret/webhook presence, legacy record count, provider response content, Sentry serialization, and subscription lifecycle behavior require protected inspection. Live portal, subscription, webhook, cancellation, or cleanup exercises are provider mutations and require separate approval.

## Finding 3 — P1/P2: Apple Error Causes And Runtime Enablement Are Not Fully Gated

### Source evidence

`lib/billing/app-store-server.ts:72-79` supports attaching an underlying SDK exception as an error `cause`. `lib/billing/app-store-server.ts:169-174`, `lib/billing/app-store-server.ts:327-357`, and other verifier wrappers preserve those causes while presenting an application-owned top-level message. Public route branches generally normalize expected errors, but an unhandled cause can still reach automatic Sentry request-error capture.

The candidate has no `APP_STORE_SERVER_ENABLED`-style runtime gate. `.env.example:89-90` includes `BILLING_REQUIRE_APP_STORE` and `TESTFLIGHT_REQUIRE_READY`, but repository use of those variables is confined to readiness commands/scripts; they do not guard the runtime routes. Runtime Apple behavior instead depends on route invocation, authentication where applicable, App Store Connect notification configuration, and the protected server values read at `lib/billing/app-store-server.ts:89-125`.

The notification route itself has strong source-level minimization:

- maximum body size is 128 KiB at `app/api/billing/app-store/notifications/route.ts:30-65`;
- the parser accepts only `signedPayload` at `app/api/billing/app-store/notifications/route.ts:68-83`;
- the persisted receipt uses a SHA-256 payload hash and bounded notification metadata rather than the raw signed JWS at `app/api/billing/app-store/notifications/route.ts:102-144`; and
- public errors and acknowledgements are generic.

The authenticated subscription-sync route caps requests at 64 KiB and validates the signed JWS/source-action types at `app/api/account/subscription/app-store/route.ts:107-154`.

### Disposition

- **Source-closed positive boundary:** raw App Store notification JWS is not directly logged or persisted by the inspected route; the receipt stores its hash plus selected metadata.
- **Source-open:** decide whether Batch B needs a separate exact runtime enablement switch rather than relying on missing configuration and an unset App Store Connect notification URL. Prevent raw SDK cause data from being serialized to Sentry unless it has been explicitly reduced to allowlisted fields.
- **Runtime/protected/Apple open:** exact server values, App Store Connect notification URL, decoded SDK fields, actual Sentry serialization, signed archive behavior, sandbox lifecycle, and device behavior remain unproved. Apple issue #447 and the signing/device freeze described in the handoff still block activation and native proof.

## Finding 4 — P2: Direct Application Console Logging Is Minimized

### Source evidence

The application/runtime source contains seven direct `console.*` call sites:

- `lib/account-deletion.ts:173` — fixed post-commit cache-cleanup message plus a label selected from a fixed internal list;
- `lib/account-deletion.ts:660` — generic queued-provider-cleanup warning;
- `lib/account-deletion-cleanup.ts:349` — generic retention retry message;
- `lib/account-deletion-cleanup.ts:363` — generic cleanup retry message;
- `lib/team-subscription-transition.ts:478` — generic Stripe compensation failure message;
- `lib/account-persistence-safety.ts:22` — fixed prefix plus an internal operation scope; and
- `app/api/account/deletion-request/route.ts:88-90` — fixed deletion failure message with only the error class name.

None of those calls directly emits an email, user ID, token, message body, provider/customer/subscription/transaction ID, request/response body, database URL, secret, or full exception. `prisma/seed.ts` and the build, audit, synchronization, QA, and fixture scripts are operator/development entry points and are not counted as deployed application request logging.

### Disposition

- **Source-closed:** direct application-owned console logging is minimized for the exact candidate.
- **Runtime open:** this says nothing about Next.js/framework logs, Vercel request/runtime logs, fetch instrumentation, provider SDK diagnostics, edge logs, browser console extensions, or log-drain behavior. Sanitized retained samples are still required before privacy sign-off.

## Finding 5 — P2: Web Sentry Is Minimized; Feedback And Native Fields Remain Boundaries

### Source evidence

Browser Sentry is DSN-gated and configures `beforeBreadcrumb`, `beforeSend`, zero replay sampling, `includeReplay: false` for submitted feedback, `sendDefaultPii: false`, and zero tracing at `instrumentation-client.ts:4-16` and `components/feedback-form.tsx:48-63`.

Server Sentry removes the default HTTP and request-data integrations, restores bounded HTTP capture with no incoming request body, and excludes cookies, body data, IP, and query string at `sentry.server.config.ts:4-20`. Edge Sentry applies the same request-data exclusions at `sentry.edge.config.ts:4-20`.

`lib/privacy-telemetry.ts:29-42` removes URL queries/fragments and filters Bearer and credential-shaped text. `lib/privacy-telemetry.ts:45-79` masks sensitive field names recursively and bounds deep objects. `lib/privacy-telemetry.ts:90-125` removes request data/query and sanitizes headers, URLs, breadcrumbs, contexts, exception values, extras, messages, and tags.

The in-app feedback form intentionally sends optional contact email and full user-authored title/body to Sentry, along with source tags and a query-free page URL, at `components/feedback-form.tsx:48-63`. `app/global-error.tsx:7-10` explicitly captures client errors, and `instrumentation.ts:13` captures server request errors. The text scrubber does not blanket-remove arbitrary email addresses or arbitrary user prose from exception messages.

Native Sentry starts only when a nonblank, non-placeholder DSN resolves and sets `sendDefaultPii = false` and zero tracing at `ios/CapitolLedgerNative/CapitolLedgerNative/CapitolLedgerApp.swift:7-19`. The tracked Xcode build setting is blank at `ios/CapitolLedgerNative/CapitolLedgerNative.xcodeproj/project.pbxproj:277` and `:306`; `Info.plist` references the protected build setting rather than storing a DSN at `ios/CapitolLedgerNative/CapitolLedgerNative/Info.plist:7-8`.

### Disposition

- **Source-closed:** web request body/cookie/query/IP capture is disabled in application Sentry configuration; replay, default PII, and tracing are disabled; application URLs are query/fragment stripped before explicit telemetry submission.
- **Intentional provider boundary:** feedback title/body and optional email are user-provided content deliberately sent to Sentry. They must remain classified as provider-retained feedback rather than scrubbed diagnostic metadata.
- **Runtime/protected open:** actual web event fields, provider retention/removal, framework-added fields, Apple SDK cause serialization, native installation/device identifiers, crash/performance/hang fields, environment routing, and the one native event remain unproved. The native event requires the signed/device prerequisites preserved by the handoff.

## Finding 6 — P2: Email And Configurable Webhooks Carry Identified Personal Data

### Source evidence

The shared Resend client posts recipient, sender, subject, and complete email text with a Bearer key at `lib/resend-email.ts:22-38`. On failure it exposes only HTTP status, not the response body, at `lib/resend-email.ts:40-45`.

Auth email payloads include recipient email/name and a verification or password-reset URL containing the token at `lib/auth-email.ts:74-127`. Resend and webhook modes are selected at `lib/auth-email.ts:130-179`; webhook mode sends the entire payload and optional secret. Production manual-link exposure occurs only for the explicit `manual_demo` mode; otherwise the production fallback omits the action URL at `lib/auth-email.ts:61-63` and `:181-185`.

Team invitation payloads include recipient email, inviter name/email, workspace name, role, and token-bearing invite URL at `lib/team-invite-email.ts:39-78`. Team invitation delivery uses its own mode or inherits the auth mode and can send the complete payload to Resend or a configurable webhook at `lib/team-invite-email.ts:81-157`.

Weekly Brief Resend/webhook delivery sends recipient email/name, full personalized Brief snapshot, subject, and rendered text at `lib/weekly-brief-delivery-runner.ts:101-158`.

The official-contact webhook is enabled only by exact `OFFICIAL_CONTACT_DELIVERY=webhook` at `app/api/members/[bioguideId]/email/route.ts:28-33`. When enabled, it sends arbitrary user-authored message text, sender email/name/user ID, subject, and member metadata at `app/api/members/[bioguideId]/email/route.ts:114-148`. The default/manual response returns a composed `mailto:` URL to the requesting client and records a bounded message preview; the response is at `app/api/members/[bioguideId]/email/route.ts:180-212`, and the preview is bounded to 170 characters at `lib/official-contact-messages.ts:122-125`.

The tracked sample keeps auth and Weekly Brief delivery disabled and all related webhook values blank at `.env.example:58-67`. It does not list official-contact webhook settings; source therefore defaults that path to manual unless the exact production mode is supplied outside tracked source.

### Disposition

- **Source-closed:** payload categories, mode-selection rules, and status-only Resend/webhook error handling are identifiable. The inspected email clients do not include provider response bodies in their thrown errors.
- **Runtime/protected open:** exact delivery modes, webhook URLs/owners, secrets, sender configuration, sent content, provider logs, retention, backup, deletion/removal, forwarding, and recipient delivery cannot be closed from source. Existing settings evidence does not replace an approved end-to-end delivery exercise.
- **Approval boundary:** do not send an auth, Brief, invitation, official-contact, or forwarding test without separate authorization and an assigned synthetic recipient/message plan.

## Finding 7 — P2: Rate Limiting Is Process-Local

### Source evidence

`lib/request-security.ts:20-21` stores counters in a process-local global `Map`. Client IP and optional subject are normalized through SHA-256 at `lib/request-security.ts:55-63`; the stored key combines only scope and those hashes at `lib/request-security.ts:94-125`.

`.env.example:100-101` includes empty Upstash URL/token placeholders, and the readiness script describes them as optional future hardening, but application/runtime source does not consume either variable.

### Disposition

- **Source-closed:** no external rate-limit provider receives client/subject data in this candidate, and raw IP/email values are not retained in the in-process counter key.
- **Release decision open:** process-local counters do not provide consistent cross-instance enforcement. This is particularly relevant before enabling unauthenticated official-contact webhook delivery or other abuse-sensitive paths.
- **Runtime/protected open:** instance topology, edge/platform protections, and any provider-level abuse controls are not established by source. Adding a persistent provider would create a new data/retention boundary and needs separate design and approval.

## Finding 8 — P3/Conditional: Public Data, AI, And Video Providers Are Bounded In Source

### Source evidence

Congress.gov authentication is placed in the request query string at `lib/congress/client.ts:33-48`. Application-owned error messages use only the internal requested path and status at `lib/congress/client.ts:62-73`; they do not repeat the constructed URL or key.

Regulations.gov authentication uses `X-Api-Key`, and application-owned errors are generic at `lib/regulations-gov.ts:67-72` and `lib/regulations-gov.ts:155-203`.

GDELT is enabled unless explicitly set to `false` at `lib/gdelt/client.ts:114-132`; `.env.example:42-46` sets it to `true`. User interests select from fixed policy lanes, and the outbound query contains the lanes' fixed public terms rather than raw user prose at `lib/gdelt/client.ts:135-156` and `lib/gdelt/client.ts:233-265`. Normalized interests are used in an in-process cache key at `lib/gdelt/client.ts:282-304`.

Live OpenAI bill analysis requires the exact `openai` provider mode plus an API key and caller enablement at `lib/ai-bill-analysis-agent.ts:116-134`. The request contains the application instruction and official/public bill source packet, not account profile, search, feedback, or message content, and provider failure returns the local fallback at `lib/ai-bill-analysis-agent.ts:290-352`. The sample selects `fallback` and leaves the key blank at `.env.example:102-106`.

The Daily Brief video catalog has a verified channel URL and an empty episode array at `content/daily-brief-videos.json:1-4`. `lib/daily-brief-video.ts:58-76` constructs a `youtube-nocookie.com` embed only when a valid published episode exists. Therefore the exact candidate has no player/embed request on the channel-only state; following Subscribe remains an explicit outbound navigation.

### Disposition

- **Source-closed:** provider payload categories and candidate defaults are bounded as described. The current video catalog does not render an embedded YouTube player. The inspected OpenAI path does not send user/account content.
- **Runtime/protected open:** exact Congress/Regulations/OpenAI keys and enablement, outbound URL logging, provider retention, GDELT production behavior, and future YouTube player behavior require exact-release evidence. Because the Congress key is in a query string, application Sentry sanitization is not enough to prove that platform/fetch instrumentation never retains it.
- **Change trigger:** adding a real video, changing the AI input, enabling another model/provider, or adding analytics requires a new exact-payload audit.

## Finding 9 — P2: Sensitive Tokens And Search Context Cross URL Boundaries

### Source evidence

Verification and password-reset action URLs put their token in the `/sign-in` query string at `lib/auth-email.ts:74-79`; the page reads `resetToken` and `verifyToken` at `app/sign-in/page.tsx:15-28`. Team invitation URLs put the invite token in `/team/accept?token=...` at `lib/team-invite-email.ts:39-42`, and the acceptance page reads it at `app/team/accept/page.tsx:24-26`.

The Team invitation API returns `inviteLink` to the authenticated manager whenever `actionUrl` is present at `app/api/team/invites/route.ts:136-165`. `deliverTeamInviteEmail` currently includes that URL for Resend, webhook, manual-demo, and disabled modes at `lib/team-invite-email.ts:103-157`. This is an authorized manager response, not a demonstrated cross-account disclosure, but exposing it client-side is unnecessary in modes that already deliver it externally.

Application search terms use ordinary `q` query parameters at `app/search/page.tsx:126-139`, `app/api/search/route.ts:5-17`, and `app/api/search/suggest/route.ts:5-8`. Task controls such as `limit` and `dryRun` also accept query parameters at `app/api/tasks/weekly-brief/route.ts:42-49`; task credentials themselves are read from headers, not the query string, at `app/api/tasks/weekly-brief/route.ts:10-15` and `app/api/tasks/account-deletion-cleanup/route.ts:9-13`.

`lib/privacy-telemetry.ts:29-42` removes query/fragment values from application-controlled Sentry URLs and textual URL occurrences.

### Disposition

- **Source-closed:** application Sentry sanitization removes query/fragment values, and task secrets are header-only in the inspected routes.
- **Source-open hardening:** consider returning the Team invite link only for an explicitly approved manual mode, not after successful Resend/webhook delivery.
- **Runtime open:** source cannot prove that Vercel access/runtime logs, edge/framework logs, browser history, referrers, or provider instrumentation never observe the original verification/reset/invite/search URL. Sanitized retained samples or a transport redesign are required before closing the privacy-log row.

## Positive Response And Failure Boundaries

The following narrow statements are source-closed for this candidate:

1. **Account-deletion cleanup task:** production fails closed without a task secret, compares configured/request secrets timing-safely, and returns only aggregate result counts at `app/api/tasks/account-deletion-cleanup/route.ts:21-38` and `lib/account-deletion-cleanup.ts:335-374`.
2. **Privacy retention sweep:** it performs no reads or writes unless the exact retention switch is `true`; legacy feedback requires a second switch, and its result contains only counts/booleans at `lib/privacy-retention.ts:177-217`.
3. **Apple notification receipt:** request size is bounded, the raw signed payload is neither directly logged nor persisted by the inspected route, and the receipt stores a hash plus bounded metadata.
4. **Resend and configured email webhooks:** inspected application errors expose HTTP status or an application-owned generic message, not response bodies.
5. **Auth production fallback:** verification/reset action URLs are not returned by `deliverAuthEmail` in production unless the explicit `manual_demo` mode is selected.
6. **Direct console calls:** no inspected deployed application call directly logs personal content, credentials, provider identifiers, response bodies, or full exceptions.
7. **OpenAI bill analysis:** sample mode is local fallback, and the conditional live request is limited to the official/public bill packet.
8. **YouTube:** the exact checked-in catalog contains no episode, so no player iframe is constructed in the channel-only state.

These are source findings only. They do not close scheduler state, protected environment values, framework logs, provider retention, actual webhook destinations, signed/native behavior, delivery, restore/removal, or destructive lifecycle evidence.

## Candidate Defaults Versus Known Runtime Evidence

| Area | Tracked sample/default | What source proves | What remains protected/runtime open |
| --- | --- | --- | --- |
| Database/public reads | Database URL is a localhost sample; public reads flags are `false` | Public read path requires explicit enablement; account persistence uses any configured database URL | Exact deployed target/value and retained query/runtime logs |
| GDELT | Enabled | Fixed-lane public query; normalized interests only in process cache | Deployed value, provider request/retention evidence |
| Auth email | Disabled; webhook blank | Resend/webhook/manual behavior and payload shape | Exact Production mode, delivery result, provider retention/removal |
| Weekly Brief | Disabled; webhook/task secret blank | Full personalized outbound payload; P1 task-response issue | Exact mode/scheduler/secret and any real sends |
| Account deletion | Disabled | Default-off application gate; cleanup task is secret-protected | Migration/deployment/activation, worker, provider cleanup, destructive QA |
| Privacy intake/retention | Disabled | Both require exact switches; retention result is aggregate | Migration/deployment/activation, owner operations, monitoring, lifecycle proof |
| Apple | Server credentials blank; readiness flags false | Runtime routes are not guarded by readiness flags | Protected values, notification URL, issue #447, signing/device/sandbox proof |
| Stripe | All values blank; legacy maintenance only | Legacy API/webhook code remains callable when configured; raw-body issue exists | Protected values, legacy records, live lifecycle/removal |
| Rate limiting | Upstash placeholders blank | Process-local hashed Map only | Deployment topology and final provider-backed decision |
| AI | Fallback; OpenAI key blank | Live request requires exact mode + key and sends public bill packet | Exact deployed mode, provider retention |
| Web Sentry | DSNs/build values blank | Source scrubber/request exclusions/replay and PII settings | Actual deployed fields, retention, native event and identifiers |
| YouTube | Channel configured; episodes empty | No embedded player in current catalog state | Future episode/player privacy and device evidence |

The [September 13 handoff](eod-handoff-2026-09-13.md) records that candidate `92b61b9` remains isolated and unmerged and Production remains `7ec68bc`. The provider/PITR register records current settings evidence for Neon, Vercel, Sentry, and Resend. Neither source defaults nor settings screenshots independently establish exact runtime behavior.

## Required Next Actions And Gates

### Safe local work

1. Prepare a narrow code/test proposal that removes per-user `records` from the Weekly Brief task response.
2. Prepare a narrow code/test proposal that maps all Stripe failures to stable internal codes and public messages without raw response bodies.
3. Decide whether the Apple candidate needs an explicit runtime-off switch and define an allowlist-only SDK error representation for Sentry.
4. Reconcile Team invite-link exposure against the intended manual-versus-delivered UX.
5. Add static regression assertions for direct console payloads, task response schemas, provider-body handling, and token query sanitization.

Those actions require an implementation authorization before source changes. They do not require Apple Support, production access, protected values, or provider mutation.

### Protected/runtime evidence

The following cannot be closed locally:

- exact Vercel environment modes and task schedules without displaying values;
- sanitized Vercel/Sentry retained event samples showing that queries, tokens, messages, provider bodies, and identifiers are absent;
- actual Resend/forwarding or other webhook delivery and provider retention/removal behavior;
- legacy Stripe inventory and live API/webhook behavior;
- App Store Connect notification configuration and Apple provider/runtime behavior; and
- native Sentry/device fields on the exact signed candidate.

Read-only protected inspection still needs an exact evidence scope. Test delivery, provider mutation, task invocation, database write, subscription lifecycle, deletion, cleanup, signing, device, upload, submission, and release actions each retain their separate approval boundaries.

## Release Conclusion

The exact candidate's own console statements, core web Sentry request exclusions, cleanup-task response, retention default-off gate, Apple notification receipt storage, Resend error handling, fallback-only OpenAI default, and no-player YouTube state are appropriately minimized in source.

The Weekly Brief task response and raw Stripe error-body propagation are concrete source findings and should not be left as chat-only observations. They require correction or a documented decision that keeps the affected paths inactive. Apple cause handling and runtime gating should be reconciled before Batch B, while Apple signing, device, sandbox, and native-runtime proof remain frozen behind the existing external dependency. Exact runtime logs, protected environment modes, and provider-retention behavior remain evidence gaps and must not be inferred from this static audit.
