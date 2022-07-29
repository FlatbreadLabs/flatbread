import { getGqlTypes } from '$lib/api';
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

	const gqlTypes = await getGqlTypes();
	const queryTypes = new Map(
		await Promise.all(
			gqlTypes
				.get('Query')
				.fields.filter((field) => field.type.kind === 'LIST')
				.map(async (field) => {
					field.schema = gqlTypes.get(field.type.ofType.name);
					field.label = field.name
						.replace(/^all/, '')
						.replace(/([A-Z])/g, ' $1')
						.trim();
					return [field.name, await Config.get(field.name, field)];
				})
		).then((collections) => collections.sort((a, b) => a[1].label.localeCompare(b[1].label)))
	);

	gqlTypes.set('Query', queryTypes);

	event.locals = {
		gqlTypes,
		queryTypes
	};

	const response = await resolve(event);
	return response;
}
