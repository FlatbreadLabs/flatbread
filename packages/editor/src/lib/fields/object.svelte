<script lang="ts">
	import { getSession } from '$lib/api';

	const { gqlTypes, queryTypes } = getSession();

	// export let
	export let value;
	export let field;
	export let inList = false;

	const fieldComponents = Object.fromEntries(
		Object.entries(import.meta.glob('./*.svelte', { eager: true })).map(([key, value]) => [
			key.replace(/^.*\//, '').replace(/\..*$/, ''),
			value.default
		])
	);

	const gqlCollection = gqlTypes.get(field.type.ofType?.name ?? field.type.name);

	let collection = gqlCollection;
	console.log({ field, collection, fieldComponents})
</script>

{#if !inList}<h5>{field.label}</h5>
	<div class="divider" />
{/if}
{#each collection.fields as field}
	{#if !field.hidden}
		<svelte:component this={fieldComponents[field.component] ?? fieldComponents['raw']} {field} value={value?.[field.name]} />
	{/if}
{/each}
{#if !inList}
	<div class="divider" />
{/if}
