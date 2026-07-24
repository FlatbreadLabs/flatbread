---
name: grill-with-efforts
description: Run a relentless one-question-at-a-time planning interview that sharpens vocabulary and journals durable reasoning into the Flatbread Effort Graph. Use when a plan is fuzzy and needs an Effort Graph trail instead of ADRs.
disable-model-invocation: true
---

# Grill with efforts

Run a one-question-at-a-time grilling session using
[effort-modeling](../effort-modeling/SKILL.md).

Offer a recommended answer for each decision, wait for the user's response,
and resolve dependent choices in order. Explore the codebase for facts, but
leave choices to the user. Do not implement the plan until shared understanding
is confirmed.

When external evidence informs a choice, journal it through the Citation
workflow (`WriteBlob` if longform → `WriteCitation` → epistemic write with
`cites`) rather than pasting URLs or longform into epistemic bodies. Use
`derives_from` for in-graph epistemic upstream; typed `cites` are for
Citation records only — see effort-modeling for vernacular cite vs `cites` vs
`derives_from`.
