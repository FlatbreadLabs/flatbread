import sift, { generateFilterSetManifest } from '../utils/sift';
import { ContentNode, FlatbreadConfig } from 'flatbread';
import { FlatbreadProvider } from '../providers/base';

interface ResolveQueryArgsOptions {
  type: {
    name: string;
    pluralName: string;
    pluralQueryName: string;
  };
}

/**
 * Resolvers for query arguments.
 */
const resolveQueryArgs = async (
  nodes: any[],
  args: any,
  config: FlatbreadConfig,
  options: ResolveQueryArgsOptions
) => {
  const { skip, limit, order, sortBy, filter } = args;

  if (filter) {
    // Turn the filter into a GraphQL subquery that returns an array of matching content node IDs.
    const listOfNodeIDsToFilter = await resolveFilter(filter, config, options);

    nodes = listOfNodeIDsToFilter.map((desiredNodeId) =>
      nodes.find((node) => node.id === desiredNodeId)
    );
  }

  if (sortBy) {
    resolveSortBy(sortBy, nodes);
  }

  if (order === 'DESC') {
    nodes.reverse();
  }

  return nodes.slice(skip ?? 0, limit ?? undefined);
};

/**
 * Deeply resolves a filter argument as a subquery, and returns a set of content node IDs that satisfy the filter.
 *
 * @param filter the filter argument
 */
export const resolveFilter = async (
  filter: Record<string, any>,
  config: FlatbreadConfig,
  options: ResolveQueryArgsOptions
): Promise<(string | number)[]> => {
  // Seperate the filter into its parts:
  //  - the path leading to the field we want to compare
  //  - the comparator expression.
  const filterSetManifest = generateFilterSetManifest(filter);

  // Run Flatbread as a function to execute a subquery
  const flatbread = new FlatbreadProvider(config);

  let filterToQuery = [];

  for (const filter of filterSetManifest) {
    let graphQLFieldAccessor = '';

    for (let i = 0; i < filter.path.length; i++) {
      const field = filter.path[i];
      const lastFieldIndex = filter.path.length - 1;

      // Build a partial GraphQL query's field shape
      if (i === lastFieldIndex && filter.path.length === 1) {
        graphQLFieldAccessor += `${field}`;
      } else if (i !== lastFieldIndex) {
        graphQLFieldAccessor += `${field} {`;
      } else {
        graphQLFieldAccessor += `${field} ${[lastFieldIndex]
          .map(() => '}')
          .join('')}`;
      }
    }

    filterToQuery.push(graphQLFieldAccessor);
  }

  // TODO: replace id field with user-defined/fallback identifier field
  const queryString = `
    query ${options.type.pluralQueryName}_FilterSubquery {
      ${options.type.pluralQueryName} {
        id
        ${filterToQuery.join('\n')}
      }
    }
  `;

  const { data } = await flatbread.query({
    source: queryString,
  });

  const result = data?.[options.type.pluralQueryName] as ContentNode[];

  return result.filter(sift(filter)).map((node) => node.id);
};

/**
 * Mutably sort a list of nodes by a given field.
 *
 * @param sortBy the field to sort by
 * @param nodes the array of nodes to sort
 */
export const resolveSortBy = (sortBy: string, nodes: any[]): void => {
  nodes.sort((nodeA: { [x: string]: any }, nodeB: { [x: string]: any }) => {
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
};

export default resolveQueryArgs;
