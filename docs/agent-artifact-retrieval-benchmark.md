# Agent artifact retrieval benchmark

This benchmark compares cold-start context stuffing against Flatbread-mediated retrieval over a representative multi-session artifact set from this repository.

## Benchmark set

The representative set uses three effort-level artifacts:

| Artifact                                  | Role                                           |      Bytes |     Words | Estimated tokens |
| ----------------------------------------- | ---------------------------------------------- | ---------: | --------: | ---------------: |
| `flatbread-flow-pmf-audit.md`             | PMF roadmap and decisions                      |     11,612 |     1,558 |            2,073 |
| `flatbread-agent-artifact-opportunity.md` | Effort Graph thesis and validation experiments |     19,750 |     2,254 |            2,998 |
| `flatbread-flow-agentic-workflows.md`     | Agentic workflow context                       |     13,139 |     1,630 |            2,168 |
| **Total cold-start context**              |                                                | **44,501** | **5,442** |        **7,239** |

Token estimates use a coarse word-count proxy of `ceil(words * 1.33)`. The exact tokenizer will vary by model, but the comparison is sufficient for directional product validation.

## Retrieval task

Question:

> What blocking decisions affect whether Flatbread should promote Effort Graph from a secondary validation track to a primary product wedge?

Cold-start baseline:

- Put all three artifacts into context.
- Ask the model to identify blocking decisions and cite source context.
- Cost proxy: ~7,239 input tokens before the question and answer.

Flatbread-mediated retrieval target:

- Index artifacts as `Effort`, `Plan`, `Decision`, and `Artifact` records.
- Query `Decision` where `blocking = true` and `effort` is the PMF / agent artifact track.
- Expand the linked `Plan` and source path fields only.

Representative retrieved context:

```json
{
  "decisions": [
    {
      "id": "do-not-position-as-database-replacement",
      "title": "Do not position Flatbread as a database replacement",
      "blocking": true,
      "source_path": "flatbread-flow-pmf-audit.md#what-not-to-build-yet",
      "plan": "flatbread-flow-pmf-audit.md#recommended-roadmap"
    },
    {
      "id": "validate-effort-graph-before-primary-wedge",
      "title": "Validate Effort Graph before promoting it to primary wedge",
      "blocking": true,
      "source_path": "flatbread-agent-artifact-opportunity.md#validation-experiments",
      "plan": "flatbread-agent-artifact-opportunity.md#validation-experiments"
    }
  ]
}
```

Cost proxy for the selected decision context is ~32 tokens before JSON punctuation and field names, or roughly two orders of magnitude less than stuffing the full artifact set.

## Continuity and answer-quality tradeoff

| Approach                     |                                                                                      Prompt/token cost | Continuity benefit                                                                                                 | Answer-quality risk                                                                                 |
| ---------------------------- | -----------------------------------------------------------------------------------------------------: | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Cold-start stuffing          |                      High: ~7.2k tokens for this small set; grows linearly with each session artifact. | Strong if the model reads everything and does not miss relevant sections.                                          | The model may overfit to recent or verbose text, and repeated full-context use is expensive.        |
| Flatbread-mediated retrieval | Low for targeted questions; context can stay focused on matching decisions plus linked plans/sessions. | Strong when IDs, refs, and validation are reliable because the same decision remains discoverable across sessions. | Weak if mapping/inference misses headings, frontmatter is absent, or broken refs are not validated. |

## Summary

Filtered retrieval appears strong enough to justify further Flatbread product investment in MCP and generated TypeScript query surfaces for agent artifacts, provided the foundational data-model work lands first:

1. stable ID semantics,
2. section/frontmatter mapping,
3. duplicate-ID and missing-reference validation,
4. source-path citations, and
5. a minimal Effort Graph preset.

The benchmark is not yet proof of user adoption or final answer quality. It does show substantial retrieval leverage: a small, typed query can replace thousands of prompt tokens while preserving the source links needed for continuity.
