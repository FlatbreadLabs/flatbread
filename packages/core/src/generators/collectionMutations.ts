import { ObjectTypeComposer, SchemaComposer } from 'graphql-compose';
import { merge } from 'lodash-es';
import {
  CollectionContext,
  CollectionEntry,
  EntryNode,
  LoadedFlatbreadConfig,
} from '../types';

export interface AddCollectionMutationsArgs {
  name: string;
  pluralName: string;
  config: LoadedFlatbreadConfig;
  objectComposer: ObjectTypeComposer;
  schemaComposer: SchemaComposer;
  collectionEntry: CollectionEntry;
  updateCollectionRecord: (
    collection: CollectionEntry,
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
    collectionEntry,
  } = args;

  schemaComposer.Mutation.addFields({
    [`update${name}`]: {
      type: objectComposer,
      args: { [name]: objectComposer.getInputTypeComposer() },
      description: `Update a ${name}`,
      async resolve(source, payload) {
        // remove _metadata to prevent injection
        const { _metadata, ...update } = payload[name];

        const targetRecord = objectComposer
          .getResolver('findById')
          .resolve({ args: update });

        // remove supplied key (might not be required)
        delete update[targetRecord._metadata.referenceField];
        const newRecord = merge(targetRecord, update);

        await updateCollectionRecord(collectionEntry, newRecord);

        return newRecord;
      },
    },
    [`create${name}`]: {
      type: objectComposer,
      args: {
        [name]: objectComposer
          .getInputTypeComposer()
          .clone(`${name}CreateInput`)
          .removeField('id'),
      },
      description: `Create a ${name}`,
      async resolve(source, payload, args) {
        const record = merge(payload[name], {
          _metadata: {
            referenceField: collectionEntry.referenceField ?? 'id',
            collection: name,
            transformedBy: collectionEntry?.defaultTransformer,
            sourcedBy: collectionEntry?.defaultSource,
          },
        });

        return await updateCollectionRecord(collectionEntry, record);
      },
    },
  });
}
