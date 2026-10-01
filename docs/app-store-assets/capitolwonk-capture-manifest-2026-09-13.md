# CapitolWonk App Store Capture Manifest — September 13, 2026

## October 1 pre-blackout asset reconciliation

This source-only checkpoint satisfies the T09 handoff needed before the October 2–5 owner blackout. No App Store Connect asset, build, questionnaire answer, provider setting, or release state changed.

The local asset inventory contains only this manifest, the listing-copy draft, and the three historical image files below. There is no November or January candidate image to review, and no file is eligible for upload. Fresh local checks on October 1 reproduced the recorded technical evidence exactly:

| Historical file | October 1 verification | Disposition |
| --- | --- | --- |
| `listing/capitolwonk-iphone-6.5-dashboard.png` | 1284 × 2778 PNG, RGB color space with alpha; SHA-256 `c5a8d918a3582162a2f06070e120df2229b52125af3ffbbdfcefcbd745b50007` | Quarantined: retired `CE` wordmark and alpha remain. |
| `listing/capitolwonk-ipad-13-dashboard.png` | 2064 × 2752 PNG, RGB color space with alpha; SHA-256 `893f9d310610a690f5d061025005891194bb655d5fa9369b0d06920c859b281f` | Quarantined: retired `CE`, phone framing/double chrome, gutters, and alpha remain. |
| `review/capitolwonk-pro-monthly-review.jpg` | 2736 × 1260 JPEG, RGB with no alpha; SHA-256 `73a06cfaa6340c42981d9c36d80b377d49441b15122ac82a5c4f560dce7b2939` | Quarantined: unconditional trial copy and no matching redacted product-configuration evidence. |

### October 2–5 safe T09 queue

- Keep the historical files unchanged and excluded from any candidate or upload set.
- Continue source-only claim, route, and manifest preparation if the November candidate changes during the blackout.
- Review any new local candidate only when its native/web identities, release phase, route/state provenance, dimensions, color mode, hash, corrected `CAPITOLWONK` wordmark, and privacy scan are recorded in a completed per-image row.
- Do not depend on Tyler for a device session, protected access, asset selection, upload, or release decision during the blackout.

The first owner-dependent asset step after recovery is to confirm the exact November native/web candidate and sanitized capture state. Then rehearse the four primary screens locally and present the completed manifest rows for review. Upload remains a later, separate exact approval.

## September 29 two-stage capture reconciliation

The [accepted transition plan](../launch-transition-plan-2026-09-25.md) supersedes the older October schedule below. This manifest now serves two separately approved release decisions: a **November 16, 2026 soft launch** on explicitly identified 119th Congress data and a **January 3, 2027 full launch and 120th Congress cutover**. No final capture, App Store Connect replacement, upload, submission, or release is approved by this reconciliation.

### November soft-launch capture contract

Use one pinned native/web candidate for all four primary listing slots. Each image must identify the actual candidate and route in its manifest row, use the corrected `CAPITOLWONK` wordmark, and present 119th Congress context wherever a viewer could otherwise mistake the record set for the incoming Congress.

| Slot | Required November state | Claim boundary |
| ---: | --- | --- |
| 1 Dashboard | Honest public/blank state or an explicitly assigned sanitized account state from the pinned candidate. | Do not use “Today,” “live,” or freshness captions unless the screen shows a verified source-sync timestamp. |
| 2 Bill search/results | Reproducible public Bills results from the 119th Congress, with the query/state recorded. | Do not include private search history, demo fallback records, or an unlabeled historical Congress. |
| 3 Bill detail | One verified public 119th Congress bill opened from the captured results. | Show only source-backed summary, sponsor, status, and action claims that pass exact-candidate QA. |
| 4 Member detail | One verified public member profile with corroborated fields and no account-specific data. | Keep scores or evidence claims out of the capture unless the selected candidate has a reviewed, reachable methodology and complete source coverage. |

For every November image, record both the native shell/build identity and the web source SHA when they differ. A current website inside an older signed shell is not one combined release identity until that pairing is selected and tested. Captions must avoid “live,” “real time,” “today,” “current,” or equivalent freshness wording unless the displayed state and candidate evidence support the claim.

### January full-launch reconciliation

Prepare a separate capture delta only after the 120th Congress cutover passes its source-backed roster, district, current-Congress, saved-identity, sparse-state, migration, regression, and rollback evidence. Recapture every screen whose Congress label, records, copy, navigation, or visible state changes. A November image may be reused only if its exact visible content remains truthful for the January candidate; never relabel a 119th Congress image as 120th Congress art or fill a sparse new-Congress state with unlabeled historical data.

### Candidate naming and review state

Add the release phase to new local candidate filenames so November and January evidence cannot be confused:

```text
listing/candidate-<source-short-sha>-nov-soft-iphone-6.5-<slot>-rgb.png
listing/candidate-<source-short-sha>-nov-soft-ipad-13-<slot>-rgb.png
listing/candidate-<source-short-sha>-jan-full-iphone-6.5-<slot>-rgb.png
listing/candidate-<source-short-sha>-jan-full-ipad-13-<slot>-rgb.png
```

Every new per-image row must include a `Release phase / Congress` value and keep `Upload approval` at **Not approved** until Tyler reviews that exact asset set and remote action.

**Next T09 asset step:** after the November candidate is pinned, rehearse these four states locally at both required dimensions, then record filenames, route/state provenance, native/web identities, color mode, byte counts, hashes, corrected-wordmark review, privacy scan, and limitations. Keep the historical assets below quarantined.

**September 18 supersession:** T04's local signed version 1.0 build `2` archive and iPhone install/launch are complete; the earlier signing/device freeze language below describes the September 13 state. The archive is local and predates later live web changes through [PR #44](https://github.com/Tylerandersongates/Capitol-Ledger/pull/44), Production merge `617a474`. The four-slot [listing draft update](capitolwonk-listing-draft-2026-09-16.md) identifies present rehearsal candidates and remaining T06 checks. Do not label build `2` plus current Production as one approved release candidate without recording both exact source states and their test evidence. The three historical assets remain quarantined. No final screenshot, subscription review image, remote replacement or upload is approved.

Historical September 13 status: **local preparation only; no replacement asset was approved, uploaded, distributed, or device-verified.** The Apple certificate/profile/Keychain/signing/device freeze was in force at that checkpoint. Use this manifest after an exact release candidate, sanitized capture state, subscription configuration, and signed/device path are approved.

The [September 16 source-only listing and route-state draft](capitolwonk-listing-draft-2026-09-16.md) specifies provisional metadata and the first honest public rehearsal. It adds no final screenshot or remote approval.

> September 15 launch-scope update: `main` at PR #29 merge `f959bff` was the planning baseline then. The September 16 draft above is the newer source-only planning record. The dedicated privacy mailbox is the launch intake channel, and database-backed privacy operation is conditional post-launch. Start with a four-screen local rehearsal—dashboard, bill search/results, bill detail, and member detail—using honest blank/public or explicitly assigned sanitized state. Do not include account-specific alerts, a Daily Brief player, upgrade claims, or a privacy database-queue claim until each exact launch state is evidenced. This does not authorize final capture or upload.

## Existing assets — quarantine from final reuse

| File | Technical record | Reason it is stale |
| --- | --- | --- |
| `listing/capitolwonk-iphone-6.5-dashboard.png` | 1284 × 2778, RGBA, SHA-256 `c5a8d918a3582162a2f06070e120df2229b52125af3ffbbdfcefcbd745b50007` | Visibly contains retired `CE` branding. |
| `listing/capitolwonk-ipad-13-dashboard.png` | 2064 × 2752, RGBA, SHA-256 `893f9d310610a690f5d061025005891194bb655d5fa9369b0d06920c859b281f` | Contains retired `CE`, phone bezel/notch treatment, double status chrome, and black gutters. |
| `review/capitolwonk-pro-monthly-review.jpg` | 2736 × 1260, RGB, SHA-256 `73a06cfaa6340c42981d9c36d80b377d49441b15122ac82a5c4f560dce7b2939` | Makes unconditional trial claims and is not redacted product-configuration evidence. |

Preserve these historical files. Do not delete, overwrite, upload, or present them as the final CapitolWonk set.

## Source and state record required for every new image

| Field | Required value |
| --- | --- |
| Exact source SHA | Eventual separately approved release SHA; `f959bff` was the September 13 planning baseline only |
| Production/base SHA | PR #29 merge `f959bff` was the September 13 baseline; confirm the then-current production SHA again before final capture |
| Branch verification | PR #29 passed all three checks before merge. Every later capture branch must pass its own exact-head CI and matching Preview before any image is treated as current. |
| Build/archive identity | Exact build/archive reference; omit protected identifiers from tracked evidence |
| Capture surface | Simulator, physical device, or local browser; never imply physical-device proof when unavailable |
| Route and UI state | Exact route plus a short reproducible state description |
| Account/fixture provenance | Assigned sanitized screenshot account or honest blank/public state |
| Data classification | No customer data, secret, token, private Apple correspondence, provider value, or personal identifier |
| Product configuration | Offer, price/currency/territory, renewal terms, and status matched to separately captured redacted configuration evidence |
| Dimensions / mode | Exact pixel dimensions; flattened sRGB RGB with no alpha unless a separate review approves otherwise |
| Brand review | `CAPITOLWONK` only; no `CE` or stale Capitol Ledger product name |
| Visual QA | No faux/double chrome, phone bezel in iPad art, notch duplication, black gutters, clipping, or illegible text |
| Integrity | Filename, byte count, SHA-256, capture time, operator, and reviewer |

## Planned listing set

Prepare the smallest truthful narrative first; add a surface only when its exact launch behavior is ready.

Recommended local rehearsal order: slots 1–4 only. This order exercises the public product story without requiring a signed purchase state, account-specific fixture, live video, or deferred privacy database operation.

| Slot | Route/state | iPhone 6.5-inch | iPad 13-inch | Current readiness |
| ---: | --- | --- | --- | --- |
| 1 | Dashboard — honest blank/public or assigned sanitized populated state | 1284 × 2778 | 2064 × 2752 | Rehearse locally; final capture blocked on exact candidate/state |
| 2 | Bill search/results — public state | 1284 × 2778 | 2064 × 2752 | Rehearse locally; final capture blocked on exact candidate |
| 3 | Bill detail — public state | 1284 × 2778 | 2064 × 2752 | Rehearse locally; final capture blocked on exact candidate |
| 4 | Member detail/accountability — public state | 1284 × 2778 | 2064 × 2752 | Rehearse locally; final capture blocked on exact candidate |
| 5 | Alerts/saved activity | 1284 × 2778 | 2064 × 2752 | Deferred; requires sanitized assigned account state |
| 6 | Daily Brief | 1284 × 2778 | 2064 × 2752 | Deferred pending launch-scope decision; no player may be implied while absent |
| 7 | Upgrade/subscription | 1284 × 2778 | 2064 × 2752 | Deferred pending final product/offer configuration and signed sandbox evidence |

The listing narrative does not require all seven slots. Remove any slot whose state cannot be reproduced honestly without demo fallback data.

## Separate subscription-review evidence

Do not reuse a marketing listing image as subscription-review proof. Prepare three separate artifacts:

1. a sanitized in-app upgrade screen whose offer language is conditional and matches the actual subscription configuration;
2. a redacted App Store Connect product-configuration capture showing offer eligibility, renewal price, currency/territory, and status; and
3. a manifest row tying the UI image and redacted configuration to the same product/candidate review.

Do not claim a seven-day trial until eligibility and configuration are evidenced for the exact review state.

## Candidate filename convention

Use a non-final local suffix until approval:

```text
listing/candidate-<source-short-sha>-<nov-soft|jan-full>-iphone-6.5-<slot>-rgb.png
listing/candidate-<source-short-sha>-<nov-soft|jan-full>-ipad-13-<slot>-rgb.png
review/candidate-<source-short-sha>-<nov-soft|jan-full>-subscription-review-rgb.jpg
review/candidate-<source-short-sha>-<nov-soft|jan-full>-product-config-redacted.png
```

Never overwrite the historical files. “Candidate” means local review only, not App Store approval or device verification.

## Per-image review row

| Field | Value |
| --- | --- |
| Filename |  |
| Release phase / Congress |  |
| Slot / route / state |  |
| Source SHA / build |  |
| Surface / OS / viewport |  |
| Sanitized state owner |  |
| Dimensions / color profile / mode |  |
| Byte count / SHA-256 |  |
| Brand text scan |  |
| Privacy/secret scan |  |
| Offer/config match |  |
| Visual QA result |  |
| Limitations |  |
| Operator / reviewer / UTC time |  |
| Upload approval | **Not approved** |

## Stop conditions

Stop local recapture and preserve the draft if:

- the source SHA or capture state is not reproducible;
- a customer, tester, maintainer, or private provider record appears;
- `CE`, double status chrome, a phone bezel/notch on iPad, black gutters, alpha, clipping, or stale trial copy remains;
- an offer differs from redacted product configuration;
- the image requires signing/device behavior that is still frozen;
- privacy/provider runtime evidence changes the public story; or
- anyone asks to upload or replace a remote asset without a separate exact approval.

## Approval boundary and next action

Local route/state planning and draft image generation from sanitized non-device state may proceed only when it does not claim device proof. Final source-bound capture, signed-device representation, App Store Connect replacement, subscription-review upload, build upload, distribution, submission, and release are separate approvals.

Next safest asset action: select an honest blank/public dashboard narrative and a sanitized screenshot-account specification locally. Do not recapture the final set until the exact candidate, product copy, and Apple-supported signed/device path are reconciled.
