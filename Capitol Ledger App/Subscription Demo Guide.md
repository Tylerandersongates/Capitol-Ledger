# Subscription Demo Guide

## Goal

Show how CapitolWonk operates and feels across three subscription modes:

- Free
- Pro Intelligence
- Civic Team

Use this guide for investor demos, product walkthroughs, App Store planning, and subscription strategy discussions.

## Demo Setup

1. Restart the local production preview so the newest plan-state changes are visible.
2. Open `http://127.0.0.1:3020/account`.
3. Use the `Demo Subscription Mode` card to switch between Free, Pro Intelligence, and Civic Team.
4. Keep `/upgrade` open as the pricing and plan comparison reference.
5. Walk through the same pages in each plan so the difference feels clear and intentional.

## Free Mode

Positioning:

Free is the public transparency baseline. It should feel useful, trustworthy, and complete enough to build confidence, while showing where premium intelligence begins.

Expected behavior:

- Dashboard shows core legislative activity.
- Bill pages show core progress, votes, summary, and key details.
- Premium bill intelligence appears as locked previews.
- Search works for basic discovery.
- Advanced search, export reports, AI Policy Lens, source map, speeches/video, and priority alerts are gated.
- Account page shows the Free plan badge and locked premium preview list.

Demo path:

1. Start on `/account` and switch to Free.
2. Open `/dashboard` and show the basic overview.
3. Open a bill detail page and go to the Details tab.
4. Point out locked premium cards as upgrade moments.
5. Open `/search` and show basic discovery.
6. Open `/upgrade` and show how Pro and Team expand the experience.

Talk track:

Free gives every citizen a clean, source-linked view into bills, votes, officials, and alerts. The user can understand what is happening without needing to pay first.

## Pro Intelligence Mode

Positioning:

Pro is the individual power-user tier for politically engaged citizens, analysts, journalists, advocates, and civic operators.

Expected behavior:

- Dashboard unlocks the Pro policy lens card.
- Bill Details unlock AI Policy Lens, Official Source Map, and Speeches & Video.
- Search unlocks Smart Filters and export report preview.
- Alerts unlock the Priority Alert Lane.
- Account page shows Pro Intelligence status and a larger unlocked feature set.

Demo path:

1. Switch to Pro Intelligence from `/account` or `/upgrade`.
2. Open `/dashboard` and show the Pro policy lens.
3. Open `/bills/demo-hr-22?tab=details`.
4. Show AI Policy Lens below Bill Summary.
5. Show Official Source Map and Speeches & Video as evidence-backed intelligence.
6. Open `/search` and show Smart Filters plus export report preview.
7. Open `/alerts` and show Priority Alert Lane.

Talk track:

Pro turns CapitolWonk from a tracker into an intelligence layer. It gives users analysis, source trails, video context, advanced discovery, and higher-priority civic alerts.

## Civic Team Mode

Positioning:

Civic Team is for campaigns, nonprofits, advocacy organizations, civic groups, research teams, and local government watchers.

Expected behavior:

- Includes all Pro Intelligence capabilities.
- Map page unlocks Civic Team workspace panel.
- Team plan copy emphasizes shared watchlists, team dashboards, shared alerts, reports, and multi-seat coordination.
- Account and Upgrade pages show Civic Team as the active plan.

Demo path:

1. Switch to Civic Team from `/account` or `/upgrade`.
2. Open `/map` and show the Civic Team Workspace panel.
3. Explain shared watchlists, team-owned alerts, and multi-level government monitoring.
4. Open `/search` and show export/report capability.
5. Open a bill Details tab to show the same Pro intelligence still unlocked.
6. Return to `/upgrade` and show Civic Team pricing and comparison.

Talk track:

Civic Team turns the product into a shared command center. It helps organizations coordinate tracking across bills, officials, alerts, issues, and geography.

## QA Checklist

Free:

- Account page shows Free plan.
- Dashboard premium card appears locked or hidden as intended.
- Bill Details premium cards show locked previews.
- Search Smart Filters and export report are locked.
- Alerts priority lane is locked.
- Map team workspace is locked.

Pro Intelligence:

- Account page shows Pro Intelligence plan.
- Dashboard policy lens is visible.
- Bill Details AI Policy Lens is visible.
- Bill Details Official Source Map is visible.
- Bill Details Speeches & Video is visible.
- Search Smart Filters are visible.
- Search export report preview is visible.
- Alerts priority lane is visible.
- Map team workspace remains locked.

Civic Team:

- Account page shows Civic Team plan.
- All Pro Intelligence features remain visible.
- Map Civic Team Workspace panel is visible.
- Upgrade page marks Civic Team as current plan after switching.

Refresh persistence:

- Switch to each plan.
- Refresh the page.
- Confirm the active plan remains selected.
- Confirm the plan badge and gated cards still match the active mode.

## Demo Notes

- Use `/account` as the fastest place to switch subscription mode.
- Use `/upgrade` when explaining pricing and plan comparison.
- Use `/bills/demo-hr-22?tab=details` for premium intelligence.
- Use `/map` for Civic Team.
- Use `/search` for Pro export/report value.
- Use `/alerts` for priority reminders.
- Use `Billing Readiness Guide.md` and `BILLING_REQUIRE_APP_STORE=true pnpm billing:check` before relying on App Store account-wide paid subscription sync.

## Next Polish Items

1. Tune locked preview cards after visual QA in the restarted preview.
2. Add a subtle plan badge to premium cards so users understand why a feature is visible.
3. Add a short investor-demo script with timing, page order, and key lines.
4. Add screenshot capture targets for Free, Pro Intelligence, and Civic Team.
