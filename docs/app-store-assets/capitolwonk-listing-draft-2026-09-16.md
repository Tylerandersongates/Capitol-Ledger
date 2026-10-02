# CapitolWonk listing metadata and capture-state draft — September 16, 2026

## September 26 two-stage listing reconciliation

The [accepted transition plan](../launch-transition-plan-2026-09-25.md) now governs this draft: **November 16, 2026 is the controlled soft launch on explicitly labeled 119th Congress data**, and **January 3, 2027 is the separately approved full launch and 120th Congress cutover**. This is a source-only proposal. No App Store Connect field, screenshot, build, questionnaire answer, submission, or release was changed.

### November 16 soft-launch metadata delta

These proposed values narrow the older copy to the actual soft-launch scope. They deliberately omit alerts, scores, video, AI, subscription offers, in-app deletion, first-party privacy operations, and real-time freshness claims because those capabilities do not yet have release evidence.

| Field | Proposed soft-launch value | Evidence boundary |
| --- | --- | --- |
| App name | CapitolWonk | Retains the accepted public name. |
| Subtitle | Follow Congress with clarity | Editorial proposal; confirm the exact remote value and character limit before any edit. |
| Promotional text | Explore bills, votes, and members from the 119th Congress through public legislative records. | Names the Congress shown by the November candidate and limits the claim to public legislative records. |
| Description | CapitolWonk brings bills, votes, and members from the 119th Congress into a clear mobile view. Search available public records, open bill and member details, and follow links to the underlying sources. | Requires exact-candidate checks of search, bill/member details, links, source labels, and 119th Congress labeling. |
| Keywords | congress,bills,legislation,votes,senators,representatives,civic | Draft for remote inventory and editorial review; contains no ranking or freshness claim. |
| What's New / release notes | Early access to source-linked bills, votes, and member records from the 119th Congress. | Use only after the selected build demonstrates these paths on a signed device and the remote version/build context is known. |

“Soft launch” or “Early access” may describe the release phase where useful, but it must not imply a beta entitlement, invitation workflow, or feature that is absent from the selected build. Retain the existing support and privacy URLs only after the exact candidate verifies their public wording and the mailbox procedure.

### January 3 full-launch delta

Prepare a separate 120th Congress copy change only after the constitutional cutover boundary and the source-backed roster, district, current-Congress, saved-identity, sparse-state, migration, and rollback evidence pass. Do not relabel November screenshots or replace “119th” with “120th” in copy before those checks. Re-audit all product claims if the January candidate adds or activates alerts, scoring, video, AI, purchases, analytics, deletion, or first-party privacy operations.

### Capture wording rules

- Every November screenshot must visibly or contextually match the 119th Congress candidate and record its route, state, source SHA, dimensions, color mode, and hash in the capture manifest.
- Avoid “live,” “real time,” “today,” “current,” or equivalent freshness captions unless the selected screen exposes a verified source-sync timestamp and the candidate passes its freshness evidence.
- Keep account data, private queries, reviewer credentials, mailbox contents, and conditional purchase or privacy flows out of marketing captures.
- Use the corrected `CAPITOLWONK` wordmark without the retired `CE` suffix. Keep the historical images quarantined.

**Next T09 listing step:** inventory the exact current App Store Connect metadata read-only and compare each remote field with the November proposal above. Then bind the accepted copy and four-screen rehearsal to one pinned native/web candidate; publication and asset upload remain separate exact approvals.

The [October 2 field-by-field comparison worksheet](../app-store-connect-listing-comparison-2026-10-02.md) now provides the read-only remote inventory table, Apple field limits, exact local character/byte counts, claim-evidence gates, and `Pending re-read` stop markers. Complete its remote column after the owner blackout before proposing any listing change.

## September 18 candidate-state update

The source `93795c7` and PR #31 references in the original status below are historical. T04 now has a locally signed version 1.0 build `2` archive installed/launched on Tyler's iPhone, while later web changes through [PR #44](https://github.com/Tylerandersongates/Capitol-Ledger/pull/44) are live at Production merge `617a474`. No exact combined native/web release candidate or final screenshot set has been selected. The signed archive does not validate later web content or App Store listing copy by itself. T03 verifier processing remains off; T05–T07 device/provider/sandbox evidence and T09 privacy evidence remain open.

The four public routes below remain a **rehearsal specification**, not approved App Store assets. For the bill-detail slot, H.R. 7008 is a verified live public route, but its Overview/Details changed in PRs #39–#44 and its installed-iPhone content, layout and post-fix timing retest remain open. Do not select it as the final marketing record solely from browser checks. For member detail, Begich's `/members/B001323` election dates appeared on Tyler's phone after PR #35, but capture still needs a pinned release state, a privacy-safe image and reproducible source provenance. A neutral, stable public record may be preferable; choose the actual bill and member only during exact-candidate rehearsal.

| Slot | Current proof | Capture decision still needed |
| ---: | --- | --- |
| 1 Dashboard | Signed build `2` opens Dashboard; cold launch was reported at 3.49 seconds after PR #37. | Confirm the exact public/blank or assigned sanitized state and complete the ordered T06 phone walkthrough. |
| 2 Bill search/results | Public Bills search is the route for candidate discovery. | Verify real result provenance, no personal query/account data and exact native/web candidate state. |
| 3 Bill detail | H.R. 7008 live browser content was checked after PR #44. | Complete T06 installed-iPhone content/layout/timing retest; then choose a stable, suitable public bill. |
| 4 Member detail | Begich House election dates were reported on the phone after PR #35. | Confirm exact-candidate visual state and choose a suitable public official with corroborated fields. |

Keep the provisional copy below pending exact-candidate claim review. The [App Privacy packet](../app-privacy-release-assets-prep-2026-09-12.md) now separates completed local signing from missing privacy report, runtime/provider and questionnaire evidence. October 1 is the internal T09 handoff checkpoint; remote copy or asset changes still require a separate exact decision.

Historical September 16 status: **source-only draft for review.** No App Store Connect metadata, questionnaire, or image was changed. The checked local source was `93795c7` (the PR #31 feature commit); the handoff recorded PR #31 merged separately as `90f8b85`, which that checkout had not fetched. Neither SHA was an approved signed release candidate. The [capture manifest](capitolwonk-capture-manifest-2026-09-13.md) remains the technical and approval checklist.

## What PR #30 already settled

PR #30 corrected support copy for the dedicated privacy mailbox and revised the provisional App Privacy/four-screen capture plan. The first-party privacy queue and operator paths remain off and conditional post-launch. The old iPhone and iPad listing PNGs still show the retired `CE` suffix; the iPad image also has double chrome, a phone bezel, and gutters. Keep those files as historical evidence, not launch assets.

## Provisional listing copy

| Field | Local draft | Evidence or condition |
| --- | --- | --- |
| App name | CapitolWonk | Accepted public name; keep technical IDs unchanged. |
| Subtitle | Follow Congress with clarity | Copy proposal, not a settled product decision or remote value. |
| Promotional text | Explore bills, votes, and members through public legislative records. | Public civic surfaces exist in source; confirm exact release behavior before use. |
| Description | CapitolWonk brings U.S. bills, votes, and members into a clear mobile view. Search available public records, open bill and member details, and follow links to the underlying sources. | Deliberately excludes unverified video, alerts, purchase offers, first-party privacy processing, and immediate in-app deletion. Recheck every claim against the signed candidate. |
| Keywords | congress,bills,legislation,votes,senators,representatives,civic | Draft for editorial and App Store field review; no ranking claim. |
| Categories | Reference; News as secondary | Existing setup-packet recommendations, not confirmed remote selections. |
| Support URL | `https://www.capitolwonk.com/support` | Canonical domain from project context; verify the live response and copy again before remote publication. |
| Privacy Policy URL | `https://www.capitolwonk.com/privacy` | Verify the live response, policy, mailbox procedure, and App Privacy evidence before remote publication. |
| What's New / release notes | Pending exact build and verified changes | Do not reuse historical TestFlight or feature claims. |
| App Review notes | Pending exact signed/device, purchase, privacy, and deletion evidence | The older setup packet includes claims that are not launch-verified under the current default-off boundary. |

Privacy-rights assistance should point to `/privacy/request`, which exposes the configured dedicated mailbox. Do not put the mailbox address, a private support case, or reviewer credentials in tracked listing copy. The provisional fourteen-type App Privacy matrix is in the [release-assets packet](../app-privacy-release-assets-prep-2026-09-12.md); these copy drafts do not approve its answers.

## Four public capture states to rehearse locally

Use a signed-out public session and no assigned screenshot account for the first rehearsal. Record the exact source SHA, route, capture surface, time, visible data provenance, and a sanitized result for each slot. Select an actual public record ID only after verifying that it is live, appropriate, and reproducible on the candidate. Do not use `demo-hr-22` or another fixture ID as a listing shortcut.

| Slot | Route and state to verify | Rehearsal stop rule |
| ---: | --- | --- |
| 1 | `/dashboard`; show the actual public dashboard, including its honest empty state when live records are unavailable. | Stop if the screen depends on demo fallback, stale fixture data, private account state, or an unsupported Daily Brief player. |
| 2 | `/search?type=bills&focus=results`; show the public Bills tab with real results, or an honest unavailable/empty state. | Stop if no public record can be attributed to the current data path or a private query appears. |
| 3 | `/bills/<verified-public-bill-id>`; choose a record from the verified results and use its public Overview. | Stop if the ID is a demo fixture, the detail is missing, or a gated analysis is presented as free. |
| 4 | `/members/<verified-public-bioguide-id>`; choose a verified public member and use the Overview. | Stop if the profile is stale, personally identifying account state appears, or election-history fields lack source/runtime corroboration. |

The route templates are supported by the current source (`/bills` redirects to the Bills search tab). The exact screen content, record IDs, and final marketing captions remain unselected until local visual review. Use `CAPITOLWONK` without `CE` in every new candidate. Follow the manifest's iPhone/iPad dimensions, flattened sRGB RGB, chrome/bezel/gutter checks, per-image hashes, and separate subscription-review evidence. Do not overwrite the historical PNGs.

## Gate to final assets

Before a final capture or any App Store Connect edit, reconcile the exact release source, signed archive, native/device behavior, privacy/provider evidence, mailbox operating procedure, product configuration, and Tyler's separate approval for that exact remote action. T03 App Store server processing remains off; T04 signing/device changes were frozen at the original September 16 draft checkpoint, and the completed local T04 work is described above. This draft closes the local metadata/route-state specification gap only; it does not represent a completed screenshot set.
