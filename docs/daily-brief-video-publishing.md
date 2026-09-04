# Daily Brief video publishing

The public `/brief` page is free and does not require sign-in. It uses the existing CapitolWonk visual design. The account-specific personalized brief remains a separate Pro/Team section; saved interests and watchlist details are not public.

An initially expanded Pro purchase section appears underneath the public video and its transcript/source disclosure for signed-out and Free visitors. It uses the existing plan pricing, trial disclosure, and native purchase control. Signed-out visitors sign in first and return to this section. Current Pro/Team accounts see their personalized brief instead of another purchase offer. The video remains free regardless of plan. This presentation does not change Apple products, signing, purchase configuration, or entitlements.

For a local Pro layout demonstration, start the local server with `DAILY_BRIEF_LAYOUT_PREVIEW=true` and open `/brief?preview=pro`. This shows labeled synthetic examples through the same Pro rendering components, expanded for review, without loading or changing an account. It does not grant Pro access. The preview flag is disabled by default and ignored when `DATABASE_URL`, `VERCEL`, or `VERCEL_ENV` is set. Sample source links point back to the preview explanation rather than invented external records. The ordinary `/brief` page and account API retain their real entitlement checks.

## Before the channel launches

Keep `content/daily-brief-videos.json` as `{ "channelUrl": null, "episodes": [] }`. Visitors see “First video coming soon,” without a fake play button, empty iframe, or invented social links. A YouTube channel is not required to prepare the page.

## Add the daily video

1. Publish the real video on YouTube with embedding allowed. This app does not create or upload videos.
2. Edit `content/daily-brief-videos.json`. Set `channelUrl` once to the actual channel URL. Add an entry to `episodes` with these fields:
   - `title`: the edition's actual title.
   - `videoUrl`: the real HTTPS YouTube watch, Shorts, or youtu.be URL.
   - `publishedAt`: the actual publication timestamp, including its timezone (for example, `2026-09-03T08:00:00-04:00`).
   - `format`: `short` for the portrait player, or `video` for landscape.
   - `transcript`: an array of transcript paragraphs, one string per paragraph.
   - `sources`: an array of objects with a descriptive `label` and the supporting record's HTTPS `url`.
3. Run `pnpm weekly-brief:in-app-check`, then review the local page and confirm the real video's playback and source links.
4. Release the content change through the normal, separately approved site deployment process.

The page selects the latest valid episode whose publication time has passed. Future-dated and malformed episodes are not displayed. It labels the actual publication date, so yesterday's video is not presented as today's. Keep the prior episode until the replacement is ready. Missing transcripts or sources are labeled honestly, but the editorial workflow should supply both before release.

This first version uses a checked-in content file, not a staff editor or live YouTube feed. Daily updates require a content edit and site release. No scheduler, channel synchronization, deployment, or production migration has been activated by this change. An authenticated publishing form or approved feed integration can be added later.

## Player and engagement behavior

- The standard YouTube privacy-enhanced embed is click-to-play, with no autoplay or forced looping.
- “Watch on YouTube” opens the current episode; “Subscribe on YouTube” opens the configured channel's subscription prompt. Neither appears until its real target is configured.
- Transcript and source links remain free. Public video access is independent of personalized brief preferences and paid features.
- Verify the real channel/video, embedding permissions, captions, age restrictions, and playback on the deployed HTTPS site and iPhone before launch. Local fixture tests cannot verify those external settings.
- Page visits are not YouTube views. This implementation does not promise view eligibility, Shorts-feed credit, subscribers, or monetization approval; check current YouTube Studio eligibility when the channel launches.
