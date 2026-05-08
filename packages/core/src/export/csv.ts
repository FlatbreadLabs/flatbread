import { ConfigResult, EntryNode, LoadedFlatbreadConfig } from '../types';
import { exportCollectionsAsJson, JsonExportOptions } from './json';

export interface CsvExportOptions extends JsonExportOptions {
  delimiter?: ',' | ';' | '\t';
  relationSeparator?: string;
}

export type CsvExportResult = Record<string, string>;

/**
 * Export selected Flatbread collections as deterministic flat CSV views.
 *
 * CSV is intentionally a flat view:
 * - scalar fields are emitted as columns;
 * - scalar arrays and relation-id arrays are joined with `relationSeparator`;
 * - object-valued fields are omitted because they do not have a stable flat
 *   representation yet.
 */
export async function exportCollectionsAsCsv(
  configResult: ConfigResult<LoadedFlatbreadConfig>,
  options: CsvExportOptions = {}
): Promise<CsvExportResult> {
  const json = await exportCollectionsAsJson(configResult, options);
  const delimiter = options.delimiter ?? ',';
  const relationSeparator = options.relationSeparator ?? ';';

  return Object.fromEntries(
    Object.entries(json).map(([collection, records]) => [
      collection,
      serializeCollection(records, delimiter, relationSeparator),
    ])
  );
}

function serializeCollection(
  records: EntryNode[],
  delimiter: string,
  relationSeparator: string
): string {
  const headers = collectHeaders(records);
  if (headers.length === 0) {
    return '';
  }

  const rows = records.map((record) =>
    headers.map((header) => formatCell(record[header], relationSeparator))
  );

  return [headers, ...rows]
    .map((row) =>
      row.map((cell) => escapeCsvCell(cell, delimiter)).join(delimiter)
    )
    .join('\n')
    .concat('\n');
}

function collectHeaders(records: EntryNode[]): string[] {
  const headers = new Set<string>();
  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (isCsvValue(value)) {
        headers.add(key);
      }
    }
  }

  return [...headers].sort((left, right) =>
    left === 'id' ? -1 : right === 'id' ? 1 : compareCodepoint(left, right)
  );
}

function formatCell(value: unknown, relationSeparator: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatScalar(item)).join(relationSeparator);
  }

  return formatScalar(value);
}

function formatScalar(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function escapeCsvCell(cell: string, delimiter: string): string {
  if (cell.includes(delimiter) || /["\n\r]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }

  return cell;
}

function isCsvValue(value: unknown): boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    (Array.isArray(value) &&
      value.every(
        (item) =>
          typeof item === 'string' ||
          typeof item === 'number' ||
          typeof item === 'boolean' ||
          item === null ||
          item === undefined
      ))
  );
}

function compareCodepoint(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
