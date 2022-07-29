<script lang="ts">
	export let field;
	export let value;
	export let inList: boolean = false;
	export let readOnly: boolean = false;
</script>

<label>
	{#if !inList}{field.label}{/if}
	{#if readOnly}
		{value?.split('T')?.[0] ?? value}
	{:else}<input type="date" disabled={field.disabled} value={value?.split('T')?.[0] ?? value} />
	{/if}
</label>
