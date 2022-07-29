<script lang="ts" context="module">
	export async function load({ params, url, session }) {
		const { gqlTypes, queryTypes } = session;
		const querySchema = queryTypes.get(params.name);

		const collection = querySchema.schema;

		return {
			props: {
				collection,
				querySchema
			}
		};
	}
</script>

<script lang="ts">
	import Breadcrumbs from '$lib/breadcrumbs.svelte';
	import FieldComponent from '$lib/field-component.svelte';

	export let collection;
	export let querySchema;
</script>

<main class="container">
	<nav>
		<Breadcrumbs
			allowBack
			breadcrumbs={[
				{ label: 'Collections', path: '/' },
				{ label: querySchema.label, path: `/collection/${querySchema.name}` },
				{ label: 'New' }
			]}
		/>
	</nav>

	<form>
		{#each collection.fields as field}
			<FieldComponent {field} />
		{/each}
	</form>
</main>
