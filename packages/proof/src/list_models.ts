/**
 * Helper: print models available to your Cursor account, with their valid
 * parameter ids/values and preset variants. Use this to discover the exact
 * `params` to put inside `.models` (e.g. Max Mode + thinking effort) since
 * parameter ids are server-side and per-model.
 *
 * Requires CURSOR_API_KEY in the environment.
 *
 * Usage (from this `scripts/` directory):
 *   pnpm install
 *   pnpm tsx list_models.ts                  # list all models (id + displayName)
 *   pnpm tsx list_models.ts <model-id>       # filter to one model and print full params
 *   pnpm tsx list_models.ts --json [<id>]    # raw JSON output
 *   pnpm tsx list_models.ts --grep <substr>  # case-insensitive substring filter
 */

import process from 'node:process';
import { Cursor } from '@cursor/sdk';
import type { ModelListItem } from '@cursor/sdk';

interface CliArgs {
  filter?: string;
  grep?: string;
  json: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = { json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') {
      out.json = true;
      continue;
    }
    if (a === '--grep') {
      const next = argv[++i];
      if (!next) throw new Error('--grep requires a value');
      out.grep = next;
      continue;
    }
    if (!a.startsWith('--') && out.filter === undefined) {
      out.filter = a;
      continue;
    }
    throw new Error(`Unrecognized arg: ${a}`);
  }
  return out;
}

function selectModels(models: ModelListItem[], args: CliArgs): ModelListItem[] {
  let out = models;
  if (args.filter) {
    out = out.filter((m) => m.id === args.filter);
    if (out.length === 0) {
      const ids = models.map((m) => m.id).sort();
      throw new Error(
        `No model matched id "${args.filter}". Known ids:\n  ${ids.join(
          '\n  '
        )}`
      );
    }
  }
  if (args.grep) {
    const needle = args.grep.toLowerCase();
    out = out.filter(
      (m) =>
        m.id.toLowerCase().includes(needle) ||
        m.displayName.toLowerCase().includes(needle)
    );
  }
  return out;
}

function renderHumanReadable(
  models: ModelListItem[],
  detailed: boolean
): string {
  const lines: string[] = [];
  for (const model of models) {
    lines.push(`${model.id}  —  ${model.displayName}`);
    if (model.description) {
      lines.push(`  ${model.description}`);
    }
    if (!detailed) continue;
    const params = model.parameters ?? [];
    if (params.length === 0) {
      lines.push('  parameters: (none)');
    } else {
      lines.push('  parameters:');
      for (const p of params) {
        const label = p.displayName ? ` (${p.displayName})` : '';
        const values = p.values
          .map((v) => (v.displayName ? `${v.value}/${v.displayName}` : v.value))
          .join(', ');
        lines.push(`    - id="${p.id}"${label}  values=[${values}]`);
      }
    }
    const variants = model.variants ?? [];
    if (variants.length > 0) {
      lines.push('  variants:');
      for (const v of variants) {
        const def = v.isDefault ? '  [default]' : '';
        const variantParams = v.params
          .map((p) => `${p.id}=${p.value}`)
          .join(', ');
        lines.push(
          `    - "${v.displayName}"${def}  -> { params: [${variantParams}] }`
        );
        if (v.description) lines.push(`      ${v.description}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

async function main(): Promise<void> {
  if (!process.env.CURSOR_API_KEY) {
    throw new Error(
      'CURSOR_API_KEY is not set. Export it or `set -a && source .env && set +a` first.'
    );
  }
  const args = parseArgs(process.argv.slice(2));
  const models = await Cursor.models.list();
  const filtered = selectModels(models, args);
  if (args.json) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }
  const detailed = Boolean(args.filter);
  console.log(renderHumanReadable(filtered, detailed));
  if (!detailed) {
    console.log(
      `\n(${filtered.length} model${
        filtered.length === 1 ? '' : 's'
      }; pass an id to see parameters and variants)`
    );
  }
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[list_models] ${msg}`);
  process.exit(1);
});
