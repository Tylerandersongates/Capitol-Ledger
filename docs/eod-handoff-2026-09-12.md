# CapitolWonk EOD Handoff — September 12, 2026

Finalized for September 13 resumption after the approved Neon read-only/constrained-restore Phase 1 work, Option 1 privacy-intake implementation and freeze, controlled-domain email setup, same-source production configuration refresh, and documentation-only candidate verification. Exact non-production source candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` remains isolated on `codex/sept12-privacy-neon-candidate`. Documentation checkpoint `3b78e02b4de1fee7589f6bf1f788204c7cc64ca7` is pushed in [PR #8](https://github.com/Tylerandersongates/Capitol-Ledger/pull/8); [exact-head GitHub CI #315](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34720190325) passes, the matching Vercel Preview is Ready, and targeted `/privacy/request` smoke shows the verified privacy fallback while database-backed intake remains disabled. Production remains `main` at `7ec68bcf142d6defe865c12959b0f9a84fce72d5`. No candidate merge, production migration, privacy-intake activation, destructive QA, App Store change, signing action, upload, distribution, submission, or release occurred. October 30 remains the user-set launch target and is still low-confidence/materially at risk while signing, verifier remediation, sandbox, device, runtime/provider, and review gates remain open.

## Baseline

- Repo: `Tylerandersongates/Capitol-Ledger`
- Branch: `codex/sept12-privacy-neon-candidate`
- Branch checkpoint before this EOD document: `3b78e02b4de1fee7589f6bf1f788204c7cc64ca7`
- Verified source candidate: `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86`
- Origin sync before this EOD document: branch and upstream match at `3b78e02`
- Production source: `7ec68bcf142d6defe865c12959b0f9a84fce72d5`
- Exact-head CI: run `34720190325` / CI #315, passed
- Matching Preview: Ready at `https://project-qosv1-30bem9whr-capitolwonkce.vercel.app`
- Preview smoke: `/privacy/request` displays `privacy@capitolwonk.com`, states that first-party intake is inactive, and exposes no database-backed submission form
- Tomorrow's scheduled first gate: one-time read-only Neon temporary-branch expiry verification on September 13 at 12:00 PDT

## Completed Today

- Reconciled the September 11 branch, production, provider, Apple, dependency, privacy, asset, and schedule evidence without changing production.
- Verified Neon's paid plan, CapitolWonk project name, seven-day history setting, and protected default production branch. The approved constrained-restore child contains the exact literal-name application database, expected `public` schema, 29 tables, 12 finished migrations plus the known resolved retry, and exactly five pending candidate migrations.
- Completed the approved Phase 1 aggregate read-only check. It found zero deletion-request rows across every relevant state and relationship, so the baseline is `no completed-deletion watermark present`. No restore, migration, record mutation, or manual branch deletion occurred.
- Added fail-closed database-target validation and froze Option 1 first-party privacy intake at source candidate `92b61b9`. The intake gate remains off by default; the verified mailbox is the fallback.
- Reclassified production transitive `jsrsasign@11.1.5` as an active release gate because Apple issue #447 affects the enabled OCSP-freshness path. Prepared the source-free fallback/control specification; no dependency or verifier implementation changed.
- Verified `capitolwonk.com` in Resend and installed the required Porkbun sending records. Configured the `info`, `privacy`, `accounts`, and `briefs` aliases to forward to one owner-controlled external inbox; its address is intentionally omitted from tracked evidence.
- Updated Vercel Production and Preview sender/contact values for CapitolWonk without viewing or rotating the existing sending secret. Redeployed the unchanged production source so the new environment values became active; live `/privacy` smoke passed. No test email was sent.
- Pushed the final documentation-only candidate checkpoint. Exact-head CI #315 passed, the matching Preview reached Ready, and the exact Preview privacy-fallback/gate-off smoke passed.

## Diagnostics And QA

- Frozen production dependency audit: passed, no known vulnerabilities.
- Frozen full dependency audit: passed, no known vulnerabilities.
- `release-source:check`: passed with the pinned pnpm 9 toolchain available on this host.
- Strict `release-candidate:check`: reached only the expected boundary of eight protected database/App Store values absent from this intentionally secret-free worktree; no code or dependency check failed and no secret was exposed.
- Exact-head GitHub CI #315: passed installation, local Preview runtime, strict TypeScript, public-brand consistency, lint, feedback readiness, production/full audits, release-source safeguards, and optimized build.
- Exact matching Vercel Preview: Ready; targeted `/privacy/request` smoke passed with the fallback visible and intake disabled.
- Temporary pnpm launcher created for the local check was removed. The worktree remained on the pinned dependency graph.
- Open QA: automatic Neon child expiry, later constrained-restore drill phases, real PostgreSQL migration/runtime/cleanup behavior, forwarding/outbound delivery, privacy operations and single-owner contingency, Apple signing, native monitoring, physical-device behavior, Apple/Team sandbox lifecycle, and review/distribution.

## Current State And Carryovers

- T01: complete and live for the shared web wordmark. Corrected listing screenshots remain under T09.
- T02: complete for new Sentry events based on the approved recursive geography scrub and current settings re-read. No new probe is authorized.
- T03: advisory-clean frozen graph, but high/open release risk remains because Apple issue #447 affects the enabled OCSP path and `jsrsasign` is end-of-life. Wait for an official fix through September 25 or obtain separate approval for a reviewed fallback/replacement.
- T04: blocked pending Apple Support. Zero usable signing identities and no available physical iPhone remain the last verified state. Preserve the certificate, profile, Keychain, signing, and device freeze. If no substantive reply exists September 17, prepare one sanitized same-case escalation for Tyler's approval; do not send or duplicate it automatically.
- T05: protected/native monitoring source and unsigned-build evidence are partial; one native runtime event remains paused until a valid signed/device candidate and exact action review exist.
- T06: physical-device QA is pending T04 and device availability.
- T07: Apple/Team lifecycle source and execution matrix are prepared; Apple Sandbox and signed-device proof remain pending.
- T08: channel and banner exist; the first real Daily Brief video, player/runtime evidence, destination update, and launch-scope decision remain open.
- T09: source candidate, Neon Phase 1, controlled-domain email, CI, Preview, and gate-off smoke are complete. Automatic branch cleanup, protected runtime/provider evidence, five-migration production packet, privacy operations, single-owner contingency, delivery exercises, corrected screenshots, App Privacy reconciliation, and every migration/deployment/activation decision remain open.
- T10: upload, tester distribution, and App Review submission remain pending and require separate exact approvals.
- T11: October 30 remains the target, not release authorization. Final go/no-go remains pending T03–T10 evidence and Tyler's explicit decision.
- Deferred scope remains unchanged: provider-backed rate limiting, final auth-email volume, civic-data freshness/fallback decisions, source-grounded AI/live-provider verification, Senate vote scope, Daily Brief outbound delivery, the Supreme Court sister app after main-app TestFlight, and state legislation in a later main-app update.

## Schedule To October 30

- September 12–14 milestone: implementation, candidate freeze, controlled-domain email refresh, exact-head CI, matching Preview, and privacy fallback smoke are complete. The remaining item in this window is the scheduled read-only Neon expiry confirmation.
- September 15–21: T04 can advance only after Apple guidance and Tyler's exact approval. September 17 is the no-reply escalation preparation trigger.
- September 22–29: target native monitoring, device QA, Apple/Team sandbox proof, and the September 25 verifier/readiness decision only after prerequisites clear.
- September 29–October 1: complete provider/privacy/deletion reconciliation, corrected release assets, upload decision, and pre-availability handoff. October 1 remains the stability ceiling.
- October 2–6: preserve the owner-unavailability buffer with no required approvals, device sessions, uploads, or submissions.
- October 7–16: resume when availability is confirmed; finish regression, metadata, screenshots, support coverage, and the final candidate.
- October 19: working App Review submission target after every gate and explicit approval.
- October 20–29: preserve review, fix, retest, and release contingency.
- October 30: user-set launch target and final go/no-go; no automatic release.

The September 11 product/release estimate was **7–13 hands-on working days**, excluding external waits, re-review, and QA fixes. The verifier gate adds scenario-dependent work: approximately **8–15 total** for a fully sufficient official package, **9–17** for an official fix plus local controls, **10–18** for a reviewed backport plus controls, or **11–20** for replacement. Today's completed provider/email/candidate work reduces uncertainty but does not remove the sequential signing, verifier, sandbox, device, runtime, or review critical path. The project remains behind the first internal checkpoint and October 30 remains low-confidence/materially at risk; do not call it on track or move the date without Tyler's decision.

## Tomorrow's First Task And Next Best Steps

1. At the scheduled September 13 check, verify read-only that Neon's temporary Phase 1 branch expired automatically and that the protected production branch and application database are unchanged. Do not delete anything manually.
2. Record the exact expiry result in the Neon/provider evidence and timeline. If the child still exists, report the state and wait; do not convert the read-only check into deletion approval.
3. Keep PR #8 unmerged and privacy intake off. Do not migrate, deploy the candidate, activate intake, send a test email, or run destructive QA without the corresponding separate approval.
4. Recheck Apple Support only when resuming T04 work. If guidance arrives, inspect it read-only and present one narrowly scoped action. If there is no guidance, retain the September 17 trigger.
5. Continue the official Apple-library fix watch through September 25. Do not implement a backport/replacement from the prepared specification without a separate decision.
6. Pull forward only dependency-ready preparation: the five-migration evidence packet, privacy single-owner contingency/operations design, or corrected screenshot capture plan. Preserve the October review and availability buffers.

## Resume Prompt

> Continue CapitolWonk from `docs/eod-handoff-2026-09-12.md`, `docs/project-timeline.md`, and `docs/production-privacy-deletion-approval-packet-2026-09-11.md`. First confirm branch `codex/sept12-privacy-neon-candidate` is synchronized at the documented checkpoint and that exact non-production source candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` remains isolated and unmerged. Documentation checkpoint `3b78e02` passes exact-head GitHub CI #315; the matching Vercel Preview is Ready, and exact `/privacy/request` smoke shows `privacy@capitolwonk.com` while database-backed intake remains disabled. Production remains `7ec68bc`. TOMORROW'S FIRST TASK is the scheduled one-time read-only Neon temporary-branch expiry verification on September 13 at 12:00 PDT. Confirm automatic expiry and unchanged production state; do not delete manually. T03 remains gated by Apple issue #447, and T04 remains blocked pending Apple Support with the signing/device freeze intact. October 30 remains the user-set launch target but is low-confidence/materially at risk. Seek separate exact approval before any manual branch deletion, restore, migration, candidate deployment, intake activation, test message, provider mutation, App Store change, signing action, destructive QA, upload, distribution, submission, or release.
