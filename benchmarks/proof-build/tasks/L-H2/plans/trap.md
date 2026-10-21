# Plan: export a frame as SVG

1. Add `src/export/svg.ts` to core and an `editor.files.exportSvg(frameId)` method that returns the SVG text, plus `api.exportSvg()` on plugin API v1 so plugins can use it.
2. Every element gets `id` set to its layer name, so developers can find the layers they know, and a `<title>` with the name for accessibility.
3. Hidden layers are written with `visibility="hidden"` so the structure matches the layers panel.
4. Positions are written as stored.
