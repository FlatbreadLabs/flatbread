import { schemaComposer } from 'graphql-compose';
import { composeWithJson } from 'graphql-compose-json';
import { cloneDeep, merge } from 'lodash-es';
import plur from 'plur';
import { VFile } from 'vfile';
import { cacheSchema, checkCacheForSchema } from '../cache/cache';
import {
  generateArgsForAllItemQuery,
  generateArgsForManyItemQuery,
  generateArgsForSingleItemQuery,
} from '../generators/arguments';
import resolveQueryArgs from '../resolvers/arguments';
import {
  ConfigResult,
  AnyContentNode,
  LoadedFlatbreadConfig,
  Transformer,
} from '../types';
import { map } from '../utils/map';
import { generateCollection } from './generateCollection';

interface RootQueries {
  maybeReturnsSingleItem: string[];
  maybeReturnsList: string[];
}

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
  const allContentNodes = await config.source.fetch(config.content);

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

  /**
   * @todo potentially able to remove this
   **/
  const queries: RootQueries = {
    maybeReturnsSingleItem: [],
    maybeReturnsList: [],
  };

  // Main builder loop - iterate through each content type and generate query resolvers + relationships for it
  for (const [type, schema] of Object.entries(schemaArray)) {
    const pluralType = plur(type, 2);
    const pluralTypeQueryName = 'all' + pluralType;
    const contentNodes = allContentNodesJSON[type];

    //
    /// Global meta fields
    //

    schema.addFields({
      _collection: {
        type: 'String',
        description: 'The collection name',
        resolve: () => type,
      },
    });

    //
    /// Query resolvers
    //

    schema.addResolver({
      name: 'findById',
      type: () => schema,
      description: `Find one ${type} by its ID`,
      args: generateArgsForSingleItemQuery(),
      resolve: (rp: { args: { id: string | number } }) =>
        contentNodes.find((node: AnyContentNode) => node.id === rp.args.id),
    });

    schema.addResolver({
      name: 'findMany',
      type: () => [schema],
      description: `Find many ${pluralType} by their IDs`,
      args: generateArgsForManyItemQuery(pluralType),
      resolve: (rp: {
        args: { ids?: (string | number)[] } & Record<string, unknown>;
      }) => {
        const idsToFind = rp.args.ids ?? [];
        const matches =
          contentNodes?.filter((node: AnyContentNode) =>
            idsToFind?.includes(node.id)
          ) ?? [];
        return resolveQueryArgs(matches, rp.args, config, {
          type: {
            name: type,
            pluralName: pluralType,
            pluralQueryName: pluralTypeQueryName,
          },
        });
      },
    });

    schema.addResolver({
      name: 'all',
      args: generateArgsForAllItemQuery(pluralType),
      type: () => [schema],
      description: `Return a set of ${pluralType}`,
      resolve: (rp: { args: Record<string, unknown> }) => {
        const nodes = contentNodes;
        return resolveQueryArgs(nodes, rp.args, config, {
          type: {
            name: type,
            pluralName: pluralType,
            pluralQueryName: pluralTypeQueryName,
          },
        });
      },
    });

    schemaComposer.Query.addFields({
      /**
       * Add find by ID to each content type
       */
      [type]: schema.getResolver('findById'),
      /**
       * Add find 'many' to each content type
       */
      [pluralTypeQueryName]: schema.getResolver('all'),
    });

    /**
     * Separate the queries by return type for later use when wrapping the query resolvers
     * @todo potentially able to remove this
     **/
    queries.maybeReturnsSingleItem.push(type);
    queries.maybeReturnsList.push(pluralTypeQueryName);
  }

  // Create map of references on each content node
  for (const { collection, refs } of config.content) {
    const typeTC = schemaComposer.getOTC(collection);

    if (!refs) continue;

    Object.entries(refs).forEach(([refField, refType]) => {
      const refTypeTC = schemaComposer.getOTC(refType as string);

      // If the current content type has this valid reference field as declared in the config, we'll add a resolver for this reference
      if (!typeTC.hasField(refField)) return;
      const refMapsToMultipleNodes = typeTC.isFieldPlural(refField);

      if (refMapsToMultipleNodes) {
        // If the reference field has many nodes
        typeTC.addRelation(refField, {
          description: `All ${plur(
            String(refType),
            2
          )} that are referenced by this ${collection}`,
          resolver: () => refTypeTC.getResolver('findMany'),
          prepareArgs: {
            ids: (source: AnyContentNode) => source[refField],
          },
          projection: { [refField]: true },
        });
      } else {
        // If the reference field has a single node
        typeTC.addRelation(refField, {
          description: `The ${refType} referenced by this ${collection}`,
          resolver: () => refTypeTC.getResolver('findById'),
          prepareArgs: {
            id: (source: AnyContentNode) => source[refField],
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
): Record<string, any> => {
  return config.transformer.reduce(
    (all, next) => merge(all, next.preknownSchemaFragments?.() || {}),
    {}
  );
};

function getTransformerExtensionMap(transformer: Transformer[]) {
  const transformerMap = new Map<string, Transformer>();
  transformer.forEach((t) => {
    t.extensions.forEach((extension) => {
      transformerMap.set(extension, t);
    });
  });
  return transformerMap;
}

/**
 * Transforms the content nodes to the expected JSON format. If no transformer is defined, the content nodes are returned as is.
 *
 * @param allContentNodes an object of keys and values - content type and content nodes to transform, respectively
 * @param config Flatbread config object
 */
const optionallyTransformContentNodes = (
  allContentNodes: Record<string, VFile[]>,
  config: LoadedFlatbreadConfig
): Record<string, AnyContentNode[]> => {
  if (config.transformer) {
    const transformerMap = getTransformerExtensionMap(config.transformer);

    /**
     * Map through each content type,
     * then map through each content node
     * and transform it with the provided parser
     *
     * @todo if this becomes a performance bottleneck, consider overloading the source plugin API to accept a transform function so we can avoid mapping through the content nodes twice
     * */

    return map(allContentNodes, (node: VFile): AnyContentNode => {
      const transformer = transformerMap.get(node.extname || '');
      if (!transformer?.parse) {
        throw new Error(`no transformer found for ${node.path}`);
      }
      return transformer.parse(node) as AnyContentNode;
    });
  }

  // Return as-is if no transformer (will be cast appropriately by the caller)
  return allContentNodes as unknown as Record<string, AnyContentNode[]>;
};
