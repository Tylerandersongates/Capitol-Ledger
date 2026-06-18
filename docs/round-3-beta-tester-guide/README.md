# Capitol Ledger Round 3 Beta Tester Guide

Last updated: June 18, 2026.

## What Capitol Ledger Is

Capitol Ledger is a mobile-first civic tracking app for following bills, representatives, votes, alerts, teams, and personal civic activity in one calm, source-linked place.

Round 1 focused on basic usability. Round 2 focused on account persistence, trust, saved state, and whether the product felt useful enough to keep using.

Round 3 is about broader beta readiness. Please focus on team access, annual upgrade clarity, live civic data, account verification, invite acceptance, saved state, and whether new data-backed pages feel trustworthy.

## Start Here

Use the live beta:

https://project-qosv1.vercel.app/beta

If you need to report feedback directly:

https://project-qosv1.vercel.app/feedback?source=round-3

Use test-safe information. Do not enter private personal data you would not want stored in a beta environment.

New testers should use an email inbox they can access. Capitol Ledger sends a verification link during sign-up. Open that link from your email, then return to Capitol Ledger and sign back in with the verified account before continuing.

Returning testers should sign in with the same account they already verified. Do not create a new account unless you are intentionally testing first-time setup again.

If you receive a Civic Team invite, use the exact invited email address. Team invites are tied to the invited email.

## What Is Different In Round 3

Round 3 testers should spend less time checking whether the app basically loads and more time checking whether the expanded beta flows hold together.

Please pay special attention to:

- Email verification, sign-in, sign-out, and sign-back-in without getting stuck in a loop.
- Civic Team invites by email and in-app Alerts, including accepting an invite inside the app.
- Team roles: Owner, Admin, Analyst, and Viewer.
- Team access on the dashboard, team roster, role permissions, and seat removal.
- Pro customers joining a Team. Their company-paid Team access should take priority while they are on the Team.
- Pro customers leaving a Team. Their personal Pro account should return to the correct previous state.
- Upgrade now opens on Annual by default.
- Team plans now support self-serve seats from 3 to 25. Larger teams should be routed to a custom plan.
- Live Congress data is expanded. Bill counts, member profiles, sponsor links, state names, delegate labels, and service history should look credible.
- AI Policy Lens should match the specific bill you are reading. Report stale or mismatched impact text.
- Dashboard Bill Tracker cards should handle very long bill titles without overlapping or becoming unreadable.
- Day streaks should change on the next qualifying day. Report streaks that stay stuck or jump unexpectedly.

## Suggested Test Pass

Plan for 35 to 45 minutes.

### 1. Create Or Return To An Account

New tester:

1. Open the beta link.
2. Go to Sign In.
3. Create an account with a test-safe email you can access.
4. Open the verification link emailed to you.
5. Return to Capitol Ledger and sign back in with the verified email.
6. Set your district, affiliation if you want, interests, and alert preferences.

Returning tester:

1. Sign in with the same account you used before.
2. Confirm your previous profile choices stayed in place, including district, affiliation if set, policy interests, alert preferences, saved bills, and saved officials.
3. Open Profile, Badges, Impact, or Account and check that civic score, badges, saved activity, and days logged in still make sense.
4. Report any sign-in loop, invalid token message, unexpected reset, or page that sends you back to sign-in after you are already signed in.

### 2. Accept A Civic Team Invite If Assigned

Only complete this section if Tyler or the beta coordinator sent you a Team invite.

1. Open the invite email.
2. Confirm it is addressed to the email you are using for Capitol Ledger.
3. If you are not verified yet, verify your account first.
4. Open Alerts in Capitol Ledger.
5. Confirm the Team invite appears near the top of Alerts.
6. Accept the invite from Alerts or from the email link.
7. Open Dashboard and confirm the Team Workspace card appears.
8. Open Team and confirm your role, team name, and seat status look right.

Report anything that makes invite acceptance hard, especially wrong-account messages, invalid-token screens, missing Alerts, duplicate prompts, or being accepted into the wrong role.

### 3. Check Team Role Behavior If Assigned

If you are testing a Team role, check only the actions that fit your assigned role.

1. Owner or Admin: invite a teammate, remove a pending invite if assigned, and confirm the roster updates.
2. Admin: confirm you can manage team seats but cannot access owner-only billing actions unless the app clearly allows it.
3. Analyst: confirm shared workspace access works but management controls are limited.
4. Viewer: confirm the workspace is readable but management and edit actions are not available.
5. Any role: sign out, sign back in, and confirm your Team Workspace card still matches your role.

If you are removed from a Team, your dashboard should stop showing Team access after refresh or sign-back-in.

### 4. Review Annual Upgrade And Seat Limits

Do not complete payment unless you were specifically assigned to a billing test.

1. Open Upgrade.
2. Confirm Annual is selected by default.
3. Compare Free, Pro Intelligence, and Civic Team.
4. Confirm Pro annual pricing reads clearly.
5. Confirm Civic Team annual pricing reads clearly per seat.
6. Try Team seat counts from 3 to 25.
7. Confirm larger teams are directed to a custom plan instead of normal checkout.
8. Switch between monthly and annual if the page allows it, then confirm the copy still makes sense.

Report confusing plan names, inconsistent pricing, missing annual language, or anything that sounds like the wrong customer is paying.

### 5. Search Members And Check Profiles

1. Open Search.
2. Search members by state or territory.
3. Open at least one Senator, one Representative, and one territory profile if available.
4. Confirm state names are written out on profiles.
5. Confirm delegates and the Resident Commissioner are not mislabeled as regular House representatives.
6. Confirm terms in office, first elected, and next election appear where available.
7. Confirm sponsor links from bills open real member profiles instead of generic Congress labels.

Report wrong titles, state abbreviations where a full state name should appear, missing service history, broken sponsor links, or old demo-looking data.

### 6. Check Bills, Bill Counts, And AI Policy Lens

1. Open Search and switch to Bills.
2. Confirm the bill count looks like the current expanded data set, not a tiny demo-only set.
3. Open at least three bill detail pages.
4. Read the bill summary, sponsor, status, source links, and stance controls.
5. Check AI Policy Lens on each bill.
6. Confirm the AI Policy Lens text matches the bill subject.
7. Save a bill, leave the page, and return to confirm the saved state is still right.

Report any AI Policy Lens content that appears stale, generic, copied from another bill, or unrelated to the bill topic.

### 7. Check Dashboard, Alerts, And Saved State

1. Save at least one bill and one official.
2. Open Dashboard.
3. Confirm saved items, watchlist cards, Bill Tracker cards, and long bill titles are readable.
4. Open Alerts and mark at least one alert read if available.
5. Confirm unread counts change in a way that makes sense.
6. Open Account and confirm profile status, plan status, saved ledger counts, and team state do not contradict the dashboard.
7. Sign out and sign back in.
8. Recheck Dashboard, Alerts, Account, and saved items.

This is the most important Round 3 pass. If the app tells two different stories about the same account, report it.

### 8. Check Day Streak On The Next Day

This check requires two calendar days.

1. On day one, sign in and note the displayed day streak.
2. Complete a normal app action such as saving a bill, opening an alert, or checking a bill detail page.
3. On the next calendar day, sign in again.
4. Note whether the day streak increased by one, stayed stuck, or jumped more than expected.
5. Include both dates and the displayed streak numbers in your feedback.

Do not change your device clock for this test unless Tyler specifically asks you to.

## What To Report

Please report anything that would make a real user hesitate, distrust the product, or need manual help.

Good Round 3 feedback includes:

- "I verified my email, but the app sent me back to sign-in again and again."
- "The Team invite was in my email, but I could not find it in Alerts."
- "I accepted a Team invite as a Pro user, but my dashboard still looked like personal Pro only."
- "I was removed from a Team, but the Team Workspace card stayed on my dashboard."
- "Annual was not selected by default on Upgrade."
- "The Team seat selector let me go past 25 without showing a custom plan path."
- "The member profile says KS instead of Kansas."
- "This territory official is labeled as House when the role should be Delegate or Resident Commissioner."
- "AI Policy Lens on this bill talks about a different topic."
- "A long bill title overlaps the status chip."
- "The day streak stayed at the same number on the next day."

Use High impact for anything that blocks account creation, verification, sign-in, Team invite acceptance, feedback submission, billing clarity, saved state, or a core page.

Use Medium impact for confusing flows, mismatched state, stale civic data, wrong role labels, unclear subscription language, or trust issues.

Use Low impact for wording, polish, spacing, or nice-to-have improvements.

## How To Send Feedback

Use the in-app feedback form whenever possible:

https://project-qosv1.vercel.app/feedback?source=round-3

The feedback form includes Round 3-specific areas for annual upgrade, Team invite acceptance, Team roles, Team seats, Team billing/downgrade, live civic data, AI Policy Lens, official statements/video, saved state/day streak, and service history. Choose the closest area so reports land in the right review bucket.

When reporting, include:

1. What you tried to do.
2. What happened.
3. What you expected.
4. Whether you could reproduce it.
5. The page where it happened.
6. The device or browser if the issue looks visual.
7. Whether you were testing as Free, Pro, Team Owner, Admin, Analyst, Viewer, or invited teammate.

If you are reporting an invite, verification, or sign-in issue, include:

- whether you used the email link or in-app Alert,
- whether your account was already verified,
- whether you were signed in or signed out,
- and the exact error message shown on screen.

## Known Beta Limits

These do not need to be reported unless they are confusing or look broken:

- Profile avatar upload is not wired yet. Static initials or the current avatar state are expected.
- Only assigned billing testers should complete Stripe checkout.
- Some email, weekly brief, and notification delivery flows are still being hardened for production beta.
- App Store and TestFlight packaging are not part of this web beta round.
- Some advanced export, custom enterprise, and privacy controls are planned rather than fully live.

## Round 3 Success

A successful Round 3 test means:

- You could create or return to an account.
- Email verification and sign-back-in worked without a loop.
- Invited testers could accept Team seats and see the correct role.
- Dashboard, Team, Alerts, Account, and saved state stayed consistent.
- Annual upgrade, Team pricing, and seat limits were clear.
- Live civic data looked credible across bills, members, sponsors, and profiles.
- AI Policy Lens matched the bill being viewed.
- Long bill titles and mobile layouts stayed readable.
- Day streak behavior was ready to confirm on the next calendar day.
- You found at least one thing worth improving before wider beta.

Thank you for testing thoughtfully. The most useful feedback is specific, honest, and tied to what you were trying to do.
