---
name: orchestrator-executor
description: Coordinate large, long-running, parallel, architecture-sequenced, or isolated-worktree tasks with a cost-conscious orchestrator/executor model. Use when work needs a dependency graph, multiple agents, staged integration, durable asynchronous coordination, or independently reviewable changes.
---

## Role and routing

The top-level agent is the **orchestrator only**: decompose, schedule, monitor, route information, resolve dependencies, integrate, verify, clean up, and report. When delegation is available, it MUST NOT do routine implementation itself.

Use models by explicit `model` argument in **every** spawned-agent call:

- `claude-fable-5-thinking-high` (Fable 5): orchestration and final synthesis only. NEVER use it for implementation, routine research, tests, formatting, or mechanical work.
- `gpt-5.6-terra-medium` (5.6 Terra): architecture, difficult reasoning, adversarial review, and high-risk decisions.
- `gpt-5.6-luna-medium` (5.6 Luna): implementation, tests, repository searches, formatting, and other bounded execution.

Do not route by vague labels such as “deep-reasoner” or “fast-worker.” If the required model is unavailable, stop and report the constraint; never silently substitute Fable for an executor.

Before spawning, record for every task: `role`, `complexity`, `write_scope`, `dependencies`, `acceptance_criteria`, and `expected_deliverable`. Represent tasks as a dependency graph and move only dependency-free tasks to `ready`.

## Ownership and lifecycle

Task states are: `pending` → `ready` → `running` → (`blocked` | `failed` | `completed`) → `integrating` → `verified`.

- Parallelize only independent tasks. Each writing worker exclusively owns assigned files or its worktree; concurrent workers MUST NOT edit the same files.
- Workers must report scope overlap before editing anything outside their assignment.
- Use worktrees for overlapping timelines, risky work, competing implementations, or independently reviewable units. Skip them for small read-only or strictly disjoint work when isolation costs more than it saves.
- The orchestrator creates worktrees and branches, assigns ownership, chooses integration order, resolves conflicts, verifies, and cleans up. Workers never merge, rebase, push, or modify another worker’s worktree unless explicitly told to.
- Every writing worker returns: branch/worktree, changed files, verification results, unresolved risks, and integration instructions.

## Communication and context

Subagents cannot message sibling agents directly. The orchestrator is the sole router: prefer native completion events and orchestrator-issued follow-up prompts for control and prompt delivery. A filesystem board is durable, pull-based coordination only; it neither wakes workers nor replaces follow-up messaging. Do not keep workers alive merely to poll shared state.

For durable asynchronous coordination, the orchestrator creates a run-specific board directory **outside all worker worktrees** and passes its absolute path to each worker. Use one atomic JSON event file per message (write a temporary file, then rename it); never concurrently append to a shared file.

```json
{
  "event_id": "evt-001",
  "run_id": "run-2026-07-17-a",
  "timestamp": "2026-07-17T23:47:00Z",
  "sender": "impl-schema",
  "recipient": "orchestrator",
  "task_id": "schema",
  "type": "blocked",
  "summary": "Need the chosen identifier invariant.",
  "artifact_paths": [],
  "blocked_by": ["architecture-decision"],
  "requested_action": "Provide the invariant and resume instructions."
}
```

Allowed `type` values: `started`, `progress`, `finding`, `question`, `blocked`, `artifact_ready`, `verification`, `failed`, `completed`. Workers emit only meaningful events—on a material finding, blocker, artifact, verification result, failure, or completion—not heartbeats or continuous polling.

The orchestrator consumes each event once, checkpoints its event cursor, and compacts or archives consumed events. It reads the board at bounded orchestration checkpoints or after native completion—not through worker polling. The board holds durable coordination state only; it does not replace direct follow-up prompts or justify copying an expanding transcript into worker context.

Keep orchestrator context to task state, short summaries, decisions, ownership, and artifact paths. Give workers only their task contract, relevant upstream summaries, permitted paths, board path, and acceptance criteria. Put detailed results in artifacts and reference paths.

## Failure, escalation, and termination

Set bounded retry and idle/timeout limits when launching a task. On failure, record evidence, change the prompt or framing, and retry only when that change makes progress plausible. Cancel obsolete work and replace a worker with a newly scoped task when appropriate.

Escalate a Luna task to Terra only after recording the failure evidence and reframing the decision or reasoning problem. Never blindly retry an unchanged prompt. The orchestrator completes only after integration verification, worktree/board cleanup, and a concise delivery report.

## Compact execution example

1. Create isolated worktrees and graph: `architecture` (Terra, no writes) → `api` and `ui` (independent Luna implementation tasks).
2. Spawn Terra with `model: "gpt-5.6-terra-medium"` to choose the interface contract. Route its short decision artifact to both Luna tasks.
3. Spawn the two Luna workers in parallel with `model: "gpt-5.6-luna-medium"`, exclusive worktrees and the board path. The `api` worker emits a `blocked` event requesting a field invariant.
4. The orchestrator reads and checkpoints that event, sends a native follow-up prompt with Terra’s invariant to `api`, and does not ask `ui` to poll.
5. After both workers complete, the orchestrator integrates branches in dependency order, runs final verification, archives the board, removes worktrees, and reports changed artifacts plus verification.

## Before spawning

- [ ] Is the task classified with role, complexity, write scope, dependencies, deliverable, and acceptance criteria?
- [ ] Is the selected explicit model permitted for that role (never Fable for execution)?
- [ ] Are write scopes exclusive and graph dependencies satisfied?
- [ ] Are worktrees justified, owned by the orchestrator, and paired with a known integration order?
- [ ] Does every worker have only required context, an absolute board path if needed, and a clear return contract?

## Done when

- [ ] Every executor used explicit Terra or Luna model routing; no implementation silently used Fable.
- [ ] Dependencies, ownership, events, blockers, retries, and escalations were recorded and routed by the orchestrator.
- [ ] Integration verification passed, worktrees and board artifacts were cleaned up or archived, and the delivery report is concise.
