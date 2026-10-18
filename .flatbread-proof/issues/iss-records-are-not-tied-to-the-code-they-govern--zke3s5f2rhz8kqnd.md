---
id: iss-records-are-not-tied-to-the-code-they-govern--zke3s5f2rhz8kqnd
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Records are not tied to the code they govern
kind: gap
status: open
created_at: '2026-10-18T09:36:40.801Z'
derives_from:
  - dec-compact-an-effort-with-writer-built-superseding--v37k0ef5evtrd59a
cites:
  - cit-agentlore-repo-memory-with-a-ci-staleness-gate--qhgtb5kf0v1chhp6
  - cit-anchored-memory-code-change-staleness-for-agent--pmca309ve03tkdvv
  - cit-ea-graph-artifact-anchored-verification-memory--jh3vnn38h34av2re
---

A Decision can describe code that has since changed, and nothing notices. Agents learn of the drift only by reading the code. Repo-memory tools and research in 2026 converge on the same fix: anchor each claim to the code it rests on and flag it when that code changes.

Proof can do this better than those tools, because Git already gives every file a content hash. A possible shape, which keeps the mutation count fixed:

1. Creates accept `anchors`, such as `path#symbol`. The writer stamps each with the file's Git blob hash, as it stamps `covers` on compactions.
2. `brief` flags live records whose anchored files changed since they were written.
3. A read such as `proof for-path <file>` lists the Decisions that govern a file.
4. A check such as `proof check --verify` fails a pull request that changes anchored code without touching the record, as `bootstrap --verify` fails setup.

The same check should cover graph evidence. At generation 5, 48 live records have `derives_from`; 4 rest on a superseded support and none on an invalidated one. Today that is mostly a pointer to the newer version, but it is the same staleness signal and costs little to add.
