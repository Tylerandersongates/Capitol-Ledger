# End Of Day Handoff Prompt

Use this at the end of a work session to keep thread history small and prevent long-chat instability.

## Prompt To Run In Current Thread

Copy/paste this into Codex:

```text
Create an end-of-day handoff for this project.

Start from `docs/eod-handoff-template.md`. Copy its full marked Standing Rules block verbatim into the new dated EOD; a link alone is not enough. Reconcile the immediately preceding EOD, July 29 safeguards, current timeline/task ledger, and newer verified evidence. Do not restart a completed or superseded task.

Output in this exact structure:

1) Completed Today
- Flat bullet list of concrete changes completed.

2) Current State
- What works now
- What is partially done
- What is blocked
- Reconcile docs/project-timeline.md: carry every unfinished T01–T12/deferred task ID, owner/dependency and next checkpoint forward. Record actual completion dates, remaining effort, prior/revised forecast dates and why they changed. State ahead/on track/behind only against an established baseline; otherwise say not yet measurable.
- Carry forward the owner-availability buffer and adjust dependent approvals, device sessions, uploads and reviews. Keep the personal reason out of tracked notes.
- Keep the November 16, 2026 controlled soft-launch target and January 3, 2027 full 120th Congress launch target visible, with backward-plan checkpoints for both. Record forecast confidence and review/rework contingency; surface any risk and do not move either target without Tyler's decision.

3) Environment And Config Changes
- Any new/updated environment variables (names only unless I explicitly ask for values)
- Deployment targets touched (local, Vercel, Neon, etc.)

4) Verification Run
- Commands run
- Pass/fail status for each
- Key errors still open

5) Next Task (Single Safest Step)
- One recommended next action for the next thread
- Exact command(s) to run first
- Identify tomorrow's first task explicitly; link the complete carry-forward ledger so other tasks are not lost.

6) Resume Prompt For New Thread
- Provide one copy/paste prompt I can use to start the next thread with all critical context.

Rules:
- Keep it concise and factual.
- Codex decides and executes routine in-scope work without repeated confirmation; only the major actions defined in the copied Standing Rules need Tyler's exact approval. Do not treat a prior action-specific approval as permission for a later gate.
- Always include next best steps after each handoff or completed work block so work can keep moving.
- Keep TestFlight/App Store upload as the default north star until the native billing path and final text-tone pass are complete.
- Include absolute dates when referencing "today/yesterday".
- Do not invent anything that was not done.
- If something could not be verified, say so explicitly.
- Update the timeline and task ledger every EOD, even when ahead. If time is gained, pull forward only the next scoped, dependency-ready task and retain QA/availability contingency; do not add scope or bypass approvals.
- Keep the dated handoff, current timeline, Current Status.md and Next Steps.md consistent. Never carry forward "not deployed" or "migration pending" after a verified release, and never promote old QA evidence to a newly changed native candidate.
- Mark superseded dated instructions historical, keep unresolved blockers explicit, and carry every standing safety/naming/availability rule forward even when yesterday's narrative omitted it.
- Run `node scripts/check-eod-standing-rules.mjs` before closing the dated EOD; it needs no dependency reinstall. Fix a missing or drifted Standing Rules block; do not silently waive the check.
- If local `node` is unavailable after cache cleanup, use the bundled Node path from `load_workspace_dependencies`; do not restore caches just to run this check.
```

## Prompt To Start The Next Thread

After you get the handoff output, start a fresh thread and paste:

```text
Use this handoff as the source of truth and continue execution from "Next Task (Single Safest Step)".

[PASTE HANDOFF HERE]

Constraints:
- Do not repeat completed work.
- Make routine decisions and keep moving without a confirmation loop. Ask Tyler only for a major exact action or a genuinely missing choice that would materially change scope.
- Carry the dated handoff's full Standing Rules block and all unfinished ledger tasks; never treat a historical resume prompt as newer than verified evidence.
- Execute the first command listed in the handoff verification plan, then continue until the next checkpoint.
```
