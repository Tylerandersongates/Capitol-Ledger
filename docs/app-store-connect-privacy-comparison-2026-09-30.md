# CapitolWonk App Store Connect Privacy Comparison — September 30, 2026

Status: **source-only comparison worksheet; remote answers not re-read in this pass.** The last repository evidence is the September 10 read-only snapshot with nine disclosed data types and no Diagnostics entries. The current App Store Connect cells below must be completed from a fresh read-only session before this worksheet can support an exact remote proposal. Nothing here authorizes questionnaire publication, provider activation, build upload, submission, or release.

This worksheet applies to the **November 16, 2026 soft-launch candidate**. Re-run it for the January 3, 2027 full-launch candidate only if the selected archive, SDKs, providers, data purposes, account behavior, or runtime collection changes. A 119th-to-120th Congress data cutover alone does not require a privacy-answer change.

## Evidence boundary

- The [September 10 correction packet](app-store-privacy-correction-2026-09-10.md) records the nine-type remote snapshot and the provisional five additions.
- The [T09 privacy and release-assets packet](app-privacy-release-assets-prep-2026-09-12.md) records the selected evidence gaps and the September 16 local build `2` archive inspection.
- That archive embeds Sentry Cocoa `9.22.0`; its privacy manifest declares Crash Data, Performance Data, and Other Diagnostic Data for App Functionality with tracking and linkage set to false. The archive report and native delivery sample remain missing.
- The provisional proposal below remains conservative: Device ID and all three diagnostic types stay linked while persistent installation/device identifiers may be attached to native events. Change linkage only after exact-candidate runtime evidence proves those identifiers absent.
- The launch privacy-intake path is the dedicated mailbox. First-party intake, operator, monitoring, retention, deletion, and adapter paths remain off and conditional post-launch.
- Tracking remains No only while advertising, cross-company tracking, live embedded video, product analytics, and other newly enabled provider paths remain absent.

## October 11 source-path evidence inventory

This inventory is anchored to repository source `7ca64a1e95bbcdcb645166746f39d3be268fff12`. It records what the selected web source can establish before the App Store Connect session and exact native archive are available. Source presence alone does not prove that a path runs in the launch candidate, what a provider receives, how long a provider retains data, or what the current remote questionnaire says.

| Provisional privacy group | Current source paths | What the source establishes | Proof still required before publication |
| --- | --- | --- | --- |
| Contact Info — Name and Email Address; Identifiers — User ID | `prisma/schema.prisma`; `lib/account-database.ts`; `lib/auth.ts` | Account identity, authentication sessions, profile fields, and account-owned records are represented in the persistence layer. | Exact-candidate runtime path, provider payloads, retention/deletion behavior, and fresh remote answers. |
| Location — Coarse Location; Sensitive Info | `prisma/schema.prisma`; `lib/account-database.ts`; `components/search-setup-chips.tsx` | Optional state, district, party affiliation, and issue-interest values can be saved for official matching and personalization. | Confirm which values leave the device, which providers receive them, and the exact purposes enabled in the candidate. |
| Purchases — Purchase History | `prisma/schema.prisma`; `prisma/migrations/20260911110000_app_store_server_state/migration.sql`; `lib/account-database.ts` | Product, transaction, purchase/revocation timing, subscription, and entitlement identifiers have persistence paths. | T07 sandbox evidence, exact archive behavior, Apple/provider payload review, and activation-state confirmation. Processing gates remain off. |
| Usage Data — Product Interaction | `prisma/schema.prisma`; `lib/account-database.ts`; `lib/account-ledger.ts`; `components/search-setup-chips.tsx` | Follows, saved/read alerts, interests, preferences, badges, streaks, and other account actions have local or server persistence paths. | Exact-candidate runtime sampling, provider-path review, retention/deletion evidence, and fresh remote purposes. |
| User Content — Customer Support and Other User Content | `components/feedback-form.tsx`; `app/feedback/page.tsx`; `prisma/migrations/20260527103000_beta_feedback/migration.sql`; `prisma/migrations/20260614143000_team_workspace_phase_2/migration.sql` | Voluntary feedback can include a title, message, optional email, sanitized page URL, and technical context; team schemas represent workspace, membership, and invitation content. | Confirm enabled launch surfaces, Sentry payload and retention, team launch scope, storage behavior, and remote answers. |
| User Content — Emails or Text Messages | `prisma/schema.prisma`; `lib/official-contact-messages.ts`; `prisma/migrations/20260910150000_account_deletion_integrity/migration.sql` | The official-contact path processes sender identity, subject, message preview, recipient context, and delivery history. | Confirm exact-candidate enablement, delivery-provider payload, full-message handling, retention/deletion behavior, and the proposed remote addition. |
| Diagnostics — Crash Data, Performance Data, and Other Diagnostic Data | `instrumentation-client.ts`; `instrumentation.ts`; `sentry.server.config.ts`; `sentry.edge.config.ts`; `app/global-error.tsx`; `components/feedback-form.tsx` | Web Sentry setup captures errors and voluntary feedback. Default PII and replay are disabled; server and edge request-data configuration excludes cookies, bodies, IP addresses, and query-string fields while allowing headers and URL. | Exact web and native event samples, header and URL sanitization proof, aggregate archive privacy report, provider retention, and T05 native delivery evidence. |
| Usage Data — Search History, conditional | `components/discovery-search-form.tsx`; `sentry.server.config.ts`; `sentry.edge.config.ts`; `lib/privacy-telemetry.ts` | Discovery search uses a `q` URL parameter. Sentry request-data configuration excludes its query-string field, but source inspection alone cannot prove that every URL, hosting log, drain, or provider path strips search terms. | Runtime URL/event samples plus hosting, drain, and provider retention evidence. Reclassify if retained search terms are observed. |
| Privacy-request operating path | `app/privacy/request/page.tsx`; `components/privacy-request-form.tsx`; `lib/privacy-request-activation.ts`; `lib/privacy-requests.ts` | The database-backed queue is environment-gated and the page reports it as disabled when the gate is off. | Keep the queue, operators, monitoring, retention, deletion, and adapters inactive; verify the dedicated mailbox procedure and public copy for the selected candidate. |

No source path in this table replaces the required fresh read-only App Store Connect inventory or the exact-candidate provider and runtime evidence.

## Field-by-field comparison

`Pending re-read` is an intentional stop marker, not an inferred remote value.

| App Store Connect category / data type | September 10 repository snapshot | Current remote answer | Provisional November action | Purpose | Linked | Tracking | Evidence or remaining gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Contact Info — Name | Present | Pending re-read | Retain | App Functionality | Yes | No | Account/profile identity, invitations, authentication messages, and optional delivery features; confirm selected candidate paths. |
| Contact Info — Email Address | Present | Pending re-read | Retain | App Functionality | Yes | No | Authentication, account email, support, invitations, and official-contact sender identity; reconcile mailbox-only privacy intake. |
| Identifiers — User ID | Present | Pending re-read | Retain | App Functionality | Yes | No | Sessions and account-owned records; exact candidate and provider payloads still need reconciliation. |
| Identifiers — Device ID | Absent | Pending re-read | Add if current SDK behavior remains | App Functionality | Yes | No | Sentry Cocoa resolved source may create a persistent installation ID and device/app hash; T05 native payload proof remains open. |
| Location — Coarse Location | Present | Pending re-read | Retain | App Functionality; Product Personalization | Yes | No | State and district support official matching and personalization; confirm only coarse values leave the device. |
| Sensitive Info | Present | Pending re-read | Retain | App Functionality | Yes | No | Optional party affiliation and potentially political-interest/account content; confirm final account fields and purposes. |
| Purchases — Purchase History | Present | Pending re-read | Retain | App Functionality | Yes | No | Apple product, transaction, renewal, status, ownership, and entitlement records; bind to T07 sandbox evidence. |
| Usage Data — Product Interaction | Present | Pending re-read | Retain | App Functionality; Product Personalization | Yes | No | Saved items, interests, alert state, preferences, badges, streaks, and civic actions; confirm final persistence model. |
| User Content — Customer Support | Present | Pending re-read | Retain | App Functionality | Yes | No | Voluntary reports may contain title, message, optional email, page, and technical context; verify provider payload and retention. |
| User Content — Other User Content | Present | Pending re-read | Retain | App Functionality | Yes | No | Team workspace and collaboration content; verify selected launch scope and storage behavior. |
| User Content — Emails or Text Messages | Absent | Pending re-read | Add if official-contact behavior remains | App Functionality | Yes | No | Official-contact flow processes subject, message, sender, and recipient and retains delivery history; confirm exact candidate. |
| Diagnostics — Crash Data | Absent | Pending re-read | Add if native monitoring remains | App Functionality | Yes | No | Embedded SDK manifest declares the type; exact archive report and native event sample are still required. |
| Diagnostics — Performance Data | Absent | Pending re-read | Add if SDK declaration or runtime collection remains | App Functionality | Yes | No | App-hang/watchdog behavior is unverified; keep until exact-candidate evidence proves absence. |
| Diagnostics — Other Diagnostic Data | Absent | Pending re-read | Add if web/native monitoring or voluntary reports remain | App Functionality | Yes | No | Non-crash errors and device, OS, build, page, and optional report context require sanitized payload review. |

## Conditional answers outside the fourteen-type proposal

| Field | Provisional answer | Stop condition before publication |
| --- | --- | --- |
| Location — Precise Location | No | Change if coordinates leave the device or are retained by CapitolWonk or a provider. |
| Financial Info — Payment Info | No | Change if CapitolWonk or a non-Apple provider receives payment-instrument details rather than purchase/entitlement records. |
| Usage Data — Advertising Data | No | Change before enabling advertising, cross-company targeting, or data-broker use. |
| Usage Data — Search History | No, conditional | Reclassify if application, hosting, drain, or monitoring evidence shows retained search terms or query strings. Authentication secrets must be scrubbed rather than disclosed. |
| Analytics purpose | Do not select, conditional | Reassess if product analytics, tracing, replay, or another analytics use is enabled. |
| Tracking | No, conditional | Reassess before a live embedded player, advertising SDK, ATT/IDFA path, or cross-company tracking use is enabled. |

## Exact-candidate reconciliation checklist

- [ ] Re-read every current App Store Connect data type, purpose, linkage answer, and tracking answer without publishing; replace every `Pending re-read` cell with the observed value and date.
- [ ] Record the selected native build/archive identity and web source SHA without committing protected identifiers.
- [ ] Extract and review the aggregate privacy report from that exact archive; reconcile every embedded manifest and required-reason API.
- [ ] Obtain T05's bounded native Sentry delivery evidence for identifiers, crash fields, performance/app-hang fields, URLs, user data, and geography.
- [ ] Reconcile WKWebView, server, Vercel, Sentry, Neon, email/webhook, official-contact, Apple, legacy Stripe, video, AI, and any analytics path actually enabled in the candidate.
- [ ] Confirm search terms, query fragments, reset/invite/task tokens, messages, and provider response bodies are absent from retained logs and events.
- [ ] Verify the dedicated-mailbox identity, fulfillment, retention, deletion, owner-absence, and provider procedure without implying that the disabled first-party queue operates.
- [ ] Recheck public `/support`, `/privacy`, and `/privacy/request` copy against the selected candidate.
- [ ] Present the completed observed-versus-proposed delta and supporting evidence to Tyler for the exact publication decision.

## Current proposed delta, subject to the checklist

If the fresh remote read still matches the September 10 nine-type snapshot and the selected candidate retains the audited behavior, the proposed delta is five additions: **Identifiers — Device ID; User Content — Emails or Text Messages; Diagnostics — Crash Data; Diagnostics — Performance Data; and Diagnostics — Other Diagnostic Data.** All nine existing types remain. Every listed purpose, linkage answer, and No-tracking answer must still be compared with exact-candidate evidence before publication.

**Next T09 ledger step:** complete the read-only App Store Connect column, then reconcile the exact archive report, T05 native payload, enabled provider paths, and mailbox operating procedure. Do not publish from this worksheet while any current-remote cell or exact-candidate checklist item remains open.
