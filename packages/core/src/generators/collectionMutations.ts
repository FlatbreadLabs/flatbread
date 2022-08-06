import { ObjectTypeComposer, SchemaComposer } from 'graphql-compose';
import { merge } from 'lodash-es';
import {
  CollectionContext,
  EntryNode,
  LoadedFlatbreadConfig,
  Transformer,
} from '../types';

export interface AddCollectionMutationsArgs {
  name: string;
  pluralName: string;
  config: LoadedFlatbreadConfig;
  objectComposer: ObjectTypeComposer;
  schemaComposer: SchemaComposer;
  updateCollectionRecord: (
    entry: EntryNode & { _metadata: CollectionContext }
  ) => Promise<EntryNode>;
}

export default function addCollectionMutations(
  args: AddCollectionMutationsArgs
) {
  const {
    name,
    pluralName,
    config,
    objectComposer,
    schemaComposer,
    updateCollectionRecord,
  } = args;

  schemaComposer.Mutation.addFields({
    [`update${name}`]: {
      type: objectComposer,
      args: { [name]: objectComposer.getInputType() },
      description: `Update or create a ${name}`,
      async resolve(source, payload) {
        // remove _metadata to prevent injection
        const { _metadata, ...update } = source.author;

        const targetRecord = objectComposer
          .getResolver('findById')
          .resolve({ args: update });

        // remove supplied key (might not be required)
        delete update[targetRecord._metadata.referenceField];
        const newRecord = merge(targetRecord, update);

        await updateCollectionRecord(newRecord);

        return newRecord;
      },
    },
  });
}
