# T06 physical iPhone QA — September 17, 2026

Status: **device walkthrough in progress; remaining screens have no observed result yet.** This worksheet follows the [September 16 handoff](HANDOFF.md) and the [public tester scenarios](public-testflight-tester-guide.md). Test the installed version `1.0` build `2` against the current production site. Record only screen/action, expected and observed behavior, time, and sanitized evidence; omit account, device, transaction, and protected identifiers.

## Already observed on build 2

Tyler signed out and back in, force-quit and reopened to Dashboard without credentials, opened an Official after PR #33, found one saved item after a full close/reopen, and verified the H.R. 9956 Basics repair on the installed iPhone after production merge `df0dbcc`. These focused passes do not close the rest of T06.

On September 17 Tyler reported blank First elected and Next election fields for U.S. Representatives. The live browser `/members/B001323` reproduced both as `Not listed`; the [source and official-record research](member-election-history-research-2026-09-17.md) identified a limited fallback table. Tyler approved [PR #35](https://github.com/Tylerandersongates/Capitol-Ledger/pull/35); production merge `3c01b1d` is Ready/Latest and the public browser now shows Begich's **Nov 5, 2024** and **Nov 3, 2026** values. Tyler's physical-iPhone retest of these fields is pending.

## Remaining pass, in order

| Order | Screen and safe action | Expected observation | Device result |
| --- | --- | --- | --- |
| 1 | Home / Dashboard: inspect district, chosen topics, saved activity, live bill tracker, votes, Daily Brief and civic activity cards; open one card and return. | Loads without error; personalized and saved state agrees with Profile; links return to a usable screen; an unavailable paid feature explains its gate. | Awaiting Tyler's observation. |
| 2 | Profile / Account, then Settings: inspect district, party if set, plan label, activity stats, watchlist and followed topics. Navigate away and back; optionally make one reversible topic change and check persistence. | Previously saved choices and counts remain consistent; account and settings controls load. | Not run. |
| 3 | Search: view Bills, Officials and Votes; use one filter, open a bill other than H.R. 9956, a vote and an official, then return to results. Follow an official-source link where offered. | Results, details, dates/status/positions, source links and back navigation work; missing source fields are explained truthfully. | Not run. |
| 4 | Daily Brief, Alerts, Actions/Impact and Badges: inspect available pages and one existing alert if present. | Pages load; empty and plan-gated states are clear; counts and saved activity agree with Account. Do not send a real civic message or trigger a purchase. | Not run. |
| 5 | Settings > Privacy and Support: inspect public policy, privacy-request guidance, support page and feedback entry point without submitting a request. | Navigation works; privacy copy describes the dedicated mailbox path and does not claim active first-party intake. | Not run. |

On the first non-destructive failure, capture the exact screen and tap, expected versus observed result, and whether one repeat reproduces it. Stop that affected flow for diagnosis; continue independent safe screens if practical. Account deletion is outside this pass: first-party deletion is currently off, and a destructive test needs a separately assigned disposable account and exact approval. Native monitoring events (T05), Apple sandbox transactions (T07), App Privacy/assets (T09), and upload/review/release (T10–T11) keep their own gates.
