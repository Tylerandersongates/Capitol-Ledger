# CapitolWonk App Store Capture Manifest — September 13, 2026

Status: **local preparation only; no replacement asset is approved, uploaded, distributed, or device-verified.** The Apple certificate/profile/Keychain/signing/device freeze remains in force. Use this manifest after an exact release candidate, sanitized capture state, subscription configuration, and signed/device path are approved.

> September 15 launch-scope update: `main` at PR #29 merge `f959bff` is the current planning baseline. The dedicated privacy mailbox is the launch intake channel, and database-backed privacy operation is conditional post-launch. Start with a four-screen local rehearsal—dashboard, bill search/results, bill detail, and member detail—using honest blank/public or explicitly assigned sanitized state. Do not include account-specific alerts, a Daily Brief player, upgrade claims, or a privacy database-queue claim until each exact launch state is evidenced. This does not authorize final capture or upload.

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
| Exact source SHA | Eventual separately approved release SHA; `f959bff` is the current planning baseline only |
| Production/base SHA | PR #29 merge `f959bff`; confirm the then-current production SHA again before final capture |
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
listing/candidate-<source-short-sha>-iphone-6.5-<slot>-rgb.png
listing/candidate-<source-short-sha>-ipad-13-<slot>-rgb.png
review/candidate-<source-short-sha>-subscription-review-rgb.jpg
review/candidate-<source-short-sha>-product-config-redacted.png
```

Never overwrite the historical files. “Candidate” means local review only, not App Store approval or device verification.

## Per-image review row

| Field | Value |
| --- | --- |
| Filename |  |
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
