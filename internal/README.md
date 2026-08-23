# Internal playbooks

This directory holds internal agent playbooks. They are **not end-user
documentation**. End-user docs live under [`docs/`](../docs/).

## Files

- `flatbread-flow-agentic-workflows.md` — agentic-workflows playbook (execution phases, DAG topology, port-5057 safety, failure recovery, human checkpoints).

The agent harness uses this playbook as a living reference:

- `.cursor/agents/flatbread-architecture-planner.md` keeps recommendations aligned with it.
- `.cursor/skills/flatbread-major-migration/SKILL.md` points Oven CLI users at its DAG topology section.

Treat it as operational guidance for schema-migration work. For current
setup and behavior, see the end-user docs under [`docs/`](../docs/) and the
root [`README`](../README.md).
