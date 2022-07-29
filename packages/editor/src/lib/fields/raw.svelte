<script lang="ts">
	export let field;
	export let value;
	export let inList: boolean = false;
	export let readOnly: boolean = false;
</script>

<label>
	{#if !inList}{field.label}{/if}
	{#if readOnly}
		{JSON.stringify(value)}
	{:else}
		<input type="string" disabled value={JSON.stringify(value)} />
	{/if}
</label>
