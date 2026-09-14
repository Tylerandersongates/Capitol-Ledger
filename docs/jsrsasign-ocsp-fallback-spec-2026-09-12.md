# CapitolWonk Source-Free OCSP Validation And Fallback Specification — September 12, 2026

September 14 source-hardening update: the separately authorized local containment implementation is recorded in [`app-store-verifier-hardening-2026-09-14.md`](app-store-verifier-hardening-2026-09-14.md). Its deterministic tests cover gates, route ordering, malformed status responses, and no-queue/timeout containment only. They are not the cryptographically signed OCSP harness specified below and do not close the real-abort, response-size, freshness, provenance, EOL, or activation gates.

Status: **specification approved and complete; a separate containment subset is implemented, while the full signed OCSP implementation remains incomplete and activation remains unapproved.** This document converts the September 12 `jsrsasign` risk decision into a deterministic test contract and an exact fallback comparison. The original September 12 authorization changed no package, lockfile, source, test, deployment, provider setting, Apple configuration, signed build, upload, distribution, submission, or release. The production deployment and activation blocks in the [risk decision packet](jsrsasign-risk-decision-2026-09-12.md) remain in force.

The current local source boundary is candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` on `codex/sept12-privacy-neon-candidate`; the last remote CI/Preview evidence remains historical candidate `3dbba3a260b10924dff254deed7f65a5e392c239` with documentation checkpoint `cd094530efacdbc3507579a0b52414aa7369d826`. The affected graph is unchanged: `capitol-ledger@0.1.0 -> @apple/app-store-server-library@3.1.0 -> jsrsasign@11.1.5`; its exact locked integrities remain recorded in the risk packet. The local candidate's frozen install and registry-backed audits pass with no known advisory, but issue #447 remains an independent blocker. A future verifier implementation must create another candidate and repeat all dependency, source, CI, Preview, and activation-gate evidence.

## Objective And Authorization Boundary

The test harness must answer four questions before an official update, local control, backport, or replacement becomes eligible:

1. Does the verifier correctly validate signed OCSP freshness, identity, authorization, and status through the full notification and transaction entry points?
2. Do malformed, oversized, slow, or concurrent inputs stop within approved resource ceilings and fail without an entitlement write?
3. Is the candidate reproducible from an exact upstream/package/patch provenance record?
4. If the official path is insufficient by September 25, which fallback closes the defect with the smallest justified source and schedule change?

Approval of this specification authorizes documentation only. It does not authorize generating committed fixtures, editing tests, installing packages, applying a patch, changing online-check behavior, deploying a callback, or accepting residual end-of-life risk.

## Deterministic Harness Contract

The implementation must be local and deterministic. It must not call Apple, an OCSP responder, a package registry, or any production/provider endpoint during fixture execution. It must use a test-only certificate hierarchy and keys generated solely for the harness; no Apple, CapitolWonk, customer, production, App Store Connect, or provider key or payload may be copied into fixtures or logs.

Each fixture set must include:

- a test root, intermediate, leaf signing certificate, and the exact trusted-root input supplied to Apple's verifier;
- an OCSP responder certificate with explicit authorization/EKU variants;
- a DER-encoded, cryptographically signed BasicOCSPResponse containing controlled `SingleResponse` records;
- a signed test JWS/notification or signed transaction payload bound to the leaf certificate; and
- a deterministic clock plus a transport stub that can return exact bytes, delays, truncation, connection failures, and abort observations.

The primary assertions must exercise the public `verifyAndDecodeNotification` and signed-transaction verification paths with online checks enabled. Date-helper-only tests are supporting evidence, not acceptance evidence. A failure case passes only when verification fails closed, no entitlement/account/subscription state is written, retryability is classified as specified, and logs contain no raw JWS, certificate, token, email, account, or provider response body.

## Required Signed Fixture Matrix

### Status, signature, and certificate identity

| Case | Required result |
| --- | --- |
| Signed, authorized, matching `good` response inside the accepted time window | Verification may continue to the remaining chain/JWS checks. |
| Signed, authorized, matching `revoked` response | Fail closed; never retry as an integrity-success path; no entitlement write. |
| Signed, authorized, matching `unknown` response | Fail closed; preserve an operator-visible reason; no entitlement write. |
| Invalid OCSP response signature | Fail closed; no entitlement write. |
| Mismatched serial number | Fail closed; no matching `SingleResponse` may be inferred. |
| Mismatched issuer-name hash | Fail closed. |
| Mismatched issuer-key hash | Fail closed. |
| Unauthorized responder | Fail closed. |
| Responder certificate missing/wrong OCSP-signing EKU | Fail closed. |
| Expired or not-yet-valid responder certificate | Fail closed at the deterministic verification time. |
| Response with no `SingleResponse` matching the leaf | Fail closed. |
| Multiple records, only a nonmatching record `good` | Fail closed. |
| Matching `revoked` plus unrelated `good` record | Matching revoked status controls; fail closed. |
| Tampered JWS with otherwise valid OCSP response | Fail closed; no entitlement write. |
| Untrusted/incorrect certificate chain with otherwise valid OCSP response | Fail closed. |

### Time parsing and freshness

Use a frozen verification instant and repeat the valid cases under `TZ=UTC` and at least one non-UTC process time zone. Every accepted GeneralizedTime value must end in `Z`, parse to a valid UTC instant, and round-trip to the intended epoch.

| Case | Required result |
| --- | --- |
| Valid `YYYYMMDDHHMMSSZ` at exactly `now - 60s` | Accept the time boundary, subject to all other checks. |
| Valid value at `now - 61s` when the approved past-skew boundary is 60s | Reject. |
| Valid value at exactly `now + 60s` | Accept the time boundary, subject to all other checks. |
| Valid value at `now + 61s` | Reject. |
| Future `thisUpdate` outside the accepted skew | Reject. |
| Expired `nextUpdate` | Reject. |
| `nextUpdate` earlier than `thisUpdate` | Reject. |
| Missing `thisUpdate` | Reject. |
| Missing `nextUpdate` | Reject by default, or accept only if Tyler separately approves and the implementation enforces a maximum age no greater than 24 hours from `thisUpdate`. |
| Non-`Z`, offset, fractional, truncated, overlong, nonnumeric, or trailing-data time | Reject unless an exact standards-based format is separately justified and approved. |
| Impossible calendar date or leap-second edge not supported by the selected parser | Reject deterministically. |
| Parser produces `Invalid Date`, `NaN`, overflow, or exception | Convert to a controlled fail-closed verification result. |

The `-61/-60/+60/+61` matrix must assert the exact chosen comparison operators so a one-second boundary regression fails the suite. If the official implementation chooses a different documented skew, the candidate record must state it and Tyler must approve the changed policy before implementation acceptance.

## Transport, Parser, And Concurrency Contract

The starting safety ceilings are the numbers proposed in the risk packet:

- retain the 128 KiB Notifications V2 request-body ceiling;
- cap each OCSP response body at 256 KiB before ASN.1 parsing;
- abort the underlying OCSP connection/read at 10 seconds, not merely race and abandon the caller;
- cap full verification at 15 seconds on the Vercel 1-vCPU/2-GB runtime;
- permit at most four active verifier operations per instance, with no in-memory queue; return retryable `503` for excess work; and
- complete or fail each parser-only 128 KiB stress fixture within two seconds while adding no more than 128 MiB RSS.

Required transport/resource cases are: response exactly at and one byte above 256 KiB; declared length smaller/larger than actual; chunked response crossing the cap; slow headers; slow body; stalled socket; DNS/connect/TLS failure; connection reset; truncated DER; indefinite/deep ASN.1 nesting; long-form lengths; duplicate or excessive `SingleResponse` records; four active operations followed by a fifth; and end-to-end timeout during OCSP and after OCSP. The harness must observe the real abort/close signal and prove the request cannot continue consuming a slot after the caller has failed.

An official library may supply different controls—for example, open PR #456 proposed 30 seconds without a response-size cap—but deviation is not automatically acceptable. The candidate must provide measured platform/load evidence, record the exact numbers, and receive explicit approval. Missing limits require a separately authorized local wrapper, fork, or replacement.

## State, Retry, And Logging Assertions

For every negative or resource case, capture and assert:

- zero entitlement, subscription, account-ownership, Team, or notification-receipt success writes;
- no acknowledgement that could suppress a provider retry unless the failure is deliberately classified permanent and safe;
- retryable handling for transport timeout, connection failure, capacity saturation, and other transient availability failures;
- permanent fail-closed handling for invalid signatures, chain/identity mismatch, unauthorized responder, and signed `revoked`/`unknown` status;
- bounded, non-secret diagnostic fields: case identifier, high-level failure class, retryability, duration, response-size bucket, and active-verifier count; and
- absence of raw JWS, DER/certificate bytes, OCSP body, authorization value, app-account token, email, provider identifier, or user content.

Issue #450 must be covered independently: missing or malformed nested subscription-status data never produces an entitlement grant, and response-shape ambiguity must be observable without logging raw provider payloads.

## Candidate Provenance And Reproducibility

Before execution, freeze Node `22.22.3`, pnpm `9.15.9`, the lockfile, package-manager store policy, test clock, fixture seed, and expected fixture hashes. The candidate record must include:

- exact package name/version, registry integrity, tarball hash, upstream repository commit/tag, and proof that the installed tarball contains the accepted fix;
- for a backport, exact base commit, accepted upstream/equivalent fix commit, patch file hash, application command/result, lockfile diff, named independent reviewer, and reviewer conclusion;
- a fresh `pnpm why --prod jsrsasign`, production/full audits, and an explicit count/integrity for every remaining path;
- source/test diff boundaries, fixture hashes, test report, TypeScript/lint/build results, exact-head CI URL/SHA, and matching Preview deployment; and
- proof that online checks remain enabled and the default-off verifier/Notifications activation gate remains off.

Any candidate with dependency/path/integrity drift, an untriaged reachable advisory, an unexplained generated diff, or a fixture that depends on live network state is ineligible.

## Exact Fallback Comparison

| Path | Entry condition | Required local change | Residual risk | Hands-on schedule effect | Decision |
| --- | --- | --- | --- | --- | --- |
| Official package fully satisfies #447 plus accepted abort/size/status controls | Published, supported release; provenance and full matrix pass | Package/lock update and candidate evidence only | Residual EOL acceptance only if `jsrsasign` remains | +1–2 days; about 8–15 total | **Preferred and immediately eligible for a separate implementation proposal.** |
| Official #447 fix but missing one or more local safety controls | Published release; freshness matrix passes; gaps are precisely identified | Package/lock update plus smallest tested local transport/capacity wrapper | Wrapper maintenance and residual EOL if present | +2–4 days; about 9–17 total | **Second choice.** Prefer over a backport when the official correctness fix is complete. |
| Narrow reviewed backport | No sufficient release by September 25; accepted upstream/equivalent fix exists; independent reviewer available | Reproducible patch/fork, local controls, full matrix, new candidate | Fork ownership, upstream drift, residual EOL | +3–5 days; about 10–18 total | **Contingency only; requires exact patch and residual-risk approvals.** |
| Maintained verifier/revocation replacement | Official/backport paths cannot meet correctness, support, or schedule requirements | Architecture change, compatibility/state review, full matrix and runtime revalidation | Highest integration uncertainty but removes EOL dependency when successful | +4–7 days; about 11–20 total | **Long-term strongest path; near-term fallback if supported integration can be proven.** |

`@apple/app-store-server-library@3.1.0` as-is and disabling online checks remain rejected. A helper-only date fix without full signed-path evidence is not a valid backport. A package that fixes #447 but leaves a timeout race consuming sockets/slots or accepts malformed nested status data is not “fully sufficient.”

## Fallback Decision Procedure

1. Monitor Apple releases and #447/#451, #455/#456, and #450 daily through September 25.
2. On any new official release, verify provenance before changing dependencies, then score it against every row above. Do not infer npm contents from a merged PR.
3. If it is fully sufficient, prepare a separate minimal implementation approval with the exact version/integrity and +1–2-day scenario.
4. If it fixes #447 but lacks a limit/control, prepare the smallest local-control proposal and measured acceptance plan; do not silently inherit PR #456's numbers.
5. If no sufficient release exists on September 25, present the exact reviewed-backport candidate and maintained-replacement candidate side by side. Tyler selects one and separately approves implementation; absent that decision, Batch B and activation remain blocked.
6. If no path can freeze and pass by the October 1 stability ceiling, explicitly replan the October 19 submission and October 30 launch rather than reducing the matrix or bypassing the gate.

## Pre-Activation Runtime Evidence

Passing deterministic fixtures makes a candidate eligible for controlled runtime proof; it does not activate production. Notifications V2 proof must use a separately approved callback-only public staging project/deployment on the exact SHA, non-production data only, and the accepted body/OCSP/timeout/concurrency limits. Apple sandbox, Notifications V2 delivery, signed-device verification, Team lifecycle behavior, duplicate/replay behavior, and the default-off rollback must all pass before activation.

The rollback record must name the operator, exact gate, prior fail-closed SHA, subscription-access behavior during a hold, monitoring/acknowledgement SLA, and re-enable prerequisites. There is no approval in this specification to disable protection for the existing whole Preview or to expose the production callback.

## Decision And Owner Record

| Field | Record |
| --- | --- |
| Specification status | Approved for source-free preparation by Tyler on September 12, 2026; preparation complete |
| Current recommended path | Wait for a fully sufficient official package through September 25 |
| Implementation selection | Pending |
| Dependency/source/test implementation | Not approved |
| Residual `jsrsasign` EOL acceptance | Not approved; if needed, expiry must be no later than November 30, 2026 |
| Monitoring/incident owner | Pending named human assignment |
| Fix decision checkpoint | September 25, 2026 |
| Stability ceiling | October 1, 2026 |
| Submission / launch targets | October 19 / October 30; unchanged but at material risk if the fallback is not selected promptly |
