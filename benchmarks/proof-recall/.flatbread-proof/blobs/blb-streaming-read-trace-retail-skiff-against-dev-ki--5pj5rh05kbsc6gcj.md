---
id: blb-streaming-read-trace-retail-skiff-against-dev-ki--5pj5rh05kbsc6gcj
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: 'Streaming read trace, retail Skiff against dev kit'
kind: json
created_at: '2026-02-17T15:00:00Z'
created_by: Priya Natarajan
---
{
  "capture": "stream-trace-0217",
  "route": "coast loop, 10 minutes",
  "units": [
    {
      "unit": "Skiff dev kit",
      "storage": "dev kit SSD",
      "sustained_mb_s": 262,
      "p99_latency_ms": 9
    },
    {
      "unit": "Skiff retail A",
      "storage": "retail flash",
      "sustained_mb_s": 191,
      "p99_latency_ms": 24
    },
    {
      "unit": "Skiff retail B",
      "storage": "retail flash",
      "sustained_mb_s": 188,
      "p99_latency_ms": 27
    }
  ],
  "note": "Dev kits ship a faster SSD than retail units."
}
