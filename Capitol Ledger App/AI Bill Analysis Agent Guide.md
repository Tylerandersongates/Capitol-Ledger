# AI Bill Analysis Agent Guide

CapitolWonk's bill detail policy lens uses a hybrid pipeline:

1. The deterministic `buildAiBillAnalysis` policy lens remains the fallback.
2. `resolveAiBillAnalysis` can call a server-side OpenAI Responses API generator when live analysis is explicitly enabled.
3. Model output must validate against a strict JSON schema and cite source IDs from the official source packet.
4. Invalid, slow, missing, or disabled model output falls back silently to the deterministic lens.

## Environment

Default launch-safe mode:

```bash
CAPITOL_LEDGER_AI_BILL_ANALYSIS_PROVIDER=fallback
OPENAI_API_KEY=
```

Live OpenAI mode:

```bash
CAPITOL_LEDGER_AI_BILL_ANALYSIS_PROVIDER=openai
CAPITOL_LEDGER_AI_BILL_ANALYSIS_MODEL=gpt-4o-mini
CAPITOL_LEDGER_AI_BILL_ANALYSIS_TIMEOUT_MS=4500
CAPITOL_LEDGER_AI_BILL_ANALYSIS_CACHE_MS=21600000
OPENAI_API_KEY=...
```

Do not commit `OPENAI_API_KEY`. Add it only through the deployment environment or local ignored `.env.local`.

## Source Packet

The agent receives a compact packet built from:

- official bill metadata
- official or stored summary text
- official action log entries
- linked recorded votes
- synced source matches

The prompt tells the model to use only this packet, avoid unsupported claims, and treat thin records as procedural/uncertain.

## Validation

The model must return:

- `context`
- exactly 3 `pros`
- exactly 3 `cons`
- `uncertainty`
- `confidence`
- `sourceIds`

The app rejects output that cites unknown `sourceIds` or fails schema validation.

## Caching

Validated live output is cached in-process by source packet, model, and provider. This avoids repeated calls while keeping the first implementation schema-free. Persistent database caching should be a separate migration when upload-critical work is stable.

## Checks

Run:

```bash
pnpm ai-bill-analysis:live-check --dry-run
pnpm ai-policy-lens:check
pnpm exec tsc --noEmit --pretty false
pnpm lint
```

After `CAPITOL_LEDGER_AI_BILL_ANALYSIS_PROVIDER=openai` and `OPENAI_API_KEY` are configured outside git, run:

```bash
pnpm ai-bill-analysis:live-check
```

The live check validates multiple bills and fails if the app silently falls back to deterministic output.
