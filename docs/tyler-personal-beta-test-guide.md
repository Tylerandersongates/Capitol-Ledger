# Tyler Personal Beta Test Guide

Private pre-tester checklist for Tyler. Use this before inviting external beta testers; keep tester-facing guides focused on normal user flows.

## Billing And Team Cancellation
- Use a real Checkout-created Team subscription with the saved Stripe test card.
- Confirm the Stripe Billing Portal opens from the app for the owner account.
- If the Team plan is canceled in the portal, confirm Stripe shows the subscription as ending at the period date.
- Confirm Capitol Ledger intentionally treats a pending-cancel Team subscription as locked immediately:
  - `/team` shows the access gate.
  - `/upgrade` shows Free as the current plan.
  - Team checkout quantity resets to the 3-seat minimum.
- Decide before external beta whether the product wording should say cancellation revokes access immediately or at period end.

## Team API Lockout Follow-Up
- Confirm Team invites and Team seats APIs return `403` for a canceled owner.
- Use Vercel logs or an external same-session API harness for this check.
- Do not rely on the in-app browser for this item: direct `/api/...` navigation is blocked by the browser client, and bookmarklet-style probes are blocked by browser policy.
- Keep this as a private Tyler check until it is runtime-observed; source inspection already confirms the APIs use the synced subscription guard.

## Real Member Lockout Follow-Up
- Runtime-test Admin and Analyst lockout only on a real canceled owner workspace that actually has Admin and Analyst seats.
- Expected result after owner cancellation sync:
  - Admin cannot manage invites or seats.
  - Analyst cannot access shared Team workspace data.
  - Member `/team` pages show the access gate.
- The current real pending-cancel workspace had only the owner seat before lockout, so this needs a fresh real Team workspace with invited members.

## Beta Readiness Before Invites
- Run the DB-backed beta readiness check with `BETA_CHECK_DATABASE=true`.
- Inbox-verify one live auth email path before expecting tester email flows to work.
  - Verified on production with a registered real account password-reset email.
- Confirm deployed auth cookies are `Secure`, `HttpOnly`, and `SameSite=lax`.
  - Verified on production with an existing fake QA sign-in.
- Review the beta checklist page and make sure unresolved private billing/API items are not marked resolved in tester-facing materials.
