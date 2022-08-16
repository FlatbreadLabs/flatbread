<script lang="ts" context="module">
	import { queryCollection } from '$lib/api';

	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ params, url, session }) {
		const { gqlTypes, queryTypes } = session as Session;
		const queryName = params.name;
		const querySchema = queryTypes.get(queryName);

		if (!querySchema) throw new Error(`Failed to load schema for ${queryName}`);

		const results = await queryCollection(
			{
				query: queryName,
				collection: querySchema.schema.name,
				filter: `{ id: { eq: "${params.id}" } }`,
				visits: 2
			},
			gqlTypes
		);

		const record = results[0];

		return {
			props: {
				querySchema,
				record
			}
		};
	}
</script>

<script lang="ts">
	import Breadcrumbs from '$lib/breadcrumbs.svelte';
	import ObjectComponent from '$lib/fields/object.svelte';
	import Header from '$lib/header.svelte';
	import type { Session } from '$lib/types';
	import { get } from 'lodash-es';

	export let querySchema: any;
	export let record: any;
</script>

<Header>
	<nav slot="header-left">
		<Breadcrumbs
			allowBack
			breadcrumbs={[
				{ label: 'Collections', path: '/' },
				{ label: querySchema.label, path: `/collection/${querySchema.name}` },
				{ label: get(record, querySchema.schema.referenceField) }
			]}
		/>
	</nav>
</Header>
<main class="container">
	<h1>Edit {querySchema.schema.label}</h1>
	<form>
		<ObjectComponent isRoot field={querySchema.schema} value={record} />
	</form>
</main>
