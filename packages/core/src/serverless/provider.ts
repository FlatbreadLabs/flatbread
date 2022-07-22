import { graphql, GraphQLArgs } from 'graphql';
import { cache } from '../cache/cache';
import { generateSchema } from '../generators/schema';
import { FlatbreadConfig } from '../types';

/**
 * Generates a GraphQL schema and returns a query function that can be used to execute a GraphQL query.
 *
 * @param config Flatbread config
 */
export async function createFlatbread(config: FlatbreadConfig) {
  const schema = cache.schema ?? (await generateSchema({ config }));

  return async function query(args: Omit<GraphQLArgs, 'schema'>) {
    return graphql({ schema, ...args });
  };
}
