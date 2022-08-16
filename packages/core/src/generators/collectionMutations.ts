import { ObjectTypeComposer, SchemaComposer } from 'graphql-compose';
import { get, merge } from 'lodash-es';
import { ReferenceAlreadyExistsError } from '../errors';
import {
  CollectionContext,
  CollectionEntry,
  EntryNode,
  LoadedCollectionEntry,
  LoadedFlatbreadConfig,
} from '../types';

export interface AddCollectionMutationsArgs {
  name: string;
  pluralName: string;
  config: LoadedFlatbreadConfig;
  objectComposer: ObjectTypeComposer;
  schemaComposer: SchemaComposer;
  collectionEntry: LoadedCollectionEntry;
  updateCollectionRecord: (
    collection: CollectionEntry,
    entry: EntryNode & { _metadata: Partial<CollectionContext> }
  ) => Promise<EntryNode>;
}

export default function addCollectionMutations(
  args: AddCollectionMutationsArgs
): void {
  const {
    name,
    objectComposer,
    schemaComposer,
    updateCollectionRecord,
    collectionEntry,
  } = args;

  async function update(
    payload: Record<string, EntryNode>,
    existing: EntryNode
  ) {
    // remove _metadata to prevent injection
    const { _metadata, ...update } = payload?.[name];

    // remove supplied key (might not be required)
    delete update[existing._metadata.referenceField];
    const newRecord = merge(existing, update);

    await updateCollectionRecord(
      collectionEntry,
      newRecord as EntryNode & { _metadata: Partial<CollectionContext> }
    );

    return newRecord;
  }

  async function create(source: unknown, payload: Record<string, EntryNode>) {
    const existingRecordWithId = await objectComposer
      .getResolver('findByReferenceField')
      .resolve({ args: payload[name] });

    if (existingRecordWithId) {
      throw new ReferenceAlreadyExistsError(
        payload[name],
        name,
        existingRecordWithId._metadata
      );
    }

    collectionEntry.creationRequiredFields.forEach((field) => {
      // const

      if (Object.hasOwn(payload[name], field))
        throw new Error(
          `field ${field} is required when creating a new ${name}`
        );
    });

    const record = merge(payload[name], {
      _metadata: {
        referenceField: collectionEntry.referenceField ?? 'id',
        collection: name,
        transformedBy: collectionEntry?.defaultTransformer,
        sourcedBy: collectionEntry?.defaultSource,
      } as CollectionContext,
    });

    return await updateCollectionRecord(collectionEntry, record);
  }

  schemaComposer.Mutation.addFields({
    [`update${name}`]: {
      type: objectComposer,
      args: {
        [name]: objectComposer
          .getInputTypeComposer()
          .makeFieldNonNull(collectionEntry.creationRequiredFields),
      },
      description: `Update a ${name}`,
      async resolve(source: unknown, payload: Record<string, EntryNode>) {
        const { _metadata, ...args } = payload?.[name];

        const existingRecord = objectComposer
          .getResolver('findByReferenceField')
          .resolve({ args });

        if (!existingRecord)
          throw new Error(
            `${name} with ${collectionEntry.referenceField} of ${get(
              args,
              collectionEntry.referenceField
            )} not found`
          );
        return update(payload, existingRecord);
      },
      update,
    },
    [`create${name}`]: {
      type: objectComposer,
      args: {
        [name]: objectComposer
          .getInputTypeComposer()
          .makeFieldNonNull(collectionEntry.creationRequiredFields),
      },
      description: `Create a ${name}`,
      resolve: create,
    },
    [`upsert${name}`]: {
      type: objectComposer,
      args: { [name]: objectComposer.getInputTypeComposer() },
      async resolve(source: unknown, payload: Record<string, EntryNode>) {
        const { _metadata, ...args } = payload?.[name];

        const existingRecord = objectComposer
          .getResolver('findByReferenceField')
          .resolve({ args });

        if (existingRecord) return update(payload, existingRecord);
        create(source, payload);
      },
    },
  });
}
