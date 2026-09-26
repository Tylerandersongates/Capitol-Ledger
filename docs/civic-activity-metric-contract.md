# Civic Activity metric contract

This contract defines what CapitolWonk may claim from the current aggregate gamification snapshot and the source-only server credit candidate. It does not claim that the aggregate is a complete dated event ledger or that the unapplied migration is active in Production.

## Metrics supported now

- **Activity score** is an all-time point total: each accepted event count multiplied by that event's fixed point value.
- **Recorded actions** is the all-time sum of every accepted event count. It is not the four-category impact subtotal.
- **Selected action breakdown** is an all-time subset containing tracked bills, reviewed vote records and legacy election entries, recorded representative contacts, and public comments marked complete. Its total must be labeled as selected, not as all Civic Activity.
- **Level progress** is progress inside the active tier: `(score - current tier minimum) / (next tier minimum - current tier minimum)`. At 440 points, Level 3 progress is 11%, with 40 points earned inside the 400–750 tier.
- Action-count labels describe the recorded interaction literally: for example, vote records reviewed, elections logged, alerts opened, official sources opened, and representative contacts recorded.

## Metrics that need dated evidence

- **Current-month points and actions** require accepted event counts with account-time-zone date keys. The existing `monthlyGain` aggregate has no month key, so it is retained only for storage compatibility and must not be displayed as “this month.”
- **Consecutive-day streak** requires distinct account-time-zone activity date keys. A current streak ends when neither today nor yesterday has a qualifying date, duplicate events on one date count once, and a gap ends the preceding run. The existing `dayStreak` aggregate is displayed only as credited activity days; the UI must not reconstruct or claim a consecutive week from it.
- The pure month and streak formulas in `lib/gamification.ts` freeze these semantics for a later server-accepted dated ledger. They do not make the current aggregate snapshot a ledger.

## Badges

- A badge is displayed only when at least one current event rule has a deterministic earning path to its ID.
- Catalog concepts without an implemented event path stay hidden from earned, locked, progress, and denominator views.
- Badge copy must match its actual event rule. For example, the alert-count badges say that alerts were opened rather than claiming a consecutive civic streak or a response.
- Election badges stay hidden and the undated election logger stays disabled. Re-enabling them requires a verified, dated election catalog that cannot award participation for a future or generic event.

## Server credit integrity

- Authenticated mutations submit one recognized event and durable target identity; the server owns point and badge rules and never accepts a client-authored aggregate snapshot.
- `AccountGamificationCredit` stores only a hash of the durable identity, with a per-account unique constraint. The account row is locked while a credit is claimed and its aggregate is advanced, so tab/device replay and concurrent writes cannot double-credit or erase existing counts.
- Browser mutations are serialized per tab, every authenticated response selects the account-scoped local snapshot, and a rejected credit restores the last server-confirmed snapshot for that same account scope when one is available. A direct page visit can no longer post the anonymous browser aggregate over an authenticated account.
- The credit-table migration is source-only and unapplied. This path must fail closed until its migration and matching release are separately reviewed and approved.

## Deferred persistence work

The aggregate still cannot prove historical monthly totals or a true consecutive-day streak. Account-time-zone event acceptance, ledger-derived month/streak rebuilds, and a reviewed legacy-count migration remain deferred. The current source candidate records a server UTC activity date only to avoid crediting the same accepted day more than once; visible copy continues to call the aggregate **credited activity days**, not a streak.
