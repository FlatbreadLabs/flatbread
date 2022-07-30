import { getGqlTypes } from '$lib/api';
import { getNameFromLabel } from '$lib/schema';
import type { GqlQueryCollection, GqlSchema } from '$lib/types';

/** @type {import('@sveltejs/kit').GetSession} */
export function getSession(event) {
	return {
		...event.locals
	};
}

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	if (event.url.pathname.startsWith('/custom')) {
		return new Response('custom response');
	}

	// TODO: figure out how to expose config for sub objects like Author_Skills
	// maybe merge these types into the parent type under sub types?
	// maybe transform all __schema.types into their own schema instead of targeting type Query

	// transform gqlTypes first, then attach schemas

	const { gqlTypes, queryListFields } = await getGqlTypes();

	const queryTypesList = queryListFields
		.map<[string, GqlQueryCollection]>((field) => {
			const newField = field as GqlQueryCollection;
			newField.schema = gqlTypes.get(newField?.type?.ofType?.name as string) as GqlSchema;
			newField.label = getNameFromLabel(newField.name);
			return [field.name, newField];
		})
		.sort((a, b) => a[1].schema.pluralName.localeCompare(b[1].schema.pluralName));

	const queryTypes = new Map(queryTypesList);

	gqlTypes.set('Query', queryTypes);

	event.locals = {
		gqlTypes,
		queryTypes
	};

	const response = await resolve(event);
	return response;
}
