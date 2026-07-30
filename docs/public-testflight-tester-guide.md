# CapitolWonk Public TestFlight Tester Guide

Thank you for testing CapitolWonk. Use this guide only with the TestFlight build
and test scope shared with you.

## Before You Start

- Install the assigned build from TestFlight.
- Use only an account or email address you are authorized to use.
- Never share a password, verification code, Apple ID, payment information, or
  another person's private information in feedback.
- Test subscriptions or account deletion only when your assignment explicitly
  includes that scenario.
- Do not send a real-world civic message or submission unless your assignment
  explicitly asks you to do so.

## Core Test Pass

Work through the areas included in your assignment. If a feature is locked by
your plan, confirm that the explanation and upgrade path are clear; do not buy a
subscription unless you were assigned the subscription scenario.

1. **Launch, sign-in, and onboarding**
   - Launch the app from a closed state.
   - Sign in or create an account, complete verification when required, and
     finish onboarding.
   - Choose topics or interests and confirm the dashboard reflects them.

2. **Saved state and topics**
   - Save and unsave an official, bill, or other available item.
   - Change a topic or preference.
   - Move between screens and confirm the saved state remains consistent.

3. **Search and public records**
   - Search the Officials, Bills, and Votes categories.
   - Try a filter, open a result, return to search, and confirm the state is
     understandable.
   - On bill, member, and vote detail screens, check names, dates, status,
     actions, vote positions, and official-source links where shown.

4. **Briefs, alerts, and activity**
   - Open Daily Brief and Alerts. If either is plan-gated, confirm the message is
     clear.
   - Review Actions, Impact, and Badges.
   - If your assignment includes a safe test action, confirm the related impact
     or badge state updates as expected.

5. **Privacy, support, and account controls**
   - Open Privacy and Support from Settings.
   - Confirm Request Account Deletion is available and the warning is clear.
   - Do not submit a deletion request unless you were assigned that scenario and
     are using a disposable test account. Account deletion does not itself
     cancel an Apple subscription.

6. **Relaunch and recovery**
   - Force-close the app, wait a few seconds, and relaunch it.
   - Confirm the app opens normally and that sign-in, saved items, topics, and
     eligible subscription access are still correct.
   - Repeat the screen or action that failed once. Do not repeatedly retry a
     destructive, payment, or privacy-sensitive action.

## Subscriptions: Assigned Scenarios Only

Do not start this section unless your test assignment explicitly includes Apple
sandbox subscriptions.

- Follow only the assigned purchase, restore, or manage-subscription scenario.
- Confirm the Apple purchase flow is a sandbox/test transaction and will not
  create a real charge.
- Never enter personal payment information to complete a test.
- After an assigned sandbox purchase or restore, confirm the correct access
  appears, survives force-close and relaunch, and does not create duplicate
  access.
- Use Apple's subscription-management screen only when it is part of the
  assignment. Do not repurchase merely to establish subscription state.
- If any prompt appears to request real payment, stop without confirming it and
  report a Blocker immediately.

## Send Feedback

Use either of these approved paths:

- In TestFlight, open CapitolWonk and choose **Send Beta Feedback**. A safe
  screenshot is helpful when the problem is visual.
- In CapitolWonk, open the `/feedback` screen. If in-app feedback is unavailable
  or disabled, use TestFlight feedback instead.

Include:

- severity;
- device model and iOS version;
- CapitolWonk version and build shown in TestFlight;
- the screen or feature;
- short reproduction steps;
- expected and actual results;
- whether it happens every time;
- whether force-close and relaunch changed the result;
- a screenshot only when it contains no private or credential information.

## Severity

- **Blocker:** Stop testing this flow. Examples include a real-payment prompt,
  unexpected credential request, privacy exposure, launch failure or repeated
  crash, lost paid entitlement, or apparent data corruption.
- **High:** A core assigned flow is unusable and there is no reasonable
  workaround.
- **Medium:** A feature is incorrect or confusing, but testing can continue with
  a workaround.
- **Low:** Cosmetic, layout, wording, or minor polish issue.

## Stop Testing and Report Immediately

Stop the affected flow and send private feedback immediately if:

- a purchase prompt appears to involve a real charge or personal payment
  method;
- the app or another page asks for credentials or verification codes outside
  the expected CapitolWonk or Apple sandbox sign-in flow;
- you can see another person's private information or private information
  appears in a screenshot, log, or feedback draft;
- the app has a repeated crash, cannot launch, or becomes stuck in a crash loop;
- subscription access disappears after a successful assigned sandbox purchase
  or restore;
- saved items, topics, account data, or other records appear corrupted, changed,
  or permanently lost.

Do not repeat the action, complete a payment, paste private data into feedback,
or try to repair the state yourself. Report what happened, the last safe step,
and whether relaunching once changed the result.
