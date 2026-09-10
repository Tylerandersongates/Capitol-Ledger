# CapitolWonk App

Use the latest dated EOD handoff in `docs/` for current verification and release gates, and [Current Timeline and Task Ledger](../docs/project-timeline.md) for ordered carryovers, availability and schedule changes. Update both at every EOD. Older generated backend recommendations and tester PDFs/DOCX files are historical snapshots; their branding and billing guidance may be obsolete. Do not distribute them as current launch material without review and regeneration.

CapitolWonk is the mobile-first civic intelligence MVP we are building around a premium dark navy, gold, and glassmorphism design system.

## Current Workspace

Source app: this local workspace folder.

Clean local preview:

`http://127.0.0.1:3020`

## Preview Restart

The preview is running in production mode, so after changes:

1. Stop the Terminal preview with `Control+C`.
2. Rerun the same start command from the project folder.
3. Refresh the browser page.

## Core Direction

CapitolWonk should feel like Bloomberg Terminal meets Apple meets modern civic accountability:

- Deep navy mobile interface
- Gold and amber civic-tech highlights
- Glassmorphism cards
- Capitol-inspired circular motifs
- Premium SaaS subscription polish
- Legislative intelligence, accountability, and engagement tools

## Product Notes

- Current focus (September 10): T01 and T02 are complete. The existing logo remains unchanged, and the shared wordmark-card `CE` suffix removal is live from production source `7ec68bc`; GitHub CI, Vercel and production smoke passed. Tyler approved T03's narrow dependency remediation. The locally verified Next `15.5.25` candidate clears both criticals and every compatible transitive high; production/full audits now show 0 critical, 2 high and 2 moderate, all in Next's exact nested `postcss@8.4.31`. Frozen install, native and true-WASM builds, 38/38 application/readiness validations and optimized HTTP/image smoke pass. T03 remains open for branch CI/Vercel preview and Tyler's exact acceptance of this changed four-advisory residual or a wait for supported upstream remediation; July's exception is not silently reused. T04's last verified July 31 state remains a signing freeze pending Apple Support clarification. Preserve it until read-only reconciliation and Tyler's review of one exact next action. Carry the low-confidence October 30 forecast, October 2–6 availability buffer and all unfinished tasks through the current ledger.
- User-set launch target: October 30, 2026. Keep the ledger's backward plan, approvals and review/rework contingency current at each EOD.
- Latest verified web product release: `7ec68bc` on `main`, retaining the Capitol dome logo while removing `CE` from the shared wordmark cards. GitHub CI passed, Vercel reached Ready/Current, and production smoke passed on dashboard, sign-in, onboarding, map and Brief. Native upload remains separately gated. The remaining product notes record earlier completed work, not fresh device QA.
- The first-round beta tester guide lives in `docs/beta-tester-guide` as Markdown, PDF, editable DOCX, and annotated snapshots.
- Password reset/forgot-password has been verified working for the beta pass.
- Free, Pro Intelligence, and Civic Team now share one subscription entitlement matrix, with demo mode switchers on `/account` and `/upgrade`.
- Subscription modes now visibly affect the app: dashboard Pro policy lens, bill detail AI/source/video gates, search smart filters and export reports, alerts priority lane, and Civic Team map/workspace panel.
- The subscription walkthrough, expected plan behavior, and QA checklist live in `Subscription Demo Guide.md`.
- Gamification now has account-backed persistence through `/api/account/gamification`, with demo fallback storage and a Prisma-ready account gamification model.
- `/impact`, `/badges`, and the profile stats now share one gamification data source for civic score, streak, badges, achievements, and impact actions.
- Gamification rules now define points, streak credit, dedupe behavior, impact metric mapping, and badge thresholds for the core civic actions.
- `/alerts` now behaves like an action-first inbox with `All`, `Action Needed`, and `Unread` filters.
- Opening a notification marks it as read in demo browser storage, removes the unread dot, and removes the item from the `Unread` filter.
- `/account` now includes optional party affiliation, displayed under city/district and controlled from Account Settings.
- Save/unsave star actions on official and bill profiles now provide immediate in-UI confirmation (`Saved to your ledger` / `Removed from your ledger`) while updating saved-ledger state.
- Official profile accountability now uses a visible nonpartisan methodology: the score is a weighted source-coverage model across voting records, public engagement, sponsored bills, and ethics/compliance evidence.
- Active next step: complete branch CI/Vercel preview for [T03's remediated candidate](../docs/dependency-security-audit-2026-09-10.md), then obtain Tyler's exact decision on the remaining Next-pinned PostCSS two-high/two-moderate residual. Do not add an unsupported override, infer July's different exception applies, or claim a repository package-age policy; its historical external source/window is still unverified. T02 is complete for new events; no new Sentry probe or protected configuration change is authorized. Feedback uses Sentry/TestFlight; the old `/feedback/review` workflow is retired. No tester invitation, native upload or distribution is authorized. The two existing App Store listing screenshots still show `CE` and must be recaptured before reuse under T09; remote asset replacement remains separately gated.
