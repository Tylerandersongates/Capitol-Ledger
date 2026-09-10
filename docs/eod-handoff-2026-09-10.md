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
- Updated the timeline with the missed first checkpoint, revised planning ranges, owners, dependencies, evidence and risks. The plan is behind its first internal checkpoint; October 30 remains fixed but is low-confidence/materially at risk until the audit, signing, device and subscription gates are evidenced.

## 2) Current State

**Works locally:** the shared wordmark correction reaches dashboard, onboarding, sign-in, map and the desktop site header. Brand, launch-copy, TestFlight mobile-UI, native bridge, TypeScript and diff checks pass. The existing web/native logo artwork and every stable app/purchase/telemetry/storage/repository-target/internal Weekly Brief identifier are unchanged.

**Production baseline:** `7ec68bc` is the verified live release on `main`; CI and the Ready/Current Vercel deployment passed, and five-route live smoke confirmed the CE-free shared wordmark. No production configuration, database, Apple, YouTube, signing, distribution, native upload or review action was taken. The daily-editions migration is already applied and must not be repeated.

**Schedule:** T01 completed on September 10, but the September 4 checkpoint still slipped and the September 11 privacy/audit/signing exit lacks evidence. Approximately 9–17 working days remain across T02–T11 before unknown remediation, fixes, re-review and external waits. Retain September 25 as a readiness decision, with actual readiness more plausibly September 29–October 1 only if no new blocker appears. Preserve October 2–6 as zero owner-dependent capacity, October 7+ as tentative, October 16 as the conditional final-candidate checkpoint, October 19 as the explicitly approved submission target, October 20–29 for review/rework and October 30 for final go/no-go.

| ID | Status, owner, evidence, estimate and risk |
| --- | --- |
| T01 | Completed and deployed September 10. Tyler retained the logo; `6ce9d5b` implemented the wordmark fix, and production source `7ec68bc`, CI, Vercel and live smoke pass. No T01 hands-on effort remains; current web-card risk is low/closed. The two listing screenshots still contain `CE` and must be recaptured before reuse under T09. |
| T02 | Sentry geography decision blocked. Codex: read-only review/options; Tyler: accept/remediate. Prior evidence says raw IP is protected but server-derived geography remained. 0.5–1 day plus decision wait; high/blocking risk. No new probe/config change. |
| T03 | Dependency status unverified after pnpm 9/11 service timeouts. Codex/audit service own verification; Tyler owns exception/material-change decisions. 0.5–1 day if cleanly answered, plus 1–3 days if remediation is needed; high/variable risk. Historical July findings are not a clean current audit. |
| T04 | Exact signed candidate blocked by unusable preserved Xcode session/profile. Tyler owns account access/approval; Codex owns exact path/build; Apple provisioning is external. 1–2 days after access plus unknown wait; high risk. Historical unsigned evidence is insufficient. |
| T05 | Protected/native monitoring checks partial. Codex owns checks; Tyler approves protected setup/test scope. 1–2 days after T02/T04; high risk. No outbound Brief sends or scheduler activation. |
| T06 | Physical-device QA pending. Tyler owns device/session; Codex owns matrix/fixes. 2–3 days initial QA plus fixes/retest; high risk. No exact current candidate has device evidence. |
| T07 | Subscription baseline/transitions pending. Tyler owns account/action approval; Codex owns validation; Apple timing is external. 1–2 days after candidate plus propagation wait; high risk. Do not repurchase. |
| T08 | YouTube channel/first real Daily Brief not started; placeholder remains intentional. Tyler owns content/access/separate approval; Codex owns integration/QA. 1–2 days after inputs plus platform wait; medium/high risk. Confirm launch scope rather than silently making it a blocker. |
| T09 | Release assets/evidence pending T02–T07 and T08 scope. Codex owns recapture/packet; Tyler owns exact upload/remote-asset approval. 1–2 days; high risk. Current listing screenshots still show `CE`. |
| T10 | Upload, tester distribution and review pending; none occurred for this candidate. Tyler owns each exact approval; Codex owns preparation; Apple is external. 0.5–1 day hands-on plus unknown processing/review; high risk. |
| T11 | October 30 target only, not release authorization. Tyler owns final go/no-go; Codex owns evidence/options. 0.25–0.5 day decision prep, external waits excluded; high risk until T02–T10 clear. |

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

Continue with the T02 read-only Sentry server-derived geography review. Present the remaining exposure and decision options without running a new probe or changing protected configuration. Recapture the local listing screenshots before any future reuse under T09, but do not replace remote App Store assets without separate approval.

Start with:

```bash
git status --short --branch
git log -3 --oneline
sed -n '1,220p' docs/eod-handoff-2026-07-29.md
rg -n 'geo|ip_address|sendDefaultPii|beforeSend' sentry.* app components lib ios scripts docs/eod-handoff-2026-07-29.md
```

## 6) Resume Prompt For New Thread

> Continue CapitolWonk from `docs/eod-handoff-2026-09-10.md` and `docs/project-timeline.md`. Tyler clarified that the logo artwork stays; do not replace web/native icons. Commit `6ce9d5b` removes only the hardcoded `CE` suffix from shared wordmark cards and adds a regression guard. After Tyler's exact approval, production source `7ec68bc`, GitHub CI run `34503725976`, Vercel deployment `3DA1NsWFjwPYpFgx1GhhkjGUYMNy` and five-route live smoke all passed. The two listing screenshots still show `CE` and need local recapture before reuse; remote App Store replacement is separate. The September 4–10 gap has no tracked product-work evidence, so the plan remains behind its first internal checkpoint and October 30 is low-confidence/materially at risk—not evidenced on track. Preserve September 25 readiness decision, October 1 handoff ceiling, October 2–6 owner-unavailability buffer, tentative October 7 return, October 16 candidate, October 19 approval-gated submission, October 20–29 contingency and October 30 go/no-go. Carry T02–T11 and every deferred track. Continue with T02's read-only Sentry geography review. Do not repeat the migration or branding cleanup; do not run a new Sentry probe, change protected config/signing/credentials, repurchase, upload/distribute, submit review or release publicly without the required explicit approval.
