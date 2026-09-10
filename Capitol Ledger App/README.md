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

- Current focus (September 10): T01 is complete. The existing logo remains unchanged, and the shared wordmark-card `CE` suffix removal is live from production source `7ec68bc`; GitHub CI, Vercel and five-route production smoke all passed. Continue with T02's read-only Sentry geography review, then the dependency-audit, signing, device and subscription gates toward TestFlight. The September 4–10 gap put the plan behind its first checkpoint; carry the low-confidence October 30 forecast, October 2–6 availability buffer and all unfinished tasks through the current ledger.
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
- Active next step: complete T02's read-only Sentry geography review. Feedback uses Sentry/TestFlight; the old `/feedback/review` workflow is retired. No new Sentry probe, protected configuration change, tester invitation, native upload or distribution is authorized by these notes. The two existing App Store listing screenshots still show `CE` and must be recaptured before reuse under T09; remote asset replacement remains separately gated.
