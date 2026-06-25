# End Of Day Handoff Prompt

Use this at the end of a work session to keep thread history small and prevent long-chat instability.

## Prompt To Run In Current Thread

Copy/paste this into Codex:

```text
Create an end-of-day handoff for this project.

Output in this exact structure:

1) Completed Today
- Flat bullet list of concrete changes completed.

2) Current State
- What works now
- What is partially done
- What is blocked

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

6) Resume Prompt For New Thread
- Provide one copy/paste prompt I can use to start the next thread with all critical context.

Rules:
- Keep it concise and factual.
- Always include next best steps after each handoff or completed work block so work can keep moving.
- Keep TestFlight/App Store upload as the default north star until the native billing path and final text-tone pass are complete.
- Include absolute dates when referencing "today/yesterday".
- Do not invent anything that was not done.
- If something could not be verified, say so explicitly.
```

## Prompt To Start The Next Thread

After you get the handoff output, start a fresh thread and paste:

```text
Use this handoff as the source of truth and continue execution from "Next Task (Single Safest Step)".

[PASTE HANDOFF HERE]

Constraints:
- Do not repeat completed work.
- Confirm assumptions only if there is hidden risk.
- Execute the first command listed in the handoff verification plan, then continue until the next checkpoint.
```
