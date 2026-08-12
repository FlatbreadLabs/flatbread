---
name: grill-with-efforts
description: Run a relentless one-question-at-a-time planning interview that sharpens vocabulary and journals durable reasoning into the Flatbread Proof. Use when a plan is fuzzy and needs an Proof trail instead of ADRs.
disable-model-invocation: true
---

# Grill with efforts

Run a one-question-at-a-time grilling session using
[effort-modeling](../effort-modeling/SKILL.md).

Offer a recommended answer for each decision, wait for the user's response,
and resolve dependent choices in order. Explore the codebase for facts, but
leave choices to the user. Do not implement the plan until shared understanding
is confirmed.

When an external source informs a choice, create a `WriteCitation` record
instead of pasting the source into another record. Save large content first
with `WriteBlob` when needed, then create the Citation, then create the
Finding or Decision with `cites`. Use `derives_from` to link Findings, Issues,
Constraints, and Risks within the project; use `cites` only for Citation
records. See effort-modeling for details.
