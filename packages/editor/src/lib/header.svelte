<script lang="ts">
	function setColorTheme(theme: string) {
		document.documentElement.dataset.theme = theme;
	}
</script>

<nav class="container">
	<div>
		<slot name="header-left" />
	</div>
	<div>
		<slot name="header-right" />
		<div>
			<svg
				on:click={() => setColorTheme('light')}
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6 button"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
				/>
			</svg>
			<svg
				on:click={() => setColorTheme('dark')}
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6 button"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
			</svg>
		</div>
	</div>
</nav>

<style lang="scss">
	nav.container {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		margin-top: var(--spacing);
		margin-bottom: var(--spacing);
		align-items: center;
		gap: var(--spacing);
		padding: 0;

		> * {
			display: flex;
			align-items: center;
			gap: var(--spacing);
		}
	}

  .button {
    cursor: pointer;
  }
</style>
