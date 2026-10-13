# CapitolWonk Corrected-Wordmark Asset Reconciliation — October 13, 2026

Status: **source-only review; no image was changed, deleted, selected for upload, or uploaded.** This checkpoint inventories repository image surfaces that could be mistaken for App Store or reviewer evidence. It applies to draft PR #59 at source anchor `b556f6c` and must be rerun against the exact November candidate.

## Release finding

The active product identity is the corrected **CapitolWonk** name. Runtime headers render that name from code, both native build configurations set the display name to `CapitolWonk`, and the active runtime logo plus native AppIcon artwork contain no embedded product-name text. The remaining stale branding is limited to historical or unreferenced image sets, but several files under `public/` are still directly addressable if their URLs are known. Keep every item in the quarantine table out of App Store listing, App Review, and launch marketing evidence.

## Active identity and asset evidence

| Surface | Source evidence | October 13 technical result | Disposition |
| --- | --- | --- | --- |
| Web wordmark | `components/brand-wordmark.tsx`, `lib/brand.ts`, and `app/layout.tsx` | The visible name is code-rendered as `CapitolWonk`; the public-brand helper also collapses the retired `CapitolWonk CE` value to the corrected name. | Current source identity. Recheck the exact candidate visually before capture. |
| Runtime logo artwork | `app/icon.png` and `public/capitol-ledger-logo.png` | Both are 1024 × 1024 PNGs with alpha and are byte-identical: SHA-256 `10c3d96c9485cb31eea446c18ea1fc7d420ce009b04e884e41bbb646d1ede712`. The image is dome-only artwork with no embedded wordmark. The legacy public filename is referenced by active screens but does not place stale text in the UI. | Acceptable runtime artwork. Do not use either file as a listing screenshot; flattening and App Store image requirements still apply to any derived candidate. |
| Native display name | `ios/CapitolLedgerNative/CapitolLedgerNative.xcodeproj/project.pbxproj` and `Info.plist` | Both build configurations set `APP_DISPLAY_NAME = "CapitolWonk"`; `Info.plist` consumes that value. | Correct in current source. Verify the exact archive later. |
| Native AppIcon set | `ios/CapitolLedgerNative/CapitolLedgerNative/Assets.xcassets/AppIcon.appiconset/Contents.json` plus 13 referenced PNGs | All 13 expected square images are present at 20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, and 1024 pixels; `sips` reports no alpha for every file. The 1024-pixel icon SHA-256 is `15452891c55c707baba1a1fbfe811cfae899f03b37bb4e4b80f8772c324e1793`. The art has no embedded product-name text. | Current source icon set. Confirm catalog validation and exact-archive identity before submission. |
| YouTube banner | `public/capitolwonk-youtube-banner.png` | 2560 × 1440 PNG with no alpha; SHA-256 `5e10650894cfa8805b062bb56960b955bb4628c04799340dd89b12dbb9ff5aa2`. It visibly uses `CAPITOLWONK` with no `CE`. No active source reference was found. | Correct brand, but outside the App Store asset set. Do not substitute it for listing or reviewer evidence. |

## Quarantine and scope boundaries

| Asset set | Finding | Required handling |
| --- | --- | --- |
| `public/mockups/landing-hero.png` | Unreferenced by active source; visibly uses the retired `CAPITOL LEDGER` name and unsupported promotional claims. | Quarantine from launch marketing, listing, and reviewer evidence. |
| `public/mockups/bill-tracking.png` | Unreferenced by active source; visibly uses the retired product name and old product claims. | Quarantine from launch marketing, listing, and reviewer evidence. |
| `public/mockups/notifications-gamification.png` | Unreferenced by active source; visibly uses the retired product name and old product claims. | Quarantine from launch marketing, listing, and reviewer evidence. |
| `public/mockups/representative-profiles.png` | Unreferenced by active source; visibly uses the retired product name and old product claims. | Quarantine from launch marketing, listing, and reviewer evidence. |
| `public/mockups/state-local-map.png` | Unreferenced by active source; visibly uses the retired product name and old product claims. | Quarantine from launch marketing, listing, and reviewer evidence. |
| `docs/beta-tester-guide/images/` | Seven JPG/PNG/SVG triplets support a dated tester guide. They are documentation evidence, not listing candidates. | Keep outside the App Store set. Rebuild only if the active tester-distribution packet is separately selected and reconciled. |
| Historical listing and review images | The existing iPhone and iPad screenshots visibly retain `CE`; the historical subscription-review image has unconditional trial copy. Exact hashes and technical defects remain recorded in the capture manifest. | Continue the existing quarantine. Do not overwrite or relabel these records as November or January candidates. |

The five `public/mockups/` files have no active source references, but files in `public/` can be reached directly when their URLs are known. This reconciliation does not authorize their deletion, renaming, replacement, publication, or use. A later cleanup change may move or remove them after owner review, with link and deployment impact checked separately.

## Candidate admission rule

Do not copy an image into the App Store or App Review candidate set unless the exact file:

1. is bound to the selected native and web source identities and the November soft-launch or January full-launch phase;
2. uses only the corrected `CAPITOLWONK` identity and contains no retired `CE` or `CAPITOL LEDGER` product name;
3. has a reproducible route, UI state, and sanitized data provenance;
4. passes the required dimensions, flattened sRGB RGB/no-alpha, visual, privacy, and secret checks;
5. contains only source-backed claims that are true for that exact candidate; and
6. has a completed capture-manifest row and separate owner review before any remote upload or replacement.

## Next T09 ledger step

Complete the authenticated, read-only App Store Connect inventory and copy the current remote App Privacy answers into the comparison worksheet without publishing them. Then pin the exact November native/web candidate and prepare a fresh four-screen capture rehearsal. This reconciliation supplies the brand and repository-asset boundary for that later work; it does not select a final asset.
