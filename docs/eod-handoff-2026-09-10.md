# CapitolWonk EOD Handoff — September 10, 2026

Updated after the September 3 documentation checkpoint was restored, the September 4–10 gap was reconciled, and Tyler clarified the logo request. Read [the current timeline and task ledger](project-timeline.md) with this handoff. **The existing logo stays. The local shared wordmark now omits `CE`; the production deployment remains a separate approval gate. Launch target: October 30, 2026.**

## 1) Completed Today

- Confirmed the new worktree began clean at deployed merge `e82d7ea`; inspected commit `1f54fff` and read its complete September 3 EOD and project timeline.
- Created continuation branch `codex/logo-refresh-sept10` and safely restored the exact documentation-only checkpoint as `f37f05e`. No production code, migration or external state was changed by that cherry-pick.
- Reconciled September 4–10 honestly: repository history contains no product-work evidence for the interval. Five weekdays/seven calendar days elapsed, but availability is unknown; all unresolved T01–T11 work stayed unresolved until evidenced.
- Inspected the existing web logo and complete native iPhone/iPad icon family. A preview-only concept board was generated outside the repository before Tyler clarified the request; no artwork was replaced.
- Tyler confirmed the current logo should remain and identified the actual issue: visual wordmark cards still showed `CAPITOL WONK CE`.
- Found the cause in the shared `BrandWordmark`: `publicBrandName` already resolved to `CapitolWonk`, but the visible foil span independently hardcoded `Wonk CE`. CSS, environment configuration and icon assets were not the cause.
- Committed the narrow fix as `6ce9d5b`: the shared wordmark now renders `CapitolWonk`, and `scripts/check-public-brand.ts` directly guards against restoring the split-node `CE` suffix.
- Verified the corrected local dashboard at `http://127.0.0.1:3024/dashboard` in the mobile browser viewport. The retained logo is unchanged and the card visibly reads `CAPITOLWONK` without `CE`.
- Updated the timeline with the missed first checkpoint, revised planning ranges, owners, dependencies, evidence and risks. The plan is behind its first internal checkpoint; October 30 remains fixed but is low-confidence/materially at risk until the audit, signing, device and subscription gates are evidenced.

## 2) Current State

**Works locally:** the shared wordmark correction reaches dashboard, onboarding, sign-in, map and the desktop site header. Brand, launch-copy, TestFlight mobile-UI, native bridge, TypeScript and diff checks pass. The existing web/native logo artwork and every stable app/purchase/telemetry/storage/repository-target/internal Weekly Brief identifier are unchanged.

**Production baseline:** `e82d7ea` remains the verified live release. The live dashboard still shows `CE` because `6ce9d5b` has not been pushed, merged or deployed. No production configuration, database, Apple, YouTube, signing, distribution, upload, review or public-release action was taken. The daily-editions migration is already applied and must not be repeated.

**Schedule:** the September 4 logo checkpoint slipped, and the September 11 privacy/audit/signing exit lacks evidence. Approximately 9–17 working days remain across the narrow T01 release step and T02–T11 before unknown remediation, fixes, re-review and external waits. Retain September 25 as a readiness decision, with actual readiness more plausibly September 29–October 1 only if no new blocker appears. Preserve October 2–6 as zero owner-dependent capacity, October 7+ as tentative, October 16 as the conditional final-candidate checkpoint, October 19 as the explicitly approved submission target, October 20–29 for review/rework and October 30 for final go/no-go.

| ID | Status, owner, evidence, estimate and risk |
| --- | --- |
| T01 | Local implementation complete at `6ce9d5b`; Tyler chose to retain the logo. Codex owns release evidence; Tyler owns exact deployment/remote-asset approval. About 0.25–0.5 day remains after approval for release and production smoke. Medium risk until production matches local. The two listing screenshots still contain `CE` and must be recaptured before reuse under T09. |
| T02 | Sentry geography decision blocked. Codex: read-only review/options; Tyler: accept/remediate. Prior evidence says raw IP is protected but server-derived geography remained. 0.5–1 day plus decision wait; high/blocking risk. No new probe/config change. |
| T03 | Dependency status unverified after pnpm 9/11 service timeouts. Codex/audit service own verification; Tyler owns exception/material-change decisions. 0.5–1 day if cleanly answered, plus 1–3 days if remediation is needed; high/variable risk. Historical July findings are not a clean current audit. |
| T04 | Exact signed candidate blocked by unusable preserved Xcode session/profile. Tyler owns account access/approval; Codex owns exact path/build; Apple provisioning is external. 1–2 days after access plus unknown wait; high risk. Historical unsigned evidence is insufficient. |
| T05 | Protected/native monitoring checks partial. Codex owns checks; Tyler approves protected setup/test scope. 1–2 days after T02/T04; high risk. No outbound Brief sends or scheduler activation. |
| T06 | Physical-device QA pending. Tyler owns device/session; Codex owns matrix/fixes. 2–3 days initial QA plus fixes/retest; high risk. No exact current candidate has device evidence. |
| T07 | Subscription baseline/transitions pending. Tyler owns account/action approval; Codex owns validation; Apple timing is external. 1–2 days after candidate plus propagation wait; high risk. Do not repurchase. |
| T08 | YouTube channel/first real Daily Brief not started; placeholder remains intentional. Tyler owns content/access/separate approval; Codex owns integration/QA. 1–2 days after inputs plus platform wait; medium/high risk. Confirm launch scope rather than silently making it a blocker. |
| T09 | Release assets/evidence pending T01–T07 and T08 scope. Codex owns recapture/packet; Tyler owns exact upload/remote-asset approval. 1–2 days; high risk. Current listing screenshots still show `CE`. |
| T10 | Upload, tester distribution and review pending; none occurred for this candidate. Tyler owns each exact approval; Codex owns preparation; Apple is external. 0.5–1 day hands-on plus unknown processing/review; high risk. |
| T11 | October 30 target only, not release authorization. Tyler owns final go/no-go; Codex owns evidence/options. 0.25–0.5 day decision prep, external waits excluded; high risk until T02–T10 clear. |

Deferred tracks remain unchanged: provider-backed rate limiting; final auth-email delivery/volume; civic-data freshness/fallback labeling; source-grounded AI/live-provider verification; Senate vote/additional sync scope; post-launch Daily Brief email/push and authenticated publishing automation; Supreme Court sister app only after main-app TestFlight; state legislation later in the main app, tentatively early 2027; historical Round 1–3 exports remain non-distributable.

## 3) Environment And Config Changes

- Targets touched: local branch/worktree and local browser preview only.
- Local preview uses `AUTH_DEMO_ENABLED=true`, `DAILY_BRIEF_LAYOUT_PREVIEW=true` and port `3024` for this session. These are process-only overrides; no environment file or protected value changed.
- The fresh worktree temporarily reuses the installed dependencies from the September 3 worktree through an ignored local `node_modules` link so the preview can run. No dependency or lockfile changed.
- No Vercel, Neon, Sentry, Apple, YouTube, signing, credential, Keychain, upload, distribution, migration or review changes.

## 4) Verification Run

- Public brand check through the installed Node 22/tsx runtime: passed; the new direct wordmark assertion passed.
- `node scripts/check-launch-copy-tone.mjs`: passed.
- `node scripts/check-testflight-mobile-ui.mjs`: passed.
- `node scripts/check-ios-native-bridge.mjs`: passed; stable native/purchase identities remain intact.
- `tsc --noEmit --pretty false --noUnusedLocals --noUnusedParameters`: passed.
- `git diff --check`: passed before the documentation closeout.
- Mobile browser QA at `http://127.0.0.1:3024/dashboard`: passed; retained logo plus visible `CAPITOLWONK`, no `CE`.
- Local HTTP rendering checks for `/dashboard`, `/sign-in`, `/onboarding`, `/map` and `/brief`: passed; each rendered the shared CapitolWonk wordmark with no stale `CE` suffix.
- Production was inspected only to diagnose the discrepancy. It remains on `e82d7ea` and was not modified.

## 5) Next Task (Single Safest Step)

Tyler reviews the retained local demo window. If the exact narrow web release is approved, publish commit `6ce9d5b` plus this documentation checkpoint, then verify production dashboard and the other shared wordmark surfaces without changing artwork or protected configuration. Recapture local listing screenshots before any future reuse, but do not replace remote App Store assets without separate approval. After the T01 production checkpoint, continue with the T02 read-only Sentry geography decision.

Start with:

```bash
git status --short --branch
git log -3 --oneline
git show --stat --oneline 6ce9d5b
```

## 6) Resume Prompt For New Thread

> Continue CapitolWonk from `docs/eod-handoff-2026-09-10.md` and `docs/project-timeline.md`. Tyler clarified that the logo artwork stays; do not replace web/native icons. Commit `6ce9d5b` locally removes only the hardcoded `CE` suffix from the shared wordmark cards and adds a regression guard. Focused checks and local mobile-browser QA pass, but production remains at `e82d7ea` and still shows `CE`; no deployment is authorized unless Tyler explicitly approves that exact release. The two listing screenshots still show `CE` and need local recapture before reuse; remote App Store replacement is separate. The September 4–10 gap has no tracked product-work evidence, so the plan is behind its first internal checkpoint and October 30 is low-confidence/materially at risk—not evidenced on track. Preserve September 25 readiness decision, October 1 handoff ceiling, October 2–6 owner-unavailability buffer, tentative October 7 return, October 16 candidate, October 19 approval-gated submission, October 20–29 contingency and October 30 go/no-go. Carry T01–T11 and every deferred track. After approved T01 production smoke, continue with T02 read-only Sentry geography review. Do not repeat the migration or branding cleanup; do not run a new Sentry probe, change protected config/signing/credentials, repurchase, upload/distribute, submit review or release publicly without the required explicit approval.
