import { ConfigResult, FlatbreadConfig } from 'flatbread';
import { SchemaComposer } from 'graphql-compose';
import { composeWithJson } from 'graphql-compose-json';
import { map } from './utils/map';

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
   * @todo add resolvers for each field
   */
  const schemaArray = Object.fromEntries(
    Object.entries(allContentNodesJSON).map(([type, nodes]) => [
      type,
      composeWithJson(
        type,
        Object.assign(
          {},
          ...nodes.map((node) => ({
            ...node.internals,
            ...node.fields,
            ...preknownSchemaFragments,
          }))
        )
      ),
    ])
  );

  Object.entries(schemaArray).forEach(([type, schema]) => {
    schemaComposer.Query.addFields({
      [type]: {
        type: schema,
        args: {
          id: 'String',
        },
        resolve: (_: any, args: Record<string, any>) => {
          return allContentNodesJSON[type].find((node) => node.id === args.id);
        },
      },
    });
  });

  return schemaComposer.buildSchema();
};

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
