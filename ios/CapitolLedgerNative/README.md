# Native iOS Shell

This is the first native iOS shell for the app-only path. It wraps the deployed app in a `WKWebView` and handles Apple in-app purchases with StoreKit 2.

## Bridge Contract

The web paywall posts messages to:

```js
window.webkit.messageHandlers.capitolLedgerPurchase.postMessage(message)
```

Supported messages:

- `{ action: "purchase", plan: "pro", cycle: "monthly", productId: "com.capitolwonk.pro.monthly" }`
- `{ action: "purchase", plan: "pro", cycle: "annual", productId: "com.capitolwonk.pro.annual" }`
- `{ action: "purchase", plan: "team", cycle: "monthly", productId: "com.capitolwonk.team.monthly" }`
- `{ action: "purchase", plan: "team", cycle: "annual", productId: "com.capitolwonk.team.annual" }`
- `{ action: "restore" }`
- `{ action: "manage" }`

Native StoreKit results are written back into the WebView by updating `capitol-ledger:subscription` in local storage and dispatching `capitol-ledger:subscription-changed`.

When StoreKit returns a signed transaction JWS, the WebView also posts it to `/api/account/subscription/app-store` so the account subscription can be synced after server validation.

## Product IDs

- Pro monthly: `com.capitolwonk.pro.monthly` with the App Store Connect 7-day free trial introductory offer, then $4.99/month
- Pro annual: `com.capitolwonk.pro.annual` at $39.99/year
- Team monthly: `com.capitolwonk.team.monthly` at $17.99 total for one three-seat workspace
- Team annual: `com.capitolwonk.team.annual` at $179.99 total for one three-seat workspace

Create these products in App Store Connect in one subscription group before TestFlight purchase QA.

## Build Notes

Open `CapitolLedgerNative.xcodeproj` in Xcode, set the signing team, final bundle identifier, and `APP_DISPLAY_NAME`, then run on a device or StoreKit-enabled simulator.

The default app URL is configured in `CapitolLedgerNative/Info.plist` as `CapitolLedgerAppURL`.

## Server Account Sync

Account-wide paid subscription sync requires these deployment variables:

- `APP_STORE_BUNDLE_ID`
- `APP_STORE_ACCOUNT_TOKEN_NAMESPACE`
- `APP_STORE_CONNECT_ISSUER_ID`
- `APP_STORE_CONNECT_KEY_ID`
- `APP_STORE_CONNECT_PRIVATE_KEY`

Local Xcode StoreKit transactions can unlock the device preview, but Apple does not server-validate the local `Xcode` environment. Use App Store sandbox or TestFlight for the account-sync QA pass.

## Next Step

Create the App Store Connect subscription products and API key, add the server variables in the host, then run purchase, restore, renewal, cancellation, and expiration QA in sandbox/TestFlight.
