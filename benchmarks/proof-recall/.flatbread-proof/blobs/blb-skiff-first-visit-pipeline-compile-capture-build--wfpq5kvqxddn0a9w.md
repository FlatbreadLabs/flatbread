---
id: blb-skiff-first-visit-pipeline-compile-capture-build--wfpq5kvqxddn0a9w
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: 'Skiff first-visit pipeline compile capture, build 3810'
kind: json
created_at: '2025-12-09T10:00:00Z'
created_by: Priya Natarajan
---
{
  "capture": "first-visit-pipeline-compiles",
  "platform": "Skiff",
  "firmware": "1.0",
  "build": 3810,
  "districts": {
    "harbor": {
      "unique_pipelines": 1460,
      "first_visit_hitches_over_33ms": 212
    },
    "dunes": {
      "unique_pipelines": 820,
      "first_visit_hitches_over_33ms": 96
    },
    "ruins": {
      "unique_pipelines": 1110,
      "first_visit_hitches_over_33ms": 147
    }
  },
  "compile_ms": {
    "p50": 72,
    "p90": 141,
    "p99": 190,
    "min": 45
  }
}
