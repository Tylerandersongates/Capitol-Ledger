# CapitolWonk Dependency Security Audit — September 10, 2026

## Decision

**The approved narrow remediation is implemented and locally verified; the release gate remains open for one exact residual-risk decision.** The candidate aligns `next`, `eslint-config-next` and `@next/swc-wasm-nodejs` on `15.5.25` and refreshes the lockfile, including every compatible vulnerable transitive. Normal resolution also advances compatible packages inside the affected Next/ESLint/Sharp/Sentry build subtrees; the direct manifest still changes only the three aligned Next pins. The fresh production and full audits both improve to **0 critical, 2 high and 2 moderate** findings. All four remaining findings are in `postcss@8.4.31`, which Next 15.5.25 pins exactly.

The candidate removes both direct Next criticals and every remediable high finding without an override. July's exception does not silently accept the complete September residual: two of the four current PostCSS advisories were not in the July result. T03 therefore remains open until Tyler explicitly accepts this exact four-advisory candidate-specific residual or a supported Next release carries a patched nested PostCSS. No production deployment, protected configuration or external-service state changed during local remediation.

## Scope and toolchain

- Baseline audit checkout: documentation branch source `3315703`; verified production source remains `7ec68bc`.
- Baseline lockfile SHA-256: `89781a0ef6ab26b5b9f14c4a6fae5fb698d574b562977e0b06b2081e4edb9e02`. Its Git blob was unchanged from the July accepted-risk baseline through the first September audit, so the increased baseline count came from newly published advisory data rather than dependency drift.
- Remediated candidate lockfile SHA-256: `92c9932f6145ab3e1e4875de02ecc802112a24e8b3bc98ccffdfc213d7d28de5`.
- Runtime: Node `22.22.3` at `/Users/tylergates/Documents/Capitol Ledger/.tools/node-v22.22.3-darwin-arm64/bin/node`.
- Package manager: pnpm `9.15.9` at `/Users/tylergates/.cache/node/corepack/v1/pnpm/9.15.9/bin/pnpm.cjs`, matching `package.json` and CI.
- The first baseline sandboxed registry request failed with `ENOTFOUND registry.npmjs.org`. A network-enabled retry of the same read-only command succeeded. Exit code `1` reflects reported vulnerabilities, not an incomplete request.
- Tyler approved the narrow remediation. Resolution and verification used the exact Node/pnpm pair above in an isolated candidate directory before the byte-identical manifest and lockfile were applied to this branch. A frozen install completed without bypassing a package-age guard. No `audit --fix`, override, Sentry upgrade or unrelated direct-dependency change was used.

Exact production command:

```bash
"/Users/tylergates/Documents/Capitol Ledger/.tools/node-v22.22.3-darwin-arm64/bin/node" \
  "/Users/tylergates/.cache/node/corepack/v1/pnpm/9.15.9/bin/pnpm.cjs" \
  audit --prod --json
```

A full audit using the same binary pair and `audit --json` was also completed to distinguish production and development-only findings.

## Approved remediation and re-audit

The candidate changes exactly three direct version pins:

- `next`: `15.5.22` → `15.5.25`
- `eslint-config-next`: `15.5.22` → `15.5.25`
- `@next/swc-wasm-nodejs`: `15.5.22` → `15.5.25`

The compatible transitive refresh resolves `sharp@0.35.4`, `fast-uri@3.1.7`, `brace-expansion@5.0.9` and `1.1.18`, `nanoid@3.3.19`, and `js-yaml@4.3.2`. Normal pnpm resolution also advances compatible packages inside the affected dependency subtrees, including the `@typescript-eslint` 8.70.0 family, `schema-utils@4.4.0`, `minimizer-webpack-plugin@5.10.1`, `terser@5.51.2`, `ajv-formats@3.0.1`, `axe-core@4.13.0`, and Sharp platform/libvips packages. The direct dependency manifest contains no other change. `@sentry/nextjs` remains `10.69.0`; updating it was unnecessary for these resolutions and would have expanded the approved direct-dependency scope.

Fresh registry-backed results against the installed candidate graph:

| Graph | Before | Candidate | Change |
| --- | --- | --- | --- |
| Production | 2 critical, 11 high, 2 moderate; 265 dependencies | **0 critical, 2 high, 2 moderate; 269 dependencies** | Both criticals and nine highs removed |
| Full | 2 critical, 14 high, 2 moderate; 619 dependencies | **0 critical, 2 high, 2 moderate; 623 dependencies** | Both criticals and twelve package-version highs removed |

All four candidate findings are the nested Next copy of `postcss@8.4.31`: `GHSA-6g55-p6wh-862q` and `GHSA-r28c-9q8g-f849` (high), plus `GHSA-qx2v-qp2m-jg93` and `GHSA-fxqj-rqcc-2cmp` (moderate). Next 15.5.25 declares that PostCSS version exactly, so a normal compatible refresh cannot move it. The repository's separate direct development PostCSS is already `8.5.25` and does not replace Next's nested copy.

Local candidate verification passed:

- frozen pnpm 9.15.9 install under Node 22.22.3;
- TypeScript, ESLint, brand and feedback readiness checks;
- native SWC build and an explicitly asserted WASM SWC build, each generating all 51 static pages;
- 38/38 application and readiness validations, with only documented demo-safe missing-configuration warnings;
- optimized local-server smoke on 19/19 historical endpoints and 2/2 Next Image optimizer requests;
- signing-disabled Xcode 26.6 Simulator Release compile/link for iOS 16.0, arm64 and x86_64.

The existing `build:wasm` preload can silently fall back to native under this pnpm layout. Candidate verification therefore supplied Next's internal `NEXT_TEST_WASM_DIR` only to the local test process, asserted `binding.isWasm === true`, ran a real TypeScript transform and completed the build. This did not change production configuration. The helper's standalone reliability is a separate tooling follow-up, not evidence against the installed 15.5.25 WASM artifact.

## Baseline production findings

| Locked package | Severity/count | Advisory IDs | Patched floor | Dependency path and observed reachability |
| --- | --- | --- | --- | --- |
| `next@15.5.22` | 2 critical | [GHSA-p293-qw3h-jr36](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), [GHSA-2xp9-vwfh-vxw4](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4) | `>=15.5.24` | Direct production dependency. The first issue requires a Windows-hosted server; this audit did not verify the deployed Functions runtime filesystem, so applicability is unverified. The second requires optimizing an AVIF input. No known AVIF asset or upload route was found, and remote images are restricted to `congress.gov`; an allowed upstream could still return AVIF input. These limited observations do not clear a direct critical dependency with an available patch. |
| `sharp@0.34.5` | 2 high | [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj), [GHSA-rgj7-g3m4-5g8c](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c) | Effective floor `>=0.35.4` | Optional runtime dependency used by Next image optimization. No user image upload exists and remote sources are restricted to Congress hosts, reducing exposure; Next Image remains active. Both findings disappear from `audit --prod --no-optional`, but optional dependencies are part of the deployed lock graph and remain in the release assessment. |
| `postcss@8.4.31` | 2 high, 2 moderate | [GHSA-6g55-p6wh-862q](https://github.com/postcss/postcss/security/advisories/GHSA-6g55-p6wh-862q), [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849), [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93), [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) | Effective floor `>=8.5.23` | Nested copy pinned by Next, distinct from the direct development `postcss@8.5.25`. No attacker-controlled CSS or `sourceMappingURL` input path was found; observed use is build-time on trusted repository CSS, not absent. |
| `fast-uri@3.1.4` | 5 high | [GHSA-7p8r-x3mc-p8w7](https://github.com/advisories/GHSA-7p8r-x3mc-p8w7), [GHSA-5jgf-p345-68v8](https://github.com/advisories/GHSA-5jgf-p345-68v8), [GHSA-f65p-4m7j-42xc](https://github.com/fastify/fast-uri/security/advisories/GHSA-f65p-4m7j-42xc), [GHSA-fph4-wmhf-6fwf](https://github.com/advisories/GHSA-fph4-wmhf-6fwf), [GHSA-jqff-g426-hqxp](https://github.com/advisories/GHSA-jqff-g426-hqxp) | Effective floor `>=3.1.6` | Transitive through `@sentry/nextjs` → webpack integration → `webpack` → `schema-utils` → `ajv`. No direct import or untrusted schema URL input was found; observed use is build-time. |
| `brace-expansion@5.0.8` | 1 high | [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | `>=5.0.9` | Transitive through the Sentry bundler plugin → `glob`/`minimatch`. No untrusted glob input was found; observed use is build-time. |
| `nanoid@3.3.16` | 1 high | [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) | `>=3.3.18` | Transitive through PostCSS/build paths. No direct application import was found; observed use is build-time. |

Production total: **2 critical, 11 high, 2 moderate; 15 advisories across 265 dependencies.** Excluding optional dependencies removes only the two `sharp` highs and does not change the two critical Next findings.

## Baseline development-only additions

The full graph reports **18 package-version findings: 2 critical, 14 high and 2 moderate across 619 dependencies**. These represent 17 distinct advisory IDs because `GHSA-rgw5-rvv9-x895` affects two locked `brace-expansion` versions. In addition to the production set, the full graph adds:

| Locked package | Severity/count | Advisory IDs | Patched floor | Path |
| --- | --- | --- | --- | --- |
| `brace-expansion@1.1.17` | 1 high | [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | `>=1.1.18` | ESLint development graph. |
| `js-yaml@4.3.0` | 2 high | [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj), [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) | Effective floor `>=4.3.2` | ESLint development graph; only trusted repository configuration was observed. |

## Reachability and acceptance

- GitHub published both direct Next critical advisories on August 25, 2026, after the July risk acceptance. Both list `15.5.24` as the patched 15.x release.
- Vercel documents Amazon Linux 2023 for its **build image**, but that does not by itself establish the deployed Functions runtime filesystem. No runtime-OS verification was performed, so the Windows advisory's current applicability remains unverified.
- The AVIF advisory concerns decoding an AVIF **input** during optimization. Next's default WebP output and CapitolWonk's lack of an `images.formats` override do not mitigate that input path. No known AVIF asset or upload route was found and the remote-image allowlist is limited to Congress hosts, but an allowed upstream could still return AVIF content.
- The remediated candidate removes both critical findings and all Sharp, fast-uri, brace-expansion, nanoid and js-yaml findings. The original Next/AVIF/Windows reachability caveats no longer represent candidate vulnerabilities.
- No application path that accepts attacker-controlled CSS or `sourceMappingURL` input was found. The remaining nested PostCSS copy is observed in the trusted repository build path. That materially limits reachability, but it does not satisfy the release target of zero unaccepted high/critical findings.
- Tyler's July exception remains recorded for the then-known three-high/one-moderate PostCSS/sharp subset. Sharp is now patched, while the candidate's PostCSS result is two high and two moderate advisories. Because the current set is not identical to the July set, T03 still requires a new exact candidate-specific acceptance.

## Remediation execution and remaining decision

1. **Complete:** Tyler approved the exact narrow dependency change.
2. **Complete:** align the Next toolchain on `15.5.25` and use a targeted Node 22/pnpm 9 lock refresh that moves every compatible vulnerable transitive. Normal resolution also updates compatible packages within the affected dependency subtrees; no override or package-age bypass was used.
3. **Complete locally:** frozen install, graph inspection, production/full re-audits, TypeScript, lint, native and true-WASM builds, the complete regression/readiness suite, and optimized HTTP/image smoke.
4. **Pending external evidence:** push the candidate branch, pass branch CI and verify its Vercel preview.
5. **Pending Tyler:** explicitly accept the exact remaining `postcss@8.4.31` two-high/two-moderate limited-reachability residual for this candidate, or keep T03 open while waiting for a supported Next release with patched nested PostCSS. Do not add an unsupported override merely to suppress the audit.
6. Close T03 only after step 4 passes and step 5 has an explicit decision. Keep any accepted residual visible in the upload decision packet.

## Control observations

- CI pins pnpm `9.15.9` and Node major `22`, but does not run a dependency audit. A green CI run does not establish security-audit status.
- `package.json` has no Node `engines` field, `.nvmrc` or `.node-version`; the exact local Node patch therefore comes from historical tooling evidence, not repository enforcement.
- `pnpm-workspace.yaml` uses `allowBuilds`, while the cached pnpm 9.15.9 help/config surface exposes `onlyBuiltDependencies`. The candidate frozen install ran dependency postinstall scripts, confirming the intended allowlist is not enforced by this pnpm 9 surface. Review that configuration separately; it was not expanded into this vulnerability patch.
- No repository, user pnpm or `.npmrc` `minimumReleaseAge` setting was found. The isolated install passed without a bypass, but this does not establish compliance with the historical external guard: the incidentally resolved `@typescript-eslint@8.70.0` family was only about two days old at resolution. Its owner/window remains unverified and must not be described as a repository control.

## T03 disposition

- Audit evidence: **complete**.
- Approved dependency remediation: **implemented and locally verified**.
- Critical findings: **cleared (2 → 0)**.
- Residual findings: **2 high and 2 moderate, all nested Next PostCSS**.
- Branch CI/Vercel preview: **pending**.
- Release gate/T03: **open pending external evidence and Tyler's exact residual-risk decision**.
- New risk exception: **not granted**.
- Production/config/external-service mutation during remediation: **none**.
