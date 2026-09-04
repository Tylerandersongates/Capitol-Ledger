# CapitolWonk — Current Timeline and Task Ledger

Last reconciled: September 3, 2026, end of day. Update this file at every EOD together with the dated handoff. This is the current planning source; the older phase detail in `Capitol Ledger App/Next Steps.md` is reference/history, not a fresh remaining-work estimate.

## Schedule baseline and capacity

- **Completed milestone — September 3:** CapitolWonk display-name cleanup and free Daily Brief/Pro layout are live on Vercel at release commit `e82d7ea`; the daily-editions migration is applied. CI and production smoke passed. Logo artwork was not changed.
- **Next session — September 4:** start with the CapitolWonk logo refresh (T01), then reconcile remaining estimates and the TestFlight critical path. The current mark still needs a user-approved design direction.
- **Launch target — October 30, 2026:** explicitly set by Tyler at September 3 closeout. Work backward from this date; do not silently move it. A forecast change must be surfaced with the blocker, impact and recovery options. This target does not authorize an upload, review submission, distribution or public release.
- **September 4–30:** working window for the remaining gate-driven TestFlight preparation below. Prioritize user-dependent decisions and device work while Tyler is available.
- **October 1:** planning checkpoint for a stable build, current evidence, unresolved issues and the next safe action before the availability buffer. Avoid scheduling a new release/tester expansion that depends on Tyler's immediate follow-up during the buffer unless a separate coverage plan is approved.
- **October 2–6:** reserve a conservative five-calendar-day owner-unavailability buffer based on the stated four-to-five-day absence. Do not schedule required approvals, live device sessions, uploads or review submissions in this window. Confirm whether working days were intended when re-estimating; do not assume an earlier return.
- **October 7 or later:** tentative planning restart, subject to Tyler confirming availability. Extend the buffer if needed; this is not a recovery deadline.
- **Schedule assessment at baseline:** October 30 target established; intermediate targets below are provisional until remaining effort and external blockers are assessed on September 4. Privacy, signing, device/subscription evidence and a fresh audit remain unresolved. Do not claim ahead/on-track merely because the web release shipped; record a supported forecast after that assessment.

### Backward plan to October 30

These intermediate dates are proposed internal checkpoints, not claims of completion or automatic approvals. Apple processing/review timing is external and not guaranteed.

| Working target | Milestone / exit evidence | Dependency and contingency |
| --- | --- | --- |
| September 4 | Logo direction/replacement checkpoint; reconcile remaining effort and forecast. | T01; Tyler approves artwork direction. Carry any unfinished asset/device checks explicitly. |
| September 11 | Privacy decision, fresh audit result or clearly escalated exception, and authorized signing path understood. | T02–T04; surface unresolved blockers immediately with impact on the October 30 target. |
| September 18 | Exact signed candidate and initial protected-service, device and subscription QA evidence. | T04–T07; re-estimate promptly if access/provisioning or QA fails. |
| September 25 | TestFlight-ready evidence packet and exact upload/distribution decision; begin testing when separately approved and processed. | T09–T10; no silent assumption that Apple processing or external beta review completes on this date. |
| October 1 | Stable beta/checkpoint, current issue list and availability handoff complete. | Protect follow-up coverage; no owner-dependent launch during the buffer. |
| October 2–6 | Protected owner-unavailability buffer. | No required approvals or device sessions. Extend if needed and show the forecast impact. |
| October 7–16 | Resume when confirmed available; finish tester fixes/regression, logo/screenshots, final release metadata and video readiness/scope. October 16 release-candidate checkpoint. | T06–T09; real playback still requires a real upload. Confirm whether the first video is included in launch scope if not yet ready. |
| October 19 | Working target to submit the exact release candidate for App Review after all gates and Tyler's explicit approval. | T10; earlier submission can be proposed if genuinely ready. This is not a promise of Apple approval timing. |
| October 20–29 | Review/rework and release-readiness contingency. | Resolve review feedback, retest fixes, verify support and launch coverage; preserve this buffer rather than filling it with new features. |
| **October 30** | **User-set launch target and final go/no-go.** | T11; requires Apple approval where applicable, passing release evidence and explicit release authorization. If a gate is not satisfied, present the impact/options rather than releasing unready. |

Earlier phase estimates were 2–4 days for civic-data expansion, 3–7 for external services and 2–5 for packaging after prerequisites. They describe July scope and include work since completed; do not add them together as time remaining. Re-estimate only unfinished work after the logo review and privacy/signing dependencies are understood. Apple processing/review and provider wait time are separate from hands-on effort.

## Ordered carry-forward tasks

| ID | Task / current status | Next checkpoint and dependency |
| --- | --- | --- |
| T01 | **FIRST September 4: refresh the CapitolWonk logo. Pending; current artwork unchanged.** | Inspect the web logo and native icon family; agree on the direction with Tyler before replacing artwork. Apply approved assets consistently to web/header, favicon/touch icons where used, native app icons and current screenshot/social-source materials. Check small-size readability and iPhone/iPad presentation. Keep stable app/purchase identifiers unchanged; remote store/channel edits remain separately approved. |
| T02 | Sentry server-derived geography decision — blocking native/external readiness. | Read-only review, then present the remaining exposure and options. No new probe or broader privacy setting change without explicit approval. Prior raw-IP protection and accepted generated-only Edge stack limitation remain recorded in the July 29 EOD. |
| T03 | Fresh dependency security verification — blocked by audit service timeouts. | Retry supported Node 22/pnpm 9 audit and eligible frozen install without bypassing package-age policy. July's accepted three-high/one-moderate upstream residual is historical, not a current clean audit. Re-run relevant build/regression gates after any approved change. |
| T04 | Exact signed native candidate — blocked on the previously unusable Xcode session/profile. | Reconfirm current branch/commit and unused build number; old unsigned July evidence does not validate September logo/native changes. Present the exact account/signing action and obtain fresh approval before repair or changes. Preserve Keychain/security safeguards. |
| T05 | Protected service and native monitoring verification — partial. | Verify intended-environment auth/email, App Store server behavior and strict readiness without exposing values; presence alone is not end-to-end proof. Verify native Sentry on the exact candidate only with approved setup/test scope. No outbound Brief sends or scheduler activation. |
| T06 | Physical-device QA and targeted polish — pending. | After the candidate is available, test sign-in/relaunch/persistence, dashboard, Daily Brief free/Pro layouts, compact recommendations, new logo, officials/bills/votes, alerts, feedback, privacy/support and account deletion. Revisit video size/layout on device; desktop approval is not device approval. |
| T07 | Subscription baseline and transition matrix — pending. | Establish existing entitlement without repurchase. Verify approved Pro→Free, Team→Pro and Team→Free transitions, restore/manage/relaunch and duplicate-entitlement behavior in the intended environment. Confirm remaining subscription-level/review metadata work before changing Apple records. |
| T08 | YouTube channel and first real Daily Brief — not started; intentional placeholder live. | Plan CapitolWonk channel branding/access with Tyler, then separately approved setup/upload. Add real channel/video, transcript and sources; verify embedding/captions and actual HTTPS/iPhone playback. Keep video free. Recheck current YouTube eligibility rules at setup; no monetization or view-count promise. Daily updates currently require content edits and normal releases, not automatic synchronization. |
| T09 | Release assets and exact upload decision — pending T01–T07 and applicable video scope. | Refresh current screenshots, privacy/review copy, release notes and sanitized tester guide against actual enabled services. Present exact commit/build, CI, deployment, audit, signed archive, device/subscription/monitoring evidence and remaining risks. Obtain approval immediately before that exact upload. A first video is not silently made a new hard blocker; confirm scope if still unavailable. |
| T10 | Tester distribution and review — separate approval gates. | Confirm processed build, audience, metadata, support and feedback coverage. No invitations/public link/distribution without exact-scope approval; Tyler must be present and explicitly approve the particular Beta App Review or App Review submission. Schedule around the availability buffer. |
| T11 | **October 30 launch target — planned, not yet authorized for release.** | Track against the backward plan. Before the exact release, confirm Apple approval where applicable, correct build/metadata, final regression, unresolved-risk decisions and support/monitoring coverage; obtain explicit release authorization. Escalate forecast risk early instead of moving the date or bypassing gates. |

## Carried scope decisions and deferred work

- Main CapitolWonk TestFlight path stays first. Do not reopen completed web/branding text work or repeat the applied daily-editions migration.
- Retain unresolved v1 scope/readiness decisions from the older roadmap: provider-backed rate limiting, final auth-email delivery/volume, civic-data freshness/fallback labeling, source-grounded AI/live-provider verification where needed, Senate vote coverage and any additional data-sync scope. Reconcile each as done with evidence, required before release, accepted risk or explicitly deferred; do not silently drop them or rerun broad writes.
- Daily Brief email/push delivery and any authenticated publishing editor/feed automation remain post-launch candidates. Push-notification v1 scope is unconfirmed; no new provider/scheduler/sends activated.
- Standalone Supreme Court sister-app planning starts **after the main app reaches TestFlight**. State legislation remains a later update inside the main app, tentatively early 2027; this is a planning direction, not a committed release date.
- Historical Round 1–3 tester exports remain non-distributable. Regenerate approved current materials only after the new branding and actual release scope are settled.

## Required EOD maintenance

1. Reconcile every task with evidence: completed, in progress, blocked (with owner/decision), pending or explicitly deferred. Carry all unfinished IDs into the next handoff; never erase a blocker because a session ended.
2. Record actual completion dates and links/commit evidence. Separate implemented, deployed, device-verified and externally approved states.
3. Update remaining hands-on effort, external wait time, next checkpoint/working target and confidence when evidence supports an estimate. Preserve the previous estimate and explain date changes; do not silently reset the baseline.
4. Report ahead/on track/behind only against an established baseline. If ahead, pull forward the next already-scoped, dependency-ready task and preserve recovery/QA contingency; do not expand scope or bypass approvals to consume the time gained.
5. Recalculate around October 2–6 and any updated availability. Move owner-dependent gates outside the buffer and explain any effect on forecast dates; do not automatically treat five calendar days as five working days.
6. Keep this ledger, the latest dated EOD, `Current Status.md` and `Next Steps.md` aligned. Every EOD must identify tomorrow's first task, all carryovers, schedule changes and the single safest next action. Keep the user-set October 30 launch target visible, compare the forecast with it, and show remaining review/availability contingency. Any proposed target change requires Tyler's decision.

## Change log

- **September 3, initial closeout:** web milestone completed; logo refresh added as first September 4 task. Consolidated prior TestFlight/service/subscription and post-launch tasks without declaring outstanding checks complete. Added October 2–6 availability contingency. No fixed launch baseline was initially found in prior documents.
- **September 3, user clarification:** Tyler set **October 30, 2026** as the launch date. Replaced the undated baseline with that target, added T11 and proposed intermediate checkpoints backward from launch, retaining the October 2–6 buffer and October 20–29 review/rework contingency. Remaining-effort re-estimation is still due September 4; schedule performance is not yet rated ahead/on-track.
