import { getGqlTypes, getNameFromLabel } from '$lib/api';
import Config from './lib/config';

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
		.map((field) => {
			field.schema = gqlTypes.get(field.type.ofType.name);
			field.label = getNameFromLabel(field.name);
			return [field.name, field];
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
