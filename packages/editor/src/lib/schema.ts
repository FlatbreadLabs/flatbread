import { capitalize } from 'lodash-es';
import type { Field, GqlField, GqlSchema, GqlType, Schema } from './types';

export function getComponentType(type: GqlType) {
	const { kind, name } = type;
	if (kind === 'SCALAR') return name.toLowerCase();
	return kind.toLowerCase();
}

export function getNameFromLabel(label?: string) {
	if (!label) return '';
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
			?.map((field: GqlField): Field => {
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

	const result: Schema = {
		...schema,
		component: schema.kind.toLowerCase(),
		label: getNameFromLabel(schema.name),
		pluralName: getNameFromLabel(querySchemaFieldMap[schema.name]?.name),
		referenceField,
		fields
	};

	return result;
}
