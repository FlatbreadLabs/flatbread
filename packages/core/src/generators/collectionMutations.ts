import { SchemaComposer } from 'graphql-compose';
import { get, merge } from 'lodash-es';
import { ReferenceAlreadyExistsError } from '../errors';
import { CollectionContext, CollectionResolverArgs, EntryNode } from '../types';

export default function addCollectionMutations(
  schemaComposer: SchemaComposer,
  args: CollectionResolverArgs
) {
  const { name, objectTypeComposer, updateCollectionRecord, collectionEntry } =
    args;

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
    const existingRecordWithId = await objectTypeComposer
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

      if (!Object.hasOwn(payload[name], field))
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
      type: objectTypeComposer,
      args: {
        [name]: objectTypeComposer
          .getInputTypeComposer()
          .makeFieldNonNull(collectionEntry.creationRequiredFields),
      },
      description: `Update a ${name}`,
      async resolve(source: unknown, payload: Record<string, EntryNode>) {
        const { _metadata, ...args } = payload?.[name];

        const existingRecord = objectTypeComposer
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
    },
    [`create${name}`]: {
      type: objectTypeComposer,
      args: {
        [name]: objectTypeComposer
          .getInputTypeComposer()
          .makeFieldNonNull(collectionEntry.creationRequiredFields),
      },
      description: `Create a ${name}`,
      resolve: create,
    },
    [`upsert${name}`]: {
      type: objectTypeComposer,
      args: { [name]: objectTypeComposer.getInputTypeComposer() },
      async resolve(source: unknown, payload: Record<string, EntryNode>) {
        const { _metadata, ...args } = payload?.[name];

        const existingRecord = objectTypeComposer
          .getResolver('findByReferenceField')
          .resolve({ args });

        if (existingRecord) return update(payload, existingRecord);
        create(source, payload);
      },
    },
  });
}
