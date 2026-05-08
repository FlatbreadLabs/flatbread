# Adversarial Effort Graph schema test

This experiment tests whether one Effort Graph schema plus a thin mapping layer can survive multiple agent harness layouts. It uses three representative inputs:

1. Claude Code-oriented artifacts,
2. Cursor-oriented skills/rules/agents, and
3. GCC-style `.GCC/` memory-as-VCS structures.

## Candidate schema

The shared schema should stay small:

| Entity     | Purpose                                                               | Required stable fields                                       |
| ---------- | --------------------------------------------------------------------- | ------------------------------------------------------------ |
| `Effort`   | The feature, spike, migration, or research thread that owns the work. | `id`, `title`, `status`, `source_path`                       |
| `Plan`     | A scoped plan, roadmap, or implementation strategy for an effort.     | `id`, `effort`, `title`, `status`, `source_path`             |
| `Decision` | A choice, non-goal, blocker, or keep/kill/iterate conclusion.         | `id`, `effort`, `title`, `blocking`, `status`, `source_path` |
| `Session`  | One tool or agent run that produced or consumed artifacts.            | `id`, `effort`, `tool`, `source_path`                        |
| `Artifact` | Any persisted file or section that can provide context.               | `id`, `kind`, `source_path`, `effort`                        |
| `Agent`    | A reusable agent, skill, rule, or role definition.                    | `id`, `name`, `tool`, `source_path`                          |

Optional fields include `plan`, `session`, `created_at`, `updated_at`, `branch`, `commit`, `model`, `owner_agent`, and `tags`.

## Layout 1: Claude Code-oriented artifacts

Representative layout:

```text
CLAUDE.md
.claude/
├─ skills/
│  └─ release-notes/SKILL.md
└─ commands/
   └─ plan.md
.handoff/
├─ FEATURE.md
├─ SPEC.md
├─ DESIGN.md
├─ STATE.md
└─ SESSION.md
```

Stable mapping:

- `CLAUDE.md` -> `Artifact(kind: "manifest")`
- `.claude/skills/*/SKILL.md` -> `Agent` plus `Artifact(kind: "skill")`
- `.handoff/FEATURE.md` -> `Effort`
- `.handoff/DESIGN.md` and `.handoff/SPEC.md` -> `Plan`
- `.handoff/STATE.md` -> `Decision` candidates and current blockers
- `.handoff/SESSION.md` -> `Session`

Tool-specific mapping needs:

- Effort ID may need to come from folder name, frontmatter, or the feature title.
- Decisions may be paragraphs under headings rather than standalone files.
- Sessions often append to one file, so section-level extraction matters.

## Layout 2: Cursor-oriented skills, rules, and agents

Representative layout from this repository:

```text
AGENTS.md
.cursor/
├─ agents/
│  └─ flatbread-architecture-planner.md
├─ rules/
│  └─ flatbread-pmf-workflow.mdc
└─ skills/
   └─ proof/SKILL.md
.agents/
└─ skills/
   └─ mergify-stack/SKILL.md
```

Stable mapping:

- `AGENTS.md` -> `Artifact(kind: "manifest")`
- `.cursor/agents/*.md` -> `Agent`
- `.cursor/rules/*.mdc` -> `Artifact(kind: "rule")`
- `.cursor/skills/*/SKILL.md` and `.agents/skills/*/SKILL.md` -> `Agent` plus `Artifact(kind: "skill")`
- effort-level Markdown docs such as `flatbread-flow-pmf-audit.md` -> `Effort` and `Plan`/`Decision` sections

Tool-specific mapping needs:

- Cursor rules use `.mdc` frontmatter and path globs.
- Skills have YAML frontmatter but represent reusable procedures, not execution sessions.
- Cursor Cloud run IDs and canvas files may be outside the repo, so session ingestion needs an export path or local artifact convention.

## Layout 3: GCC-style `.GCC/` memory-as-VCS

Representative layout:

```text
.GCC/
├─ main.md
├─ metadata.yaml
└─ branches/
   └─ feature-x/
      ├─ commit.md
      ├─ log.md
      └─ metadata.yaml
```

Stable mapping:

- `.GCC/main.md` -> `Effort` or repository-level `Artifact(kind: "memory-root")`
- `.GCC/metadata.yaml` -> metadata fields on `Effort`
- `.GCC/branches/*/metadata.yaml` -> `Session` or branch-scoped `Effort`
- `.GCC/branches/*/commit.md` -> `Decision` and `Artifact`
- `.GCC/branches/*/log.md` -> `Session` transcript artifact

Tool-specific mapping needs:

- GCC branch names may be closer to sessions/checkpoints than product efforts.
- Decisions can be commit-like entries rather than plan-linked sections.
- Merge/branch semantics should remain metadata, not become required Flatbread primitives.

## Stable fields across all layouts

The following fields survive all three layouts:

- `id` (from frontmatter when present, otherwise derived from path + heading),
- `source_path`,
- `kind`,
- `title`,
- `body` or excerpt,
- `effort` (explicit or derived),
- `tool`,
- `status`, and
- `tags`.

## Fields requiring tool-specific mapping

- `session.started_at` / `created_at`: not consistently present.
- `decision.blocking`: often a heading or keyword inference unless frontmatter exists.
- `plan`: strong in handoff docs, weaker in rule/skill-only layouts.
- `agent`: clear for Cursor agents/skills, less explicit in `.GCC/`.
- `branch` and `commit`: native in GCC, optional elsewhere.
- `model`, token counts, and run durations: require exported run metadata.

## Recommendation

One Effort Graph schema plus a thin mapping layer is viable if the schema separates stable core entities from tool-specific adapters:

- Core schema: `Effort`, `Plan`, `Decision`, `Session`, `Artifact`, `Agent`.
- Mapping layer: path conventions, frontmatter aliases, section extraction, derived IDs, and optional run metadata import.
- Validation layer: duplicate IDs, missing refs, invalid relation shapes, and source context in diagnostics.

The opportunity is not too fragmented yet. The primary risk is over-promising automatic semantics from unstructured headings. The first shipping preset should support explicit frontmatter and deterministic derived IDs, then mark inferred `Decision` and `Plan` records as best-effort until validation data improves.
