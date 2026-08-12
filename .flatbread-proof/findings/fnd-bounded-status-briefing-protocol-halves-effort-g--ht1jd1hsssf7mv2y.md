---
id: fnd-bounded-status-briefing-protocol-halves-effort-g--ht1jd1hsssf7mv2y
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Bounded status-briefing protocol halves Effort Graph recall tool calls
kind: measurement
created_at: '2026-07-19T02:03:43.496Z'
---

Controlled experiment on how agents engage with the Effort Graph for the recall question "What open work is being done right now?". Design: 3 model families (Composer 2.5, GPT-5.4, GPT-5.6-Luna) x 2 conditions x 2 reps = 12 isolated, read-only subagents.

- Control: follow the effort-graph skill freely.
- Treatment: a bounded status-briefing protocol - `list --status active` (trust the digest) -> per-effort `records --kinds issue,decision` (read status/state from the digest, never open source markdown) -> `blocking-decisions` only when an effort has an open blocker Issue.

Results (tool_calls_total): Control median 21 (range 12-25); Treatment median 10 (range 7-11). Distributions do not overlap (Control min 12 > Treatment max 11): Mann-Whitney U=0, two-tailed p ~= 0.0022, Cliff delta = 1.0, roughly 52 percent fewer tool calls, consistent across all three model families. Answer quality scored 5/5 against ground truth (4 efforts, 3 open issues, 2 proposed decisions, 0 blocking) in all 12 runs; files_opened_from_source = 0 in every run.

The excess Control cost came from three anti-patterns the protocol removes: (1) running blocking-decisions on every effort when none had an open blocker Issue; (2) copying the skill's over-constrained `--status open --state proposed` filter example, getting 0 records, then re-querying; (3) exploratory drift (effort --help, config globbing, get on a resolved Issue, risk queries).

Caveat: self-reported estimated_bytes_ingested was roughly flat across arms (~22-34k) because digest reads dominate payload. The win is in round-trips / tool-call count and latency, not raw bytes ingested. Scope: one recall question, one graph state (gen 69-70), self-reported counts. [session: effort-graph agent-engagement experiment, 2026-07-18; 12 isolated Cursor subagents]
