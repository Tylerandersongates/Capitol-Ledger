# Bill analysis pilot — September 17, 2026

## Current finding

Production PRs #39 and #40 now show a source-based H.R. 7008 policy lens covering both congressional stock-trading restrictions and federal-election photo ID rules from the [House-passed July 22 text](https://www.govinfo.gov/content/pkg/BILLS-119hr7008eh/html/BILLS-119hr7008eh.htm). The separately sourced CRS summary remains dated July 17 and describes only the trading provisions. The current live-agent packet contains the summary and actions, not the current bill text; turning on model generation would not reliably recover an omitted section.

The deployed Details route renders a synced summary and source-based lens without waiting for a remote summary or model response. When no useful summary is stored, a separate streamed section checks Congress.gov after the page opens. On September 17, Tyler measured **6.49 seconds from a bill search result to H.R. 7008 Overview** and noticed that the CRS card omits the photo ID section. The next candidate labels that CRS summary as predating the House-passed version, links to the current text, and removes Overview's unnecessary subscription lookup and synchronous secondary Congress.gov enrichment; cosponsors stream separately when absent from the stored record. Physical-phone timing after this candidate reaches Production remains to be measured. The controlled live-check script still fetches a fresh summary for evaluation. An official-text packet and persistent AI cache remain separate pilot work.

## Evaluation set and review

Use 25–50 recent bills selected before looking at model output: a mix of House and Senate bills, recent amendments, lengthy and sparse texts, enacted and pending status, and major policy areas. Include H.R. 7008 as a required source-freshness case. Keep each bill's official text version, summary date, latest action date, and source URLs with its evaluation record.

Two reviewers score each output on bill specificity, factual support, balance, uncertainty, plain language, and whether the visible links support the claims. Record every unsupported material claim and omitted major provision. A response fails if it invents a legal effect, omits a major provision present in the supplied version, or implies enactment for a pending bill. Compare the same bills with the deterministic fallback, then decide whether the improvement is large enough to justify a pilot. Review disagreement before calculating an aggregate score.

## Performance and launch design

Generate from a versioned official source packet outside the page request. Store the validated result by bill, source-content hash, model, and generation timestamp in a persistent cache. A bill page should read a stored result or render the source-based fallback immediately; a cache miss must not wait for a provider call. Refresh after source-version changes and expire old results. Record aggregate generation success, fallback reason, latency, input/output tokens, and cost without logging source packets or personal data.

Before any Preview pilot, require current official bill text in the packet or withhold generation when the summary is older than the action record. Show the actual source version and links in the card. Apply a small spend cap and rate limit. Confirm T09 provider and App Privacy disclosures, including API retention and the `store: false` request setting. Keep Production provider configuration unchanged until a separate exact launch decision.

## Decision gates

1. T06: complete the Dashboard/Home-first physical iPhone walkthrough and retest H.R. 7008 after a source release, including the official-source card layout.
2. Pilot quality: no unsupported material claims or missed major provisions in the reviewed set; demonstrate a clear improvement over the fallback and record reviewer agreement.
3. Pilot speed: no measurable regression in bill-open time on the physical phone; a cache miss returns the fallback without waiting for generation.
4. Pilot value: collect useful/not-useful feedback and official-source clicks from a limited Pro audience. Treat conversion or retention as unknown until measured.
5. T09: complete provider, retention, and App Privacy review before Production activation. Tyler makes the exact protected configuration and Production decision after the evidence is reviewable.
