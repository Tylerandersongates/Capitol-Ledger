# CapitolWonk Dependency Security Note — September 11, 2026

Status: **exact local committed-candidate evidence, not release approval.** Source candidate `92b61b970423ce33dc32f6a2f0a9b72a6d3e2e86` is frozen locally on `codex/sept12-privacy-neon-candidate` and preserves the locked dependency graph from historical remote candidate `3dbba3a260b10924dff254deed7f65a5e392c239`. On September 12, Node 22 with pnpm 9.15.9 completed an offline frozen install, production and full registry-backed audits with no known vulnerabilities, the complete local-preparation release-source suite, Prisma validation/generation, strict TypeScript, ESLint, and an optimized production build with all 55 pages generated. The strict candidate wrapper correctly remains blocked on protected database/App Store values absent from the workspace. No new push, remote CI, or Preview exists; [CI run `34668039916`](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34668039916), matching Vercel Preview `6K9Xd24c4Pg4Nz1pRLorNzo6MxGb`, and recorded smoke remain historical for `3dbba3a`. Read-only provider settings were captured September 12, while provider runtime, Apple sandbox, signed-device, and activation evidence remain open. `jsrsasign` is a known OCSP-freshness risk, not merely a maintenance decision; see the [September 12 decision packet](jsrsasign-risk-decision-2026-09-12.md).

## Current result

The pnpm 9 dependency configuration and lockfile now force the copy of PostCSS used by `next@15.5.25` from `8.4.31` to `8.5.25`. Against that September 11 working graph:

| Audit | September 11 result |
| --- | --- |
| Production graph: `pnpm run audit:prod` | **No known vulnerabilities reported** |
| Full graph: `pnpm run audit:full` | **No known vulnerabilities reported** |

These are npm advisory-database results for the isolated frozen install of parent `bbe63e4` on September 11, 2026. Candidate `3dbba3a` changes only dead TypeScript helpers/imports and no dependency file; its passing exact-head CI reruns both audits on a frozen install. The results clear the earlier preliminary two-high/two-moderate PostCSS result for this graph, but do not replace the provider, sandbox, device, or owner-decision gates.

## PostCSS remediation boundary

- `next@15.5.25` previously resolved its exact nested `postcss@8.4.31`, which produced the two high and two moderate findings recorded in the [September 10 audit](dependency-security-audit-2026-09-10.md).
- The pnpm 9 override and lockfile now resolve that Next path to `postcss@8.5.25`.
- The September 10 `f4f04de` residual-risk acceptance remains historical and candidate-specific. It is no longer the current working-tree result and does not approve the new override, lockfile, or bundle.
- The frozen install, strict source checks, TypeScript, ESLint, audits, and matching Ready Preview passed for `bbe63e4`; source-only cleanup `3dbba3a` then passed exact-head CI `34668039916` and matching Preview. The local production build remains host-memory-limited and is reconciled as a constrained-host failure by the successful exact-SHA Vercel build, not recorded as a local build pass.

## `jsrsasign@11.1.5` Maintenance And OCSP Risk

`@apple/app-store-server-library@3.1.0`, Apple's official server library used by the new App Store verification path, declares `jsrsasign: ^11.0.0`; CapitolWonk's frozen lock resolves exactly `jsrsasign@11.1.5` through that sole production path. There is no direct application import. The Apple library uses it for X.509 and OCSP ASN.1 parsing/request construction, while other libraries perform the principal signature checks. The package is deprecated and declared [end of support effective August 14, 2026](https://github.com/kjur/jsrsasign#end-of-support). September 11 production/full audits report no advisory for the exact graph, but “no known advisory” is not evidence of maintenance or correctness.

Apple's open [issue #447](https://github.com/apple/app-store-server-library-node/issues/447), filed September 5, affects this exact enabled online-check path. A GeneralizedTime format mismatch can yield an invalid date and cause stale/future OCSP comparisons not to reject; a replayed, previously signed `good` response can therefore evade freshness enforcement. The issue does not demonstrate bypass of the OCSP signature, responder authorization, certificate chain, or JWS signature, but it is a known defect in an intended revocation control.

Launch treatment is now explicit:

1. Do **not** accept Apple library `3.1.0` plus `jsrsasign@11.1.5` as a maintenance-only exception.
2. Wait for an official Apple fix through the September 25 readiness checkpoint. Open [PR #451](https://github.com/apple/app-store-server-library-node/pull/451) is not a release.
3. If no supported release exists by September 25, present an independently reviewed backport or verifier-replacement decision early enough to freeze and fully revalidate a new candidate by the October 1 stability ceiling.
4. Keep online checks enabled; disabling them is not an acceptable workaround.

The exact options, signed-OCSP regression requirements, adjacent timeout/status-response watch items, monitoring, termination triggers, owner record, and schedule effect are in the [September 12 risk decision packet](jsrsasign-risk-decision-2026-09-12.md). Tyler approved its documentation-only next step, and the resulting [source-free harness and fallback specification](jsrsasign-ocsp-fallback-spec-2026-09-12.md) is prepared. No test, package, lockfile, or source implementation is approved. Real App Store Server API, Notifications V2, sandbox, and signed-device verification also remain open.

## Enforced audit controls

- CI now runs `pnpm run audit:prod` and `pnpm run audit:full` as separate dependency-audit steps before the release source safeguards and build.
- `pnpm run release-candidate:check` now runs both audits before the protected App Store/TestFlight source checks.
- The scripts use the high-severity release threshold, while the recorded September 11 result is stronger: the audit output reported no known vulnerabilities at any severity.

These controls ensure future CI and strict-candidate runs re-query the advisory service. Local candidate `92b61b9` completed both registry-backed audits with no known vulnerabilities; remote CI still must repeat them. Historical candidate `3dbba3a` completed them successfully in CI `34668039916`. Advisory results do not detect or close issue #447.

## Remaining release gates

- preserve [successful exact-head CI run `34668039916`](https://github.com/Tylerandersongates/Capitol-Ledger/actions/runs/34668039916), matching Ready Vercel deployment `6K9Xd24c4Pg4Nz1pRLorNzo6MxGb`, and passing `/dashboard`, `/search?type=bills`, and `/brief` Preview smoke as candidate evidence;
- treat the local 512 MB heap failure as a constrained-host limitation reconciled by the successful exact-SHA Vercel build, not as local build-pass evidence;
- remediate the defect tracked in issue #447 through an official Apple fix or explicitly approved, independently reviewed backport/replacement and complete every condition in the [September 12 risk packet](jsrsasign-risk-decision-2026-09-12.md) and [source-free validation specification](jsrsasign-ocsp-fallback-spec-2026-09-12.md); and
- complete the provider, App Store sandbox, Notifications V2, Team, and signed-device evidence in the [App Store sandbox QA matrix](app-store-sandbox-qa-matrix-2026-09-11.md).

No package, lockfile, production, provider, App Store Connect, signing, device, upload, distribution, or release action is authorized by this note.
