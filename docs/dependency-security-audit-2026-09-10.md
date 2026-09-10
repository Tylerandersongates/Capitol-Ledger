# CapitolWonk Dependency Security Audit — September 10, 2026

## Decision

**Audit completed; release gate failed.** The fresh supported production audit reports **15 advisories: 2 critical, 11 high and 2 moderate** across 265 production dependencies. The two critical advisories affect the direct `next@15.5.22` dependency and are patched in `15.5.24`. T03 remains open for an approved remediation and clean re-audit, or a new candidate-specific exception from Tyler. July's accepted three-high/one-moderate residual does not cover these later advisories.

No package, lockfile, configuration, installation, deployment or external service state changed during this audit.

## Scope and toolchain

- Audited checkout: documentation branch HEAD `3315703`; verified production source remains `7ec68bc`.
- Lockfile SHA-256: `89781a0ef6ab26b5b9f14c4a6fae5fb698d574b562977e0b06b2081e4edb9e02`. Its Git blob is unchanged from the July accepted-risk baseline through production and this checkout, so the increased count comes from newly published advisory data rather than dependency drift.
- Runtime: Node `22.22.3` at `/Users/tylergates/Documents/Capitol Ledger/.tools/node-v22.22.3-darwin-arm64/bin/node`.
- Package manager: pnpm `9.15.9` at `/Users/tylergates/.cache/node/corepack/v1/pnpm/9.15.9/bin/pnpm.cjs`, matching `package.json` and CI.
- The first sandboxed registry request failed with `ENOTFOUND registry.npmjs.org`. A network-enabled retry of the same read-only command succeeded. Exit code `1` reflects reported vulnerabilities, not an incomplete request.
- No install, `audit --fix`, update, override, lockfile rewrite or package-age bypass was attempted.

Exact production command:

```bash
"/Users/tylergates/Documents/Capitol Ledger/.tools/node-v22.22.3-darwin-arm64/bin/node" \
  "/Users/tylergates/.cache/node/corepack/v1/pnpm/9.15.9/bin/pnpm.cjs" \
  audit --prod --json
```

A full audit using the same binary pair and `audit --json` was also completed to distinguish production and development-only findings.

## Production findings

| Locked package | Severity/count | Advisory IDs | Patched floor | Dependency path and observed reachability |
| --- | --- | --- | --- | --- |
| `next@15.5.22` | 2 critical | [GHSA-p293-qw3h-jr36](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), [GHSA-2xp9-vwfh-vxw4](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4) | `>=15.5.24` | Direct production dependency. The first issue requires a Windows-hosted server; this audit did not verify the deployed Functions runtime filesystem, so applicability is unverified. The second requires optimizing an AVIF input. No known AVIF asset or upload route was found, and remote images are restricted to `congress.gov`; an allowed upstream could still return AVIF input. These limited observations do not clear a direct critical dependency with an available patch. |
| `sharp@0.34.5` | 2 high | [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj), [GHSA-rgj7-g3m4-5g8c](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c) | Effective floor `>=0.35.4` | Optional runtime dependency used by Next image optimization. No user image upload exists and remote sources are restricted to Congress hosts, reducing exposure; Next Image remains active. Both findings disappear from `audit --prod --no-optional`, but optional dependencies are part of the deployed lock graph and remain in the release assessment. |
| `postcss@8.4.31` | 2 high, 2 moderate | [GHSA-6g55-p6wh-862q](https://github.com/postcss/postcss/security/advisories/GHSA-6g55-p6wh-862q), [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849), [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93), [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) | Effective floor `>=8.5.23` | Nested copy pinned by Next, distinct from the direct development `postcss@8.5.25`. No attacker-controlled CSS or `sourceMappingURL` input path was found; observed use is build-time on trusted repository CSS, not absent. |
| `fast-uri@3.1.4` | 5 high | [GHSA-7p8r-x3mc-p8w7](https://github.com/advisories/GHSA-7p8r-x3mc-p8w7), [GHSA-5jgf-p345-68v8](https://github.com/advisories/GHSA-5jgf-p345-68v8), [GHSA-f65p-4m7j-42xc](https://github.com/fastify/fast-uri/security/advisories/GHSA-f65p-4m7j-42xc), [GHSA-fph4-wmhf-6fwf](https://github.com/advisories/GHSA-fph4-wmhf-6fwf), [GHSA-jqff-g426-hqxp](https://github.com/advisories/GHSA-jqff-g426-hqxp) | Effective floor `>=3.1.6` | Transitive through `@sentry/nextjs` → webpack integration → `webpack` → `schema-utils` → `ajv`. No direct import or untrusted schema URL input was found; observed use is build-time. |
| `brace-expansion@5.0.8` | 1 high | [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | `>=5.0.9` | Transitive through the Sentry bundler plugin → `glob`/`minimatch`. No untrusted glob input was found; observed use is build-time. |
| `nanoid@3.3.16` | 1 high | [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) | `>=3.3.18` | Transitive through PostCSS/build paths. No direct application import was found; observed use is build-time. |

Production total: **2 critical, 11 high, 2 moderate; 15 advisories across 265 dependencies.** Excluding optional dependencies removes only the two `sharp` highs and does not change the two critical Next findings.

## Development-only additions

The full graph reports **18 package-version findings: 2 critical, 14 high and 2 moderate across 619 dependencies**. These represent 17 distinct advisory IDs because `GHSA-rgw5-rvv9-x895` affects two locked `brace-expansion` versions. In addition to the production set, the full graph adds:

| Locked package | Severity/count | Advisory IDs | Patched floor | Path |
| --- | --- | --- | --- | --- |
| `brace-expansion@1.1.17` | 1 high | [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | `>=1.1.18` | ESLint development graph. |
| `js-yaml@4.3.0` | 2 high | [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj), [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) | Effective floor `>=4.3.2` | ESLint development graph; only trusted repository configuration was observed. |

## Reachability and acceptance

- GitHub published both direct Next critical advisories on August 25, 2026, after the July risk acceptance. Both list `15.5.24` as the patched 15.x release.
- Vercel documents Amazon Linux 2023 for its **build image**, but that does not by itself establish the deployed Functions runtime filesystem. No runtime-OS verification was performed, so the Windows advisory's current applicability remains unverified.
- The AVIF advisory concerns decoding an AVIF **input** during optimization. Next's default WebP output and CapitolWonk's lack of an `images.formats` override do not mitigate that input path. No known AVIF asset or upload route was found and the remote-image allowlist is limited to Congress hosts, but an allowed upstream could still return AVIF content.
- Lower observed reachability for the transitive findings is useful for prioritization, but the release target is zero unaccepted high/critical findings. The fresh result therefore blocks T03 closure and the release evidence gate.
- Tyler's July exception remains recorded for the then-known three-high/one-moderate PostCSS/sharp subset. It is insufficient for September's expanded audit result and does not accept either critical or any other newly reported finding.

## Recommended remediation plan — not yet authorized

1. Obtain Tyler's approval for the exact dependency change. The narrowest maintained 15.5.x candidate checked on September 10 is `next@15.5.25`; align `next`, `eslint-config-next` and `@next/swc-wasm-nodejs`. `15.5.24` is the minimum critical-fix floor, while `15.5.25` is its AVIF follow-up release.
2. Identify the owner, age window and enforcement point of the historical external minimum-package-age guard before relying on it. No corresponding setting is tracked in this repository, so documentation must not describe it as a verified repository policy.
3. Refresh the lockfile only with Node 22 and pnpm 9.15.9, then verify the resolved graph against every production floor: `sharp>=0.35.4`, `fast-uri>=3.1.6`, `brace-expansion@5>=5.0.9` and `nanoid>=3.3.18`. An ordinary Next bump or lock refresh does not guarantee those resolutions; Next `15.5.25` still permits the locked `sharp@0.34.5` and pins its nested `postcss@8.4.31`. Expect PostCSS to remain pending a later upstream fix or a new explicit exception after re-evaluation. Do not add unsafe overrides merely to suppress audit output.
4. If Sentry-chain findings remain, evaluate a separate narrow `@sentry/nextjs` maintenance update rather than bundling an unbounded upgrade into the critical fix.
5. Run a frozen install, TypeScript, lint, build, the complete regression suite, production and full audits, branch CI and a Vercel preview. Recalculate reachability for every residual finding.
6. Close T03 only when the fresh production audit has zero high/critical findings, or Tyler explicitly accepts the exact remaining candidate-specific risk. Any exception must remain visible in the upload decision packet.

## Control observations

- CI pins pnpm `9.15.9` and Node major `22`, but does not run a dependency audit. A green CI run does not establish security-audit status.
- `package.json` has no Node `engines` field, `.nvmrc` or `.node-version`; the exact local Node patch therefore comes from historical tooling evidence, not repository enforcement.
- `pnpm-workspace.yaml` uses `allowBuilds`, while the cached pnpm 9.15.9 help/config surface exposes `onlyBuiltDependencies`. Enforcement of the intended build-script allowlist under the declared pnpm version is unproven and should be reviewed separately from the vulnerability patch.

## T03 disposition

- Audit evidence: **complete**.
- Release gate: **failed**.
- Dependency remediation: **pending Tyler approval**.
- New risk exception: **not granted**.
- Package/config/deployment mutation during audit: **none**.
