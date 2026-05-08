import { Content, EntryNode } from '../types';
import { getNodeIdentifier, normalizeIdentifier } from './ids';

/**
 * Validate that every relation declared via a collection's `refs` config
 * resolves to a record that actually exists in the target collection.
 *
 * Runs after content transforms and ID normalization so it can rely on the
 * same normalized identifier semantics that the GraphQL resolvers and ID
 * validation use. Like ID validation, it aggregates every problem it finds
 * and throws a single error before the schema is built so consumers see all
 * broken edges before query-time surprises.
 */
export function validateCollectionReferences(
  allContentNodesJSON: Record<string, EntryNode[]>,
  content: Content
): void {
  const idsByCollection = collectIdsByCollection(allContentNodesJSON);
  const errors: string[] = [];

  for (const collectionConfig of content) {
    const collection = String(collectionConfig.collection);
    const refs = collectionConfig.refs as Record<string, string> | undefined;
    if (!refs) continue;

    const nodes = allContentNodesJSON[collection];
    if (!nodes) continue;

    for (const node of nodes) {
      for (const [refField, target] of Object.entries(refs)) {
        const targetCollection = String(target);
        const value = (node as Record<string, unknown>)[refField];

        if (value === null || value === undefined) continue;

        const targetIds = idsByCollection.get(targetCollection);

        if (Array.isArray(value)) {
          value.forEach((entry, index) => {
            const failure = checkReference(entry, targetIds);
            if (failure) {
              errors.push(
                formatDiagnostic({
                  collection,
                  node,
                  refField: `${refField}[${index}]`,
                  targetCollection,
                  failure,
                })
              );
            }
          });
        } else {
          const failure = checkReference(value, targetIds);
          if (failure) {
            errors.push(
              formatDiagnostic({
                collection,
                node,
                refField,
                targetCollection,
                failure,
              })
            );
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    errors.sort();
    throw new Error(
      `Flatbread found ${errors.length} broken reference${
        errors.length === 1 ? '' : 's'
      }:\n${errors.map((message) => `- ${message}`).join('\n')}`
    );
  }
}

type ReferenceFailure =
  | { kind: 'missing'; missingId: string }
  | { kind: 'unknownTarget' }
  | { kind: 'invalidShape'; reason: string };

function checkReference(
  value: unknown,
  targetIds: Set<string> | undefined
): ReferenceFailure | undefined {
  let normalized: string;
  try {
    normalized = normalizeIdentifier(value, 'reference value');
  } catch (error) {
    return {
      kind: 'invalidShape',
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  if (!targetIds) {
    return { kind: 'unknownTarget' };
  }

  if (!targetIds.has(normalized)) {
    return { kind: 'missing', missingId: normalized };
  }

  return undefined;
}

interface DiagnosticInput {
  collection: string;
  node: EntryNode;
  refField: string;
  targetCollection: string;
  failure: ReferenceFailure;
}

function formatDiagnostic({
  collection,
  node,
  refField,
  targetCollection,
  failure,
}: DiagnosticInput): string {
  const fieldPath = `${collection}.${refField}`;
  const recordContext = describeRecord(node);

  switch (failure.kind) {
    case 'missing':
      return `${fieldPath}${recordContext} references "${failure.missingId}" but no record with that id exists in collection ${targetCollection}`;
    case 'unknownTarget':
      return `${fieldPath}${recordContext} declares a reference to collection ${targetCollection}, but no such collection is configured`;
    case 'invalidShape':
      return `${fieldPath}${recordContext} has an invalid reference value for collection ${targetCollection}: ${failure.reason}`;
  }
}

function describeRecord(node: EntryNode): string {
  const parts: string[] = [];

  if (typeof node._path === 'string' && node._path.length > 0) {
    parts.push(node._path);
  }

  let recordId: string | undefined;
  try {
    recordId = normalizeIdentifier(node.id);
  } catch {
    recordId = undefined;
  }

  if (recordId !== undefined) {
    parts.push(`record id "${recordId}"`);
  }

  if (parts.length === 0) {
    return '';
  }

  return ` (in ${parts.join(', ')})`;
}

function collectIdsByCollection(
  allContentNodesJSON: Record<string, EntryNode[]>
): Map<string, Set<string>> {
  const idsByCollection = new Map<string, Set<string>>();

  for (const [collection, nodes] of Object.entries(allContentNodesJSON)) {
    const ids = new Set<string>();
    for (const node of nodes) {
      try {
        ids.add(getNodeIdentifier(node, collection));
      } catch {
        // Invalid ids are surfaced by validateCollectionIdentifiers; skip
        // them here so the missing-ref pass can still report what it can.
      }
    }
    idsByCollection.set(collection, ids);
  }

  return idsByCollection;
}
