# Round 2 Beta Readiness Checklist

Status: internal planning list. Do not add this checklist to the app until Round 1 feedback is closed or clearly triaged.

Last updated: June 11, 2026.

## Goal

Use Round 2 to widen testing only after CapitolWonk CE is stable enough that new testers can focus on product value, clarity, and missing features instead of basic setup or broken flows.

## Round 1 Wrap Gate

- Every Round 1 feedback report is labeled as resolved, known issue, duplicate, later, beta acceptable, or launch blocker.
- No active launch blockers remain open.
- No high-severity report is left untriaged.
- Feedback review has a current snapshot before inviting more testers.
- The Round 1 tester list and invite notes are preserved outside the app.

## Local Reliability Gate

- Clean dependency install is reproducible from the project directory.
- `node scripts/check-local-preview-runtime.mjs` passes.
- `node_modules` is repo-local and does not contain duplicate `* 2` package copies.
- Next native SWC check passes without falling back to a hanging route compile.
- Local preview starts on `127.0.0.1:3023`.
- Local `/beta` loads in the in-app browser.

## Code Quality Gate

- TypeScript passes with `tsc --noEmit`.
- Lint passes with `next lint`.
- `git diff --check` passes for the current change set.
- No environment secrets are committed.
- `origin/main` matches the latest intended work before a new tester invite.

## Account And Auth Gate

- New account creation works on the live demo.
- Live new-account QA uses a test inbox that can receive verification links.
- Returning Round 1 tester sign-in works on the live demo without creating a new account or repeating verification.
- Sign-out works and does not leave a confusing account state behind.
- Signing back in restores account-backed profile, affiliation if set, interests, district, alerts, saved items, and gamification state where supported, including days logged in.
- Forgot-password/password reset remains available for the beta pass.
- Reviewer-only access to `/feedback/review` is still protected.

## Setup And Personalization Gate

- District setup saves correctly.
- Policy interests save correctly.
- Search setup chips reflect the same interests and district state shown in account/setup.
- Dashboard personalization uses the current account or browser profile state.
- State-specific tester presets still cover California, Massachusetts, New York, and Texas.

## Feedback And Triage Gate

- `/feedback` submits a new report successfully.
- `/feedback/review` shows new reports for reviewer accounts.
- Reviewers can update status and launch decision.
- Blockers, untriaged reports, beta acceptable items, later items, duplicates, and resolved items are easy to identify.
- CSV export or copy summary works before each fix pass.

## Core Flow Smoke Gate

- `/beta` loads and reflects the current testing round.
- `/dashboard` loads and shows personalized civic summary cards.
- `/search` supports bills, officials, and votes.
- Bill detail pages load with summary, sources, stance controls, and accountability context.
- Member detail pages load with official information and contact/action context.
- `/alerts` loads and read/unread behavior is understandable.
- `/settings`, `/account`, `/profile`, `/upgrade`, `/team`, `/badges`, `/impact`, `/letters`, and `/petitions` do not dead-end.

## Round 2 Invite Benchmarks

- 0 launch blockers.
- 0 untriaged high-severity reports.
- At least one successful live smoke pass after the latest push.
- At least one clean local preview pass after the dependency repair.
- At least 3 to 5 Round 1 tester sessions or reports reviewed, unless feedback volume stays low and internal QA replaces the missing coverage.
- Clear tester ask for Round 2: value, clarity, trust, missing data, and account persistence.

## Commands Before Round 2 Invite

```bash
node scripts/check-local-preview-runtime.mjs
env PATH=/Users/tylergates/Library/pnpm/bin:/usr/bin:/bin:/usr/sbin:/sbin node_modules/.bin/tsc --noEmit
env PATH=/Users/tylergates/Library/pnpm/bin:/usr/bin:/bin:/usr/sbin:/sbin node_modules/.bin/next lint
git diff --check
node .tools/pnpm.cjs run beta:triage
```

## Suggested Next Improvements Before Round 2

- Add a reviewer-facing "new since last review" indicator in `/feedback/review`.
- Add a small internal QA pass for setup sync across account, search, dashboard, and profile.
- Use `Returning User QA Script.md` for create account, sign out, sign back in, and persistence checks.
- Keep the current Round 1 `/beta` tester experience unchanged until Round 1 is closed.
