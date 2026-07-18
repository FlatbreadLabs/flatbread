import type { ContentNode, EntryNode, LoadedFlatbreadConfig } from '../types';
import { getNodeIdentifier } from '../utils/ids';
import { validateCollectionReferences } from '../utils/references';
import type { RecordsByCollection } from './index';

function sourceContext(node: EntryNode): string {
  return typeof node._path === 'string' ? ` (${node._path})` : '';
}

function validateIdentifiers(
  records: RecordsByCollection
): Record<string, ContentNode[]> {
  const errors: string[] = [];
  const contentNodesByCollection: Record<string, ContentNode[]> = {};

  Object.entries(records).forEach(([collection, nodes]) => {
    const seen = new Map<string, EntryNode>();
    contentNodesByCollection[collection] = [];
    nodes.forEach((node) => {
      try {
        const normalizedId = getNodeIdentifier(node, collection);
        const existing = seen.get(normalizedId);
        if (existing) {
          errors.push(
            `${collection} record id "${normalizedId}" is duplicated after normalization${sourceContext(
              existing
            )}${sourceContext(node)}`
          );
        } else {
          seen.set(normalizedId, node);
        }
        contentNodesByCollection[collection].push(node as ContentNode);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    });
  });

  if (errors.length > 0) {
    errors.sort();
    throw new Error(
      `Flatbread found ${errors.length} invalid record ID${
        errors.length === 1 ? '' : 's'
      }:\n${errors.map((message) => `- ${message}`).join('\n')}`
    );
  }
  return contentNodesByCollection;
}

export function validateRecords(
  records: RecordsByCollection,
  config: LoadedFlatbreadConfig
): Record<string, ContentNode[]> {
  const contentNodesByCollection = validateIdentifiers(records);
  validateCollectionReferences(records, config.content);
  return contentNodesByCollection;
}
