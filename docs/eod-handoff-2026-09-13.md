# CapitolWonk Handoff — September 13, 2026

Prepared for a fresh September 13 task after the completed Neon cleanup. Exact non-production source candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` remains isolated and unmerged on `codex/sept12-privacy-neon-candidate`. Verified cleanup/documentation checkpoint `0d07e10e66501ce00c8993351dfc5ad2adb6ce86` is pushed in [PR #8](https://github.com/Tylerandersongates/Capitol-Ledger/pull/8); [GitHub CI #318](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34777564895) passed and the matching Vercel Preview completed successfully. Production remains `main` at `7ec68bcf142d6defe865c12959b0f9a84fce72d5`. The candidate remains unmerged, first-party privacy intake remains disabled, and no migration, restore, candidate production deployment, App Store change, signing action, upload, distribution, submission, or release occurred.

Tyler reports that Apple Support still has not replied and plans to call Apple on September 14. Preserve the certificate, CSR, Keychain, profile, signing, and device freeze until the guidance is documented and one exact action is reviewed. The Apple wait does not block the non-mutating release-preparation queue below.

## Completed September 13

- Confirmed the temporary Neon restore branch and compute expired automatically; only protected default branch `production` remains.
- Reconciled the database target using independent repository, schema, query-history, and live-read evidence. Production application reads use literal `Capitol%20Ledger`, which contains the expected 29 public application tables.
- Confirmed spaced-name `Capitol Ledger` had zero public tables, no application-query dependency, and no tracked runtime dependency outside the database guard's negative self-test.
- With Tyler's separate exact confirmation, permanently deleted only the empty 7344 kB spaced-name database. Neon now retains `neondb` and application database `Capitol%20Ledger`.
- Repeated the production read smoke after deletion successfully.
- Pushed cleanup checkpoint `0d07e10`; exact-head CI #318 passed and the matching Vercel Preview completed successfully.

## Current Release Boundary

- Repo: `Tylerandersongates/Capitol-Ledger`
- Working branch: `codex/sept12-privacy-neon-candidate`
- Pull request: [PR #8](https://github.com/Tylerandersongates/Capitol-Ledger/pull/8)
- Exact source candidate: `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86`
- Verified cleanup/documentation checkpoint before this handoff: `0d07e10e66501ce00c8993351dfc5ad2adb6ce86`
- Production source: `7ec68bcf142d6defe865c12959b0f9a84fce72d5`
- Privacy intake: default-off and inactive; verified `privacy@capitolwonk.com` fallback remains visible
- Neon: only `neondb` and active application database `Capitol%20Ledger` remain
- Production and database: unchanged except for the separately approved deletion of the empty unused database

## Work That Can Continue While Apple Support Is Pending

1. **Five-migration production promotion packet — first priority.** Reconcile the exact migration order, preconditions, fail-closed target checks, expected schema changes, verification queries, rollback/stop conditions, ownership, and separate approval points. This is preparation only: do not run a migration, restore, write query, candidate deployment, or gate activation.
2. **Privacy operations and single-owner contingency.** Finish the operating procedure for the verified privacy mailbox, request triage, identity verification, response/closure records, retention, owner absence, and escalation. Keep first-party database intake disabled and do not send a delivery test without separate approval.
3. **Provider/runtime and retention evidence.** Close remaining read-only evidence that does not require protected-value disclosure or synthetic user deletion. Clearly separate settings evidence from runtime proof and leave destructive/provider-removal exercises pending.
4. **App Store release-asset preparation.** Prepare the corrected screenshot capture checklist and local candidates that remove stale `CE` branding. Do not change App Store Connect, upload assets, or represent them as device-verified.
5. **App Privacy reconciliation.** Refine the provisional questionnaire and public-copy packet from source and existing provider evidence. Archive/runtime/WKWebView and signed-device conclusions remain provisional until the exact candidate can be tested.
6. **Daily Brief launch-scope preparation.** Draft the first real in-app edition/content checklist and make the launch-scope decision explicit. Do not publish a video or enable outbound delivery as part of this queue.
7. **Apple verifier security watch.** Continue monitoring the official fix path for Apple issue #447 through September 25 and keep the source-free fallback/control test specification ready. Do not change the dependency graph or implement a backport/replacement without a separate decision.

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

- September 13–14: Neon cleanup and candidate evidence are complete. Pull forward the five-migration packet and privacy-operations work while Apple remains external.
- September 14: Tyler plans to call Apple Support. A useful answer can reopen T04; no answer or ambiguous guidance leaves the freeze intact.
- September 15–21: execute only the Apple-supported signing step after exact review, then progress toward a signed candidate and native/device checks. The September 17 no-reply trigger remains a fallback if the call does not produce substantive guidance.
- September 22–29: target native monitoring, device QA, Apple/Team sandbox proof, and the September 25 verifier decision when prerequisites clear.
- October 1: stability ceiling before the October 2–6 owner-unavailability buffer.
- October 19: working App Review submission target, contingent on all gates and explicit approval.
- October 30: user-set launch target and final go/no-go; no automatic release.

The previous estimate remains **7–13 hands-on working days**, excluding external waits, re-review, and QA fixes, plus verifier-remediation work as documented in the timeline. October 30 remains low-confidence and materially at risk while signing, verifier remediation, sandbox, device, runtime/provider, migration, activation, and review gates remain open.

## First Task In The New September 13 Chat

Begin with the five-migration production promotion packet and privacy-operations/single-owner contingency. Work from existing repository evidence only, keep PR #8 unmerged and every production/privacy gate off, and stop before any external mutation or protected-secret entry. The deliverable should identify what is ready, what evidence is still missing, the exact later approval boundaries, and the next safest action.

## Resume Prompt

> Continue CapitolWonk from `docs/eod-handoff-2026-09-13.md`, `docs/project-timeline.md`, `Capitol Ledger App/Current Status.md`, and `Capitol Ledger App/Next Steps.md`. Confirm branch `codex/sept12-privacy-neon-candidate` is synchronized and source candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` remains isolated and unmerged in PR #8. Verified cleanup checkpoint `0d07e10` passed CI #318 and its matching Vercel Preview. Production remains `7ec68bc`; privacy intake is disabled. Neon cleanup is complete and only `neondb` plus active `Capitol%20Ledger` remain. Apple Support has not replied; Tyler plans to call September 14, so preserve the signing/device freeze. TODAY'S SAFE WORK: prepare the exact five-migration production promotion packet and privacy-operations/single-owner contingency, then continue only read-only provider/retention or local release-asset work. Do not migrate, restore, write production data, merge/deploy the candidate, activate intake, send test messages, mutate providers/App Store state, change signing, run destructive QA, upload, distribute, submit, or release without the corresponding separate approval. October 30 remains the target but is low-confidence/materially at risk.
