export { generateSchema } from './generators/schema';
export { exportCollectionsAsJson } from './export/json';
export type { JsonExportOptions, JsonExportResult } from './export/json';
export { initializeConfig } from './utils/initializeConfig';
export {
  getNodeIdentifier,
  isIdentifierField,
  normalizeIdentifier,
  normalizeOptionalIdentifier,
} from './utils/ids';
export { validateCollectionReferences } from './utils/references';

export * from './types';
export { FlatbreadProvider } from './providers/base';
