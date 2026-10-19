---
id: rsk-kelp-s-4-mb-dictionary-may-thrash-the-skiff-cach--rv7ac1hedneqkp0v
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Kelp's 4 MB dictionary may thrash the Skiff cache
state: realized
created_at: '2025-10-22T10:00:00Z'
created_by: Rhea Valdés
derives_from:
  - dec-compress-streamed-assets-with-kelp--ezwc5p1tgsgm7v8m
evidence:
  - fnd-kelp-decodes-at-1-1-gb-s-on-skiff-with-a-cold-ca--vef244qjn2mjf07x
likelihood: medium
severity: high
---
Kelp's speed comes from a 4 MB shared dictionary. The October run used a PC with a large cache. Skiff's last-level cache is much smaller, and a dictionary that does not fit could make every decode a cache miss.
