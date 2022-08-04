import { keyBy } from 'lodash-es';
import sift, {
  generateFilterSetManifest,
  TargetAndComparator,
} from '../utils/sift';
import { ContentNode, FlatbreadConfig } from '../types';
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
    // Place the nodes into a keyed object by ID so we can easily filter by ID without doing tons of looping.
    // TODO: store all nodes in an ID-keyed object.
    // TODO: replace id field with user-defined/fallback identifier field.
    const nodeById = keyBy(nodes, 'id');

    // Turn the filter into a GraphQL subquery that returns an array of matching content node IDs.
    const listOfNodeIDsToFilter = await resolveFilter(filter, config, options);

    nodes = listOfNodeIDsToFilter.map(
      (desiredNodeId) => nodeById[desiredNodeId]
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
 * Builds a GraphQL query fragment from a `filterSetManifest`.
 * This is useful for building a GraphQL query which resolves a set of content nodes which include the fields specified in the filter set.
 * That result can then be used to filter the nodes by the filter argument in the `sift` function, obtaining a list of matching nodes.
 *
 * @example
 * // Consider this query with a complex filter:
 *  query AllPosts {
 *    allPosts(filter: {_content: {timeToRead: {gte: 0}}, title: {wildcard: "Test*"}}) {
 *      id
 *      title
 *    }
 *  }
 *
 * // The filter is converted to:
 *  filterSetManifest = [
 *    {
 *      path: [ '_content', 'timeToRead' ],
 *      comparator: { operation: 'gte', value: 0 }
 *    },
 *    {
 *      path: [ 'title' ],
 *      comparator: { operation: 'wildcard', value: 'Test*' }
 *    }
 *  ]
 *
 * // ...which is passed into this function to then become this fragment:
 *  _content {
 *    timeToRead
 *  }
 *  title
 *
 */
function buildFilterQueryFragment(filterSetManifest: TargetAndComparator) {
  const filterToQuery = [];

  for (const filter of filterSetManifest) {
    let graphQLFieldAccessor = '';

    for (let i = 0; i < filter.path.length; i++) {
      const field = filter.path[i];
      const lastFieldIndex = filter.path.length - 1;

      // Build a partial GraphQL query's field shape
      if (i === lastFieldIndex && filter.path.length === 1) {
        // If the filter path is a leaf-field, just add the field name.
        graphQLFieldAccessor += `${field}`;
      } else if (i !== lastFieldIndex) {
        // If the filter is not a leaf-field, we need to add the field name and open it to contain child fields.
        graphQLFieldAccessor += `${field} {`;
      } else {
        // If the current field is the last leaf-field of a nested accessor, we need to add the field name and close it with the same number of opening brackets it took to reach this depth.
        graphQLFieldAccessor += `${field} ${[lastFieldIndex]
          .map(() => '}')
          .join('')}`;
      }
    }

    filterToQuery.push(graphQLFieldAccessor);
  }

  return filterToQuery.join('\n');
}

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

  // Build a GraphQL query fragment that will be used to resolve content nodes in a structure expected by the sift function, for the given filter.
  const filterQueryFragment = buildFilterQueryFragment(filterSetManifest);

  // TODO: replace id field with user-defined/fallback identifier field
  const queryString = `
    query ${options.type.pluralQueryName}_FilterSubquery {
      ${options.type.pluralQueryName} {
        id
        ${filterQueryFragment}
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
