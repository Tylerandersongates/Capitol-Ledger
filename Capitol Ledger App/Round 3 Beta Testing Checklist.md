# Round 3 Beta Testing Checklist

Status: active planning checklist for the next tester pass.

Last updated: June 15, 2026.

## Goal

Use Round 3 to verify the new paid subscription and Team workspace reality added since Round 2: Stripe subscription checkout, Team checkout return, paid seat capacity, invite creation, invite acceptance, member workspace access, and downgrade/cancel paths.

## New Since Round 2

- Stripe-backed Pro and Team checkout sessions.
- Team checkout quantity with a minimum of 3 seats.
- Team checkout return to `/team`.
- Owner Team workspace with paid seat count, assigned seats, and open seats.
- Pending Team invites that reserve paid seats.
- Test-domain invite link exposure for QA.
- Invite acceptance page at `/team/accept`.
- Member access to `/team` through an accepted owner-paid seat.
- Stripe Billing Portal route for downgrade, cancellation, payment method, invoice, and Team seat quantity management.
- Webhook subscription update handling that reads Stripe item price and quantity.

## Round 3 Entry Gate

- Vercel build passes on `origin/main`.
- Production smoke passes for `/settings`, `/alerts`, `/upgrade`, `/team`, and `/team/accept`.
- `BILLING_REQUIRE_STRIPE=true node scripts/check-billing-readiness.mjs` passes.
- Team QA safe checks pass against production.
- At least one full Team checkout has completed in Stripe test mode.
- At least one invited account has accepted a Team seat and opened `/team` as a member.
- No active console errors on the Team owner or member workspace pages.
- No secrets are committed.

## Stripe Subscription Checkout

- Open `/upgrade`.
- Switch between monthly and annual billing.
- Confirm Free, Pro, and Team pricing is understandable.
- Start Pro checkout and verify Stripe Checkout opens.
- Cancel Pro checkout and confirm return to `/upgrade?checkout=cancel`.
- Complete Pro checkout in test mode and confirm return to `/account?checkout=success&plan=pro`.
- Confirm account subscription shows a Stripe-backed Pro record.
- Confirm locked Pro features unlock where expected.
- Confirm starting Team checkout requests seat quantity.
- Confirm Team checkout quantity is at least 3 seats.

## Team Checkout And Owner Workspace

- Open `/upgrade`.
- Select Team with 3 seats.
- Complete Stripe Checkout using test card `4242 4242 4242 4242`.
- Confirm return to `/team?checkout=success&plan=team`.
- Confirm `/team` opens for the owner after webhook processing.
- Confirm owner page shows active Team billing.
- Confirm paid seats, assigned seats, and open seats are accurate.
- Confirm owner controls are visible only to the owner.
- Confirm the Team workspace copy clearly explains paid seat capacity.

## Invite Creation

- From the Team owner account, create an invite for a test-domain email.
- Confirm invite creation succeeds when open seats are available.
- Confirm pending invite reserves a seat.
- Confirm duplicate pending invite refreshes the invite instead of consuming another seat.
- Confirm full-seat state blocks new invites.
- Confirm invite delivery mode is visible in QA output.
- Confirm invite link is available for `.test` QA recipients only.

## Invite Acceptance

- Sign out of the owner account.
- Create or sign in as the invited account.
- Open the invite link.
- Confirm invite page shows the workspace owner, invited email, role, and expiration.
- Confirm wrong signed-in email is blocked.
- Accept the invite as the invited account.
- Confirm accepted state appears on `/team/accept`.
- Open `/team`.
- Confirm member page shows Team seat active, member seat assigned, accepted status, and the assigned role.
- Confirm member does not see owner-only invite controls.

## Downgrade And Cancellation

- For a Stripe-backed Pro account, choose the Free plan action and confirm it routes to billing management instead of locally switching to Free.
- For a Stripe-backed Team account, choose Free or Pro and confirm it routes to billing management.
- Confirm Stripe Billing Portal can manage cancellation.
- Confirm Stripe Billing Portal can manage payment method and invoices.
- Confirm Team quantity changes are available only through Stripe billing management.
- Confirm webhook updates local plan after a Stripe portal change.
- Confirm canceled subscriptions remove paid access.
- Confirm Team-to-Pro or Team-to-Free removes owner Team workspace access.
- Confirm accepted Team members lose workspace access when owner Team billing is no longer active.

## Over-Capacity Checks

- Reduce Team quantity below assigned plus pending seats in Stripe test mode.
- Confirm `/team` shows the reduced paid seat count.
- Confirm invite creation is blocked while over capacity.
- Confirm member access rules remain predictable.
- Add a follow-up issue for an explicit over-capacity UI if the current copy is unclear.

## Regression Smoke

- `/settings` first load shows account connected, setup ready, and synced.
- `/alerts` loads without console errors.
- `/upgrade` renders plan cycle and all plan actions.
- `/team` owner view loads without console errors.
- `/team` member view loads without console errors.
- `/team/accept?teamQa=missing` renders missing-token state.
- Unauthenticated `/team` redirects to sign-in.
- Cross-origin invite creation is rejected.
- Feedback submission still works from `/feedback`.
- Reviewer triage still works from `/feedback/review`.

## QA Commands

```bash
env BILLING_REQUIRE_STRIPE=true node scripts/check-billing-readiness.mjs
env TEAM_QA_BASE_URL=https://project-qosv1.vercel.app node scripts/qa-team-flow.mjs
env TEAM_QA_BASE_URL=https://project-qosv1.vercel.app TEAM_QA_CREATE_ACCOUNTS=true TEAM_QA_CHECKOUT=true TEAM_QA_PRINT_LINKS=true node scripts/qa-team-flow.mjs
env TEAM_QA_BASE_URL=https://project-qosv1.vercel.app TEAM_QA_ACCEPT_INVITE=true TEAM_QA_PRINT_LINKS=true node scripts/qa-team-flow.mjs
node scripts/check-beta-readiness.mjs
node scripts/check-beta-triage.mjs
```

## June 15, 2026 QA Run

Status: production Round 3 pass completed against `https://project-qosv1.vercel.app`.

- Code diagnostic found and removed stale beta/subscription code in commit `f2fc089`.
- Billing readiness, beta readiness, production auth QA, beta triage, and Team safe QA passed.
- Production smoke passed for `/beta`, `/settings`, `/alerts`, `/upgrade`, `/team`, `/team/accept?teamQa=missing`, `/feedback`, and `/feedback/review` with no active console errors.
- Pro checkout opened Stripe Checkout, canceled back to `/upgrade?checkout=cancel`, completed to `/account?checkout=success&plan=pro`, and hydrated as `provider=stripe`, `plan=pro`.
- Pro cancellation webhook updated the QA account to `plan=free`, `status=canceled`, and the upgrade page offered Pro again.
- Team checkout completed to `/team?checkout=success&plan=team`; invite creation, invite delivery, invite acceptance, and accepted member `/team` access passed.
- Stripe webhook endpoint was updated in test mode to deliver `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.
- Stripe Billing Portal configuration was updated in test mode to allow Team quantity-only subscription updates; the portal now shows `Update subscription` with quantity controls.
- Over-capacity QA passed: Team quantity increased to 5, a fourth occupied seat was accepted, quantity reduced to 3, `/team` showed 3 paid seats and 4 occupied seats, new invites were blocked, and existing member access stayed predictable.
- Team downgrade/cancel QA passed: changing the Team subscription to Pro removed owner invite access and member Team access; canceling the subscription updated the owner to `plan=free`, `status=canceled`, with Team access still removed.
- Beta triage snapshot showed 11 total reports, 11 resolved, 0 active, 0 launch blockers, and 0 untriaged.

Notes:

- The destructive Stripe QA accounts used in this pass were intentionally downgraded or canceled after verification. Future full Team checkout QA should create a fresh Team owner and invitee account.
- Local `check-beta-triage` needs network/database access; the escalated production run passed.

## Exit Criteria

- One full Team checkout to accepted member flow passes in production.
- One downgrade or cancellation path is verified through Stripe Billing Portal in test mode.
- Round 3 tester reports are triaged as launch blocker, beta acceptable, later, duplicate, or resolved.
- No active launch blockers remain.
- Known Team capacity limitations are documented.
