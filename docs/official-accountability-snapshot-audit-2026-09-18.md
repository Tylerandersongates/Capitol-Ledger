# Official Public Record Accountability Snapshot audit — September 18, 2026

## Finding

The current official-profile surface made an important prior correction: it keeps missing evidence visible, separates personalized issue evidence from accountability, and refuses to publish an overall score from inadequate data. That safeguard is working in Production.

The surrounding scoring presentation is still incomplete and can mislead users. Only one of the four model categories can produce a numeric value, so the published requirement of three scored categories can never be met. The vote and legislation “record” totals are capped recent samples, live enrichment can fall back after 2.5 seconds, and the UI does not disclose the sample window, cap, source-sync time, or fallback state. The result is an evidence preview presented inside a scoring framework rather than a completed accountability model.

## Live Production evidence

Three signed-in Production profiles were inspected:

| Official | Chamber | Verified categories | Linked evidence | Voting | Legislation | Overall |
| --- | --- | ---: | ---: | --- | --- | --- |
| Bryan Steil | House | 2 / 4 | 46 | 20 records, 100% | 12 sponsored + 12 cosponsored | Not scored yet |
| Lloyd Doggett | House | 1 / 4 | 22 | 20 records, 100% | 0 sponsored + 0 cosponsored | Not scored yet |
| Ted Cruz | Senate | 2 / 4 | 46 | 20 records, 100% | 12 sponsored + 12 cosponsored | Not scored yet |

All three correctly showed financial disclosure and ethics records as unavailable. The separate Sources tab also showed both categories as “Not available yet” and linked only to the Congress.gov member profile. The [official Congress.gov API](https://api.congress.gov/) provides member sponsored- and cosponsored-legislation endpoints, and an [official 119th Congress committee report](https://www.congress.gov/119/crpt/hrpt18/CRPT-119hrpt18.pdf) confirms that Lloyd Doggett introduced H.Res.127, so the live zero-legislation result is incomplete rather than a verified zero.

## Current calculation

The model declares four weights:

| Category | Weight | Current value rule | Current scoreability |
| --- | ---: | --- | --- |
| Voting participation | 35% | `(linked votes - Not Voting) / linked votes`; requires at least five linked votes | Scorable |
| Legislative record | 25% | Sponsored and cosponsored record count | Evidence only; numeric value is always `null` |
| Transparency sources | 20% | Count of Congress.gov profile URL and official website URL | Limited evidence only; numeric value is always `null` |
| Ethics and compliance | 20% | No connected records | Unavailable; numeric value is always `null` |

An overall score requires at least three verified, scorable categories covering at least 60% of the declared model. Voting participation is the only category that can ever meet the code's numeric-value condition. Therefore every official must remain “Not scored yet” under the current implementation.

This is safer than publishing false precision, but “Overall accountability score,” model weights, and `Accountability v1.0` suggest a working score that does not exist.

## Data-quality defects

### 1. Recent samples are presented as record totals

The database query takes at most 20 recent member votes, 12 sponsored bills, and 12 cosponsored bills. Live records are merged and capped to the same totals. Successful profiles therefore commonly stop at exactly 20 and 12 + 12, as the Steil and Cruz profiles did.

The 100% voting value means participation within at most 20 currently linked roll calls. It is not term attendance, career attendance, or a complete current-Congress measure. The UI does not state the date range or denominator scope.

### 2. Evidence can change with request-time enrichment

Member profile, legislation, and vote enrichment run concurrently, but each is allowed only a 2.5-second page budget. The upstream legislation timeout is four seconds in Production and the vote timeout is ten seconds, so the page can return its stored fallback before either live request finishes. A later request may see cached live records. This can change verified-category and evidence totals without the underlying public record changing.

### 3. An empty result is indistinguishable from missing coverage

Lloyd Doggett's live profile displayed zero sponsored and cosponsored bills and marked legislative evidence unavailable even though an official 119th Congress record identifies legislation he introduced. The surface needs to distinguish **verified none** from **not loaded**, **not synchronized**, **request timed out**, and **outside the displayed sample**.

### 4. Transparency coverage counts identity links

The “Transparency sources” count is only the deduplicated Congress.gov member URL and official office website URL. These are useful identity sources, but they are not financial disclosure, gift/travel, campaign finance, communications, or ethics sources. The factor remains “limited,” yet its name and planned 20% weight can overstate what is connected.

### 5. Issue evidence is a keyword signal without drill-down

Saved-interest matches use simple keyword inclusion across the same capped votes, bills, and a small curated role list. The UI correctly avoids an alignment percentage, but “matched public records” has no direct list showing which records matched or which text triggered the match. Users cannot readily audit counts such as 22 Infrastructure records from the Overview.

### 6. Version and freshness are not inspectable

The profile shows “CapitolWonk Accountability v1.0” but no public methodology link, scoring revision date, evidence period, source-sync timestamp, or correction process. Those are required before a reputational score for public officials should be published.

## Launch-safe target

1. Until three real scored categories exist, lead with **Public record snapshot** or **Record coverage** and remove the large “Overall accountability score” promise. Keep “Not scored” only as a clearly explained unavailable state if the future score remains visible.
2. Label voting as **recent linked roll-call participation**, show the oldest/newest dates and denominator, and never imply term or career attendance from the 20-record cap.
3. Label legislation as **recent records currently linked** and show the cap. Distinguish verified zero from missing, timed-out, stale, and partial data.
4. Calculate the snapshot from persisted, observable source synchronization rather than request-time enrichment. Display the most recent successful source-sync time and a stale/partial state.
5. Add direct evidence drill-down for every category and every personalized issue count.
6. Keep legislative volume as evidence unless a reviewed, chamber-neutral outcome methodology exists. Raw sponsorship volume should not become an accountability grade.
7. Before publishing any official score, define and independently review objective dimensions, denominators, missing-data treatment, correction/appeal handling, versioning, and disparate effects across chamber, tenure, leadership roles, vacancies, and delegates.
8. Connect official disclosure and ethics sources before assigning those categories weights. Absence of a connected record must not be treated as absence of a filing, violation, investigation, or finding.

## Verification needed

- Full-roster data-quality report: coverage by chamber, category, cap hit, stale age, timeout/fallback, and verified-zero status.
- Fixed-period participation fixtures covering Not Voting, Present, vacancies, newly seated members, and chamber differences.
- Score-reachability test that fails when fewer than three model factors have real value functions.
- Stable reload test proving the same persisted evidence state across repeated requests.
- Source timestamp, sample-window, and partial-state mobile Preview checks.
- Evidence drill-down checks that reconcile every displayed count to inspectable source records.
- Methodology review before any percentage is released as an official accountability score.

## Scheduling

Do not add a full official-scoring build to the already committed 15–19 hour weekend plan. The tracker and Civic Activity repairs remain the two core Dashboard commitments.

- **Weekend stretch goal, only after both core candidates are stable:** truthful sample/window/freshness copy and removal or downgrading of the dormant overall-score presentation.
- **Monday recovery target:** deterministic persisted evidence state, partial/stale distinctions, and full-roster coverage report.
- **Later reviewed workstream:** disclosure/ethics ingestion and a publishable scoring methodology. Keep numeric official scores disabled until this is complete.
