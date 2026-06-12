# Capitol Ledger Round 2 Beta Tester Guide

Last updated: June 12, 2026.

## What Capitol Ledger Is

Capitol Ledger is a mobile-first civic tracking app for following bills, representatives, votes, alerts, and personal civic activity in one calm, source-linked place.

Round 1 focused on basic usability: could testers move around, save items, report feedback, and understand the main screens without coaching?

Round 2 is about whether Capitol Ledger feels useful enough to keep using. Please focus on account persistence, clarity, trust, missing data, and whether the product gives you a better civic workflow than searching government sites one by one.

## Start Here

Use the live beta:

https://project-qosv1.vercel.app/beta

If you need to report feedback directly:

https://project-qosv1.vercel.app/feedback?source=round-2

Use test-safe information. Do not enter private personal data you would not want stored in a beta environment.

For account creation, use an email inbox you can access. Capitol Ledger may send a verification link, and you will need that inbox to complete the account flow.

## What Is Different In Round 2

Round 2 testers should spend less time checking whether the app basically loads and more time checking whether the app remembers, explains, and earns trust.

Please pay special attention to:

- Account creation, email verification, sign-out, and sign-back-in.
- Whether your district, interests, saved bills, saved officials, alerts, score, badges, and settings stay consistent after returning.
- Whether the app explains civic data clearly enough to trust it.
- Whether the saved ledger, dashboard, search, alerts, and profile all tell the same story.
- Whether Free, Pro Intelligence, and Civic Team language feels clear, even though live Stripe checkout is not turned on yet.
- Whether anything feels like a dead end, a fake button, or a feature promise that needs clearer beta wording.

## Suggested Test Pass

Plan for 25 to 35 minutes.

### 1. Create Or Return To An Account

New tester:

1. Open the beta link.
2. Go to Sign In.
3. Create an account with a test-safe email you can access.
4. Complete any verification-email step.
5. Set your district, affiliation if you want, interests, and alert preferences.

Returning tester:

1. Sign in with the same account you used before.
2. Confirm your profile, district, saved items, and settings still make sense.
3. Report anything that reset unexpectedly.

### 2. Build A Civic Watchlist

1. Open Search.
2. Use Bills, Officials, and Votes.
3. Save at least one bill.
4. Save at least one official.
5. Open a bill detail page and check the summary, votes, source links, and stance controls.
6. Open an official profile and check whether the accountability score explanation feels understandable and fair.

### 3. Check Alerts And Profile State

1. Open Alerts.
2. Open at least one alert.
3. Confirm the unread count changes in a way that makes sense.
4. Open Profile or Account.
5. Confirm civic score, badges, saved ledger counts, district, interests, and preferences match the actions you took.

### 4. Leave And Come Back

1. Sign out from Settings.
2. Confirm you land back on Sign In.
3. Try opening Account while signed out and confirm it asks you to sign in.
4. Sign back in.
5. Recheck Dashboard, Search, Alerts, Account, and Profile.

This is the most important Round 2 pass. If anything disappears or contradicts itself after sign-back-in, report it.

### 5. Review Upgrade And Team Language

1. Open Upgrade.
2. Compare Free, Pro Intelligence, and Civic Team.
3. Switch monthly and annual pricing if available.
4. Report anything confusing about plan names, pricing language, locked features, or what is still demo-only.

Live paid Stripe checkout is intentionally not active yet. Please focus on clarity and trust, not payment completion.

## What To Report

Please report anything that would make a real user hesitate, distrust the product, or need manual help.

Good Round 2 feedback includes:

- "I expected my saved bill to appear on the dashboard, but it only appeared on account."
- "This score looks important, but I do not understand what it measures."
- "I signed out and came back, but my district changed."
- "This label sounds like a real checkout is live, but it is still demo mode."
- "The app feels useful here, but I wanted one more data point before trusting it."
- "This page loaded, but I did not know what to do next."

Use High impact for anything that blocks account creation, sign-in, feedback submission, saved state, or a core page.

Use Medium impact for confusing flows, mismatched state, unclear subscription language, or trust issues.

Use Low impact for wording, polish, spacing, or nice-to-have improvements.

## How To Send Feedback

Use the in-app feedback form whenever possible:

https://project-qosv1.vercel.app/feedback?source=round-2

When reporting, include:

1. What you tried to do.
2. What happened.
3. What you expected.
4. Whether you could reproduce it.
5. The page where it happened.
6. The device or browser if the issue looks visual.

If you are testing returning-user behavior, mention whether you were:

- creating a new account,
- signing out,
- signing back in,
- checking persistence,
- or reviewing saved activity.

## Known Beta Limits

These do not need to be reported unless they are confusing or look broken:

- Live Stripe checkout is on hold until real price IDs are configured.
- Some civic records are demo-backed while live Congress.gov data expansion continues.
- Weekly Brief delivery is prepared in-app, but production email or push delivery is not fully connected yet.
- App Store and TestFlight packaging are not part of this web beta round.
- Some advanced export, team, and privacy controls are planned rather than live.

## Helpful Screen References

The Round 1 guide includes annotated screen maps that are still useful for orientation:

- Dashboard: `docs/beta-tester-guide/images/dashboard-annotated.png`
- Search: `docs/beta-tester-guide/images/search-annotated.png`
- Account: `docs/beta-tester-guide/images/account-annotated.png`
- Impact: `docs/beta-tester-guide/images/impact-annotated.png`
- Badges: `docs/beta-tester-guide/images/badges-locked-annotated.png`
- Petitions: `docs/beta-tester-guide/images/petitions-annotated.png`

You do not need to follow the Round 1 guide step by step. Use those screenshots only if you need a quick map of the app.

## Round 2 Success

A successful Round 2 test means:

- You could create or return to an account.
- The app remembered your setup and saved activity.
- Dashboard, Search, Alerts, Account, and Profile stayed consistent.
- You understood what was official data, demo data, or planned functionality.
- You found at least one thing worth improving before a wider beta.

Thank you for testing thoughtfully. The most useful feedback is specific, honest, and tied to what you were trying to do.
