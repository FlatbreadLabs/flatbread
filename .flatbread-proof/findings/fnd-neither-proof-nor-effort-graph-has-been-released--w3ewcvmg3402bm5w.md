---
id: fnd-neither-proof-nor-effort-graph-has-been-released--w3ewcvmg3402bm5w
effort: eff-flatbread-product-branding--zt7b35sa05kyvhdz
title: Neither Proof nor Effort Graph has been released
kind: measurement
created_at: '2026-08-12T17:27:19.564Z'
---

Owner confirmation: the DAG runner (`@flatbread/proof`, GitHub FlatbreadLabs/proof) and the agent-memory package (`@flatbread/effort-graph`) have not shipped to external users. In-repo CHANGELOG 1.0 copy describes both packages, but that is not a public release.

Consequence for naming: identifier reuse is a clean cut. There is no npm deprecation window, no major-version compatibility story, and no need to keep `@flatbread/proof` meaning the runner for existing lockfiles. GitHub may still redirect if the runner repo is renamed; memory stays in the Flatbread monorepo and does not need that GitHub name.
