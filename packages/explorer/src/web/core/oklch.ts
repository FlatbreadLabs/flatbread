export interface Oklch {
  l: number;
  c: number;
  h: number;
}

export type ColorMode = 'light' | 'dark';

export interface OklchColor {
  oklch: Oklch;
  css: string;
  hex: string;
  three: number;
}

function hashId(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function unit(input: string): number {
  return (hashId(input) % 10_000) / 10_000;
}

/**
 * Cluster tint for one Effort, hashed from its id onto a coarse hue ring so
 * two Efforts are unlikely to land on visually identical tints.
 *
 * This appears in exactly two places — the core of an Effort hub and its
 * legend chip — never on a record glyph. Records own hue for their primitive,
 * and a tint competing with them is what made every node in a cluster look
 * the same in the first place.
 */
export function effortOklch(id: string, mode: ColorMode = 'light'): Oklch {
  const hue = Math.round(unit(`${id}:h`) * 12) * 30;
  const lightness = mode === 'light' ? 0.52 : 0.7;
  return { l: lightness, c: 0.12, h: hue };
}

/**
 * Neutral structural tone for hub rings. Deliberately a touch quieter than a
 * record in each mode: a hub is scaffolding for its cluster, and it already
 * commands attention through size and silhouette.
 */
export function structuralOklch(mode: ColorMode): Oklch {
  return mode === 'light'
    ? { l: 0.5, c: 0.008, h: 260 }
    : { l: 0.56, c: 0.008, h: 260 };
}

/**
 * Desaturate and lift a colour toward its background to mark a record as
 * retired — rejected, superseded, invalidated, or wontfix.
 *
 * Chroma is cut rather than erased: a retired Decision stays recognisably
 * violet, so the primitive is still readable while the record clearly reads
 * as no longer live. Draining it fully to grey would collide with the
 * near-neutral Effort hub tint.
 */
export function retiredOklch(base: Oklch, mode: ColorMode): Oklch {
  return {
    // Light mode gets a smaller push: white leaves much less room below a
    // record's lightness than black leaves above it, so the same offset drops
    // a retired glyph under the 3:1 non-text contrast floor.
    l:
      mode === 'light'
        ? Math.min(base.l + 0.06, 0.7)
        : Math.max(base.l - 0.14, 0.44),
    c: base.c * 0.34,
    h: base.h,
  };
}

export function oklchCss({ l, c, h }: Oklch): string {
  return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
}

function linearToSrgb(channel: number): number {
  const value = clamp(channel, 0, 1);
  return value <= 0.0031308
    ? 12.92 * value
    : 1.055 * value ** (1 / 2.4) - 0.055;
}

export function oklchToSrgb({ l, c, h }: Oklch): [number, number, number] {
  const hueRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hueRad);
  const b = c * Math.sin(hueRad);

  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;

  const lLinear = lPrime ** 3;
  const mLinear = mPrime ** 3;
  const sLinear = sPrime ** 3;

  const r =
    4.0767416621 * lLinear - 3.3077115913 * mLinear + 0.2309699292 * sLinear;
  const g =
    -1.2684380046 * lLinear + 2.6097574011 * mLinear - 0.3413193965 * sLinear;
  const bChannel =
    -0.0041960863 * lLinear - 0.7034186147 * mLinear + 1.707614701 * sLinear;

  return [linearToSrgb(r), linearToSrgb(g), linearToSrgb(bChannel)];
}

export function oklchToHex(oklch: Oklch): string {
  const [r, g, b] = oklchToSrgb(oklch);
  const toByte = (channel: number) =>
    Math.round(clamp(channel, 0, 1) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

export function oklchToThreeColor(oklch: Oklch): number {
  const hex = oklchToHex(oklch).slice(1);
  return Number.parseInt(hex, 16);
}

export function effortColor(id: string, mode: ColorMode = 'light'): OklchColor {
  return toColor(effortOklch(id, mode));
}

export function toColor(oklch: Oklch): OklchColor {
  return {
    oklch,
    css: oklchCss(oklch),
    hex: oklchToHex(oklch),
    three: oklchToThreeColor(oklch),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
