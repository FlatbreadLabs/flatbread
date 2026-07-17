import { schemaComposer } from 'graphql-compose';
import { composeWithJson } from 'graphql-compose-json';
import { cloneDeep, merge } from 'lodash-es';
import plur from 'plur';
import { cacheSchema, checkCacheForSchema } from '../cache/cache';
import {
  generateArgsForAllItemQuery,
  generateArgsForManyItemQuery,
  generateArgsForSingleItemQuery,
} from '../generators/arguments';
import resolveQueryArgs from '../resolvers/arguments';
import {
  ConfigResult,
  ContentGraphSnapshot,
  ContentNode,
  EntryNode,
  LoadedFlatbreadConfig,
} from '../types';
import {
  getNodeIdentifier,
  normalizeIdentifier,
  normalizeOptionalIdentifier,
} from '../utils/ids';
import { produceRecords, validateRecords } from '../records';
import { generateCollection } from './generateCollection';

interface RootQueries {
  maybeReturnsSingleItem: string[];
  maybeReturnsList: string[];
}

interface ResolverPayload {
  args: Record<string, unknown>;
}

/**
 * Generates a GraphQL schema from content nodes. A supplied content graph is
 * trusted as already validated by buildContentGraph or patchContentGraph.
 *
 * @param configResult the result of the config file processing
 */
export async function generateSchema(
  configResult: ConfigResult<LoadedFlatbreadConfig> & {
    contentGraph?: ContentGraphSnapshot;
    useSchemaCache?: boolean;
  }
) {
  const { config } = configResult;
  if (!config) {
    throw new Error('Config is not defined');
  }

  // Invoke initialize function if it exists and provide loaded config
  let allContentNodesJSON: Record<string, EntryNode[]>;
  let contentNodesByCollection: Record<string, ContentNode[]>;
  if (configResult.contentGraph) {
    allContentNodesJSON = configResult.contentGraph.nodesByCollection;
    contentNodesByCollection = configResult.contentGraph.nodesByCollection;
  } else {
    config.source.initialize?.(config);
    const allContentNodes = await config.source.fetch(config.content);
    allContentNodesJSON = produceRecords(allContentNodes, config);
    contentNodesByCollection = validateRecords(allContentNodesJSON, config);
  }

  // Content validation must run before returning a cached schema because the
  // cache key is derived from config, while invalid IDs/refs live in content.
  const cachedSchema =
    configResult.useSchemaCache === false
      ? undefined
      : checkCacheForSchema(config);

  if (cachedSchema) {
    return cachedSchema;
  }

  // graphql-compose's default schemaComposer is process-global. Reset it before
  // building a fresh Flatbread schema so prior schemas with the same collection
  // names do not leak fields or resolvers into this generation pass.
  schemaComposer.clear();

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
  let queries: RootQueries = {
    maybeReturnsSingleItem: [],
    maybeReturnsList: [],
  };

  // Main builder loop - iterate through each content type and generate query resolvers + relationships for it
  for (const [type, schema] of Object.entries(schemaArray)) {
    const pluralType = plur(type, 2);
    const pluralTypeQueryName = 'all' + pluralType;

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
      resolve: (rp: ResolverPayload) => {
        const idToFind = normalizeOptionalIdentifier(
          rp.args.id,
          `${type} query argument "id"`
        );

        if (idToFind === undefined) {
          return undefined;
        }

        return cloneDeep(contentNodesByCollection[type]).find(
          (node: ContentNode) => getNodeIdentifier(node, type) === idToFind
        );
      },
    });

    schema.addResolver({
      name: 'findMany',
      type: () => [schema],
      description: `Find many ${pluralType} by their IDs`,
      args: generateArgsForManyItemQuery(pluralType),
      resolve: (rp: ResolverPayload) => {
        if (rp.args.ids !== undefined && !Array.isArray(rp.args.ids)) {
          throw new Error(
            `${type} query argument "ids" must be an array of identifiers.`
          );
        }
        const idsArg = rp.args.ids ?? [];
        const idsToFind = idsArg.map((id: unknown): string =>
          normalizeIdentifier(id, `${type} query argument "ids"`)
        );
        const matches =
          cloneDeep(contentNodesByCollection[type])?.filter(
            (node: ContentNode) =>
              idsToFind?.includes(getNodeIdentifier(node, type))
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
      resolve: (rp: ResolverPayload) => {
        const nodes = cloneDeep(contentNodesByCollection[type]);
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
          )} that are referenced by this ${collection}`,
          resolver: () => refTypeTC.getResolver('findMany'),
          prepareArgs: {
            ids: (source) => source[refField],
          },
          projection: { [refField]: true },
        });
      } else {
        // If the reference field has a single node
        typeTC.addRelation(refField, {
          description: `The ${refType} referenced by this ${collection}`,
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

  if (configResult.useSchemaCache !== false) cacheSchema(config, schema);

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
): Record<string, unknown> => {
  return config.transformer.reduce(
    (all, next) => merge(all, next.preknownSchemaFragments?.() || {}),
    {}
  );
};
