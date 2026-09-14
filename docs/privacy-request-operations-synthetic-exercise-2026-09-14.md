# Privacy-request operator lifecycle synthetic exercise — September 14, 2026

Status: **passed in isolated ephemeral PostgreSQL; production migration and operation remain off and unauthorized.**

## Boundary

- Runtime: PGlite `0.5.8`, the PostgreSQL WASM package documented for ephemeral in-memory use by [ElectricSQL](https://pglite.dev/docs/) and published as [`@electric-sql/pglite`](https://www.npmjs.com/package/@electric-sql/pglite).
- Inputs: runtime-randomized synthetic case references, synthetic identity, and optional detail only.
- Excluded: production clone/data, real people, mailbox content, credentials, protected provider state, network calls, mail, Apple, Stripe, Sentry, Vercel changes, and production gates.
- Output: one aggregate pass/fail line. No case reference, synthetic identity, requester detail, or payload is written to a report or log.
- Cleanup: every database statement is awaited and database close runs in `finally`; the database has no filesystem persistence.

## Exercised controls

1. The operations gate fails closed for unset, malformed, and non-exact values before database access.
2. PostgreSQL exposes exactly the fourteen policy-allowlisted operation fields and no requester/account/contact/payload column.
3. First-party type and receipt timestamps are derived from the existing minimized queue row; mailbox case references are generated internally.
4. Machine receipt and human acknowledgement remain separate; only the `privacy_owner` role can acknowledge or resolve.
5. The signed-in lane proceeds through `new` → `reviewing` → `resolved` with a closed source-boundary inventory.
6. A high-risk fulfillment fails just outside the 15-minute reauthentication window and succeeds on fresh existing-channel reauthentication.
7. A lost-email/former-user-style mailbox case stays at `escalation_required`, rejects fulfillment, and can be accurately denied with the closed identity-ambiguity basis.
8. PostgreSQL rejects a non-vocabulary source-boundary category and the service rejects an identifier shaped like contact data.
9. Optional first-party detail remains before the 30-day threshold and is minimized after it.
10. A closed operations record remains before its exact 24-month delete-at time and expires at that time; a later closed case remains.
11. The retention operation requires both the operator gate and the separate retention gate and returns aggregate counts only.
12. The single-owner decision leaves inactive intake disabled, continues after fewer than two missed windows, and requires a pause at two expected or actual consecutive missed windows.

Run with:

```sh
pnpm privacy-request:synthetic-exercise
```

The exercise also runs inside `pnpm privacy-request:check` and therefore the branch release-source gate.

## Still open

- Independent source review and exact-head CI/Preview evidence.
- Least-privileged production operator authentication/binding and production migration approval.
- Mailbox-copy and export-artifact deletion evidence.
- Restore-floor verifier and a restore exercise.
- Exact protected-configuration pause/return runbook.
- Scheduler, production aggregate monitor read, production retention run, and any alert path.
- Any provider exercise or real privacy-request operation.

None of those actions is authorized by this exercise.
