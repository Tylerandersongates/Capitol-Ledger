# CapitolWonk Handoff — September 25, 2026

## Standing Rules

<!-- BEGIN EOD STANDING RULES -->
- Codex makes routine, in-scope decisions and keeps moving without asking Tyler at each step: source-only preparation, safe read-only checks that do not expose protected values, small reversible fixes, ordinary local validation/builds, commits, non-destructive pushes, PR preparation and low-risk documentation/default-off PR merges after exact-head checks, and visible app QA. Pick the next dependency-ready step; do not stop for a routine “confirm.”
- Only major actions need Tyler's exact, action-time approval. Major means material architecture/dependency/security changes; production capability activation or materially behavior-changing deployment; production schema, migration, ACL, role, or data writes; destructive or real-provider operations; protected configuration, credential/secret handling or disclosure; billing/subscription/product or paid-plan changes; Apple signing/account/security changes; signed build upload, tester invitation/distribution, public link, App Review/TestFlight submission, or release. State the exact target, effect, stop rule, and recovery path. One approval covers only its stated action, not later gates.
- Do not re-ask for a completed, verified approval or repeat completed work. Mark dated no-go/pending instructions historical when later evidence supersedes them. A source-only deploy, green check, or passing read does not activate a gated runtime path.
- Speak directly and concisely. Give next best steps after each completed work block and in every EOD; distinguish the single next safe action from the full carryover ledger.
- Keep the in-app browser open and visible during app testing/QA so Tyler can follow progress, and leave useful evidence open at handoff. Do not close user tabs merely to tidy the day.
- A whole-app diagnostic checks stale/duplicate/unreachable code, disconnected routes/APIs, failing safeguards, serialized calls, build errors, and obvious performance drag. Tighten proven safe issues, but do not delete compatibility surfaces or assets without evidence. Mark live reports resolved only after the fix is verified.
- Use **CapitolWonk** as the public app name and **Daily Brief** as the public feature name. Keep internal `Weekly Brief` compatibility names and stable bundle, SKU/product, account-token, telemetry, and storage identities until an explicitly approved migration or product decision.
- Never expose or commit credentials, protected values, private keys, tokens, Apple account/team or bundle identifiers, tester credentials, transaction/device identifiers, private support-case IDs, or customer data. Use narrow sandbox escalations; keep sensitive personal reasons out of tracked scheduling notes.
- The Mac login/iCloud Keychain incident is closed. Do not sign out of iCloud, reset encrypted iCloud data, delete keychains, remove trusted devices, alter FileVault, or modify the preserved old keychain/recovery copy. Do not repurchase a subscription to establish state; verify the entitlement first and use Restore Purchases once only if the baseline is inconsistent.
- Preserve the T04 certificate/CSR/private-key/Keychain/profile/signing/device freeze until substantive Apple Support guidance is documented and one supported action is reviewed. Keep T03 App Store verifier processing off while its security/acceptance gates remain open. Never treat an unsigned build or old QA as signed-device proof.
- Keep privacy intake, deletion, retention, operations, monitoring, App Store server verification, and Notifications V2 off until their separate production evidence and activation approvals. Do not infer a role, migration, ACL, credential, provider capability, scheduler, shell binding, or production operator from source-only packets.
- Continue App Store/TestFlight preparation without submission. Do not upload or distribute a build, create a public TestFlight link, invite external testers, submit for review, or release without Tyler's approval for that exact build/action/scope. Do not clear sandbox purchase history or delete a tester without exact approval.
- At every EOD reconcile `docs/project-timeline.md`: actual completions, all unfinished T01–T12/deferred tracks, owners/dependencies, remaining effort, prior/revised dates, and evidence-based forecast confidence. If ahead, pull forward only scoped dependency-ready work; never discard QA, approval, availability, or review/rework contingency.
- Keep Tyler's **November 16, 2026 controlled soft-launch target** and **January 3, 2027 full 120th Congress launch target** visible without treating either as release authorization. Surface risk and preserve the October 2–6 owner-availability buffer; schedule no required approvals, device sessions, uploads, or submissions during it. Do not move either target without Tyler's decision.
<!-- END EOD STANDING RULES -->

## Completed Today

- Completed the trust-repair work and merged [PR #49](https://github.com/Tylerandersongates/Capitol-Ledger/pull/49) into `main` at `26190cd2cb953a875380f077b5b2d76c1566ac51`. All three required pull-request checks passed and the PR had no merge conflict.
- Verified the matching Vercel Production deployment `CNGPiVFrqx6XmdQdvGtrcANsiBsi` reached Ready. Anonymous Production smoke passed on `/sign-in`, `/dashboard`, and `/privacy` without mutating a Production account.
- Completed Preview-only disposable-account auth trust QA: password-reset delivery and completion, the post-reset unverified-account gate, verification-email delivery and verification, dashboard access, sign-out, and fresh sign-in with the new password all passed.
- Verified the repair for privacy-safe database failure diagnostics, text-safe Prisma advisory locks, Preview sender configuration, and pending-verification handling. No credential, reset link, verification link, token, or disposable-user value belongs in source or handoff evidence.
- Rebased the project plan from the former October 30 target to a November 16 controlled soft launch and January 3, 2027 full launch aligned with the 120th Congress. Added T12 and preserved today's approximately one-working-day benchmark gain as QA/rework contingency.
- Updated the standing EOD rules and overarching handoff prompt so the two launch dates, T01–T12 reconciliation, exact-approval boundaries, and October 2–6 owner-availability buffer remain governing guidance.
- Recovered the local checkout from a partial fast-forward failure without discarding user work. Local `main` was reconciled exactly to `origin/main` at the PR #49 merge commit before creating the documentation branch `codex/sept25-eod-launch-rebaseline`.

## Current State

- **Working:** PR #49 is merged; required CI is green; matching Production is Ready; anonymous Production smoke and the complete Preview auth trust flow passed. The trust repair is complete and should not be repeated unless later auth code invalidates the evidence.
- **Cleanup-only follow-up:** branch-scoped Vercel Preview overrides for `DATABASE_URL` and `AUTH_EMAIL_FROM` remain associated with `codex/sept19-trust-repair`. The temporary Neon Preview child was scheduled to auto-delete. Next-session work is first read-only verification of exact targets; removal of an environment override requires exact action-time confirmation.
- **Launch plan:** no work is scheduled for September 26–27 beyond passive Production monitoring. Hands-on work resumes Monday, September 28. September 28–October 1 closes the post-merge packet and freezes the pre-absence baseline. October 2–6 remains protected from required owner action. The final controlled-soft-launch regression/go-no-go window is November 9–13, soft launch is November 16, wider-use stabilization runs through December, January 2 is the full-launch go/no-go, and January 3 is the full 120th Congress launch target.
- **Confidence and remaining effort:** November 16 is moderate-high confidence with roughly 6–10 hands-on days before launch, excluding wider-use rework. January 3 is moderate confidence with another 6–12 hands-on days plus any Apple-controlled wait if native/App Store distribution is included. Today's benchmark was exceeded, but the whole project is not broadly ahead while Apple/device/sandbox, App Privacy/listing/provider evidence, Daily Brief scope, and T12 remain open.
- **Carryovers by track:** T01 core brand complete, with listing recapture conditional; T02 complete; T03 web graph closed but Apple verifier/OCSP still gated off; T04 frozen pending Apple guidance; T05 native monitoring awaits a signed candidate; T06 physical-device QA remains; T07 signed-device/App Store sandbox proof remains with processing off; T08 Daily Brief content/player/scope remains; T09 App Privacy/listing/provider evidence and Preview cleanup remain while first-party processing stays off; T10 is split into controlled web soft launch and separately gated native/TestFlight work; T11 has separate November 16 and January 3 go/no-go reviews; T12 owns the 120th Congress transition.

## Environment And Config Changes

- Preview-only branch-scoped Vercel overrides were used for direct access to the temporary Neon child and the controlled CapitolWonk sender. Production settings were not changed for disposable-account auth QA.
- The temporary Neon child was configured for automatic deletion after the QA window. Verify its absence read-only next session; do not recreate it merely to prove cleanup.
- PR #49 merge caused the ordinary matching Vercel Production deployment. No Production database write, privacy-path activation, App Store processing activation, signing change, upload, distribution, submission, or release was performed.
- Protected values were intentionally excluded from this handoff. Do not print, copy, restate, or store any value encountered during QA.

## Verification Run

- `node --import tsx scripts/check-auth-email-trust.ts`: passed on retry. The first local attempt ended with a transient esbuild `service was stopped` failure; the successful retry is the valid result.
- PR #49: all three required checks passed, no conflict, merged to `main` at `26190cd2cb953a875380f077b5b2d76c1566ac51`.
- Matching Preview for auth checkpoint `a96f8b2`: Ready. Resend showed successful password-reset and verification delivery without recording protected message content in source.
- Preview browser QA: password reset, new-password acceptance, unverified gate, verification, dashboard access, sign-out, and fresh sign-in passed.
- Matching Production deployment `CNGPiVFrqx6XmdQdvGtrcANsiBsi`: Ready. Anonymous `/sign-in`, `/dashboard`, and `/privacy` smoke passed.
- Local whole-project `tsc` did not produce a trustworthy completion result and was stopped after stalling. Do not report it as passed; the required remote CI checks are the authoritative merge evidence.
- EOD standing-rule check and documentation diff validation are required on the final documentation branch before handoff closure.

## Next Task (Single Safest Step)

On Monday, September 28, resume from `codex/sept25-eod-launch-rebaseline`, verify the documentation branch is merged or current, then run a read-only post-merge Production health check and identify the exact cleanup targets for the obsolete branch-scoped Preview overrides and temporary Neon child. Do not repeat auth QA. Do not remove an environment override until Tyler confirms that exact action at action time.

Start with:

```bash
git switch main
git pull --ff-only origin main
/Users/tylergates/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/check-eod-standing-rules.mjs
```

Then use the [active backward plan](project-timeline.md#september-25-trust-repair-completion-and-two-stage-launch-rebaseline). If Production is healthy and the cleanup targets are exact, present one bounded cleanup action with target, effect, stop rule, and recovery path. Otherwise stop at the first material discrepancy and report it without changing Production.

## Resume Prompt For New Thread

Continue CapitolWonk from the September 25 EOD handoff and treat its full Standing Rules block as the overarching project prompt. PR #49 is complete: it merged to `main` at `26190cd2cb953a875380f077b5b2d76c1566ac51`, all three required checks passed, the matching Production deployment is Ready, anonymous Production smoke passed, and Preview-only disposable-account QA passed password reset, the post-reset verification gate, email verification, dashboard access, sign-out, and fresh sign-in. Do not repeat that QA unless later auth changes invalidate it, and never expose credentials, tokens, links, or user data. The active targets are the November 16, 2026 controlled soft launch and January 3, 2027 full 120th Congress launch; October 30 is historical. Preserve October 2–6 as owner absence and do not schedule required approvals, device sessions, uploads, or submissions then. First verify the EOD documentation branch `codex/sept25-eod-launch-rebaseline` is merged/current. Next run a read-only Production health check, confirm whether the temporary Neon child auto-deleted, and identify the exact branch-scoped Preview `DATABASE_URL` and `AUTH_EMAIL_FROM` overrides left on `codex/sept19-trust-repair`. Request exact action-time confirmation before removing either override. Then complete the whole-app T01–T12 launch-gate inventory by October 1 and follow the active backward plan. Keep first-party privacy and App Store processing gates off, preserve the T04 signing/device freeze, and treat November 16 and January 3 as targets rather than release authorization.
