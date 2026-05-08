import { EntryNode, IdentifierField } from '../types';

export type NormalizedIdentifier = string;

/**
 * Normalize a Flatbread record or relation identifier to the single comparison
 * form used by internal resolvers and GraphQL query arguments.
 */
export function normalizeIdentifier(
  value: unknown,
  context = 'ID'
): NormalizedIdentifier {
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  throw new Error(
    `${context} must be a non-empty string or finite number identifier.`
  );
}

/**
 * Normalize a GraphQL/query argument identifier if it was supplied. Flatbread's
 * GraphQL ID arguments are optional today, so omitted IDs should preserve the
 * existing "no match" behavior rather than throwing.
 */
export function normalizeOptionalIdentifier(
  value: unknown,
  context = 'ID'
): NormalizedIdentifier | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return normalizeIdentifier(value, context);
}

/**
 * Return a content node's normalized identifier with collection-aware context
 * for diagnostics.
 */
export function getNodeIdentifier(
  node: EntryNode,
  collection: string
): NormalizedIdentifier {
  return normalizeIdentifier(
    node.id,
    `${collection} record id${sourceContext(node)}`
  );
}

export function isIdentifierField(value: unknown): value is IdentifierField {
  try {
    normalizeIdentifier(value);
    return true;
  } catch {
    return false;
  }
}

function sourceContext(node: EntryNode): string {
  return typeof node._path === 'string' ? ` (${node._path})` : '';
}
