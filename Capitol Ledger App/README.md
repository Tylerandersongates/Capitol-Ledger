# CapitolWonk App

Start with [project instructions](../AGENTS.md), [context](../docs/PROJECT-CONTEXT.md), [decisions](../docs/DECISIONS.md), and the concise [live handoff](../docs/HANDOFF.md). Use the latest dated EOD in `docs/` for the full standing rules and archived evidence, and the [Current Timeline and Task Ledger](../docs/project-timeline.md) for ordered carryovers, availability and schedule changes. Update both the live handoff and ledger at every EOD. Older generated backend recommendations and tester PDFs/DOCX files are historical snapshots; their branding and billing guidance may be obsolete. Do not distribute them as current launch material without review and regeneration.

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

- Current working candidate (September 11): the bundle is uncommitted and unfrozen. Its pnpm 9 lock forces Next `15.5.25` to PostCSS `8.5.25`, and production/full working-tree audits both report no known vulnerabilities; working-tree CI and the strict candidate command run both audits. Deprecated/unmaintained production transitive `jsrsasign@11.1.5`, used through Apple's official server library for X.509/OCSP, has no current advisory but requires upstream monitoring/upgrade and Tyler's explicit risk acceptance before launch. Frozen-install audits, exact-head CI/Preview/build/smoke, provider evidence, Apple/Team sandbox QA, signing, and device proof remain open. See the [September 11 dependency note](../docs/dependency-security-audit-2026-09-11.md) and [current task ledger](../docs/project-timeline.md).
- September 10 checkpoint (historical): T01–T03 are complete for their exact scopes. The existing logo remains unchanged, and the shared wordmark-card `CE` suffix removal is live from production source `7ec68bc`; CI, Vercel and production smoke passed. Dependency candidate `f4f04de` aligns Next on `15.5.25`, clears both criticals and every then-remediable high, and passes local release verification, unsigned iOS Simulator Release, [exact-head CI](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34518247389) and matching Ready Vercel Preview. Production/full audits were 0 critical, 2 high and 2 moderate, all in Next's nested `postcss@8.4.31`; Tyler explicitly accepted that exact residual for `f4f04de` only. T04 was active and blocked pending Apple Developer Support guidance. A September 10 read-only pass found zero code-signing identities, one unexpired matching Xcode-managed App Store profile, stable Xcode 26.6 selected with Xcode 27 beta unselected, and no currently available physical iPhone. Tyler approved a corrected follow-up on the existing case, and Apple acknowledged receipt; no signing or release state changed. Preserve this as time-stamped evidence, not clearance for the changed graph.
- User-set release sequence: controlled soft launch November 16, 2026; full 120th Congress launch January 3, 2027. Keep the [transition plan](../docs/launch-transition-plan-2026-09-25.md), approvals, evidence gates, stabilization window, and cutover rehearsal current at each EOD.
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
- Active next step: await Apple Developer Support's reply on the existing case. When it arrives, inspect it read-only, reconcile it against the zero-identity/matching-profile state in the [T04 signing report](../docs/apple-signing-reconciliation-2026-09-10.md), and present Tyler one exact action before changing certificate, CSR, Keychain, profile, provisioning or signing state. Do not create a duplicate case automatically. T03 is closed for [candidate `f4f04de`](../docs/dependency-security-audit-2026-09-10.md); keep its residual exception visible and re-audit a changed graph. T02 is complete for new events; no new Sentry probe or protected configuration change is authorized. No tester invitation, native upload or distribution is authorized. The two existing App Store listing screenshots still show `CE` and must be recaptured before reuse under T09; remote asset replacement remains separately gated.
