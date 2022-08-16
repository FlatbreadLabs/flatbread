<script lang="ts" context="module">
	import { queryCollection } from '$lib/api';

	/** @type {import('./__types/[name]').Load} */
	export async function load({ params, url, session }) {
		const { gqlTypes, queryTypes } = session;
		const querySchema = queryTypes.get(params.name);
		const collection = querySchema?.schema;
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
	import Header from '$lib/header.svelte';
	import type { QueryCollection, Schema } from '$lib/types';

	export let collection: Schema;
	export let results: any[];
	export let querySchema: QueryCollection;

	const visibleFields = collection.fields.filter(
		(field) => field.type.kind === 'SCALAR' && !field.name.startsWith('_') && field.name !== 'id'
	);
</script>

<Header>
	<Breadcrumbs
		slot='header-left'
		allowBack
		breadcrumbs={[{ label: 'Collections', path: '/' }, { label: querySchema.label }]}
	/>
	<div slot="header-right">
		<a href="/collection/{querySchema.name}/new">Create new {collection.name}</a>
	</div>
</Header>
<main class="container">
	<h1>{collection.pluralName}</h1>
	<table>
		<tr>
			{#each visibleFields as field}
				<th>{field.label}</th>
			{/each}
		</tr>
		{#each results as row}
			<tr
				class="record"
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
	.record {
		:global(*) {
			cursor: pointer;
		}
	}
</style>
