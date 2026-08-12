---
id: fnd-public-readmes-retain-superseded-live-reload-gui--naafmpvt3pcdes4p
effort: eff-local-runtime-and-ownership-loop--g28gfbb0kdrnpe2t
title: Public READMEs retain superseded live-reload guidance
kind: retrospective
created_at: '2026-07-19T01:30:04.460Z'
derives_from:
  - fnd-unified-watch-loop-is-the-intended-runtime-contr--t9ghag8yqxgf3p5t
---

## Evidence

- `README.md` says reliable live reload is unsupported and tells readers to restart after edits.
- `packages/flatbread/README.md` repeats the same claim and links GitHub issue #65.
- `docs/local-dev-loop.md` documents `flatbread start --watch` as the current unified path: valid content/config edits hot-swap the GraphQL schema while the framework process remains running.
- `packages/flatbread/src/cli/index.ts` exposes `start --watch` as "Hot-swap content and reload config".

## Implication

First-time adopters receive conflicting setup guidance and may choose a restart-only workflow even though the documented supported watcher exists. Update the two README passages to point to the local development loop and preserve only the real package-code/framework restart boundary.
