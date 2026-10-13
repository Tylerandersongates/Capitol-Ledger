# CapitolWonk App Review Information Worksheet — October 12, 2026

Status: **source-only assembly worksheet for the November 16 controlled soft launch.** This file does not select a build, create a reviewer account, expose credentials, update App Store Connect, add an item for review, submit, distribute, or release. Reconcile it again for the January 3 full-launch cutover.

Apple treats App Review information as required version metadata and requires reviewer contact details plus a decision about whether testing needs a demo account. Notes and review attachments are optional. See Apple's [App Store review details](https://developer.apple.com/documentation/appstoreconnectapi/app-store-review-details) and [submission overview](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/overview-of-submitting-for-review/).

Repository planning anchor: `main` at `7ca64a1e95bbcdcb645166746f39d3be268fff12`. This source anchor is not the November release candidate and does not represent signed-device or purchase proof.

## Protected values boundary

Do not place any reviewer name, phone number, email address, demo-account username, password, Apple identifier, transaction identifier, private support reference, or attachment containing protected values in Git, a pull request, a screenshot manifest, or chat. Enter those values only in the protected App Store Connect fields after the exact candidate and submission are approved.

This tracked worksheet records only whether each protected field is ready and who must supply it.

## Required remote-field readiness

| App Review field | Tracked readiness | Evidence or owner action still required |
| --- | --- | --- |
| Contact first and last name | Pending protected entry | Tyler selects the submission contact at action time; keep the value out of this file. |
| Contact phone number | Pending protected entry | Tyler verifies a monitored number in App Store Connect; do not store it here. |
| Contact email address | Pending protected entry | Tyler verifies a monitored review-contact address in App Store Connect; do not substitute the public privacy mailbox without an explicit decision. |
| Sign-in required / demo account decision | Pending exact-candidate decision | Public browsing covers the core four-screen story. Decide whether review of account, purchase, restore, or gated behavior requires a sanitized reviewer account. |
| Demo account name and password | Not created or recorded here | If required, create a dedicated sanitized account through the approved operational path and enter credentials directly in App Store Connect. Never commit or paste them into tracked evidence. |
| Review notes | Draft below; blocked from publication | Replace every bracketed stop marker with exact-candidate evidence and remove inapplicable sections before entry. |
| Review attachment | No attachment selected | Add one only when it materially explains a review path. Sanitize it, record its purpose, and obtain exact upload approval. |

## Candidate-bound review path

| Review area | Proposed reviewer path | Gate before the note can claim it |
| --- | --- | --- |
| Public product story | Open Dashboard, search 119th Congress bills, open one verified bill, then open one verified member profile. | Pin one native build and web source; complete T06 navigation, content, timing, and official-source QA for the exact records. |
| Congress scope | Explain that the November candidate intentionally presents 119th Congress records during controlled soft launch. | Confirm visible or contextual 119th labeling and no mislabeled 120th records in the candidate and listing assets. |
| Source provenance | Point reviewers to the official-source links shown on bill and member records. | Verify link labels, destinations, and mobile formatting for the exact candidate. |
| Sign-in and account features | State which paths are public and list only the account features included in review. | Decide launch scope; provide a sanitized reviewer account in App Store Connect if any required path cannot be tested publicly. |
| Subscription and restore | Give exact upgrade, sandbox purchase, entitlement, and Restore Purchases steps only if the subscription is submitted with this version. | T07 sandbox lifecycle and restore evidence must pass on the signed candidate; product configuration and UI copy must match. App Store server verification remains off unless separately approved. |
| Privacy rights and account assistance | Point to `/privacy` and `/privacy/request`; describe the dedicated mailbox as the launch assistance channel. | PR #50 or equivalent truthful copy must be in the selected source, the mailbox procedure must be verified, and first-party intake must remain described as inactive. |
| Diagnostics and support | Describe only the support/diagnostic paths enabled in the candidate. | Complete the T09 provider/runtime comparison, exact archive privacy report, and native/web event sampling. |
| Deferred capabilities | Identify any visible controls that are intentionally unavailable in the November scope. | Confirm the candidate does not imply active AI, live video, real-time freshness, first-party privacy operations, or an unevidenced offer. |

## Review-notes assembly draft

Do not copy this block into App Store Connect while any bracketed marker remains.

```text
CapitolWonk presents source-linked bills, votes, and member records from the 119th Congress for this controlled early-access release.

PUBLIC REVIEW PATH
1. Open Dashboard.
2. Open Bills and search for [VERIFIED PUBLIC QUERY OR RECORD].
3. Open [VERIFIED 119TH-CONGRESS BILL] and review its official-source links.
4. Open [VERIFIED MEMBER] and review the source-backed profile fields.

SIGN-IN
[STATE WHETHER REVIEW REQUIRES SIGN-IN. IF YES, IDENTIFY THE FEATURE PATH; ENTER THE SANITIZED CREDENTIALS ONLY IN APP STORE CONNECT'S PROTECTED DEMO-ACCOUNT FIELDS.]

PURCHASES AND RESTORE
[IF A SUBSCRIPTION IS INCLUDED, PROVIDE THE EXACT SANDBOX PURCHASE AND RESTORE PATH VERIFIED UNDER T07. OTHERWISE STATE THAT NO PURCHASE PATH IS PART OF THIS SUBMISSION.]

PRIVACY AND SUPPORT
The privacy policy is available at https://www.capitolwonk.com/privacy. Privacy-rights assistance is available at https://www.capitolwonk.com/privacy/request through the verified dedicated mailbox. The database-backed first-party privacy queue is inactive for this release.

DATA SCOPE
The November release intentionally uses 119th Congress public records. [ADD THE EXACT SOURCE-SYNC OR FRESHNESS LIMITATION SUPPORTED BY THE SELECTED CANDIDATE.]

ADDITIONAL REVIEW CONTEXT
[LIST ONLY EXACT-CANDIDATE LIMITATIONS OR TEST STEPS THAT HELP APP REVIEW. DO NOT INCLUDE PRIVATE SUPPORT REFERENCES, IDENTIFIERS, OR CREDENTIALS.]
```

## Final assembly checks

- [ ] App Store Connect authentication is restored and the current App Review fields are inventoried read-only without saving.
- [ ] One exact native build, web source SHA, and 119th Congress data state are selected.
- [ ] T05 native monitoring, T06 physical-device navigation/content, and T07 subscription/restore evidence are reconciled for that candidate.
- [ ] The App Privacy comparison has no `Pending re-read` remote cells and matches the exact archive, runtime samples, provider paths, and mailbox-only operating model.
- [ ] Public `/support`, `/privacy`, and `/privacy/request` copy matches the candidate; first-party privacy intake and its operators remain inactive.
- [ ] The four-screen listing set uses the same candidate and passes wordmark, provenance, privacy, dimensions, and visual QA.
- [ ] Every bracketed marker in the notes draft is replaced or the section is removed.
- [ ] Protected contact and demo-account values are entered only in App Store Connect at action time.
- [ ] Tyler reviews the final notes, protected-field readiness, selected build, and submission contents before any remote save or submission.

## Stop conditions

Stop assembly if the build/source pairing is unclear, a claimed path lacks signed-device proof, reviewer access is unavailable, purchase configuration differs from the app, privacy/provider evidence is incomplete, the 119th Congress scope is ambiguous, or protected values appear in tracked material.

**Next T09 ledger step:** after App Store Connect authentication is restored, inventory the existing App Review information without saving. Then replace the stop markers using the exact November candidate evidence and present the complete remote delta for Tyler's separate publication decision.
