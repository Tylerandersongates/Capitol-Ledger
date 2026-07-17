# App Store Connect Setup Packet

Status: pricing-aligned TestFlight prep as of July 17, 2026.

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
- Group purpose: Pro access for deeper personal civic tracking and Team access for monthly 3-20 seat or annual 3-16 seat shared workspaces.
- Keep Pro and Team in one auto-renewable subscription group so Apple manages upgrades, downgrades, restores, and cancellations consistently.

## Products

Use one auto-renewable subscription group.

| Product | Product ID | Reference name | Display name | Current app price copy |
| --- | --- | --- | --- | --- |
| Pro monthly | `com.capitolwonk.pro.monthly` | `CapitolWonk CE Pro Monthly` | Pro Monthly | 7-day free trial, then `$4.99` monthly |
| Pro annual | `com.capitolwonk.pro.annual` | `CapitolWonk CE Pro Annual` | Pro Annual | `$39.99` annual |
| Team monthly, 3 seats | `com.capitolwonk.team.monthly` | `CapitolWonk CE Team 3 Monthly` | Team Monthly - 3 Seats | `$17.99` monthly |
| Team annual, 3 seats | `com.capitolwonk.team.annual` | `CapitolWonk CE Team 3 Annual` | Team Annual - 3 Seats | `$179.99` annually |
| Team monthly, 4-20 seats; annual, 4-16 seats | `com.capitolwonk.team.{seatCount}.{cycle}` | `CapitolWonk CE Team {seatCount} {Cycle}` | `Team {Cycle} - {seatCount} Seats` | Use the exact matrix below |

If the final product IDs change for trademark or naming reasons, update the web controls, native StoreKit models, server validation, setup packet, and readiness checks before creating products in App Store Connect. If the launch price changes in App Store Connect, update `lib/subscription-plans.ts` before sandbox/TestFlight purchase QA so app copy and Apple pricing do not drift.

Configure Pro monthly with an App Store introductory offer: 7-day free trial, then automatic monthly renewal at `$4.99` unless the user cancels before renewal in Apple subscription settings. Keep this offer on the monthly Pro product only unless the app copy and QA plan are intentionally expanded.

StoreKit does not apply a quantity to auto-renewable subscriptions. Team therefore uses one product per supported seat count and cycle. The three-seat products keep the original IDs; higher tiers use `com.capitolwonk.team.{seatCount}.{cycle}`. Monthly supports 3-20 seats. Annual supports 3-16 because this account's current App Store price ceiling cannot preserve the approved annual economics above 16 seats. The four annual 17-20 records remain reserved and unavailable; those customers use the custom-plan contact path. Teams above 20 seats also use custom planning.

### Team product and price matrix

Monthly pricing follows the approved `$5.99`-per-seat economics using App Store `.99` price tiers. Annual pricing follows `$59.99`-per-seat economics. Rank monthly and annual products for the same seat count at the same subscription level; rank higher seat counts above lower seat counts.

| Seats | Monthly product ID | Monthly price | Annual product ID | Annual price |
| ---: | --- | ---: | --- | ---: |
| 3 | `com.capitolwonk.team.monthly` | `$17.99` | `com.capitolwonk.team.annual` | `$179.99` |
| 4 | `com.capitolwonk.team.4.monthly` | `$23.99` | `com.capitolwonk.team.4.annual` | `$239.99` |
| 5 | `com.capitolwonk.team.5.monthly` | `$29.99` | `com.capitolwonk.team.5.annual` | `$299.99` |
| 6 | `com.capitolwonk.team.6.monthly` | `$35.99` | `com.capitolwonk.team.6.annual` | `$359.99` |
| 7 | `com.capitolwonk.team.7.monthly` | `$41.99` | `com.capitolwonk.team.7.annual` | `$419.99` |
| 8 | `com.capitolwonk.team.8.monthly` | `$47.99` | `com.capitolwonk.team.8.annual` | `$479.99` |
| 9 | `com.capitolwonk.team.9.monthly` | `$53.99` | `com.capitolwonk.team.9.annual` | `$539.99` |
| 10 | `com.capitolwonk.team.10.monthly` | `$59.99` | `com.capitolwonk.team.10.annual` | `$599.99` |
| 11 | `com.capitolwonk.team.11.monthly` | `$65.99` | `com.capitolwonk.team.11.annual` | `$659.99` |
| 12 | `com.capitolwonk.team.12.monthly` | `$71.99` | `com.capitolwonk.team.12.annual` | `$719.99` |
| 13 | `com.capitolwonk.team.13.monthly` | `$77.99` | `com.capitolwonk.team.13.annual` | `$779.99` |
| 14 | `com.capitolwonk.team.14.monthly` | `$83.99` | `com.capitolwonk.team.14.annual` | `$839.99` |
| 15 | `com.capitolwonk.team.15.monthly` | `$89.99` | `com.capitolwonk.team.15.annual` | `$899.99` |
| 16 | `com.capitolwonk.team.16.monthly` | `$95.99` | `com.capitolwonk.team.16.annual` | `$959.99` |
| 17 | `com.capitolwonk.team.17.monthly` | `$101.99` | Reserved, unavailable | Custom annual plan |
| 18 | `com.capitolwonk.team.18.monthly` | `$107.99` | Reserved, unavailable | Custom annual plan |
| 19 | `com.capitolwonk.team.19.monthly` | `$113.99` | Reserved, unavailable | Custom annual plan |
| 20 | `com.capitolwonk.team.20.monthly` | `$119.99` | Reserved, unavailable | Custom annual plan |

## Product Review Notes

Use this as the starting note for subscription review:

```text
CapitolWonk CE Pro unlocks deeper civic tracking features in the app, including expanded dashboard panels, topic and official tracking, exportable reports, priority vote reminders, AI bill summaries, source maps, and Daily Brief access. Monthly Pro includes a 7-day free trial, then renews at $4.99/month unless canceled before renewal.

CapitolWonk CE Team unlocks a shared workspace with owner access, invites, shared watchlists, Team alerts, and shared tracking. Customers choose 3-20 monthly seats or 3-16 annual seats before purchase. The billing owner is included and does not consume a teammate seat. Team starts at $17.99/month or $179.99/year for three seats; Apple shows the fixed total for the selected seat count. Annual 17-20 seat workspaces and all organizations needing more than 20 seats are directed to work with us on a custom plan.

Purchases and restores are handled through Apple in-app purchase.
```

## App Review Notes

Use this as the starting note for App Review:

```text
CapitolWonk CE helps users follow federal bills, votes, officials, alerts, and saved legislative updates. Paid upgrades use Apple in-app purchase only.

To test purchases, open Settings > Plan or the Upgrade screen, choose a Pro cycle or a supported Team cycle and seat count, and complete the Apple sandbox/TestFlight purchase. Pro Monthly should show a 7-day free trial that converts to $4.99/month unless canceled before renewal. Team should allow 3-20 monthly seats or 3-16 annual seats and Apple should show the exact fixed total. Restore Purchases is available from the Upgrade screen.

Team purchases open the Team workspace with the selected number of teammate seats. Owner access does not consume a team seat. Annual 17-20 and all 21+ counts use the custom-plan contact path.
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
7. Keep `com.capitolwonk.team.monthly` and `com.capitolwonk.team.annual` as the three-seat products.
8. Keep all 34 additional Team records, but configure pricing/availability only for monthly 4-20 and annual 4-16; reserve annual 17-20 without sale availability.
9. July 17, 2026 audit: all 38 records exist; monthly 4-20 and annual 4-16 are U.S.-only with exact matrix prices and English (U.S.) metadata; annual 17-20 remain unavailable without prices or localization.
10. Before review, reorder subscription levels so Team 20 is highest, lower seat counts descend through Team 3, monthly and annual products for the same seat count share a level, and Pro is lowest. App Store Connect initially placed the additional records in creation order.
11. Confirm Pro is `$4.99/month` or `$39.99/year`; confirm every launch-active Team product matches its seat count and matrix price.
12. Add support and privacy URLs after deployment.
13. Create or select the App Store Server API key.
14. Add required host environment variables.
15. Run strict local readiness checks.
16. Run sandbox/TestFlight purchase, restore, renewal, cancellation, expiration, plan-switching, Team workspace, and second-account-linking QA.
