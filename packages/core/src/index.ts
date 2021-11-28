import { ConfigResult, EntryNode, FlatbreadConfig } from 'flatbread';
import { schemaComposer } from 'graphql-compose';
import { composeWithJson } from 'graphql-compose-json';
import { map } from './utils/map';
import sift from './utils/sift';
import { defaultsDeep, merge, cloneDeep } from 'lodash-es';
import plur from 'plur';

export * from './types';
interface RootQueries {
  maybeReturnsSingleItem: string[];
  maybeReturnsList: string[];
}

/**
 * Generates a GraphQL schema from content nodes.
 *
 * @param configResult the result of the config file processing
 */
const generateSchema = async (configResult: ConfigResult<FlatbreadConfig>) => {
  const { config } = configResult;
  if (!config) {
    throw new Error('Config is not defined');
  }

  // Invoke the content source resolver to retrieve the content nodes
  const allContentNodes = await config.source.fetch(config.content);

  // Transform the content nodes to the expected JSON format if needed
  const allContentNodesJSON = optionallyTransformContentNodes(
    allContentNodes,
    config
  );

  const preknownSchemaFragments = fetchPreknownSchemaFragments(config);

  /**
   * For each content type, reduce the nodes therein to one singular node of combined types. This reduced node for each type then is fed into a GraphQL type composer to recursively generate a GraphQL schema.
   *
   * Reducing all the nodes forms a more accurate schema in the case of optional fields which may not exist in some content nodes.
   *
   * */
  const schemaArray = Object.fromEntries(
    Object.entries(allContentNodesJSON).map(([type, nodes]) => [
      type,
      composeWithJson(
        type,
        defaultsDeep(
          {},
          ...nodes.map((node) => merge({}, node, preknownSchemaFragments))
        ),
        { schemaComposer }
      ),
    ])
  );

  let queries: RootQueries = {
    maybeReturnsSingleItem: [],
    maybeReturnsList: [],
  };

  // Main builder loop - iterate through each content type and generate query resolvers + relationships for it
  for (const [type, schema] of Object.entries(schemaArray)) {
    const pluralType = plur(type, 2);
    const pluralTypeQueryName = 'all' + pluralType;

    schema.addResolver({
      name: 'findById',
      type: () => schema,
      description: `Find one ${type} by its ID`,
      args: {
        id: 'String',
      },
      resolve: (rp: Record<string, any>) =>
        cloneDeep(allContentNodesJSON[type]).find(
          (node: EntryNode) => node.id === rp.args.id
        ),
    });

    schema.addResolver({
      name: 'findMany',
      type: () => [schema],
      description: `Find many ${pluralType} by their IDs`,
      args: {
        ids: {
          type: '[String]',
        },
      },
      resolve: (rp: Record<string, any>) => {
        const idsToFind = rp.args.ids ?? [];
        const matches =
          cloneDeep(allContentNodesJSON[type])?.filter((node: EntryNode) =>
            idsToFind?.includes(node.id)
          ) ?? [];
        return matches;
      },
    });

    schema.addResolver({
      name: 'all',
      args: generateArgsForAllQuery(pluralType),
      type: () => [schema],
      description: `Return a set of ${pluralType}`,
      resolve: (_: Record<string, any>) => cloneDeep(allContentNodesJSON[type]),
    });

    schemaComposer.Query.addFields({
      /**
       * Add find by ID to each content type
       */
      [type]: schema.getResolver('findById'),
      /**
       * Add find 'many' to each content type
       */
      [pluralTypeQueryName]: schema
        .getResolver('all')
        .withMiddlewares([logResultOfResolver, cascadingFilterMiddleware]),
    });

    // Separate the queries by return type for later use when wrapping the query resolvers
    queries.maybeReturnsSingleItem.push(type);
    queries.maybeReturnsList.push(pluralTypeQueryName);
  }

  // Create map of references on each content node
  for (const { typeName, refs } of config.content) {
    const typeTC = schemaComposer.getOTC(typeName);

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
          )} that are referenced by this ${typeName}`,
          resolver: () => refTypeTC.getResolver('findMany'),
          prepareArgs: {
            ids: (source) => source[refField],
          },
          projection: { [refField]: true },
        });
      } else {
        // If the reference field has a single node
        typeTC.addRelation(refField, {
          description: `The ${refType} referenced by this ${typeName}`,
          resolver: () => refTypeTC.getResolver('findById'),
          prepareArgs: {
            id: (source) => source[refField],
          },
          projection: { [refField]: true },
        });
      }
    });
  }

  return schemaComposer.buildSchema();
};

/**
 * If the config has a transformer which defines pre-known schema fragments,
 * fetch them and return them as an object.
 *
 * @param config Flatbread config object
 * @returns an object of pre-known schema fragments including resolvers.
 */
const fetchPreknownSchemaFragments = (
  config: FlatbreadConfig
): Record<string, any> | {} => {
  if (config.transformer && config.transformer.preknownSchemaFragments) {
    return config.transformer.preknownSchemaFragments();
  }
  return {};
};

/**
 * Transforms the content nodes to the expected JSON format. If no transformer is defined, the content nodes are returned as is.
 *
 * @param allContentNodes an object of keys and values - content type and content nodes to transform, respectively
 * @param config
 * @returns
 */
const optionallyTransformContentNodes = (
  allContentNodes: Record<string, any[]>,
  config: FlatbreadConfig
): Record<string, any[]> => {
  if (config.transformer && config.transformer.parse) {
    const parse = config.transformer.parse;

    /**
     * Map through each content type,
     * then map through each content node
     * and transform it with the provided parser
     *
     * @todo if this becomes a performance bottleneck, consider overloading the source plugin API to accept a transform function so we can avoid mapping through the content nodes twice
     * */
    const transformedContentNodes = map(allContentNodes, (node: any) =>
      parse(node)
    );
    return transformedContentNodes;
  }
  return allContentNodes;
};

const generateArgsForAllQuery = (pluralType: string): Record<string, any> => {
  return {
    skip: {
      description: 'Skip the first `n` results',
      type: 'Int',
    },
    limit: {
      description: `The maximum number of ${pluralType} to return`,
      type: 'Int',
    },
    order: {
      description: `Which order to return ${pluralType} in`,
      type: `enum Order { ASC DESC }`,
      defaultValue: 'ASC',
    },
    sortBy: {
      description: `The field to sort ${pluralType} by`,
      type: 'String',
    },
    filter: {
      description: `Filter ${pluralType} by a JSON object`,
      type: 'JSON',
    },
  };
};

const logResultOfResolver = async (
  resolve: (arg0: any, arg1: any, arg2: any, arg3: any) => any,
  source: any,
  args: any,
  context: any,
  info: any
) => {
  const result = await resolve(source, args, context, info);
  console.log('result', result);
  return result;
};

const cascadingFilterMiddleware = async (
  resolve: (arg0: any, arg1: any, arg2: any, arg3: any) => any,
  source: any,
  args: any,
  context: any,
  info: any
) => {
  let result = await resolve(source, args, context, info);
  const { skip, limit, order, sortBy, filter } = args;

  if (filter) {
    result = result.filter(sift(filter));
  }

  if (sortBy) {
    result.sort((nodeA: { [x: string]: any }, nodeB: { [x: string]: any }) => {
      const fieldA = nodeA[sortBy];
      const fieldB = nodeB[sortBy];

      if (fieldA < fieldB) {
        return -1;
      }
      if (fieldA > fieldB) {
        return 1;
      }
      // fields must be equal
      return 0;
    });
  }

  if (order === 'DESC') {
    result.reverse();
  }

  return result.slice(skip ?? 0, limit ?? undefined);
};

export default generateSchema;
