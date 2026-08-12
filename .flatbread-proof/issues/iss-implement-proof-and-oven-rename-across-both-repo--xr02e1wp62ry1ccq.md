---
id: iss-implement-proof-and-oven-rename-across-both-repo--xr02e1wp62ry1ccq
effort: eff-flatbread-product-branding--zt7b35sa05kyvhdz
title: Implement Proof and Oven rename across both repos
kind: gap
status: resolved
created_at: '2026-08-12T17:27:41.751Z'
derives_from:
  - dec-name-the-memory-product-proof-and-the-dag-runner--8e1qgp2032607pr2
resolved_by:
  - dec-name-the-memory-product-proof-and-the-dag-runner--8e1qgp2032607pr2
---

Execute the identifier sweep committed by the accepted Decision. Neither product has been released, so this is a clean cut: no compatibility aliases, no npm deprecation window, no major-migration skill.

Order: (1) rename the runner repo Proof → Oven until no `proof` identifiers remain; (2) in flatbread, retarget runner mentions and move `.cursor/skills/proof` → `oven`; (3) rename Effort Graph → Proof (package, CLI, skill, paths, types).

Touchpoint map: `/var/folders/db/9znhb3490mz9l_c21v4f502r0000gn/T/handoff-XXXXXX.md.yhkZaByt5f`. Repos: `/Users/tonyketcham/Code/Github/personal/proof` (runner) and this monorepo (memory).
