<script lang="ts">
	export let field;
	export let value;
	export let inList: boolean = false;
	export let readOnly: boolean = false;
	let rawValue = value?.raw;

	import { browser } from '$app/env';

	if (browser) {
		import('svimg/dist/s-image.js');
	}

	console.log({ value });
</script>

<label>
	{#if !inList}{field.label}{/if}
	{#if readOnly}
		<s-image {...value} />
	{:else}
		<div style='max-height: 10rem; max-width: 10rem;'>
			<s-image {...value} />
		</div>
			<input type="string" disabled={field.disabled} bind:value={rawValue} />
	{/if}
	{#if field.description}<small>{field.description}</small>{/if}
</label>
