---
id: fnd-github-topic-pages-only-rank-flatbread-in-small--0p910vppn6z2nd3m
effort: eff-flatbread-product-branding--zt7b35sa05kyvhdz
title: GitHub topic pages only rank Flatbread in small niches
kind: measurement
created_at: '2026-08-24T01:46:46.012Z'
cites:
  - cit-github-search-api-topic-counts-24-august-2026--m9s9pj2v1d5fad3p
---

GitHub topic pages sort by stars. FlatbreadLabs/flatbread had 64 stars on 24 August 2026. The live repo had 20 topics, many of them implementation labels (javascript, nodejs, graphql, nextjs).

Search method: GitHub REST `GET /search/repositories?q=topic:<name>&sort=stars`.

Current ranks where Flatbread is already tagged:

- markdown-cms: 13 repos, Flatbread is 1st (next is 50 stars).
- git-cms: 17 repos, Flatbread is 4th after nuxt/content (3661), plentico/plenti (1076), sitepins/sitepins (154).
- git-native: 59 repos, Flatbread is 6th.

Niches not currently tagged where 64 stars would still show:

- file-based-cms: 14 repos; current 2nd has 35 stars, so Flatbread would be 2nd.
- project-memory: 154 repos; top repo has 497 stars; 64 stars should make the first page.
- agent-context: 77 repos; after pingcap/tidb (a 40k-star noise tag) the next repos are 1370, 469, 188, 107, 83, 72, 59. 64 stars should show.

Demand topics people search, but we will not rank yet:

- agent-memory: 2958 repos, top ~71k stars.
- coding-agents: 3244 repos, top ~90k stars.
- context-engineering: 2773 repos, top is a Java guide wearing the tag (~158k).
- context-management: 1321 repos, top ~89k stars.
- llm-memory: 451 repos, top ~15k stars.
- docs-as-code: 368 repos, top ~3.7k stars.
- headless-cms: 1667 repos, Strapi 73k. Real CMS traffic, no rank chance at 64 stars.

Oceans that hide a 64-star repo: ai-agents 77078, markdown 37339, javascript 670087, typescript 413824, nodejs 333467, nextjs 178931.

Empty vanity tags (single-digit repo counts, no searchers): context-alignment, durable-memory, markdown-database.

Dishonest until we ship the surface: mcp (65155), rag (42198), graph-rag (349), claude-code (63170).

This is a measurement of discovery supply and current rank, not of product fit alone.
