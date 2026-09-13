# CapitolWonk Handoff — September 13, 2026

Updated in the fresh September 13 task after the completed Neon cleanup and first Apple-independent preparation pass. Exact non-production source candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` remains isolated and unmerged on `codex/sept12-privacy-neon-candidate`. Verified pre-packet documentation checkpoint `c96662a12d59ee033988d97b4454c0cf36c2d78e` is pushed in [PR #8](https://github.com/Tylerandersongates/Capitol-Ledger/pull/8); [GitHub CI #319](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34777993751) passed and the matching [Vercel Preview](https://vercel.com/capitolwonkce/project-qosv1/7fR345u4kcq9t4Fgwnk5shLzpYGe) completed successfully. Production remains `main` at `7ec68bcf142d6defe865c12959b0f9a84fce72d5`. The candidate remains unmerged, first-party privacy intake remains disabled, and no migration, restore, candidate production deployment, App Store change, signing action, upload, distribution, submission, or release occurred.

Tyler reports that Apple Support still has not replied and plans to call Apple on September 14. Preserve the certificate, CSR, Keychain, profile, signing, and device freeze until the guidance is documented and one exact action is reviewed. The Apple wait does not block the non-mutating release-preparation queue below.

## Completed September 13

- Confirmed the temporary Neon restore branch and compute expired automatically; only protected default branch `production` remains.
- Reconciled the database target using independent repository, schema, query-history, and live-read evidence. Production application reads use literal `Capitol%20Ledger`, which contains the expected 29 public application tables.
- Confirmed spaced-name `Capitol Ledger` had zero public tables, no application-query dependency, and no tracked runtime dependency outside the database guard's negative self-test.
- With Tyler's separate exact confirmation, permanently deleted only the empty 7344 kB spaced-name database. Neon now retains `neondb` and application database `Capitol%20Ledger`.
- Repeated the production read smoke after deletion successfully.
- Pushed the first updated handoff checkpoint `c96662a`; exact-head CI #319 passed and the matching Vercel Preview completed successfully.
- Prepared the exact five-file migration manifest, guarded preflight/postflight SQL, recovery decision tree, stop conditions, and separate approval boundaries in the [five-migration promotion packet](production-five-migration-promotion-packet-2026-09-13.md). It remains no-go for production until an approved expiring-child exercise and remaining recovery evidence pass.
- Prepared the [privacy operations and single-owner contingency](privacy-operations-single-owner-contingency-2026-09-13.md). It records that the alias and source are configured but the operating lane is not activation-ready: continuity coverage, case-register/provider approval, inbound/outbound exercises, staff lifecycle, secure delivery, monitoring, retention, and legal timing decisions remain open.
- Completed the SHA-bound [static provider/logging audit](provider-logging-static-audit-2026-09-13.md). It found two P1 source risks: the Weekly Brief task returns recipient-level content to an authorized caller, and legacy Stripe error paths can propagate raw provider response text. Apple SDK cause chains, a missing explicit runtime processing gate, token-bearing URLs, and process-local rate limiting remain additional release concerns. No code or provider state changed.
- Reconciled stale candidate/Neon/email language in the active privacy, retention, and release-asset packets. These are documentation changes only; no source/runtime file or external state changed.

## Current Release Boundary

- Repo: `Tylerandersongates/Capitol-Ledger`
- Working branch: `codex/sept12-privacy-neon-candidate`
- Pull request: [PR #8](https://github.com/Tylerandersongates/Capitol-Ledger/pull/8)
- Exact source candidate: `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86`
- Verified pre-packet documentation checkpoint: `c96662a12d59ee033988d97b4454c0cf36c2d78e`
- Production source: `7ec68bcf142d6defe865c12959b0f9a84fce72d5`
- Privacy intake: default-off and inactive; verified `privacy@capitolwonk.com` fallback remains visible
- Neon: only `neondb` and active application database `Capitol%20Ledger` remain
- Production and database: unchanged except for the separately approved deletion of the empty unused database

## Work That Can Continue While Apple Support Is Pending

1. **Migration packet child-readiness review — first priority.** The packet and guarded SQL are prepared. Run no database action yet; review the exact client invocation, lock/timeout observation plan, fresh aggregate baselines, and isolated-failure test design. The next external step is a separately approved, automatically expiring Neon child—not production.
2. **Privacy operations decisions.** Review the drafted internal time controls, retention values, external case-register boundary, continuity contact/coverage, legal-security escalation, and emergency shutdown design. Keep first-party database intake disabled and do not represent the alias as a fully operated rights lane yet.
3. **P1 source-remediation decision.** The static audit is complete. Decide whether to preserve frozen candidate `92b61b9` and defer the findings, or authorize a new candidate that makes the Weekly Brief task aggregate-only and normalizes Stripe/Apple error causes. Any code change requires a new source SHA, refreeze, full checks, and packet reconciliation.
4. **Provider/runtime and retention evidence.** Close remaining read-only evidence that does not require protected-value disclosure or synthetic user deletion. Clearly separate settings evidence from runtime proof and leave destructive/provider-removal exercises pending.
5. **App Store release-asset preparation.** Prepare the corrected screenshot capture checklist and local candidates that remove stale `CE` branding. Do not change App Store Connect, upload assets, or represent them as device-verified.
6. **App Privacy reconciliation.** Refine the provisional questionnaire and public-copy packet from source and existing provider evidence. Archive/runtime/WKWebView and signed-device conclusions remain provisional until the exact candidate can be tested.
7. **Daily Brief launch-scope preparation.** Draft the first real in-app edition/content checklist and make the launch-scope decision explicit. Do not publish a video or enable outbound delivery as part of this queue.
8. **Apple verifier security watch.** Continue monitoring the official fix path for Apple issue #447 through September 25 and keep the source-free fallback/control test specification ready. Do not change the dependency graph or implement a backport/replacement without a separate decision.

## Work Still Blocked By Apple Guidance Or Signing

- Creating, revoking, replacing, or importing signing certificates/private keys; changing profiles, Keychain, or signing configuration.
- Producing a valid signed physical-device candidate.
- Consuming the one native Sentry runtime event or treating unsigned-build evidence as device proof.
- Apple/Team sandbox purchase, renewal, restore, refund, notification, and lifecycle QA.
- Physical-device account-deletion, subscription, notification, and multi-tab testing.
- TestFlight upload/distribution, App Review submission, or release.

## September 14 Apple Call Handoff

- Use the existing Apple Support case; do not open a duplicate unless Apple directs it.
- Keep the private case identifier out of tracked notes and screenshots.
- Ask Apple to explain the supported recovery path for the current state: zero usable signing identities, one unexpired matching Xcode-managed App Store profile, stable Xcode 26.6 selected, and no currently available physical iPhone.
- Record Apple's exact guidance and any case update. Do not revoke/delete certificates or profiles, create a new certificate, modify Keychain, change Xcode signing, or upload a build merely because it is suggested live; first reconcile the instruction against the project state and present one narrow action for approval.

## Schedule

- September 13–14: Neon cleanup and candidate evidence are complete. The five-migration packet and privacy-operations draft are prepared; continue packet review, local static evidence, privacy decisions, and release-asset preparation while Apple remains external.
- September 14: Tyler plans to call Apple Support. A useful answer can reopen T04; no answer or ambiguous guidance leaves the freeze intact.
- September 15–21: execute only the Apple-supported signing step after exact review, then progress toward a signed candidate and native/device checks. The September 17 no-reply trigger remains a fallback if the call does not produce substantive guidance.
- September 22–29: target native monitoring, device QA, Apple/Team sandbox proof, and the September 25 verifier decision when prerequisites clear.
- October 1: stability ceiling before the October 2–6 owner-unavailability buffer.
- October 19: working App Review submission target, contingent on all gates and explicit approval.
- October 30: user-set launch target and final go/no-go; no automatic release.

The previous estimate remains **7–13 hands-on working days**, excluding external waits, re-review, and QA fixes, plus verifier-remediation work as documented in the timeline. October 30 remains low-confidence and materially at risk while signing, verifier remediation, sandbox, device, runtime/provider, migration, activation, and review gates remain open.

## Next Task In The September 13 Chat

Review the prepared five-migration packet for an exact expiring-child invocation and failure/lock observation plan, then decide whether the two P1 static-audit findings should create a new source candidate or remain deferred. Work from existing repository evidence only, keep PR #8 unmerged and every production/privacy gate off, and stop before any external mutation or protected-secret entry. The next safest external action remains a separately approved expiring Neon child after the packet review—not a production migration.

## Resume Prompt

> Continue CapitolWonk from `docs/eod-handoff-2026-09-13.md`, `docs/project-timeline.md`, `Capitol Ledger App/Current Status.md`, and `Capitol Ledger App/Next Steps.md`. Confirm branch `codex/sept12-privacy-neon-candidate` is synchronized and source candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` remains isolated and unmerged in PR #8. Verified pre-packet checkpoint `c96662a` passed CI #319 and its matching Vercel Preview. Production remains `7ec68bc`; privacy intake is disabled. Neon cleanup is complete and only `neondb` plus active `Capitol%20Ledger` remain. The five-migration promotion packet/pre-postflight SQL, privacy single-owner operating draft, and SHA-bound static provider/logging audit are prepared but authorize no action. The audit found P1 Weekly Brief response minimization and Stripe provider-error normalization work; changing source would create a new candidate and require refreeze/reconciliation. Apple Support has not replied; Tyler plans to call September 14, so preserve the signing/device freeze. TODAY'S SAFE WORK: finish the migration packet child-readiness review; decide the P1 source-remediation boundary; review privacy operational choices; or continue local release-asset/App Privacy preparation. Do not migrate, restore, write production data, merge/deploy the candidate, activate intake, send test messages, mutate providers/App Store state, change signing, run destructive QA, upload, distribute, submit, or release without the corresponding separate approval. October 30 remains the target but is low-confidence/materially at risk.
