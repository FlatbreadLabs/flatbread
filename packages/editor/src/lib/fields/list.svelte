<script lang="ts">
	import { getComponentType, sanitizeGlobImport } from '$lib/api';

	const fieldComponents = Object.fromEntries(
		Object.entries(import.meta.glob('./*.svelte', { eager: true })).map(sanitizeGlobImport)
	);

	export let field;
	export let value;

	const items = value ?? [];
	const component = fieldComponents[getComponentType(field.type.ofType)];
</script>

<h5>
	{field.label}
</h5>
<div class="divider" />
<div class="collection">
	{#each items as value}
		<div class="item">
			<svelte:component this={component} inList {field} {value} />
		</div>
	{/each}
</div>
<div class="divider" />

<style lang="scss">
	.collection {
		/* display: grid; */
		/* display: flex; */
		/* flex-wrap: wrap; */
		/* grid-template-columns: 1fr 1fr; */
		/* gap: 1rem; */
	}
</style>
