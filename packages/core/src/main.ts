import generateSchema from './generators/schema';
import { FlatbreadConfig } from './types';

import { graphql, GraphQLArgs } from 'graphql';

export default async function initFlatbread(config: FlatbreadConfig) {
  const schema = await generateSchema({ config });

  return async function query(args: Omit<GraphQLArgs, 'schema'>) {
    return await graphql({ schema, ...args });
  };
}
