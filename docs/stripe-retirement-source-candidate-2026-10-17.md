# Stripe retirement source candidate — October 17, 2026

Status: proposed source only; not applied, tested, merged or deployed.

CapitolWonk has no customer-facing web purchase channel. Purchases, upgrades, downgrades and cancellation belong to App Store or Google Play Billing on their respective platforms. This patch preserves the existing Apple integration; it does not implement or activate Google Play Billing. Stripe is retired, not a supported legacy channel.

The source proposal removes the Stripe adapter, synchronization, webhook processing and Team/deletion provider operations. Old portal and webhook URLs return inert HTTP 410 responses. Old checkout remains HTTP 410. Unknown persisted providers fail closed; unsupported cleanup jobs fail rather than being silently completed. Current Apple verification, Team locking, transaction boundaries and runtime activation gates remain unchanged.

## Separate holds

No database mutation, schema change, provider cancellation or configuration mutation is included. Before operational use, separately inventory Stripe AccountSubscription rows, TeamSubscriptionPause.previousSubscription snapshots and cleanup kind/payload references. Historical September test-mode counts are not current counts or proof of real paying customers. Any data scrub needs exact predicates/counts, entitlement consequences and recovery safeguards; never manufacture store purchases from Stripe state.

Deployed credentials, webhooks and environment variables require a separate name/scope inventory and exact approval. The existing environment template is intentionally unchanged in this source batch. No secret values belong in evidence.

Preserve Git history, applied migrations, historical handoffs, audits and PDFs. Old Stripe instructions are superseded, not erased as evidence. Do not regenerate PDFs in this batch.

## Security and capacity

The package change is scripts-only: dependency declarations and pnpm-lock.yaml remain unchanged. Both raw audit gates and strict candidate wrapper remain exact. The braces record retains original approval history but is pending for these new source pins; the proposal grants no new approval. Fresh candidate evidence is required later. Mandatory review: 2026-10-23T07:00:00.000Z. Absolute expiry: 2026-10-30T07:00:00.000Z. No renewal, suppression or threshold change.

The local-admission hold, 5 GiB reserve, 4 GiB total cap and all existing timing/process/evidence limits remain unchanged. The separate remote-reporting patch is not included or stacked; it must be reconciled against the final workflow before any later application. No source execution, package install, network audit, CI, cleanup, merge or deployment is authorized.
