# CapitolWonk Backup/PITR And Provider-Retention Evidence Checklist — September 11, 2026

Status: **prepared from source review and current official provider documentation; provider-console evidence, a recoverability decision, and every restore/removal exercise remain pending.** This document is preparation only. It authorizes no production query or write, restore, branch/snapshot creation, provider setting or record change, deletion request, credential use, App Store Connect action, signed build, upload, distribution, submission, or release.

The last exact reviewed non-production source candidate was `a6cb1da9971722251c47561105c807ea0a6a5238` on `codex/logo-refresh-sept10`; production remains `7ec68bcf142d6defe865c12959b0f9a84fce72d5`. The live September 11 working candidate is now an uncommitted, unfrozen delta that changes source, dependencies, lockfile, migrations, Apple/Team behavior, and privacy controls. It adds the fourth candidate-to-production migration `20260911110000_app_store_server_state`. Therefore the `a6cb1da` CI/Preview/smoke and `f4f04de` dependency-audit evidence are historical and stale for current release use. The pnpm 9 lock now forces Next's PostCSS to `8.5.25`, and September 11 production/full working-tree audits both report **no known vulnerabilities**; CI and the strict candidate command now run both audits. The candidate still requires frozen-install re-audits and exact-head evidence. Production transitive `jsrsasign@11.1.5`, used by Apple's official server library for X.509/OCSP, has no current advisory but is deprecated/unmaintained and requires upstream monitoring/upgrade plus owner risk acceptance before launch. See the [September 11 dependency note](dependency-security-audit-2026-09-11.md). The ordered production gates remain in the [September 11 approval packet](production-privacy-deletion-approval-packet-2026-09-11.md), and the Apple signing freeze remains in force.

## Evidence-State Definitions

- **Source-observed:** code can send/store the stated data; this does not prove the path is enabled in production.
- **Vendor-documented:** the provider publicly describes the behavior; this does not prove CapitolWonk's plan or setting.
- **Setting-verified:** the exact CapitolWonk project/account value was captured read-only at a stated time.
- **Exercised:** a sanitized disposable case proved the behavior end to end without crossing its approval scope.
- **Approved:** Tyler authorized one exact action or accepted one explicitly stated tradeoff; approval does not substitute for evidence.
- **Closed:** source, exact setting, runtime exercise, truthful copy, owner and re-verification trigger all agree.

## Current Conclusion

- The code-level provider inventory is documented below, but the exact production plan, restore window, retention settings, drains, projects, and feature enablement have not been authenticated and captured read-only for the changed working candidate.
- For launch, the recommended minimum recoverability design is a **constrained restore floor**: never resume traffic from a database point earlier than the newest verified completed deletion. This adds no per-user tombstone, but it can make an older otherwise-healthy restore point unusable. Tyler must approve the tradeoff, and a temporary-branch drill must prove it before release.
- If the business must be able to restore to a point earlier than the latest deletion, CapitolWonk needs an external replay ledger containing a stable pseudonymous account key. That is a new data store and privacy surface and is not approved or implemented.
- The current Sentry feedback-removal promise is not closed. `components/feedback-form.tsx` sends the optional email, full title/body, tags, and current URL through `Sentry.sendFeedback`. Sentry's current erasure guidance says User Feedback cannot be deleted individually; removing it may require deleting the whole project. Until the exact project/product behavior is confirmed in writing or the intake design changes, CapitolWonk must not promise that Support can remove one specific feedback report.
- The working source now strips query strings/fragments and common credential fields from Sentry events/breadcrumbs, removes the query-bearing URL from feedback submission, avoids Resend provider-response bodies, and removes cleanup identifiers from error logs. This is source mitigation only. Vercel access/runtime logs and any drains can observe a request before application sanitization, and no representative current-candidate provider event/log has been inspected. Sanitized runtime evidence must still prove token/search treatment before launch.
- The working source now includes an exact default-off deletion gate. Missing or non-`true` configuration hides Settings/Support/Privacy deletion entry points and makes both deletion API methods fail closed before account/database work. It also includes an independent default-off retention sweep and a second gate for legacy-feedback erasure. These controls are uncommitted and are not candidate-verified, approved, deployed, configured, or activated. Before Batch B, freeze and verify the candidate and approve the exact default-off deployment/later-activation sequence; deletion must remain unavailable until its live schema, authenticated worker, no-payload monitoring, provider procedures, sandbox/device behavior where applicable, and truthful public copy are ready.

## Source-Observed Provider Inventory

“Pending” means the exact production account/project/plan and setting still need authenticated read-only evidence. Do not paste identifiers, user data, tokens, DSNs, API keys, messages, or event payloads into this document.

| Boundary | Source-observed data and activation | Provider retention/removal boundary | Evidence required before launch | Status / stop condition |
| --- | --- | --- | --- | --- |
| **Neon Postgres** | Account/profile/auth/session data; saved items; Team data; product activity; Brief history/editions; official-contact history; subscription state; deletion audit; pending cleanup jobs. Active when `DATABASE_URL` targets production. | Project restore window and snapshots can preserve states older than live deletion. Neon documents configurable restore history plus separate backup/deletion practices; exact plan/project behavior controls. | Project/database identity by non-secret metadata; plan; restore-window setting; branch/snapshot inventory and expiry; backup health; region; deletion/termination terms; operator access list; constrained-floor or replay-ledger decision; temporary-branch restore drill. | **Pending.** Stop any migration/restore if target, backup health, restore window, or latest deletion watermark is uncertain. |
| **Vercel hosting and logs** | Web/API traffic, deployment/build output, request path/search parameters, user-agent and request metadata; application console output. Production deployment is active, but the exact plan/log configuration for the release must be re-read. | Runtime retention is plan-dependent; Observability Plus can extend it. Build logs are retained separately. A log drain creates another independent retention boundary. | Team/project/plan; runtime-log and build-log retention; Observability setting; every log drain/integration/destination; access list; redacted sample showing token/search-query treatment; source scan proving no account/provider payload logging. | **Pending.** Stop release if a drain is unowned, retention is unknown, or token-bearing/search query data is visible. |
| **Sentry web/server/native diagnostics** | `sendDefaultPii: false`, replay sampling `0`, trace sampling `0`; browser/server exception capture is implemented; native integration exists but runtime delivery on the exact signed build is unverified. Errors may still contain URLs, request context, stack data, and user-entered values from failing code. | Event retention is plan/product specific. Events are immutable; issue-level deletion is broader than deleting one event. Some telemetry types cannot be deleted individually. | Exact organizations/projects/environments and plan; retention for errors, feedback, attachments, replays, spans, logs and profiles; inbound filters/scrub rules; recursive `user.geo` rule re-read; sanitized web/server/native events; project access/export/deletion roles; written removal procedure by data type. | **Pending.** Native runtime is blocked by T04. Stop release if default PII/replay is enabled, geography scrub regresses, or sensitive query values remain. |
| **Sentry User Feedback** | Optional contact email, complete title/body, `feedback_source`, internal surface tag, and `window.location.href` are sent directly from `/feedback`; replay attachment is disabled. | Current Sentry guidance says User Feedback cannot be individually deleted and may require whole-project deletion; ordinary expiry depends on product/plan. | Confirm exact Sentry product and retention; submit only a non-sensitive marker under separate approval; determine whether it can actually be located/exported/removed; obtain Sentry support confirmation if relying on a provider process; reconcile `/privacy`, `/support`, tester guides, and App Privacy copy. | **Release blocker / decision required.** Choose an intake/minimization redesign, a truthful expiry-only disclosure, or authoritative provider confirmation. Do not claim one-report deletion until evidenced. |
| **Resend email** | Conditional. Auth verification/reset, Team invites, and Daily Brief delivery can send recipient/sender names and emails, action/invite URLs, workspace/role data, or personalized Brief content when the applicable delivery mode is `resend`. Daily Brief outbound delivery is currently deferred from v1. | Resend documents plan-dependent email/log retention, backup retention, and a support path for earlier specific-message removal; exact account plan/settings control. | Prove which flows are enabled in production; account/plan/region; message/log retention and backups; suppression/bounce data; access roles; specific-message request procedure and SLA; sanitized test; verify token URLs are not unnecessarily retained; confirm Daily Brief remains disabled for v1. | **Pending/conditional.** Stop enablement if the provider/plan is unidentified or action tokens appear in retained evidence. |
| **Configurable email or delivery webhooks** | Conditional. Auth, Team invite, Weekly Brief, or official-contact payloads may contain full names/emails, signed action URLs, workspace information, personalized content, official-message content, official identity, and app user ID. Destination is configured outside source. | Retention is entirely destination-specific, including its own logs, queues, retries, backups and subprocessors. | Inventory every enabled URL by provider/system name without recording its secret; owner; purpose; payload schema; log/queue/backup retention; deletion API/process; retry/dead-letter path; subprocessors; sanitized end-to-end sample. | **Blocked until the exact destination is named.** An unknown webhook is a launch stop for that feature. |
| **Official-message recipients and the user's mail app/provider** | In manual mode, CapitolWonk prepares a `mailto:` message. In webhook mode it sends full message/sender data to the relay. CapitolWonk stores sender email, sender key, subject, a message preview, recipient metadata, delivery state and timestamps until account deletion. | The recipient office and mail providers control their copies after delivery; CapitolWonk cannot promise their deletion. | Verify exact v1 mode; explain the boundary in public copy; list any relay/provider procedure; prove CapitolWonk's local matching records are deleted; retain no promise that an office will erase its copy. | **Pending.** External recipient removal cannot be a guaranteed CapitolWonk outcome. |
| **Apple StoreKit / App Store / TestFlight** | Apple processes purchases and may hold transactions. TestFlight separately holds tester feedback/crash information. CapitolWonk deletion does not cancel an Apple subscription. The working source adds canonical state and hash-only Notifications V2 receipts. | Apple-controlled legal/service retention; app-side account deletion is distinct from subscription management and Apple records. | Exact bundle/product/build; subscription-management link and deletion warning; App Privacy reconciliation; App Store Connect roles; TestFlight feedback/crash handling procedure; truthful provider boundary; every applicable case in the [sandbox QA matrix](app-store-sandbox-qa-matrix-2026-09-11.md). | **Pending and partly blocked by T04.** Source fixtures are not Apple/Team sandbox proof. Never claim CapitolWonk cancels or erases Apple billing. |
| **Legacy Stripe** | Conditional legacy web billing. Customer/subscription references and CapitolWonk account metadata may remain. Post-commit cleanup schedules active renewal off and detaches account ID/email metadata where permitted. | Stripe may retain transaction/legal records. Customer redaction can remove personal data from ordinary Dashboard/API views while legally required data may remain. | Aggregate query proving whether any legacy path can queue work; test-mode active/terminal/missing/transient matrix; metadata redaction result; redaction-request procedure; plan/account roles; no live-customer mutation. | **Pending/conditional.** Use test mode only under its separate batch; live resource reach is a stop. |
| **YouTube** | Current candidate contains a channel-only outbound link and no episode/player. A future episode would load `youtube-nocookie.com`; official YouTube policy still describes data exchange on player load/playback. No user-authorized YouTube API path was found. | Current outbound use transfers the user to YouTube only after choice. Embed/API retention becomes a new runtime boundary if enabled. Formal policy requires removal as soon as possible and within seven days for key user-request/account-deletion cases; use that stricter internal ceiling if authorized API data is ever introduced. | Preserve `episodes: []` for current evidence; sanitized network trace proving no player request; if a video is added, repeat archive/runtime privacy analysis, record embed requests/cookies/storage, captions/transcript/source provenance, and API-data deletion rules if authorization is ever added. | **Current channel-only state prepared; future embed blocked pending fresh audit.** “No-cookie” must not be described as “no data.” |
| **OpenAI API** | Conditional bill-analysis provider. When explicitly enabled with a key, source packets contain public bill metadata, summaries/actions/votes and source matches; no account ID/email is intentionally included. In-memory analysis cache is non-production only. | API data controls depend on the OpenAI project/endpoint and approved retention mode. Transport and provider logs remain a boundary even when prompts use public data. | Prove release provider mode; if enabled, exact project, endpoint, data-control/retention setting, access roles and sanitized request showing no account data; if disabled, record config evidence without exposing the key. | **Pending/conditional.** Do not enable silently; any account/personal context in a request stops release. |
| **Congress.gov, GDELT and Regulations.gov** | Public civic/news source requests constructed server-side; Congress API key is a service credential. No intentional account identifier is included in the source payloads reviewed. | Each service can observe CapitolWonk infrastructure/network requests under its own logs/policy; this is not an account-deletion store in current source. | Confirm exact enabled providers, service terms/keys, request fields, and that no account/search identity is appended. | **Conditional verification.** Stop if personal/account values are discovered in upstream requests. |
| **Upstash/Redis or another provider-backed limiter** | Environment placeholders exist, but no active source use was found; current mutation limiter is process memory and hashes client IP plus a subject. | No external retention boundary exists unless a provider-backed limiter is activated later. | Record v1 decision. If enabled, add the provider, key derivation, TTL, deletion behavior, logs/backups and access controls before deployment. | **Inactive by source review; recheck exact archive/config.** |

## Vendor-Documented Baseline — Not CapitolWonk Setting Evidence

These public-document values were checked September 11, 2026. They are comparison points only; the authenticated console pass must record CapitolWonk's actual plan and settings.

| Provider | Current documented baseline |
| --- | --- |
| Neon | Self-service restore history is plan/configuration dependent: Free up to 6 hours or 1 GB of changes, Launch up to 7 days, and Scale up to 30 days; paid projects default to 1 day unless configured. Neon's separately documented 30-day operational backup retention is not the same as the customer-visible restore window. |
| Vercel | Runtime logs: Hobby 1 hour, Pro 1 day, Enterprise 3 days; supported Pro/Enterprise projects with Observability Plus can retain 30 days. Build logs are documented as stored indefinitely. Drains copy data to another destination. |
| Sentry | Error events: Developer 30 days; Team, Business and standard Enterprise 90 days; custom Enterprise error retention may apply. The retention at ingestion remains attached to the event. Other telemetry types can differ. |
| Resend | Free/Pro/Scale email and log data is documented at 30 days; backups at 7 days; Enterprise can vary. Early removal of a specific message is support-mediated, not an ordinary self-service delete. |
| Stripe | Stripe says Business User personal data is generally kept for five or more years after the relationship ends or last transaction in most jurisdictions. Transactions cannot be deleted and become redaction-eligible only after 90 days; some objects, including invoices, have additional recordkeeping limits. |
| Apple | Apple's App Store notice says purchase/download records are retained for financial-reporting law, at least 10 years for most customers and up to 30 years in China. This is Apple-controlled retention, not CapitolWonk account storage. |
| YouTube | Embedded-player load shares basic data even before playback. For user-authorized API data, use the formal policy's stricter “as soon as possible and within seven days” deletion ceiling for applicable user-request/account-deletion cases. |

## Recommended V1 Recoverability Decision

### Option A — constrained restore floor (recommended minimum)

This option creates no per-user external tombstone. It deliberately gives up the ability to resume from a restore point older than the most recent verified deletion.

1. Define the **deletion watermark** as the greatest non-null `AccountDeletionRequest.completedAt` in the newest recoverable production state. It contains a time only, not an account identity.
2. Before any restore, keep public traffic disabled. Prove the intended Neon project/database and inspect the newest recoverable state read-only—preferably through a temporary branch or time-travel view—to obtain the watermark without modifying production.
3. Reject every restore point earlier than the watermark. If no trustworthy newest state/watermark can be obtained, do not restore and do not resume traffic under this design.
4. Restore only to an isolated temporary branch first. Do not replace the active branch or connection string.
5. On the isolated branch, verify migration history/schema, cleanup-job state, aggregate account counts, and a uniquely marked disposable account deleted before the chosen restore point. The deleted account must remain absent by ID, normalized email and related sender keys.
6. Confirm the proposed restore point is at or after every verified deletion, pending cleanup work is reconciled, and unrelated control data is present.
7. Only a separately approved incident action may switch production traffic. Repeat the watermark comparison immediately before the switch and record sanitized operator/time/branch/restore-point evidence.
8. After recovery, repeat account-deletion, cleanup-worker and provider-boundary health checks. Never use an active customer as the resurrection sentinel.

The deidentified audit inside Neon is sufficient to calculate a time floor while the newest recoverable state remains trustworthy; it cannot replay individual deletions. The drill must also define how the watermark is preserved during the exact disaster class being tested. If the newest state cannot survive that incident, Option A fails closed and service remains offline.

### Option B — external pseudonymous deletion ledger (not approved)

Use only if restoring earlier than the latest deletion is a required business capability. The design must use a stable, non-reversible keyed identifier suitable for matching a restored account, and it must be outside the Neon restore boundary. Before implementation, separately approve and document:

- provider, encryption/key ownership, writers/readers and break-glass access;
- atomicity/failure behavior between account deletion and ledger publication;
- identifier construction and rotation without storing raw account IDs/emails;
- retention, backups, replication, monitoring and eventual deletion;
- replay order, idempotency, control-user protection and zero-row assertions;
- App Privacy/public-policy/security impact; and
- a restore drill proving all post-snapshot deleted users are removed before traffic resumes.

Do not improvise this ledger in Vercel logs, Sentry, email, a spreadsheet, source control, or the deidentified `AccountDeletionRequest` row.

## Read-Only Provider Evidence Pass

This pass needs its own approval only if accessing a protected provider account was not already authorized. It must not change a setting.

- [ ] Record candidate and production SHA plus date/operator; use non-secret project/account labels only.
- [ ] Neon: capture project/branch/database/region/plan, restore window, backup/snapshot status, branch protection/expiry and access roles.
- [ ] Vercel: capture plan, runtime/build-log retention, Observability, drains/integrations, deployment regions and access roles.
- [ ] Sentry: capture project/plan/product retention, inbound scrubbing, replay/default-PII settings, geography rule, integrations/exports and access roles.
- [ ] Resend and every webhook: prove enabled/disabled state per flow and capture provider, retention, backup, queue/retry, removal and access controls.
- [ ] Apple/TestFlight and legacy Stripe: record the exact boundary and operator procedure without viewing or copying unrelated customer data.
- [ ] YouTube/OpenAI/public-data providers/limiter: prove exact release enablement and add any newly active provider to this register.
- [ ] Record discrepancies as open decisions. Do not “fix while inspecting.” Present one narrow proposed action for approval.

## Static Logging And Data-Minimization Gate

Working-source mitigations are implemented for Sentry URL/credential scrubbing, feedback URL minimization, Resend error-body removal, and identifier-free cleanup errors. They are uncommitted and have no current CI/Preview/provider-runtime evidence. Keep every runtime/provider checkbox below open until it is exercised against one frozen candidate.

- [ ] Inventory every `console.*`, Sentry capture, provider SDK, webhook, `fetch`, log drain and scheduled-task response in the exact candidate.
- [ ] Prove cleanup monitoring exposes aggregate counts/age/attempt bands only. The working source removes cleanup-job UUID/kind/error detail from the retry log, but host/runtime evidence must confirm no job payload/provider/account identifier reaches logs.
- [ ] Exercise sanitized requests containing unique fake markers in search `q`, auth verification/reset tokens, Team invite tokens, checkout returns, feedback source, official messaging and task parameters. Confirm which markers appear in Vercel/Sentry/downstream evidence.
- [ ] Redact or structurally remove secrets, auth/reset/invite tokens, emails, free-form messages, exact location, IP-derived geography and sensitive search terms before collection. Do not rely only on dashboard masking or short expiry.
- [ ] Confirm server/provider errors do not interpolate response bodies containing personal data. The working source removes the Resend failed-response body from thrown errors; verify the frozen candidate and representative runtime behavior before production Resend use.
- [ ] Confirm Sentry feedback does not attach replay and decide whether the current URL, optional email, source tag and full message are all necessary.
- [ ] Re-run the guard after the exact Release archive because build-time and native SDK behavior can differ from source assumptions.

## Internal Retention-Schedule Gate

Provider expiry does not replace a CapitolWonk lifecycle for data kept in Neon. The working source adds a bounded retention sweep to the existing cleanup task for expired sessions, verification/reset tokens, old Team invitations, and stale cleanup-job recovery. It is guarded by exact `CAPITOLWONK_PRIVACY_RETENTION_SWEEP_ENABLED=true`, defaults off, and has not been committed, candidate-verified, approved, deployed, scheduled, monitored, or activated. Legacy `BetaFeedback` deletion also requires exact `CAPITOLWONK_LEGACY_FEEDBACK_RETENTION_ENABLED=true` and remains off pending private export/removal approval. Therefore runtime lifecycle evidence remains open:

- expired verification/password-reset tokens have source purge logic but no evidenced deployed schedule;
- expired sessions have source purge logic in addition to prior opportunistic cleanup, but no evidenced deployed schedule;
- expired Team invitations have bounded source purge logic with a grace period, but no approved retention decision or evidenced deployed schedule;
- legacy `BetaFeedback` remains intentionally archived until a private export is verified; and
- failed cleanup jobs correctly remain retryable, but have no discard deadline and therefore need an escalation/repair owner rather than silent indefinite retention.

Before public privacy sign-off:

- [ ] define purpose and maximum retention for each row type, including legal/security exceptions;
- [ ] implement or explicitly accept a scheduled purge/archive process and prove it preserves active/security-required records;
- [ ] record the legacy feedback export owner, storage/access boundary, deletion date and verification result;
- [ ] include the purge task in backup/restore reconciliation so expired data is not revived indefinitely; and
- [ ] update public/App Privacy wording if actual retention differs from the current “while active” description.

## Provider Removal Procedures To Close

For every procedure, use a uniquely marked disposable record, record no personal data in evidence, and obtain action-time approval before a provider mutation.

1. **Neon live data:** execute the in-app/database deletion flow; prove all matching live records are absent, the deidentified completion audit remains, and any pending cleanup job contains only required references. Then close the PITR gate through the isolated restore drill.
2. **Vercel:** document expiry rather than promising selective deletion unless Vercel confirms a supported removal route. Identify and separately handle every drain destination. Prevent sensitive URL/payload collection at source.
3. **Sentry diagnostics:** document deletion scope by product (event, issue, replay/attachment, project) and expiry. Prove the selected workflow with a synthetic issue only.
4. **Sentry feedback:** do not exercise whole-project deletion casually. First resolve the blocker with Sentry confirmation or an intake redesign, then update all public/tester copy.
5. **Resend:** use its documented support/removal path for a synthetic message if the production plan requires early removal; otherwise disclose and evidence automatic expiry. Separately account for suppression/bounce and backup retention.
6. **Webhook destinations:** use the destination's API/runbook to remove synthetic payloads, logs, dead letters and backups where supported. A successful CapitolWonk request is not proof of downstream erasure.
7. **Stripe:** detach CapitolWonk metadata through the implemented test-mode cleanup and document Stripe redaction/legal-retention boundaries. Never imply transaction records are erased by app deletion.
8. **Apple:** direct the user to subscription management; accurately describe Apple-held billing and TestFlight data. CapitolWonk deletion must not claim to remove or cancel it.
9. **Official recipients:** delete CapitolWonk's local contact history and explain that recipient/mail-provider copies are outside CapitolWonk control.
10. **YouTube/OpenAI/other conditional providers:** create a procedure only if enabled in the exact release. No active data path may be omitted because it was absent in an earlier candidate.

## Evidence Template

| Field | Sanitized value |
| --- | --- |
| Date/time and operator |  |
| Approval scope/reference |  |
| Candidate / production SHA |  |
| Provider and non-secret project label |  |
| Plan/product/region |  |
| Feature enabled in exact release? |  |
| Data categories observed |  |
| Retention / backup / restore setting |  |
| Removal or expiry procedure |  |
| Synthetic marker and result (redacted) |  |
| Access-control evidence |  |
| Discrepancy / owner / due gate |  |
| Reviewer and closure decision |  |

Acceptable artifacts are boolean/count results, redacted setting screenshots, plan/document links, timestamps, and synthetic identifiers removed from the final packet. Never retain credentials, DSNs, connection strings, cookies, tokens, IP addresses, emails, message contents, customer/subscription/transaction IDs, private case IDs, full event payloads, or unrelated user records.

## Release Blockers And Decisions

| Decision / evidence | Owner | Gate |
| --- | --- | --- |
| Approve constrained restore floor or commission external replay-ledger design | Tyler | Before migration approval and before launch |
| Verify exact Neon restore/backup settings and complete isolated restore drill | Tyler approval; Codex execution/evidence | Before destructive production account QA can close |
| Approve the implemented default-off deletion/retention deployment and later activation sequence | Tyler decision; Codex candidate evidence | Before Batch B production deployment; activation remains a later separate gate |
| Resolve the Sentry individual-feedback removal contradiction and correct all affected copy | Tyler decision; Codex implementation; Sentry if confirmation is sought | Before public privacy publication/TestFlight widening |
| Prove sensitive query/token values are absent from Vercel/Sentry/drains | Codex; provider admins as needed | Before production privacy sign-off |
| Define and evidence expired token/session/invite and legacy-feedback retention | Source sweep prepared default-off; Tyler decision and deployed/runtime evidence still required | Before public privacy sign-off |
| Name and verify every enabled email/webhook provider and removal process | Tyler/provider owner; Codex evidence | Before enabling each delivery feature |
| Confirm Apple, legacy Stripe, YouTube and OpenAI exact-release boundaries | Codex; Tyler for protected/provider actions | Before App Privacy publication |
| Reconcile this register against the exact Release archive and runtime | Codex | Batch H / upload decision |

Preparation of this checklist does not close any row. A provider dashboard screenshot does not close a runtime behavior gate, and source review does not prove a protected setting.

## Current Official References

Provider documentation changes over time. Re-open these pages during the exact-release evidence pass and record the access date and applicable plan/product.

- Neon: [project restore window](https://neon.com/docs/manage/projects), [security and backup overview](https://neon.com/docs/security/security-overview), [database snapshots/versioning](https://neon.com/docs/ai/ai-database-versioning), and [Data Processing Addendum](https://neon.com/pdf/DPA.pdf).
- Vercel: [runtime logs and plan retention](https://vercel.com/docs/logs/runtime), [platform limits including log retention](https://vercel.com/docs/limits), [logs overview](https://vercel.com/docs/logs), and [log-drain reference](https://vercel.com/docs/drains/reference/logs).
- Sentry: [error/event retention](https://www.sentry.help/en/articles/13964323-how-long-are-errors-events-stored-in-sentry), [GDPR erasure by telemetry type](https://www.sentry.help/en/articles/16187006-how-do-i-complete-a-gdpr-erasure-request-for-a-user-in-sentry), [event immutability/API permissions](https://docs.sentry.io/api/permissions/), and [event-data backup retention](https://www.sentry.help/en/articles/13965019-how-frequently-is-data-backed-up).
- Resend: [GDPR and retention](https://resend.com/security/gdpr), [Data Processing Addendum](https://resend.com/legal/dpa), and [webhook-storage guidance](https://resend.com/docs/dashboard/webhooks/how-to-store-webhooks-data).
- Stripe: [Privacy Center retention explanation](https://stripe.com/legal/privacy-center) and [customer-data deletion/redaction requests](https://docs.stripe.com/privacy/deletion-requests?locale=en-GB).
- Apple: [offering account deletion in an app](https://developer.apple.com/support/offering-account-deletion-in-your-app/) and [App Store privacy/retention notice](https://www.apple.com/legal/privacy/data/en/app-store/).
- YouTube: [Developer Policies](https://developers.google.com/youtube/terms/developer-policies), [Required Minimum Functionality](https://developers.google.com/youtube/terms/required-minimum-functionality), and [API policy guide](https://developers.google.com/youtube/terms/developer-policies-guide).
- OpenAI: [API data controls and retention](https://platform.openai.com/docs/guides/your-data).

## Approval Ledger

| Item | Status |
| --- | --- |
| Source/config provider inventory | Reconciled to the uncommitted September 11 working tree; frozen exact-Release recheck pending |
| Official-document baseline | Prepared September 11, 2026; plan/settings verification pending |
| Read-only provider-console evidence | Not performed in this pass |
| Recoverability design | Recommended option prepared; not approved |
| Restore drill | Not authorized / not performed |
| Provider removal exercises | Not authorized / not performed |
| Sentry feedback-removal resolution | Open release blocker |
| Sensitive URL/log proof | Source mitigation implemented; exact-candidate provider/runtime proof remains an open release blocker |
| Internal expiry/archive lifecycle | Default-off source sweep implemented; policy approval, deployment, schedule, monitoring, and runtime proof remain open |
| Safe deletion activation sequence | Default-off source gate implemented; candidate evidence and Tyler approval remain open before Batch B; activation remains separate |
| Public policy / App Privacy reconciliation | Pending after blockers and exact Release evidence |
