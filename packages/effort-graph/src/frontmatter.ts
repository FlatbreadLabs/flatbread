import matter from 'gray-matter';
import { FrontmatterSchemas } from './schemas.js';
import type { PrimitiveKind } from './types.js';
const order = [
  'id',
  'effort',
  'title',
  'slug',
  'kind',
  'status',
  'state',
  'created_at',
  'produced_in',
  'created_by',
  'derives_from',
  'supersedes',
  'superseded_by',
  'invalidates',
  'invalidated_by',
  'resolved_by',
  'rejected_by',
  'mitigated_by',
  'evidence',
];
export function canonicalizeFrontmatter(
  input: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of order)
    if (input[key] !== undefined)
      out[key] = Array.isArray(input[key])
        ? [...new Set(input[key] as unknown[])].sort()
        : input[key];
  for (const key of Object.keys(input)
    .filter((k) => !order.includes(k))
    .sort())
    if (input[key] !== undefined) out[key] = input[key];
  return out;
}
export function parseDocument(bytes: Buffer | string, kind?: PrimitiveKind) {
  const parsed = matter(bytes.toString());
  if (kind) FrontmatterSchemas[kind].parse(parsed.data);
  return {
    frontmatter: canonicalizeFrontmatter(parsed.data),
    body: parsed.content,
  };
}
export function serializeDocument(
  body: string,
  frontmatter: Record<string, unknown>
): Buffer {
  return Buffer.from(
    matter.stringify(body, canonicalizeFrontmatter(frontmatter))
  );
}
