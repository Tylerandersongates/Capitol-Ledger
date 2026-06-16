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
- HEAD: `14a78f0 (HEAD -> main, origin/main) Update Round 3 beta Team checklist`
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

## Diagnostic Results
- Billing readiness passed with `BILLING_REQUIRE_STRIPE=true`.
- Beta readiness passed for app files/config; database table verification was skipped locally unless `BETA_CHECK_DATABASE=true`.
- Backend readiness completed with configuration warnings only: auth email disabled, Congress API/sync dry-run, weekly brief delivery disabled, Redis/Sentry/OpenAI optional/missing.
- Auth email delivery check passed demo-safe mode; production email provider is disabled.
- Local preview runtime check failed because this shell uses Node `v24.14.0`; repo check requires Node 20 or 22 to avoid Next route-compilation hangs.
- Continuation runtime check found no `node` on PATH, no Homebrew Node 20/22, and bundled Codex Node is still `v24.14.0`.
- `pnpm lint` and full `tsc --noEmit` hung under Node 24 and were stopped.
- `scripts/check-local-preview-runtime.mjs` passed repo-local `node_modules`, duplicate-link, and SWC signature checks; Node 24 remains the one blocking issue.
- Focused code inspection found no safe app-code cleanup to apply before break.
- `TeamWorkspacePreview` is still used on `/upgrade`; not dead code.
- Locked plan preview remains active as the fallback for `PlanFeatureGate`; not stale Plan Preview dead code.
- Team database/memory split is intentional production/local fallback, not duplicate dead code.
- API references checked in QA scripts point to existing app routes.

## Known Issues
- Stripe Billing Portal still needs real Stripe Checkout-created customer/subscription QA; the fake signed-webhook customer cannot exercise portal sessions.
- Local diagnostic/build tooling is unreliable until the shell uses Node 20 or 22.
- Production email delivery is disabled by current config.
- Full database beta table check was not run in this diagnostic pass.

## Next Best Steps
1. Fix local runtime to Node 20 or 22, then rerun `pnpm lint`, `pnpm exec tsc --noEmit --pretty false`, and `pnpm run build`.
2. Create or use a real Stripe test-mode Checkout-created Team subscription, then request Billing Portal and test downgrade/cancel from that real Stripe customer.
3. Confirm Stripe downgrade/cancel webhooks from the real customer also lock owner, Admin, and Analyst workspace access.
4. Run full database beta table check with `BETA_CHECK_DATABASE=true` once the runtime is fixed.
5. Keep the signed-webhook fake owner downgraded as evidence of the lock path unless a fresh Team QA workspace is needed.
