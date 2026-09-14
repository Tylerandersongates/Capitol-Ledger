# CapitolWonk Pre-Migration Stripe Compatibility Deployment — September 13, 2026

Status: **prepared and locally verified; no source deployment, traffic change, provider action, or production migration is authorized or complete.** This is the compatible-source-first path for removing the known `7ec68bc` legacy Team-checkout write before the five-migration Batch A decision.

## Frozen Scope

| Item | Value |
| --- | --- |
| Live-source baseline | `7ec68bcf142d6defe865c12959b0f9a84fce72d5` |
| Preparation branch | `codex/pre-migration-stripe-compatibility` |
| Stage A commit | `7e89286c76d06b578ce4e33969c5e39de803694f` |
| Stage A checkout-route SHA-256 | `5c1387e8ea4617087d2ffd768b1abe7bad8792af0d65b72321f21806bb9939b8` |
| Stage B webhook SHA-256 | `7e8b49d9c13274c26e5f93a6e14fd04a7f94fac436e18aa728ee8ea7d4edb51d` |
| Static-check SHA-256 | `34bf33a6c98b51a9c15f7b4c17e3ec20770276ac616c011a6edb9a713573ddc8` |
| Runtime-fixture SHA-256 | `c209588767505ec87856704a65527aefc101da31c02e7b122be441d977ba528e` |

The two source stages contain no Prisma schema or migration change. They do not enable account deletion, privacy intake, Apple billing, a worker, a scheduler, or another feature gate.

## Why Two Stages

A single deployment that both stops checkout creation and ignores every completion could strand a checkout session created just before deployment: payment might complete while the completion is intentionally ignored. The safer sequence separates the two controls.

1. **Stage A — stop creating sessions.** Deploy only `7e89286c76d06b578ce4e33969c5e39de803694f`. `POST /api/account/subscription/checkout` returns HTTP `410` with code `APP_STORE_ONLY_CHECKOUT_RETIRED` and performs no authentication, database, demo-entitlement, or Stripe action.
2. **Drain and reconcile.** Record the Stage A production-ready time. Through authenticated read-only Stripe inspection, check both applicable provider modes for open Checkout Sessions created before that cutoff and for completed/paid sessions not represented by the expected current subscription state. Preserve only aggregate counts and time boundaries. If any session or payment requires customer action, stop; prepare the exact entitlement/refund/cancellation/reconciliation action and obtain its separate provider-action approval. Do not silently ignore it.
3. **Stage B — quarantine completions.** Only after the open and unreconciled counts are zero, deploy the reviewed branch tip that acknowledges signed `checkout.session.completed` events as `received`, `ignored`, and `checkoutRetired` before user lookup or database write. Existing `customer.subscription.updated` and `customer.subscription.deleted` handling remains unchanged.
4. **Verify and hold.** Confirm the exact production source identity, stable 410 response, healthy application reads, aggregate webhook health, and no new checkout creation. Keep Batch A stopped until the separate timeout-propagation proof and fresh production preflight pass.

If authenticated provider inspection cannot prove that the drain is complete, do not deploy Stage B and do not migrate. Use the complete checkout/webhook-quiescence alternative instead.

## Verification Evidence

The combined prepared tree passed all of the following locally without a database URL or provider credential:

- the static compatibility check;
- a runtime fixture proving the checkout route returns the exact HTTP 410 body;
- a correctly signed synthetic Team `checkout.session.completed` fixture whose provider network access is fail-closed and whose response is the expected ignored acknowledgement;
- TypeScript with unused-variable checks;
- Next lint with zero warnings or errors; and
- a complete optimized production build with all static pages generated.

CI must repeat the compatibility check and the ordinary production build on the exact pushed Stage B head. A Vercel Preview is evidence for that source only; it is not production-deployment approval.

## Stop And Rollback Rules

- Stop for a source SHA mismatch, nonzero open/unreconciled checkout count, provider ambiguity, failed check, unexpected route body, production health regression, or any database/provider write not separately approved.
- Before Batch A, Stage A may be rolled back to `7ec68bc` only under separate deployment approval; doing so reopens legacy checkout creation and invalidates the compatibility gate.
- After Stage B, a rollback to `7ec68bc` is not an approved post-migration option because it restores the incompatible sentinel write. If Stage B is unhealthy, stop before Batch A and repair or roll back while the old schema remains.
- After Batch A, production must remain on a source that quarantines checkout completions until the full matching candidate is separately deployed and verified.

## Approval Boundaries

Separate explicit action-time approvals are still required for:

- pushing/opening the compatibility pull request if it has not yet been approved for publication;
- each production source deployment;
- authenticated Stripe inspection when access or sensitive account metadata is required;
- every provider reconciliation, cancellation, refund, or entitlement change;
- creation and cleanup of the disposable Neon timeout-proof descendant;
- the fresh direct-production preflight; and
- Batch A itself.

Nothing here authorizes merging the full privacy/Neon candidate, applying a migration, changing traffic/provider configuration, or enabling any default-off gate.
