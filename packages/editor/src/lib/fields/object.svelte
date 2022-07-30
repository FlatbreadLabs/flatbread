<script lang="ts">
	import { getSession } from '$lib/api';
	import { get } from 'lodash-es';

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

	// TODO: hide read only fields by default in an accordian and have a show more button at the bottom

	const gqlCollection = gqlTypes.get(field.type.ofType?.name ?? field.type.name);

	let collection = gqlCollection;
</script>

<!-- <div class="divider" /> -->
{#if value}
	<div data-field="object">
		<h4 style="margin-bottom: 0;">
			{#if !inList}{field.label}{:else}{get(value, collection.referenceField)}{/if}
		</h4>
		{#if !inList && field.description}<small>{field.description}</small>{/if}
		<div class="content">
			{#each collection.fields as field}
				{#if !field.hidden}
					{#if field.component === 'object'}
						<svelte:self {field} value={value?.[field.name]} />
					{:else}
						<svelte:component
							this={fieldComponents[field.component] ?? fieldComponents['raw']}
							{field}
							value={value?.[field.name]}
						/>
					{/if}
				{/if}
			{/each}
			{#if !inList}
				<!-- <div class="divider" /> -->
			{/if}
		</div>
	</div>
{/if}
