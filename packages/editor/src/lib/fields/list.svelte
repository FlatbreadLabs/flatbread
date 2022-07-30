<script lang="ts">
	import { sanitizeGlobImport } from '$lib/api';
	import { getComponentType } from '$lib/schema';

	const fieldComponents = Object.fromEntries(
		Object.entries(import.meta.glob('./*.svelte', { eager: true })).map(sanitizeGlobImport)
	);

	export let field;
	export let value;

	const items = value ?? [];
	const component = fieldComponents[getComponentType(field.type.ofType)];
</script>

<div data-field="list">
	<h4 style="margin-bottom:0;">{field.label}</h4>
	{#if field.description}<small>{field.description}</small>{/if}
	<div class="content">
		{#each items as value}
			<div class="item">
				<svelte:component this={component} inList {field} {value} />
			</div>
		{/each}
	</div>
</div>
