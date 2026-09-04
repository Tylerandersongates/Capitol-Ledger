# App Rename and OpenAI Activation Plan

Status: display-name cleanup updated September 3, 2026. Follow the July 29 EOD safety rules and the latest dated handoff for release status.

## Source Of Truth

The public app name is `CapitolWonk`. This is a display-name change, not a new app or purchase-identity migration.

Keep the repository folder, package name, native target/module, bundle identifier, App Store SKU, product identifiers, account-token namespace, telemetry identifiers, and environment prefixes stable. The setup packet retains the existing reference identifiers; do not recreate Apple records or change signing.

The user-facing surface remains Daily Brief. Preserve internal Weekly Brief routes, scripts, delivery names, and stored data until a separately approved compatibility migration.

## Safe Rename Scope

- Use the shared `lib/brand.ts` helper for app text and metadata. It normalizes the retired suffix in an existing public-name override.
- Update public display-name examples in `.env.example`; do not edit protected local/deployment configuration during a source cleanup.
- Update only `APP_DISPLAY_NAME` in the native project. No signing or purchase identity changes.
- Keep active documentation and readiness checks aligned. Dated EODs and previously exported tester PDFs/DOCX files are historical records, not current launch material.
- Remote App Store/channel metadata and sender display names are separate follow-ups requiring approval and verification in their intended environments. Relevant variable names: `NEXT_PUBLIC_APP_NAME`, `AUTH_EMAIL_FROM`, `WEEKLY_BRIEF_FROM`.

## Local Verification

Run checks sequentially with the existing dependencies and a supported Node 20/22 runtime:

```bash
pnpm brand:check
pnpm launch-copy:check
pnpm weekly-brief:in-app-check
pnpm ai-policy-lens:check
pnpm ios-native:check
pnpm billing:check
pnpm testflight:check
pnpm lint
pnpm exec tsc --noEmit --pretty false
pnpm build
```

Local preparation checks are not signed-device, purchase, or upload approval. Strict Apple gates require the existing protected configuration in the intended environment. Do not change configuration or repurchase a subscription merely to make a check pass.

## OpenAI Activation

Live AI bill analysis must be enabled only through local or deployment secrets:

```bash
CAPITOL_LEDGER_AI_BILL_ANALYSIS_PROVIDER=openai
OPENAI_API_KEY=...
CAPITOL_LEDGER_AI_BILL_ANALYSIS_MODEL=gpt-4o-mini
CAPITOL_LEDGER_AI_BILL_ANALYSIS_TIMEOUT_MS=4500
CAPITOL_LEDGER_AI_BILL_ANALYSIS_CACHE_MS=21600000
```

Do not commit `OPENAI_API_KEY`. Keep fallback mode available:

```bash
CAPITOL_LEDGER_AI_BILL_ANALYSIS_PROVIDER=fallback
OPENAI_API_KEY=
```

## Live OpenAI Verification

Once credentials are configured, run:

```bash
pnpm ai-bill-analysis:live-check
```

The check covers multiple bill types, requires the OpenAI provider and hidden API key, and fails if live results fall back to the deterministic policy lens. Use dry-run mode before credentials exist:

```bash
pnpm ai-bill-analysis:live-check -- --dry-run
```

After the command passes, browser-smoke several details pages on `http://127.0.0.1:3023` and verify the plain-language section remains bill-specific:

- `demo-hr-22`
- `demo-hr-471`
- `demo-s-2237`
- at least one synced live bill from the local database, if database reads are enabled

## Verification Boundaries

- The OpenAI setup instructions above are retained reference material; live provider behavior was not reverified by the September 3 display-name cleanup.
- Remote Apple display metadata and sender names are not updated by local source changes.
- Signed-device, purchase transition, Sentry privacy, and release blockers remain governed by the latest EOD; do not treat local preparation checks as upload readiness.
