---
id: fnd-primary-onboarding-still-bypasses-the-unified-wa--qqvckprax45hyd2y
effort: eff-local-runtime-and-ownership-loop--g28gfbb0kdrnpe2t
title: Primary onboarding still bypasses the unified watch path
kind: retrospective
created_at: '2026-07-19T01:32:26.238Z'
derives_from:
  - fnd-unified-watch-loop-is-the-intended-runtime-contr--t9ghag8yqxgf3p5t
---

## Evidence

- `packages/flatbread/README.md` directs the Next example to `pnpm dev` and later says live reload is unreliable, although the same README and `docs/local-dev-loop.md` identify `flatbread start --watch` as the supported live content/config path.
- `examples/nextjs/README.md` recommends standalone `flatbread codegen --watch` then says the GraphQL server needs a restart for content/schema changes. The local loop explicitly says not to run standalone codegen watch alongside unified watch.
- `examples/nextjs/app/components/BlogIndex.tsx` displays `npx flatbread dev`, but the CLI has no `dev` subcommand.

## Implication

The canonical example steers users toward split, restart-dependent workflows and contains an invalid visible recovery command. Promote `flatbread start --watch -- next dev --turbopack` as the canonical path, describe standalone codegen watch only as a non-unified alternative, and replace the UI command with a valid example-local command.
