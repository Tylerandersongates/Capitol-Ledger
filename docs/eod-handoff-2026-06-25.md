# Capitol Ledger EOD Handoff - June 25, 2026

Generated as the dated EOD handoff for June 25, 2026.

## Standing Rules
- Speak directly. Keep updates concise, useful, and low-fluff.
- Always include next best steps after each handoff or completed work block so work can keep moving.
- Keep the in-app browser open and visible during app testing so the user can watch progress.
- Routine fixes, commits, and pushes are pre-approved. Check with the user before major build, architecture, dependency, schema, destructive, or secret-related changes.
- A diagnostic means checking the whole app for stale code, duplicate code, unreachable code, disconnected routes/APIs, and obvious performance drag. Tighten safe issues; do not leave useless code around.
- Do not mark live app reports resolved until the issue is actually fixed and verified.
- Use narrow sandbox escalations only when needed. Do not commit secrets.

## Baseline
- Repo: `/Users/tylergates/Documents/Capitol Ledger`
- Branch: `main`
- HEAD at diagnostic start: `4e062bbf9033fc3ba502aa733ba3089c8610e2d2` (`Prepare Capitol Ledger CE TestFlight path`)
- Origin sync at diagnostic start: `0` behind / `0` ahead
- Worktree at diagnostic start: dirty with the rename-ready brand pass, App Store setup packet updates, native display-name centralization, roadmap sequencing docs, and `lib/brand.ts` untracked.
- Production target: `https://project-qosv1.vercel.app`
- Local target used during the session: `http://127.0.0.1:3023`
- Browser state: in-app browser visible on `http://127.0.0.1:3023/privacy`

## Completed Today
- Added a rename-ready public brand helper in `lib/brand.ts`, with current default `Capitol Ledger CE` and future override through `NEXT_PUBLIC_APP_NAME`.
- Moved launch-facing app/support/privacy/auth/account/reporting/email/purchase copy to the shared brand helper so the final legal name can be changed in one place.
- Updated `.env.local` public app name to `Capitol Ledger CE` so local QA matches the current legal placeholder.
- Updated the native iOS shell so `Info.plist` reads `$(APP_DISPLAY_NAME)` and the Xcode project owns the current display-name setting.
- Reworked the App Store Connect setup packet into a rename-ready template using `FINAL_APP_NAME`, `FINAL_BUNDLE_ID`, and final product-ID placeholders.
- Updated TestFlight readiness docs/checks so Apple record/product creation is explicitly held until final naming, bundle ID, and product IDs are confirmed.
- Expanded `pnpm launch-copy:check`, `pnpm testflight:check`, `pnpm ios-native:check`, and `pnpm weekly-brief:in-app-check` to match the rename-ready architecture.
- Confirmed the current visible public pages render as `Capitol Ledger CE Support` and `Capitol Ledger CE Privacy Policy` in the browser after the public env correction.
- Captured the post-TestFlight product sequence in roadmap docs: main app TestFlight first, standalone Supreme Court sister app next, state legislation later inside the main app.
- Discussed naming direction: `CivicIQ` is the stronger format between `Civic IQ` and `CivicIQ`; final legal/trademark check remains pending before applying any name change.

## Diagnostics
- Code scan: 170 app/component/lib/script source files scanned for static routes and links; 31 page routes, 34 API routes, 87 static internal hrefs, 0 missing static route targets.
- Broader inventory: 265 files under `app`, `components`, `lib`, `scripts`, `docs`, and `Capitol Ledger App`.
- Brand scan: launch-facing app code now keeps hardcoded `Capitol Ledger CE` limited to the brand/default/native placeholder paths. Remaining `Capitol Ledger` references are mostly docs, old guides, script status output, or intentional historical project naming.
- Stale/debug scan: remaining `console.log` usage is concentrated in scripts; remaining `beta` identifiers are compatibility/internal report model names; Stripe code remains for legacy/team transition paths but launch checks warn to keep Stripe disabled for App Store v1.
- Duplicate/helper scan: broad helper/class scan returned 1,795 candidate lines, mostly expected React functions, class constants, and reusable UI helpers. No safe EOD refactor was obvious without broad visual churn.
- Timer/performance scan: found bounded `setTimeout` use for UI feedback, autocomplete blur/debounce, request timeouts, and retry delays; no obvious unbounded polling loop surfaced in the scan.
- Live report triage: escalated database run passed with 36 total reports, 36 resolved, 0 active, 0 launch blockers, and 0 untriaged.
- Production auth: database schema is ready; warning remains that `AUTH_COOKIE_SECURE` is not true and should be true for deployed HTTPS production.
- Local preview runtime check: failed because the bundled runtime is Node `24.14.0` while the repo guard requires Node 20 or 22, and `node_modules` has 8 duplicate `* 2` entries. Direct `next dev` was used earlier to keep the local browser preview available.

## Verification Run
- `pnpm launch-copy:check`: passed.
- `pnpm testflight:check`: passed for local prep mode; warned that App Store env values are still needed before sandbox/TestFlight account-sync QA.
- `pnpm ios-native:check`: passed.
- `pnpm weekly-brief:in-app-check`: passed.
- `pnpm billing:check`: passed for app-only demo mode; warned that App Store env values are needed and Stripe launch config is present.
- `pnpm reports:triage`: first sandboxed run could not reach Neon; escalated run passed with 0 active reports.
- `pnpm lint`: passed with no ESLint warnings or errors.
- `pnpm exec tsc --noEmit --pretty false`: passed.
- `pnpm build`: passed, generated 63 static pages.
- `pnpm backend:check`: passed demo-safe mode with expected production-readiness warnings for final provider/env setup.
- `pnpm congress:check`: passed demo-safe mode; live request check was skipped.
- `pnpm reports:check`: passed local readiness; `REPORTS_CHECK_DATABASE=true pnpm reports:check` passed after escalation and confirmed feedback table + release-triage column.
- `pnpm auth-email:check`: passed demo-safe mode with Resend configured.
- `TESTFLIGHT_REQUIRE_READY=true pnpm testflight:check`: failed as expected on 5 Apple-side env values: `APP_STORE_BUNDLE_ID`, `APP_STORE_ACCOUNT_TOKEN_NAMESPACE`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_PRIVATE_KEY`.
- `BILLING_REQUIRE_APP_STORE=true pnpm billing:check`: failed as expected on the same 5 Apple-side values.
- `pnpm local-preview:check`: failed on Node 24 and duplicate `node_modules` copy links.

## QA
- Local compile: `pnpm exec tsc --noEmit --pretty false` passed.
- Lint: `pnpm lint` passed.
- Build: `pnpm build` passed and generated 63 static pages.
- Browser QA: earlier verified `/support` rendered `Capitol Ledger CE Support` and `/privacy` rendered `Capitol Ledger CE Privacy Policy` after updating `NEXT_PUBLIC_APP_NAME`.
- Local preview note: the direct `next dev` process logged successful `/privacy`, `/support`, and account API responses, but repeated demo-account duplicate-key fallback warnings appeared for `demo-citizen`. Those warnings did not block 200 responses.
- Known issues: strict TestFlight/App Store billing checks remain blocked until final Apple-side naming, bundle ID, product IDs, and App Store Server API credentials are created/configured. Local preview guard remains blocked until Node 20/22 and clean `node_modules` are restored.

## Current State
- The app is rename-ready but the actual final name change has not been applied yet.
- Current placeholder remains `Capitol Ledger CE`.
- The strongest working future-name candidate discussed is `CivicIQ`, pending trademark/domain/App Store checks.
- Roadmap sequence is documented: finish main-app TestFlight, then start the standalone Supreme Court sister app, then revisit state legislation as a main-app future update likely early next year.
- All local prep checks are green except the local preview runtime guard. Strict Apple readiness checks correctly fail on missing Apple-side setup.
- No secrets were added or changed.
- Worktree remains dirty with the rename-ready implementation, roadmap docs, and this refreshed EOD handoff. No commit or push was made during this EOD pass.

## Next Task (Single Safest Step)
Confirm the final legal app name decision, then update only the centralized naming points:

```bash
rg -n "NEXT_PUBLIC_APP_NAME|APP_DISPLAY_NAME|defaultPublicBrandName|FINAL_APP_NAME" .env.example .env.local lib/brand.ts ios "Capitol Ledger App"
```

After the final name is selected, update `NEXT_PUBLIC_APP_NAME`, `lib/brand.ts`, native `APP_DISPLAY_NAME`, and the App Store setup packet. Then rerun:

```bash
pnpm launch-copy:check
pnpm testflight:check
pnpm ios-native:check
pnpm lint
pnpm exec tsc --noEmit --pretty false
```

## Resume Prompt For New Thread
```text
Use this handoff as the source of truth and continue execution from "Next Task (Single Safest Step)".

Context:
- Repo: /Users/tylergates/Documents/Capitol Ledger
- Branch: main
- Current dated handoff: docs/eod-handoff-2026-06-25.md
- Current placeholder app name: Capitol Ledger CE
- Likely final name candidate: CivicIQ, not yet applied
- Roadmap: finish main-app TestFlight first; then start standalone Supreme Court sister app; state legislation stays in the main app but is deferred to a later update, likely early next year.
- Worktree is dirty with rename-ready brand centralization, App Store packet/checklist updates, native APP_DISPLAY_NAME centralization, roadmap sequencing docs, and refreshed EOD handoff.
- Local prep checks passed: launch-copy, testflight local mode, ios-native, weekly-brief in-app, billing demo mode, report triage, lint, tsc, build, backend demo-safe, congress demo-safe, reports DB check, auth-email demo-safe.
- Expected blockers: strict TestFlight/billing checks fail until Apple bundle ID/account token namespace/App Store Server API values are configured; local-preview guard fails on Node 24 and duplicate node_modules copy links.

Constraints:
- Do not repeat completed work.
- Keep TestFlight/App Store upload as the north star.
- Do not pull Supreme Court or state-legislation expansion into the current TestFlight scope.
- Confirm assumptions only if there is hidden risk.
- Start by running:
  rg -n "NEXT_PUBLIC_APP_NAME|APP_DISPLAY_NAME|defaultPublicBrandName|FINAL_APP_NAME" .env.example .env.local lib/brand.ts ios "Capitol Ledger App"
```

## Next Best Steps
1. Decide and legally clear the final app name before creating App Store Connect records or subscription products.
2. Apply the final name through the centralized brand/env/native/App Store packet points only.
3. Restore a supported local preview runtime later: Node 20/22 and clean `node_modules` without duplicate `* 2` entries.
4. Set or verify `AUTH_COOKIE_SECURE=true` for deployed HTTPS production.
5. After final Apple setup exists, rerun `TESTFLIGHT_REQUIRE_READY=true pnpm testflight:check` and `BILLING_REQUIRE_APP_STORE=true pnpm billing:check`.
