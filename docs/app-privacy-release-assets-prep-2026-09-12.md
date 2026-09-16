# CapitolWonk App Privacy And Release-Assets Preparation — September 12, 2026

Status: **September 15 launch-scope reconciliation in progress.** PR #29 merged into `main` at `f959bff` with all three checks passing. The configured dedicated privacy mailbox is the launch intake channel; the first-party database queue, operator, monitoring, retention, deletion, and adapter paths remain off and are conditional post-launch work unless Tyler explicitly changes scope. The provisional App Privacy matrix remains subject to exact signed-archive, runtime/provider, product-configuration, and mailbox-procedure evidence. No questionnaire publication, screenshot upload/replacement, signing, distribution, submission, or release is authorized.

The active planning baseline is `main` at `f959bff`. Production Batch A and PR #8's matching default-off source are complete, and later source-only operator work remains disconnected and inactive. Historical September 12 candidate and Preview references below remain evidence for their dated checkpoints, not current launch instructions. The source-bound local recapture manifest is [prepared here](app-store-assets/capitolwonk-capture-manifest-2026-09-13.md).

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
