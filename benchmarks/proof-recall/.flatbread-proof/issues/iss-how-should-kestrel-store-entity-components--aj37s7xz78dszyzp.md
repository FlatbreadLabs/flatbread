---
id: iss-how-should-kestrel-store-entity-components--aj37s7xz78dszyzp
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: How should Kestrel store entity components?
kind: question
status: resolved
created_at: '2025-09-03T09:00:00Z'
created_by: Rhea Valdés
resolved_by:
  - dec-store-components-in-archetype-tables-and-volatil--yxsjd26wcaz6fgx9
---
Kestrel needs one component storage model before gameplay code piles up on it. The candidates are archetype tables (dense columns per component set), sparse sets (one packed array per component type), or a mix of the two. The hard case is the tide: every tide turn flips state on tens of thousands of shoreline entities at once, and whichever layout we pick has to survive that spike.
