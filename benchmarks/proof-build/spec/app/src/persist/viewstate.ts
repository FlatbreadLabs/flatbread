import { clamp } from '../util/math.ts';

export interface ViewState {
  zoom: number;
  /** Properties-panel sections the user collapsed, by name. */
  collapsedSections: string[];
}

export const MIN_ZOOM = 0.02;
export const MAX_ZOOM = 64;

export function defaultViewState(): ViewState {
  return { zoom: 1, collapsedSections: [] };
}

export function serializeViewState(state: ViewState): string {
  return JSON.stringify({
    zoom: state.zoom,
    collapsedSections: [...state.collapsedSections].sort(),
  });
}

/** Reads a saved view state; anything missing or malformed falls back to the default. */
export function parseViewState(
  input: string | Partial<ViewState> | null | undefined
): ViewState {
  const fallback = defaultViewState();
  let raw: Partial<ViewState> | null = null;
  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input);
    } catch {
      return fallback;
    }
  } else if (input && typeof input === 'object') raw = input;
  if (!raw) return fallback;
  const zoom =
    typeof raw.zoom === 'number' && Number.isFinite(raw.zoom)
      ? clamp(raw.zoom, MIN_ZOOM, MAX_ZOOM)
      : 1;
  const collapsedSections = Array.isArray(raw.collapsedSections)
    ? raw.collapsedSections.filter((s): s is string => typeof s === 'string')
    : [];
  return { zoom, collapsedSections };
}
