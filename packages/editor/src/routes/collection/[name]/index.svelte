<script lang="ts" context="module">
	import { queryCollection } from '$lib/api';

	export async function load({ params, url, session }) {
		const { gqlTypes, queryTypes } = session;
		const querySchema = queryTypes.get(params.name);
		const collection = querySchema.schema;
		const results = await queryCollection(
			{ query: params.name, collection: collection.name },
			gqlTypes
		);

		return {
			props: {
				collection,
				results,
				querySchema
			}
		};
	}
</script>

<script lang="ts">
	import Breadcrumbs from '$lib/breadcrumbs.svelte';
	import FieldComponent from '$lib/field-component.svelte';

	export let collection;
	export let results: any[];
	export let querySchema;

	const visibleFields = collection.fields.filter(
		(field) => field.type.kind === 'SCALAR' && !field.name.startsWith('_') && field.name !== 'id'
	);
</script>

<main class="container">
	<nav class="flex row apart">
		<Breadcrumbs
			allowBack
			breadcrumbs={[{ label: 'Collections', path: '/' }, { label: querySchema.label }]}
		/>
		<a href="/collection/{querySchema.name}/new">Create new {collection.name}</a>
	</nav>
	<table>
		<tr>
			{#each visibleFields as field}
				<th>{field.label}</th>
			{/each}
		</tr>
		{#each results as row}
			<tr
				role="menuitem"
				on:click={() => location.assign(`/collection/${querySchema.name}/${row.id}`)}
			>
				{#each visibleFields as field}
					<td>
						<FieldComponent inList readOnly {field} value={row[field.name]} />
					</td>
				{/each}
			</tr>
		{/each}
	</table>
</main>

<style lang="scss">
</style>
