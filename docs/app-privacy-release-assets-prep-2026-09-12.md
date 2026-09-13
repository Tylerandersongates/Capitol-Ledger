# CapitolWonk App Privacy And Release-Assets Preparation — September 12, 2026

Status: **Option 1 local privacy-intake source/copy work is approved and frozen; the controlled-domain mailbox and sender/contact configuration are now present, but no candidate publication or upload is authorized.** The matrix and asset plan below are provisional until the exact signed Release archive, runtime/provider evidence, product configuration, and deletion/retention path are reconciled. This packet authorizes no production migration, candidate deployment, intake activation, App Store Connect questionnaire edit, screenshot upload/replacement, signing, distribution, submission, or release.

The current source boundary is `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` on `codex/sept12-privacy-neon-candidate`; open PR #8 at branch/documentation head `0c09abc0523e2f4de16f55f4d6d2465d27f4abfa`, exact-head [CI #321](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34780116093), matching Ready Vercel Preview deployment `7d1i8rinVS8iUhUTPUyba4DMwUfy`, and targeted privacy-fallback gate-off smoke provide the current branch evidence. Production source remains `7ec68bcf142d6defe865c12959b0f9a84fce72d5` and still contains the older policy/source; the same source was redeployed Ready after the approved sender/contact environment update, and live `/privacy` smoke passed. The source-bound local recapture manifest is [prepared here](app-store-assets/capitolwonk-capture-manifest-2026-09-13.md).

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
- Follow the exact [five-migration production packet](production-five-migration-promotion-packet-2026-09-13.md). Neon Phase 1, automatic child cleanup, final production-target reconciliation, and empty-database hygiene are complete; restore-drill phases 2–5, the authenticated cleanup worker/monitor, provider procedures, disposable-account/concurrency/device QA, and controlled activation remain open. Do not claim working in-app deletion before those gates pass.
- Re-audit before enabling any real YouTube player, analytics product, new SDK, or new provider.

## Public-Copy Corrections Required

The candidate policy is not ready to publish:

1. Source candidate `92b61b9` now gates the deletion wording: with first-party intake disabled, the policy points people to `/privacy/request` and its available configured assistance path rather than promising that deletion starts and completes in-app. Exact-candidate runtime verification and coordinated policy/intake activation remain required before publication.
2. Source candidate `92b61b9` also narrows the Sentry wording so it no longer promises deletion of an individual feedback report. Provider-level retention/removal evidence is still incomplete, so do not broaden that statement without authoritative provider evidence and a workable operating procedure.
3. Tyler selected Option 1 on September 12. Source candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` now routes `/support` and `/privacy` to a dedicated `/privacy/request` page/API, keeps the exact activation gate off by default, reads the fallback mailbox only from explicit runtime configuration, and removes Sentry as the privacy-rights route. Candidate branch `codex/sept12-privacy-neon-candidate` is pushed and unmerged in open [PR #8](https://github.com/Tylerandersongates/Capitol-Ledger/pull/8) at branch/documentation head `0c09abc0523e2f4de16f55f4d6d2465d27f4abfa`. Exact-head [CI #321](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34780116093) succeeded, matching Vercel Preview deployment `7d1i8rinVS8iUhUTPUyba4DMwUfy` is Ready, and targeted `/privacy/request` smoke displayed the verified privacy fallback while first-party database intake remained disabled. The candidate has not been production-deployed, migrated, activated, or fully runtime/provider-evidenced.
4. The local source now implements minimized authenticated intake and account-visible status, and Tyler is recorded as the sole privacy owner. Resend verifies `capitolwonk.com`; Porkbun forwards the privacy and three public sender aliases to one owner-controlled external inbox, and Vercel Production/Preview hold the corresponding sender/contact configuration. The destination inbox is intentionally omitted and no forwarding/outbound delivery test was sent. No backup is currently available. The [September 13 single-owner contingency](privacy-operations-single-owner-contingency-2026-09-13.md) now documents a fail-closed proposed procedure, but secure export delivery, resolution tooling, monitoring, retention decisions, backup coverage, and a completed synthetic operating exercise remain absent. Batch B remains blocked until those items are implemented or the public promises are narrowed.
5. The local policy review date and Sentry/deletion wording were corrected to September 12. Fresh exact-source review, CI/Preview, runtime/provider reconciliation, and separate deployment approval remain required before publication.

The approved local copy changes are frozen in source candidate `92b61b9` and have fresh CI/Preview plus gate-off smoke evidence. They are not production-source or runtime evidence; authenticated/runtime-provider review and separate deployment approval remain required before publication.

## Read-Only Provider Implications

- The intended-production Neon project is displayed as `CapitolWonk`, with a setting-verified seven-day history window and protected default `production` branch. The constrained restore floor is approved. Phase 1, automatic child cleanup, final target reconciliation, and empty-database hygiene are complete; literal `Capitol%20Ledger` contains the application schema and production reads. Restore-drill phases 2–5, fresh non-secret target binding, backup health, watermark review, and exact production preflight must still pass before Batch A.
- Vercel Pro with Observability Plus exposes a 30-day runtime-log window; no project drains or project webhooks were present, but sanitized runtime evidence remains missing and the team-global webhook list was not visible to the current role.
- Sentry project scrubbers/default scrubbers/IP prevention and the recursive `$user.geo.**` rule are enabled on both projects. Organization-wide 2FA enforcement, Enhanced Privacy, default data scrubber, and default IP prevention are off; shared issues are enabled. Minidump storage is disabled. No current event sample proves actual retained fields.
- Resend Pro documents 30-day email/log retention and seven-day backups. `capitolwonk.com` is verified for sending and the existing Vercel Resend secret was preserved; no test message was sent and no Resend webhook is configured.
- Vercel Production and Preview now configure the auth sender, Weekly Brief sender, and privacy-contact alias. Team invites intentionally inherit the auth sender. This is configuration evidence, not end-to-end delivery, retention, webhook, or removal proof.

## Existing Asset Audit

| Artifact | Exact technical evidence | Release finding |
| --- | --- | --- |
| `docs/app-store-assets/listing/capitolwonk-iphone-6.5-dashboard.png` | 1284 x 2778 PNG, sRGB RGBA, 2,889,527 bytes; SHA-256 `c5a8d918a3582162a2f06070e120df2229b52125af3ffbbdfcefcbd745b50007` | Visibly uses the retired `CE` suffix; must not be reused as the final CapitolWonk listing image. |
| `docs/app-store-assets/listing/capitolwonk-ipad-13-dashboard.png` | 2064 x 2752 PNG, sRGB RGBA, 2,480,970 bytes; SHA-256 `893f9d310610a690f5d061025005891194bb655d5fa9369b0d06920c859b281f` | Visibly uses the retired `CE` suffix; also shows native plus faux status chrome, a phone bezel/notch, and large black gutters at iPad width. |
| `docs/app-store-assets/review/capitolwonk-pro-monthly-review.jpg` | 2736 x 1260 JPEG, sRGB, 216,197 bytes; SHA-256 `73a06cfaa6340c42981d9c36d80b377d49441b15122ac82a5c4f560dce7b2939` | Contains unconditional `7-DAY TRIAL` / `Start 7-day free trial` copy. It is stale and is not the required redacted product-configuration evidence. |

The listing screenshots have been unchanged since `28f3fc7`. Their populated July dashboard lacks documented route, account, and state provenance that can be reproduced under current candidate `92b61b9`'s intentional blank-account/demo isolation. A deliberately provisioned sanitized authenticated screenshot account may be populated, but it must be assigned and evidenced; otherwise use an honest blank/public narrative. Do not reintroduce fallback demo records for marketing.

## Safe Recapture And Review Plan

1. Draft locally only until purchase copy, provider/privacy wording, and physical-device QA pass. Preserve the historical files until replacements are explicitly approved.
2. Pin captures to the eventual exact release source. Current source candidate `92b61b9` and branch/documentation head `0c09abc` are non-production evidence only; rerun capture evidence after any source change.
3. Use only sanitized assigned state. Capture dashboard, bill search/results, bill detail, member detail, alerts, Daily Brief, and upgrade surfaces that truthfully represent launch scope.
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
