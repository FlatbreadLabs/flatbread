---
id: dec-add-export-cli-and-unified-watch--k9dpxj57yrcv0pbz
effort: eff-local-runtime-and-ownership-loop--g28gfbb0kdrnpe2t
title: Add export CLI and unified watch
state: proposed
created_at: '2026-07-18T19:42:27.717Z'
derives_from:
  - iss-live-reload-and-export-cli-remain-gaps--xe19gzqf654xeyg4
---

Prioritize `flatbread export json/csv` and the unified `flatbread start --watch`
path. The watcher should classify config, content, and documents; validate and
hot-swap valid generations atomically; refresh codegen; and retain the prior
valid graph when a candidate is invalid. Export commands remain open until the
developer-facing CLI workflow is delivered.
