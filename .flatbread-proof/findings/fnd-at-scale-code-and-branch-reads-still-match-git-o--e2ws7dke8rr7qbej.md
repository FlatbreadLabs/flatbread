---
id: fnd-at-scale-code-and-branch-reads-still-match-git-o--e2ws7dke8rr7qbej
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: 'At scale, code and branch reads still match git on accuracy'
kind: measurement
created_at: '2026-10-20T08:19:29.482Z'
derives_from:
  - fnd-code-and-branch-reads-halve-the-reading-on-a-sma--4ffp9s93s9swpctv
---

The Phase 2 trial was rerun on a test bed ten times larger: the 10x graph (5,131 records), about 470 code files with filler that grep cannot tell apart, and ten branches with filler conflicts. Haiku answered the same 44 code and branch questions twice, with `proof find --path` and `--refs all` or with read-only git alone.

- Accuracy matched again: 85 against 85 of 88 question-runs (1 to 1), as on the small bed (85 against 84).
- The new reads read 41 percent fewer tokens (13,422 against 22,829) and made 7 tool calls instead of 15.

Unlike search over record text, these reads do not gain accuracy at scale, because git is already a precise index for code: `git log -- <path>` and `git diff main...origin/<branch>` stay small as the graph grows. `--path` and `--refs` are worth keeping for cost. A test that could show more would ask about code no single path names, or about many branches at once.
