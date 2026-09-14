# App Store Verifier Source Hardening — September 14, 2026

Status: **local source containment implemented; activation remains blocked.** This work is isolated on `codex/apple-verifier-hardening` from pre-change SHA `b3a799f2d485e8617fac00c0f6e0b72a4a3fda4c`. It changes application source, deterministic source fixtures, readiness checks, and documentation only. It does not change `package.json` dependencies, `pnpm-lock.yaml`, Apple configuration, protected environment, database/schema/migrations, provider state, deployment, signing, upload, distribution, submission, or production.

The first complete fail-closed hardening checkpoint is `HARDENING_SOURCE_SHA_PENDING`. Record that exact commit after the local source/test checkpoint is created; the pre-change SHA above is provenance, not an eligible fail-closed rollback target.

## Implemented Controls

- `APP_STORE_SERVER_VERIFICATION_ENABLED` must equal the exact lowercase string `true` before any App Store signed-data verification, Server API relink, or reconciliation operation can start. Missing, `false`, `TRUE`, `1`, and every other value keep the path disabled.
- `APP_STORE_SERVER_NOTIFICATIONS_ENABLED` is a separate callback kill switch. Notifications V2 requires both it and the primary verification switch to equal `true`.
- The Notifications V2 route checks both switches before request-body reading, hashing, verification, receipt persistence, or other database work. The account-sync route checks the primary switch before rate limiting, authentication, body reading, verification, or database work. The purchase account-token route checks it before authentication or ownership persistence, preventing a new native purchase flow from obtaining the required server-bound token during a hold. Disabled paths return non-cacheable retryable `503` responses with stable machine codes.
- Every application call to Apple's `verifyAndDecode*` methods runs inside one process-local admission boundary: at most four active operations, no queue, and a 15-second caller deadline. A timed-out Apple 3.1.0 operation retains its slot until its real promise settles, preventing timed-out work from creating unbounded hidden concurrency.
- App Store Server API status reconciliation rejects missing `data`, missing `lastTransactions`, malformed/unknown status values, missing transaction lineage/JWS fields, malformed renewal JWS fields, and mismatches between response metadata and verified transaction/renewal fields. These cases do not select another candidate or write an entitlement.
- Team-seat restoration now propagates App Store configuration and verification failures instead of converting them into a free/canceled entitlement write. The existing 128 KiB Notifications V2 body limit and online certificate checks remain enabled.

The deterministic source fixture verifies exact gate semantics, four-active/fifth-rejected no-queue behavior, caller-timeout slot retention, malformed nested status rejection, online-check wiring, route ordering, and no-downgrade error propagation. It does not represent those assertions as signed OCSP correctness evidence.

## Acceptance Gaps That Remain Blocking

This containment does **not** make `@apple/app-store-server-library@3.1.0` eligible for activation:

- Apple issue #447's OCSP GeneralizedTime freshness defect remains present in the installed package.
- The required cryptographically signed `good`/`revoked`/`unknown`, signature, CertID, responder-authorization, freshness, and full notification/transaction fixture matrix has not been implemented against a corrected verifier.
- Apple 3.1.0 does not expose the transport needed for an application wrapper to cap each OCSP response at 256 KiB or prove a real 10-second socket/read abort. The 15-second boundary is a caller deadline and concurrency containment control, not closure of issue #455.
- Parser stress/RSS evidence, fixed-package provenance, a remaining-`jsrsasign` EOL decision, independent review, exact-head CI/Preview, callback-only staging, Apple sandbox/device lifecycle evidence, and a named monitoring/incident owner remain open.

The activation switches must therefore remain false in every environment. `BILLING_REQUIRE_APP_STORE=true` and `TESTFLIGHT_REQUIRE_READY=true` now treat both switches as blockers; this is intentional until a corrected candidate and the full acceptance matrix are separately approved.

## Fail-Closed Hold And Rollback

Authorized operator: Tyler, or a specifically delegated production operator acting under Tyler's action-time approval. No activation, provider edit, deployment, or rollback action is approved by this source change.

Immediate hold procedure:

1. Set `APP_STORE_SERVER_NOTIFICATIONS_ENABLED=false` to stop callback processing, or set `APP_STORE_SERVER_VERIFICATION_ENABLED=false` to stop all verifier, relink, reconciliation, and callback entry points.
2. Redeploy/restart only through the separately approved provider procedure, then verify the stable `503` code without sending a real Apple/customer payload.
3. Keep both switches false while integrity, transport, saturation, provenance, or dependency risk is unresolved.

Behavior during a hold: no new Apple entitlement, ownership, receipt-success, relink, or reconciliation write occurs through these entry points. Already persisted account entitlements remain unchanged; unfinished StoreKit transactions are not acknowledged by the disabled account-sync route; Apple notifications receive a retryable response rather than a success acknowledgement. A separate business decision is required if a prolonged hold needs an access policy change.

Source rollback procedure: deploy the exact fail-closed checkpoint recorded above with both switches absent or false. Do not roll back to `b3a799f2d485e8617fac00c0f6e0b72a4a3fda4c`, because that source predates the runtime gates. Re-enable only after the risk packet's complete signed OCSP/resource matrix, dependency/provenance checks, independent review, runtime evidence, monitoring owner/SLA, and a separate action-time activation approval pass.

Monitoring acknowledgement and response SLA remains pending a named human owner. Until one is recorded, activation is blocked even if the technical gaps are later closed.

## Local Verification Record

The final working tree passed locally with Node `22.23.2` and pnpm `9.15.9`:

- `pnpm app-store-verifier:check`
- `pnpm billing:check`
- `pnpm release-source:check`
- `tsc --noEmit --noUnusedLocals --noUnusedParameters`
- `pnpm lint`
- `pnpm build`

The package dependency declarations, `pnpm-lock.yaml`, Prisma schema, and migrations have no changes in this hardening diff. The full signed OCSP/resource matrix and the frozen Node `22.22.3` reproduction required by the September 12 specification remain separate open evidence; the local results above do not substitute for either.
