import { writable } from 'svelte/store';

export const gqlTypesStore = writable(new Map());
export const queryTypesStore = writable(new Map());
