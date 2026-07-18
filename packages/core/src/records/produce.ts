import type { VFile } from 'vfile';
import type { EntryNode, LoadedFlatbreadConfig, Transformer } from '../types';
import type { FilesByCollection, RecordsByCollection } from './index';

function transformerByExtension(
  transformers: readonly Transformer[]
): Map<string, Transformer> {
  const result = new Map<string, Transformer>();
  for (const transformer of transformers) {
    for (const extension of transformer.extensions) {
      result.set(extension, transformer);
    }
  }
  return result;
}

function stampSourceContext(entry: EntryNode, file: VFile): EntryNode {
  return { ...entry, _path: file.path, _filename: file.basename };
}

export function produceRecords(
  files: FilesByCollection,
  config: LoadedFlatbreadConfig
): RecordsByCollection {
  if (config.transformer.length === 0) {
    return files as unknown as RecordsByCollection;
  }

  const transformers = transformerByExtension(config.transformer);
  const result: RecordsByCollection = {};
  for (const [collection, collectionFiles] of Object.entries(files)) {
    result[collection] = collectionFiles.map((file) => {
      const transformer = transformers.get(file.extname ?? '');
      if (!transformer?.parse) {
        throw new Error(`no transformer found for ${file.path}`);
      }
      return stampSourceContext(transformer.parse(file), file);
    });
  }
  return result;
}
