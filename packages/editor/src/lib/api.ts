import { getStores } from '$app/stores';
import type { GqlSchema } from '$lib/types';
import { keyBy } from 'lodash-es';
import { get } from 'svelte/store';
import wretch from 'wretch';
import Config from './config';
import { transformSchema } from './schema';

const api = wretch().url('http://localhost:5057/graphql');

export function getSession() {
	return get(getStores().session);
}

export async function getSchema() {
	const schema = await api
		.post({
			query: `
  query Schema {
    __schema {
      types {
        name
        kind
        description
      }
    }
  }`
		})
		.json();
	return schema.data.__schema;
}

export async function getCollectionFields(name: string) {
	const schema = await api
		.post({
			query: `
      query CollectionFields {
        __type(name: "${name}") {
          name
          description
          fields {
            name
            description
            type {
              kind
              name
              ofType {
                name
                kind
              }
            }
          }
        }
      }
    `
		})
		.json();
	return schema.data.__type;
}

export async function getGqlTypes() {
	const result = await api
		.post({
			query: `query CollectionFields {
    __schema {
      types {
        name
        description
        kind
        fields {
        name
        description
        type {
          kind
          name
          ofType {
            name
            kind
          }
        }
      }
      }
    }
  }`
		})
		.json();

	const types: GqlSchema[] = result.data.__schema.types;
	const queryListFields = (types.find((t) => t.name === 'Query') as GqlSchema).fields.filter(
		(t) => t.type.kind === 'LIST'
	);
	const querySchema = keyBy(queryListFields, 'type.ofType.name');

	const gqlTypes = await Promise.all(
		types.map<Promise<[string, GqlSchema]>>(async (t) => {
			const shouldConfig = !t.name.startsWith('__') && t.kind === 'OBJECT';
			const schema = transformSchema(t, querySchema);
			return [t.name, shouldConfig ? await Config.get(t.name, schema) : schema];
		})
	);

	return {
		gqlTypes: new Map(gqlTypes),
		queryListFields
	};
}

interface GetCollectionQueryArgs {
	visits?: number;
	visited?: Record<string, number>;
	depth?: number;
}

function getCollectionQuery(
	collectionName: string,
	gqlTypes: Map<string, GqlSchema>,
	{ visits = 2, depth = Infinity, visited = {} }: GetCollectionQueryArgs
): string {
	const collection = gqlTypes.get(collectionName);

	console.log({ collection, collectionName });

	return (
		collection?.fields
			.map((field) => {
				if (field.type.kind === 'SCALAR' || field.type.ofType?.kind === 'SCALAR') return field.name;
				const kind: string = field.type.kind === 'LIST' ? field.type.ofType.name : field.type.name;
				depth--;
				if (depth < 0) return '';
				if (visited[kind] > visits) return '';
				visited[kind] = (visited[kind] ?? 0) + 1;
				return `${field.name} { ${getCollectionQuery(kind, gqlTypes, {
					depth,
					visited,
					visits
				})} }`;
			})
			.join(' ') ?? ''
	);
}

export function sanitizeGlobImport([key, value]: [string, any]) {
	return [key.replace(/^.*\//, '').replace(/\..*$/, ''), value.default];
}

function getFilter(filter: any) {
	if (!filter) return '';
	return `(filter: ${filter})`;
}

interface QueryCollectionArgs extends GetCollectionQueryArgs {
	query: string;
	collection: string;
	filter?: any;
}

export async function queryCollection(args: QueryCollectionArgs, gqlTypes: Map<string, GqlSchema>) {
	const { query, collection, filter, ...rest } = args;
	const gqlQuery = `{
    ${query}${getFilter(filter)} {
      ${getCollectionQuery(collection, gqlTypes, rest)}
    }
  }
  `;
	const results = await api.post({ query: gqlQuery }).json();
	return results.data[args.query];
}
