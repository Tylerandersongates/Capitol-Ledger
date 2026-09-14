# CapitolWonk EOD Handoff — September 11, 2026

Finalized for September 12 resumption after the September 11 Apple/Team lifecycle, privacy/deletion, blank-account, and channel work was frozen and verified as non-production source candidate `3dbba3a260b10924dff254deed7f65a5e392c239` on `codex/logo-refresh-sept10`. [Exact-head GitHub CI run `34668039916`](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34668039916) passes. Matching Vercel Preview deployment `6K9Xd24c4Pg4Nz1pRLorNzo6MxGb` is Ready, and targeted anonymous smoke passes on `/dashboard`, `/search?type=bills`, and `/brief`. Documentation/asset checkpoint `d662aae` preserves this evidence and the uploaded YouTube banner source. Production remains `main` at `7ec68bc`; no migration, production deployment, protected configuration, provider mutation, App Store Connect change, signing action, upload, distribution, submission, or release occurred. October 30 remains the user-set launch target and is still low-confidence/materially at risk while T04 and the remote/device gates remain open.

## Baseline

- Repo: `Tylerandersongates/Capitol-Ledger`
- Branch: `codex/logo-refresh-sept10`
- Branch HEAD at handoff start: `d662aae167c78c526ef5fc1bc95b46365499e4d3`
- Verified source candidate: `3dbba3a260b10924dff254deed7f65a5e392c239`
- Origin sync: branch and upstream matched at `d662aae`; verified source candidate is its direct parent
- Production source: `7ec68bcf142d6defe865c12959b0f9a84fce72d5`
- Exact-head CI: run `34668039916`, passed in 2m 4s
- Matching Preview: deployment `6K9Xd24c4Pg4Nz1pRLorNzo6MxGb`, Ready in 1m 32s
- Preview URL: `https://project-qosv1-5stkoj6c4-capitolwonkce.vercel.app/`

## Completed Today

- Froze the Apple server-state/Notifications V2, Team fail-closed transition, privacy/deletion activation, telemetry minimization, fourth migration, expanded fixture, and blank-account isolation work in the branch candidate.
- Created an isolated local Node `22.22.3`/pnpm `9.15.9` install after discovering the worktree's old `node_modules` symlink targeted another worktree. The symlink was moved recoverably to `/private/tmp/capitolwonk-node_modules-link-2ec3`; no other worktree install was changed.
- Completed frozen production and full dependency audits; both report no known vulnerabilities. The deprecated/unmaintained transitive `jsrsasign@11.1.5` has no current advisory but remains an explicit maintenance-risk decision.
- Passed the complete release-source suite, normal Prisma generation, local ESLint, and TypeScript. The first exact-head CI run correctly caught four unused demo paths; candidate `3dbba3a` removes only those dead paths and passes the exact strict TypeScript command.
- Passed final exact-head CI, matching Ready Vercel Preview, and anonymous Preview smoke. Blank dashboard and search surfaces show no fallback demo bills or votes; the Daily Brief remains the honest first-video placeholder.
- Repeated the intended-production preflight read-only. Prisma reports 16 repository migrations and exactly four pending in order: the three September 10 privacy/deletion migrations followed by `20260911110000_app_store_server_state`. Aggregate orphan/sentinel checks remain clean; no database write occurred.
- Preserved the generated 2560×1440 CapitolWonk YouTube banner source and recorded that the channel banner is uploaded. The public channel still has no first video.
- Reconciled the current timeline, status, next-steps, dependency, and production approval documents to the verified September 11 candidate.

## Diagnostics And QA

- `pnpm run audit:prod`: passed, no known vulnerabilities.
- `pnpm run audit:full`: passed, no known vulnerabilities.
- `pnpm run release-source:check`: passed, including billing, StoreKit state/relink, Team, privacy/deletion, iOS bridge, TestFlight readiness, launch-copy, dashboard blank-state, search live-fallback, and blank-account isolation checks.
- `tsc --noEmit --noUnusedLocals --noUnusedParameters`: passed on `3dbba3a`.
- Local ESLint: passed with no warnings/errors.
- Local Next production build: did not pass locally; compilation exceeded the constrained host's 512 MB JavaScript heap. The matching Vercel build passed, so record this as a local-host limitation rather than a local build success.
- Memory diagnostic: the 8 GB host reported about 35% free memory and no abandoned CapitolWonk Node/Next build worker. Codex/ChatGPT accounted for about 2.28 GB across 233 accumulated processes, including renderer and browser-control helpers. The 512 MB Node heap was a deliberate guard, not an OS address-space limit.
- Memory recovery: fully quit and reopen Codex before tomorrow's work. Exact-head CI/Vercel remain the verified build workaround. If local build evidence is useful after restart, retry once with the exact Node 22/pnpm 9 toolchain, a 1 GB Node heap, and one build worker; stop if host pressure returns. Deleting `.next` or `node_modules` only recovers disk space and is not the RAM fix.
- Open QA: real PostgreSQL advisory-lock concurrency, Apple Sandbox purchase/relink/lifecycle behavior, Notifications V2 delivery/replay, Team transitions, and signed physical-device behavior.

## Current State

- T01 and T02 remain complete for their recorded production/evidence scopes.
- T03 remains historically complete for `f4f04de`; the current frozen graph is advisory-clean, with only the non-advisory `jsrsasign` maintenance decision open.
- T04 remains blocked pending Apple Developer Support. Zero usable signing identities and no currently available physical iPhone remain the last verified state. Preserve the signing/profile/device freeze and inspect any reply read-only before proposing one supported action.
- T07 source and execution preparation are committed and branch-verified; Apple Sandbox and signed-device proof remain open.
- T08 channel setup and banner are complete. The first real video, captions/transcript/sources, player runtime evidence, launch-scope decision, and App Store destination link remain open. Replace the channel Daily Brief destination when a stable public Apple App Store product URL exists; add Google Play later.
- T09 source/branch evidence is restored. Provider/PITR/retention proof, `jsrsasign` decision, default-off production sequence approvals, App Privacy reconciliation, and corrected listing screenshots remain open.
- T10 upload/distribution/review and T11 final go/no-go remain pending.

## Updated Schedule To October 30

| Window | Direction and exit evidence |
| --- | --- |
| September 12–14 | While Apple is pending, complete read-only provider/PITR/retention evidence, prepare the `jsrsasign` decision, and reconcile App Privacy plus corrected screenshot inputs without publishing. |
| September 15–21 | After Apple guidance and Tyler's exact approval, establish the T04 signing path and exact signed native candidate; begin T05 native monitoring proof. If no supported path is approved by September 17, flag September 25 and October 19 as likely to slip. |
| September 22–29 | Complete T05 native checks, T06 physical-device QA, and T07 Apple/Team sandbox matrix. September 25 is the readiness go/no-go checkpoint. |
| September 29–October 1 | Decide first-video launch scope; finish T09 provider/privacy/deletion reconciliation, corrected assets, and exact TestFlight upload/distribution decision. October 1 is the pre-buffer stability ceiling. |
| October 2–6 | Protected owner-unavailability buffer; schedule no required approvals, device sessions, uploads, or submissions. |
| October 7–16 | Finish beta fixes, regression, metadata, screenshots, support coverage, and the final release candidate. October 16 is the release-candidate checkpoint. |
| October 19 | Working target for App Review submission after every gate and Tyler's explicit approval. |
| October 20–29 | Preserve for Apple review, fixes, retest, and release contingency. |
| October 30 | User-set launch target and final go/no-go; not automatic release authorization. |

Estimated remaining hands-on work is **7–13 working days**, improved from 8–15 because the source candidate, blank-account isolation, dependency/source checks, exact migration preflight, CI/Preview/smoke, and channel banner work are complete. This excludes additional QA fixes, re-review, and external Apple/provider waits. The forecast remains low-confidence/materially at risk until T04 signing, sandbox, device, and review evidence exist.

## Next Best Steps

1. Restart Codex to clear accumulated renderer/helper memory, open a fresh task from the resume prompt below, and confirm branch/upstream plus candidate evidence before changing anything.
2. While Apple is pending, collect read-only provider evidence for Neon restore/PITR, Vercel retention/drains, Sentry scrub/products/retention, and enabled email/webhook boundaries. Do not change settings.
3. Present the `jsrsasign@11.1.5` maintenance-risk options for Tyler's explicit decision; do not treat absence of an advisory as automatic acceptance.
4. Prepare the corrected App Store listing screenshot recapture and the exact App Privacy/provider reconciliation package without publishing it.
5. When Apple replies, inspect the response read-only and present one narrowly scoped T04 action for approval. Do not create a duplicate support case automatically.
6. When the first Daily Brief video inputs exist, complete upload/content QA and replace the channel destination with the public App Store URL only after that URL is stable.

## Resume Prompt

> Continue CapitolWonk from `docs/eod-handoff-2026-09-11.md`, `docs/project-timeline.md`, and `docs/production-privacy-deletion-approval-packet-2026-09-11.md`. First confirm branch `codex/logo-refresh-sept10` is synchronized at the documented handoff checkpoint and that verified non-production source candidate `3dbba3a260b10924dff254deed7f65a5e392c239` remains its source boundary. That candidate passes exact-head CI run `34668039916`, matching Ready Vercel deployment `6K9Xd24c4Pg4Nz1pRLorNzo6MxGb`, and anonymous `/dashboard`, `/search?type=bills`, and `/brief` smoke. Production remains `7ec68bc`. The read-only production preflight confirms exactly four pending migrations with clean aggregate safety checks. T04 remains blocked pending Apple Support; preserve the signing freeze. Tomorrow's first substantive task is read-only provider/PITR/retention evidence, followed by the `jsrsasign` decision packet and corrected release-asset/App Privacy preparation. The Mac has 8 GB RAM; restart Codex before resuming to recover accumulated renderer/helper memory. Exact-head CI/Vercel are the verified build workaround; retry a local build only after restart if useful. Seek separate explicit approval before any production migration/deployment/configuration, destructive QA, provider mutation, App Store change, signing action, upload, distribution, submission, or release.
