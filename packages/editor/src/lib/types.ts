export interface GqlType {
	kind: string;
	name: string;
}

export interface GqlField {
	name: string;
	description?: string;
	type: GqlType & { ofType?: GqlType };
}

export interface GqlSchema {
	name: string;
	pluralName: string;
	description?: string;
	kind: string;
	fields: GqlField[];
}

export interface Field extends GqlField {
	label: string;
	disabled?: boolean;
	component: string;
	collection?: string;
}

export interface Schema extends GqlSchema {
	fields: Field[];
	pluralName: string;
	component: string;
	label: string;
	referenceField: string;
}

export interface QueryCollection extends GqlField {
	schema: Schema;
	label: string;
}

export interface Session {
	queryTypes: Map<string, QueryCollection>;
	gqlTypes: Map<string, Schema>;
}

export function isField(obj: Field | GqlSchema): obj is Field {
	return Object.hasOwn(obj, 'type') && !Object.hasOwn(obj, 'fields');
}

export function isGqlSchema(obj: Field | GqlSchema): obj is GqlSchema {
	return !Object.hasOwn(obj, 'type') && Object.hasOwn(obj, 'fields');
}
