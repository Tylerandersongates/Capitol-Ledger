# AI Bill Analysis Agent Guide

CapitolWonk's bill detail policy lens uses a hybrid pipeline:

1. The deterministic `buildAiBillAnalysis` policy lens remains the fallback.
2. `resolveAiBillAnalysis` can call a server-side OpenAI Responses API generator when live analysis is explicitly enabled.
3. Model output must validate against a strict JSON schema and cite source IDs from the official source packet. Validated source links are shown in the policy card.
4. Invalid, slow, missing, disabled, stored-summary, or stale-summary model output falls back to the deterministic lens. The card labels its source basis.

The current source candidate renders the bill Details policy lens from synced bill data. Opening that tab no longer waits for a Congress.gov summary request or an OpenAI response. If the stored summary is absent or is only an action placeholder, a streamed summary section checks Congress.gov after the page opens, preserving the visible CRS text. The explicit live-check script still exercises the remote summary and generator for controlled evaluation. Keep the provider in fallback mode until the persistent, ahead-of-page generation design in [the September 17 pilot plan](../docs/ai-bill-analysis-pilot-2026-09-17.md) is implemented and tested.

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

The controlled live-check agent currently receives a compact packet built from:

- official bill metadata
- official or stored summary text
- official action log entries
- linked recorded votes
- synced source matches

The prompt tells the model to use only this packet, avoid unsupported claims, and treat thin records as procedural/uncertain.

The packet does not yet contain the current bill text. The live-check path withholds generation when the official summary predates the latest action. The bill Details page uses the synced summary and source-based policy lens; it labels the summary as potentially older than the current bill text. H.R. 7008 illustrates why this source-freshness gate matters.

## Validation

The model must return:

- `context`
- exactly 3 `pros`
- exactly 3 `cons`
- `uncertainty`
- `confidence`
- `sourceIds`

The app rejects output that cites unknown `sourceIds` or fails schema validation.
The Responses request sets `store: false`; T09 still needs a provider retention and App Privacy review before activation.

## Caching

The controlled live-check path caches validated output in-process by source packet, model, and provider. The page does not use this cache or call the model. Persistent, version-keyed storage and ahead-of-page generation are required before an AI-assisted page pilot.

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
pnpm ai-bill-analysis:live-check -- live-119-hr-<reviewed-bill-number>
```

Pass reviewed, current live bill IDs. The live check rejects stored, missing-date, and stale official summaries and fails if the app returns the deterministic fallback. Dry-run without IDs still checks the bundled demo source packets.
