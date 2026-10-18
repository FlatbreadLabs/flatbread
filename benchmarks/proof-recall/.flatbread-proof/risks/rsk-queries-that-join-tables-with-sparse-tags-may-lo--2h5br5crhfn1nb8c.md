---
id: rsk-queries-that-join-tables-with-sparse-tags-may-lo--2h5br5crhfn1nb8c
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Queries that join tables with sparse tags may lose cache locality
state: realized
created_at: '2025-09-25T10:00:00Z'
created_by: Rhea Valdés
derives_from:
  - dec-store-components-in-archetype-tables-and-volatil--yxsjd26wcaz6fgx9
evidence:
  - fnd-archetype-iteration-takes-3-4-ms-in-the-alpha-wo--dawb9m0pa999mhpe
likelihood: medium
severity: medium
---
A query such as "every transform that is Submerged" walks an archetype column and probes a sparse set per row. If the sparse set is large and the archetype count grows, the probe pattern could thrash the cache, especially on Skiff's smaller caches.
