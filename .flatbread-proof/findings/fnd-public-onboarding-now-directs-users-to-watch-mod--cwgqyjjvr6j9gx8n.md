---
id: fnd-public-onboarding-now-directs-users-to-watch-mod--cwgqyjjvr6j9gx8n
effort: eff-local-runtime-and-ownership-loop--g28gfbb0kdrnpe2t
title: Public onboarding now directs users to watch mode
kind: retrospective
created_at: '2026-07-19T01:53:00.252Z'
derives_from:
  - fnd-pmf-rubric-understates-shipped-validation-and-wa--p04gd8xfknwvz2pe
  - fnd-primary-onboarding-still-bypasses-the-unified-wa--qqvckprax45hyd2y
  - fnd-public-readmes-retain-superseded-live-reload-gui--naafmpvt3pcdes4p
---

## Evidence

- The Next.js `dev` script now starts `flatbread start --watch`, and contributor and example guides use the same development command.
- The main README, example README, and comparison page now explain that valid content and config changes reload with watch mode. They keep the real limits for package rebuilds and framework refreshes.
- The example empty state now shows the valid `pnpm dev` command instead of the unsupported `flatbread dev`.
- Public guides now use plainer language, move internal planning details out of the first-use path, and link to the glossary when readers need product terms.

## Verification

Formatting, type checks, and generated-skill checks completed after the documentation changes.
