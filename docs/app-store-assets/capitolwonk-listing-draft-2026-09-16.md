# CapitolWonk listing metadata and capture-state draft — September 16, 2026

Status: **source-only draft for review.** No App Store Connect metadata, questionnaire, or image has been changed. The checked local source is `93795c7` (the PR #31 feature commit); the handoff records PR #31 merged separately as `90f8b85`, which this checkout has not fetched. Neither SHA is an approved signed release candidate. The [capture manifest](capitolwonk-capture-manifest-2026-09-13.md) remains the technical and approval checklist.

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

Before a final capture or any App Store Connect edit, reconcile the exact release source, signed archive, native/device behavior, privacy/provider evidence, mailbox operating procedure, product configuration, and Tyler's separate approval for that exact remote action. T03 App Store server processing and T04 signing/device changes remain frozen. This draft closes the local metadata/route-state specification gap only; it does not represent a completed screenshot set.
