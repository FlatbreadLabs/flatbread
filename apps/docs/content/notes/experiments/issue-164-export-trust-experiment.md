# Experiment: Issue #164 — export trust experiment

## Question

Does an explicit ownership story plus JSON/CSV export behavior make Flatbread
feel safer to adopt?

## Demo prompt

Use this prompt in interviews or demos after the posts/authors/tags quickstart.
Run command examples from `examples/nextjs`, where `flatbread.config.js` lives:

1. Show raw source files:
   - `examples/content/markdown/posts/example-post.md`
   - `examples/content/markdown/authors/tony.md`
   - `examples/content/markdown/authors/eva.md`
2. Show config-owned relations in `examples/nextjs/flatbread.config.js`.
3. Show the [data ownership story](../../docs/data-ownership.md).
4. Show the snapshot export APIs:

   ```ts
   import {
     exportCollectionsAsCsv,
     exportCollectionsAsJson,
     loadConfig,
   } from 'flatbread';

   const configResult = await loadConfig({ cwd: process.cwd() });

   const json = await exportCollectionsAsJson(configResult, {
     collections: ['Post', 'Author'],
   });

   const csv = await exportCollectionsAsCsv(configResult, {
     collections: ['Post'],
   });
   ```

   See also:

   - [Data ownership](../../docs/data-ownership.md)
   - [Snapshot export docs](../../docs/json-export.md)

5. Explain the exit path:
   - raw files remain usable without Flatbread;
   - JSON snapshots preserve normalized IDs and refs;
   - CSV flat views are spreadsheet-friendly;
   - GraphQL documents/types preserve the app's read shapes.

## Product self-review notes

No external participant interview was available in this execution environment,
so these are product-review notes from the implemented demo path rather than
human interview findings. Treat them as project notes, not external validation.

## Verification transcript

Command (run from `examples/nextjs`):

```bash
node --input-type=module - <<'NODE'
import {
  loadConfig,
  exportCollectionsAsCsv,
  exportCollectionsAsJson,
} from 'flatbread';

const configResult = await loadConfig({ cwd: process.cwd() });
const json = await exportCollectionsAsJson(configResult, {
  collections: ['Post'],
  pathRoot: process.cwd(),
});
const csv = await exportCollectionsAsCsv(configResult, {
  collections: ['Post'],
  pathRoot: process.cwd(),
});

console.log(JSON.stringify(json.Post[0], null, 2).split('\n').slice(0, 12).join('\n'));
console.log('---CSV---');
console.log(csv.Post.split('\n').slice(0, 2).join('\n'));
NODE
```

Trimmed output:

```text
{
  "_content": {
    "raw": "\nLorem ipsum\n"
  },
  "_filename": "b.md",
  "_path": "content/markdown/posts/b.md",
  "_slug": "b",
  "authors": [
    "1111",
    "ab2c"
  ],
  "id": "2348fds-563fdh-59ddsd-3332-09876",
---CSV---
id,_filename,_path,_slug,authors,category,controversial_opinions,rating,research_duration,slurp_factor,soups_tested,tags,temperature_preference,title
2348fds-563fdh-59ddsd-3332-09876,b.md,content/markdown/posts/b.md,b,1111;ab2c,,,44,,,,,,Test post B
```

| Prompt area                 | Trust signal                                         | Remaining concern                                                 |
| --------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| Raw Markdown/YAML files     | Strong: source of truth is visible in Git            | Derived fields / overrides require Flatbread to recompute         |
| JSON export API             | Strong: preserves IDs/refs and validates graph first | API-only today; non-developers need a CLI                         |
| CSV export API              | Medium: useful for spreadsheet review                | Nested fields are omitted and relation arrays are joined IDs      |
| GraphQL introspection/types | Medium: preserves app read contract                  | Requires a working Flatbread schema/server or generated artifacts |
| Data ownership docs         | Strong: clearly states non-goals and exit surfaces   | Needs runnable CLI examples once export commands exist            |

## Keep / kill / iterate

**Iterate based on product self-review.** Export behavior appears to improve the
adoption-trust story because it turns "your files are yours" into concrete
artifacts: raw files, JSON snapshots, CSV flat views, and generated read
contracts.

Do not market this as externally validated or as a complete non-developer export
workflow yet. The trust story becomes materially stronger when JSON/CSV export
has a first-class CLI and when docs include copy-paste commands that write files
to disk.

## Follow-up issue drafts

### Follow-up: Add `flatbread export` CLI for JSON and CSV

**Problem:** Export is currently an API, so adoption demos require a Node script.

**Acceptance criteria:**

- `flatbread export json --collections Post,Author --out snapshots/`
- `flatbread export csv --collections Post --out snapshots/`
- Commands fail with validation diagnostics for broken refs/duplicate IDs.
- Docs use CLI first and API second.

### Follow-up: Add exit-story fixture output

**Problem:** Docs describe export behavior but do not check in example output.

**Acceptance criteria:**

- Add a small `examples/exit-story/` fixture or generated snapshot directory.
- Include JSON and CSV outputs from the posts/authors/tags model.
- Add a test that verifies snapshots are deterministic.

### Follow-up: Interview with two target users

**Problem:** This report contains product-review notes, not external user
feedback.

**Acceptance criteria:**

- Run the demo prompt with at least two TypeScript/static-site developers.
- Record whether JSON/CSV exports increase adoption trust.
- Capture objections and update keep/kill/iterate decision.
