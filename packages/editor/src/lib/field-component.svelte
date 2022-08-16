<script lang="ts">
	const fieldComponents = Object.fromEntries(
		Object.entries(import.meta.glob('./fields/*.svelte', { eager: true })).map(([key, value]) => [
			key.replace(/^.*\//, '').replace(/\..*$/, ''),
			value.default
		])
	);
	export let field;
</script>

{#if !field.hidden}
	<svelte:component
		this={fieldComponents[field.component] ?? fieldComponents['raw']}
		{field}
		{...$$restProps}
	/>
{/if}
