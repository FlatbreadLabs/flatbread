# Working on Tessera core

- Node 22, no dependencies, no build step. Sources are TypeScript run with
  `--experimental-strip-types`, so use erasable syntax only: no enums,
  namespaces or constructor parameter properties, `import type` for types,
  and explicit `.ts` extensions on relative imports.
- Run the tests with `node --experimental-strip-types --test`.
- Every change to the document goes through a command on the bus
  (`src/commands/`), so it can be undone.
- Format with Prettier defaults plus single quotes.
