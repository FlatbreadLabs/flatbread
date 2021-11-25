import { ConfigResult, FlatbreadConfig } from 'flatbread';
import { SchemaComposer } from 'graphql-compose';
import { composeWithJson } from 'graphql-compose-json';
import { map } from './utils/map';
import { defaultsDeep, merge, cloneDeep } from 'lodash-es';
import plur from 'plur';

export * from './types';

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

  // Create map of references on each content node
  // ...

  // Generate the schema
  const schemaComposer = new SchemaComposer();

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

  const OrderTC = schemaComposer.createEnumTC(`enum Order { ASC DESC }`);

  /**
   * Add query by ID to each content type
   */
  Object.entries(schemaArray).forEach(([type, schema]) => {
    const pluralType = plur(type, 2);

    schemaComposer.Query.addFields({
      [type]: {
        type: schema,
        description: `Find ${pluralType} by their ID`,
        args: {
          id: 'String',
        },
        resolve: (_: any, args: Record<string, any>) => {
          return allContentNodesJSON[type].find((node) => node.id === args.id);
        },
      },
      ['all' + pluralType]: {
        type: [schema],
        description: `Return a set of ${pluralType}`,
        args: {
          limit: {
            description: `The maximum number of ${pluralType} to return`,
            type: 'Int',
          },
          order: {
            description: `Which order to return ${pluralType} in`,
            type: OrderTC,
            defaultValue: 'ASC',
          },
          sortBy: {
            description: `The field to sort ${pluralType} by`,
            type: 'String',
          },
        },
        resolve: (_: any, args: Record<string, any>) => {
          const allNodes = cloneDeep(allContentNodesJSON[type]).sort(
            (nodeA, nodeB) => {
              const fieldA = nodeA[args.sortBy];
              const fieldB = nodeB[args.sortBy];

              if (fieldA < fieldB) {
                return -1;
              }
              if (fieldA > fieldB) {
                return 1;
              }
              // fields must be equal
              return 0;
            }
          );

          if (args.order === 'DESC') {
            allNodes.reverse();
          }

          return allNodes.slice(0, args?.limit ?? undefined);
        },
      },
    });
  });

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

export default generateSchema;
