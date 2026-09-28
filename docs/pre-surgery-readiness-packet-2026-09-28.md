# CapitolWonk Pre-Surgery Readiness Packet

Prepared September 28, 2026. This packet pulls dependency-free work forward so October 2–6 can remain a true owner-absence buffer and later recovery time can absorb surprises without silently weakening a launch gate.

This is a preparation artifact. It does **not** authorize a merge, deployment, provider/configuration change, device event, purchase, deletion, upload, distribution, submission, or release.

## Frozen operating boundary

- Production remains on `main` at `26190cd2cb953a875380f077b5b2d76c1566ac51` unless separately verified and recorded.
- Truthful disabled privacy-request copy is exact commit `49997c706da2ed8e7d70f6e9bcadc50c5bff1265` in [PR #50](https://github.com/Tylerandersongates/Capitol-Ledger/pull/50). Its three remote checks and branch Preview are green. The PR is not merged, in Production, or active.
- The 120th-Congress source slice is exact head `8befc533e39cbf9b522af4169cebcdeeccce2049` in [PR #51](https://github.com/Tylerandersongates/Capitol-Ledger/pull/51). Its three remote checks and branch Preview are green, but the PR is not merged, in Production, or authorized to flip the active Congress.
- First-party privacy intake, privacy operations, account deletion, App Store server verification, and Notifications V2 remain off.
- The current Daily Brief planning baseline is the honest channel-only/no-player state.
- October 2–6 requires no owner action. The privacy mailbox is a recorded single-owner closure with no continuous-coverage claim; review the oldest unreviewed item first on return.
- The five obsolete branch-scoped Preview variables remain cleanup-only. Their removal is not a launch blocker and still requires exact action-time approval.

## Work pulled forward

| Track | Prepared now | Remaining action-time dependency |
| --- | --- | --- |
| T05 — Native monitoring | One-event packet, evidence fields, stop rules, and cleanup boundary below. | Exact signed/device candidate, protected native Sentry value, and approval immediately before the event. |
| T06 — Regression/device QA | Current-main source, browser, account, and physical-device rows separated below. | Protected accounts/device only for the rows labeled owner/device. |
| T07 — App Store sandbox | Disposable-account execution order reconciled to the existing detailed matrix. | Apple sandbox accounts, protected configuration, transactions, and exact action-time approval. |
| T08 — Daily Brief | No-player baseline and inclusion trigger made explicit. | Tyler decides later whether a real episode belongs in launch scope. |
| T09 — Privacy/listing | PR #50 is the exact truthful-copy candidate; absence mailbox rule is frozen. | PR review/merge/deploy and any App Store/provider mutation remain separate. |
| T10 — Release execution | Web soft-launch and native/TestFlight checklists are separated below. | Each deployment, upload, distribution, submission, and release needs its own approval. |
| T11 — Go/no-go | Evidence criteria for November 16 and January 2/3 are drafted below. | Tyler owns the final go/no-go and release decision. |
| T12 — 120th Congress | The inventory and invariants are recorded below; PR #51 at `8befc53` implements the source-only transition boundary, sparse-feed failure, and saved-state continuity with green full diagnostics. | Review/merge remain separate; isolated-data rehearsals and the eventual Production Congress switch remain later gates. |

## T05 — bounded native Sentry event packet

### Entry gate

All items must refer to the same exact candidate:

1. Record commit SHA, marketing version, build number, archive identity, device model, iOS version, and UTC test window without recording protected Apple or Sentry values.
2. Confirm the build is signed, installed, and launches on the assigned device.
3. Supply `CAPITOL_LEDGER_SENTRY_DSN` only through the approved protected Xcode/CI path. The checked-in value stays blank.
4. Confirm native source still has `sendDefaultPii = false` and `tracesSampleRate = 0` in `CapitolLedgerApp.swift`.
5. Re-read the intended iOS Sentry project destination and existing scrub/IP/geography controls by presence only. Do not change a rule during this test.
6. Confirm no unrelated native event, crash, or performance probe is running in the window.

### Single event

- Use one temporary, reviewed diagnostic trigger that cannot ship enabled and sends one non-sensitive message such as `native-readiness`.
- Attach only bounded non-identifying tags: candidate SHA prefix, build number, and `test_scope=native-readiness`.
- Do not attach user/account IDs, email, device name, IP, location, URL query/hash, cookies, tokens, purchase data, JWS, database values, clipboard data, or free-form user text.
- Trigger exactly once, wait for the bounded flush result, and stop. Do not convert a timeout into repeated sends.

### Evidence and pass criteria

- One event appears in the intended iOS project and intended environment/release.
- Sanitized inspection records whether Sentry retained device/app installation identifiers, device context, OS/app version, breadcrumbs, crash/performance fields, IP, or derived geography.
- Raw IP and derived geography are absent. Default PII is absent. No replay, user identity, request payload, URL query/hash, token, or protected value is stored.
- The result is reconciled into the provisional App Privacy matrix. Presence of an installation/device identifier keeps Device ID plus linked diagnostics disclosed unless a later exact candidate strips it and proves absence.

### Stop and cleanup rules

- Stop before sending if the commit/build/device/project/environment is ambiguous, the protected value would be exposed, controls differ from the recorded state, or the trigger can send more than one event.
- Stop after the first event regardless of whether delivery succeeds. Diagnose before proposing another event.
- Remove the temporary trigger and protected local build setting, rebuild or prove the distributable target excludes the trigger, and preserve only sanitized evidence.
- Do not delete provider evidence merely to make the result look clean. Any provider-side deletion is a separate destructive action.

## T06 — current-main regression and device matrix

### A. Secret-free source gate — unattended

Run on the exact candidate with the repository-pinned Node/pnpm toolchain and unchanged frozen lock:

```text
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit --pretty false --noUnusedLocals --noUnusedParameters
pnpm run release-source:check
pnpm lint
pnpm build
git diff --check
```

Record the exact SHA, tool versions, lockfile hash, command outcome, and failure artifact. A protected-runtime failure is not silently relabeled as a source failure; use the strict gate only in its approved environment.

### B. Anonymous browser matrix — unattended/read-only

| Surface | Minimum result |
| --- | --- |
| `/`, `/sign-in`, `/privacy`, `/privacy/request`, `/support` | HTTP/render success, truthful brand/privacy copy, no console error, no hidden intake claim. |
| `/dashboard`, `/live-docket`, `/priority-feed`, `/risk-watch` | Current Congress scope is visible, freshness/source state is honest, blank or partial data fails visibly rather than inventing certainty. |
| `/bills`, one bill detail, `/members/[bioguideId]`, one vote detail | Navigation, official-source links, sparse states, mobile layout, and back navigation work. |
| `/brief` | Channel-only/no-player state makes no automatic YouTube request and exposes only the verified channel link. |
| `/upgrade`, `/team`, `/team/accept?teamQa=missing` | Signed-out and missing-token gates are clear; no purchase is started. |

Check desktop and narrow mobile viewports, keyboard focus order, visible focus, headings/landmarks, zoom/reflow, reduced-motion behavior where present, and empty/error states. This matrix must not create an account, send feedback/email, mutate follows, or begin checkout.

### C. Authenticated non-destructive matrix — owner session required

- Existing verified test account only; do not create or delete an account during the absence window.
- Sign in, relaunch/refresh, sign out, and sign back in.
- Confirm dashboard, search filters, account/profile/settings, alerts, followed bills/members, and read/saved state tell the same story.
- Confirm a Team member/owner sees only role-appropriate controls without changing membership, seats, billing, or invites.
- Confirm privacy/support routes expose the verified mailbox path and do not imply database-backed intake is available.
- Record browser/device, UTC window, account alias only, candidate SHA, and sanitized failures.

### D. Physical-device-only matrix — October 7 or later

- Exact installed candidate launch, foreground/background/relaunch, safe-area, rotation, keyboard, link handling, and WKWebView navigation.
- Sign-in/verification/sign-out/persistence and account-state agreement with web.
- Dashboard, Brief placeholder, officials, bills, votes, alerts, feedback UI, privacy, support, upgrade, and Team gates.
- Native Sentry one-event packet from T05, once.
- App Store sandbox sequence from T07 only after its separate gate.
- Account deletion only with an explicitly assigned disposable account after activation, worker, monitor, provider, restore, and rollback gates pass.

### Failure rule

Any crash, data loss, cross-account state, false provider/privacy claim, incorrect entitlement, stale-Congress mislabeling, or inaccessible critical action is a blocker. Capture a minimized reproduction and stop the affected path; do not repair Production or broaden scope during evidence collection.

## T07 — staged App Store sandbox order

The detailed expected outcomes remain in [the sandbox QA matrix](app-store-sandbox-qa-matrix-2026-09-11.md). Use this sequence to minimize account and transaction churn:

1. **Freeze evidence:** exact commit/build/device; protected variables by presence; product/offer screenshot; one fresh and one previously subscribed sandbox alias.
2. **Secret-free preflight:** frozen install, TypeScript, release-source gate, mobile/TestFlight checks, lint, and build.
3. **Fail-closed protected preflight:** verifier, TestFlight, migration/schema, account-token namespace, bundle/app identity, and endpoint checks. Keep Notifications V2 production URL inactive.
4. **Fresh Pro monthly lineage:** Apple eligibility sheet, purchase, same-account restore, relaunch/web agreement, introductory-offer cancellation/expiry or conversion, and current server-state proof.
5. **Previously subscribed alias:** prove the app makes no free-trial promise and Apple's sheet remains authoritative.
6. **Lifecycle:** renewal, billing retry/grace/expiry, refund/revoke, restore with and without a new JWS, offline/background/signed-out pending updates, and exact finish-after-server-acceptance behavior.
7. **Ownership conflicts:** second CapitolWonk account, token mismatch, unsupported product, concurrent delivery, and multiple granting lineages all fail closed.
8. **Team:** minimum and maximum supported seats, role/seat behavior, personal-Pro-to-Team acknowledgement, release from Team back to current personal state, and unavailable annual 17–20 products.
9. **Notifications V2 sandbox:** TEST, duplicate, overlap/reclaim, payload conflict, out-of-order completion, unlinked/conflict, retryable failure, invalid signature, oversize payload, and terminal redelivery.
10. **Deletion boundary:** only after its independent gates, verify deletion never cancels Apple billing or recreates a deleted account; no raw signed payload enters logs/evidence.

Do not reuse the same tester when the row requires a distinct eligibility/history state. Do not clear purchase history, delete a tester, transact, configure a notification URL, or upload a build without exact approval.

## T08 — Daily Brief scope held safely

Default through the absence: keep `content/daily-brief-videos.json` channel-only with no episodes. This makes no automatic YouTube request and avoids a premature App Privacy/player dependency.

Include a first episode only when all of these are available together: real published video, embedding allowed, accurate timestamp, transcript, supporting source links, captions, mobile playback proof, deployed HTTPS proof, and reconciled privacy/provider answers. A real episode is a scoped content/source release and not an automatic consequence of this packet.

## T10 — split release checklists

### T10a: November 16 controlled web soft launch

- Exact `main` SHA and matching Ready Production deployment.
- Required repository checks and production build green on that SHA.
- Anonymous and authenticated non-destructive T06 rows green; no unresolved P0/P1 launch blocker.
- Current civic-data freshness/source status verified for the active Congress.
- Privacy mailbox availability/closure status stated truthfully; first-party intake remains off unless separately activated through its full gate.
- Monitoring, support owner, trusted-user cohort, rollback commit/deployment, and incident stop conditions recorded.
- No unfinished native/App Store feature is presented as available.
- Tyler approves the exact cohort and release action immediately before launch.

### T10b: native/TestFlight release

- All T10a source/runtime truth requirements plus a fixed/accepted Apple verifier path.
- Exact signed archive and installed-device candidate.
- T05 native monitoring evidence, T06 physical-device matrix, and T07 sandbox matrix green on that candidate.
- Exact Release archive privacy report reconciled to App Privacy answers and listing assets.
- Upload packet records version/build/SHA/archive/dependency/CI/device/protected-gate evidence and residual risks.
- Upload, tester distribution, Beta App Review, App Review, and release are separate approvals; none is implied by an earlier step.

## T11 — go/no-go criteria

### November 16 controlled web decision

**Go** only if the T10a checklist is green, rollback is rehearsed or directly executable, support/privacy ownership is available, data freshness is honest, and all incomplete paths remain gated off. **No-go** for a P0/P1 defect, ambiguous deployment SHA, unowned support/privacy window, misleading intake/entitlement copy, current-Congress data corruption, or unavailable rollback.

### January 2/3 full-launch decision

In addition to a stable controlled cohort, require the T12 rehearsal and authoritative 120th-Congress feed observations, saved-state continuity, sparse-new-Congress behavior, source-link validation, transition rollback, updated metadata/copy, and explicit resolution of whether native/TestFlight is included. The January 3 date never overrides evidence.

## T12 — 119th-to-120th Congress source inventory

### Runtime assumptions to remove or control

| Area | Current source evidence | Transition requirement |
| --- | --- | --- |
| Active Congress default | `app/api/congress/bills/route.ts`, `lib/congress-docket.ts`, `lib/congress-docket-sync.ts`, `lib/house-votes.ts`, and `lib/senate-votes.ts` independently default to 119. | Use one validated active-Congress resolver and test 119, 120, missing, and invalid configuration. Do not flip Production until official feeds are observable. |
| Sync/readiness defaults | `scripts/sync-congress.ts`, `scripts/check-congress-readiness.mjs`, `scripts/check-backend-readiness.mjs`, and the roster audit default to 119. | Require the target Congress to be explicit for transition rehearsals and record it in every artifact. |
| 119th special cases | `lib/congress/bill-text.ts`, `lib/data.ts`, and `lib/ai-policy-lens.ts` contain bounded HR 7008 handling. | Preserve as historical 119th behavior; prove it cannot be presented as a 120th-Congress default or contaminate unrelated bills. |
| Demo/snapshot data | `lib/demo-data.ts`, `lib/senate-vote-snapshot.ts`, `data/house-first-elected-119.json`, and several fixtures are 119th-specific. | Label fixtures/snapshots as historical; current-mode pages must never imply these are fresh 120th records. |
| Member identity | `Member.bioguideId` is stable/unique and `active` is global, not Congress-scoped. | Reconcile outgoing/incoming membership without losing historical profiles or incorrectly deactivating a continuing member. Audit district/state/chamber changes. |
| Bill identity | Database uniqueness is `(congress, billType, billNumber)` and normalized live IDs include Congress. | Preserve 119th saved bills while allowing same type/number in the 120th; no alias may cross Congress accidentally. |
| Vote identity | Database uniqueness is `(congress, chamber, session, rollCall)`. | Prove House/Senate IDs, links, and member positions cannot collide across Congress/session boundaries. |
| Saved state | `Follow` stores the target ID; member follows use stable Bioguide ID, bill follows use normalized bill IDs. | Continuing-member follows survive; outgoing members remain viewable as historical; 119th bill follows do not silently retarget to 120th bills. |
| Alerts/brief/team views | Alerts and briefs resolve stored target IDs against current loaded sources. | Missing historical targets render an honest archived/unavailable state instead of disappearing or binding to a new record. |
| Docket evidence | `CongressDocketSyncRun` and read paths are Congress-scoped. | A 120th sync cannot make stale 119th evidence look fresh; empty early feeds must render as sparse/awaiting source data. |

### Transition invariants and rehearsal matrix

1. Seed/rehearse 120th data in an isolated database while 119th data remains present.
2. Verify zero bill/vote identifier collisions and no cross-Congress follow aliasing.
3. Reconcile the official member roster: continuing, outgoing, incoming, vacancies, at-large districts, district changes, party/chamber changes, delegates, and sparse/missing fields.
4. Verify 119th deep links and saved bills remain historical and readable after the active default changes.
5. Verify member follows persist by Bioguide ID while current-role labels and historical service remain truthful.
6. Verify empty/partial 120th bill, vote, committee, summary, text, cosponsor, and chamber-roll-call feeds fail visibly and do not fall back as current to 119th snapshots.
7. Verify dashboard, search, docket, priority/risk surfaces, alerts, briefs, team shared records, official-source links, metadata, and copy all agree on the active Congress.
8. Run source/readiness/catalog/roster/vote/bill checks with `CONGRESS_SYNC_CONGRESS=120` against the isolated target; record counts, source maximum timestamps, missing sponsors, and normalized/upserted totals.
9. Rehearse the switch and rollback as configuration/data-selection operations with no deletion of 119th data.
10. Freeze changes near January 3, re-read authoritative sources, and require a separate evidence-based go/no-go before the Production flip.

### Completed source-only T12 slice

Open PR #51 at exact head `8befc533e39cbf9b522af4169cebcdeeccce2049` on isolated branch `codex/congress-transition` centralizes the validated active-Congress resolver; routes runtime bill, docket, House-vote, and Senate-vote defaults through it; makes member and sponsor labels use the explicit target Congress; and adds transition assertions for fallback, invalid configuration, 119/120 selection, labels, source URLs, and non-colliding bill IDs.

The follow-up coverage proves that an empty early-120th feed fails without persistence or visible rows, a saved 119th bill cannot retarget a same-number 120th bill, cross-Congress bill records remain distinct, and a continuing member retains its Bioguide follow identity while receiving the correct target-Congress label. The PR retains an explicit 119 fallback, changes no Production configuration/data, and does not flip the active Congress. Isolated 119th-plus-120th database rehearsal remains later evidence work.

## Pulled-ahead unattended diagnostic

Exact source: PR #51 head `8befc533e39cbf9b522af4169cebcdeeccce2049`.

- Full `release-source:check` passed, including billing, privacy, deletion, native, TestFlight-prep, copy, blank-state, alert, docket, transition, policy, auth-email, rate-limit, response, and accessibility contracts. Expected protected-readiness warnings remain open and were not relabeled as proof.
- Full ESLint and strict TypeScript with unused-symbol enforcement passed.
- Prisma generation and the optimized Next.js production build passed; all 57 pages generated.
- `git diff --check` passed; the dependency lock is unchanged.
- Cookie-isolated anonymous desktop routes passed for sign-in, privacy, disabled privacy requests, support, dashboard, docket, priority/risk surfaces, Brief, upgrade, Team missing-token handling, and the expected `/`, `/bills`, and `/team` redirects.
- The 390x844 mobile pass covered the critical public and sparse-state surfaces with no horizontal overflow.
- Browser console collection reported no warnings or errors across either matrix.
- The Daily Brief made no YouTube resource request and exposed only the approved outbound channel link.
- The Ready PR #51 branch Preview rendered the honest no-record docket/dashboard states. No account, email, feedback, follow, purchase, provider, configuration, database, or Production mutation was used.

## Recovery-time preservation

If recovery after surgery takes longer than expected, the safe project state is:

- PR #50 can wait without making intake active.
- PR #51 can wait without changing Production defaults or data.
- October 2–6 has no required device, provider, Apple, cleanup, upload, or release action.
- The privacy mailbox closure is recorded honestly.
- The no-player Daily Brief baseline avoids a content/provider deadline.
- Native, sandbox, deletion, and release actions resume only when Tyler is available for their exact gates.
- The November 16 web target remains separable from native/TestFlight gates; January 3 remains evidence-based rather than automatic.
