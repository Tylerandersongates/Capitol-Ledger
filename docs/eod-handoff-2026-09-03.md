# CapitolWonk EOD Handoff — September 3, 2026

## 1) Completed Today

- Removed the retired public-name suffix from app branding, metadata, feedback/error copy, native Debug/Release display names, environment examples, active setup documents, check output, and guide source/generators.
- Centralized remaining feedback/error branding and normalized legacy public-name overrides in `lib/brand.ts`. No protected environment values were edited.
- Corrected the outdated rename plan: this is display-only; preserve existing app, purchase, telemetry, and storage identities. App Store copy now distinguishes free video from personalized Pro coverage.
- Added `brand:check` and wired it into CI. CI also checks unused locals/parameters.
- Removed three unused imports (dashboard, Brief generation, Congress sync). Overlapped independent subscription resolution and the single GDELT request; retained error fallbacks and rate-limit protections. No latency improvement was benchmarked.
- Preserved the earlier Daily Brief work and its uncommitted migration. No files, accounts, purchases, or historical records were deleted.

## 2) Current State

**Works locally:** free Daily Brief/video placeholder, purchase expansion underneath, sample Pro layout and compact recommendation disclosures, shared CapitolWonk branding, and anonymous paid-API rejection. The Sites maintenance workflow preserved the existing visual design and local-only preview.

**Baseline:** detached HEAD at `d094c15`, matching remote HEAD on this check. Worktree is intentionally dirty with both prior Daily Brief work and this cleanup. No commit, push, merge, or deployment was made. Existing main CI and Vercel commit status are successful; those statuses cover the deployed baseline, not these uncommitted changes.

**Partial / blocked:**

- No YouTube channel or real episode configured; the first-video placeholder is intentional.
- The earlier daily-editions database migration is present but **not applied**. No outbound delivery/scheduler was activated.
- Production-auth schema and outbound Brief checks cannot pass without local database/task configuration. Local billing, feedback, email, backend, Congress, and TestFlight checks warn about absent protected settings; preparation-mode passes are not release approval.
- Dependency audit timed out twice (60s and 45s); current vulnerability status is unverified. Previously recorded dependency risks must not be treated as resolved.
- July 29 release gates remain open unless independently verified: Sentry-derived geography/privacy decision, signed-candidate/native monitoring delivery, physical-device QA, and subscription transitions. No signing or credential repair, restore, repurchase, archive, or upload was attempted.

**Intentional naming exceptions:** stable bundle/SKU/product/account-token values, telemetry tags, repository/native target names, environment prefixes, and internal Weekly Brief compatibility names remain unchanged. Dated EODs and old binary PDF/DOCX exports retain historical content, including retired branding. Earlier tester sources and the backend PDF builder are clearly labeled as historical; do not distribute old exports as current guidance. The current logo was inspected and has no lettering to remove.

## 3) Environment And Config Changes

- Target touched: **local workspace and local preview only**.
- `.env.example` display examples updated: `NEXT_PUBLIC_APP_NAME`, `AUTH_EMAIL_FROM`, `WEEKLY_BRIEF_FROM`.
- Local preview retains `AUTH_DEMO_ENABLED` and `DAILY_BRIEF_LAYOUT_PREVIEW`; `DATABASE_URL` is absent. Preview mode remains blocked when database/Vercel configuration is present.
- Build used a disposable local-only `DATABASE_URL` placeholder for schema validation/generation; no live database was used and no migration was performed. `SENTRY_AUTH_TOKEN` was disabled for the build, so no source-map upload.
- Reused the existing Node 22.22.3 runtime from the original checkout. The first available Node 24 runtime failed the preview guard; the supported runtime subsequently passed.
- No dependency/lockfile, Apple signing, App Store records, deployment secrets, macOS security, or Keychain changes. Hash comparisons verified the native project is unchanged except display names, billing implementation unchanged, and lockfile unchanged.

## 4) Verification Run

All project checks below ran via the Node 22 executable; TypeScript fixture scripts used `--import tsx`. External/mutating QA commands, seeds, syncs, migrations, and strict protected-environment probes were not run.

- **43 checks passed; 2 configuration checks blocked.** See the command inventory below.
- `node_modules/typescript/bin/tsc --noEmit --pretty false --noUnusedLocals --noUnusedParameters`: passed after removing the three unused imports.
- `node_modules/next/dist/bin/next lint`: passed; existing Next lint-command deprecation notice remains.
- `node_modules/prisma/build/index.js validate` and `generate`: passed.
- `node_modules/next/dist/bin/next build`: passed. Existing webpack large-cache-string warnings remain; no build errors.
- `--import tsx scripts/check-ai-bill-analysis-live.ts --dry-run`: passed for three demo bill source packets; no live OpenAI verification.
- `plutil -lint` on the native project: passed; Info.plist still uses the display-name build setting.
- `git diff --check`: passed. Historical EOD files unchanged.
- Whole-app static scan: 237 JS/TS source files, 65 page/API routes; no unresolved code imports, orphan candidates, exact duplicate source files, or unmatched literal internal links. The CSS import was separately confirmed present. This does not prove every dynamic link/branch is reachable.
- Performance review: existing database parallelism, member/bill request batching, optional-read timeouts, GDELT caching/timeout, and single-request rate-limit protection retained.
- Local HTTP smoke: 19 endpoints checked; no 5xx. Brief, sample Pro, privacy, support, sign-in, upgrade, dashboard, search, map, alerts, settings, feedback, demo bill, auth-session and search API responded 200. Account redirected 307; private profile/Brief APIs returned 401; GET on POST-only Team seats returned 405. No retired public name in those response bodies.
- Visible browser QA: free and sample Pro layouts show CapitolWonk; transcript and recommendation disclosures expand correctly. No real video, purchase, authenticated database flow, or TestFlight device playback was tested.
- Production read-only smoke: Brief returned 307 and privacy returned 200. Production does not yet include the local free-video/rename changes.
- Read-only GitHub CI and Vercel commit-status checks: successful for current remote HEAD.
- Cached pnpm 9.15.9 `audit --json`: timed out twice; no dependency changes or clean-security claim.

<details>
<summary>Project check command inventory</summary>

| Script (invoked with Node; TS via --import tsx) | Result |
| --- | --- |
| `scripts/check-production-auth.mjs` | Blocked: missing local configuration |
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

Resolve the outstanding Sentry geography/privacy decision through read-only review before preparing a signed TestFlight candidate. Keep the July 29 release gates intact; do not change protected settings, run new probes, apply the pending migration, or upload without approval. The dependency audit also needs a successful rerun before calling the candidate fully checked.

Start with:

```bash
git status --short
git log -1 --oneline
'/Users/tylergates/Documents/Capitol Ledger/.tools/node-v22.22.3-darwin-arm64/bin/node' --version
'/Users/tylergates/Documents/Capitol Ledger/.tools/node-v22.22.3-darwin-arm64/bin/node' --import tsx scripts/check-public-brand.ts
```

The local production-mode preview is running on port 3023 in retained session `54596`; use the existing browser tab. Regular view: `http://127.0.0.1:3023/brief`; sample-only Pro: `http://127.0.0.1:3023/brief?preview=pro`.

## 6) Resume Prompt For New Thread

> Read docs/eod-handoff-2026-09-03.md and the July 29 handoff. Continue from the single safest next task without repeating completed branding work. Public name is CapitolWonk; stable internal app, purchase, telemetry, storage, and Weekly Brief identifiers must not change. The detached worktree contains uncommitted Daily Brief/video/Pro-layout work, an unapplied daily-editions migration, and the completed display-name cleanup. Preserve all of it. Local build/lint/strict unused-code checks and 43 project checks passed on Node 22.22.3; two database/task configuration checks are blocked and dependency audit timed out. Existing remote CI/Vercel status is green, but local changes are not deployed. Keep the demo visible. Do not touch credentials, signing, protected configuration, billing identities, database migrations, distribution, or Apple records without approval; no repurchase. Resolve the outstanding Sentry privacy decision read-only before a signed TestFlight candidate.
