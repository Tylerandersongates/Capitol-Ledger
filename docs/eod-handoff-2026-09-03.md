# CapitolWonk EOD Handoff — September 3, 2026

Updated at end-of-day closeout, after the approved production release and Tyler's launch-date clarification. This supersedes this document's earlier local-only snapshot. Read the [current timeline and task ledger](project-timeline.md) with this handoff; the July 29 safety/approval rules remain in force. **First task for September 4: refresh the CapitolWonk logo. Launch target: October 30, 2026.**

## 1) Completed Today

- Removed the retired public-name suffix from app branding, metadata, feedback/error copy, native Debug/Release display names, environment examples, active setup documents, check output, and guide source/generators.
- Centralized remaining feedback/error branding and normalized legacy public-name overrides in `lib/brand.ts`. No protected environment values were edited.
- Corrected the outdated rename plan: this is display-only; preserve existing app, purchase, telemetry, and storage identities. App Store copy now distinguishes free video from personalized Pro coverage.
- Added `brand:check` and wired it into CI. CI also checks unused locals/parameters.
- Removed three unused imports (dashboard, Brief generation, Congress sync). Overlapped independent subscription resolution and the single GDELT request; retained error fallbacks and rate-limit protections. No latency improvement was benchmarked.
- Preserved and released the earlier Daily Brief work. No accounts, purchases, or historical records were deleted.
- After explicit approval, applied the only pending migration, `20260903120000_weekly_brief_daily_editions`, to production and verified its completed record, columns and indexes. Public catalog counts were unchanged: 564 total member records (including historical records), 17,941 bills and 1,515 votes.
- Committed the product release as `ae717c0`, merged [PR #7](https://github.com/Tylerandersongates/Capitol-Ledger/pull/7) at `e82d7ea`, and verified successful main CI plus Ready/Current Vercel production deployment. The free Daily Brief and CapitolWonk name are live.
- Added the logo refresh as tomorrow's first task. **No logo artwork was changed today.** The user's request supersedes the earlier decision to leave the existing mark alone.
- Consolidated unfinished tasks and phase sequencing into `docs/project-timeline.md`; added the October 2–6 owner-availability contingency and mandatory EOD schedule reconciliation, including evidence-based gains when ahead. Updated the reusable handoff prompt/template and organizer status pointers.
- Recorded Tyler's confirmed October 30, 2026 launch target and proposed intermediate checkpoints working backward from it, including an October 19 App Review submission target and October 20–29 review/rework contingency. These planning dates do not authorize external actions or guarantee Apple timing.

## 2) Current State

**Works in production:** free Daily Brief/video placeholder, purchase expansion underneath, shared CapitolWonk display-name branding and anonymous private-API rejection. Transcript/source disclosure was verified in the live browser. Personalized written coverage remains server-gated. The sample Pro layout and compact recommendation disclosures were verified locally; sample preview is disabled in production. No new authenticated Pro/device test was performed.

**Release baseline:** this workspace is `/Users/tylergates/.codex/worktrees/195d/Capitol Ledger`, branch `codex/daily-brief-capitolwonk-release`, synchronized to the production merge `e82d7ea` before these documentation-only closeout edits. Original checkout and its local `main` were not altered. The product release is deployed; closing documentation is a separate local update and does not require another production deployment. Recheck exact branch/HEAD and working-tree status at resume.

**Release evidence:** [main CI passed](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/33831064135), [Vercel production Ready/Current](https://vercel.com/capitolwonkce/project-qosv1/Ycs2TArP2tt6XdcVH4KscX3hHRJp), [post-release PR record](https://github.com/Tylerandersongates/Capitol-Ledger/pull/7#issuecomment-5535001128), [live Daily Brief](https://project-qosv1.vercel.app/brief). The ignored local detailed release record is `artifacts/release-2026-09-03.md`; this tracked EOD carries the essential evidence so continuation does not depend on ignored artifacts.

**Partial / blocked:**

- No YouTube channel or real episode configured; the first-video placeholder is intentional.
- Logo refresh is pending as task T01; inspect and agree the design direction before replacing assets. Web/native icon consistency and current screenshot/social source updates belong to that task; Apple account and remote metadata changes remain separately gated.
- Daily-editions migration is **applied and verified**. No outbound delivery/scheduler was activated; do not repeat the migration or confuse schema readiness with delivery activation.
- Production-auth account-schema check passed against the intended database during release. The earlier local configuration-only checks were blocked; local billing, feedback, email, backend, Congress and TestFlight settings warnings remain historical diagnostic limits, not evidence of missing remote values. Preparation-mode passes are not release approval or end-to-end authenticated/native QA.
- Dependency audit repeatedly timed out, including the pnpm 9 attempt and read-only pnpm 11 fallback during release; current vulnerability status is unverified. Previously recorded/accepted dependency risks must not be treated as resolved.
- July 29 release gates remain open unless independently verified: Sentry-derived geography/privacy decision, signed-candidate/native monitoring delivery, physical-device QA, and subscription transitions. No signing or credential repair, restore, repurchase, archive, or upload was attempted.

**Intentional naming exceptions:** stable bundle/SKU/product/account-token values, telemetry tags, repository/native target names, environment prefixes and internal Weekly Brief compatibility names remain unchanged. Earlier dated EODs and old binary PDF/DOCX exports retain historical content, including retired branding. Earlier tester sources and the backend PDF builder are clearly labeled as historical; do not distribute old exports as current guidance. Although the existing mark has no lettering to remove, the user now wants the logo changed; do not mark visual branding complete until T01 is approved and verified.

**Timeline and carryovers:** all unfinished items T01–T11, unresolved v1 scope decisions and deferred tracks are in [the ledger](project-timeline.md). **Tyler set October 30, 2026 as the launch target.** Logo first September 4; then privacy decision, fresh audit, signing, protected/native checks, physical-device and subscription QA, channel/first video, release assets/upload decision, separate distribution/review approvals and final launch go/no-go. Working checkpoints: September 11 unblock decisions, September 18 candidate/initial QA, September 25 TestFlight-ready decision, October 1 stable handoff, October 16 final-candidate checkpoint, October 19 App Review submission target, October 20–29 review/rework contingency, October 30 launch. Intermediate dates are provisional, gate-dependent and not Apple timing promises. Reserve October 2–6 as a conservative five-calendar-day availability buffer; October 7 is only a tentative return subject to confirmation. Re-estimate unfinished work September 4 rather than restarting July phase estimates; no ahead/on-track claim until supported. Update every EOD for actual progress, forecast gains/slippage and contingency; present risks to the launch target promptly and do not move it without Tyler's decision. Main app TestFlight precedes the Supreme Court sister app; state legislation remains a later main-app update, tentatively early 2027.

## 3) Environment And Config Changes

- Targets touched during the day: **local workspace/preview, GitHub release, existing Vercel production and existing Neon production database**, following explicit web-release/migration approval. Closing handoff/timeline changes are documentation only; no new deployment or database operation is needed for them.
- `.env.example` display examples updated: `NEXT_PUBLIC_APP_NAME`, `AUTH_EMAIL_FROM`, `WEEKLY_BRIEF_FROM`.
- Local preview retains `AUTH_DEMO_ENABLED` and `DAILY_BRIEF_LAYOUT_PREVIEW`; `DATABASE_URL` is absent. Preview mode remains blocked when database/Vercel configuration is present.
- The initial local build used a disposable `DATABASE_URL` placeholder for schema validation/generation and disabled `SENTRY_AUTH_TOKEN`; that local build did not upload source maps. The later approved release used the existing production database securely for migration preflight/deploy/postflight; no protected value was printed, copied into this workspace or committed.
- Reused the existing Node 22.22.3 runtime from the original checkout. The first available Node 24 runtime failed the preview guard; the supported runtime subsequently passed.
- No dependency/lockfile, Apple signing, App Store records, deployment secrets, macOS security, or Keychain changes. Hash comparisons verified the native project is unchanged except display names, billing implementation unchanged, and lockfile unchanged.
- Existing Vercel CLI authentication was expired; normal refresh/login did not complete. Publishing used the existing GitHub integration and signed-in Vercel browser. No manual credential/Keychain changes were made. No Apple/TestFlight build was uploaded.

## 4) Verification Run

The initial whole-app diagnostic checks below ran via Node 22; TypeScript fixture scripts used `--import tsx`. At that diagnostic stage no external/mutating QA, seed, sync, migration or protected-environment probe was run. The later explicitly approved production migration and release checks are separately listed below; no new broad diagnostic was rerun for this documentation-only closeout.

- **43 checks passed; 2 configuration checks blocked.** See the command inventory below.
- `node_modules/typescript/bin/tsc --noEmit --pretty false --noUnusedLocals --noUnusedParameters`: passed after removing the three unused imports.
- `node_modules/next/dist/bin/next lint`: passed; existing Next lint-command deprecation notice remains.
- `node_modules/prisma/build/index.js validate` and `generate`: passed.
- `node_modules/next/dist/bin/next build`: passed. Existing webpack large-cache-string warnings remain; no build errors.
- `--import tsx scripts/check-ai-bill-analysis-live.ts --dry-run`: passed for three demo bill source packets; no live OpenAI verification.
- `plutil -lint` on the native project: passed; Info.plist still uses the display-name build setting.
- `git diff --check`: passed for the release. Earlier dated EOD files remain unchanged; this current September 3 handoff is updated for the final closeout.
- Whole-app static scan: 237 JS/TS source files, 65 page/API routes; no unresolved code imports, orphan candidates, exact duplicate source files, or unmatched literal internal links. The CSS import was separately confirmed present. This does not prove every dynamic link/branch is reachable.
- Performance review: existing database parallelism, member/bill request batching, optional-read timeouts, GDELT caching/timeout, and single-request rate-limit protection retained.
- Local HTTP smoke: 19 endpoints checked; no 5xx. Brief, sample Pro, privacy, support, sign-in, upgrade, dashboard, search, map, alerts, settings, feedback, demo bill, auth-session and search API responded 200. Account redirected 307; private profile/Brief APIs returned 401; GET on POST-only Team seats returned 405. No retired public name in those response bodies.
- Visible browser QA: free and sample Pro layouts show CapitolWonk; transcript and recommendation disclosures expand correctly. No real video, purchase, authenticated database flow, or TestFlight device playback was tested.
- Before release, production Brief returned 307 and privacy returned 200. **After release**, `/brief` and `/brief?preview=pro` return 200 with CapitolWonk branding, public video placeholder, Pro expansion and no sample content/streamed error. `/privacy`, `/support` and `/sign-in` return 200; anonymous `/api/account/weekly-brief` and `/api/account/profile` return 401 as expected.
- Release and merge CI: frozen install, supported runtime, strict TypeScript, brand consistency, lint, feedback readiness and optimized build passed. Vercel production reports Ready/Current for exact merge `e82d7ea`.
- `prisma migrate deploy`: passed after preflight verified only the approved migration was pending and prior active migration checksums matched. Completed migration record/schema/index postflight passed; no public catalog count changes.
- `scripts/check-production-auth.mjs`: production account-schema check passed during release. No new live account, authenticated personalized-edition flow, purchase or native-device test was performed.
- Cached pnpm 9.15.9 audit plus a read-only pnpm 11 fallback: service timeout; no dependency changes or clean-security claim. This remains a carry-forward check.
- Documentation closeout: `git diff --check`, public-brand guard, Markdown local-link validation, required EOD sections and carry-forward task-ID checks passed. Changes are documentation only; no new app build, deployment, migration or native test was run for closeout.

<details>
<summary>Project check command inventory</summary>

| Script (invoked with Node; TS via --import tsx) | Result |
| --- | --- |
| `scripts/check-production-auth.mjs` | Initially blocked locally; production account-schema check later passed during approved release |
| `scripts/check-auth-email-delivery.mjs` | Pass; 5 config warnings |
| `scripts/check-weekly-brief-delivery.mjs` | Blocked: missing local configuration |
| `scripts/check-weekly-brief-in-app.mjs` | Pass |
| `scripts/check-daily-brief-video.ts` | Pass |
| `scripts/check-weekly-brief-editorial-fixtures.ts` | Pass |
| `scripts/check-weekly-brief-daily-editions.ts` | Pass |
| `scripts/check-billing-readiness.mjs` | Pass; 7 config warnings |
| `scripts/check-billing-transition-fixtures.mjs` | Pass |
| `scripts/check-ios-native-bridge.mjs` | Pass |
| `scripts/check-testflight-mobile-ui.mjs` | Pass |
| `scripts/check-launch-copy-tone.mjs` | Pass |
| `scripts/check-public-brand.ts` | Pass |
| `scripts/check-testflight-readiness.mjs` | Pass; 5 config warnings |
| `scripts/check-account-deletion-readiness.mjs` | Pass |
| `scripts/check-policy-edge-routes.mjs` | Pass |
| `scripts/check-policy-edge-feed.mjs` | Pass |
| `scripts/check-live-docket-route.mjs` | Pass |
| `scripts/check-search-filter-collapse.mjs` | Pass |
| `scripts/check-search-results-scroll.mjs` | Pass |
| `scripts/check-search-saved-official-state.mjs` | Pass |
| `scripts/check-bill-law-status.mjs` | Pass |
| `scripts/check-bill-action-log.mjs` | Pass |
| `scripts/check-bill-details-summary.mjs` | Pass |
| `scripts/check-member-service-history.mjs` | Pass |
| `scripts/check-member-vote-records.mjs` | Pass |
| `scripts/check-member-roles.mjs` | Pass |
| `scripts/check-member-profile-actions.mjs` | Pass |
| `scripts/check-member-issue-topics.mjs` | Pass |
| `scripts/check-member-accountability-score.ts` | Pass |
| `scripts/check-bill-timeline.mjs` | Pass |
| `scripts/check-bill-vote-history.mjs` | Pass |
| `scripts/check-vote-positions-scroll.mjs` | Pass |
| `scripts/check-gamification-streak.mjs` | Pass |
| `scripts/check-election-participation-copy.mjs` | Pass |
| `scripts/check-backend-readiness.mjs` | Pass; 17 config warnings |
| `scripts/check-ai-policy-lens-fixtures.ts` | Pass |
| `scripts/check-video-links.mjs` | Pass |
| `scripts/check-youtube-bill-statements.mjs` | Pass |
| `scripts/check-feedback-readiness.mjs` | Pass; 6 config warnings |
| `scripts/check-local-preview-runtime.mjs` | Pass |
| `scripts/check-congress-readiness.mjs` | Pass; 5 config warnings |
| `scripts/check-congress-member-roster.ts` | Pass |
| `scripts/check-congress-bill-catalog.ts` | Pass |
| `scripts/check-congress-vote-catalog.ts` | Pass |

</details>

## 5) Next Task (Single Safest Step)

**September 4 first task: review and refresh the CapitolWonk logo (T01).** Inspect the existing web asset and native icon family, present/agree the replacement direction with Tyler, then implement the approved assets and verify consistency and small-size/device presentation. The user asked to queue it for tomorrow, not change artwork during this closeout. Do not modify stable app, purchase or telemetry identities. Remote Apple/channel metadata, signing and uploads retain their approval gates.

Read `docs/project-timeline.md` before starting so T02–T11, the October 30 launch target and October 2–6 availability buffer carry over. After the logo checkpoint, update remaining effort and the backward-plan forecast using actual progress; pull forward scoped work if ahead while retaining review/QA contingency. Continue to the outstanding read-only Sentry geography/privacy decision. Keep the July 29 gates intact: no new probe, protected setting change, signing repair, repurchase, upload or review submission without the required approval. The daily-editions migration is already applied.

Start with:

```bash
git status --short
git log -1 --oneline
sed -n '1,220p' docs/project-timeline.md
rg -n 'capitol-ledger-logo|AppIcon' app components public scripts ios --glob '!*.pbxproj'
'/Users/tylergates/Documents/Capitol Ledger/.tools/node-v22.22.3-darwin-arm64/bin/node' --version
'/Users/tylergates/Documents/Capitol Ledger/.tools/node-v22.22.3-darwin-arm64/bin/node' --import tsx scripts/check-public-brand.ts
```

The local production-mode preview was left running on port 3023 in retained session `54596`; recheck after a restart. Regular view: `http://127.0.0.1:3023/brief`; sample-only Pro: `http://127.0.0.1:3023/brief?preview=pro`. The live app remains open in the browser (the user's latest visible route is `/dashboard`); do not close useful tabs just to end the day.

## 6) Resume Prompt For New Thread

> In `/Users/tylergates/.codex/worktrees/195d/Capitol Ledger`, read `docs/eod-handoff-2026-09-03.md`, `docs/project-timeline.md` and the July 29 safety/approval rules completely. FIRST TASK for September 4: inspect the existing CapitolWonk logo and native app icons, agree the new direction with Tyler, then implement and verify the approved artwork. Artwork was not changed at closeout. LAUNCH TARGET: October 30, 2026, explicitly set by Tyler; do not silently move it or treat it as release authorization. Use the ledger's backward plan, provisionally targeting TestFlight readiness September 25, final candidate October 16 and App Review submission October 19, with October 20–29 review/rework contingency. Reserve October 2–6 for owner unavailability; resume October 7 or later only after confirmation. Do not repeat the completed display-name cleanup or applied daily-editions migration: the web release is live at `e82d7ea`, PR #7, with passing CI and production smoke. Confirm the actual worktree/branch/HEAD before editing; closing docs are separate from deployed code. Preserve stable app/purchase/telemetry/storage/Weekly Brief identities. Carry ALL unfinished T01–T11 tasks and deferred roadmap tracks forward; update the ledger/EOD with actual completions, remaining effort, forecast changes and evidence-based ahead/on-track/behind status. Re-estimate September 4 and pull forward only scoped, dependency-ready work when ahead, retaining contingency. After the logo checkpoint, continue read-only Sentry geography/privacy review and remaining audit/signing/device/subscription gates. The fresh dependency audit is unavailable, not clean. No real video is configured and no TestFlight upload has occurred. Keep useful browser tabs visible. No new privacy probes, protected configuration/signing/credential changes, repurchase, upload, distribution, Apple review or public release without the required explicit approval.
