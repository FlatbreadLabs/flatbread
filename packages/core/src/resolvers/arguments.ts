import sift, { generateFilterSetManifest } from '../utils/sift';
import {
  resolveMaybeThunk,
  Resolver,
  SchemaComposer,
  ThunkComposer,
} from 'graphql-compose';

/**
 * Resolvers for query arguments.
 */
const resolveQueryArgs = async (
  nodes: any[],
  args: any,
  type: string,
  schemaComposer: SchemaComposer
) => {
  const { skip, limit, order, sortBy, filter } = args;

  // console.group('resolveQueryArgs');
  // console.log('args', args);
  // console.log('type', type);
  // console.log('scoped result', nodes);
  // console.groupEnd();

  if (filter) {
    nodes = await resolveFilter(filter, nodes, type, schemaComposer);
    // nodes = nodes.filter(sift(filter));
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
 * Deeply resolve a filter argument into a set of nodes with relations and not-yet resolved fields.
 *
 * Immutably filters and returns a new array.
 *
 * @param filter the filter argument
 * @param nodes the array of nodes to filter
 */
export const resolveFilter = async (
  filter: Record<string, any>,
  nodes: any[],
  type: string,
  schemaComposer: SchemaComposer
) => {
  // construct custom resolver of nodes to build temp list
  const filterSetManifest = generateFilterSetManifest(filter);
  console.log('filter manifest', filterSetManifest);
  let currentNodesContext = nodes;

  for (const filter of filterSetManifest) {
    for (let i = 0; i < filter.path.length; i++) {
      const field = filter.path[i];

      // console.log('field', field);
      // console.log('currentNodesContext', currentNodesContext);

      const objectTC = schemaComposer.getOTC(type);
      const relations = objectTC.getRelations();

      if (!objectTC.hasField(field)) {
        console.error(`${type} has no field ${field}`);
        continue;
      }

      let fieldTC = objectTC.getFieldTC(field);
      console.log('field', objectTC.getField(field));

      if (fieldTC) {
        const fieldTypeName = fieldTC.getTypeName();

        // Grab all the nodes on the content type for this field - these can seed the source of other resolvers deeper in the filter
        const targetOTC = schemaComposer.getOTC(fieldTypeName);
        const targetAllQuery = targetOTC.getResolver('all');
        const queryArgsTC = targetAllQuery.getArgs();
        const args = Object.fromEntries(
          Object.entries(queryArgsTC).map(([key, value]) => {
            return [key, value.defaultValue || null];
          })
        );

        currentNodesContext = await targetAllQuery?.resolve({ args });

        // If the field is a relation, we need to connect the relation
        if (relations[field]) {
          console.log('relation', JSON.parse(JSON.stringify(relations[field])));
          const resolver = relations[field];
        }
      } else {
        if (i === filter.path.length - 1) {
          // If this is the last field in the filter, we'll run the sift here, for testing :-)
          // console.log(currentNodesContext);
          // console.log(
          //   'authors?',
          //   currentNodesContext.filter(
          //     sift({
          //       [field]: {
          //         [filter.comparator.operation]: filter.comparator.value,
          //       },
          //     })
          //   )
          // );
        }
      }
      // console.log('resolveMaybeThunk');

      // console.log(fieldTC._gqcResolvers());

      // if (fieldTC instanceof ThunkComposer) {
      //   fieldTC = fieldTC.getUnwrappedTC();
      // }

      // const resolver = fieldTC && fieldTC?.resolve;
      // if (resolver) {
      //   console.log(
      //     resolver(nodes, filter.args, null, schemaComposer)
      //   );
      // }
      // console.log('FILTER RESOLVER', resolveMaybeThunk(resolver));
      // turn this into a function that accepts a type and allows us to change type scope, building out a tree of relations
    }
  }

  return nodes.filter(sift(filter));
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
