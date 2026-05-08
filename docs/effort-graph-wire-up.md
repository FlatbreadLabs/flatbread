# Effort Graph wire-up against repository agent artifacts

This experiment maps the current repository's agent artifact folders to an Effort Graph-style Flatbread preset. It pressure-tests whether Flatbread can answer effort-centric questions without one-off scripts.

## Source layout

The repository already contains representative agent artifacts:

```text
AGENTS.md
.cursor/
├─ agents/
├─ rules/
└─ skills/
.agents/
└─ skills/
flatbread-flow-pmf-audit.md
flatbread-agent-artifact-opportunity.md
flatbread-flow-agentic-workflows.md
```

These files cover three artifact categories:

- persistent workspace instructions (`AGENTS.md`, `.cursor/rules/*.mdc`),
- reusable agent procedures (`.cursor/skills/*/SKILL.md`, `.agents/skills/*/SKILL.md`), and
- effort-level plans/research outputs (`flatbread-flow-*.md`, `flatbread-agent-artifact-opportunity.md`).

## Effort Graph mapping

| Effort Graph entity | Repository mapping                                                                                              | Stable fields                                               | Derived fields                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| `Effort`            | `flatbread-flow-pmf-audit.md`, `flatbread-agent-artifact-opportunity.md`, `flatbread-flow-agentic-workflows.md` | `id`, `title`, `status`, `source_path`                      | source document headings, linked GitHub issue range |
| `Plan`              | PMF audit and agent artifact opportunity sections that define recommended roadmap or validation experiments     | `id`, `effort`, `title`, `source_path`                      | section heading, sequence/order                     |
| `Decision`          | Decision-bearing sections such as "Recommended Thesis", "What Not To Build Yet", "Decision signals"             | `id`, `effort`, `plan`, `blocking`, `status`, `source_path` | body excerpt, heading path                          |
| `Session`           | Cursor agent runs, Mergify stack guidance, and proof DAG run canvases when present                              | `id`, `effort`, `tool`, `started_at`, `source_path`         | branch/run ids from API or artifacts                |
| `Artifact`          | All Markdown/rule/skill files                                                                                   | `id`, `effort`, `session`, `kind`, `source_path`            | title, frontmatter, body text                       |
| `Agent`             | `.cursor/agents/*.md` and skill manifests                                                                       | `id`, `name`, `role`, `source_path`                         | frontmatter and title                               |

## Preset sketch

The following Flatbread config sketch shows how a filesystem preset could load the current layout without moving files:

```js
import { defineConfig, transformerMarkdown, sourceFilesystem } from 'flatbread';

export default defineConfig({
  source: sourceFilesystem(),
  transformer: transformerMarkdown({ markdown: { gfm: true } }),
  content: [
    {
      path: 'flatbread-flow-*.md',
      collection: 'Effort',
    },
    {
      path: 'docs/effort-graph-*.md',
      collection: 'Plan',
      refs: { effort: 'Effort' },
    },
    {
      path: '.cursor/agents/*.md',
      collection: 'Agent',
    },
    {
      path: '.cursor/skills/*/SKILL.md',
      collection: 'Artifact',
      refs: { effort: 'Effort' },
    },
    {
      path: '.agents/skills/*/SKILL.md',
      collection: 'Artifact',
      refs: { effort: 'Effort' },
    },
    {
      path: '.cursor/rules/*.mdc',
      collection: 'Artifact',
      refs: { effort: 'Effort' },
    },
  ],
});
```

The current transformer would need a thin mapping layer for derived IDs and refs because most existing artifacts do not include Effort Graph frontmatter yet.

## Example query

Question:

> For the Flatbread PMF / agent artifact effort, what blocking decisions exist, and what plan or source context produced them?

GraphQL-shaped query over the proposed model:

```graphql
query BlockingDecisions($effort: String!) {
  allDecisions(
    filter: {
      effort: { eq: $effort }
      blocking: { eq: true }
      status: { in: ["accepted", "recommended"] }
    }
    sortBy: "decided_at"
  ) {
    id
    title
    blocking
    status
    source_path
    plan {
      id
      title
      source_path
    }
  }
}
```

Representative result from the current artifact set:

```json
{
  "allDecisions": [
    {
      "id": "do-not-position-as-database-replacement",
      "title": "Do not position Flatbread as a database replacement",
      "blocking": true,
      "status": "recommended",
      "source_path": "flatbread-flow-pmf-audit.md#what-not-to-build-yet",
      "plan": {
        "id": "pmf-roadmap",
        "title": "Recommended Roadmap",
        "source_path": "flatbread-flow-pmf-audit.md#recommended-roadmap"
      }
    },
    {
      "id": "validate-effort-graph-before-primary-wedge",
      "title": "Validate Effort Graph before promoting it to primary wedge",
      "blocking": true,
      "status": "recommended",
      "source_path": "flatbread-agent-artifact-opportunity.md#validation-experiments",
      "plan": {
        "id": "agent-artifact-validation",
        "title": "Validation Experiments",
        "source_path": "flatbread-agent-artifact-opportunity.md#validation-experiments"
      }
    }
  ]
}
```

This is the target retrieval surface: one query returns decisions, blocking status, and plan/source context without stuffing the full PMF and agent opportunity documents into prompt context.

## Friction points and follow-up issues

- Existing artifacts lack consistent frontmatter IDs, effort IDs, and relation fields. Follow-up: add an Effort Graph frontmatter convention or derived-ID mapper.
- Markdown headings contain decision text, but the transformer does not split headings into typed sub-records. Follow-up: prototype section-level extraction for `Plan` and `Decision`.
- `.mdc` Cursor rules have frontmatter plus body content; the current Markdown transformer can parse Markdown but should explicitly preserve rule metadata. Follow-up: document or test `.mdc` ingestion.
- Session/run artifacts live partly outside the repo in Cursor Cloud and local canvas directories. Follow-up: decide whether the preset indexes exported run metadata, local canvases, or both.
- Relation validation must land before this becomes reliable. Missing `Decision.plan` or `Artifact.effort` refs should fail at load time.

## Recommendation

The wire-up is viable as a read-mostly preset if Flatbread adds a thin mapping layer for derived IDs, section extraction, and optional frontmatter. The experiment supports continuing the Effort Graph track, but it should remain dependent on ID normalization and missing-reference validation.
