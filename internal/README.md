# Internal playbooks

This directory holds internal agent playbooks. They are **not end-user
documentation**. End-user docs live under [`docs/`](../docs/).

## Files

- `flatbread-flow-agentic-workflows.md` — agentic-workflows playbook (execution phases, DAG topology, port-5057 safety, failure recovery, human checkpoints).
- `funding/` — funding and support programs for Proof. [`funding/README.md`](./funding/README.md)
  ranks every program the research run kept, with award size, applicant type,
  status, deadline, how to apply, and a pitch angle.
  [`funding/deadlines.md`](./funding/deadlines.md) is the same set as a dated
  calendar. `funding/research/` holds the working lane files behind the report.
  The DAG that wrote them is
  `.cursor/dags/flatbread/dag-funding-research.json`. Re-check any figure on the
  day you apply; funder pages move.

The agent harness uses this playbook as a living reference:

- `.cursor/agents/flatbread-architecture-planner.md` keeps recommendations aligned with it.
- `.cursor/skills/flatbread-major-migration/SKILL.md` points Oven CLI users at its DAG topology section.

Treat it as operational guidance for schema-migration work. For current
setup and behavior, see the end-user docs under [`docs/`](../docs/) and the
root [`README`](../README.md).
