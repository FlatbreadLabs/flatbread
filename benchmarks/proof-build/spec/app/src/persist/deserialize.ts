import type { DocumentData, SceneNode } from '../model/types.ts';
import { fail } from '../util/assert.ts';
import { SCHEMA_VERSION, validateDocument, withDefaults } from './schema.ts';
import { migrate } from './migrations/index.ts';

/** Reads a saved file of any known version into current document data. */
export function parseFile(text: string): DocumentData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    fail('bad-file', 'the file is not JSON');
  }
  if (!raw || typeof raw !== 'object')
    fail('bad-file', 'the file is not an object');
  const version = (raw as { version?: unknown }).version;
  if (!Number.isInteger(version) || (version as number) < 1)
    fail('bad-file', 'the file has no schema version');
  if ((version as number) > SCHEMA_VERSION)
    fail(
      'newer-file',
      `the file is version ${version}; this editor reads up to ${SCHEMA_VERSION}`
    );
  const current = migrate(raw as Record<string, unknown>);
  const nodes: Record<string, SceneNode> = {};
  for (const [id, node] of Object.entries(
    current.nodes as Record<string, Record<string, unknown>>
  ))
    nodes[id] = withDefaults(node);
  const data: DocumentData = {
    name: String(current.name ?? 'Untitled'),
    top: current.top as string[],
    nodes,
  };
  validateDocument(data);
  return data;
}
