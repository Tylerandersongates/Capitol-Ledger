# App Store Connect Setup Packet

Status: prepared for TestFlight setup on June 25, 2026.

## Scope

Capitol Ledger CE is app-only for paid launch. Pro upgrades use Apple in-app purchase through the native iOS shell. The web checkout path stays disabled for App Store v1 unless a separate web product is deliberately reintroduced later.

## App Record

- App name: Capitol Ledger CE
- Bundle ID: `com.capitolledger.app`
- Suggested SKU: `capitol-ledger-ios-v1`
- Primary category recommendation: Reference
- Secondary category recommendation: News
- Support URL after deploy: `https://project-qosv1.vercel.app/support`
- Privacy Policy URL after deploy: `https://project-qosv1.vercel.app/privacy`
- Marketing URL: optional for v1
- Copyright: confirm final legal owner before submission

## Subscription Group

- Group name: Capitol Ledger CE Pro
- Group purpose: one-person Pro access for deeper civic tracking, summaries, reports, and priority alerts.
- Team is not included in App Store v1 billing.

## Products

Use one auto-renewable subscription group.

| Product | Product ID | Reference name | Display name | Current app price copy |
| --- | --- | --- | --- | --- |
| Pro monthly | `com.capitolledger.pro.monthly` | Capitol Ledger CE Pro Monthly | Pro Monthly | `$2.99` monthly |
| Pro annual | `com.capitolledger.pro.annual` | Capitol Ledger CE Pro Annual | Pro Annual | `$29.99` annual |

If the launch price changes in App Store Connect, update `lib/subscription-plans.ts` before sandbox/TestFlight purchase QA so app copy and Apple pricing do not drift.

## Product Review Notes

Use this as the starting note for subscription review:

```text
Capitol Ledger CE Pro unlocks deeper civic tracking features in the app, including expanded dashboard panels, topic and official tracking, exportable reports, priority vote reminders, AI bill summaries, source maps, and Weekly Brief access.

Purchases and restores are handled through Apple in-app purchase. Team features are visible as a later rollout but are not purchasable in this App Store v1 build.
```

## App Review Notes

Use this as the starting note for App Review:

```text
Capitol Ledger CE helps users follow federal bills, votes, officials, alerts, and saved legislative updates. Paid upgrades use Apple in-app purchase only.

To test purchases, open Settings > Plan or the Upgrade screen, choose Pro Monthly or Pro Annual, and complete the Apple sandbox/TestFlight purchase. Restore Purchases is available from the Upgrade screen.

Team features are visible as a later rollout and are not purchasable in this build.
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

1. Create App Store Connect app record with bundle ID `com.capitolledger.app`.
2. Create the Pro subscription group.
3. Create `com.capitolledger.pro.monthly`.
4. Create `com.capitolledger.pro.annual`.
5. Confirm prices match app copy or update app copy before QA.
6. Add support and privacy URLs after deployment.
7. Create or select the App Store Server API key.
8. Add required host environment variables.
9. Run strict local readiness checks.
10. Run sandbox/TestFlight purchase, restore, renewal, cancellation, expiration, and second-account-linking QA.
