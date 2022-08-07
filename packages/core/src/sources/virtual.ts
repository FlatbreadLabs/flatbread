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

  async put(doc: VFile, context: MemContext, parentContext: any) {
    const record = this.data[parentContext.collection].find(
      (entry) => entry.path === parentContext.reference
    );

    if (record) {
      record.value = doc.value;
    } else {
      this.data[parentContext.collection].push(doc);
    }

    return { doc, context };
  }
}
