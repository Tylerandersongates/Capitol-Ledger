# Tyler Personal Beta Test Guide

Private pre-tester checklist for Tyler. Use this before inviting external beta testers; keep tester-facing guides focused on normal user flows.

## Billing And Team Cancellation
- Use a real Checkout-created Team subscription with the saved Stripe test card.
- Confirm the Stripe Billing Portal opens from the app for the owner account.
- If the Team plan is canceled in the portal, confirm Stripe shows the subscription as ending at the period date.
- Confirm CapitolWonk intentionally treats a pending-cancel Team subscription as locked immediately:
  - `/team` shows the access gate.
  - `/upgrade` shows Free as the current plan.
  - Team checkout quantity resets to the 3-seat minimum.
- Decide before external beta whether the product wording should say cancellation revokes access immediately or at period end.

## Annual Billing
- Pro Annual checkout is verified in production test mode:
  - App displayed `$29.99 / year`.
  - Stripe Checkout completed with the test card.
  - Webhook/database sync produced `pro / annual / stripe / active`.
  - Billing Portal showed the current Pro Annual subscription.
- Team Annual checkout is verified in production test mode after the Vercel price env update:
  - App displayed `$59.99 / seat / year` and `$179.97 / workspace / year` for 3 seats.
  - Stripe Checkout completed with the test card at `$179.97 per year`.
  - Webhook/database sync produced `team / annual / stripe / active` with `seatCount=3`.
  - Stripe subscription metadata/quantity/price matched `plan=team`, `cycle=annual`, `seatCount=3`, quantity `3`, and price `price_1Tj7CUGWVYQi06kN9hfe8KKh`.
  - Before the billing-owner split, post-checkout `/team` showed 3 paid seats, 1 assigned owner seat, and 2 open seats.
  - After the billing-owner split deploy, confirm `/team` shows 3 participant seats, 0 reserved, and 3 open seats for the same kind of billing-only owner.
  - Post-checkout `/upgrade` showed Annual selected, Team `Manage Billing`, and `$179.97 / workspace / year`.

## Team API Lockout Follow-Up
- Confirm Team invites and Team seats APIs return `403` for a canceled owner.
- Use Vercel logs or an external same-session API harness for this check.
- Do not rely on the in-app browser for this item: direct `/api/...` navigation is blocked by the browser client, and bookmarklet-style probes are blocked by browser policy.
- Keep this as a private Tyler check until it is runtime-observed; source inspection already confirms the APIs use the synced subscription guard.

## Real Member Lockout Follow-Up
- Runtime-test Admin and Analyst lockout only on a real canceled owner workspace that actually has Admin and Analyst seats.
- Expected result after owner cancellation sync:
  - Admin cannot manage invites or seats.
  - Analyst cannot access shared Team workspace data.
  - Member `/team` pages show the access gate.
- The current real pending-cancel workspace had only the owner seat before lockout, so this needs a fresh real Team workspace with invited members.

## Beta Readiness Before Invites
- Run the DB-backed beta readiness check with `BETA_CHECK_DATABASE=true`.
- Inbox-verify one live auth email path before expecting tester email flows to work.
  - Verified on production with a registered real account password-reset email.
- Confirm deployed auth cookies are `Secure`, `HttpOnly`, and `SameSite=lax`.
  - Verified on production with an existing fake QA sign-in.
- Review the beta checklist page and make sure unresolved private billing/API items are not marked resolved in tester-facing materials.

## Official Statement Video Follow-Up
- Create a YouTube Data API key when we are ready to run automated official-statement discovery.
- Add the key only as `YOUTUBE_API_KEY` in local/Vercel environment variables; do not commit it.
- Run `youtube-statements:sync` to generate the review artifact for official-channel bill video candidates.
- Keep this out of Round 3 tester instructions until candidate videos have been reviewed and approved.

## Naive User Regression
- Create a fresh fake account and do not open the verification email.
  - Verified after deploy with `qa-unverified-1781659874086@capitolledger.test`.
- Try direct navigation to `/dashboard`, `/settings`, and `/team`.
  - Expected: pending-verification accounts land back on `/sign-in?mode=verify`.
  - Expected: account-backed storage does not sync before `emailVerifiedAt` is set.
  - Verified after deploy: all three routes redirected to verify mode, and `/api/auth/session` returned `authenticated:false` with `requiresVerification:true`.
- Open the verification link and confirm the account can continue to `/onboarding` or `/dashboard`.
  - Verified with `tylerandersongates@att.net`: the link verified the account and `/dashboard` opens after normal sign-in.
  - Verified after deploy: `/sign-in?mode=success` shows Setup and Dashboard choices, Setup opens `/onboarding`, browser Back returns to the success screen, and Dashboard opens `/dashboard`.
- Recheck Profile copy on a partial setup account: sync should mean account storage is connected, not that district setup is complete.
- Decide whether accidental saved-item removal needs an undo toast before external testers.
- Check whether cumulative Civic Momentum wording is clear when a user removes the only currently saved bill.

## Round 3 Data Expansion
- Implemented locally for Round 3: beta district presets now cover 12 district/ZIP groups across California, Massachusetts, New York, and Texas.
- The old fictional demo bills were replaced with source-backed 119th Congress records: H.R. 22, H.R. 471, S. 2237, and S. 3688.
- Outside-state sponsors/cosponsors were added where the selected bills require them, including Arkansas, South Carolina, Alaska, and Georgia records.
- Local verification passed: stale old demo-bill scan, video/source link check, Congress readiness demo-safe check, clean-clone lint, clean-clone typecheck, and clean-clone production build.
- After Vercel deploy, production-smoke onboarding district matching, `/search`, `/bills/demo-hr-22?tab=details`, new sponsor/cosponsor member profiles, source links, alerts, weekly brief inputs, and basic page performance.
