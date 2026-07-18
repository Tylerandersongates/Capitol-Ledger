# Capitol Ledger EOD Handoff - July 17, 2026

Generated for Friday, July 17, 2026. This extends the Wednesday, July 15 handoff and is the source of truth for the next chat.

## Standing Rules
- Speak directly. Keep updates concise, useful, and low-fluff.
- Always include next best steps after each handoff or completed work block so work can keep moving.
- Keep the in-app browser open and visible during app testing so Tyler can watch progress.
- Routine fixes, commits, pushes, and visible browser QA are pre-approved. Check with Tyler before major build, architecture, dependency, schema, destructive, secret-related, or final App Review submission actions.
- A diagnostic means checking the whole app for stale code, duplicate code, unreachable code, disconnected routes/APIs, and obvious performance drag. Tighten safe issues; do not leave useless code around.
- Do not mark live app reports resolved until the issue is actually fixed and verified.
- Use narrow sandbox escalations only when needed. Do not commit secrets.
- Preserve Daily Brief as the user-facing name and internal Weekly Brief compatibility naming during upload-critical work.

## Baseline
- Repo: `/Users/tylergates/Documents/Capitol Ledger`
- Branch: `main`
- HEAD entering July 17 work: `c663803` (`Record July 15 EOD handoff`)
- Current release HEAD before this EOD commit: `0303871` (`Use current StoreKit server API hosts`)
- Origin sync before this EOD document: `0` behind / `0` ahead
- Previous dated handoff: `docs/eod-handoff-2026-07-15.md`
- Production target: `https://project-qosv1.vercel.app`
- Production release commit: `0303871`
- Native shell target: `https://project-qosv1.vercel.app`
- Public brand: `CapitolWonk CE`
- Bundle ID: `com.capitolwonk.ce`
- App Store Connect app ID: `6788196048`
- Apple Developer Team ID: `L9Z42PYG22`
- Subscription group ID: `22239938`
- TestFlight build: version `1.0`, build `1`, uploaded July 15, 2026
- Browser state at handoff: Pro Monthly subscription record in App Store Connect with a draft submission dialog open; the product shows `Ready for Review` and the draft has not been submitted.

## Completed Today
- Reviewed the product, pricing, target users, competitors, and adjacent civic/policy products. Durable local research artifacts were produced outside the repo:
  - Pricing decision: `/Users/tylergates/.codex/visualizations/2026/07/17/019f714e-e541-77f3-a49a-45d03fd67df7/capitolwonk-pricing-analysis/capitolwonk-pricing-decision.html`
  - Competitive research: `/Users/tylergates/.codex/visualizations/2026/07/17/019f714e-e541-77f3-a49a-45d03fd67df7/capitolwonk-competitive-research/capitolwonk-competitive-research.html`
- Finalized the working pricing direction and aligned the app, native StoreKit shell, readiness checks, and documentation:
  - Pro monthly: `$4.99`
  - Pro annual: `$39.99`
  - Team monthly: `$5.99` per seat, 3-seat minimum, 3-20 seats
  - Team annual: `$59.99` per seat, 3-seat minimum, 3-16 seats
  - Larger workspaces are directed to a custom plan.
- Added scalable Team App Store product handling and strict product-ID checks. Monthly Team supports seats 3-20; annual Team intentionally stops at 16 because higher annual totals exceed the selected Apple pricing range.
- Improved the native purchase bridge so the web upgrade screen receives the actual StoreKit purchase result instead of remaining on a generic opening message.
- Added an in-app account-deletion request flow and readiness check, updated Settings/Privacy/Support copy, deployed it, and verified the production flow without submitting a deletion request.
- Updated App Store Server API hosts to Apple’s current endpoints. The sandbox credential path authenticated successfully; the production API returned the expected pre-first-release authorization response.
- Configured the five App Store billing/readiness values in Vercel Production only. No credential or private-key content was committed.
- Passed the strict readiness/native checks, TypeScript, and lint during the implementation work. Relevant safeguards now cover scalable Team product IDs, account deletion, native purchase results, and current App Store Server API hosts.
- Committed and pushed today’s implementation in five commits:
  - `0453b4e` - Align Pro and Team App Store pricing
  - `8d7c605` - Add scalable Team App Store pricing
  - `16760cf` - Surface native StoreKit purchase results
  - `d0343e7` - Add in-app account deletion requests
  - `0303871` - Use current StoreKit server API hosts
- Verified the current production upgrade page with the signed-in account. Free remains the default plan; testers do not automatically receive paid access.
- Completed the Apple business setup needed for paid apps: agreements were signed and the paid-app banking/tax surfaces showed active/complete.
- Audited the App Store Connect app and subscription group:
  - The app, bundle ID, Pro product IDs, group ID, and native code match.
  - Pro Monthly is `com.capitolwonk.pro.monthly`, Apple ID `6791260010`.
  - Pro Monthly is available in the United States, has current `$4.99` pricing, English (U.S.) localization, and a free introductory offer for the first week with no end date.
  - United States-only availability is intentional because the product focuses on United States governmental systems.
- Created a new United States Sandbox Apple Account after the original tester was deleted during recreation. The replacement tester successfully signed in under iPhone Settings -> Developer -> Sandbox Apple Account. Do not record its email or password in git, and do not delete it; Apple does not permit reuse of a deleted sandbox email.
- Isolated the TestFlight purchase failure:
  - The web page sends the correct `com.capitolwonk.pro.monthly` request.
  - The native shell accepts the request and calls StoreKit.
  - `Product.products(for:)` returns no matching product, producing the exact native message `This App Store product is not available.`
  - The same failure occurred after the sandbox tester was signed in, so the tester account itself is no longer the blocker.
- Found and corrected a concrete App Store metadata gap for Pro Monthly:
  - Its App Review screenshot was empty.
  - Generated `docs/app-store-assets/review/capitolwonk-pro-monthly-review.jpg` at an accepted iPhone landscape size (`2736 x 1260`, JPEG, no alpha).
  - Tyler uploaded it under Review Information. App Store Connect auto-saved it even though the top Save button stayed disabled.
  - Refreshed the page and confirmed the screenshot persisted.
  - Added Pro Monthly to a draft review submission. Its status changed from `Prepare for Submission` to `Ready for Review`.
  - Nothing was submitted to App Review.

## Diagnostics
- Code delta from the July 15 EOD commit through `0303871`:
  - 26 files changed
  - 770 insertions
  - 149 deletions
- The StoreKit failure is not currently explained by a product-ID typo, bundle-ID mismatch, missing U.S. availability, missing price, missing localization, missing trial, unsigned Paid Apps Agreement, or an unsigned-in sandbox tester.
- The native error is thrown only after StoreKit returns an empty product list for the requested ID.
- Apple states that product metadata changes may take up to one hour to appear in sandbox. The Pro Monthly screenshot/readiness change was completed around 7:35 PM Pacific on July 17; the next session must retest before declaring the issue unresolved.
- App Store Connect currently contains 38 subscription records. The app intentionally requests 34 of them:
  - 2 Pro products
  - 2 base 3-seat Team products
  - Team monthly seat products for 4-20 seats
  - Team annual seat products for 4-16 seats
- Team annual products for 17-20 seats exist in App Store Connect but are intentionally not referenced by the app because the current annual pricing exceeds the supported target range. Do not delete or redesign these records without Tyler’s approval.
- The draft submission reports two explicit blockers:
  - The auto-renewable subscription must be submitted with its subscription group.
  - An app version for iOS must be added to the submission.
- The iOS App Version 1.0 record is not submission-ready yet:
  - No App Store screenshots are uploaded.
  - No build is selected on the version page.
  - Copyright is empty.
  - App Review sign-in credentials, contact information, and notes are empty.
  - The current release selection is automatic; confirm the intended release mode before submission.
- App Store Connect’s in-app browser cannot automate local file uploads. Tyler must select local screenshot files in the native file picker; Codex can prepare, validate, and verify them afterward.
- The Pro Monthly review screenshot is intentionally committed as a review artifact. It contains no credentials or private user data.
- Live OpenAI multi-bill QA remains pending. Keep OpenAI and Apple secrets outside git.

## QA
- Production account/upgrade flow:
  - Used the current signed-in account.
  - Confirmed the account starts Free and the upgrade page shows Pro and Team prices/cycles correctly.
  - Confirmed the production page sends the native Pro Monthly product ID when opened inside the TestFlight shell.
- TestFlight purchase flow:
  - Before sandbox sign-in: `This App Store product is not available.`
  - After successful sandbox sign-in: the same message remained.
  - No Apple purchase sheet opened and no transaction was created.
  - No real charge occurred and the account remains Free.
- Sandbox tester:
  - Country/storefront is United States.
  - iPhone Media & Purchases was signed out for sandbox-control testing.
  - The replacement sandbox tester is signed in under Developer settings.
- App Store Connect Pro Monthly:
  - Product ID exact match confirmed.
  - U.S. availability confirmed.
  - `$4.99` current price confirmed.
  - One-week free introductory offer confirmed.
  - English (U.S.) localization confirmed.
  - Review screenshot uploaded and persisted after refresh.
  - Product status confirmed as `Ready for Review` in Draft Submissions.
  - Submission remains a draft and the Submit for Review button is disabled.
- Production and repository implementation remained clean before adding the EOD/review artifact. No secret was written to tracked files.

## Current State
- North star remains TestFlight/App Store upload readiness.
- `main` is synchronized with `origin/main` at `0303871` before this EOD commit.
- Production is running the current implementation and the native TestFlight build continues to load production web content dynamically.
- Pro Monthly is the only subscription moved to `Ready for Review`; the subscription group and the remaining products are still in preparation states.
- A draft review submission exists with Pro Monthly but has not been submitted.
- The Pro Monthly sandbox purchase remains unverified. The latest Apple metadata change needs propagation time before the next device test.
- The App Store version record still needs listing screenshots, build selection, copyright, reviewer credentials/contact details, review notes, and the subscription group before final submission.
- App Store Server API credentials are configured only in protected production settings. No secret is committed.
- Free is the default for new users and testers. Paid access must come from a verified StoreKit purchase/restore or an explicitly controlled test fixture; do not grant every tester Pro automatically.
- Daily Brief remains the user-facing name. Weekly Brief remains only as internal compatibility naming.
- Live OpenAI multi-bill QA remains outside the completed upload-critical work.

## Tomorrow Pickup Tasks
1. Start with the controlled Pro Monthly device retest; do not change code first:
   - Confirm iPhone Settings -> Developer -> Sandbox Apple Account still shows the replacement tester signed in.
   - Keep Media & Purchases signed out during this sandbox-control test.
   - Force-close CapitolWonk CE, reopen it directly from the Home Screen, open Upgrade, keep Monthly selected, and tap Start 7-day free trial.
   - Record whether the Apple purchase sheet opens or the exact error repeats.
2. If the Apple purchase sheet opens:
   - Complete the sandbox purchase.
   - Confirm the signed-in CapitolWonk account changes from Free to Pro.
   - Verify the product ID, transaction/original transaction IDs, App Account Token association, server validation, and persisted account subscription.
   - Verify Restore Purchases, relaunch persistence, sandbox renewal, cancellation/expiry behavior, and return to Free when the entitlement is no longer active.
3. If `This App Store product is not available` still appears after a full hour of propagation:
   - Recheck Apple Developer System Status and TN3186.
   - Capture the iPhone model, iOS version, TestFlight build number, sandbox storefront, exact timestamp, and product ID.
   - Confirm Pro Monthly still reads `Ready for Review` and remains in Draft Submissions.
   - Escalate to Apple Developer Support with the verified bundle/product/status evidence rather than changing identifiers.
4. Continue App Store review preparation without submitting:
   - Add the subscription group to the draft submission.
   - Decide which remaining Pro/Team products are required for version 1.0 and prepare/upload a review screenshot for each required product.
   - Keep annual Team 17-20 products unused unless Tyler approves a pricing/product redesign.
5. Finish the iOS App Version 1.0 record:
   - Select TestFlight build 1.
   - Prepare and upload required iPhone App Store screenshots.
   - Fill copyright.
   - Create or select a durable App Review demo account and enter review sign-in details without committing credentials.
   - Fill App Review contact information and concise review notes covering the login, upgrade, Daily Brief, bill analysis, and account deletion paths.
   - Confirm manual versus automatic release with Tyler.
6. Add the completed iOS app version to the draft review submission and clear every App Store Connect readiness warning.
7. Ask Tyler immediately before clicking the final Submit for Review action.
8. After purchase/readiness work, return to live OpenAI multi-bill QA and the prioritized competitive-product improvements.

## Tomorrow Start Sequence
1. Read this file completely.
2. Check `git status --short --branch` and confirm the EOD commit is synchronized with `origin/main`.
3. Open App Store Connect directly to Pro Monthly: `https://appstoreconnect.apple.com/apps/6788196048/distribution/subscriptions/6791260010`.
4. Confirm `Ready for Review`, the review screenshot, and Draft Submissions (1).
5. Run the controlled iPhone Pro Monthly retest before making code or identifier changes.
6. Continue with the matching branch under Tomorrow Pickup Tasks.

## Resume Prompt For New Thread
```text
Read `docs/eod-handoff-2026-07-17.md` first and use it as the source of truth.

Repo: `/Users/tylergates/Documents/Capitol Ledger`
Branch: `main`
Production: `https://project-qosv1.vercel.app`
Release commit before the July 17 EOD: `0303871` (`Use current StoreKit server API hosts`)
App Store Connect app ID: `6788196048`
Apple Developer Team ID: `L9Z42PYG22`
Subscription group ID: `22239938`
Pro Monthly Apple ID: `6791260010`

North star: TestFlight/App Store upload readiness.

Public brand is CapitolWonk CE. Free remains the default plan. Pro is $4.99 monthly/$39.99 annual. Team is $5.99 per seat monthly/$59.99 per seat annual, minimum 3 seats; monthly supports 3-20 and annual supports 3-16 before custom pricing.

The replacement U.S. Sandbox Apple Account is signed in under iPhone Developer settings, but TestFlight still returned `This App Store product is not available` before Pro Monthly’s Apple metadata was completed. Pro Monthly now has a persisted App Review screenshot, a one-week free introductory offer, U.S. availability, and `Ready for Review` status in Draft Submissions. Nothing has been submitted. Apple metadata may take up to one hour to propagate.

Start by retesting Pro Monthly on the physical iPhone before changing code. If the purchase sheet opens, complete sandbox purchase/restore/account-sync QA. If the exact unavailable-product error remains after the propagation window, follow TN3186 and prepare an Apple Developer Support escalation with the verified evidence.

The draft cannot be submitted until its subscription group and an iOS app version are added. App Version 1.0 still needs build selection, App Store screenshots, copyright, review credentials/contact information, and notes. Ask Tyler immediately before final Submit for Review.

Do not commit secrets or tester credentials. Ask before major architecture, dependency, schema, destructive, secret-related, annual 17-20 Team product, or final submission changes. Routine fixes, commits, pushes, and visible browser QA are pre-approved. Preserve Daily Brief user-facing naming and internal Weekly Brief compatibility naming during upload-critical work.
```
