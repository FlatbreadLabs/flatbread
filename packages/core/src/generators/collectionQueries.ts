import { ObjectTypeComposer, SchemaComposer } from 'graphql-compose';
import resolveQueryArgs from '../resolvers/arguments';

import { cloneDeep, get } from 'lodash-es';
import {
  generateArgsForAllItemQuery,
  generateArgsForManyItemQuery,
} from '../generators/arguments';
import {
  EntryNode,
  LoadedCollectionEntry,
  LoadedFlatbreadConfig,
  Transformer,
} from '../types';

export interface AddCollectionQueriesArgs {
  name: string;
  pluralName: string;
  config: LoadedFlatbreadConfig;
  objectComposer: ObjectTypeComposer;
  schemaComposer: SchemaComposer;
  allContentNodesJSON: Record<string, any[]>;
  transformersById: Record<string, Transformer>;
  collectionEntry: LoadedCollectionEntry;
}

export default function addCollectionQueries(args: AddCollectionQueriesArgs) {
  const {
    name,
    pluralName,
    config,
    objectComposer,
    schemaComposer,
    collectionEntry,
    allContentNodesJSON,
  } = args;

  const pluralTypeQueryName = 'all' + pluralName;

  objectComposer.addResolver({
    name: 'findByReferenceField',
    type: () => objectComposer,
    description: `Find one ${name} by its ${collectionEntry.referenceField}`,
    args: {
      [collectionEntry.referenceField]: objectComposer
        .getInputTypeComposer()
        .getField(collectionEntry.referenceField),
    },
    resolve: (rp: Record<string, any>) =>
      cloneDeep(
        allContentNodesJSON[name].find(
          (node: EntryNode) =>
            node[collectionEntry.referenceField] ===
            rp.args[collectionEntry.referenceField]
        )
      ),
  });

  objectComposer.addResolver({
    name: 'findMany',
    type: () => [objectComposer],
    description: `Find many ${pluralName} by their ${collectionEntry.referenceField}`,
    args: generateArgsForManyItemQuery(pluralName),
    resolve: (rp: Record<string, any>) => {
      const referencesToFind = rp.args.references ?? [];
      const matches =
        cloneDeep(allContentNodesJSON[name])?.filter((node: EntryNode) =>
          referencesToFind?.includes(get(node, collectionEntry.referenceField))
        ) ?? [];
      return resolveQueryArgs(matches, rp.args, config, {
        collectionEntry,
        type: {
          name: name,
          pluralName: pluralName,
          pluralQueryName: pluralTypeQueryName,
        },
      });
    },
  });

  objectComposer.addResolver({
    name: 'all',
    args: generateArgsForAllItemQuery(pluralName),
    type: () => [objectComposer],
    description: `Return a set of ${pluralName}`,
    resolve: (rp: Record<string, any>) => {
      const nodes = cloneDeep(allContentNodesJSON[name]);
      return resolveQueryArgs(nodes, rp.args, config, {
        collectionEntry,
        type: {
          name: name,
          pluralName: pluralName,
          pluralQueryName: pluralTypeQueryName,
        },
      });
    },
  });

  schemaComposer.Query.addFields({
    /**
     * Add find by ID to each content type
     */
    [name]: objectComposer.getResolver('findByReferenceField'),
    /**
     * Add find 'many' to each content type
     */
    [pluralTypeQueryName]: objectComposer.getResolver('all'),
  });
}
