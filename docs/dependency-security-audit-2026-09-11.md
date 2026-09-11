# CapitolWonk Dependency Security Note — September 11, 2026

Status: **current working-tree evidence, not release approval.** The dependency bundle is uncommitted and unfrozen. The September 11 audit result replaces the earlier preliminary result for this live working tree, but it has no frozen candidate SHA, exact-head CI result, matching Preview, deployment, provider-console proof, Apple sandbox proof, or signed-device evidence.

## Current result

The pnpm 9 dependency configuration and lockfile now force the copy of PostCSS used by `next@15.5.25` from `8.4.31` to `8.5.25`. Against that September 11 working graph:

| Audit | September 11 result |
| --- | --- |
| Production graph: `pnpm run audit:prod` | **No known vulnerabilities reported** |
| Full graph: `pnpm run audit:full` | **No known vulnerabilities reported** |

These are npm advisory-database results for the live working tree on September 11, 2026. They clear the earlier preliminary two-high/two-moderate PostCSS result for this graph; they do not prove that an uncommitted graph is reproducible or otherwise release-ready. Freeze the bundle and repeat both audits with the frozen install before candidate approval.

## PostCSS remediation boundary

- `next@15.5.25` previously resolved its exact nested `postcss@8.4.31`, which produced the two high and two moderate findings recorded in the [September 10 audit](dependency-security-audit-2026-09-10.md).
- The pnpm 9 override and lockfile now resolve that Next path to `postcss@8.5.25`.
- The September 10 `f4f04de` residual-risk acceptance remains historical and candidate-specific. It is no longer the current working-tree result and does not approve the new override, lockfile, or bundle.
- A frozen install, strict source checks, build/regression checks, exact-head CI, and matching Preview remain required to prove the override is reproducible and compatible on one exact candidate.

## `jsrsasign@11.1.5` maintenance risk

`@apple/app-store-server-library@3.1.0`, Apple's official server library used by the new App Store verification path, brings `jsrsasign@11.1.5` into the production graph. The Apple library uses it for X.509 certificate and OCSP processing (the X509/OCSP path). The package is deprecated/unmaintained. The September 11 production and full audits report no current advisory for this version, but “no known advisory” is not the same as maintained or low risk—especially on a certificate-validation path.

Launch treatment remains open:

1. Track the Apple library and `jsrsasign` upstreams for a maintained replacement or upgraded transitive version.
2. Upgrade promptly when the official Apple library provides a supported path, then repeat both audits and the App Store signature/certificate/OCSP regression matrix.
3. If no maintained upstream path exists by the release decision, document the exact version, reachability, mitigations, monitoring owner, and replacement trigger for Tyler's explicit risk acceptance before launch. A clean advisory audit does not substitute for that decision.

No upstream-monitoring process, replacement, or owner risk acceptance is evidenced by this note. Real App Store Server API, Notifications V2, sandbox, and signed-device verification also remain open.

## Enforced audit controls

- CI now runs `pnpm run audit:prod` and `pnpm run audit:full` as separate dependency-audit steps before the release source safeguards and build.
- `pnpm run release-candidate:check` now runs both audits before the protected App Store/TestFlight source checks.
- The scripts use the high-severity release threshold, while the recorded September 11 result is stronger: the audit output reported no known vulnerabilities at any severity.

These controls ensure future CI and strict-candidate runs re-query the advisory service. They are configuration evidence only until a frozen candidate completes them successfully.

## Remaining release gates

- commit and freeze the exact manifest/lock/source bundle;
- complete a frozen pnpm 9 install and repeat production/full audits;
- pass strict TypeScript, lint, readiness fixtures, production build, exact-head CI, matching Preview, and smoke;
- obtain owner acceptance of the `jsrsasign@11.1.5` maintenance risk or move to a maintained upstream path; and
- complete the provider, App Store sandbox, Notifications V2, Team, and signed-device evidence in the [App Store sandbox QA matrix](app-store-sandbox-qa-matrix-2026-09-11.md).

No package, lockfile, production, provider, App Store Connect, signing, device, upload, distribution, or release action is authorized by this note.
