# Plan: components

1. Add `isComponent`, `instanceOf` and `overrides` to frame nodes.
2. Files: add the new fields inside the existing v4→v5 migration step so older files pick them up, and keep the schema version at 5.
3. When the main component changes, walk every instance and update its children directly with `doc.update`, one per instance, so instances refresh immediately.
4. Plugins: add `api.getInstances()` to the v1 API, returning the instance nodes so plugins can inspect them.
5. Overrides are stored per instance and re-applied after each sync.
