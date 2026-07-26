---
id: iss-implement-crumb-trail-rename-across-packages-cli--316rdzpt80sdxkw1
effort: eff-flatbread-product-branding--zt7b35sa05kyvhdz
title: 'Implement Crumb Trail rename across packages, CLI, paths, and skills'
kind: gap
status: wontfix
created_at: '2026-07-19T03:54:27.962Z'
derives_from:
  - dec-brand-the-agent-memory-surface-as-crumb-trail--tngncepdbwjkh9jc
supersedes:
  - iss-implement-crumb-graph-rename-across-packages-cli--dp6jvt2kafab7m4t
resolved_by:
  - dec-keep-effort-graph-as-the-product-name--r5wr2vdjwjs9bs13
---

Supersedes the Crumb Graph rename Issue. Branding now targets Crumb Trail as the product name (Crumb Graph = datamodel explainer; Effort Graph = technical descriptor).

Implementation remains pending. Likely touchpoints (non-exhaustive): `@flatbread/effort-graph`, `effortGraphContent`, `flatbread effort` CLI, `.flatbread-efforts/`, `.flatbread/effort-graph/`, agent skill name/paths, docs/README copy, error codes (`EFFORT_GRAPH_*`), and dogfood references.

Do not start the mechanical rename until an implementation plan chooses which identifiers move vs stay for compatibility, and how Crumb Trail / Crumb Graph / Effort Graph map onto public vs internal names.
