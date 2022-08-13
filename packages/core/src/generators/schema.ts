import { schemaComposer } from 'graphql-compose';
import { composeWithJson } from 'graphql-compose-json';
import { defaultsDeep, get, merge, set } from 'lodash-es';
import plur from 'plur';
import { VFile } from 'vfile';
import { cacheSchema, checkCacheForSchema } from '../cache/cache';

import {
  CollectionEntry,
  ConfigResult,
  EntryNode,
  LoadedCollectionEntry,
  LoadedFlatbreadConfig,
  Source,
  Transformer,
} from '../types';
import { createUniqueId } from '../utils/createUniqueId';
import { getFieldOverrides } from '../utils/fieldOverrides';
import { generateCollection } from './generateCollection';
import { map } from '../utils/map';
import addCollectionMutations from './collectionMutations';
import addCollectionQueries from './collectionQueries';

/**
 * Generates a GraphQL schema from content nodes.
 *
 * @param configResult the result of the config file processing
 */
export async function generateSchema(
  configResult: ConfigResult<LoadedFlatbreadConfig>
) {
  const { config } = configResult;
  if (!config) {
    throw new Error('Config is not defined');
  }

  // Let's see if we have a cached version of the schema. If so, short-circuit and return it.
  const cachedSchema = checkCacheForSchema(config);

  if (cachedSchema) {
    return cachedSchema;
  }

  // Invoke initialize function if it exists and provide loaded config
  config.source.initialize?.(config);

  // Invoke the content source resolver to retrieve the content nodes
  let allContentNodes: Record<string, any> = {};

  let collectionEntriesByName = Object.fromEntries(
    config.content.map((collection: LoadedCollectionEntry) => [
      collection.name,
      collection,
    ])
  );

  const addRecord =
    (sourceId: string) =>
    <Ctx>(
      collection: LoadedCollectionEntry,
      record: EntryNode,
      context: Ctx
    ) => {
      allContentNodes[collection.name] = allContentNodes[collection.name] ?? [];

      const newRecord = {
        record,
        context: {
          sourceContext: context,
          sourcedBy: sourceId,
          collection: collection.name,
          referenceField: collection.referenceField ?? 'id',
        },
      };

      allContentNodes[collection.name].push(newRecord);
      return newRecord;
    };

  function addCreationRequiredFields(
    collection: CollectionEntry,
    fields: string[]
  ): void {
    if (!collectionEntriesByName[collection.name])
      throw new Error(`Couldn't find collection ${collection.name}`);
    collectionEntriesByName?.[collection.name]?.creationRequiredFields?.push(
      ...fields
    );
  }

  await config.source.fetch(config.content, {
    addRecord: addRecord(config.source.id as string),
    addCreationRequiredFields,
  });

  // Transform the content nodes to the expected JSON format if needed
  const allContentNodesJSON = optionallyTransformContentNodes(
    allContentNodes,
    config
  );

  const preknownSchemaFragments = fetchPreknownSchemaFragments(config);

  /**
   * For each content collection, reduce the nodes therein to one singular node containing the set of all fields in the collection. This reduced node for each collection then is fed into a GraphQL collection composer to recursively generate a GraphQL schema.
   *
   * Reducing all the nodes forms a more accurate schema in the case of optional fields which may not exist in some content nodes.
   *
   * */
  const schemaArray = Object.fromEntries(
    Object.entries(allContentNodesJSON).map(([collection, nodes]) => [
      collection,
      composeWithJson(
        collection,
        generateCollection({
          collection,
          nodes,
          config,
          preknownSchemaFragments,
        }),
        { schemaComposer }
      ),
    ])
  );

  const transformersById = {
    ...Object.fromEntries(
      config.transformer.map((transformer) => [transformer.id, transformer])
    ),
    // this will be the default for collections that aren't already `transformedBy` anything
    undefined: config.transformer[0],
  };

  async function updateCollectionRecord(
    collection: CollectionEntry,
    entry: EntryNode & { _metadata: any }
  ) {
    const ctx = entry._metadata;
    const {
      serialize,
      extensions,
      id: transformerId,
    } = transformersById[ctx.transformedBy];

    if (ctx.reference) {
      const index = allContentNodesJSON[ctx.collection].findIndex(
        (c) => get(c, ctx.referenceField) === ctx.reference
      );

      if (index < 0) throw new Error('Failed to find record to update');
      // replace in memory representation of record
      allContentNodesJSON[ctx.collection][index] = entry;
    } else {
      entry._metadata.reference = createUniqueId();
      set(entry, entry._metadata.referenceField, entry._metadata.reference);
      entry._metadata.transformedBy = transformerId;
      entry._metadata.extension = extensions?.[0];
      allContentNodesJSON[ctx.collection].push(entry);
    }

    const { _metadata, ...record } = entry;
    const file = await serialize(record, ctx.transformContext);
    await config?.source.put(file, ctx.sourceContext, {
      parentContext: ctx,
      collection,
      record,
    });

    return entry;
  }

  // Main builder loop - iterate through each content type and generate query resolvers + relationships for it
  for (const [name, objectComposer] of Object.entries(schemaArray)) {
    const pluralName = plur(name, 2);

    //
    /// Global meta fields
    //

    objectComposer.addFields({
      _collection: {
        type: 'String',
        description: 'The collection name',
        resolve: () => name,
      },
    });

    //
    /// Query resolvers
    //

    // TODO: add a new type of plugin that can add resolvers to each collection, they should be called here

    addCollectionQueries({
      name,
      pluralName,
      objectComposer,
      schemaComposer,
      transformersById,
      allContentNodesJSON,
      config,
    });

    addCollectionMutations({
      name,
      pluralName,
      objectComposer,
      schemaComposer,
      updateCollectionRecord,
      config,
      collectionEntry: collectionEntriesByName[name],
    });
  }

  // Create map of references on each content node
  for (const { name, refs } of config.content) {
    const typeTC = schemaComposer.getOTC(name);

    if (!refs) continue;

    Object.entries(refs).forEach(([refField, refType]) => {
      const refTypeTC = schemaComposer.getOTC(refType);

      // If the current content type has this valid reference field as declared in the config, we'll add a resolver for this reference
      if (!typeTC.hasField(refField)) return;
      const refMapsToMultipleNodes = typeTC.isFieldPlural(refField);

      if (refMapsToMultipleNodes) {
        // If the reference field has many nodes
        typeTC.addRelation(refField, {
          description: `All ${plur(
            String(refType),
            2
          )} that are referenced by this ${name}`,
          resolver: () => refTypeTC.getResolver('findMany'),
          prepareArgs: {
            ids: (source) => source[refField],
          },
          projection: { [refField]: true },
        });
      } else {
        // If the reference field has a single node
        typeTC.addRelation(refField, {
          description: `The ${refType} referenced by this ${name}`,
          resolver: () => refTypeTC.getResolver('findById'),
          prepareArgs: {
            id: (source) => source[refField],
          },
          projection: { [refField]: true },
        });
      }
    });
  }

  const schema = schemaComposer.buildSchema();

  cacheSchema(config, schema);

  return schema;
}

/**
 * If the config has a transformer which defines pre-known schema fragments,
 * fetch them and return them as an object.
 *
 * @param config Flatbread config object
 * @returns an object of pre-known schema fragments including resolvers.
 */
const fetchPreknownSchemaFragments = (
  config: LoadedFlatbreadConfig
): Record<string, any> | {} => {
  return config.transformer.reduce(
    (all, next) => merge(all, next.preknownSchemaFragments?.() || {}),
    {}
  );
};

function getTransformerExtensionMap(transformer: Transformer[]) {
  const transformerMap = new Map();
  transformer.forEach((t) =>
    t.extensions.forEach((extension) => transformerMap.set(extension, t))
  );
  return transformerMap;
}

/**
 * Transforms the content nodes to the expected JSON format. If no transformer is defined, the content nodes are returned as is.
 *
 * @param allContentNodes an object of keys and values - content type and content nodes to transform, respectively
 * @param config Flatbread config object
 */
const optionallyTransformContentNodes = (
  allContentNodes: Record<string, any[]>,
  config: LoadedFlatbreadConfig
): Record<string, any[]> => {
  if (config.transformer) {
    const transformerMap = getTransformerExtensionMap(config.transformer);
    // const globs = Object.entries(transformers);

    /**
     * Map through each content type,
     * then map through each content node
     * and transform it with the provided parser
     *
     * @todo if this becomes a performance bottleneck, consider overloading the source plugin API to accept a transform function so we can avoid mapping through the content nodes twice
     * */

    return map(allContentNodes, (node: { record: VFile; context: any }) => {
      const transformer = transformerMap.get(node.record.extname);
      if (!transformer?.parse) {
        throw new Error(`no transformer found for ${node.record.path}`);
      }
      const { record: doc, context } = transformer.parse(node.record);
      doc._metadata = node.context;
      doc._metadata.transformedBy = transformer.id;
      doc._metadata.transformContext = context;
      doc._metadata.reference = get(doc, node.context.referenceField);
      return doc;
    });
  }

  // TODO: might need to map this to attach metadata here
  return allContentNodes;
};
