import { cloneDeep } from 'lodash-es';
import { VFile } from 'vfile';
import {
  FlatbreadArgs,
  LoadedCollectionEntry,
  LoadedFlatbreadConfig,
  Source,
} from '../types';

interface MemContext {
  id: string;
  collectionName: string;
}

export class SourceVirtual implements Source<MemContext> {
  private data: Record<string, any[]> = {};

  public id = '@flatbread/sourceMemory';

  constructor(data: Record<string, any[]>) {
    this.data = data;
  }

  initialize(config: LoadedFlatbreadConfig) {}

  async fetch(
    entries: LoadedCollectionEntry[],
    { addRecord }: FlatbreadArgs<MemContext>
  ) {
    for (const entry of entries) {
      if (!this.data[entry.name])
        throw new Error(`can't find collection ${entry.name}`);
      for (const record of this.data[entry.name]) {
        addRecord(entry, cloneDeep(record), {
          id: record.path,
          collectionName: entry.name,
        });
      }
    }
  }

  async put(doc: VFile, context: MemContext) {
    const record = this.data[context.collectionName].find(
      (entry) => entry.path === context.id
    );

    record.value = doc;

    return { doc, context };
  }
}
