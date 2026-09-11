# CapitolWonk Apple-Only Billing Transition — September 11, 2026

Status: **decision, read-only evidence, and uncommitted non-production source implementation record.** The live working candidate is not frozen. The earlier `f4f04de` dependency audit and `a6cb1da` CI/Preview/smoke are historical and stale for it. The pnpm 9 lock now forces Next's PostCSS to `8.5.25`; September 11 production/full working-tree audits both report **no known vulnerabilities**, and CI plus the strict candidate command now run both audits. A clean frozen-install re-audit remains required. Production transitive `jsrsasign@11.1.5`, used through Apple's official server library `3.1.0` for X.509/OCSP, has no current advisory but is deprecated/unmaintained and requires upstream monitoring/upgrade plus owner risk acceptance before launch. The candidate is not approved. See the [September 11 dependency note](dependency-security-audit-2026-09-11.md). No provider, production-data, deployment, protected-configuration, purchase, subscription, App Store Connect, signing, device, or customer-account state was changed.

## Decision

CapitolWonk will use Apple in-app purchase for all new Pro and Team purchases, upgrades, restores, and subscription management in the iOS app. The legacy Stripe checkout path is not part of the launch architecture and must fail closed before the next production source deployment.

The provider-neutral subscription structures remain necessary. CapitolWonk still needs an account entitlement record, Apple transaction ownership reference, plan, cycle, status, Team seat count, Team transition state, and a retryable cleanup mechanism for surviving Team members. This decision removes Stripe as a new-sale path; it does not remove the generic subscription or Team lifecycle model.

The legacy Stripe adapter remains quarantined temporarily because current aggregate evidence shows unresolved legacy records and provider resources. Quarantine does not authorize new checkout, re-enabling Stripe launch configuration, live charges, provider cleanup, subscription cancellation, customer changes, or database normalization.

## Read-Only Evidence Boundary

The September 11 audit used aggregate-only database queries and read-only Stripe test-mode requests. It did not print or retain account, customer, subscription, transaction, price, email, credential, or secret values. It made no provider or database mutation.

The audit does not establish Stripe live-mode state, current Vercel configuration, route traffic, or the ownership and intended disposition of individual records. Those remain separate read-only gates.

## Aggregate Production Database Findings

| Stored provider / plan / status | Rows |
| --- | ---: |
| App Store / Pro / active | 1 |
| Demo / Free / active | 9 |
| Demo / Team / active | 1 |
| Stripe / Free / canceled | 8 |
| Stripe / Pro / active | 3 |
| Stripe / Team / active | 7 |

Additional findings:

- The database contains 18 Stripe-backed current subscription rows: 10 locally active and 8 locally canceled.
- Every Stripe-backed current row contains structurally valid-looking customer and subscription references.
- There are no duplicate Stripe subscription references within the current subscription table.
- Two additional Team subscription-pause records retain different Stripe-backed Pro snapshots: one pause is active and one is restored.
- The current subscription table and Team pause history therefore contain 20 distinct Stripe subscription references, with no overlap between the two sets.
- A heuristic based only on obvious QA naming patterns classified 15 Stripe-backed current rows as QA-marked and 3 active rows as not obviously QA-marked. Both Team pause records were not obviously QA-marked. This heuristic is not ownership proof and does not authorize any record change.
- The account-deletion cleanup-job table is not yet present in production, consistent with the pending migration plan. There are therefore no deployed cleanup-job rows to classify at this stage.

Local `canceled` does not prove that the corresponding provider subscription has ended. CapitolWonk historically mapped a provider subscription scheduled to stop later into a local Free/canceled state before the provider service period ended.

## Aggregate Stripe Test-Mode Findings

- Direct read-only lookups covered all 20 database and Team-pause references.
- Nine references still resolve to active Stripe test-mode subscriptions; 11 no longer resolve.
- The nine resolving references consist of four Pro and five Team subscriptions, all associated with the configured CapitolWonk price set.
- An account-wide test-mode listing found 10 active CapitolWonk subscriptions: four Pro and six Team.
- One active Team subscription exists in Stripe test mode without a matching current-database or Team-pause reference.
- Three of the 10 active test-mode subscriptions have a future cancellation timestamp; seven have no scheduled cancellation. One of the three is explicitly marked to cancel at period end.
- The latest currently observed scheduled end is in June 2027.
- The available read-only credential is test-mode only. It cannot prove that Stripe live mode contains zero customers, subscriptions, invoices, refunds, disputes, or other obligations.

These are test-mode resources, but they remain real provider records and some are tied to production-database state. They must not be bulk-canceled, deleted, detached, or normalized from aggregate evidence alone.

## Source Implementation Completed

The September 11 source candidate now retires the legacy authenticated checkout endpoint with HTTP 410 and removes every checkout-session creation path. Signed Stripe checkout-completion webhooks are acknowledged without granting or replacing an entitlement. Retained Stripe update/delete handling requires a matching legacy Stripe subscription record and remains only for the unresolved audited state.

The source candidate also adds the provider-authoritative Apple lifecycle foundation:

- official Apple signed-data verification with reviewed Apple trust roots and current subscription-status reconciliation;
- persistent one-account/one-token and one-lineage ownership constraints;
- atomic canonical Apple state plus provider-neutral entitlement projection;
- a bounded, hash-only, idempotent App Store Server Notifications V2 endpoint;
- purchase, restore, and no-JWS device reconciliation against Apple rather than a device-only snapshot; and
- Team-seat release revalidation that cannot reactivate a stale stored Apple entitlement.

This is source preparation only. `20260911110000_app_store_server_state` is now the fourth expected candidate-to-production migration, after the three September 10 deletion/Team migrations. None of the four is authorized or applied by this work. The numeric Apple app ID, App Store Server API credentials, Notifications V2 URL, sandbox verification, frozen-install audits, `jsrsasign` maintenance-risk decision, frozen-candidate CI/Preview/smoke, deployment, and App Store Connect activation remain unapplied or unevidenced and separately gated. Do not configure the notification URL before the exact sandbox candidate passes the [App Store sandbox QA matrix](app-store-sandbox-qa-matrix-2026-09-11.md), including test, renewal, retry/grace, expiry, revocation, refund, restore, duplicate, replay, and out-of-order cases.

## Why The Legacy Adapter Remains Quarantined

The adapter may remain only as a temporary compatibility boundary while all of the following are unresolved:

- 10 locally active Stripe rows, 8 locally canceled Stripe rows, and two Stripe-backed Team pause snapshots require private ownership and disposition review;
- 10 active Stripe test-mode subscriptions exist, including one with no local reference and seven with no scheduled cancellation;
- locally canceled state does not establish provider termination;
- Stripe live mode has not been inspected read-only;
- the current Vercel environment and legacy-route traffic have not been reverified;
- account deletion and Team-owner deletion may still encounter a legacy Stripe reference; and
- a surviving Team member's prior personal entitlement must not be lost or incorrectly restored during retirement.

While quarantined, the adapter must not provide new checkout. Any retained legacy operation must be explicit, narrowly scoped, idempotent, observable without identifiers, and unavailable unless the exact provider credential and action are separately approved.

## Apple Lifecycle Work Required

Stripe removal is not complete merely because StoreKit purchase buttons work. The Apple-only path must provide an authoritative lifecycle for:

- initial purchase and account linkage;
- Pro-to-Team and Team-to-Pro changes;
- monthly/annual and Team seat-level changes;
- renewal and billing-retry state;
- expiration, revocation, refund, and cancellation;
- restore on the same and a different device;
- relaunch and delayed transaction updates;
- duplicate ownership attempts across CapitolWonk accounts; and
- account deletion without falsely claiming that CapitolWonk canceled Apple billing.

The signed App Store server-notification and server-side reconciliation path is implemented in the uncommitted non-production working candidate. It must still be frozen, cleanly re-audited after frozen install, CI/Preview verified, migrated, configured, and exercised through the [sandbox QA matrix](app-store-sandbox-qa-matrix-2026-09-11.md) before activation; the `jsrsasign` maintenance-risk gate must also close. Provider changes must update the persisted entitlement without depending solely on an open device or a user pressing Restore Purchases.

Team lifecycle source handling is prepared, but real Apple sandbox and signed-device proof remains open:

- Joining another owner's Team must not leave a personal Apple Pro subscription silently billing without a clear user choice and truthful explanation.
- CapitolWonk cannot describe an Apple subscription as paused unless Apple actually provides and verifies that state.
- A released Team member must have any personal Apple entitlement revalidated with Apple. The service must never reactivate Pro solely from a stored Team-pause snapshot.
- Team owner plan changes must reconcile Apple's actual subscription-group and product-level outcome before changing Team access or seat capacity.
- If a Team owner deletes their CapitolWonk account, each surviving member must be restored only to a currently valid personal entitlement or moved to an explicit checkout-required state.

## Activation Gates

Apple-only billing must remain unactivated for external purchase testing or release until all applicable gates pass:

1. **Legacy checkout gate:** source and fixtures now fail closed; matching CI, deployment, and route smoke evidence remain pending.
2. **Current-host gate:** Vercel Production and Preview are verified by environment-variable name only to contain no retired Stripe launch configuration; aggregate traffic to legacy checkout, portal, and webhook routes is reviewed without request bodies or identifiers.
3. **Legacy ownership gate:** every current Stripe row, Team pause snapshot, missing provider reference, and provider-only subscription is privately assigned as disposable QA, retained legacy support, or unresolved. Aggregate evidence alone is insufficient.
4. **Stripe live-mode gate:** authenticated read-only inspection proves the exact live-mode customer, subscription, invoice, refund, dispute, webhook, and product boundary. No live-mode state may be inferred from the test-mode credential.
5. **Apple authority gate:** source is implemented; migration, protected configuration, sandbox/server-notification verification, and physical-device evidence remain pending for renewal, expiry, revocation, refund, cancellation, upgrade, downgrade, restore, and duplicate ownership.
6. **Team lifecycle gate:** personal-Pro-to-Team, Team-seat release, owner transition, owner deletion, compensation, and retry behavior are verified without double billing or stale entitlement restoration.
7. **Account-deletion gate:** Apple billing remains user-managed; any necessary legacy cleanup is post-commit, idempotent, monitored, and retains no completed cleanup payload.
8. **Deletion/retention activation gate:** the working source defaults account deletion and the retention sweep off, with legacy feedback behind its own additional switch. These controls are not committed, approved, deployed, configured, or activated and do not replace production/runtime proof.
9. **Migration gate:** the exact four-item candidate-to-production order has a fresh aggregate preflight, reviewed allowlist, backup/restore decision, rollback boundary, postflight, and separate action-time approval.
10. **Release-evidence gate:** clean production/full frozen-candidate dependency audits, closure of the unmaintained `jsrsasign` monitoring/upgrade and owner-decision gate, strict source checks, exact-head CI, matching Preview, production smoke, every applicable [sandbox QA matrix](app-store-sandbox-qa-matrix-2026-09-11.md) case, physical-device testing, and final privacy-copy reconciliation all pass for one exact candidate. Neither the current working-tree audit nor any `f4f04de` or `a6cb1da` result may be promoted to this changed graph.

## Exact Safe Next Approvals

Each item below is independent. Approval of one does not authorize a later item.

### A. Source-only legacy checkout fail-close — implemented locally

Tyler's source-only approval produced a narrowly scoped change that rejects paid legacy checkout requests without writing subscription state, adds regression coverage, and updates readiness checks. It included no deployment, provider access, environment change, or data mutation.

### B. Read-only Vercel verification

Approve an authenticated read-only pass that records only:

- presence or absence of retired Stripe variable names in Production and Preview;
- the current production source identity;
- aggregate status/count evidence for the legacy checkout, portal, and webhook routes; and
- configured log-drain destinations and retention owners.

Do not open or copy values, request bodies, query strings, cookies, tokens, or account-level log details.

### C. Read-only Stripe live-mode and private ownership reconciliation

Approve a live-mode read-only inspection that returns counts and state categories only. Separately, Tyler privately identifies the owner and intended disposition of each non-obvious database record. This approval includes no cancellation, refund, deletion, detachment, metadata edit, or database write.

### D. Apple lifecycle and Team design/non-production implementation — implemented in the working tree, sandbox proof pending

Tyler's source-only approval produced the signed server-notification and reconciliation design, provider-authoritative state transitions, Team invite billing acknowledgement, and fail-closed Team-seat restoration path. The work remains uncommitted and must regain candidate evidence. Sandbox resource verification and every applicable [QA-matrix](app-store-sandbox-qa-matrix-2026-09-11.md) result remain pending. The approval included no App Store Connect publication, production deployment, protected configuration, notification activation, or TestFlight distribution.

### E. Exact test-mode retirement actions

After A–D evidence is reviewed, present a per-category count and an exact action list for the obsolete Stripe test resources. Obtain action-time approval immediately before any provider cancellation, deletion, detachment, metadata change, or webhook change. Never act from this aggregate record alone.

### F. Exact production-data normalization

Only after provider retirement is verified, present a reviewed database migration or account-by-account normalization plan. Obtain separate action-time approval for the exact rows/categories and command. Preserve unresolved records, Team restoration safety, and an auditable aggregate postflight.

### G. Final Stripe adapter removal

Only after live mode is proven clear, test-mode obligations are resolved, database and Team-pause Stripe references are zero or explicitly archived under an approved retention rule, and no cleanup job depends on Stripe, approve removal of Stripe-specific routes, library code, environment templates, tests, runbook steps, and privacy caveats. Re-run the complete release and privacy evidence set afterward.

## Stop Conditions

Stop and return for review if any check exposes an identifier or secret, reaches a live charge or customer mutation, finds an unexplained live-mode obligation, changes the known aggregate counts, cannot prove record ownership, would restore an Apple entitlement without provider validation, would deploy before the checkout fail-close, or requires bulk cleanup without a reviewed allowlist and action-time approval.

This record is not an approval ledger entry and authorizes no action beyond retaining the read-only aggregate findings above.
