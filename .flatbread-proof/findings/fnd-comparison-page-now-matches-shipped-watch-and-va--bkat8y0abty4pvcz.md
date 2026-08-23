---
id: fnd-comparison-page-now-matches-shipped-watch-and-va--bkat8y0abty4pvcz
effort: eff-relational-content-foundation--8a8332x4cazgf2k0
title: Comparison page now matches shipped watch and validation
kind: retrospective
created_at: '2026-08-23T09:05:17.857Z'
derives_from:
  - fnd-reference-integrity-is-roadmap-critical--2ss712xpmsfh77xf
supersedes:
  - fnd-pmf-rubric-understates-shipped-validation-and-wa--p04gd8xfknwvz2pe
---

The comparison page previously understated watch and configured-ref checks. This PR rewrote `docs/comparison.md`, so those gaps no longer hold. The old Finding was true of the PMF rubric; the rewrite is the refresh its Implication asked for.

## Evidence

- `docs/comparison.md` rates local development **Medium–Strong** and says `flatbread start --watch` reloads valid content and config. Package code and app refresh still need their own rebuild or restart.
- The same page rates configured `refs` **Strong** and says loading checks for duplicate IDs, missing targets, and invalid reference values run before schema build.
- `docs/local-dev-loop.md` and `packages/flatbread/src/cli/index.ts` still document `start --watch` as the supported path.

## Implication

The buyer-facing comparison page now matches shipped watch and configured-ref validation. Later agents should not treat this as an open docs gap.
