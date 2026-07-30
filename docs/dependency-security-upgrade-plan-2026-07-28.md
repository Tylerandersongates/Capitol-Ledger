# CapitolWonk Dependency Security Upgrade Plan — July 28, 2026

## Status

Tyler approved the framework and dependency upgrade on July 29, 2026. The
implementation is complete on `codex/next15-security-upgrade` and is awaiting
branch CI, preview-deployment evidence, risk review, and merge approval.

## Implementation Outcome

- Next.js and `eslint-config-next` are aligned on 15.5.22, the patched 15.5
  maintenance release available when implementation began.
- React, React DOM, their TypeScript types, the SWC WASM fallback, Sentry, and
  PostCSS were aligned within the approved scope.
- The official async request API codemod was reviewed in dry-run mode before it
  was applied. Required `cookies()`, `params`, and `searchParams` compatibility
  edits are complete.
- Server fetch and route-handler caching was reviewed. Existing explicit
  `no-store` and revalidation behavior was preserved; no new cache overrides
  were required.
- Frozen install, TypeScript, ESLint, optimized production build, offline
  release/readiness checks, visible browser regression, native bridge gates,
  and a signing-disabled generic iOS Simulator Release build pass.
- The production audit improved from 28 advisories to four: three high and one
  moderate, with zero critical advisories. The remaining findings are transitive
  through Next.js-bundled PostCSS and its optional sharp range.
- The remaining PostCSS paths require attacker-controlled CSS, which the app
  does not accept. The remaining sharp path requires untrusted image decoding;
  the app does not accept image uploads, remote images are restricted to
  official Congress sources, and production image optimization is handled by
  the hosting platform.
- The original zero-high acceptance target is not met. Do not merge or treat the
  exception as resolved until Tyler explicitly accepts the documented residual
  risk or an upstream-compatible patch removes the findings. No dependency
  override was added merely to silence the audit.

## Verified Baseline

- The frozen install currently resolves Next.js 14.2.35.
- The refreshed production audit reports 28 advisories: 13 high, 13 moderate, 2 low, and 0 critical.
- The affected production dependency paths are concentrated in Next.js and transitive packages reached through Next.js and Sentry.
- Current TypeScript, ESLint, production build, route checks, offline validation, and browser QA passed at the July 28 handoff.
- The repository now pins pnpm 9.15.9 so future installs use the verified package-manager baseline.

## Recommended Target

Use a staged upgrade from Next.js 14 to Next.js 15.5.21 or a newer patched 15.5 maintenance release available when the work begins. Next.js identifies 15.5.21 as the Maintenance LTS security target in its July 2026 security release. This is a smaller compatibility step than moving directly to Next.js 16 Active LTS.

The approved upgrade should keep these packages aligned:

- Next.js and `eslint-config-next`
- React and React DOM, including their TypeScript types
- the pinned Next.js SWC WASM fallback
- Sentry's Next.js integration
- PostCSS and the refreshed transitive lockfile

Do not add dependency overrides merely to silence the audit. Prefer patched direct dependencies and upstream-compatible transitive resolutions.

## Known Migration Hotspots

1. Convert the four synchronous `cookies()` call sites to the async request API.
2. Update App Router page and route props that synchronously read `params` or `searchParams`.
3. Review server fetches and GET Route Handlers for the Next.js 15 cache-default changes.
4. Run the React 19 and TypeScript compatibility pass. The current source scan found no `useFormState`, `useFormStatus`, legacy `ReactDOM.render`, `findDOMNode`, or component `propTypes` assignments.
5. Verify Sentry initialization, source maps, and build instrumentation after the framework update.
6. Confirm the native SWC and pinned WASM fallback versions match the selected Next.js release.

## Executed Sequence

1. Create a dedicated upgrade branch from clean `main`.
2. Record the pre-upgrade audit and full validation baseline without printing protected values.
3. Run the official Next.js 14-to-15 codemod in dry-run mode and review every proposed edit.
4. Upgrade the aligned framework, React, type, lint, SWC, Sentry, and PostCSS packages.
5. Apply only the required compatibility edits, preserving current route and cache behavior.
6. Regenerate the lockfile with pnpm 9.15.9 and reinstall from the frozen lockfile.
7. Run TypeScript, ESLint, the full production build, route integrity checks, the complete offline validation suite, and all readiness checks.
8. Run fresh browser regression QA across authentication, dashboard, Daily Brief, search, bills, members, teams, settings, upgrade, and account surfaces.
9. Refresh the production dependency audit. The acceptance target is zero high or critical production advisories; document any remaining lower-severity transitive advisory and its reachable feature path.
10. Review the diff and QA evidence with Tyler before merging or deploying.

## Approval Boundaries

- Framework and dependency changes require Tyler's explicit approval.
- Do not change schemas, billing configuration, subscription state, or secret management as part of this upgrade.
- Do not print or commit protected configuration values or identifiers.
- Do not make purchases or repurchases during regression testing.
- Do not submit anything to App Review.

## Official References

- Next.js 15 upgrade guide: <https://nextjs.org/docs/app/guides/upgrading/version-15>
- Next.js July 2026 security release: <https://nextjs.org/blog/july-2026-security-release>
- Next.js codemod guide: <https://nextjs.org/docs/app/guides/upgrading/codemods>
