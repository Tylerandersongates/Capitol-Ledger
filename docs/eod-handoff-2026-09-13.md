# CapitolWonk Handoff — September 13, 2026

Current September 13 boundary after the completed Neon cleanup and local preparation pass: exact non-production source candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` remains isolated in open, unmerged [PR #8](https://github.com/Tylerandersongates/Capitol-Ledger/pull/8) on `codex/sept12-privacy-neon-candidate`. The last independent remote verification covered predecessor PR checkpoint `0c09abc0523e2f4de16f55f4d6d2465d27f4abfa`; exact-head [GitHub CI #321](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34780116093) passed and matching [Vercel Preview `7d1i8rinVS8iUhUTPUyba4DMwUfy`](https://vercel.com/capitolwonkce/project-qosv1/7d1i8rinVS8iUhUTPUyba4DMwUfy) is Ready. The documentation-only checkpoint containing this handoff descends from `0c09abc` and must receive its own live-head verification before any later action. Production remains unchanged at `main` commit `7ec68bcf142d6defe865c12959b0f9a84fce72d5`. First-party privacy intake remains disabled, and no migration, restore, candidate production deployment, App Store change, signing action, upload, distribution, submission, or release occurred.

## September 13 Continuation Preparation

- The last independent remote verification found the candidate branch and open, unmerged PR #8 synchronized at predecessor checkpoint `0c09abc0523e2f4de16f55f4d6d2465d27f4abfa`; live `main` remained `7ec68bc`. Source candidate `92b61b9` was contained by the PR and absent from `main`; exact-head CI #321 and matching Ready Preview `7d1i8rinVS8iUhUTPUyba4DMwUfy` passed for that predecessor.
- Prepared the [exact five-migration production promotion packet](production-five-migration-promotion-packet-2026-09-13.md), including file hashes, order, expected zero-DML/+4-table/+1-sequence delta, future read-only preflight/postflight companions, stop rules, partial-failure boundary, ownership, and separate approvals. Batch A remains no-go: unchanged production `7ec68bc` can still process a legacy Stripe Team `checkout.session.completed` event and write `workspaceId = 'team-owner-upgrade'`, but migration 3 replaces that sentinel convention with a foreign key to `TeamWorkspace`. An isolated mocked reproduction and a separately approved compatible-source or full source/traffic-quiescence sequence are required, in addition to restore-drill phases 2–5, isolated verifier/failure validation, a direct runner/endpoint binding, a lock/window plan, fresh production evidence, and a tested recovery procedure.
- Prepared the [privacy operations and single-owner contingency](privacy-operations-single-owner-contingency-2026-09-13.md). The intake source is guarded and minimized, but no staff resolution path, export/secure-delivery path, request retention, aggregate monitor, delivery exercise, or backup operator exists. `acknowledgedAt` is a machine receipt, not human acknowledgement. Keep intake off.
- Prepared the [source-bound local App Store capture manifest](app-store-assets/capitolwonk-capture-manifest-2026-09-13.md) and retained all stale `CE`/trial assets as quarantined history. No replacement screenshot was generated or represented as device-verified.
- Reconciled current active packets away from stale four-migration, pre-Phase-1, unpushed-candidate, old-CI, Support-only privacy-route, and unapproved-recoverability statements.
- Read-only source review found the deferred Weekly Brief task response contains per-recipient email/headline/error fields. Keep outbound delivery and its scheduler deferred until the response/log/monitor boundary is minimized and separately reviewed.
- No production/provider/App Store/Apple/signing/device state or protected value was touched. Predecessor `0c09abc` retains CI #321 and its matching Ready Preview as time-stamped evidence; verify the later documentation-only packet head separately.
- The hardened packet/SQL revision was independently reviewed and committed on a temporary reconciliation branch descended from `0c09abc`. Use the live PR head—not the temporary branch name—as the durable checkpoint after verifying that it contains the recorded hashes and passes exact-head checks. Do not run an isolated or production action from a documentation-only checkout.

Tyler reports that Apple Support still has not replied and plans to call Apple on September 14. Preserve the certificate, CSR, Keychain, profile, signing, and device freeze until the guidance is documented and one exact action is reviewed. The Apple wait does not block the non-mutating release-preparation queue below.

## Completed September 13

- Confirmed the temporary Neon restore branch and compute expired automatically; only protected default branch `production` remains.
- Reconciled the database target using independent repository, schema, query-history, and live-read evidence. Production application reads use literal `Capitol%20Ledger`, which contains the expected 29 public application tables.
- Confirmed spaced-name `Capitol Ledger` had zero public tables, no application-query dependency, and no tracked runtime dependency outside the database guard's negative self-test.
- With Tyler's separate exact confirmation, permanently deleted only the empty 7344 kB spaced-name database. Neon now retains `neondb` and application database `Capitol%20Ledger`.
- Repeated the production read smoke after deletion successfully.
- Historical cleanup checkpoint `0d07e10` passed exact-head CI #318 and its matching Vercel Preview before the later preparation checkpoints.

## Current Release Boundary

- Repo: `Tylerandersongates/Capitol-Ledger`
- Working branch: `codex/sept12-privacy-neon-candidate`
- Pull request: [PR #8](https://github.com/Tylerandersongates/Capitol-Ledger/pull/8)
- Exact source candidate: `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86`
- Verified predecessor PR checkpoint: `0c09abc0523e2f4de16f55f4d6d2465d27f4abfa` (exact-head CI #321; Ready Preview `7d1i8rinVS8iUhUTPUyba4DMwUfy`)
- Historical handoff checkpoint: `c96662a12d59ee033988d97b4454c0cf36c2d78e` (superseded first by `0c09abc` and then by the documentation-only packet descendant)
- Packet checkpoint: the commit containing this handoff is a documentation-only descendant of `0c09abc`; use `git rev-parse HEAD` and live PR status to record its exact SHA/checks before later action
- Production source: `7ec68bcf142d6defe865c12959b0f9a84fce72d5`
- Privacy intake: default-off and inactive; verified `privacy@capitolwonk.com` fallback remains visible
- Neon: only `neondb` and active application database `Capitol%20Ledger` remain
- Production and database: unchanged except for the separately approved deletion of the empty unused database

## Work That Can Continue While Apple Support Is Pending

1. **Five-migration production promotion packet — prepared, no-go for Batch A.** Review the exact packet and SQL companions. Unchanged production `7ec68bc` can still write legacy Stripe Team sentinel `team-owner-upgrade`, which migration 3 would make foreign-key-invalid; a short migration-command pause does not cover delayed or retried webhook events. The former Phase 1 child has expired. Before Phase 2, separately approve creation of a replacement temporary child/compute, protected credential handling, fresh target/baseline checks, expiry/cleanup owner, the isolated migration/fixture scope, and a mocked reproduction of the compatibility failure. Then separately review either a compatible-source-first sequence or a complete source/traffic-quiescence and delayed-event reconciliation sequence. Do not run a migration, restore, production query, candidate deployment, traffic/provider change, or gate activation under this handoff.
2. **Privacy operations and single-owner contingency — prepared, not operational.** Review the private-register boundary, cadence, identity escalation, retention, and fail-closed absence controls. Keep first-party database intake disabled and do not create a live register or send a delivery test without separate approval.
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

- September 13–14: Neon cleanup and candidate evidence are complete. The five-migration packet and privacy-operations draft are prepared; continue packet review, local static evidence, privacy decisions, and release-asset preparation while Apple remains external.
- September 14: Tyler plans to call Apple Support. A useful answer can reopen T04; no answer or ambiguous guidance leaves the freeze intact.
- September 15–21: execute only the Apple-supported signing step after exact review, then progress toward a signed candidate and native/device checks. The September 17 no-reply trigger remains a fallback if the call does not produce substantive guidance.
- September 22–29: target native monitoring, device QA, Apple/Team sandbox proof, and the September 25 verifier decision when prerequisites clear.
- October 1: stability ceiling before the October 2–6 owner-unavailability buffer.
- October 19: working App Review submission target, contingent on all gates and explicit approval.
- October 30: user-set launch target and final go/no-go; no automatic release.

The previous estimate remains **7–13 hands-on working days**, excluding external waits, re-review, and QA fixes, plus verifier-remediation work as documented in the timeline. October 30 remains low-confidence and materially at risk while signing, verifier remediation, sandbox, device, runtime/provider, migration, activation, and review gates remain open.

## Next Safest Task After This Preparation

First prove the live PR head contains the reviewed documentation-only packet/SQL checkpoint and passes its own exact-head checks; predecessor `0c09abc` does not contain every hardening change. The next execution proposal after that gate should be a narrowly scoped request to create a replacement isolated Neon child/compute and begin restore-drill Phase 2, including protected credential handling, a fresh target/baseline check, automatic-expiry/cleanup ownership, stop rules, and a no-provider mocked reproduction of the `7ec68bc` legacy `team-owner-upgrade` write against the post-migration schema. This is a provider-resource mutation and needs separate exact approval. Only after that evidence should one compatible-source or complete source/traffic-quiescence sequence be presented for separate approval; production Batch A remains later and no-go. In parallel, keep work read-only or local and keep every production/privacy/signing/release gate off.

## Resume Prompt

> Continue CapitolWonk from `docs/eod-handoff-2026-09-13.md`, `docs/project-timeline.md`, `Capitol Ledger App/Current Status.md`, and `Capitol Ledger App/Next Steps.md`. Reverify that open, unmerged PR #8 descends documentation-only from predecessor checkpoint `0c09abc0523e2f4de16f55f4d6d2465d27f4abfa`, contains the hardened packet/SQL hashes recorded here, and has passing current exact-head checks; CI #321 and Ready Vercel Preview `7d1i8rinVS8iUhUTPUyba4DMwUfy` apply to the predecessor. Reverify that source candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` remains absent from unchanged production `7ec68bc` and privacy intake remains disabled. The exact five-migration production packet, read-only SQL companions, privacy-operations/single-owner contingency, and local capture manifest are prepared but unapproved. Production Batch A is no-go because unchanged `7ec68bc` can still write legacy Stripe Team sentinel `team-owner-upgrade` after migration 3 would make that value foreign-key-invalid. The prior Neon child expired; the next safest execution proposal is a separately approved replacement temporary child/compute, fresh target/baseline checks, restore-drill Phase 2, and no-provider mocked reproduction before choosing a separately approved compatible-source or complete source/traffic-quiescence sequence. Apple Support had not replied and Tyler planned to call September 14; preserve the certificate/profile/Keychain/signing/device freeze. Continue only repository-local or authorized read-only evidence until an exact later action is approved. October 30 remains low-confidence/materially at risk.
