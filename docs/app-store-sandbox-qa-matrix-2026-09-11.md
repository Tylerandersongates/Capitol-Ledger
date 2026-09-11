# CapitolWonk App Store Sandbox QA Matrix

Prepared September 11, 2026. This is an execution plan, not sandbox, TestFlight, production, App Store Connect, or device evidence.

## Hard gates

Do not begin signed-device execution until all of these are true:

- Apple Support has resolved T04 and Tyler has approved the exact signing action.
- The tested build is tied to one frozen commit and matching CI/Preview evidence.
- The four pending production migrations are reconciled in their exact order; any deployment or migration has separate action-time approval.
- The protected App Store Server API configuration, numeric Apple app ID, bundle ID, token namespace, sandbox products, and tester accounts are available through approved channels.
- A redacted App Store Connect product-configuration screenshot for `com.capitolwonk.pro.monthly` shows the configured 7-day introductory offer, standard `$4.99/month` renewal price, territory/currency, and current configuration status. This proves product configuration only; it does not prove that a particular subscriber is eligible.
- Two separate sandbox tester aliases are assigned: one fresh tester with no known history in the subscription group and one previously subscribed tester expected to be ineligible. These assignments establish the test setup only; Apple's purchase sheet remains the authoritative eligibility result. Do not infer eligibility from CapitolWonk account state.
- A physical iPhone is connected, Developer Mode is confirmed, and the device/account assignments below are recorded without placing credentials in repository files.
- The App Store Server Notifications V2 production URL remains inactive until the sandbox endpoint, receipt, replay, and rollback cases pass.

For every case, record the candidate commit, build number, device/iOS version, sandbox account alias, product ID, UTC start/end time, observed web/native state, provider status, notification UUID (if applicable), HTTP outcome, and redacted evidence location. Never record passwords, private keys, signed JWS bodies, raw provider response bodies, or URL query values.

## Automated preflight

Run these on the exact candidate before using a device:

```text
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit --pretty false --noUnusedLocals --noUnusedParameters
pnpm run release-source:check
pnpm run testflight-ui:check
pnpm run release-candidate:check
pnpm lint
pnpm build
```

Expected result: all checks pass. `release-source:check` is the secret-free CI/source gate. `release-candidate:check` is the strict, protected-environment gate and must fail when the database, HTTPS app URL, or Apple server/TestFlight configuration is absent; never expose those values in logs or evidence. An error is blocking.

## Introductory-offer configuration and eligibility

The App Store purchase sheet is authoritative for offer eligibility and exact terms. CapitolWonk may describe the configured offer conditionally, but must not label the action as starting a free trial before Apple confirms that the subscriber is eligible. Attach the App Store Connect product-configuration screenshot and the redacted purchase-sheet evidence for both tester classes to this matrix before this gate can pass.

| ID | Scenario | Expected result |
|---|---|---|
| I01 | App Store Connect product-configuration screenshot | A redacted screenshot identifies `com.capitolwonk.pro.monthly` and shows a 7-day free introductory offer followed by the standard `$4.99/month` renewal price, with territory/currency and current configuration status visible. The evidence record explicitly says configuration is not subscriber eligibility. |
| I02 | Eligible new subscriber | Before confirmation, Apple's sheet shows exactly 7 days free, then `$4.99/month`, with renewal cadence and cancellation terms. The app uses conditional “eligible” wording and does not independently assert eligibility. Record the tester's eligibility evidence without credentials. |
| I03 | Ineligible or previously subscribed | The app makes no free-trial promise. Apple's sheet omits the introductory offer and shows the standard `$4.99/month` terms before confirmation; accepting the standard purchase still produces one valid Pro lineage and entitlement. |
| I04 | Cancel during introductory offer | Cancel auto-renew in App Store subscription settings before conversion. CapitolWonk continues access only through the expiry Apple currently reports, does not claim that cancellation was performed in-app, and removes access after server reconciliation reports no granting status. |
| I05 | Conversion to standard monthly renewal | Allow the eligible sandbox offer to convert. The newest verified renewal extends the same lineage, the standard `$4.99/month` terms were shown before the original confirmation, the relevant notification receipt becomes terminal, and canonical/server-projected Pro access uses the new expiry. |
| I06 | Offer expires without conversion | Let a canceled or otherwise non-converting offer reach its Apple-reported expiry. Current server status removes Pro across device, web, relaunch, and restore; neither the original offer transaction nor cached device state preserves access. |
| I07 | Notifications V2 during offer lifecycle | Exercise the applicable subscribe, renewal/conversion, cancellation-state, and expiry deliveries available in sandbox. Each signed delivery is recorded only as the bounded hash-only receipt, remains idempotent under replay, and triggers current-state reconciliation rather than treating notification order as entitlement authority. |
| I08 | Introductory-offer canonical server state | After I02–I07, capture redacted evidence of the canonical server state and provider-neutral projection: one account/token/lineage owner, correct product and expiry/status, no duplicate state, and agreement across signed-in web/device surfaces. Do not capture raw JWS, tokens, transaction identifiers, or provider bodies. |

## Purchase and identity

| ID | Scenario | Expected result |
|---|---|---|
| P01 | New Pro monthly purchase after I02 or I03 | Apple sheet shows the exact product and the terms appropriate to Apple's eligibility result; one verified App Store lineage is bound to the signed-in account; Pro becomes active on web and device. |
| P02 | New Pro annual purchase | Annual cycle and product ID persist; relaunch and a second signed-in surface retain the same entitlement. |
| P03 | Team monthly, 3 seats | The base Team monthly product maps to exactly 3 seats; workspace access agrees with the stored projection. |
| P04 | Team monthly, 20 seats | The maximum monthly product maps to exactly 20 seats; no truncation or 21-seat purchase path appears. |
| P05 | Team annual, 16 seats | The maximum sale-enabled annual product maps to exactly 16 seats. |
| P06 | Reserved annual 17–20 product IDs | These unavailable App Store records are absent from purchase controls and rejected by the server allowlist if submitted. |
| P07 | Same Apple lineage restored to the same CapitolWonk account | Restore is idempotent; no duplicate account, state row, or subscription lineage is created. |
| P08 | Same Apple lineage presented by a different CapitolWonk account | The request fails closed as an ownership conflict and grants no paid access to the second account. |
| P09 | App account token mismatch | The transaction is rejected; neither canonical state nor the provider-neutral projection changes. |
| P10 | Unsupported product or non-auto-renewable transaction | The request is rejected, no paid access is granted, and the existing subscription projection is not mutated. |

## Lifecycle and current-state reconciliation

| ID | Scenario | Expected result |
|---|---|---|
| L01 | Restore when StoreKit supplies signed transaction JWS | The signature is verified, then current Apple server status—not the local payload alone—determines access. |
| L02 | Restore/entitlement sync when StoreKit supplies no JWS | The persisted account-token/lineage binding drives server reconciliation; the flow does not require a new purchase. |
| L03 | Successful renewal | The newest transaction in the same lineage is selected and its expiry replaces the older projection. |
| L04 | Billing retry without grace, Apple status 3 | Paid access is removed according to the current fail-closed policy; a stale local expiry cannot preserve it. |
| L05 | Billing grace period, Apple status 4 | Paid access remains and the app status is `past_due`, including when the transaction expiry has passed. |
| L06 | Grace period expires / Apple status 2 | Paid access is removed and stale `past_due` state is not retained. |
| L07 | Refund or revoke / Apple status 5 or revocation date | Paid access is removed across relaunch and account sync. |
| L08 | Refund reversed | Access returns only after current Apple status again grants it; the earlier notification is not trusted as the final state. |
| L09 | Upgrade or plan change | An `isUpgraded` transaction cannot restore stale access; the newest current non-upgraded transaction wins. |
| L10 | Multiple simultaneously granting lineages | Reconciliation fails closed as a conflict instead of choosing one arbitrarily. |
| L11 | Ask to Buy returns pending | No paid access is granted, the purchase control leaves its busy state, and the pending product remains eligible for a later matching update. |
| L12 | Pending purchase is approved while the app is foregrounded | The verified `Transaction.updates` JWS is published through authenticated server reconciliation; only the server result updates effective access, and StoreKit is finished only after the trusted WebView accepts publication. |
| L13 | Pending purchase is approved while backgrounded or between launches | An update that cannot reach the trusted WebView remains unfinished and queued; foreground activation or relaunch publishes it through server reconciliation before finishing it. |
| L14 | Pending purchase is declined | No transaction or paid access appears, the control remains usable for a later retry, and foreground/relaunch synchronization does not invent an entitlement. |
| L15 | Pending purchase is approved while offline | The transaction remains in StoreKit's unfinished queue, no device-only access is granted, bounded retries stop safely, and reconnect publishes the exact JWS before finish. |
| L16 | Pending purchase is approved while signed out | The unauthenticated server request grants nothing and leaves the transaction unfinished; a fresh sign-in triggers reconciliation for the signed-in account before finish. |
| L17 | Pending purchase is delivered while a different CapitolWonk account is signed in | Account-token and lineage checks reject the delivery, the other account receives no access, and the transaction remains unfinished for a safe restore/account-resolution path. |
| L18 | Apple status initially returns the old Pro transaction for an approved Team update | The old canonical product does not acknowledge the new transaction. StoreKit keeps it unfinished until the exact Team transaction, or a provably later same-lineage transaction, is durably persisted. |

## Notifications V2, replay, and ordering

| ID | Scenario | Expected result |
|---|---|---|
| N01 | Apple `TEST` notification | Valid signed metadata is acknowledged; a hash-only receipt becomes terminal `ignored`; no entitlement changes. |
| N02 | Exact duplicate notification UUID and payload | The second delivery is acknowledged as a duplicate and does not reapply state. |
| N02a | Two overlapping deliveries of the same UUID, including reclaim after expiry | Exactly one request owns the current processing lease and fencing token. The overlap receives a retryable response, and a reclaimed worker's old token cannot persist or finalize. Apple network work times out before the lease can expire. |
| N03 | Same notification UUID with different payload hash | The request fails as a receipt conflict; the original receipt is preserved. |
| N04 | Earlier-started renewal/refund reconciliation returns after a later-started request | A database-issued sequence is reserved before each Apple request; the lower sequence is rejected under the state-row lock, so neither canonical state nor the entitlement projection regresses. |
| N05 | Unlinked transaction lineage | Delivery is acknowledged and marked `unlinked`; no account receives access. |
| N06 | Conflicting token and lineage mappings | Delivery is acknowledged and marked `conflict`; no account projection changes. |
| N07 | Retryable Apple verification/API failure | The endpoint returns 503 with bounded retry guidance and leaves a retryable receipt state. |
| N08 | Invalid signature or unsupported metadata | The endpoint returns 400/401 as appropriate and grants no access. |
| N09 | Missing, malformed, or over-128-KiB request | The endpoint returns 400 or 413 before persistence or reconciliation. |
| N10 | Terminal receipt redelivery | `processed`, `unlinked`, `conflict`, and `ignored` receipts remain terminal; redelivery cannot mutate them. |

## Team transitions

| ID | Scenario | Expected result |
|---|---|---|
| T01 | Active Apple Pro user accepts an invited Team seat | Acceptance is blocked until the user acknowledges that Team access does not pause or cancel Apple billing and is given the Apple management link. |
| T01a | Apple Pro is in billing retry with paid access currently removed | The Apple billing acknowledgement is still required because Apple may retry collection even though the app projection is Free. |
| T02 | Apple Pro user remains on Team | Team membership supplies effective access while canonical personal Apple state continues to reconcile without overwriting the Team-seat projection. |
| T03 | Team seat released while Apple Pro is current | Apple is revalidated at release time; only a currently granting Pro lineage is restored. |
| T04 | Team seat released after Apple Pro expired/refunded | The stale snapshot is never restored; the user falls back to Free and is prompted to purchase if appropriate. |
| T05 | Team seat released while Apple reconciliation is unavailable | Restoration fails closed and remains recoverable; no stale paid access is granted. |
| T06 | Owner changes Team seat tier | The exact new StoreKit product and seat count win; an upgraded-away transaction cannot overwrite the new tier. |
| T07 | Personal Apple subscription is revoked while a Team seat supplies effective access | Team access remains governed by membership, the personal revocation timestamp is durably persisted, and releasing the Team seat cannot restore the revoked personal subscription. |

## Account deletion and privacy

| ID | Scenario | Expected result |
|---|---|---|
| D01 | Default-off deletion gate | Settings and the API do not expose/execute deletion until the separately approved activation setting is enabled. |
| D02 | Active Apple subscriber requests deletion after activation | The flow clearly says deletion does not cancel Apple billing and provides the Apple management link before confirmation. |
| D03 | Confirmed deletion | Account-linked state is erased atomically, App Store canonical state cascades, retained notification receipts are deidentified, and browser/native writers are fenced. |
| D04 | Apple notification after deletion | The deleted account is not recreated; an unlinked/deidentified receipt may be retained according to policy, without raw signed data. |
| D05 | Multi-tab and native callback race during deletion | Late browser storage events and native entitlement callbacks cannot recreate account state or paid access. |
| D06 | Logging/storage inspection | No signed payload, transaction JWS, password, token, URL query/hash, provider body, or private key appears in application logs, errors, database receipts, screenshots, or exported evidence. |
| D07 | Delete, recreate, then automatic entitlement sync | A transaction carrying the deleted account's token remains unlinked; the device snapshot does not unlock paid features or overwrite the recreated account's server state. |
| D08 | Delete, recreate, then explicitly choose Restore Purchases | A current, directly purchased status 1, 3, or 4 lineage is reserved to one account, reassigned through Apple's Set App Account Token API, reverified with the new token, and only then projected. Expired, revoked, family-shared, conflicting, concurrent, or propagation-pending cases grant nothing. |

## Exit criteria

T07 can advance only when every applicable row above—including I01–I08—has a named owner and a passing artifact against the same signed candidate. A product, offer, dependency, migration, signing, environment, or archive change invalidates the affected evidence. Failures become tracked release blockers with reproduction steps; they are not converted into accepted risk silently.

Final App Store screenshots remain deferred until the exact candidate passes purchase, copy, and physical-device QA. Production notification activation, migration, deployment, App Privacy publication, upload, distribution, and submission each remain separate approval gates.
