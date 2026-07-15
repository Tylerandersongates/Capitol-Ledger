# App Store Connect Setup Packet

Status: rename-ready TestFlight prep as of June 25, 2026.

## Scope

The final app name is `CapitolWonk CE`. The previous deployed placeholder has been retired.

Use these final Apple identity values before creating App Store Connect records. Pro and Team upgrades use Apple in-app purchase through the native iOS shell. The web checkout path stays disabled for App Store v1 unless a separate web product is deliberately reintroduced later.

## App Record

- App name: `CapitolWonk CE`
- Bundle ID: `com.capitolwonk.ce` (final native value)
- Suggested SKU: `capitolwonk-ce-ios-v1`
- Primary category recommendation: Reference
- Secondary category recommendation: News
- Support URL after deploy: `https://project-qosv1.vercel.app/support`
- Privacy Policy URL after deploy: `https://project-qosv1.vercel.app/privacy`
- Marketing URL: optional for v1
- Copyright: confirm final legal owner before submission

## Subscription Group

- Group name: `CapitolWonk CE Paid Plans`
- Group purpose: Pro access for deeper personal civic tracking and Team access for a three-seat shared workspace.
- Keep Pro and Team in one auto-renewable subscription group so Apple manages upgrades, downgrades, restores, and cancellations consistently.

## Products

Use one auto-renewable subscription group.

| Product | Product ID | Reference name | Display name | Current app price copy |
| --- | --- | --- | --- | --- |
| Pro monthly | `com.capitolwonk.pro.monthly` | `CapitolWonk CE Pro Monthly` | Pro Monthly | 7-day free trial, then `$2.99` monthly |
| Pro annual | `com.capitolwonk.pro.annual` | `CapitolWonk CE Pro Annual` | Pro Annual | `$29.99` annual |
| Team monthly | `com.capitolwonk.team.monthly` | `CapitolWonk CE Team Monthly` | Team Monthly | `$5.99` per seat monthly; App Store product unlocks a three-seat starter workspace |
| Team annual | `com.capitolwonk.team.annual` | `CapitolWonk CE Team Annual` | Team Annual | `$59.99` per seat annually; App Store product unlocks a three-seat starter workspace |

If the final product IDs change for trademark or naming reasons, update the web controls, native StoreKit models, server validation, setup packet, and readiness checks before creating products in App Store Connect. If the launch price changes in App Store Connect, update `lib/subscription-plans.ts` before sandbox/TestFlight purchase QA so app copy and Apple pricing do not drift.

Configure Pro monthly with an App Store introductory offer: 7-day free trial, then automatic monthly renewal at `$2.99` unless the user cancels before renewal in Apple subscription settings. Keep this offer on the monthly Pro product only unless the app copy and QA plan are intentionally expanded.

## Product Review Notes

Use this as the starting note for subscription review:

```text
CapitolWonk CE Pro unlocks deeper civic tracking features in the app, including expanded dashboard panels, topic and official tracking, exportable reports, priority vote reminders, AI bill summaries, source maps, and Daily Brief access. Monthly Pro includes a 7-day free trial, then renews at $2.99/month unless canceled before renewal.

CapitolWonk CE Team unlocks a three-seat shared workspace with owner access, invites, shared watchlists, Team alerts, and shared tracking. Larger Team plans are handled through support after activation.

Purchases and restores are handled through Apple in-app purchase.
```

## App Review Notes

Use this as the starting note for App Review:

```text
CapitolWonk CE helps users follow federal bills, votes, officials, alerts, and saved legislative updates. Paid upgrades use Apple in-app purchase only.

To test purchases, open Settings > Plan or the Upgrade screen, choose Pro Monthly, Pro Annual, Team Monthly, or Team Annual, and complete the Apple sandbox/TestFlight purchase. Pro Monthly should show a 7-day free trial that converts to $2.99/month unless canceled before renewal. Restore Purchases is available from the Upgrade screen.

Team purchases open the Team workspace with three seats. Owner access does not consume a team seat.
```

Add reviewer credentials outside git after production auth is configured. Do not commit reviewer email addresses or passwords.

## Required Host Environment

Set these through the deployment provider, never in git:

- `APP_STORE_BUNDLE_ID`
- `APP_STORE_ACCOUNT_TOKEN_NAMESPACE`
- `APP_STORE_CONNECT_ISSUER_ID`
- `APP_STORE_CONNECT_KEY_ID`
- `APP_STORE_CONNECT_PRIVATE_KEY`

Then run:

```bash
TESTFLIGHT_REQUIRE_READY=true pnpm testflight:check
BILLING_REQUIRE_APP_STORE=true pnpm billing:check
```

## Screenshot Candidates

Capture final screenshots only after purchase QA and final text-tone QA are stable.

- `/dashboard`
- `/search?type=bills&focus=results`
- `/bills/demo-hr-22`
- `/members/FCA030`
- `/alerts`
- `/brief`
- `/upgrade`

## Privacy And Support

- Support page: `/support`
- Privacy page: `/privacy`
- Privacy copy is launch-prep copy and should be reviewed against the exact production services enabled at submission.
- Account deletion, export, and correction requests currently route through Support. If App Review requires in-app self-service deletion before public launch, build that before submission.

## Apple-Side Checklist

1. Confirm final bundle ID `com.capitolwonk.ce`, SKU `capitolwonk-ce-ios-v1`, and subscription product IDs.
2. Keep native bundle ID, product IDs, setup docs, and readiness checks aligned with these final Apple values.
3. Create App Store Connect app record with `com.capitolwonk.ce`.
4. Create the paid plans subscription group.
5. Create `com.capitolwonk.pro.monthly` with the 7-day free trial introductory offer.
6. Create `com.capitolwonk.pro.annual`.
7. Create `com.capitolwonk.team.monthly`.
8. Create `com.capitolwonk.team.annual`.
9. Confirm prices match app copy or update app copy before QA.
10. Add support and privacy URLs after deployment.
11. Create or select the App Store Server API key.
12. Add required host environment variables.
13. Run strict local readiness checks.
14. Run sandbox/TestFlight purchase, restore, renewal, cancellation, expiration, plan-switching, Team workspace, and second-account-linking QA.
