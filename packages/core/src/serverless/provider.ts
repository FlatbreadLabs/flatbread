import { graphql, GraphQLArgs } from 'graphql';
import generateSchema from '../generators/schema';
import { FlatbreadConfig } from 'flatbread';

/**
 * Generates a GraphQL schema and returns a query function that can be used to execute a GraphQL query.
 *
 * @param config Flatbread config
 */
export async function initServerlessFlatbreadProvider(config: FlatbreadConfig) {
  const schema = await generateSchema({ config });

  return async function query(args: Omit<GraphQLArgs, 'schema'>) {
    return graphql({ schema, ...args });
  };
}
