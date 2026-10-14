# CapitolWonk launch transition plan — September 25, 2026

## Accepted release dates

- **November 16, 2026 — soft launch.** A deliberately limited post-election release for wider real-world use, support observation, and issue discovery. It is not the final 120th Congress launch and does not waive TestFlight, App Review, privacy, billing, security, data-truth, device, or release gates.
- **January 3, 2027 — full launch.** The public 120th Congress cutover. The app must switch its active Congress, current-member roster, navigation defaults, freshness evidence, and launch-facing copy only after the reviewed 120th Congress data is ready and the exact release is approved.

The November release should be called **Soft launch** or **Early access**, not simply “Launch.” The January release is the full public launch.

## Why this sequence is stronger

The November 16 date is thirteen days after the November 3 federal general election, as listed by the [Federal Election Commission](https://www.fec.gov/introduction-campaign-finance/election-results-and-voting-information/). That removes election-day operational pressure while leaving enough time to absorb certified-result timing, onboarding feedback, support load, device-specific defects, and real saved-account behavior before the congressional transition.

The period between releases is a stabilization and data-transition window, not an open-ended feature sprint. New work should either fix a demonstrated wider-use issue, improve operational evidence, or prepare the 120th Congress cutover.

## Phase contract

| Window | Product state | Required focus |
| --- | --- | --- |
| Now–November 15 | Release-candidate preparation | Close current P0/P1 truth and account defects; finish signed-device, privacy, billing, security, accessibility, monitoring, App Review, and rollback evidence; rehearse the 120th Congress data transition without changing Production defaults. |
| **November 16** | **Soft launch / early access** | Release only the exact approved build and audience. Keep the UI explicit that active legislative data belongs to the 119th Congress. Establish feedback triage, incident ownership, daily health review, and a documented rollback/disable path. |
| November 17–December 13 | Stabilization | Fix reproducible issues from wider use, prioritize trust/data/auth/performance/accessibility defects, and avoid discretionary expansion. Track cohorts and regressions without inventing launch-success claims. |
| December 14–23 | 120th Congress readiness | Validate incoming member identities, districts, chambers, bill/vote resets, aliases, saved-item behavior, and empty/new-Congress states. Rehearse migration/cutover and rollback on isolated data. |
| December 24–January 2 | Cutover freeze | Admit only launch blockers. Freeze schema and dependency churn, stage the reviewed roster/configuration, complete final device/Preview/regression evidence, and prepare the exact go/no-go packet. |
| **January 3, 2027** | **Full 120th Congress launch** | Execute only separately approved production/data/release actions. Do not switch the active Congress before the constitutional noon Eastern term boundary; choose the exact operational time only after official feeds are ready. Verify current Congress labeling, roster, district/member links, caches, search, docket, alerts, saved records, and public copy before declaring the cutover complete. |

## Product and data rules for the interim

1. Never relabel 119th Congress records as 120th Congress data. Congress identity must remain visible wherever ambiguity would undermine trust.
2. Treat election winners, member terms, districts, and committee assignments as source-backed data with an explicit effective date. Do not infer a seated member from an election projection.
3. Preserve user follows and stances through stable aliases. When an old record has no valid 120th Congress equivalent, retain it as historical rather than silently remapping it.
4. New-Congress empty states are valid. Do not fill a sparse January docket, vote feed, committee view, or score with prior-Congress records unless the UI clearly labels them historical.
5. Keep all current safety boundaries: no Production deployment, schema/migration/data write, provider activation, Apple upload/distribution/submission, or public release without the exact action-time approval that applies to that step.

The [Twentieth Amendment](https://www.archives.gov/founding-docs/amendments-11-27) places the congressional term transition at noon on January 3. January 3 is therefore the correct full-launch date, but the active-Congress data flip should be scheduled after that boundary and after authoritative sources are observable—not assumed at midnight.

January 3, 2027 falls on a Sunday. Pre-stage the reversible release inputs before the freeze, assign explicit Sunday launch/rollback coverage, and hold any broad announcement until post-cutover smoke passes. If that coverage is unavailable, keep January 3 as the data/term boundary and make the public announcement on the next staffed day rather than operating an unsupported release.

## Soft-launch success criteria

The soft launch is successful when the app remains truthful and supportable under wider use—not when every feature is complete. The weekly readout should cover:

- crash-free and successful-launch behavior on the supported device/build set;
- sign-in, verification, relaunch, and account persistence failures;
- false or stale bill, vote, member, alert, and docket reports;
- support/feedback volume, severity, time to acknowledge, and time to resolve;
- page latency and failed-request rates on core mobile routes;
- save/follow/stance integrity across sessions and devices;
- release blockers for the January 3 cutover.

No single vanity metric converts the soft launch into the full launch. January 3 retains a separate go/no-go decision and exact release approval.
