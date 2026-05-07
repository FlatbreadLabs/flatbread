---
name: mergify-merge-queue
description: Use Mergify merge queue to monitor, inspect, pause, and manage the merge queue. ALWAYS use this skill when checking queue status, investigating PR merge state, pausing/unpausing the queue, or debugging merge failures. Triggers on merge queue, queue status, queue pause, queue show, pause, unpause, frozen, bisecting, batch, CI checks.
---

# Mergify Merge Queue

## Overview

The merge queue serializes PR merges, running CI on temporary merge commits to catch integration failures before they reach the target branch. Use the CLI to monitor queue state, inspect individual PRs, and manage the queue.

## Commands

```bash
mergify queue status                 # Show queue status (batches, waiting PRs)
mergify queue status --branch main   # Filter by branch
mergify queue status --json          # Machine-readable JSON output
mergify queue show <PR_NUMBER>       # Detailed state of a PR in the queue
mergify queue show <PR_NUMBER> -v    # Full checks table and conditions tree
mergify queue show <PR_NUMBER> --json # Machine-readable JSON output
mergify queue pause --reason "..."   # Pause the queue (requires reason)
mergify queue unpause                # Resume the queue
```

## Checking Queue Status

Use `mergify queue status` to see the current state of the merge queue:

- **Batches**: groups of PRs being tested together, shown with their CI status and ETA
- **Waiting PRs**: PRs queued but not yet in a batch, shown with priority and queue time
- **Pause state**: whether the queue is paused and why

Use `--json` when you need to parse the output programmatically.

## Inspecting a PR

Use `mergify queue show <PR_NUMBER>` to check why a PR is stuck or how it's progressing:

- **Position**: where the PR sits in the queue
- **Priority**: which priority rule matched
- **CI state**: whether checks are passing, pending, or failing
- **Conditions**: which merge conditions are met and which are blocking
- Use `-v` (verbose) for the full checks table and conditions tree

## Queue States

| State | Meaning |
|-------|---------|
| `running` | Batch is actively running CI |
| `preparing` | Batch is being set up |
| `bisecting` | Batch failed, bisecting to find the culprit |
| `failed` | CI failed for this batch |
| `merged` | PRs in this batch have been merged |
| `waiting_for_merge` | CI passed, waiting for GitHub to merge |
| `waiting_for_previous_batches` | Blocked on earlier batches completing |
| `waiting_for_batch` | Waiting to be picked up into a batch |
| `waiting_schedule` | Outside the configured merge schedule |
| `frozen` | Queue is paused |

## Pausing and Unpausing

Pause the queue to temporarily halt all merges (e.g., during incidents or deployments):

```bash
mergify queue pause --reason "production incident — halting merges"
mergify queue unpause
```

- Pausing does **not** cancel running CI — it prevents new merges from starting
- The reason is visible to all team members in the queue status
- Use `--yes-i-am-sure` to skip the confirmation prompt in scripts

## Troubleshooting

**PR not entering the queue:**
- Check that the PR's merge conditions are met: `mergify queue show <PR_NUMBER> -v`
- Look at the conditions section for unmet requirements

**PR stuck in queue:**
- Check CI state: `mergify queue show <PR_NUMBER>`
- If checks are failing, inspect the failing checks with `-v`
- If the queue is paused, check who paused it: `mergify queue status`

**Queue moving slowly:**
- Check for failing batches that trigger bisection: `mergify queue status`
- Bisecting batches test PRs individually, which is slower than batch merging
