# Proof Setup Summary

- **Owned guidelines bundle:** `.flatbread/proof/setup/owned-guidelines.bundle.md` (regenerated)
- **Owned guidelines manifest:** `.flatbread/proof/setup/owned-guidelines.manifest.json`
- **Generated setup DAG:** `.flatbread/proof/setup/setup-dag.json`
- **Freshness check before this run:** manifest bundle hash does not match bundle content; owned guidelines bundle content does not match current source files; manifest metadata changed for .cursor/rules/proof-usage-guardrails.mdc (mtimeMs); manifest metadata changed for AGENTS.md (mtimeMs); packages/proof/README.md changed since last bundle; manifest metadata changed for packages/proof/README.md (mtimeMs); manifest metadata changed for .cursor/skills/proof/SKILL.md (mtimeMs)

## Guidance Sources

- `.cursor/rules/proof-usage-guardrails.mdc` (workspace-rule)
- `AGENTS.md` (workspace-contract)
- `packages/proof/README.md` (package-readme)
- `.cursor/skills/proof/SKILL.md` (skill)
- `.cursor/skills/dag-task-runner/SKILL.md` (skill)

## Gaps

- No Proof setup gaps were detected.

## Maintenance Contract

- If Proof-related work changes rules, docs, skills, prompts, or runtime behavior, update the authoritative source files, run `pnpm -F @flatbread/proof build`, and rerun `pnpm exec proof setup` before concluding so the owned-guidelines bundle and manifest do not go stale.
- Default `proof setup` only refreshes/reuses the owned bundle, computes gaps, and writes the DAG/summary.
- When setup gaps exist, the generated DAG inserts an explicit `proof setup` refresh step after corrective edits so review reads regenerated owned-guidelines artifacts instead of stale pre-edit files.
- Use `proof setup --run-agents` to hand the generated DAG to the existing Proof runner.
