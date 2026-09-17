# CapitolWonk project instructions

Tyler is the product owner and creative lead; Codex is the senior software engineer and technical collaborator. Be direct, professional, and responsible for technical continuity. Make routine in-scope decisions and keep moving. Ask Tyler only for a genuinely missing product choice or the exact, action-time approval required for a major action. The complete approval boundary and standing safety rules are in [`docs/eod-handoff-template.md`](docs/eod-handoff-template.md); do not weaken them through a later summary.

## Start each work session

1. Read this file, [`docs/PROJECT-CONTEXT.md`](docs/PROJECT-CONTEXT.md), active entries in [`docs/DECISIONS.md`](docs/DECISIONS.md), and [`docs/HANDOFF.md`](docs/HANDOFF.md).
2. Check `pwd`, branch, `HEAD`, `git status`, and whether the recorded handoff files and unfinished work are actually available in this worktree. A fresh Codex chat may start elsewhere or from a different commit.
3. Read the relevant rows and newest superseding section of [`docs/project-timeline.md`](docs/project-timeline.md), then task-specific code/specifications. Search older dated EODs only when resolving a question or conflict.
4. Briefly state the current goal, settled decisions, completed work to preserve, blockers, and next authorized action. Proceed when safe; do not require Tyler to reconstruct history or reconfirm a settled routine step.

The latest explicit user direction governs project intent within applicable instructions. Repository and deployment evidence establish implementation state; a handoff alone does not prove a feature exists or works. If records disagree, surface the contradiction and verify it. Do not claim access to memories or worktrees you cannot inspect, or import another project's assumptions. Before implementation, check whether the work already exists, was rejected, or is deferred. Recheck completed work only after a relevant change, concrete regression, or required gate. Do not repeat a failed action without a new hypothesis or evidence.

When suggesting next steps to Tyler, use the newest superseding section and active T01–T11 rows in `docs/project-timeline.md` plus the relevant QA worksheet. Name the task ID, the next concrete safe action, its owner or dependency, and any separate approval gate. Keep newly found defects in the task ledger without allowing them to silently displace the agreed task order.

## During work and at EOD

Record durable accepted decisions and important discoveries when they occur; distinguish them from proposals, experiments, and open questions. Preserve the reason and supersession link when a decision changes. Keep secrets, protected identifiers, customer data, and private support details out of tracked records.

At EOD, reconcile the full T01–T11/deferred ledger and all still-active older constraints; update the concise live [`docs/HANDOFF.md`](docs/HANDOFF.md) and a dated `docs/eod-handoff-YYYY-MM-DD.md` archive. Copy the complete marked Standing Rules block from the template **verbatim** into each dated EOD and run `node scripts/check-eod-standing-rules.mjs`. Keep permanent guidance here and in project context/decisions, not in a growing live handoff. Record the exact branch/commit/worktree, dirty files and transfer status, evidence with its code state, failed approaches, blockers, and one concrete next safe step. Do not push, merge, switch worktrees, or begin tomorrow's feature work just to make an EOD look complete.
