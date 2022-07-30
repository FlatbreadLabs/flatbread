import { getStores } from '$app/stores';
import { capitalize, keyBy } from 'lodash-es';
import { get } from 'svelte/store';
import wretch from 'wretch';
import type { Field, GqlField, GqlSchema } from '$lib/types';
import Config from './config';

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

// __schema type Query has all queries in fields, fields of type list has all collections

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

	console.log(querySchema);

	const gqlTypes = await Promise.all(
		types.map(async (t) => {
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
	gqlTypes,
	{ visits = 2, depth = Infinity, visited = {} }: GetCollectionQueryArgs
) {
	const collection = gqlTypes.get(collectionName);

	console.log({ collection, collectionName });

	return collection.fields
		.map((field) => {
			if (field.type.kind === 'SCALAR' || field.type.ofType?.kind === 'SCALAR') return field.name;
			const kind: string = field.type.kind === 'LIST' ? field.type.ofType.name : field.type.name;
			depth--;
			if (depth < 0) return '';
			if (visited[kind] > visits) return '';
			visited[kind] = (visited[kind] ?? 0) + 1;
			return `${field.name} { ${getCollectionQuery(kind, gqlTypes, { depth, visited, visits })} }`;
		})
		.join(' ');
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

export async function queryCollection(args: QueryCollectionArgs, gqlTypes) {
	const { collection, filter, ...rest } = args;
	const query = `{
    ${args.query}${getFilter(args.filter)} {
      ${getCollectionQuery(args.collection, gqlTypes, rest)}
    }
  }
  `;
	const results = await api.post({ query }).json();
	return results.data[args.query];
}

export function getComponentType(type) {
	const { kind, name } = type;
	if (kind === 'SCALAR') return name.toLowerCase();
	return kind.toLowerCase();
}

export function getNameFromLabel(label?: string) {
	if (!label) return undefined;
	return label
		.replace(/^all/, '')
		.replace(/([A-Z])/g, ' $1')
		.trim();
}

// sort specific fields higher than the rest, in order
const fieldSortWeights = ['name', 'title'];

function weightedSort(a: string, b: string) {
	const aw = fieldSortWeights.indexOf(a);
	const bw = fieldSortWeights.indexOf(b);
	if (aw < 0 && bw < 0) return undefined;
	return fieldSortWeights.length - aw - (fieldSortWeights.length - bw);
}

export function transformSchema(schema: GqlSchema, querySchemaFieldMap: Record<string, GqlField>) {
	const fields: Field[] =
		schema.fields
			?.map((field: GqlField) => {
				return {
					label: capitalize(field.name.replace(/_+/g, ' ').trim()),
					name: field.name,
					description: field.description,
					type: field.type,
					disabled: field.name.startsWith('_') || field.name === 'id',
					component: getComponentType(field.type),
					collection: field.type.kind === 'OBJECT' ? field.type.name : undefined
				};
			})
			.sort((a: Field, b: Field) => {
				if (a.disabled && !b.disabled) return 1;
				if (!a.disabled && b.disabled) return -1;
				if (a.type.kind !== 'SCALAR' && b.type.kind === 'SCALAR') return 1;
				if (a.type.kind === 'SCALAR' && b.type.kind !== 'SCALAR') return -1;

				return (
					weightedSort(a.name.toLowerCase(), b.name.toLowerCase()) ?? a.name.localeCompare(b.name)
				);
			}) || [];

	const referenceField =
		['name', 'title'].find((fieldName) => fields.find((field) => field.name === fieldName)) ?? 'id';

	const result = {
		...schema,
		component: schema.kind.toLowerCase(),
		label: getNameFromLabel(schema.name),
		pluralName: getNameFromLabel(querySchemaFieldMap[schema.name]?.name),
		referenceField,
		fields
	};

	return result;
}
