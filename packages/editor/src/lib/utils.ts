import { getStores } from '$app/stores';
import type { Session } from '$lib/types';
import { get } from 'svelte/store';

export function getSession() {
	return get(getStores().session) as Session;
}

export function sanitizeGlobImport([key, value]: [string, any]) {
	return [key.replace(/^.*\//, '').replace(/\..*$/, ''), value.default];
}
