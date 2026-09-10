# CapitolWonk EOD Handoff — September 10, 2026

Updated after the September 3 documentation checkpoint was restored, the September 4–10 gap was reconciled, Tyler clarified the logo request, and the exact wordmark correction was released with explicit approval. Read [the current timeline and task ledger](project-timeline.md) with this handoff. **The existing logo stays. Production now omits `CE` from the shared wordmark cards. Launch target: October 30, 2026.**

## 1) Completed Today

- Confirmed the new worktree began clean at deployed merge `e82d7ea`; inspected commit `1f54fff` and read its complete September 3 EOD and project timeline.
- Created continuation branch `codex/logo-refresh-sept10` and safely restored the exact documentation-only checkpoint as `f37f05e`. No production code, migration or external state was changed by that cherry-pick.
- Reconciled September 4–10 honestly: repository history contains no product-work evidence for the interval. Five weekdays/seven calendar days elapsed, but availability is unknown; all unresolved T01–T11 work stayed unresolved until evidenced.
- Inspected the existing web logo and complete native iPhone/iPad icon family. A preview-only concept board was generated outside the repository before Tyler clarified the request; no artwork was replaced.
- Tyler confirmed the current logo should remain and identified the actual issue: visual wordmark cards still showed `CAPITOL WONK CE`.
- Found the cause in the shared `BrandWordmark`: `publicBrandName` already resolved to `CapitolWonk`, but the visible foil span independently hardcoded `Wonk CE`. CSS, environment configuration and icon assets were not the cause.
- Committed the narrow fix as `6ce9d5b`: the shared wordmark now renders `CapitolWonk`, and `scripts/check-public-brand.ts` directly guards against restoring the split-node `CE` suffix.
- Verified the corrected local dashboard at `http://127.0.0.1:3024/dashboard` in the mobile browser viewport. The retained logo is unchanged and the card visibly reads `CAPITOLWONK` without `CE`.
- Pushed branch `codex/logo-refresh-sept10`, verified its Ready Vercel preview, then obtained Tyler's explicit approval for the production release. Fast-forwarded the exact three-commit branch to `main` at `7ec68bc`; no pull-request merge commit was added.
- GitHub CI [run 34503725976](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34503725976) passed in 1m 50s. Vercel production [deployment 3DA1NsWFjwPYpFgx1GhhkjGUYMNy](https://vercel.com/capitolwonkce/project-qosv1/3DA1NsWFjwPYpFgx1GhhkjGUYMNy) reached Ready/Current from exact source `7ec68bc` in 1m 45s.
- Verified the live production dashboard, sign-in, onboarding, map and Daily Brief surfaces. Each resolves to CapitolWonk without the retired `CE` suffix; the original logo remains intact.
- Found that the current T02 blocker was based on the July 29 handoff even though pushed evidence branch `codex/sentry-geo-deep-scrub-verification` contains superseding remediation evidence. Commits `46efc95` and `d7980aa` record Tyler's approved `$user.geo.**` rule in both Sentry projects, one authorized Edge event with neither raw IP nor displayed geography, and full temporary-probe cleanup. Reconciled T02 as complete for new events without running another probe or changing external configuration.
- Reconciled the same superseding handoff's T04–T06 evidence. As last verified July 31, signing was a hard stop pending Apple Support: Xcode could see the prepared physical device, but signed attempts stopped at provisioning, zero usable identities were found, the replacement Development certificate had no matching private key and certificate ownership was unresolved. The Support response, current device connectivity and current identities were not rechecked in September, so preserve the signing freeze until a read-only current-state reconciliation and Tyler's exact-action review. Protected native Sentry setting resolution and an unsigned Release build passed through a temporary mode-0600 settings file that was removed with temporary artifacts; no native event was sent, and the approved one-event scope remains unconsumed pending a valid signed/device candidate plus exact-action review.
- Updated the timeline with the missed first checkpoint, revised planning ranges, owners, dependencies, evidence and risks. The plan is behind its first internal checkpoint; October 30 remains fixed but is low-confidence/materially at risk until the audit, signing, device and subscription gates are evidenced.

## 2) Current State

**Works locally:** the shared wordmark correction reaches dashboard, onboarding, sign-in, map and the desktop site header. Brand, launch-copy, TestFlight mobile-UI, native bridge, TypeScript and diff checks pass. The existing web/native logo artwork and every stable app/purchase/telemetry/storage/repository-target/internal Weekly Brief identifier are unchanged.

**Production baseline:** `7ec68bc` is the verified live release on `main`; CI and the Ready/Current Vercel deployment passed, and five-route live smoke confirmed the CE-free shared wordmark. No production configuration, database, Apple, YouTube, signing, distribution, native upload or review action was taken. The daily-editions migration is already applied and must not be repeated.

**Schedule:** T01 and T02 are complete, but the September 4 checkpoint still slipped. The fresh audit remains unverified, and signing retains its last-known July 31 hard stop until the Apple Support/current-signing state is reconciled read-only and Tyler approves one exact next action. Approximately 8.5–16 working days remain across T03–T11 before unknown remediation, fixes, re-review and external waits. Retain September 25 as a readiness decision, with actual readiness more plausibly September 29–October 1 only if no new blocker appears. Preserve October 2–6 as zero owner-dependent capacity, October 7+ as tentative, October 16 as the conditional final-candidate checkpoint, October 19 as the explicitly approved submission target, October 20–29 for review/rework and October 30 for final go/no-go.

| ID | Status, owner, evidence, estimate and risk |
| --- | --- |
| T01 | Completed and deployed September 10. Tyler retained the logo; `6ce9d5b` implemented the wordmark fix, and production source `7ec68bc`, CI, Vercel and live smoke pass. No T01 hands-on effort remains; current web-card risk is low/closed. The two listing screenshots still contain `CE` and must be recaptured before reuse under T09. |
| T02 | Completed for new events; superseding evidence recovered September 10. Tyler chose remediation. Commits `46efc95` and `d7980aa` record the recursive `$user.geo.**` rule in both projects, a single authorized July Preview Edge event with no raw IP or displayed geography, and complete probe cleanup. No T02 effort remains; the release gate is closed for new events based on that historical one-event verification. Old events were not rewritten, no September probe or protected change was made, and the live rule was not re-read because the available Sentry session is signed out. |
| T03 | Dependency status unverified after pnpm 9/11 service timeouts. Codex/audit service own verification; Tyler owns exception/material-change decisions. 0.5–1 day if cleanly answered, plus 1–3 days if remediation is needed; high/variable risk. Historical July findings are not a clean current audit. |
| T04 | Exact signed candidate retains its last-known July 31 hard stop pending Apple Support. At that point Xcode could see the prepared device, but signed attempts stopped at provisioning; the replacement Development certificate had no matching private key, zero usable identities were found and certificate ownership was unresolved. The Support response, device connectivity and identities were not rechecked in September. Apple Support owns clarification; Tyler owns the next exact approval; Codex owns the approved path/build. 1–2 days after clarification/approval plus unknown wait; high risk. Preserve the certificate/CSR/Keychain/profile/signing freeze until read-only current-state reconciliation. |
| T05 | Protected/native monitoring checks partial. Protected native-setting resolution and an unsigned Release build passed through a temporary mode-0600 file that was removed with temporary artifacts. No native event was sent; the approved one-event scope remains unconsumed and paused until a valid signed/device candidate plus exact-action review. Codex owns checks; Tyler owns that review. 1–2 days after T04; high risk. No outbound Brief sends or scheduler activation. |
| T06 | Physical-device QA pending. July 31 evidence established a device connection, Developer Mode and Xcode 27 beta 4 visibility, but current connectivity was not rechecked, no verified signed candidate installed and app-level QA has not begun. Tyler owns device/session; Codex owns matrix/fixes. 2–3 days initial QA plus fixes/retest; high risk. |
| T07 | Subscription baseline/transitions pending. Tyler owns account/action approval; Codex owns validation; Apple timing is external. 1–2 days after candidate plus propagation wait; high risk. Do not repurchase. |
| T08 | YouTube channel/first real Daily Brief not started; placeholder remains intentional. Tyler owns content/access/separate approval; Codex owns integration/QA. 1–2 days after inputs plus platform wait; medium/high risk. Confirm launch scope rather than silently making it a blocker. |
| T09 | Release assets/evidence pending T03–T07 and T08 scope. Codex owns recapture/packet; Tyler owns exact upload/remote-asset approval. 1–2 days; high risk. Current listing screenshots still show `CE`. |
| T10 | Upload, tester distribution and review pending; none occurred for this candidate. Tyler owns each exact approval; Codex owns preparation; Apple is external. 0.5–1 day hands-on plus unknown processing/review; high risk. |
| T11 | October 30 target only, not release authorization. Tyler owns final go/no-go; Codex owns evidence/options. 0.25–0.5 day decision prep, external waits excluded; high risk until T03–T10 clear. |

Deferred tracks remain unchanged: provider-backed rate limiting; final auth-email delivery/volume; civic-data freshness/fallback labeling; source-grounded AI/live-provider verification; Senate vote/additional sync scope; post-launch Daily Brief email/push and authenticated publishing automation; Supreme Court sister app only after main-app TestFlight; state legislation later in the main app, tentatively early 2027; historical Round 1–3 exports remain non-distributable.

## 3) Environment And Config Changes

- Targets touched: local branch/worktree, GitHub branch and `main`, Vercel preview and existing Vercel production.
- Local preview uses `AUTH_DEMO_ENABLED=true`, `DAILY_BRIEF_LAYOUT_PREVIEW=true` and port `3024` for this session. These are process-only overrides; no environment file or protected value changed.
- The fresh worktree temporarily reuses the installed dependencies from the September 3 worktree through an ignored local `node_modules` link so the preview can run. No dependency or lockfile changed.
- No Vercel configuration, Neon, Sentry, Apple, YouTube, signing, credential, Keychain, native upload, tester distribution, migration or review changes. The only external mutation was the approved Git push and resulting Vercel web deployment.

## 4) Verification Run

- Public brand check through the installed Node 22/tsx runtime: passed; the new direct wordmark assertion passed.
- `node scripts/check-launch-copy-tone.mjs`: passed.
- `node scripts/check-testflight-mobile-ui.mjs`: passed.
- `node scripts/check-ios-native-bridge.mjs`: passed; stable native/purchase identities remain intact.
- `tsc --noEmit --pretty false --noUnusedLocals --noUnusedParameters`: passed.
- `git diff --check`: passed before the documentation closeout.
- Mobile browser QA at `http://127.0.0.1:3024/dashboard`: passed; retained logo plus visible `CAPITOLWONK`, no `CE`.
- Local HTTP rendering checks for `/dashboard`, `/sign-in`, `/onboarding`, `/map` and `/brief`: passed; each rendered the shared CapitolWonk wordmark with no stale `CE` suffix.
- GitHub CI run `34503725976`: passed; Quality checks completed with no failing job. A non-blocking GitHub warning says several `@v4` actions still target deprecated Node.js 20 and were forced onto Node.js 24.
- Vercel production deployment `3DA1NsWFjwPYpFgx1GhhkjGUYMNy`: Ready/Current from exact source `7ec68bc`; production alias is `https://project-qosv1.vercel.app/`.
- Live production browser smoke on `/dashboard`, `/sign-in`, `/onboarding`, `/map` and `/brief`: passed; CapitolWonk appears without `CE`, and the existing logo remains unchanged.

## 5) Next Task (Single Safest Step)

Continue with T03's fresh dependency security verification using the supported Node 22/pnpm 9 path. Keep it read-only: do not install, override the minimum-package-age policy or change dependencies. If the audit service remains unavailable, record the exact failure and preserve the prior risk rather than calling the audit clean. T02 is complete for new events based on the historical July Preview verification; do not repeat its probe or configuration work. Preserve the T04 Apple signing freeze while Support clarification is pending.

Start with:

```bash
git status --short --branch
git log -3 --oneline
git show d7980aa:docs/eod-handoff-2026-07-31.md | sed -n '1,220p'
rg -n 'audit|package-age|pnpm' package.json pnpm-workspace.yaml .github scripts docs/eod-handoff-2026-09-10.md
```

## 6) Resume Prompt For New Thread

> Continue CapitolWonk from `docs/eod-handoff-2026-09-10.md` and `docs/project-timeline.md`. Tyler clarified that the logo artwork stays; do not replace web/native icons. Commit `6ce9d5b` removes only the hardcoded `CE` suffix from shared wordmark cards and adds a regression guard. After Tyler's exact approval, production source `7ec68bc`, GitHub CI run `34503725976`, Vercel deployment `3DA1NsWFjwPYpFgx1GhhkjGUYMNy` and five-route live smoke all passed. T02 is complete for new events based on recovered pushed evidence: `46efc95` and July 31 handoff `d7980aa` record Tyler's approved recursive `$user.geo.**` rule, one authorized July Preview Edge event with no raw IP or displayed geography, and full temporary-probe cleanup. No September probe or protected change was made, and the live rule was not re-read because Sentry is signed out; do not repeat the probe or configuration work. The same handoff records T04's last-known July 31 Apple Support hard stop, zero usable signing identities and unresolved Development-certificate ownership. The Support response, device connectivity and identities were not rechecked in September; preserve the certificate/CSR/Keychain/profile/signing freeze until read-only current-state reconciliation and Tyler's exact-action approval. The handoff also records successful protected native-Sentry setting resolution in an unsigned Release build; no native event was sent, and the approved one-event scope remains paused until a valid signed/device candidate plus exact-action review. The two listing screenshots still show `CE` and need local recapture before reuse; remote App Store replacement is separate. The September 4–10 gap has no tracked product-work evidence, so the plan remains behind its first internal checkpoint and October 30 is low-confidence/materially at risk—not evidenced on track. Preserve September 25 readiness decision, October 1 handoff ceiling, October 2–6 owner-unavailability buffer, tentative October 7 return, October 16 candidate, October 19 approval-gated submission, October 20–29 contingency and October 30 go/no-go. Carry T03–T11 and every deferred track. Continue with T03's read-only fresh dependency audit. Do not repeat the migration or branding cleanup; do not change dependencies, bypass package-age policy, change protected config/signing/credentials, repurchase, upload/distribute, submit review or release publicly without the required explicit approval.
