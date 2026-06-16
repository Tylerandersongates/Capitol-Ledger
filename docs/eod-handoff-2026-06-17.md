# Capitol Ledger EOD Handoff - June 17, 2026

Generated at the break on June 16, 2026 for the next continuation.

## Standing Rules
- Speak directly. Keep updates concise, useful, and low-fluff.
- Always include next best steps so work can keep moving.
- Keep the in-app browser open and visible during app testing so the user can watch progress.
- Routine fixes, commits, and pushes are pre-approved. Check with the user before major build, architecture, dependency, schema, destructive, or secret-related changes.
- A diagnostic means checking the whole app for stale code, duplicate code, unreachable code, disconnected routes/APIs, and obvious performance drag. Tighten safe issues; do not leave useless code around.
- Do not mark beta feedback resolved until the issue is actually fixed and verified.
- Use narrow sandbox escalations only when needed. Do not commit secrets.

## Baseline
- Repo: `/Users/tylergates/Documents/Capitol Ledger`
- Branch: `main`
- HEAD before dependency continuation: `564c667 (HEAD -> main, origin/main) Record Node 22 runtime check results`
- Origin sync: `0 0`
- Worktree: no intentional app-code changes after Admin QA; `git status` can hang in this shell.
- Production target: `https://project-qosv1.vercel.app`
- Browser state: in-app browser open on `/team?downgradeQa=14a78f0`; Team access gate is visible after owner downgrade QA.

## Completed Today
- Added Team Admin role so an owner can delegate workspace management without giving away billing control.
- Confirmed Admins can create Analyst and Viewer invites, manage seats, and seed shared Team watchlists/alert candidates.
- Confirmed Analysts and Viewers cannot access Team management APIs.
- Confirmed Viewers are read-only for shared Team workspace seed data.
- Confirmed Admin cannot remove the owner seat.
- Confirmed removing a Viewer seat converts that account back to Free and reopens one paid seat.
- Added Admin delegation, Viewer read-only, seat removal, and owner downgrade rows to the live Round 3 Beta checklist.
- Confirmed owner downgrade lock behavior with Admin and Analyst seats present.
- Confirmed fake signed-webhook customer IDs cannot validate Stripe Billing Portal because Stripe rejects the synthetic customer ID.
- Installed official Node `v22.22.3` for Apple Silicon into ignored local tooling at `.tools/node-v22.22.3-darwin-arm64`.
- Confirmed the local preview runtime guard passes under Node `v22.22.3`.
- Added the required root package declaration to `pnpm-workspace.yaml` so pnpm 9 accepts the single-package workspace.
- Reinstalled repo-local dependencies successfully with Node `v22.22.3`, Corepack, and pnpm `9.15.9`.
- Removed the stale `node_modules.provenance-slow-20260616b` backup tree created during dependency repair.
- Verified lint, typecheck, and production build in a clean `/private/tmp` clone with the same app code and workspace config.
- Confirmed a real Stripe Checkout-created Team subscription can open Billing Portal.
- Confirmed Stripe Portal cancellation schedules end-of-period cancellation (`Cancels Jul 14`) while Stripe subscription `status` remains active.
- Fixed app billing sync so Stripe `cancel_at_period_end=true` maps to `stripe/free/canceled` and Team access checks refresh Stripe before allowing owner/member workspace access.
- Added a Stripe customer subscription lookup fallback for older records that have a `cus_` customer ID but no stored `sub_` subscription ID.

## Production QA Passed
- Fresh fake Team owner activated 4 paid seats through signed Stripe webhook.
- Owner created Admin invite.
- Admin accepted invite and received Admin management API access.
- Admin created Analyst and Viewer invites.
- Analyst and Viewer accepted correct roles.
- Analyst and Viewer received `403` from management API.
- Owner and Admin saved records appeared in shared Team workspace.
- Viewer saved records stayed out of shared Team workspace.
- Admin page showed Team admin controls and no owner billing manage link.
- Admin removed Viewer; Viewer subscription became Free/demo and `/team` returned to the access gate.
- Final Team capacity after removal: `3/4 occupied`, `1 open`.
- QA state file: `/private/tmp/capitol-ledger-team-admin-qa.json`
- Production `/beta?check=14a78f0` showed `17 flows` with Admin delegation, Viewer read-only, seat removal, and owner downgrade rows.
- Owner downgrade QA started with owner/admin/analyst active in the 4-seat workspace.
- Owner billing portal request returned `503` because the fake owner subscription used a synthetic customer ID; Stripe test mode returned `resource_missing`.
- Signed `customer.subscription.deleted` webhook was accepted for the fake owner.
- Owner subscription became `stripe/free/canceled`.
- Owner, Admin, and Analyst management APIs returned `403` after owner downgrade.
- Owner, Admin, and Analyst `/team` pages showed the access gate after owner downgrade.
- Browser console errors on locked `/team`: none.
- Real account Billing Portal opened successfully for a Checkout-created Team subscription.
- Real account Billing Portal showed `Cancels Jul 14` and `Your service will end on July 14, 2026`; production still showed active Team before the fix because the app ignored Stripe `cancel_at_period_end`.

## Diagnostic Results
- Billing readiness passed with `BILLING_REQUIRE_STRIPE=true`.
- Beta readiness passed for app files/config; database table verification was skipped locally unless `BETA_CHECK_DATABASE=true`.
- Backend readiness completed with configuration warnings only: auth email disabled, Congress API/sync dry-run, weekly brief delivery disabled, Redis/Sentry/OpenAI optional/missing.
- Auth email delivery check passed demo-safe mode; production email provider is disabled.
- Local preview runtime check failed because this shell uses Node `v24.14.0`; repo check requires Node 20 or 22 to avoid Next route-compilation hangs.
- Continuation runtime check found no `node` on PATH, no Homebrew Node 20/22, and bundled Codex Node is still `v24.14.0`.
- `pnpm lint` and full `tsc --noEmit` hung under Node 24 and were stopped.
- Under the original dependency tree, `scripts/check-local-preview-runtime.mjs` passed repo-local `node_modules`, duplicate-link, and SWC signature checks; default shell Node 24 was still the runtime blocker.
- Official Node `v22.22.3` tarball was downloaded from `nodejs.org`, SHA-256 verified, and extracted into ignored `.tools`.
- `scripts/check-local-preview-runtime.mjs` passed under `.tools/node-v22.22.3-darwin-arm64/bin/node`.
- Vendored pnpm under `.tools/pnpm-v11` reports `11.1.2`.
- Before the clean dependency reinstall, `next lint` hung silently for 60 seconds under Node 22 and was stopped.
- Before the clean dependency reinstall, direct ESLint (`node_modules/.bin/eslint app components lib scripts --ext .js,.jsx,.ts,.tsx`) also hung silently for 60 seconds and was stopped.
- Before the clean dependency reinstall, direct TypeScript started instantly for `--version` (`5.9.3`), but `tsc --noEmit --pretty false` and `tsc --noEmit --pretty false --incremental false` both hung silently and were stopped.
- `tsc --traceResolution` showed progress through `@types/node@20.19.41` and `undici-types@6.21.0`, repeatedly failing to resolve built-in module names such as `url`, `stream`, `events`, `buffer`, and `stream/web` under `moduleResolution: "bundler"` before it was stopped.
- Before the clean dependency reinstall, `prisma generate` also hung silently for 60 seconds under Node 22 and was stopped.
- pnpm `9.15.9` initially refused install because `pnpm-workspace.yaml` had no `packages` field.
- Adding `packages: ["."]` fixed pnpm 9 workspace resolution for this single-package repo.
- Clean dependency install succeeded in the real workspace with Node `v22.22.3`, Corepack, pnpm `9.15.9`, and `/private/tmp/capitol-ledger-pnpm-store`.
- `scripts/check-local-preview-runtime.mjs` now passes in the real workspace under Node `v22.22.3` after reinstall.
- `pnpm exec prisma generate` now succeeds in the real workspace under Node `v22.22.3` after allowing Prisma to refresh `~/.cache/prisma`.
- In a clean `/private/tmp/capitol-ledger-remote-check` clone with the same app code and `pnpm-workspace.yaml` fix:
  - `pnpm lint` passed with no ESLint warnings or errors.
  - `pnpm exec tsc --noEmit --pretty false` passed.
  - `pnpm run build` passed: Prisma Client generated, Next compiled, lint/type validity ran, and 56 static pages generated.
- In the real Documents workspace, `pnpm exec tsc --noEmit --pretty false` still becomes a no-output slow/stalled process and was stopped; this appears workspace/filesystem-specific because the same command passes quickly in `/private/tmp`.
- In the real Documents workspace, `pnpm lint` now exits but fails while reading dependency package configs such as `eslint-plugin-import/package.json` or `es-abstract/package.json`; plain Node can parse those same JSON files, and the same lint command passes in `/private/tmp`.
- Stripe subscription parsing now treats `cancel_at_period_end=true` as canceled for Capitol Ledger access, so Portal-canceled Team plans become Free/canceled even while Stripe reports `status=active` before period end.
- Server subscription reads now refresh Stripe-backed subscription IDs before returning account subscription state; if no `sub_` ID is stored, they fall back to the Stripe customer subscription list.
- `/team`, Team invites API, Team seats API, and member workspace access now use the synced subscription path before granting Team owner/admin/member access.
- Focused parser check passed: active Team stays `team/active/4 seats`; active Team with `cancel_at_period_end=true` becomes `free/canceled` with no Team seat count.
- Clean `/private/tmp/capitol-ledger-remote-check` verification after the cancellation fix and customer-ID fallback:
  - `pnpm lint` passed with no ESLint warnings or errors.
  - `pnpm exec tsc --noEmit --pretty false` passed.
  - `pnpm run build` passed.
- Focused code inspection found no safe app-code cleanup to apply before break.
- `TeamWorkspacePreview` is still used on `/upgrade`; not dead code.
- Locked plan preview remains active as the fallback for `PlanFeatureGate`; not stale Plan Preview dead code.
- Team database/memory split is intentional production/local fallback, not duplicate dead code.
- API references checked in QA scripts point to existing app routes.

## Known Issues
- After deploy, the real canceled Team account still needs production recheck to confirm `/team` now syncs Stripe and returns to the access gate.
- Local diagnostic/build tooling still has workspace-specific dependency/resolver drag in the Documents path; the same lint/typecheck/build commands pass quickly in `/private/tmp` with the same code and config.
- Production email delivery is disabled by current config.
- Full database beta table check was not run in this diagnostic pass.

## Next Best Steps
1. After deploy, reload the logged-in real account on `/team` and confirm Stripe pending-cancel sync returns the owner to the Team access gate.
2. Confirm Team invites and Team seats APIs return `403` for the canceled owner after sync.
3. If Admin/Analyst seats are present on a real canceled owner workspace, confirm their `/team` access also locks through the owner subscription sync.
4. Keep using Node `v22.22.3` plus Corepack/pnpm `9.15.9`; for fastest local verification, run the heavy lint/typecheck/build loop from `/private/tmp` until the Documents workspace drag is isolated.
5. Run full database beta table check with `BETA_CHECK_DATABASE=true` once the runtime/tooling path is stable enough for DB-backed diagnostics.
