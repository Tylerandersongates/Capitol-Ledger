# CapitolWonk App Privacy And Release-Assets Preparation — September 12, 2026

## September 18 continuation — read-only privacy evidence

Fresh GitHub inspection showed remote `main` still at PR #44 merge `617a474`, and GitHub marked its newest Production deployment active. Vercel independently showed deployment `242WEyuALqHVwG8zXJ5raBnEXoFd` Ready from that same SHA with `www.capitolwonk.com` under Domains. The public canonical pages were read in a visible in-app browser without submitting a form: `/support` points privacy requests to the dedicated page and verified mailbox; `/privacy` describes in-app deletion conditionally; `/privacy/request` explicitly says first-party intake is inactive, the database-backed form cannot submit, and offers a dedicated-mailbox `mailto:` link. These page reads verify public wording, not mailbox delivery, fulfillment, retention, or deletion. The browser was left on `/privacy/request` for handoff.

The disabled request page also renders a present-tense card saying the signed-in lane *uses* account identity, and its page metadata says users can “Submit and track” a request. Source at documentation checkpoint `781253e5` renders that card and metadata unconditionally in `app/privacy/request/page.tsx`. This conflicts with the same page's inactive-intake notice. Keep a focused conditional-copy correction in T09 before final launch copy review; no Production copy or request capability was changed in this read-only pass.

Read-only inspection of the existing September 16 local version 1.0 build `2` archive found one embedded framework, Sentry Cocoa `9.22.0`, and one embedded privacy manifest at `Products/Applications/CapitolLedgerNative.app/Frameworks/Sentry.framework/PrivacyInfo.xcprivacy` (SHA-256 `118b16e0e97ffe8b6f1f01b7e04f68e5da764474a4d39d2933b0eeaef3cdc0ca`). That manifest declares Crash Data, Performance Data, and Other Diagnostic Data for App Functionality, each with tracking and linkage set to false, and lists UserDefaults `CA92.1`, SystemBootTime `35F9.1`, and FileTimestamp `C617.1` required-reason APIs. This is SDK-declared archive evidence, not an aggregate privacy report or measured device payload. The provisional matrix below conservatively keeps diagnostics linked while persistent installation/device identifiers and T05 native delivery remain unverified. Reconcile that difference against the selected archive's aggregate report, actual native events and current App Store Connect answers before proposing any questionnaire change. The local archive predates Production web merge `617a474`; no combined release candidate was selected.

## September 18 superseding release-state reconciliation

This section updates the dated September 12–15 planning state below. [T04 local signing evidence](apple-signing-reconciliation-2026-09-10.md) now includes a signed version 1.0 build `2` Release archive, strict/deep-strict signature checks, and an install/launch on Tyler's iPhone. The archive remains local; it is **not** an App Store upload or an App Privacy aggregate report. Later web changes through [PR #44](https://github.com/Tylerandersongates/Capitol-Ledger/pull/44) reached Production at merge `617a474`. Therefore, the signed native build and current web source are separate identities to reconcile before final capture or questionnaire approval. The September 17 Apple Support slip trigger below is retired.

| T09 evidence item | September 18 state | Next proof before remote use |
| --- | --- | --- |
| App Privacy answers | Fourteen-type matrix below remains **provisional**; current remote answers have not been re-read for this pass. | Re-read exact App Store Connect answers, reconcile native SDK/privacy report and real provider/runtime collection on the selected candidate, then present the exact proposed changes for Tyler's approval. |
| Signed native/privacy evidence | Local signed build `2` and iPhone launch passed T04; no aggregate privacy report or native Sentry delivery sample is recorded here. | Extract/review the report from the exact selected archive and obtain T05's bounded device event/delivery evidence before final linked diagnostics and Device ID answers. |
| Public support and privacy copy | Dedicated privacy mailbox is the launch intake path; first-party queue/operator/deletion remain off. | Verify the exact deployed `/support`, `/privacy`, and `/privacy/request` wording and complete the mailbox identity, fulfillment, retention, deletion, absence-cover and provider procedure. Do not infer operational proof from configuration. |
| Listing copy and screenshots | [Source-only listing draft](app-store-assets/capitolwonk-listing-draft-2026-09-16.md) exists; the three historical images below remain quarantined. PRs #35–#44 changed public views after that draft's source read. | Rehearse four honest public screens against one pinned native/web candidate; record route, state, dimensions, sRGB/RGB mode, hashes, brand and privacy review in the [capture manifest](app-store-assets/capitolwonk-capture-manifest-2026-09-13.md). No final image is selected. |
| Provider/retention evidence | Static findings and configured controls below are useful but do not prove retained live payloads, removal or delivery. The AI provider remains inactive. | Obtain sanitized actual runtime/provider evidence and revisit the matrix for any enabled video, analytics, AI, subscription or messaging path before questionnaire approval. |

The working sequence is source-only copy/state reconciliation, then exact-candidate archive/runtime/provider and capture evidence, then a reviewable questionnaire/asset proposal. Questionnaire publication, asset replacement and upload remain separate exact decisions. October 1 is the internal T09 handoff checkpoint; October 2–6 has no required owner approvals or device sessions, October 19 is the working App Review submission target, and October 30 is the unchanged launch target. See the [current ledger](project-timeline.md) for T03/T05–T11 dependencies and schedule risk.

Historical September 15 status: **launch-scope reconciliation in progress.** PR #29 merged into `main` at `f959bff` with all three checks passing. The configured dedicated privacy mailbox is the launch intake channel; the first-party database queue, operator, monitoring, retention, deletion, and adapter paths remain off and are conditional post-launch work unless Tyler explicitly changes scope. The provisional App Privacy matrix remains subject to exact signed-archive, runtime/provider, product-configuration, and mailbox-procedure evidence. No questionnaire publication, screenshot upload/replacement, signing, distribution, submission, or release was authorized at this checkpoint.

The September 15 planning baseline was `main` at `f959bff`. Production Batch A and PR #8's matching default-off source are complete, and later source-only operator work remains disconnected and inactive. Historical September 12 candidate and Preview references below remain evidence for their dated checkpoints, not current launch instructions. The source-bound local recapture manifest is [prepared here](app-store-assets/capitolwonk-capture-manifest-2026-09-13.md).

## Provisional App Privacy Matrix

Every listed type is provisionally **Collected: Yes**, **Linked to the user: Yes**, and **Tracking: No**.

| App Store Connect category / data type | Change | Purpose |
| --- | --- | --- |
| Contact Info — Name | Retain | App Functionality |
| Contact Info — Email Address | Retain | App Functionality |
| Identifiers — User ID | Retain | App Functionality |
| Identifiers — Device ID | Add | App Functionality |
| Location — Coarse Location | Retain | App Functionality; Product Personalization |
| Sensitive Info | Retain | App Functionality |
| Purchases — Purchase History | Retain | App Functionality |
| Usage Data — Product Interaction | Retain | App Functionality; Product Personalization |
| User Content — Customer Support | Retain | App Functionality |
| User Content — Other User Content | Retain | App Functionality |
| User Content — Emails or Text Messages | Add | App Functionality |
| Diagnostics — Crash Data | Add | App Functionality |
| Diagnostics — Performance Data | Add | App Functionality |
| Diagnostics — Other Diagnostic Data | Add | App Functionality |

Under the current no-player assumptions, the provisional negative classifications are Location — Precise Location, Financial Info — Payment Info, and Usage Data — Advertising Data: **No**; tracking: **No**. Usage Data — Search History and the Analytics purpose remain **open/conditional** until sanitized Vercel/Sentry/runtime evidence proves search parameters are not retained and observability is operational-only. None of these answers is final until archive and runtime reconciliation is complete.

## Evidence Still Required Before Questionnaire Approval

- Re-read the existing App Store Connect answers immediately before proposing exact remote edits; the last repository record says nine types, but this pass did not mutate or re-read the questionnaire.
- Produce the exact signed Release archive and aggregate privacy report after T04 closes. Reconcile every SDK and required-reason API with the matrix.
- Prove native Sentry delivery and the actual installation/device identifiers, crash fields, performance metrics, and app-hang data on the exact candidate. Either disclose Device ID plus linked diagnostics as drafted or strip the identifiers and prove absence.
- Capture sanitized runtime evidence for WKWebView, server, Vercel logs, Sentry, Neon, every enabled email/webhook path, official messaging, Apple, legacy Stripe, YouTube, and conditional OpenAI behavior.
- Prove search terms, URL queries/fragments, reset/invite/task tokens, messages, and provider response bodies are absent from retained logs/events. Source-level sanitization is helpful but insufficient.
- Do not claim working in-app deletion or database-backed privacy intake for launch. Production Batch A is complete, but the first-party queue/operator lifecycle is deferred and all related gates remain off. The launch packet instead needs a truthful dedicated-mailbox procedure covering identity verification, fulfillment, retention, deletion, owner absence, and provider boundaries.
- Re-audit before enabling any real YouTube player, analytics product, new SDK, or new provider.

## Public-Copy Reconciliation

The default-off privacy source is on `main`, and the mailbox fallback is configured. Remaining copy must describe that actual launch state:

1. Source candidate `92b61b9` now gates the deletion wording: with first-party intake disabled, the policy points people to `/privacy/request` and its available configured assistance path rather than promising that deletion starts and completes in-app. Exact-candidate runtime verification and coordinated policy/intake activation remain required before publication.
2. Source candidate `92b61b9` also narrows the Sentry wording so it no longer promises deletion of an individual feedback report. Provider-level retention/removal evidence is still incomplete, so do not broaden that statement without authoritative provider evidence and a workable operating procedure.
3. PR #8 and later descendants route `/support` and `/privacy` to `/privacy/request`, keep the exact database-intake gate off by default, read the fallback mailbox only from explicit runtime configuration, and keep Sentry out of the privacy-rights route. For the mailbox-only launch scope, Support must call this a dedicated privacy page and verified mailbox rather than imply that the deferred first-party queue is active.
4. The local source now implements minimized authenticated intake and account-visible status, and Tyler is recorded as the sole privacy owner. Resend verifies `capitolwonk.com`; Porkbun forwards the privacy and three public sender aliases to one owner-controlled external inbox, and Vercel Production/Preview hold the corresponding sender/contact configuration. The destination inbox is intentionally omitted and no forwarding/outbound delivery test was sent. No backup is currently available. The [September 13 single-owner contingency](privacy-operations-single-owner-contingency-2026-09-13.md) now documents a fail-closed proposed procedure, but secure export delivery, resolution tooling, monitoring, retention decisions, backup coverage, and a completed synthetic operating exercise remain absent. Batch B remains blocked until those items are implemented or the public promises are narrowed.
5. The local policy review date and Sentry/deletion wording were corrected to September 12. Fresh exact-source review, CI/Preview, runtime/provider reconciliation, and separate deployment approval remain required before publication.

The historical `92b61b9` source boundary is superseded for current planning by `main` at `f959bff`. Exact-branch CI/Preview and visual/HTTP evidence are still required for any new copy candidate, and App Store Connect remains unchanged.

## Read-Only Provider Implications

- Production Batch A is complete. The later ambient-privilege preflight failed closed, the principal-ACL inventory never ran, and that operator database sequence is conditional post-launch. The exposed owner credential was reset and containment is complete. Do not make the deferred queue or its database hardening a prerequisite for the mailbox-only App Privacy launch packet.
- Vercel Pro with Observability Plus exposes a 30-day runtime-log window; no project drains or project webhooks were present, but sanitized runtime evidence remains missing and the team-global webhook list was not visible to the current role.
- Sentry project scrubbers/default scrubbers/IP prevention and the recursive `$user.geo.**` rule are enabled on both projects. Organization-wide 2FA enforcement, Enhanced Privacy, default data scrubber, and default IP prevention are off; shared issues are enabled. Minidump storage is disabled. No current event sample proves actual retained fields.
- Resend Pro documents 30-day email/log retention and seven-day backups. `capitolwonk.com` is verified for sending and the existing Vercel Resend secret was preserved; no test message was sent and no Resend webhook is configured.
- The [September 13 static provider/logging audit](provider-logging-static-audit-2026-09-13.md) closes only narrow source-level minimization claims and identifies two P1 fixes before affected-path activation: make Weekly Brief task output aggregate-only and prevent legacy Stripe response bodies from reaching clients or Sentry. Any implementation changes the frozen source candidate and requires refreeze, full verification, and packet reconciliation.
- Vercel Production and Preview now configure the auth sender, Weekly Brief sender, and privacy-contact alias. Team invites intentionally inherit the auth sender. This is configuration evidence, not end-to-end delivery, retention, webhook, or removal proof.

## Existing Asset Audit

| Artifact | Exact technical evidence | Release finding |
| --- | --- | --- |
| `docs/app-store-assets/listing/capitolwonk-iphone-6.5-dashboard.png` | 1284 x 2778 PNG, sRGB RGBA, 2,889,527 bytes; SHA-256 `c5a8d918a3582162a2f06070e120df2229b52125af3ffbbdfcefcbd745b50007` | Visibly uses the retired `CE` suffix; must not be reused as the final CapitolWonk listing image. |
| `docs/app-store-assets/listing/capitolwonk-ipad-13-dashboard.png` | 2064 x 2752 PNG, sRGB RGBA, 2,480,970 bytes; SHA-256 `893f9d310610a690f5d061025005891194bb655d5fa9369b0d06920c859b281f` | Visibly uses the retired `CE` suffix; also shows native plus faux status chrome, a phone bezel/notch, and large black gutters at iPad width. |
| `docs/app-store-assets/review/capitolwonk-pro-monthly-review.jpg` | 2736 x 1260 JPEG, sRGB, 216,197 bytes; SHA-256 `73a06cfaa6340c42981d9c36d80b377d49441b15122ac82a5c4f560dce7b2939` | Contains unconditional `7-DAY TRIAL` / `Start 7-day free trial` copy. It is stale and is not the required redacted product-configuration evidence. |

The listing screenshots have been unchanged since `28f3fc7`. Their populated July dashboard lacks documented route, account, and state provenance that can be reproduced under the current no-fallback-demo boundary. A deliberately provisioned sanitized authenticated screenshot account may be populated, but it must be assigned and evidenced; otherwise use an honest blank/public narrative. Do not reintroduce fallback demo records for marketing.

## Safe Recapture And Review Plan

1. Draft locally only until purchase copy, provider/privacy wording, and physical-device QA pass. Preserve the historical files until replacements are explicitly approved.
2. Pin final captures to the eventual exact release source. `f959bff` is the current planning baseline, not authorization to represent an unsigned build as the release candidate; rerun capture evidence after every source change.
3. Use only sanitized assigned state. Rehearse the smallest truthful four-screen set first: dashboard, bill search/results, bill detail, and member detail. Defer alerts/account-specific, Daily Brief video, and upgrade screenshots until their exact launch state is evidenced.
4. Resolve the iPad double-chrome/bezel treatment before recapture. Produce exact 1284 x 2778 and 2064 x 2752 sRGB images and require flattened three-channel RGB with no alpha, unless a separate technical review documents and approves a reason to retain alpha.
5. Verify every image says `CAPITOLWONK` with no `CE`, uses conditional offer language matching the configured subscription, and contains no customer data, secret, token, account identifier, private Apple correspondence, or provider value.
6. Prepare three separate evidence sets: listing screenshots; an updated subscription-review screenshot; and redacted App Store Connect product-configuration evidence showing the offer, renewal price, territory/currency, and status.
7. Record exact filenames, dimensions, color mode, SHA-256 hashes, candidate SHA, route/state provenance, and visual QA result. Present the set for approval before any upload or replacement.

## Schedule And Approval Boundary

| Date | Control point |
| --- | --- |
| September 17 | Slip trigger if the Apple-supported signing path remains unresolved; report effect on the September 25 checkpoint and October 19 submission target. |
| September 25 | Readiness checkpoint for signing, the `jsrsasign` fix path, sandbox/device progress, provider decisions, and the final privacy/asset route. |
| October 1 | Stability ceiling for a newly frozen, fully revalidated release candidate. |
| October 30 | User-set launch target; never bypass evidence or approval gates to preserve it. |

The prior product/release baseline remains visible at **7–13 hands-on working days**, excluding external Apple/provider waits and QA rework. The newly confirmed verifier gate adds scenario effort documented in the [September 12 `jsrsasign` packet](jsrsasign-risk-decision-2026-09-12.md): approximately 8–15 total days for a fully sufficient official package, 9–17 for an official fix plus local controls, 10–18 for a reviewed backport plus controls, or 11–20 for replacement. Exact App Store Connect edits, asset uploads, signing, distribution, submission, and release each remain separate action-time approvals.
