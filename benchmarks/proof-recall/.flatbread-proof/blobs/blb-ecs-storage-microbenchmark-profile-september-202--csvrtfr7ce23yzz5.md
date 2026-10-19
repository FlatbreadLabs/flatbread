---
id: blb-ecs-storage-microbenchmark-profile-september-202--csvrtfr7ce23yzz5
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: 'ECS storage microbenchmark profile, September 2025'
kind: json
created_at: '2025-09-09T14:00:00Z'
created_by: Rhea Valdés
---
{
  "capture": "ecs-bench run-0909",
  "machine": "PC dev box, 16 cores, DDR5-5600",
  "entities": 1000000,
  "spawn_templates": 1,
  "archetype_count": 3,
  "layouts": [
    {
      "layout": "archetype_tables",
      "iterate_transforms_ms": 1.9,
      "add_remove_component_ns": 380,
      "memory_mb": 212
    },
    {
      "layout": "sparse_sets",
      "iterate_transforms_ms": 4.6,
      "add_remove_component_ns": 45,
      "memory_mb": 340
    },
    {
      "layout": "hybrid",
      "iterate_transforms_ms": 2.1,
      "add_remove_component_ns": 52,
      "memory_mb": 236
    }
  ]
}
