<script lang="ts" context="module">
	import { queryCollection } from '$lib/api';

	export async function load({ params, url, session }) {
		const { gqlTypes, queryTypes } = session;
		const queryName = params.name;
		const querySchema = queryTypes.get(queryName);

		const results = await queryCollection(
			{
				query: queryName,
				collection: querySchema.schema.name,
				filter: `{ id: { eq: "${params.id}" } }`,
				depth: Infinity
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
	import FieldComponent from '$lib/field-component.svelte';
	import { get } from 'lodash-es';

	export let querySchema: any;
	export let record: any;
</script>

<main class="container">
	<nav>
		<Breadcrumbs
			allowBack
			breadcrumbs={[
				{ label: 'Collections', path: '/' },
				{ label: querySchema.label, path: `/collection/${querySchema.name}` },
				{ label: get(record, querySchema.schema.referenceField) }
			]}
		/>
	</nav>

	<form>
		{#each querySchema.schema.fields as field}
			<FieldComponent {field} value={record[field.name]} />
		{/each}
	</form>
</main>
