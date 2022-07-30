<script lang="ts">
	import '@picocss/pico/css/pico.css';
</script>

<slot />

<style lang="scss">
	:global {
		.flex {
			display: flex;

			&.row {
				flex-direction: row;
				align-items: baseline;
			}

			&.apart {
				justify-content: space-between;
			}
		}

		.w-6 {
			width: 24px;
		}
		.h-6 {
			height: 24px;
		}

		nav {
			padding: 1.75rem 0;
		}

		[data-field='object'],
		[data-field='list'] {
			margin-bottom: var(--spacing);
			padding: var(--form-element-spacing-vertical) 0;

			.content {
				margin: calc(var(--form-element-spacing-vertical)) 0;
				padding-left: 1rem;
				border-left: var(--border-width) solid var(--form-element-border-color);
			}
		}

		h1,
		h2,
		h3,
		h4,
		h5,
		h6 {
			+ small {
				display: block;
				width: 100%;
				margin-bottom: var(--spacing);
				color: var(--muted-color);
			}
		}

		/* Cyan Light scheme (Default) */
		/* Can be forced with data-theme="light" */
		[data-theme='light'],
		:root:not([data-theme='dark']) {
			--primary: #00acc1;
			--primary-hover: #0097a7;
			--primary-focus: rgba(0, 172, 193, 0.125);
			--primary-inverse: #fff;
		}

		/* Cyan Dark scheme (Auto) */
		/* Automatically enabled if user has Dark mode enabled */
		@media only screen and (prefers-color-scheme: dark) {
			:root:not([data-theme='light']) {
				--primary: #00acc1;
				--primary-hover: #00bcd4;
				--primary-focus: rgba(0, 172, 193, 0.25);
				--primary-inverse: #fff;
			}
		}

		/* Cyan Dark scheme (Forced) */
		/* Enabled if forced with data-theme="dark" */
		[data-theme='dark'] {
			--primary: #00acc1;
			--primary-hover: #00bcd4;
			--primary-focus: rgba(0, 172, 193, 0.25);
			--primary-inverse: #fff;
		}

		/* Cyan (Common styles) */
		:root {
			--form-element-active-border-color: var(--primary);
			--form-element-focus-color: var(--primary-focus);
			--switch-color: var(--primary-inverse);
			--switch-checked-background-color: var(--primary);
		}

		.divider {
			display: block;
			margin: var(--spacing) 0;
			border-top: var(--border-width) solid var(--form-element-border-color);
		}
	}
</style>
