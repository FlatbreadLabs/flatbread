---
id: fnd-dogfooding-the-read-cli-surfaced-three-real-defe--g21hg77x72hdty56
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Dogfooding the read CLI surfaced three real defects
kind: retrospective
created_at: '2026-07-18T20:42:04.325Z'
---

Transferring docs/ onto the graph via the new CLI caught: (1) one-shot CLI commands never exited because config bundling left esbuild watch:true alive; (2) --strict-min-generation was silently dropped by kebab-case option mapping, degrading strict reads to eventual; (3) the engine relation eq comparator matches materialized objects rather than ids, forcing client-side effort-ownership intersection in the projection layer. [session: effort-graph agent runtime, 2026-07-18]
