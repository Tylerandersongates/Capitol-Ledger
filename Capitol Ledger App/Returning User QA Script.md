# Returning User QA Script

Status: internal QA script. Do not add this to the app during Round 1 beta.

Last updated: June 11, 2026.

## Goal

Confirm that a tester can create an account, leave, come back, and still see the same CapitolWonk CE profile, setup, and civic activity state.

## Before You Start

- Use the live Vercel beta unless you are specifically testing local preview.
- Keep Stripe in demo subscription mode until Stripe price IDs are configured.
- Use a non-secret test email and password.
- For live Vercel new-account QA, use an inbox you can access so the verification-email step does not block the pass.
- For previous tester accounts, sign in with the already verified account instead of creating a new account or repeating verification.
- Do not use a real tester's password or personal account for QA.
- Start from a clean browser profile or private window when testing first-time account creation.

## Required Routes

- `/sign-in`
- `/onboarding`
- `/dashboard`
- `/search?type=bills`
- `/alerts`
- `/account`
- `/profile`
- `/feedback`

## Scenario 1: New Account Creation

1. Open `/sign-in`.
2. Choose the create-account path.
3. Enter first name, last name, email, and password.
4. Submit the form.
5. Confirm the app shows a signed-in account state.
6. Open `/account`.
7. Confirm the profile name and email match the account you created.
8. Set or confirm district state.
9. Set or confirm policy interests.
10. Open `/dashboard`.
11. Confirm the dashboard reflects the selected district and interests.

Pass criteria:

- Account creation completes without a dead end.
- Any verification-email step is clear, and the tester can complete it with the test inbox.
- The account name appears cleanly.
- District and policy interests can be saved.
- Dashboard personalization is visible after setup.

## Scenario 2: Persistence Before Sign-Out

1. Open `/search?type=bills`.
2. Confirm setup chips match the selected interests and district.
3. Save or track one bill if available.
4. Open an official or member profile.
5. Save or follow one official if available.
6. Open `/alerts`.
7. Mark at least one alert as read by opening it.
8. Open `/profile`.
9. Confirm badges, saved items, days logged in, or civic score reflect the activity where supported.
10. Open `/account`.
11. Confirm saved ledger, interests, district, and notification preferences still match the current setup.

Pass criteria:

- Search setup chips are synced with account setup.
- Saved bill or official state is visible where the app exposes it.
- Read alert state stays read during the same session.
- Profile/account summary does not contradict dashboard or search.

## Scenario 3: Sign Out

1. Open `/account`.
2. Use the sign-out control.
3. Confirm the app routes away from protected account content.
4. Open `/account` again.
5. Confirm signed-out users are sent to `/sign-in`.

Pass criteria:

- Sign-out is clear.
- Protected account content is not visible after sign-out.
- The return path does not feel broken or blank.

## Scenario 4: Sign Back In

1. Open `/sign-in`.
2. Sign in with the same account from Scenario 1.
3. Open `/account`.
4. Confirm name, email, district, interests, and notification preferences.
5. Open `/dashboard`.
6. Confirm personalized summary content still matches the account.
7. Open `/search?type=bills`.
8. Confirm setup chips still match the account setup.
9. Open `/alerts`.
10. Confirm read/unread behavior is reasonable for the returning account.
11. Open `/profile`.
12. Confirm civic score, badges, days logged in, or saved activity are not unexpectedly reset.

Pass criteria:

- Sign-back-in restores the expected account.
- District and interests do not reset to defaults.
- Gamification state, including days logged in where shown, does not reset or stall unexpectedly.
- Search, dashboard, account, and profile tell the same story.
- Any state that does not persist is documented as a known beta limitation.

## Scenario 5: Feedback From The Flow

1. Open `/feedback`.
2. Submit a report with source `Returning user QA`.
3. Include the account state tested: new account, sign-out, sign-back-in, or persistence.
4. Open `/feedback/review` as a reviewer.
5. Confirm the report appears.
6. Label it resolved, beta acceptable, known issue, later, or launch blocker.

Pass criteria:

- Feedback can be submitted from this QA pass.
- Reviewers can triage the report before Round 2.

## Fail Conditions

- Account creation fails or creates a confusing state.
- Signed-out users can still view protected account data.
- Signing back in loses district or policy interests.
- Signing back in resets badges, score, days logged in, or saved activity unexpectedly.
- Search setup chips disagree with account setup.
- Feedback cannot be submitted or reviewed.
- A tester would need manual coaching to recover from the flow.

## Notes To Capture

- Test date.
- Environment: local preview or Vercel.
- Test account email domain only, not the full email if privacy matters.
- Browser/device size.
- Any route that felt like a dead end.
- Any state that changed unexpectedly after sign-out/sign-in.
